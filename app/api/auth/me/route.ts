import {
  getSsoUserFromRequest,
} from "@hams-fam/sso-client";

export async function GET(request: Request) {
  const user = getSsoUserFromRequest(request);
  return Response.json(
    { user },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
