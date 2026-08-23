import { createSsoProxy } from "@hams-fam/sso-client/proxy";

export const proxy = createSsoProxy();

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\..*).*)",
  ],
};
