"use client";

import Link from "next/link";
import { Icon } from "@/components/planning/icon";

const recentProjects = [
  {
    title: "고객 상담 대시보드",
    type: "Web app",
    status: "검토중",
    updated: "오늘 16:20",
  },
  {
    title: "모바일 예약 플로우",
    type: "Mobile",
    status: "작업중",
    updated: "어제 21:04",
  },
  {
    title: "관리자 권한 설정",
    type: "Back office",
    status: "완료",
    updated: "8월 19일",
  },
];

const templates = ["빈 화면설계서", "서비스 대시보드", "모바일 앱", "관리자 페이지"];

export default function Home() {
  return (
    <main className="home-shell">
      <aside className="home-sidebar" aria-label="프로젝트 탐색">
        <div className="home-brand">
          <span className="home-brand-mark">P</span>
          <div>
            <strong>PlanCraft</strong>
            <small>Planning Board</small>
          </div>
        </div>

        <nav className="home-nav">
          <a className="active" href="#workspace">
            <Icon name="page" /> <span>작업공간</span>
          </a>
          <a href="#templates">
            <Icon name="frame" /> <span>템플릿</span>
          </a>
          <a href="#team">
            <Icon name="comment" /> <span>코멘트</span>
          </a>
          <a href="#export">
            <Icon name="share" /> <span>퍼블리싱</span>
          </a>
        </nav>

        <div className="home-sidebar-panel">
          <strong>AI 화면 초안</strong>
          <p>요구사항을 입력하면 레이어 구조와 기본 컴포넌트를 빠르게 잡습니다.</p>
          <Link href="/planning">새 보드 열기</Link>
        </div>
      </aside>

      <section className="home-main" id="workspace">
        <header className="home-topbar">
          <div>
            <span className="home-eyebrow">Design workspace</span>
            <h1>화면설계서를 만들고, 피그마처럼 관리하세요.</h1>
          </div>
          <div className="home-actions">
            <button type="button" aria-label="검색">
              <Icon name="cursor" />
            </button>
            <Link className="home-secondary-action" href="/preview">
              미리보기
            </Link>
            <Link className="home-primary-action" href="/planning">
              <Icon name="plus" /> 새 화면설계서
            </Link>
          </div>
        </header>

        <section className="home-hero" aria-label="보드 요약">
          <div className="home-hero-copy">
            <div className="home-status-row">
              <span>Team board</span>
              <span>12 pages</span>
              <span>Firebase save</span>
            </div>
            <h2>아이디어에서 퍼블리싱 코드까지 한 흐름으로</h2>
            <p>
              레이어, 섹션, 텍스트, 이미지, 입력 컴포넌트를 캔버스에서 배치하고
              HTML/CSS/React 코드로 넘길 수 있는 화면설계 작업대입니다.
            </p>
            <div className="home-hero-actions">
              <Link href="/planning">에디터 시작</Link>
              <a href="#recent">최근 문서 보기</a>
            </div>
          </div>

          <div className="home-board-preview" aria-hidden="true">
            <div className="preview-toolbar">
              <span />
              <span />
              <span />
              <strong>고객 포털 메인</strong>
            </div>
            <div className="preview-canvas">
              <div className="preview-left">
                <span className="preview-logo" />
                <span />
                <span />
                <span />
              </div>
              <div className="preview-artboard">
                <div className="preview-hero-line" />
                <div className="preview-title-line" />
                <div className="preview-card-row">
                  <span />
                  <span />
                  <span />
                </div>
                <div className="preview-table">
                  <span />
                  <span />
                  <span />
                  <span />
                </div>
              </div>
              <div className="preview-inspector">
                <span />
                <span />
                <span />
              </div>
            </div>
          </div>
        </section>

        <section className="home-grid">
          <div className="home-section" id="recent">
            <div className="home-section-head">
              <h2>최근 화면설계서</h2>
              <Link href="/planning">전체 열기</Link>
            </div>
            <div className="home-project-list">
              {recentProjects.map((project) => (
                <Link className="home-project" href="/planning" key={project.title}>
                  <span className="project-thumb">
                    <Icon name="page" />
                  </span>
                  <span>
                    <strong>{project.title}</strong>
                    <small>{project.type}</small>
                  </span>
                  <em>{project.status}</em>
                  <time>{project.updated}</time>
                </Link>
              ))}
            </div>
          </div>

          <div className="home-section" id="templates">
            <div className="home-section-head">
              <h2>빠른 시작</h2>
            </div>
            <div className="home-template-grid">
              {templates.map((template, index) => (
                <Link href="/planning" className="home-template" key={template}>
                  <span>{index + 1}</span>
                  <strong>{template}</strong>
                  <small>기본 레이어 구성</small>
                </Link>
              ))}
            </div>
          </div>

          <div className="home-section home-wide" id="team">
            <div className="home-section-head">
              <h2>협업 상태</h2>
              <span>실시간 작업 로그</span>
            </div>
            <div className="home-activity">
              <p>
                <strong>민수</strong>님이 모바일 예약 플로우에 코멘트 3개를
                남겼습니다.
              </p>
              <p>
                <strong>혜진</strong>님이 고객 상담 대시보드의 버튼 컴포넌트를
                수정했습니다.
              </p>
              <p>
                <strong>PlanCraft</strong>가 관리자 권한 설정 보드를 React 코드로
                변환했습니다.
              </p>
            </div>
          </div>
        </section>
      </section>

      <style jsx>{`
        .home-shell {
          min-height: 100vh;
          display: grid;
          grid-template-columns: 264px minmax(0, 1fr);
          background: #f3f4f6;
          color: #18181b;
          font-family: Arial, "Pretendard", sans-serif;
        }
        .home-sidebar {
          min-height: 100vh;
          padding: 22px 16px;
          border-right: 1px solid #e4e4e7;
          background: #ffffff;
          display: flex;
          flex-direction: column;
          gap: 26px;
        }
        .home-brand {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .home-brand-mark {
          width: 34px;
          height: 34px;
          border-radius: 8px;
          display: grid;
          place-items: center;
          color: #fff;
          background: #6d4aff;
          font-weight: 800;
        }
        .home-brand div {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .home-brand small {
          color: #71717a;
          font-size: 11px;
        }
        .home-nav {
          display: grid;
          gap: 4px;
        }
        .home-nav a,
        .home-sidebar-panel a,
        .home-primary-action,
        .home-secondary-action,
        .home-hero-actions a,
        .home-project,
        .home-template {
          text-decoration: none;
        }
        .home-nav a {
          height: 38px;
          padding: 0 10px;
          border-radius: 7px;
          display: flex;
          align-items: center;
          gap: 10px;
          color: #52525b;
          font-size: 13px;
        }
        .home-nav a.active,
        .home-nav a:hover {
          background: #f0edff;
          color: #5f3fe2;
        }
        .home-sidebar-panel {
          margin-top: auto;
          padding: 14px;
          border: 1px solid #ddd7ff;
          border-radius: 8px;
          background: #faf9ff;
        }
        .home-sidebar-panel strong {
          font-size: 13px;
        }
        .home-sidebar-panel p {
          margin: 8px 0 12px;
          color: #71717a;
          font-size: 12px;
          line-height: 1.45;
        }
        .home-sidebar-panel a {
          height: 32px;
          border-radius: 6px;
          display: grid;
          place-items: center;
          background: #6d4aff;
          color: #fff;
          font-size: 12px;
          font-weight: 700;
        }
        .home-main {
          min-width: 0;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .home-topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
        }
        .home-eyebrow {
          color: #6d4aff;
          font-size: 12px;
          font-weight: 800;
          text-transform: uppercase;
        }
        .home-topbar h1 {
          margin: 5px 0 0;
          font-size: 28px;
          line-height: 1.2;
          letter-spacing: 0;
        }
        .home-actions,
        .home-hero-actions,
        .home-status-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .home-actions button,
        .home-secondary-action,
        .home-primary-action {
          height: 36px;
          border-radius: 7px;
          border: 1px solid #dedee2;
          background: #fff;
          color: #3f3f46;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 0 13px;
          font-size: 13px;
          cursor: pointer;
        }
        .home-actions button {
          width: 36px;
          padding: 0;
        }
        .home-primary-action {
          border-color: #6d4aff;
          background: #6d4aff;
          color: #fff;
          font-weight: 700;
        }
        .home-hero {
          min-height: 360px;
          border: 1px solid #e4e4e7;
          border-radius: 8px;
          background: #fff;
          display: grid;
          grid-template-columns: minmax(320px, 0.78fr) minmax(430px, 1.22fr);
          overflow: hidden;
        }
        .home-hero-copy {
          padding: 34px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 18px;
        }
        .home-status-row span {
          padding: 5px 8px;
          border-radius: 5px;
          background: #f4f4f5;
          color: #52525b;
          font-size: 11px;
          font-weight: 700;
        }
        .home-hero-copy h2 {
          max-width: 520px;
          margin: 0;
          font-size: 38px;
          line-height: 1.14;
          letter-spacing: 0;
        }
        .home-hero-copy p {
          max-width: 550px;
          margin: 0;
          color: #52525b;
          font-size: 15px;
          line-height: 1.65;
        }
        .home-hero-actions a {
          height: 38px;
          padding: 0 15px;
          border-radius: 7px;
          display: inline-flex;
          align-items: center;
          background: #18181b;
          color: #fff;
          font-size: 13px;
          font-weight: 700;
        }
        .home-hero-actions a + a {
          background: #f4f4f5;
          color: #3f3f46;
        }
        .home-board-preview {
          margin: 22px 22px 22px 0;
          border: 1px solid #d9d9dd;
          border-radius: 8px;
          overflow: hidden;
          background: #ececee;
          box-shadow: 0 18px 45px #00000018;
        }
        .preview-toolbar {
          height: 42px;
          padding: 0 14px;
          border-bottom: 1px solid #dedee2;
          background: #fff;
          display: flex;
          align-items: center;
          gap: 7px;
        }
        .preview-toolbar span {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #e4e4e7;
        }
        .preview-toolbar strong {
          margin-left: 8px;
          font-size: 12px;
        }
        .preview-canvas {
          height: 294px;
          display: grid;
          grid-template-columns: 96px minmax(0, 1fr) 118px;
          gap: 18px;
          padding: 18px;
          background-image: radial-gradient(#d1d5db 0.7px, transparent 0.7px);
          background-size: 12px 12px;
        }
        .preview-left,
        .preview-inspector,
        .preview-artboard {
          border: 1px solid #e4e4e7;
          border-radius: 6px;
          background: #fff;
        }
        .preview-left,
        .preview-inspector {
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .preview-left span,
        .preview-inspector span {
          height: 10px;
          border-radius: 3px;
          background: #e4e4e7;
        }
        .preview-left .preview-logo {
          width: 34px;
          height: 34px;
          border-radius: 7px;
          background: #6d4aff;
        }
        .preview-artboard {
          padding: 24px;
          box-shadow: 0 8px 24px #00000012;
        }
        .preview-hero-line {
          width: 74px;
          height: 14px;
          border-radius: 4px;
          background: #6d4aff;
        }
        .preview-title-line {
          width: min(86%, 440px);
          height: 42px;
          margin-top: 16px;
          border-radius: 6px;
          background: #18181b;
        }
        .preview-card-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          margin-top: 22px;
        }
        .preview-card-row span {
          height: 70px;
          border-radius: 6px;
          background: #f0edff;
        }
        .preview-table {
          display: grid;
          gap: 8px;
          margin-top: 18px;
        }
        .preview-table span {
          height: 12px;
          border-radius: 3px;
          background: #e4e4e7;
        }
        .home-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.1fr) minmax(320px, 0.9fr);
          gap: 20px;
        }
        .home-section {
          border: 1px solid #e4e4e7;
          border-radius: 8px;
          background: #fff;
          padding: 18px;
        }
        .home-wide {
          grid-column: 1 / -1;
        }
        .home-section-head {
          min-height: 32px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 14px;
        }
        .home-section-head h2 {
          margin: 0;
          font-size: 16px;
          letter-spacing: 0;
        }
        .home-section-head a,
        .home-section-head span {
          color: #71717a;
          font-size: 12px;
          text-decoration: none;
        }
        .home-project-list,
        .home-activity {
          display: grid;
          gap: 8px;
        }
        .home-project {
          min-height: 62px;
          padding: 10px;
          border: 1px solid #ededee;
          border-radius: 7px;
          display: grid;
          grid-template-columns: 42px minmax(0, 1fr) 64px 76px;
          align-items: center;
          gap: 10px;
          color: #18181b;
        }
        .home-project:hover,
        .home-template:hover {
          border-color: #c9bfff;
          background: #fbfaff;
        }
        .project-thumb {
          width: 38px;
          height: 38px;
          border-radius: 7px;
          display: grid;
          place-items: center;
          background: #f0edff;
          color: #6545e8;
        }
        .home-project span:nth-child(2) {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .home-project strong {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 13px;
        }
        .home-project small,
        .home-project time {
          color: #71717a;
          font-size: 11px;
        }
        .home-project em {
          justify-self: start;
          padding: 4px 7px;
          border-radius: 5px;
          background: #f4f4f5;
          color: #52525b;
          font-size: 11px;
          font-style: normal;
        }
        .home-template-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }
        .home-template {
          min-height: 112px;
          padding: 14px;
          border: 1px solid #ededee;
          border-radius: 7px;
          color: #18181b;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .home-template span {
          width: 26px;
          height: 26px;
          border-radius: 6px;
          display: grid;
          place-items: center;
          background: #18181b;
          color: #fff;
          font-size: 12px;
          font-weight: 800;
        }
        .home-template small {
          color: #71717a;
          font-size: 11px;
        }
        .home-activity p {
          margin: 0;
          padding: 12px 14px;
          border-radius: 7px;
          background: #f7f7f8;
          color: #52525b;
          font-size: 13px;
          line-height: 1.5;
        }
        .home-activity strong {
          color: #18181b;
        }
        @media (max-width: 1120px) {
          .home-shell {
            grid-template-columns: 82px minmax(0, 1fr);
          }
          .home-sidebar {
            padding: 18px 12px;
          }
          .home-brand div,
          .home-nav a span,
          .home-sidebar-panel {
            display: none;
          }
          .home-nav a {
            justify-content: center;
            padding: 0;
          }
          .home-hero {
            grid-template-columns: 1fr;
          }
          .home-board-preview {
            margin: 0 22px 22px;
          }
        }
        @media (max-width: 760px) {
          .home-shell {
            display: block;
          }
          .home-sidebar {
            min-height: auto;
            border-right: 0;
            border-bottom: 1px solid #e4e4e7;
            flex-direction: row;
            align-items: center;
          }
          .home-nav {
            display: none;
          }
          .home-main {
            padding: 16px;
          }
          .home-topbar {
            align-items: flex-start;
            flex-direction: column;
          }
          .home-topbar h1 {
            font-size: 24px;
          }
          .home-actions {
            width: 100%;
            flex-wrap: wrap;
          }
          .home-primary-action,
          .home-secondary-action {
            flex: 1;
          }
          .home-hero-copy {
            padding: 24px;
          }
          .home-hero-copy h2 {
            font-size: 30px;
          }
          .home-status-row {
            flex-wrap: wrap;
          }
          .home-board-preview {
            display: none;
          }
          .home-grid {
            grid-template-columns: 1fr;
          }
          .home-project {
            grid-template-columns: 42px minmax(0, 1fr);
          }
          .home-project em,
          .home-project time {
            grid-column: 2;
          }
          .home-template-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}
