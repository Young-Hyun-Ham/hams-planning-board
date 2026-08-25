"use client";

import Link from "next/link";
import { useState } from "react";
import { useUserStore } from "@/store";
import type { ProjectAccessLevel } from "@/types/project-sharing";
import { Icon } from "./icon";
import { ShareDialog } from "./share-dialog";

type EditorHeaderProps = {
  saved: string;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onPreview: () => void;
  projectId?: string;
  access: ProjectAccessLevel;
};

export function EditorHeader({
  saved,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onPreview,
  projectId,
  access,
}: EditorHeaderProps) {
  const [shareOpen, setShareOpen] = useState(false);
  const user = useUserStore((state) => state.user);
  const displayName =
    user?.displayName ||
    user?.name ||
    user?.nickname ||
    user?.email ||
    "사용자";
  const avatarText = displayName.trim().charAt(0).toUpperCase() || "?";

  return (
    <header className="topbar">
      <div className="brand">
        <Link
          href="/"
          aria-label="PlanCraft 홈으로 이동"
          style={{
            color: "inherit",
            display: "flex",
            alignItems: "center",
            gap: 9,
            textDecoration: "none",
          }}
        >
          <div className="brand-mark">P</div>
          <strong>PlanCraft</strong>
        </Link>
        <span className="beta">BETA</span>
      </div>
      <div className="doc-title">
        <span>개인 포트폴리오 웹사이트</span>
        <small>{saved}</small>
      </div>
      <div className="header-actions">
        <button
          type="button"
          className="icon-button"
          title="실행 취소"
          aria-label="실행 취소"
          disabled={!canUndo}
          onClick={onUndo}
        >
          <Icon name="undo" />
        </button>
        <button
          type="button"
          className="icon-button"
          title="다시 실행"
          aria-label="다시 실행"
          disabled={!canRedo}
          onClick={onRedo}
        >
          <Icon name="redo" />
        </button>
        <span className="divider" />
        <button type="button" className="plain-button" onClick={onPreview}>
          <Icon name="play" /> 미리보기
        </button>
        {access === "owner" ? (
          <button
            type="button"
            className="share-button"
            disabled={!projectId}
            title={
              projectId
                ? "문서 공유 설정"
                : "문서를 저장한 후 공유할 수 있습니다."
            }
            onClick={() => setShareOpen(true)}
          >
            <Icon name="share" /> 공유
          </button>
        ) : (
          <span className={`access-badge ${access}`}>
            {access === "edit" ? "공유됨 · 수정 가능" : "공유됨 · 보기 전용"}
          </span>
        )}
        {user ? (
          <Link
            className="plain-button"
            href="/api/auth/logout?returnTo=/login"
          >
            로그아웃
          </Link>
        ) : (
          <Link className="plain-button" href="/login?returnTo=/planning">
            로그인
          </Link>
        )}
        <div
          className="avatar"
          title={`${displayName} (${user?.email ?? "로그인 정보 없음"})`}
          aria-label={`${displayName} 사용자 프로필`}
        >
          {avatarText}
        </div>
      </div>
      {projectId && (
        <ShareDialog
          open={shareOpen}
          projectId={projectId}
          onClose={() => setShareOpen(false)}
        />
      )}
    </header>
  );
}
