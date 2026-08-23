import { normalizeReturnTo } from "@hams-fam/sso-client";
import Link from "next/link";
import { redirect } from "next/navigation";

const ERROR_MESSAGES: Record<string, string> = {
  sso_state: "로그인 요청 검증에 실패했습니다. 다시 로그인해 주세요.",
  sso_exchange: "인증 정보를 확인하지 못했습니다. 다시 로그인해 주세요.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; returnTo?: string }>;
}) {
  const { error, returnTo: requestedReturnTo } = await searchParams;
  const returnTo = normalizeReturnTo(requestedReturnTo);

  if (!error) {
    redirect(`/api/sso/login?returnTo=${encodeURIComponent(returnTo)}`);
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        background: "#f5f3ff",
        color: "#18181b",
        fontFamily: 'Arial, "Pretendard", sans-serif',
      }}
    >
      <section
        style={{
          width: "min(100%, 460px)",
          padding: 32,
          border: "1px solid #ddd6fe",
          borderRadius: 16,
          background: "white",
          boxShadow: "0 20px 50px #4c1d9514",
        }}
      >
        <p style={{ margin: 0, color: "#6d4aff", fontWeight: 800 }}>HAMS SSO</p>
        <h1 style={{ margin: "12px 0", fontSize: 26 }}>로그인이 필요합니다</h1>
        <p style={{ margin: "0 0 24px", color: "#52525b", lineHeight: 1.6 }}>
          {ERROR_MESSAGES[error] ?? "로그인을 완료하지 못했습니다. 다시 시도해 주세요."}
        </p>
        <Link
          href={`/api/sso/login?returnTo=${encodeURIComponent(returnTo)}`}
          style={{
            display: "flex",
            minHeight: 44,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 9,
            background: "#6d4aff",
            color: "white",
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          통합 로그인 다시 시도
        </Link>
      </section>
    </main>
  );
}
