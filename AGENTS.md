# HAMS Planning Board 작업 지침

이 파일은 이 저장소를 수정하는 AI 에이전트와 개발자가 따라야 할 프로젝트별 규칙입니다.

## 서비스 문맥

- 서비스명은 HAMS Planning Board이며 화면 브랜드는 PlanCraft입니다.
- 개발 주소는 `http://localhost:3005`입니다.
- Next.js 16 App Router, React 19, TypeScript, Firebase Admin, Zustand, HAMS SSO Client를 사용합니다.
- 핵심 화면은 `/`, `/planning`, `/preview`, `/login`입니다.
- 모든 `/api/*` 요청은 `proxy.ts`의 HAMS SSO 프록시를 거칩니다. 공개 데이터는 인증 정책을 명시적으로 검토합니다.

## 작업 전 확인

1. `README.md`에서 현재 기능과 데이터 구조를 확인합니다.
2. `HISTORY.md`에서 최근 결정과 변경을 확인합니다.
3. Next.js API나 파일 규칙을 변경할 때는 설치된 `node_modules/next/dist/docs/`의 해당 문서를 우선 확인합니다.
4. 기존 변경 사항을 덮어쓰거나 되돌리지 말고 `git status`와 관련 diff를 확인합니다.

## 구현 원칙

- 프로젝트 데이터는 `planningProjects`와 그 하위 컬렉션을 기준으로 유지합니다.
- 권한 판단은 `lib/project-access.ts`를 재사용하고 Route Handler에서 다시 검증합니다. UI 비활성화만으로 권한을 보장하지 않습니다.
- 이메일 비교는 `normalizeEmail()`, 프로젝트 ID 검증은 `validProjectId()`를 사용합니다.
- 저장·검토·반려·완료 상태 변경은 프로젝트와 `approvalHistory`를 Firestore batch로 함께 기록합니다.
- 승인 이력에는 프로젝트 식별·제목·소유자, 행위자, 상태 전이, 메시지, 시각을 보존합니다.
- `review` 상태에서는 소유자의 저장·재검토·직접 완료를 UI와 API 양쪽에서 차단합니다.
- `complete`는 영구 잠금이 아닙니다. 저장하면 새 사이클의 `draft`가 되고 다시 검토·완료할 수 있습니다.
- 공개 템플릿은 `data/*.json`, `app/template-data/route.ts`, 메인 링크를 함께 갱신합니다.
- 캔버스 페이지 디바이스 크기는 빈 페이지에서만 변경합니다. 하위 요소가 있으면 다른 크기 버튼을 비활성화합니다.
- 실제 비밀키, 세션 값, 서비스 계정 내용을 코드·문서·출력에 넣지 않습니다.

## 주요 코드 위치

- 편집 상태와 프로젝트 로딩·저장: `app/planning/page.tsx`
- 캔버스 상호작용: `components/planning/canvas-editor.tsx`
- 레이어·페이지 메뉴: `components/planning/left-panel.tsx`
- 속성 편집: `components/planning/right-panel.tsx`
- 공유·검토 모달: `components/planning/share-dialog.tsx`, `review-dialog.tsx`
- 프로젝트 저장 API: `app/api/projects/route.ts`
- 승인 API: `app/api/projects/[projectId]/review/route.ts`
- 권한: `lib/project-access.ts`
- 템플릿: `data/*.json`

## 스타일과 UX

- 전역 버튼과 링크는 손 모양 커서, 비활성화 상태는 `not-allowed`를 사용합니다.
- 모달은 작은 화면에서도 액션 버튼이 보이도록 최대 높이와 스크롤을 고려합니다.
- 편집 권한이 없는 사용자는 데이터를 변경할 수 없어야 합니다.
- 비동기 실패는 사용자가 이해할 수 있는 한국어 메시지로 표시합니다.

## 검증

변경 범위에 맞춰 다음을 실행합니다.

```bash
pnpm dlx prettier@3.6.2 --write <변경 파일>
pnpm exec next typegen
pnpm exec tsc --noEmit
pnpm exec eslint <변경 파일>
pnpm build
git diff --check
```

- 전체 lint에 기존 오류가 있으면 이번 변경 파일 결과와 구분해 기록합니다.
- 인증 API는 비로그인 401, 권한 없음 403, 상태 충돌 409도 확인합니다.
- Route Handler는 정상 경로뿐 아니라 잘못된 ID·입력·권한을 함께 검증합니다.

## 문서와 변경 이력

- 기능·환경 변수·API·데이터 모델이 바뀌면 `README.md`를 갱신합니다.
- 작업 완료 시 `HISTORY.md`의 해당 날짜 아래에 변경 내용을 추가합니다.
- 같은 날짜가 이미 있으면 새 날짜 제목 대신 관련 범주에 항목을 추가합니다.
- 사용자 동작과 데이터 영향이 드러나게 기록합니다.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
