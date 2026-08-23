import { FieldValue } from "firebase-admin/firestore";
import {
  getSsoUserFromRequest,
  unauthorizedSsoResponse,
} from "@hams-fam/sso-client";
import { getAdminDb } from "@/lib/firebase-admin";
import { authorizeProject } from "@/lib/project-access";

const validId = (value: string) => /^[A-Za-z0-9_-]{1,128}$/.test(value);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const user = getSsoUserFromRequest(request);
  if (!user) return unauthorizedSsoResponse();
  try {
    const { projectId } = await params;
    if (!validId(projectId))
      return Response.json(
        { error: "올바르지 않은 문서 ID입니다." },
        { status: 400 },
      );
    const db = getAdminDb();
    if (!db)
      return Response.json(
        { error: "Firebase Admin 설정을 확인해주세요." },
        { status: 503 },
      );
    const authorization = await authorizeProject(db, projectId, user, "view");
    if (!authorization.ok) return authorization.response;
    const snapshot = await authorization.reference
      .collection("comments")
      .orderBy("createdAt", "desc")
      .limit(100)
      .get();
    const comments = snapshot.docs.map((document) => {
      const data = document.data();
      return {
        id: document.id,
        text: typeof data.text === "string" ? data.text : "",
        author: typeof data.author === "string" ? data.author : "익명",
        createdAt: data.createdAt?.toDate?.().toISOString?.() ?? null,
      };
    });
    return Response.json({ comments });
  } catch (error) {
    console.error("Failed to load comments", error);
    return Response.json(
      { error: "코멘트 목록을 불러오지 못했습니다." },
      { status: 500 },
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const user = getSsoUserFromRequest(request);
  if (!user) return unauthorizedSsoResponse();
  try {
    const { projectId } = await params;
    if (!validId(projectId))
      return Response.json(
        { error: "올바르지 않은 문서 ID입니다." },
        { status: 400 },
      );
    const body = (await request.json()) as { text?: unknown };
    const text = typeof body.text === "string" ? body.text.trim() : "";
    if (!text || text.length > 1000)
      return Response.json(
        { error: "코멘트는 1~1,000자로 입력해주세요." },
        { status: 400 },
      );
    const db = getAdminDb();
    if (!db)
      return Response.json(
        { error: "Firebase Admin 설정을 확인해주세요." },
        { status: 503 },
      );
    const authorization = await authorizeProject(db, projectId, user, "edit");
    if (!authorization.ok) return authorization.response;
    const comment = await authorization.reference.collection("comments").add({
      text,
      author: user.nickname || user.loginId || user.email,
      authorId: user.id,
      createdAt: FieldValue.serverTimestamp(),
    });
    return Response.json({ id: comment.id, saved: true }, { status: 201 });
  } catch (error) {
    console.error("Failed to save comment", error);
    return Response.json(
      { error: "코멘트를 저장하지 못했습니다." },
      { status: 500 },
    );
  }
}
