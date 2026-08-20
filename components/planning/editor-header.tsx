import { Icon } from "./icon";

export function EditorHeader({ saved }: { saved: string }) {
  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand-mark">P</div>
        <strong>PlanCraft</strong>
        <span className="beta">BETA</span>
      </div>
      <div className="doc-title">
        <span>개인 포트폴리오 웹사이트</span>
        <small>{saved}</small>
      </div>
      <div className="header-actions">
        <button className="icon-button">
          <Icon name="undo" />
        </button>
        <button className="icon-button muted">
          <Icon name="redo" />
        </button>
        <span className="divider" />
        <button className="plain-button">
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
