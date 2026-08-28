"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/planning/icon";
import { ChevronDownIcon, ChevronUpIcon } from "@/components/icons/mui";
import { useUserStore } from "@/store";

type ProjectAccess = "view" | "edit" | "owner";
type ProjectSummary = {
  id: string;
  title: string;
  status: string;
  updatedAt: string | null;
  access: ProjectAccess;
  ownerEmail: string;
};
type CommentSummary = {
  id: string;
  text: string;
  author: string;
  createdAt: string | null;
  projectId: string;
  projectTitle: string;
};

const templates = [
  ["빈 화면설계서", "자유롭게 시작하는 기본 캔버스"],
  ["서비스 대시보드", "지표와 목록 중심의 관리 화면"],
  ["모바일 예약", "모바일 서비스 흐름 설계"],
  ["관리자 페이지", "검색·목록·상세 기본 구성"],
];

const SERVICE_CLIENT_ID = "hams-planning-board";

function formatDate(value: string | null) {
  if (!value) return "저장 기록 없음";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "저장 기록 없음"
    : new Intl.DateTimeFormat("ko-KR", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
}

export default function Home() {
  const user = useUserStore((state) => state.user);
  const isLoadingUser = useUserStore((state) => state.isLoading);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [projectError, setProjectError] = useState("");
  const [comments, setComments] = useState<CommentSummary[]>([]);
  const [isUserInfoCollapsed, setIsUserInfoCollapsed] = useState(true);

  useEffect(() => {
    if (!user) {
      setProjects([]);
      setComments([]);
      setProjectError("");
      return;
    }
    const controller = new AbortController();
    setIsLoadingProjects(true);
    setProjectError("");
    void fetch("/api/projects", {
      cache: "no-store",
      credentials: "same-origin",
      signal: controller.signal,
    })
      .then(async (response) => {
        const result = (await response.json()) as {
          projects?: ProjectSummary[];
          error?: string;
        };
        if (!response.ok)
          throw new Error(result.error ?? "프로젝트를 불러오지 못했습니다.");
        setProjects(Array.isArray(result.projects) ? result.projects : []);
      })
      .catch((error) => {
        if (error instanceof Error && error.name !== "AbortError")
          setProjectError(error.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoadingProjects(false);
      });
    return () => controller.abort();
  }, [user]);

  useEffect(() => {
    if (!user || projects.length === 0) {
      setComments([]);
      return;
    }

    const controller = new AbortController();
    void Promise.all(
      projects.slice(0, 8).map(async (project) => {
        const response = await fetch(
          `/api/projects/${encodeURIComponent(project.id)}/comments`,
          { cache: "no-store", signal: controller.signal },
        );
        if (!response.ok) return [];
        const result = (await response.json()) as {
          comments?: Omit<CommentSummary, "projectId" | "projectTitle">[];
        };
        return (result.comments ?? []).map((comment) => ({
          ...comment,
          projectId: project.id,
          projectTitle: project.title,
        }));
      }),
    )
      .then((groups) => {
        setComments(
          groups
            .flat()
            .sort(
              (a, b) =>
                new Date(b.createdAt ?? 0).getTime() -
                new Date(a.createdAt ?? 0).getTime(),
            )
            .slice(0, 8),
        );
      })
      .catch((error) => {
        if (!(error instanceof Error && error.name === "AbortError")) {
          setComments([]);
        }
      });

    return () => controller.abort();
  }, [projects, user]);

  const publishedProjects = useMemo(
    () =>
      projects.filter((project) =>
        ["published", "complete"].includes(project.status),
      ),
    [projects],
  );
  const displayName =
    user?.displayName ||
    user?.name ||
    user?.nickname ||
    user?.email ||
    "사용자";
  const membership =
    user?.serviceMemberships.find(
      (item) => item.clientId === SERVICE_CLIENT_ID,
    ) ?? null;
  const genderLabel = user?.gender
    ? { male: "남", female: "여", other: "기타", prefer_not_to_say: "미공개" }[
        user.gender
      ]
    : "미등록";

  return (
    <main className="home-shell">
      <aside className="home-sidebar" aria-label="메인 메뉴">
        <div className="home-brand">
          <span>P</span>
          <div>
            <strong>PlanCraft</strong>
            <small>Planning Board</small>
          </div>
        </div>
        {isLoadingUser ? (
          <div className="sidebar-skeleton" />
        ) : user ? (
          <>
            <div
              className={`sidebar-user ${isUserInfoCollapsed ? "collapsed" : ""}`}
            >
              <div className="sidebar-user-head">
                <b>{displayName.charAt(0).toUpperCase()}</b>
                <span>
                  <strong>{displayName}</strong>
                  {!isUserInfoCollapsed ? <small>{user.email}</small> : null}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setIsUserInfoCollapsed((collapsed) => !collapsed)
                  }
                  aria-label={
                    isUserInfoCollapsed
                      ? "로그인 정보 펼치기"
                      : "로그인 정보 접기"
                  }
                  aria-expanded={!isUserInfoCollapsed}
                  title={isUserInfoCollapsed ? "펼치기" : "접기"}
                >
                  {isUserInfoCollapsed ? (
                    <ChevronDownIcon size={18} />
                  ) : (
                    <ChevronUpIcon size={18} />
                  )}
                </button>
              </div>
              {!isUserInfoCollapsed ? (
                <div className="sidebar-user-details">
                  <div>
                    <span>생년월일:</span>
                    <strong>{user.birthDate || "미등록"}</strong>
                  </div>
                  <div>
                    <span>성별:</span>
                    <strong>{genderLabel}</strong>
                  </div>
                  <div>
                    <span>서비스:</span>
                    {membership ? (
                      <strong>{membership.serviceName}</strong>
                    ) : (
                      <>
                        <span>가입정보 없음</span>
                        {"("}
                        <a href="/api/auth/profile?destination=services">
                          서비스변경하기
                        </a>
                        {")"}
                      </>
                    )}
                  </div>
                  <div>
                    <span>요금제:</span>
                    <strong>{membership?.plan || "-"}</strong>
                  </div>
                </div>
              ) : null}
              {!isUserInfoCollapsed ? (
                <div className="sidebar-user-actions">
                  <a href="/api/auth/profile">회원정보수정</a>
                  <a href="/api/auth/logout?returnTo=/login">로그아웃</a>
                </div>
              ) : null}
            </div>
            <nav className="home-nav">
              <a href="#workspace">
                <Icon name="page" />
                <span>작업공간</span>
              </a>
              <a href="#templates">
                <Icon name="frame" />
                <span>템플릿</span>
              </a>
              <a href="#comments">
                <Icon name="comment" />
                <span>코멘트</span>
              </a>
              <a href="#publishing">
                <Icon name="share" />
                <span>퍼블리싱</span>
              </a>
            </nav>
            <div className="ai-card">
              <strong>AI 화면 초안</strong>
              <p>
                요구사항을 입력하면 레이어와 기본 컴포넌트를 빠르게 구성합니다.
              </p>
              <Link href="/planning">새 보드 열기</Link>
            </div>
          </>
        ) : (
          <Link className="login-button" href="/login?returnTo=/">
            로그인
          </Link>
        )}
      </aside>

      <section className="home-main">
        {isLoadingUser ? (
          <div className="loading-view">
            <i />
            <p>사용자 정보를 확인하고 있습니다.</p>
          </div>
        ) : user ? (
          <>
            <header className="home-header" id="workspace">
              <div>
                <em>MY WORKSPACE</em>
                <h1>{displayName}님의 화면설계 작업공간</h1>
                <p>내 프로젝트와 공유받은 프로젝트를 한곳에서 관리하세요.</p>
              </div>
              <Link href="/planning">
                <Icon name="plus" /> 새 화면설계서
              </Link>
            </header>

            <section className="summary-grid">
              <article>
                <span>전체 프로젝트</span>
                <strong>{projects.length}</strong>
                <small>접근 가능한 프로젝트</small>
              </article>
              <article>
                <span>내 프로젝트</span>
                <strong>
                  {projects.filter((item) => item.access === "owner").length}
                </strong>
                <small>직접 만든 설계서</small>
              </article>
              <article>
                <span>코멘트·협업</span>
                <strong>{comments.length}</strong>
                <small>최근 확인 가능한 코멘트</small>
              </article>
              <article>
                <span>퍼블리싱</span>
                <strong>{publishedProjects.length}</strong>
                <small>완료된 프로젝트</small>
              </article>
            </section>

            <section className="content-card">
              <CardHead
                eyebrow="WORKSPACE"
                title="최근 작업"
                action="에디터 열기"
              />
              {isLoadingProjects ? (
                <Empty text="프로젝트를 불러오는 중입니다." />
              ) : projectError ? (
                <Empty text={projectError} error />
              ) : projects.length ? (
                <div className="project-list">
                  {projects.slice(0, 6).map((project) => (
                    <Link href="/planning" key={project.id}>
                      <b>
                        <Icon name="page" />
                      </b>
                      <span>
                        <strong>{project.title}</strong>
                        <small>{project.ownerEmail}</small>
                      </span>
                      <em>
                        {project.access === "owner"
                          ? "소유"
                          : project.access === "edit"
                            ? "편집 가능"
                            : "보기 전용"}
                      </em>
                      <time>{formatDate(project.updatedAt)}</time>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="empty">
                  <strong>아직 프로젝트가 없습니다.</strong>
                  <span>첫 화면설계서를 만들어 작업공간을 채워보세요.</span>
                  <Link href="/planning">프로젝트 만들기</Link>
                </div>
              )}
            </section>

            <section className="content-card" id="templates">
              <CardHead eyebrow="TEMPLATES" title="빠른 시작" />
              <div className="template-grid">
                {templates.map(([title, description], index) => (
                  <Link href="/planning" key={title}>
                    <b>{String(index + 1).padStart(2, "0")}</b>
                    <strong>{title}</strong>
                    <small>{description}</small>
                  </Link>
                ))}
              </div>
            </section>

            <section className="content-card" id="comments">
              <CardHead
                eyebrow="COMMENTS"
                title="코멘트와 협업"
                meta={`${comments.length}개 최근 코멘트`}
              />
              {comments.length ? (
                <div className="collaboration-list">
                  {comments.map((comment) => (
                    <Link
                      href="/planning"
                      key={`${comment.projectId}-${comment.id}`}
                    >
                      <Icon name="comment" />
                      <span>
                        <strong>{comment.text}</strong>
                        <small>
                          {comment.projectTitle} · {comment.author}
                        </small>
                      </span>
                      <time>{formatDate(comment.createdAt)}</time>
                    </Link>
                  ))}
                </div>
              ) : (
                <Empty text="접근 가능한 프로젝트에 코멘트가 등록되면 여기에 표시됩니다." />
              )}
            </section>

            <section className="content-card" id="publishing">
              <CardHead
                eyebrow="PUBLISHING"
                title="퍼블리싱 현황"
                action="설계서 관리"
              />
              <div className="publishing-grid">
                <div>
                  <strong>{publishedProjects.length}</strong>
                  <span>완료</span>
                </div>
                <div>
                  <strong>
                    {projects.filter((item) => item.status === "review").length}
                  </strong>
                  <span>검토 중</span>
                </div>
                <div>
                  <strong>
                    {
                      projects.filter(
                        (item) =>
                          !["published", "complete", "review"].includes(
                            item.status,
                          ),
                      ).length
                    }
                  </strong>
                  <span>작업 중</span>
                </div>
              </div>
            </section>
          </>
        ) : (
          <GuestView />
        )}
      </section>
      <style>{styles}</style>
    </main>
  );
}

function CardHead({
  eyebrow,
  title,
  action,
  meta,
}: {
  eyebrow: string;
  title: string;
  action?: string;
  meta?: string;
}) {
  return (
    <div className="card-head">
      <div>
        <span>{eyebrow}</span>
        <h2>{title}</h2>
      </div>
      {action ? <Link href="/planning">{action}</Link> : <small>{meta}</small>}
    </div>
  );
}
function Empty({ text, error = false }: { text: string; error?: boolean }) {
  return <div className={`empty compact${error ? " error" : ""}`}>{text}</div>;
}
function GuestView() {
  return (
    <section className="guest-view">
      <div className="guest-copy">
        <em>PLAN · DESIGN · PUBLISH</em>
        <h1>
          아이디어를 실제 화면으로
          <br />더 빠르게 설계하세요.
        </h1>
        <p>
          레이어 기반 화면 설계부터 AI 초안, 팀 코멘트와 퍼블리싱 관리까지
          하나의 작업공간에서 이어집니다.
        </p>
        <div>
          <Link href="/login?returnTo=/">로그인하고 시작하기</Link>
          <a href="/planning">기능 살펴보기</a>
        </div>
        <small>
          로그인하면 내 프로젝트와 공유받은 작업을 바로 확인할 수 있습니다.
        </small>
      </div>
      <div className="guest-preview" aria-hidden="true">
        <header>
          <i />
          <i />
          <i />
          <span>화면설계 작업공간</span>
        </header>
        <main>
          <aside />
          <section>
            <i />
            <b />
            <div>
              <i />
              <i />
              <i />
            </div>
            <p />
            <p />
          </section>
          <aside />
        </main>
      </div>
      <div className="feature-grid" id="features">
        <Feature
          icon="page"
          title="작업공간"
          text="사용자별 프로젝트를 저장하고 최근 작업을 이어갑니다."
        />
        <Feature
          icon="frame"
          title="템플릿"
          text="반복되는 화면 구성을 빠르게 시작합니다."
        />
        <Feature
          icon="comment"
          title="코멘트"
          text="팀원과 설계서를 공유하고 협업합니다."
        />
        <Feature
          icon="share"
          title="퍼블리싱"
          text="진행 상태와 결과물을 한눈에 관리합니다."
        />
      </div>
    </section>
  );
}
function Feature({
  icon,
  title,
  text,
}: {
  icon: "page" | "frame" | "comment" | "share";
  title: string;
  text: string;
}) {
  return (
    <article>
      <Icon name={icon} />
      <strong>{title}</strong>
      <p>{text}</p>
    </article>
  );
}

const styles = `
  .home-shell{min-height:100vh;display:grid;grid-template-columns:264px minmax(0,1fr);background:#f4f5f7;color:#18181b;font-family:Arial,"Pretendard",sans-serif}.home-sidebar{position:fixed;inset:0 auto 0 0;z-index:10;width:264px;height:100vh;height:100dvh;min-height:350px;box-sizing:border-box;overflow-y:auto;padding:22px 16px;border-right:1px solid #e4e4e7;background:#fff;display:flex;flex-direction:column;gap:24px}.home-brand{display:flex;align-items:center;gap:10px}.home-brand>span{width:36px;height:36px;border-radius:9px;display:grid;place-items:center;color:#fff;background:#6547df;font-weight:800}.home-brand div,.sidebar-user span{min-width:0;display:flex;flex-direction:column;gap:2px}.home-brand small,.sidebar-user small{color:#71717a;font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.sidebar-user{padding:10px;border:1px solid #e7e7ea;border-radius:10px;display:grid;grid-template-columns:34px minmax(0,1fr);gap:8px;align-items:center}.sidebar-user>b{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;background:#f0edff;color:#5f3fe2;font-size:13px}.sidebar-user span strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px}.sidebar-user>a{grid-column:1/-1;color:#71717a;font-size:11px;text-align:right;text-decoration:none}.home-nav{display:grid;gap:5px}.home-nav a{height:40px;padding:0 11px;border-radius:8px;display:flex;align-items:center;gap:10px;color:#52525b;font-size:13px;text-decoration:none}.home-nav a:hover{background:#f0edff;color:#5f3fe2}.ai-card{margin-top:auto;padding:14px;border:1px solid #ddd7ff;border-radius:9px;background:#faf9ff}.ai-card strong{font-size:13px}.ai-card p{margin:8px 0 12px;color:#71717a;font-size:12px;line-height:1.5}.ai-card a,.login-button{height:34px;border-radius:7px;display:grid;place-items:center;background:#6547df;color:#fff;font-size:12px;font-weight:700;text-decoration:none}.login-button{margin-top:auto;height:42px}.sidebar-skeleton{height:64px;border-radius:9px;background:#eee}.home-main{grid-column:2;min-width:0;padding:28px;display:flex;flex-direction:column;gap:20px}.home-header{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;padding:8px 2px;scroll-margin-top:24px}.home-header em,.card-head span,.guest-copy em{color:#6547df;font-size:11px;font-style:normal;font-weight:800;letter-spacing:.1em}.home-header h1{margin:6px 0 5px;font-size:30px;letter-spacing:-.03em}.home-header p{margin:0;color:#71717a;font-size:14px}.home-header>a{height:40px;padding:0 15px;border-radius:8px;display:flex;align-items:center;gap:7px;background:#6547df;color:#fff;font-size:13px;font-weight:700;text-decoration:none}.summary-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.summary-grid article{padding:17px;border:1px solid #e5e5e8;border-radius:10px;background:#fff;display:grid;gap:5px}.summary-grid span,.summary-grid small{color:#71717a;font-size:11px}.summary-grid strong{font-size:27px}.content-card{padding:20px;border:1px solid #e5e5e8;border-radius:10px;background:#fff;scroll-margin-top:24px}.card-head{min-height:38px;margin-bottom:14px;display:flex;align-items:center;justify-content:space-between;gap:12px}.card-head h2{margin:3px 0 0;font-size:18px}.card-head a,.card-head small{color:#71717a;font-size:12px;text-decoration:none}.project-list,.collaboration-list{display:grid;gap:8px}.project-list>a{min-height:62px;padding:10px;border:1px solid #ededee;border-radius:8px;display:grid;grid-template-columns:42px minmax(0,1fr) 76px 120px;align-items:center;gap:10px;color:#18181b;text-decoration:none}.project-list>a:hover,.template-grid>a:hover,.collaboration-list>a:hover{border-color:#c9bfff;background:#fbfaff}.project-list>a>b{width:38px;height:38px;border-radius:7px;display:grid;place-items:center;background:#f0edff;color:#6545e8}.project-list>a>span{min-width:0;display:grid;gap:4px}.project-list>a>span strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px}.project-list small,.project-list time,.collaboration-list small,.collaboration-list time{color:#71717a;font-size:11px}.project-list em{justify-self:start;padding:4px 7px;border-radius:5px;background:#f4f4f5;color:#52525b;font-size:11px;font-style:normal}.template-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.template-grid>a{min-height:126px;padding:15px;border:1px solid #ededee;border-radius:8px;color:#18181b;display:flex;flex-direction:column;justify-content:space-between;text-decoration:none}.template-grid b{width:28px;height:28px;border-radius:6px;display:grid;place-items:center;background:#18181b;color:#fff;font-size:11px}.template-grid small{color:#71717a;font-size:11px}.collaboration-list>a{padding:12px;border:1px solid #ededee;border-radius:8px;display:grid;grid-template-columns:28px minmax(0,1fr) auto;align-items:center;gap:9px;color:#18181b;text-decoration:none}.collaboration-list>a>span{display:grid;gap:3px}.publishing-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.publishing-grid div{padding:16px;border-radius:8px;background:#f7f7f8;display:flex;align-items:baseline;gap:8px}.publishing-grid strong{font-size:24px}.publishing-grid span{color:#71717a;font-size:12px}.empty{min-height:130px;padding:20px;border:1px dashed #d9d9de;border-radius:8px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px;color:#71717a;font-size:13px;text-align:center}.empty strong{color:#27272a}.empty a{color:#6547df;font-weight:700;text-decoration:none}.empty.compact{min-height:76px}.empty.error{color:#b42318}.loading-view{min-height:calc(100vh - 56px);display:grid;place-items:center;align-content:center;color:#71717a;font-size:13px}.loading-view i{width:30px;height:30px;border:3px solid #ddd7ff;border-top-color:#6547df;border-radius:50%;animation:spin .8s linear infinite}.guest-view{min-height:calc(100vh - 56px);display:grid;grid-template-columns:minmax(320px,.85fr) minmax(480px,1.15fr);align-content:center;gap:42px;max-width:1280px;margin:0 auto}.guest-copy{align-self:center}.guest-copy h1{margin:12px 0 18px;font-size:clamp(40px,4.2vw,66px);line-height:1.08;letter-spacing:-.055em}.guest-copy>p{max-width:570px;margin:0;color:#52525b;font-size:16px;line-height:1.75}.guest-copy>div{margin:28px 0 14px;display:flex;gap:9px}.guest-copy>div a{height:42px;padding:0 17px;border-radius:8px;display:inline-flex;align-items:center;background:#6547df;color:#fff;font-size:13px;font-weight:700;text-decoration:none}.guest-copy>div a+a{border:1px solid #dddde2;background:#fff;color:#3f3f46}.guest-copy>small{color:#71717a;font-size:11px}.guest-preview{align-self:center;border:1px solid #d9d9de;border-radius:12px;overflow:hidden;background:#fff;box-shadow:0 24px 70px #3030431c}.guest-preview>header{height:44px;padding:0 14px;border-bottom:1px solid #e5e5e8;display:flex;align-items:center;gap:7px}.guest-preview>header i{width:9px;height:9px;border-radius:50%;background:#dedee2}.guest-preview>header span{margin-left:8px;font-size:11px;font-weight:700}.guest-preview>main{height:390px;padding:18px;display:grid;grid-template-columns:82px 1fr 100px;gap:15px;background:radial-gradient(#d6d6da .7px,transparent .7px);background-size:12px 12px}.guest-preview aside,.guest-preview section{border:1px solid #e4e4e7;border-radius:7px;background:#fff}.guest-preview section{padding:28px}.guest-preview section>i{display:block;width:72px;height:13px;border-radius:4px;background:#6547df}.guest-preview section>b{display:block;width:80%;height:38px;margin:15px 0 22px;border-radius:5px;background:#202024}.guest-preview section>div{display:grid;grid-template-columns:repeat(3,1fr);gap:9px}.guest-preview section>div i{height:72px;border-radius:5px;background:#f0edff}.guest-preview section p{height:12px;margin:18px 0 0;border-radius:3px;background:#e7e7ea}.feature-grid{grid-column:1/-1;display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.feature-grid article{padding:18px;border:1px solid #e5e5e8;border-radius:10px;background:#fff}.feature-grid strong{display:block;margin:13px 0 7px;font-size:14px}.feature-grid p{margin:0;color:#71717a;font-size:12px;line-height:1.55}@keyframes spin{to{transform:rotate(360deg)}}
  .sidebar-user{display:block;padding:10px}.sidebar-user-head{display:grid;grid-template-columns:34px minmax(0,1fr) 26px;gap:8px;align-items:center}.sidebar-user-head>b{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;background:#f0edff;color:#5f3fe2;font-size:13px}.sidebar-user-head>span{min-width:0;display:flex;flex-direction:column;gap:2px}.sidebar-user-head>span strong,.sidebar-user-head>span small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.sidebar-user-head>span strong{font-size:12px}.sidebar-user-head>span small{color:#71717a;font-size:11px}.sidebar-user-head>button{width:26px;height:26px;padding:0;border:1px solid #e4e4e7;border-radius:7px;background:#fff;color:#6547df;cursor:pointer;font-size:17px;line-height:1}.sidebar-user-head>button:hover{background:#f0edff}.sidebar-user-details{display:grid;gap:6px;margin-top:10px;padding:9px 0;border-top:1px solid #ededee}.sidebar-user-details>div{display:flex;align-items:center;justify-content:space-between;gap:8px;min-width:0;font-size:11px}.sidebar-user-details span{flex:none;color:#71717a}.sidebar-user-details strong{overflow:hidden;color:#27272a;text-align:right;text-overflow:ellipsis;white-space:nowrap}.sidebar-user-details a{overflow:hidden;color:#5f3fe2;font-weight:700;text-align:right;text-decoration:none;text-overflow:ellipsis;white-space:nowrap}.sidebar-user-actions{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:2px}.sidebar-user-actions>a{color:#71717a;font-size:11px;text-decoration:none}.sidebar-user-actions>a:hover,.sidebar-user-details a:hover{color:#5f3fe2;text-decoration:underline}.sidebar-user.collapsed{padding:9px}
  @media(max-width:1120px){.home-shell{grid-template-columns:82px minmax(0,1fr)}.home-sidebar{width:82px;padding:18px 12px}.home-brand div,.home-nav span,.ai-card,.sidebar-user span,.sidebar-user-actions,.sidebar-user-head>button,.sidebar-user-details{display:none}.home-brand,.home-nav a{justify-content:center}.sidebar-user{padding:9px}.sidebar-user-head{display:block}.sidebar-user-head>b{margin:auto}.guest-view{grid-template-columns:1fr}.guest-preview{display:none}.summary-grid,.template-grid{grid-template-columns:repeat(2,1fr)}}
  @media(max-width:760px){.home-shell{display:block}.home-sidebar{position:static;width:auto;height:auto;min-height:auto;overflow:visible;border-right:0;border-bottom:1px solid #e4e4e7;flex-direction:row;align-items:center}.home-brand div{display:flex}.home-nav,.ai-card,.sidebar-user{display:none}.login-button{width:92px;margin:0 0 0 auto}.home-main{padding:18px}.home-header{align-items:flex-start;flex-direction:column}.summary-grid{grid-template-columns:repeat(2,1fr)}.template-grid,.publishing-grid,.feature-grid{grid-template-columns:1fr}.project-list>a{grid-template-columns:42px minmax(0,1fr)}.project-list em,.project-list time{grid-column:2}.guest-view{min-height:auto;padding:36px 0}.guest-copy h1{font-size:39px}.feature-grid{margin-top:20px}.collaboration-list>a{grid-template-columns:28px 1fr}.collaboration-list time{grid-column:2}}
`;
