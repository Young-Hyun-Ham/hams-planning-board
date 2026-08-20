import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";

type SaveBody = {
  action?: unknown;
  projectId?: unknown;
  title?: unknown;
  prompt?: unknown;
  layers?: unknown;
  sizes?: unknown;
  positions?: unknown;
  layerText?: unknown;
  layerImages?: unknown;
  selected?: unknown;
};

const validProjectId = (value: unknown): value is string =>
  typeof value === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(value);

export async function GET(request: Request) {
  try {
    const db = getAdminDb();
    if (!db)
      return Response.json(
        { error: "Firebase Admin 설정을 확인해주세요." },
        { status: 503 },
      );
    const projectId = new URL(request.url).searchParams.get("projectId");
    if (projectId) {
      if (!validProjectId(projectId))
        return Response.json(
          { error: "올바르지 않은 문서 ID입니다." },
          { status: 400 },
        );
      const document = await db
        .collection("planningProjects")
        .doc(projectId)
        .get();
      if (!document.exists)
        return Response.json(
          { error: "기획 문서를 찾을 수 없습니다." },
          { status: 404 },
        );
      const data = document.data() ?? {};
      return Response.json({
        project: {
          id: document.id,
          title: data.title,
          prompt: data.prompt,
          layers: data.layers,
          sizes: data.sizes,
          positions: data.positions,
          layerText: data.layerText,
          layerImages: data.layerImages,
          selected: data.selected,
        },
      });
    }
    const snapshot = await db
      .collection("planningProjects")
      .orderBy("updatedAt", "desc")
      .limit(50)
      .get();
    const projects = snapshot.docs.map((document) => {
      const data = document.data();
      return {
        id: document.id,
        title:
          typeof data.title === "string" && data.title.trim()
            ? data.title
            : "제목 없는 문서",
        status: typeof data.status === "string" ? data.status : "draft",
        updatedAt: data.updatedAt?.toDate?.().toISOString?.() ?? null,
      };
    });
    return Response.json({ projects });
  } catch (error) {
    console.error("Failed to load planning projects", error);
    return Response.json(
      { error: "기획 문서 목록을 불러오지 못했습니다." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).length > 900_000) {
      return Response.json(
        {
          error:
            "이미지를 포함한 화면 데이터가 너무 큽니다. 이미지 용량을 줄여주세요.",
        },
        { status: 413 },
      );
    }
    const body = JSON.parse(raw) as SaveBody;
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    if ((body.action !== "save" && !prompt) || prompt.length > 2_000) {
      return Response.json(
        { error: "요청 내용은 1~2,000자로 입력해주세요." },
        { status: 400 },
      );
    }

    const db = getAdminDb();
    if (!db)
      return Response.json(
        { error: "Firebase Admin 설정을 확인해주세요." },
        { status: 503 },
      );

    const data = {
      schemaVersion: 1,
      title: typeof body.title === "string" ? body.title : "새 기획 문서",
      prompt,
      status: "draft",
      layers: Array.isArray(body.layers) ? body.layers : [],
      sizes: body.sizes && typeof body.sizes === "object" ? body.sizes : {},
      positions:
        body.positions && typeof body.positions === "object"
          ? body.positions
          : {},
      layerText:
        body.layerText && typeof body.layerText === "object"
          ? body.layerText
          : {},
      layerImages:
        body.layerImages && typeof body.layerImages === "object"
          ? body.layerImages
          : {},
      selected: typeof body.selected === "string" ? body.selected : "page",
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (validProjectId(body.projectId)) {
      const reference = db.collection("planningProjects").doc(body.projectId);
      const snapshot = await reference.get();
      if (!snapshot.exists)
        return Response.json(
          { error: "저장할 기획 문서를 찾을 수 없습니다." },
          { status: 404 },
        );
      await reference.update({ ...data, content: FieldValue.delete() });
      return Response.json({ id: reference.id, saved: true, updated: true });
    }

    const project = await db
      .collection("planningProjects")
      .add({ ...data, createdAt: FieldValue.serverTimestamp() });
    return Response.json(
      { id: project.id, saved: true, updated: false },
      { status: 201 },
    );
  } catch (error) {
    console.error("Failed to save planning project", error);
    return Response.json(
      { error: "Firebase에 화면 데이터를 저장하지 못했습니다." },
      { status: 500 },
    );
  }
}
