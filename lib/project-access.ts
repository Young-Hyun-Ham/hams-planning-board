import type { SsoSessionUser } from "@hams-fam/sso-client";
import type {
  DocumentData,
  DocumentReference,
  DocumentSnapshot,
  Firestore,
} from "firebase-admin/firestore";
import type { ProjectAccessLevel, ProjectShare } from "@/types/project-sharing";

const accessRank: Record<ProjectAccessLevel, number> = {
  view: 1,
  edit: 2,
  owner: 3,
};

export const validProjectId = (value: unknown): value is string =>
  typeof value === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(value);

export const normalizeEmail = (value: string) => value.trim().toLowerCase();

export function getProjectAccessLevel(
  data: DocumentData,
  user: SsoSessionUser,
): ProjectAccessLevel | null {
  const ownerId = typeof data.ownerId === "string" ? data.ownerId : "";
  const ownerEmail =
    typeof data.ownerEmail === "string" ? normalizeEmail(data.ownerEmail) : "";
  const userEmail = normalizeEmail(user.email);

  if (!ownerId && !ownerEmail) return null;
  if (ownerId === user.id || (ownerEmail && ownerEmail === userEmail)) {
    return "owner";
  }

  const review =
    data.review && typeof data.review === "object" ? data.review : null;
  if (
    review &&
    typeof review.reviewerEmail === "string" &&
    normalizeEmail(review.reviewerEmail) === userEmail
  ) {
    return "view";
  }

  const shares = Array.isArray(data.shares) ? data.shares : [];
  const share = shares.find(
    (item) =>
      item &&
      typeof item === "object" &&
      typeof item.email === "string" &&
      normalizeEmail(item.email) === userEmail,
  ) as { permission?: unknown } | undefined;

  return share?.permission === "edit"
    ? "edit"
    : share?.permission === "view"
      ? "view"
      : null;
}

export function hasProjectAccess(
  actual: ProjectAccessLevel | null,
  required: "view" | "edit" | "owner",
) {
  return actual !== null && accessRank[actual] >= accessRank[required];
}

export function serializeProjectShares(data: DocumentData): ProjectShare[] {
  if (!Array.isArray(data.shares)) return [];

  return data.shares.flatMap((item): ProjectShare[] => {
    if (
      !item ||
      typeof item !== "object" ||
      typeof item.email !== "string" ||
      (item.permission !== "view" && item.permission !== "edit")
    ) {
      return [];
    }

    return [
      {
        email: normalizeEmail(item.email),
        permission: item.permission,
        addedAt: item.addedAt?.toDate?.().toISOString?.() ?? null,
      },
    ];
  });
}

type AuthorizedProject =
  | {
      ok: true;
      reference: DocumentReference;
      snapshot: DocumentSnapshot;
      access: ProjectAccessLevel;
    }
  | { ok: false; response: Response };

export async function authorizeProject(
  db: Firestore,
  projectId: string,
  user: SsoSessionUser,
  required: "view" | "edit" | "owner",
): Promise<AuthorizedProject> {
  if (!validProjectId(projectId)) {
    return {
      ok: false,
      response: Response.json(
        { error: "올바르지 않은 문서 ID입니다." },
        { status: 400 },
      ),
    };
  }

  const reference = db.collection("planningProjects").doc(projectId);
  const snapshot = await reference.get();
  if (!snapshot.exists) {
    return {
      ok: false,
      response: Response.json(
        { error: "기획 문서를 찾을 수 없습니다." },
        { status: 404 },
      ),
    };
  }

  const access = getProjectAccessLevel(snapshot.data() ?? {}, user);
  if (!access || !hasProjectAccess(access, required)) {
    return {
      ok: false,
      response: Response.json(
        {
          error:
            required === "view"
              ? "이 문서를 볼 권한이 없습니다."
              : required === "edit"
                ? "이 문서를 수정할 권한이 없습니다."
                : "문서 소유자만 공유 설정을 변경할 수 있습니다.",
        },
        { status: 403 },
      ),
    };
  }

  return { ok: true, reference, snapshot, access };
}
