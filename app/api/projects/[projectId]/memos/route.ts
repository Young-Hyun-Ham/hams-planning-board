import { FieldValue } from "firebase-admin/firestore";
import {
  getSsoUserFromRequest,
  unauthorizedSsoResponse,
} from "@hams-fam/sso-client";
import { getAdminDb } from "@/lib/firebase-admin";
import { authorizeProject } from "@/lib/project-access";

const validId = (value: string) => /^[A-Za-z0-9_-]{1,128}$/.test(value);
const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));
const validColor = (value: unknown): value is string =>
  typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const user = getSsoUserFromRequest(request);
  if (!user) return unauthorizedSsoResponse();

  try {
    const { projectId } = await params;
    if (!validId(projectId)) {
      return Response.json(
        { error: "올바르지 않은 문서 ID입니다." },
        { status: 400 },
      );
    }
    const db = getAdminDb();
    if (!db) {
      return Response.json(
        { error: "Firebase Admin 설정을 확인해주세요." },
        { status: 503 },
      );
    }
    const authorization = await authorizeProject(db, projectId, user, "view");
    if (!authorization.ok) return authorization.response;
    const snapshot = await authorization.reference
      .collection("memos")
      .orderBy("createdAt", "asc")
      .limit(200)
      .get();
    const memos = snapshot.docs.map((document) => {
      const data = document.data();
      return {
        id: document.id,
        text: typeof data.text === "string" ? data.text : "",
        x: typeof data.x === "number" ? data.x : 40,
        y: typeof data.y === "number" ? data.y : 40,
        width: typeof data.width === "number" ? data.width : 220,
        height: typeof data.height === "number" ? data.height : 160,
        backgroundColor:
          typeof data.backgroundColor === "string"
            ? data.backgroundColor
            : "#fff3a6",
        opacity: typeof data.opacity === "number" ? data.opacity : 1,
        createdAt: data.createdAt?.toDate?.().toISOString?.() ?? null,
        updatedAt: data.updatedAt?.toDate?.().toISOString?.() ?? null,
      };
    });
    return Response.json({ memos });
  } catch (error) {
    console.error("Failed to load canvas memos", error);
    return Response.json(
      { error: "메모 목록을 불러오지 못했습니다." },
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
    if (!validId(projectId)) {
      return Response.json(
        { error: "올바르지 않은 문서 ID입니다." },
        { status: 400 },
      );
    }
    const body = (await request.json()) as {
      x?: unknown;
      y?: unknown;
      width?: unknown;
      height?: unknown;
    };
    const db = getAdminDb();
    if (!db) {
      return Response.json(
        { error: "Firebase Admin 설정을 확인해주세요." },
        { status: 503 },
      );
    }
    const authorization = await authorizeProject(db, projectId, user, "edit");
    if (!authorization.ok) return authorization.response;
    const memo = await authorization.reference.collection("memos").add({
      text: "",
      x: clamp(typeof body.x === "number" ? body.x : 40, -12000, 12000),
      y: clamp(typeof body.y === "number" ? body.y : 40, -12000, 12000),
      width: clamp(typeof body.width === "number" ? body.width : 220, 140, 600),
      height: clamp(
        typeof body.height === "number" ? body.height : 160,
        100,
        600,
      ),
      backgroundColor: "#fff3a6",
      opacity: 1,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return Response.json(
      {
        memo: {
          id: memo.id,
          text: "",
          x: typeof body.x === "number" ? body.x : 40,
          y: typeof body.y === "number" ? body.y : 40,
          width: typeof body.width === "number" ? body.width : 220,
          height: typeof body.height === "number" ? body.height : 160,
          backgroundColor: "#fff3a6",
          opacity: 1,
          createdAt: null,
          updatedAt: null,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Failed to create canvas memo", error);
    return Response.json(
      { error: "메모를 추가하지 못했습니다." },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const user = getSsoUserFromRequest(request);
  if (!user) return unauthorizedSsoResponse();

  try {
    const { projectId } = await params;
    const body = (await request.json()) as Record<string, unknown> & {
      id?: unknown;
    };
    if (
      !validId(projectId) ||
      typeof body.id !== "string" ||
      !validId(body.id)
    ) {
      return Response.json(
        { error: "올바르지 않은 메모 ID입니다." },
        { status: 400 },
      );
    }
    const update: Record<string, unknown> = {
      updatedAt: FieldValue.serverTimestamp(),
    };
    if (typeof body.text === "string") update.text = body.text.slice(0, 4000);
    if (typeof body.x === "number") update.x = clamp(body.x, -12000, 12000);
    if (typeof body.y === "number") update.y = clamp(body.y, -12000, 12000);
    if (typeof body.width === "number")
      update.width = clamp(body.width, 140, 600);
    if (typeof body.height === "number")
      update.height = clamp(body.height, 100, 600);
    if (typeof body.opacity === "number")
      update.opacity = clamp(body.opacity, 0.2, 1);
    if (validColor(body.backgroundColor)) {
      update.backgroundColor = body.backgroundColor.toLowerCase();
    }
    if (Object.keys(update).length === 1) {
      return Response.json(
        { error: "수정할 메모 데이터가 없습니다." },
        { status: 400 },
      );
    }
    const db = getAdminDb();
    if (!db) {
      return Response.json(
        { error: "Firebase Admin 설정을 확인해주세요." },
        { status: 503 },
      );
    }
    const authorization = await authorizeProject(db, projectId, user, "edit");
    if (!authorization.ok) return authorization.response;
    const memo = authorization.reference.collection("memos").doc(body.id);
    if (!(await memo.get()).exists) {
      return Response.json(
        { error: "메모를 찾을 수 없습니다." },
        { status: 404 },
      );
    }
    await memo.update(update);
    return Response.json({ saved: true });
  } catch (error) {
    console.error("Failed to update canvas memo", error);
    return Response.json(
      { error: "메모를 수정하지 못했습니다." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const user = getSsoUserFromRequest(request);
  if (!user) return unauthorizedSsoResponse();

  try {
    const { projectId } = await params;
    const memoId = new URL(request.url).searchParams.get("memoId") ?? "";
    if (!validId(projectId) || !validId(memoId)) {
      return Response.json(
        { error: "올바르지 않은 메모 ID입니다." },
        { status: 400 },
      );
    }
    const db = getAdminDb();
    if (!db) {
      return Response.json(
        { error: "Firebase Admin 설정을 확인해주세요." },
        { status: 503 },
      );
    }
    const authorization = await authorizeProject(db, projectId, user, "edit");
    if (!authorization.ok) return authorization.response;
    const memo = authorization.reference.collection("memos").doc(memoId);
    if (!(await memo.get()).exists) {
      return Response.json(
        { error: "메모를 찾을 수 없습니다." },
        { status: 404 },
      );
    }
    await memo.delete();
    return Response.json({ deleted: true });
  } catch (error) {
    console.error("Failed to delete canvas memo", error);
    return Response.json(
      { error: "메모를 삭제하지 못했습니다." },
      { status: 500 },
    );
  }
}
