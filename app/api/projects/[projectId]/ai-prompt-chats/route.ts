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
      .collection("aiPromptChats")
      .orderBy("createdAt", "desc")
      .limit(100)
      .get();
    const chats = snapshot.docs.map((document) => {
      const data = document.data();
      return {
        id: document.id,
        prompt: typeof data.prompt === "string" ? data.prompt : "",
        model: typeof data.model === "string" ? data.model : "",
        screenTitle:
          typeof data.screenTitle === "string" ? data.screenTitle : "",
        createdAt: data.createdAt?.toDate?.().toISOString?.() ?? null,
      };
    });
    return Response.json({ chats });
  } catch (error) {
    console.error("Failed to load AI prompt chats", error);
    return Response.json(
      { error: "AI 프롬프트 내역을 불러오지 못했습니다." },
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
      prompt?: unknown;
      model?: unknown;
      screenTitle?: unknown;
    };
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    const model = typeof body.model === "string" ? body.model.trim() : "";
    const screenTitle =
      typeof body.screenTitle === "string" ? body.screenTitle.trim() : "";
    if (!prompt || prompt.length > 2_000 || !model || model.length > 128) {
      return Response.json(
        { error: "저장할 AI 프롬프트 또는 모델 정보가 올바르지 않습니다." },
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
    const project = authorization.reference;

    const chat = project.collection("aiPromptChats").doc();
    const batch = db.batch();
    batch.set(chat, {
      prompt,
      model,
      screenTitle: screenTitle.slice(0, 80),
      createdAt: FieldValue.serverTimestamp(),
    });
    batch.update(project, {
      prompt: "",
      updatedAt: FieldValue.serverTimestamp(),
    });
    await batch.commit();

    return Response.json({ id: chat.id, saved: true }, { status: 201 });
  } catch (error) {
    console.error("Failed to save AI prompt chat", error);
    return Response.json(
      { error: "AI 프롬프트 내역을 저장하지 못했습니다." },
      { status: 500 },
    );
  }
}
