import {
  getSsoAccessTokenFromRequest,
  getSsoServerUrl,
  getSsoUserFromRequest,
  unauthorizedSsoResponse,
} from "@hams-fam/sso-client";

export const runtime = "nodejs";

type SsoModelResponse = {
  ok?: boolean;
  provider?: string;
  defaultModel?: string | null;
  models?: Array<{ id?: string; label?: string }>;
  error?: string;
  message?: string;
};

export async function GET(request: Request) {
  if (!getSsoUserFromRequest(request)) return unauthorizedSsoResponse();

  const accessToken = getSsoAccessTokenFromRequest(request);
  if (!accessToken) {
    return Response.json(
      {
        ok: false,
        error: "sso_access_token_missing",
        message: "SSO AI 접근 토큰이 없습니다. 다시 로그인해 주세요.",
      },
      { status: 401 },
    );
  }

  try {
    const response = await fetch(
      new URL("/api/sso/ai/models", getSsoServerUrl()),
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
        signal: AbortSignal.timeout(20_000),
      },
    );
    const payload = (await response
      .json()
      .catch(() => null)) as SsoModelResponse | null;

    if (!response.ok || !payload?.ok) {
      return Response.json(
        {
          ok: false,
          error: payload?.error ?? "sso_model_list_failed",
          message:
            payload?.message ??
            "SSO 서버에서 AI 모델 목록을 가져오지 못했습니다.",
        },
        { status: response.status || 502 },
      );
    }

    const models = (payload.models ?? [])
      .map((model) => model.id?.trim() ?? "")
      .filter(Boolean);
    if (models.length === 0) {
      return Response.json(
        {
          ok: false,
          error: "ai_models_empty",
          message: "사용할 수 있는 AI 모델이 없습니다.",
        },
        { status: 422 },
      );
    }

    const defaultModel =
      payload.defaultModel && models.includes(payload.defaultModel)
        ? payload.defaultModel
        : models[0];

    return Response.json(
      { ok: true, provider: payload.provider, models, defaultModel },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const message =
      error instanceof Error && error.name === "TimeoutError"
        ? "SSO 서버의 AI 모델 조회 시간이 초과되었습니다."
        : "SSO 서버에 연결할 수 없습니다.";
    return Response.json(
      { ok: false, error: "sso_model_list_failed", message },
      { status: 502 },
    );
  }
}
