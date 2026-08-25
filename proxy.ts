import { createSsoProxy } from "@hams-fam/sso-client/proxy";

export const proxy = createSsoProxy();

export const config = {
  matcher: ["/api/:path*"],
};
