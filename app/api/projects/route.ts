import { FieldValue } from "firebase-admin/firestore";
import {
  getSsoUserFromRequest,
  unauthorizedSsoResponse,
} from "@hams-fam/sso-client";
import { getAdminDb } from "@/lib/firebase-admin";
import {
  authorizeProject,
  getProjectAccessLevel,
  normalizeEmail,
  validProjectId,
} from "@/lib/project-access";

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
  layerStyles?: unknown;
  selected?: unknown;
};

export async function GET(request: Request) {
  const user = getSsoUserFromRequest(request);
  if (!user) return unauthorizedSsoResponse();

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
      const authorization = await authorizeProject(db, projectId, user, "view");
      if (!authorization.ok) return authorization.response;
      const document = authorization.snapshot;
      const data = document.data() ?? {};
      return Response.json({
        access: authorization.access,
        project: {
          id: document.id,
          title: data.title,
          prompt: data.prompt,
          layers: data.layers,
          sizes: data.sizes,
          positions: data.positions,
          layerText: data.layerText,
          layerImages: data.layerImages,
          layerStyles: data.layerStyles,
          selected: data.selected,
          status: typeof data.status === "string" ? data.status : "draft",
          review:
            data.review && typeof data.review === "object"
              ? {
                  reviewerEmail: data.review.reviewerEmail,
                  status: data.review.status,
                  message: data.review.message,
                  requestedAt:
                    data.review.requestedAt?.toDate?.().toISOString?.() ?? null,
                  decidedAt:
                    data.review.decidedAt?.toDate?.().toISOString?.() ?? null,
                }
              : null,
          isReviewer:
            typeof data.review?.reviewerEmail === "string" &&
            normalizeEmail(data.review.reviewerEmail) ===
              normalizeEmail(user.email),
        },
      });
    }
    const snapshot = await db
      .collection("planningProjects")
      .orderBy("updatedAt", "desc")
      .limit(50)
      .get();
    const projects = snapshot.docs.flatMap((document) => {
      const data = document.data();
      const access = getProjectAccessLevel(data, user);
      if (!access) return [];

      return [
        {
          id: document.id,
          title:
            typeof data.title === "string" && data.title.trim()
              ? data.title
              : "제목 없는 문서",
          status: typeof data.status === "string" ? data.status : "draft",
          updatedAt: data.updatedAt?.toDate?.().toISOString?.() ?? null,
          access,
          ownerEmail:
            typeof data.ownerEmail === "string" ? data.ownerEmail : user.email,
          reviewerEmail:
            typeof data.review?.reviewerEmail === "string"
              ? data.review.reviewerEmail
              : null,
          isReviewer:
            typeof data.review?.reviewerEmail === "string" &&
            normalizeEmail(data.review.reviewerEmail) ===
              normalizeEmail(user.email),
        },
      ];
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
  const user = getSsoUserFromRequest(request);
  if (!user) return unauthorizedSsoResponse();

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
      layerStyles:
        body.layerStyles && typeof body.layerStyles === "object"
          ? body.layerStyles
          : {},
      selected: typeof body.selected === "string" ? body.selected : "page",
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (validProjectId(body.projectId)) {
      const authorization = await authorizeProject(
        db,
        body.projectId,
        user,
        "edit",
      );
      if (!authorization.ok) return authorization.response;
      if (authorization.snapshot.data()?.status === "review") {
        return Response.json(
          {
            error: "검토 중인 문서는 반려 또는 완료 전까지 저장할 수 없습니다.",
          },
          { status: 409 },
        );
      }
      const reference = authorization.reference;
      const currentData = authorization.snapshot.data() ?? {};
      const currentStatus = currentData.status ?? "draft";
      const projectTitle =
        typeof data.title === "string" && data.title.trim()
          ? data.title.trim()
          : "제목 없는 문서";
      const historyReference = reference.collection("approvalHistory").doc();
      const batch = db.batch();
      batch.update(reference, {
        ...data,
        status: "draft",
        content: FieldValue.delete(),
      });
      batch.set(historyReference, {
        projectId: reference.id,
        projectTitle,
        ownerId:
          typeof currentData.ownerId === "string" ? currentData.ownerId : "",
        ownerEmail:
          typeof currentData.ownerEmail === "string"
            ? normalizeEmail(currentData.ownerEmail)
            : "",
        action: "save",
        fromStatus: currentStatus,
        toStatus: "draft",
        actorId: user.id,
        actorEmail: normalizeEmail(user.email),
        actorRole: authorization.access,
        reviewerEmail: null,
        message: "",
        createdAt: FieldValue.serverTimestamp(),
      });
      await batch.commit();
      return Response.json({
        id: reference.id,
        saved: true,
        updated: true,
        access: authorization.access,
      });
    }

    const project = db.collection("planningProjects").doc();
    const historyReference = project.collection("approvalHistory").doc();
    const batch = db.batch();
    batch.set(project, {
      ...data,
      status: "draft",
      ownerId: user.id,
      ownerEmail: normalizeEmail(user.email),
      shares: [],
      createdAt: FieldValue.serverTimestamp(),
    });
    batch.set(historyReference, {
      projectId: project.id,
      projectTitle:
        typeof data.title === "string" && data.title.trim()
          ? data.title.trim()
          : "제목 없는 문서",
      ownerId: user.id,
      ownerEmail: normalizeEmail(user.email),
      action: "save",
      fromStatus: null,
      toStatus: "draft",
      actorId: user.id,
      actorEmail: normalizeEmail(user.email),
      actorRole: "owner",
      reviewerEmail: null,
      message: "",
      createdAt: FieldValue.serverTimestamp(),
    });
    await batch.commit();
    return Response.json(
      { id: project.id, saved: true, updated: false, access: "owner" },
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
