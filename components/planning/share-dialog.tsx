"use client";

import { useCallback, useEffect, useState } from "react";
import type { ProjectShare, SharePermission } from "@/types/project-sharing";

type ShareDialogProps = {
  open: boolean;
  projectId: string;
  onClose: () => void;
};

export function ShareDialog({ open, projectId, onClose }: ShareDialogProps) {
  const [email, setEmail] = useState("");
  const [permission, setPermission] = useState<SharePermission>("view");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [shares, setShares] = useState<ProjectShare[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadShares = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(
          `/api/projects/${encodeURIComponent(projectId)}/shares`,
          { signal },
        );
        const result = (await response.json()) as {
          ownerEmail?: string;
          shares?: ProjectShare[];
          error?: string;
        };
        if (!response.ok) {
          throw new Error(result.error ?? "공유 목록을 불러오지 못했습니다.");
        }
        setOwnerEmail(result.ownerEmail ?? "");
        setShares(Array.isArray(result.shares) ? result.shares : []);
      } catch (loadError) {
        if (loadError instanceof Error && loadError.name !== "AbortError") {
          setError(loadError.message);
        }
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [projectId],
  );

  useEffect(() => {
    if (!open || !projectId) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void loadShares(controller.signal);
    }, 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [loadShares, open, projectId]);

  useEffect(() => {
    if (!open) return;
    const closeWithEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeWithEscape);
    return () => window.removeEventListener("keydown", closeWithEscape);
  }, [onClose, open]);

  const saveShare = async (
    targetEmail: string,
    targetPermission: SharePermission,
  ) => {
    setSaving(true);
    setError("");
    try {
      const response = await fetch(
        `/api/projects/${encodeURIComponent(projectId)}/shares`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: targetEmail,
            permission: targetPermission,
          }),
        },
      );
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(result.error ?? "공유 설정을 저장하지 못했습니다.");
      }
      setEmail("");
      await loadShares();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "공유 설정을 저장하지 못했습니다.",
      );
    } finally {
      setSaving(false);
    }
  };

  const removeShare = async (targetEmail: string) => {
    setSaving(true);
    setError("");
    try {
      const response = await fetch(
        `/api/projects/${encodeURIComponent(projectId)}/shares?email=${encodeURIComponent(targetEmail)}`,
        { method: "DELETE" },
      );
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(result.error ?? "공유 사용자를 삭제하지 못했습니다.");
      }
      await loadShares();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "공유 사용자를 삭제하지 못했습니다.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="share-dialog-backdrop"
      role="presentation"
      onMouseDown={onClose}
    >
      <section
        className="share-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-dialog-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <h2 id="share-dialog-title">문서 공유</h2>
            <p>초대받은 사용자의 이메일과 권한을 설정합니다.</p>
          </div>
          <button
            type="button"
            className="share-dialog-close"
            onClick={onClose}
          >
            닫기
          </button>
        </header>

        <div className="share-owner">
          <span>소유자</span>
          <strong>{ownerEmail || "확인 중..."}</strong>
        </div>

        <form
          className="share-form"
          onSubmit={(event) => {
            event.preventDefault();
            void saveShare(email, permission);
          }}
        >
          <input
            type="email"
            value={email}
            placeholder="공유할 사용자 이메일"
            aria-label="공유할 사용자 이메일"
            required
            maxLength={254}
            onChange={(event) => setEmail(event.target.value)}
          />
          <select
            value={permission}
            aria-label="공유 권한"
            onChange={(event) =>
              setPermission(event.target.value as SharePermission)
            }
          >
            <option value="view">보기만 가능</option>
            <option value="edit">수정 가능</option>
          </select>
          <button
            type="submit"
            className="share-submit-button"
            disabled={saving || !email.trim()}
          >
            공유
          </button>
        </form>

        {error && <p className="share-error">{error}</p>}

        <div className="share-list">
          {loading ? (
            <p className="share-empty">공유 목록을 불러오는 중...</p>
          ) : shares.length ? (
            shares.map((share) => (
              <div className="share-list-item" key={share.email}>
                <span>{share.email}</span>
                <select
                  value={share.permission}
                  aria-label={`${share.email} 권한`}
                  disabled={saving}
                  onChange={(event) =>
                    void saveShare(
                      share.email,
                      event.target.value as SharePermission,
                    )
                  }
                >
                  <option value="view">보기</option>
                  <option value="edit">수정</option>
                </select>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void removeShare(share.email)}
                >
                  삭제
                </button>
              </div>
            ))
          ) : (
            <p className="share-empty">아직 공유한 사용자가 없습니다.</p>
          )}
        </div>
      </section>
    </div>
  );
}
