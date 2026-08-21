import type { Metadata } from "next";
import "./style.css";

export const metadata: Metadata = {
  title: "PlanCraft — AI 화면 설계서",
  description:
    "아이디어를 편집 가능한 화면 설계서와 퍼블리싱 코드로 변환합니다.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
