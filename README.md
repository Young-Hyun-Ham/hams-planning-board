# PlanCraft

AI 프롬프트를 레이어 기반 화면 설계서와 퍼블리싱 코드로 변환하는 Next.js MVP입니다.

## 시작하기

```bash
pnpm install
pnpm dev
```

Firebase 저장을 사용하려면 `.env.example`을 `.env.local`로 복사하고 Firebase Admin 서비스 계정 값을 입력합니다. 값이 없으면 UI는 데모 모드로 동작합니다. 서비스 계정 키는 서버에서만 사용되며 브라우저로 전달되지 않습니다.

현재 MVP에는 레이어 탐색, 요소 선택, 속성 패널, 데스크톱/태블릿/모바일 캔버스, AI 생성 흐름, HTML 코드 보기/복사, Firestore 초안 저장 API가 포함되어 있습니다.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
