import Link from "next/link";
import { Icon } from "./icon";

type EditorHeaderProps = {
  saved: string;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onPreview: () => void;
};

export function EditorHeader({
  saved,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onPreview,
}: EditorHeaderProps) {
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
        <button className="share-button">
          <Icon name="share" /> 공유
        </button>
        <div className="avatar">민</div>
      </div>
    </header>
  );
}
