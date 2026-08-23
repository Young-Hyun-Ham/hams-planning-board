import { Timestamp } from "firebase-admin/firestore";
import {
  getSsoUserFromRequest,
  unauthorizedSsoResponse,
} from "@hams-fam/sso-client";
import { getAdminDb } from "@/lib/firebase-admin";
import {
  authorizeProject,
  normalizeEmail,
  serializeProjectShares,
} from "@/lib/project-access";
import type { SharePermission } from "@/types/project-sharing";

const validEmail = (value: string) =>
  value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const user = getSsoUserFromRequest(request);
  if (!user) return unauthorizedSsoResponse();

  try {
    const { projectId } = await params;
    const db = getAdminDb();
    if (!db) {
      return Response.json(
        { error: "Firebase Admin 설정을 확인해주세요." },
        { status: 503 },
      );
    }

    const authorization = await authorizeProject(db, projectId, user, "owner");
    if (!authorization.ok) return authorization.response;
    const data = authorization.snapshot.data() ?? {};

    return Response.json({
      ownerEmail:
        typeof data.ownerEmail === "string" ? data.ownerEmail : user.email,
      shares: serializeProjectShares(data),
    });
  } catch (error) {
    console.error("Failed to load project shares", error);
    return Response.json(
      { error: "공유 사용자 목록을 불러오지 못했습니다." },
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
    const body = (await request.json()) as {
      email?: unknown;
      permission?: unknown;
    };
    const email =
      typeof body.email === "string" ? normalizeEmail(body.email) : "";
    const permission: SharePermission | null =
      body.permission === "view" || body.permission === "edit"
        ? body.permission
        : null;

    if (!validEmail(email) || !permission) {
      return Response.json(
        { error: "공유할 이메일과 권한을 올바르게 입력해주세요." },
        { status: 400 },
      );
    }
    if (email === normalizeEmail(user.email)) {
      return Response.json(
        { error: "문서 소유자 자신은 공유 대상에 추가할 수 없습니다." },
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

    const authorization = await authorizeProject(db, projectId, user, "owner");
    if (!authorization.ok) return authorization.response;

    await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(authorization.reference);
      const data = snapshot.data() ?? {};
      const shares = Array.isArray(data.shares) ? data.shares : [];
      const nextShare = { email, permission, addedAt: Timestamp.now() };
      const existingIndex = shares.findIndex(
        (item) =>
          item &&
          typeof item.email === "string" &&
          normalizeEmail(item.email) === email,
      );
      const nextShares = [...shares];
      if (existingIndex >= 0) nextShares[existingIndex] = nextShare;
      else nextShares.push(nextShare);
      transaction.update(authorization.reference, { shares: nextShares });
    });

    return Response.json({ saved: true, email, permission });
  } catch (error) {
    console.error("Failed to save project share", error);
    return Response.json(
      { error: "공유 설정을 저장하지 못했습니다." },
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
    const email = normalizeEmail(
      new URL(request.url).searchParams.get("email") ?? "",
    );
    if (!validEmail(email)) {
      return Response.json(
        { error: "삭제할 공유 사용자 이메일이 올바르지 않습니다." },
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

    const authorization = await authorizeProject(db, projectId, user, "owner");
    if (!authorization.ok) return authorization.response;

    await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(authorization.reference);
      const data = snapshot.data() ?? {};
      const shares = Array.isArray(data.shares) ? data.shares : [];
      transaction.update(authorization.reference, {
        shares: shares.filter(
          (item) =>
            !item ||
            typeof item.email !== "string" ||
            normalizeEmail(item.email) !== email,
        ),
      });
    });

    return Response.json({ deleted: true });
  } catch (error) {
    console.error("Failed to delete project share", error);
    return Response.json(
      { error: "공유 사용자를 삭제하지 못했습니다." },
      { status: 500 },
    );
  }
}
