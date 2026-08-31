"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/planning/icon";
import { ChevronDownIcon, ChevronUpIcon } from "@/components/icons/mui";
import { useUserStore } from "@/store";
import "./style.css";

type ProjectAccess = "view" | "edit" | "owner";
type ProjectSummary = {
  id: string;
  title: string;
  status: string;
  updatedAt: string | null;
  access: ProjectAccess;
  ownerEmail: string;
  reviewerEmail: string | null;
  isReviewer: boolean;
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
  ["빈 화면설계서", "자유롭게 시작하는 기본 캔버스", ""],
  ["서비스 대시보드", "지표와 목록 중심의 관리 화면", "service-dashboard"],
  ["모바일 예약", "모바일 서비스 흐름 설계", "mobile-booking"],
  ["관리자 페이지", "검색·목록·상세 기본 구성", "admin-page"],
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
                    <strong>
                      {membership?.serviceName || "가입정보 없음"}
                    </strong>
                  </div>
                  <div>
                    <span>요금제:</span>
                    <strong>{membership?.plan || "-"}</strong>
                  </div>
                  <div>
                    <span>AI 사용:</span>
                    <strong
                      className={`ai-status ${user.aiEnabled ? "enabled" : "disabled"}`}
                    >
                      {user.aiEnabled ? "AI ON" : "AI OFF"}
                    </strong>
                  </div>
                </div>
              ) : null}
              {!isUserInfoCollapsed ? (
                <div className="sidebar-user-actions">
                  <a href="/api/auth/profile">회원정보수정</a>
                  <a href="/api/auth/profile?destination=services">
                    서비스변경
                  </a>
                  <a
                    className="logout-action"
                    href="/api/auth/logout?returnTo=/login"
                  >
                    로그아웃
                  </a>
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
                    <Link
                      href={`/planning?projectId=${encodeURIComponent(project.id)}`}
                      key={project.id}
                    >
                      <b>
                        <Icon name="page" />
                      </b>
                      <span>
                        <strong>{project.title}</strong>
                        <small>{project.ownerEmail}</small>
                      </span>
                      <em>
                        {project.isReviewer && project.status === "review"
                          ? "검토 요청"
                          : project.access === "owner"
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
                {templates.map(([title, description, template], index) => (
                  <Link
                    href={
                      template ? `/planning?template=${template}` : "/planning"
                    }
                    key={title}
                  >
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
                      href={`/planning?projectId=${encodeURIComponent(comment.projectId)}`}
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
