import { NextResponse } from "next/server";
import {
  getSsoUserFromRequest,
  unauthorizedSsoResponse,
} from "@hams-fam/sso-client";
import { format } from "prettier";
import * as astroPlugin from "prettier-plugin-astro";
import * as sveltePlugin from "prettier-plugin-svelte";
import { createPublishingCode } from "@/components/planning/editor-data";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!getSsoUserFromRequest(request)) return unauthorizedSsoResponse();

  try {
    const body = (await request.json()) as {
      markup?: unknown;
      reactMarkup?: unknown;
      css?: unknown;
    };
    if (
      typeof body.markup !== "string" ||
      typeof body.reactMarkup !== "string" ||
      typeof body.css !== "string"
    ) {
      return NextResponse.json(
        { error: "markup이 필요합니다." },
        { status: 400 },
      );
    }

    const options = { printWidth: 100, tabWidth: 2, useTabs: false } as const;
    const formattedMarkup = body.markup
      ? await format(body.markup, { ...options, parser: "html" })
      : "";
    const formattedCss = body.css
      ? await format(body.css, { ...options, parser: "css" })
      : "";
    const codes = createPublishingCode(
      formattedMarkup.trim(),
      formattedCss.trim(),
      body.reactMarkup.trim(),
    );
    const [css, html5, react, astro, svelte] = await Promise.all([
      format(codes.css, { ...options, parser: "css" }),
      format(codes.html5, { ...options, parser: "html" }),
      format(codes.react, { ...options, parser: "babel" }),
      format(codes.astro, {
        ...options,
        parser: "astro",
        plugins: [astroPlugin],
      }),
      format(codes.svelte, {
        ...options,
        parser: "svelte",
        plugins: [sveltePlugin],
      }),
    ]);

    return NextResponse.json({ codes: { css, html5, react, astro, svelte } });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "코드 포맷에 실패했습니다.",
      },
      { status: 500 },
    );
  }
}
