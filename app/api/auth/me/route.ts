import {
  getSsoUserFromRequest,
  unauthorizedSsoResponse,
} from "@hams-fam/sso-client";

export async function GET(request: Request) {
  const user = getSsoUserFromRequest(request);
  if (!user) return unauthorizedSsoResponse();

  return Response.json(
    { user },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
