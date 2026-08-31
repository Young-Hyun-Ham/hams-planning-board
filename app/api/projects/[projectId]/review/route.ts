import { FieldValue } from "firebase-admin/firestore";
import {
  getSsoUserFromRequest,
  unauthorizedSsoResponse,
} from "@hams-fam/sso-client";
import { getAdminDb } from "@/lib/firebase-admin";
import {
  authorizeProject,
  normalizeEmail,
  validProjectId,
} from "@/lib/project-access";

type ReviewAction = "request" | "reject" | "complete";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const user = getSsoUserFromRequest(request);
  if (!user) return unauthorizedSsoResponse();
  try {
    const { projectId } = await params;
    const db = getAdminDb();
    if (!db)
      return Response.json(
        { error: "Firebase Admin 설정을 확인해주세요." },
        { status: 503 },
      );
    const authorization = await authorizeProject(db, projectId, user, "view");
    if (!authorization.ok) return authorization.response;
    const snapshot = await authorization.reference
      .collection("approvalHistory")
      .orderBy("createdAt", "desc")
      .limit(100)
      .get();
    const history = snapshot.docs.map((document) => {
      const data = document.data();
      return {
        id: document.id,
        projectId: data.projectId,
        projectTitle: data.projectTitle,
        ownerId: data.ownerId,
        ownerEmail: data.ownerEmail,
        action: data.action,
        fromStatus: data.fromStatus,
        toStatus: data.toStatus,
        actorEmail: data.actorEmail,
        actorRole: data.actorRole,
        reviewerEmail: data.reviewerEmail ?? null,
        message: data.message ?? "",
        createdAt: data.createdAt?.toDate?.().toISOString?.() ?? null,
      };
    });
    return Response.json({ history });
  } catch (error) {
    console.error("Failed to load approval history", error);
    return Response.json(
      { error: "승인 이력을 불러오지 못했습니다." },
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
    if (!validProjectId(projectId)) {
      return Response.json(
        { error: "올바르지 않은 문서 ID입니다." },
        { status: 400 },
      );
    }
    const body = (await request.json()) as {
      action?: unknown;
      reviewerEmail?: unknown;
      message?: unknown;
    };
    const action = body.action as ReviewAction;
    const message = typeof body.message === "string" ? body.message.trim() : "";
    if (!(["request", "reject", "complete"] as unknown[]).includes(action)) {
      return Response.json(
        { error: "올바르지 않은 승인 작업입니다." },
        { status: 400 },
      );
    }
    if (message.length > 2000 || (action !== "request" && !message)) {
      return Response.json(
        { error: "처리 내용은 1~2,000자로 입력해주세요." },
        { status: 400 },
      );
    }
    const db = getAdminDb();
    if (!db)
      return Response.json(
        { error: "Firebase Admin 설정을 확인해주세요." },
        { status: 503 },
      );

    if (action === "request") {
      const authorization = await authorizeProject(
        db,
        projectId,
        user,
        "owner",
      );
      if (!authorization.ok) return authorization.response;
      const projectData = authorization.snapshot.data() ?? {};
      const currentStatus = projectData.status ?? "draft";
      if (currentStatus === "review") {
        return Response.json(
          { error: "이미 검토 요청 중인 문서입니다." },
          { status: 409 },
        );
      }
      const reviewerEmail =
        typeof body.reviewerEmail === "string"
          ? normalizeEmail(body.reviewerEmail)
          : "";
      if (!/^\S+@\S+\.\S+$/.test(reviewerEmail)) {
        return Response.json(
          { error: "검토자의 이메일을 입력해주세요." },
          { status: 400 },
        );
      }
      if (reviewerEmail === normalizeEmail(user.email)) {
        return Response.json(
          { error: "문서 소유자는 검토자가 될 수 없습니다." },
          { status: 400 },
        );
      }
      const historyReference = authorization.reference
        .collection("approvalHistory")
        .doc();
      const batch = db.batch();
      batch.update(authorization.reference, {
        status: "review",
        review: {
          reviewerEmail,
          status: "pending",
          message,
          requestedBy: user.email,
          requestedAt: FieldValue.serverTimestamp(),
          decidedAt: null,
        },
        updatedAt: FieldValue.serverTimestamp(),
      });
      batch.set(historyReference, {
        projectId,
        projectTitle:
          typeof projectData.title === "string" && projectData.title.trim()
            ? projectData.title.trim()
            : "제목 없는 문서",
        ownerId:
          typeof projectData.ownerId === "string" ? projectData.ownerId : "",
        ownerEmail:
          typeof projectData.ownerEmail === "string"
            ? normalizeEmail(projectData.ownerEmail)
            : "",
        action: "request",
        fromStatus: currentStatus,
        toStatus: "review",
        actorId: user.id,
        actorEmail: normalizeEmail(user.email),
        actorRole: "owner",
        reviewerEmail,
        message,
        createdAt: FieldValue.serverTimestamp(),
      });
      await batch.commit();
      return Response.json({ saved: true, status: "review", reviewerEmail });
    }

    const authorization = await authorizeProject(db, projectId, user, "view");
    if (!authorization.ok) return authorization.response;
    const data = authorization.snapshot.data() ?? {};
    if (action === "complete" && authorization.access === "owner") {
      if (data.status === "review") {
        return Response.json(
          { error: "검토자의 반려 또는 완료 전에는 직접 완료할 수 없습니다." },
          { status: 409 },
        );
      }
      const historyReference = authorization.reference
        .collection("approvalHistory")
        .doc();
      const batch = db.batch();
      batch.update(authorization.reference, {
        status: "complete",
        completion: {
          message,
          completedBy: user.email,
          completedAt: FieldValue.serverTimestamp(),
        },
        updatedAt: FieldValue.serverTimestamp(),
      });
      batch.set(historyReference, {
        projectId,
        projectTitle:
          typeof data.title === "string" && data.title.trim()
            ? data.title.trim()
            : "제목 없는 문서",
        ownerId: typeof data.ownerId === "string" ? data.ownerId : "",
        ownerEmail:
          typeof data.ownerEmail === "string"
            ? normalizeEmail(data.ownerEmail)
            : "",
        action: "complete",
        fromStatus: data.status ?? "draft",
        toStatus: "complete",
        actorId: user.id,
        actorEmail: normalizeEmail(user.email),
        actorRole: "owner",
        reviewerEmail: null,
        message,
        createdAt: FieldValue.serverTimestamp(),
      });
      await batch.commit();
      return Response.json({ saved: true, status: "complete" });
    }
    if (
      typeof data.review?.reviewerEmail !== "string" ||
      normalizeEmail(data.review.reviewerEmail) !==
        normalizeEmail(user.email) ||
      data.status !== "review"
    ) {
      return Response.json(
        { error: "현재 검토를 처리할 권한이 없습니다." },
        { status: 403 },
      );
    }
    const nextStatus = action === "reject" ? "rejected" : "complete";
    const historyReference = authorization.reference
      .collection("approvalHistory")
      .doc();
    const batch = db.batch();
    batch.update(authorization.reference, {
      status: nextStatus,
      "review.status": action === "reject" ? "rejected" : "completed",
      "review.message": message,
      "review.decidedBy": user.email,
      "review.decidedAt": FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    batch.set(historyReference, {
      projectId,
      projectTitle:
        typeof data.title === "string" && data.title.trim()
          ? data.title.trim()
          : "제목 없는 문서",
      ownerId: typeof data.ownerId === "string" ? data.ownerId : "",
      ownerEmail:
        typeof data.ownerEmail === "string"
          ? normalizeEmail(data.ownerEmail)
          : "",
      action,
      fromStatus: "review",
      toStatus: nextStatus,
      actorId: user.id,
      actorEmail: normalizeEmail(user.email),
      actorRole: "reviewer",
      reviewerEmail: normalizeEmail(user.email),
      message,
      createdAt: FieldValue.serverTimestamp(),
    });
    await batch.commit();
    return Response.json({ saved: true, status: nextStatus });
  } catch (error) {
    console.error("Failed to update project review", error);
    return Response.json(
      { error: "검토 상태를 변경하지 못했습니다." },
      { status: 500 },
    );
  }
}
