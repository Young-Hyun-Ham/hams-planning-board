# Claude 작업 안내

이 저장소를 수정하기 전에 [`AGENTS.md`](./AGENTS.md), [`README.md`](./README.md), [`HISTORY.md`](./HISTORY.md)를 순서대로 읽습니다.

## 핵심 규칙

- 서비스는 Next.js 16 기반 HAMS Planning Board(PlanCraft)이며 개발 포트는 3005입니다.
- Next.js 관련 변경 전 `node_modules/next/dist/docs/`의 현재 버전 문서를 확인합니다.
- HAMS SSO, Firebase 프로젝트 권한과 승인 상태를 우회하지 않습니다.
- 데이터 변경 권한은 UI뿐 아니라 Route Handler에서 검증합니다.
- 저장·검토·반려·완료는 `approvalHistory`에 누락 없이 기록합니다.
- `review` 상태는 승인 대기 잠금이고, `complete` 상태는 다시 저장·검토할 수 있습니다.
- 기존 사용자 변경을 보존하고 비밀키·서비스 계정 데이터를 출력하거나 커밋하지 않습니다.
- 변경 파일을 포맷하고 TypeScript·ESLint를 검증합니다.
- 작업 완료 시 사용자 영향이 드러나도록 `HISTORY.md`를 갱신합니다.

세부 구조, 파일별 책임, 검증 명령은 `AGENTS.md`를 기준으로 합니다.
