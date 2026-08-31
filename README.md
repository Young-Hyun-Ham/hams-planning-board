# HAMS Planning Board

HAMS Planning Board(화면명: **PlanCraft**)는 아이디어를 레이어 기반 화면 설계서로 만들고, 협업·검토·승인·미리보기·퍼블리싱까지 처리하는 Next.js 서비스입니다. 기본 개발 주소는 `http://localhost:3005`입니다.

## 주요 기능

- 페이지, 섹션, 레이어, 텍스트, 이미지, 버튼, 체크박스, 라디오, 셀렉트, 아이콘 편집
- 요소 이동·크기 변경·정렬·잠금·표시 여부·스타일 편집과 실행 취소/다시 실행
- 빈 페이지의 Desktop(860px), Tablet(650px), Mobile(390px) 크기 선택
  - 페이지에 하위 요소가 생기면 다른 디바이스 크기로 변경할 수 없습니다.
- 서비스 대시보드, 모바일 예약, 관리자 페이지 JSON 템플릿
- HAMS SSO 로그인과 개발용 mock 사용자
- Firebase 프로젝트 저장, 최근 작업, 공유 권한, 코멘트, 캔버스 메모
- 소유자·편집자·조회자·검토자 권한 분리
- 검토 요청, 반려, 완료와 반복 가능한 승인 사이클
- 프로젝트별 저장·승인 이력 누적
- AI 모델 조회 및 프롬프트 기반 화면 생성
- 새 창 미리보기와 HTML/CSS/React/Astro/Svelte 코드 생성·포맷

## 기술 스택

- Next.js 16 App Router, React 19, TypeScript
- Firebase Admin SDK / Cloud Firestore
- Zustand, HAMS SSO Client
- Material UI 및 프로젝트 내부 SVG/MUI 아이콘 레지스트리
- Tailwind CSS 4/PostCSS, 일반 CSS
- pnpm 10

## 실행 방법

Node.js, pnpm 10.x, HAMS SSO 서버(기본 `http://localhost:3000`), Firebase 인증 정보가 필요합니다. AI 기능을 사용하려면 OpenAI API 키도 설정합니다.

```powershell
pnpm install
Copy-Item env.example .env
pnpm dev
```

검증 명령:

```bash
pnpm exec next typegen
pnpm exec tsc --noEmit
pnpm lint
pnpm build
```

## 환경 변수

| 변수                             | 설명                                           |
| -------------------------------- | ---------------------------------------------- |
| `FIREBASE_PROJECT_ID`            | Firebase 프로젝트 ID                           |
| `FIREBASE_CLIENT_EMAIL`          | Firebase Admin 서비스 계정 이메일              |
| `FIREBASE_PRIVATE_KEY`           | 줄바꿈을 `\n`으로 표현한 서비스 계정 비공개 키 |
| `GOOGLE_APPLICATION_CREDENTIALS` | 서비스 계정 JSON을 사용하는 대체 인증 경로     |
| `OPENAI_API_KEY`                 | AI 화면 생성용 서버 전용 키                    |
| `OPENAI_MODEL`                   | 기본 OpenAI 모델                               |
| `NEXT_PUBLIC_APP_URL`            | 서비스 외부 기준 URL                           |
| `HAMS_OAUTH_SERVER_URL`          | HAMS SSO 서버 URL                              |
| `HAMS_OAUTH_CLIENT_ID`           | 이 서비스의 SSO Client ID                      |
| `HAMS_OAUTH_CLIENT_SECRET`       | 서버 전용 SSO Client Secret                    |
| `HAMS_COOKIE_PREFIX`             | 서비스별 쿠키 prefix                           |
| `HAMS_SESSION_SECRET`            | 서비스 세션 서명용 난수                        |
| `HAMS_SSO_SESSION_MAX_AGE_SEC`   | 세션 유지 시간. 기본 604800초                  |
| `NEXT_PUBLIC_DEV_MOCK_LOGIN`     | `true`이면 개발용 mock 사용자 활성화           |
| `HAMS_SSO_DEV_MOCK_USER_*`       | SSO 개발 mock 사용자 필드                      |

실제 비밀키와 `service-account.json`은 저장소에 새로 추가하거나 문서·로그에 노출하지 마세요.

## 주요 화면

| 경로                             | 역할                                                |
| -------------------------------- | --------------------------------------------------- |
| `/`                              | 사용자 정보, 최근 작업, 템플릿, 코멘트, 상태 카운터 |
| `/login`                         | HAMS SSO 로그인 진입과 오류 안내                    |
| `/planning`                      | 레이어 기반 화면 설계 편집기                        |
| `/planning?projectId={id}`       | 저장된 프로젝트 자동 로딩                           |
| `/planning?template={name}`      | JSON 템플릿으로 새 문서 생성                        |
| `/preview`                       | 편집기가 전달한 문서 미리보기                       |
| `/template-data?template={name}` | 공개 템플릿 데이터 응답                             |

템플릿 이름은 `service-dashboard`, `mobile-booking`, `admin-page`이며 원본은 `data/*.json`에 있습니다.

## 프로젝트 권한

| 권한    | 기능                                        |
| ------- | ------------------------------------------- |
| `owner` | 편집, 저장, 공유 설정, 검토 요청, 직접 완료 |
| `edit`  | 공유받은 문서 편집·저장                     |
| `view`  | 문서 조회                                   |
| 검토자  | 검토 중인 문서 조회, 반려 또는 완료 처리    |

검토자는 `review.reviewerEmail`과 로그인 이메일이 일치하면 자동으로 조회 권한을 얻습니다. 모든 `/api/*` 경로는 HAMS SSO 프록시의 보호를 받습니다.

## 승인 워크플로

- `draft`: 작성·저장 가능
- `review`: 검토 대기. 소유자의 저장·재검토·직접 완료 차단
- `rejected`: 검토자 반려. 수정 후 다시 저장·검토 가능
- `complete`: 완료. 다시 저장하면 새 사이클의 `draft`로 전환 가능

```text
draft --검토 요청--> review --반려--> rejected --저장--> draft
draft --검토 요청--> review --검토자 완료--> complete
draft --소유자 직접 완료--> complete
complete --저장--> draft --검토 요청/완료--> ...
```

저장, 검토 요청, 반려, 완료는 모두 `approvalHistory`에 기록됩니다. 소유자가 검토 없이 완료하면 `actorRole: owner`인 단독 승인이고, 검토자가 완료하면 `actorRole: reviewer`인 검토자 승인입니다.

## Firestore 구조

```text
planningProjects/{projectId}
  comments/{commentId}
  memos/{memoId}
  aiPromptChats/{chatId}
  approvalHistory/{historyId}
```

프로젝트 문서에는 레이어 트리와 `sizes`, `positions`, `layerText`, `layerImages`, `layerStyles`, `selected`, `status`, 소유자·공유·검토 정보가 저장됩니다. 공유 정보는 프로젝트 문서의 `shares` 배열입니다.

승인 이력 주요 필드:

```text
projectId, projectTitle, ownerId, ownerEmail
action, fromStatus, toStatus
actorId, actorEmail, actorRole
reviewerEmail, message, createdAt
```

여러 프로젝트의 이력은 Admin SDK의 `collectionGroup("approvalHistory")`로 조회할 수 있습니다. 필터와 정렬을 함께 사용하면 collection-group 범위의 복합 인덱스가 필요할 수 있습니다.

## API 개요

| API                                   | 메서드                | 설명                       |
| ------------------------------------- | --------------------- | -------------------------- |
| `/api/auth/me`                        | GET                   | 현재 SSO 사용자            |
| `/api/auth/profile`                   | GET                   | HAMS SSO 프로필로 이동     |
| `/api/sso/login`, `/api/sso/callback` | GET                   | SSO 시작과 callback        |
| `/api/projects`                       | GET/POST              | 프로젝트 목록·상세와 저장  |
| `/api/projects/{id}/shares`           | GET/POST/DELETE       | 공유 관리                  |
| `/api/projects/{id}/comments`         | GET/POST              | 코멘트                     |
| `/api/projects/{id}/memos`            | GET/POST/PATCH/DELETE | 캔버스 메모                |
| `/api/projects/{id}/review`           | GET/POST              | 승인 이력 조회와 상태 처리 |
| `/api/projects/{id}/ai-prompt-chats`  | GET/POST              | AI 프롬프트 기록           |
| `/api/ai/models`                      | GET                   | 사용 가능한 AI 모델        |
| `/api/generate-screen`                | POST                  | AI 화면 생성               |
| `/api/format-code`                    | POST                  | 퍼블리싱 코드 포맷         |

## 디렉터리 안내

```text
app/                         페이지, 레이아웃, Route Handler, 화면별 CSS
components/auth/             SSO 사용자 초기화
components/planning/         편집기, 캔버스, 패널, 공유·승인 모달
data/                        빠른 시작 템플릿 JSON
lib/                         Firebase Admin 초기화와 프로젝트 권한
store/                       Zustand 사용자 상태
types/                       공유 타입과 외부 모듈 선언
public/                      정적 파일과 퍼블리싱 예제
HISTORY.md                   날짜별 변경 이력
```

## 문서 관리

- 사용자 기능·설치·데이터 구조가 바뀌면 `README.md`를 갱신합니다.
- 저장소 작업 규칙이 바뀌면 `AGENTS.md`와 `CLAUDE.md`를 함께 확인합니다.
- 기능, API, 데이터 모델, 버그 수정은 작업 당일 `HISTORY.md`에 누적합니다.
