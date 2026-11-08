import { NextRequest, NextResponse } from "next/server";
import { isAllowedProxyUrl } from "@/utility/proxy-security";

function getAllowedOrigin(req: NextRequest): string {
  const origin = req.headers.get("origin");
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "");
  const allowed = [
    "https://buzzclips.app",
    "https://www.buzzclips.app",
    "https://bideo.tech",
    "http://localhost:3000",
    ...(siteUrl ? [siteUrl] : []),
  ];
  if (origin && (allowed.includes(origin) || origin.endsWith(".buzzclips.app") || origin.endsWith(".bideo.tech"))) {
    return origin;
  }
  return siteUrl || "https://buzzclips.app";
}

export async function OPTIONS(req: NextRequest) {
  const allowedOrigin = getAllowedOrigin(req);
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": allowedOrigin,
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Range",
      "Access-Control-Max-Age": "86400",
      Vary: "Origin",
    },
  });
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  const allowedOrigin = getAllowedOrigin(req);

  if (!url) {
    return new NextResponse("Missing URL", {
      status: 400,
      headers: {
        "Access-Control-Allow-Origin": allowedOrigin,
        Vary: "Origin",
      },
    });
  }

  // Validate URL protocol and destination to prevent SSRF
  if (!isAllowedProxyUrl(url)) {
    return new NextResponse("Forbidden: URL destination is not permitted", {
      status: 403,
      headers: {
        "Access-Control-Allow-Origin": allowedOrigin,
        Vary: "Origin",
      },
    });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
        Accept: "*/*",
      },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return new NextResponse(`Upstream segment error: ${res.status}`, {
        status: res.status >= 500 ? 502 : res.status,
        headers: {
          "Access-Control-Allow-Origin": allowedOrigin,
          Vary: "Origin",
        },
      });
    }

    const buffer = await res.arrayBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": res.headers.get("Content-Type") || "video/mp2t",
        "Access-Control-Allow-Origin": allowedOrigin,
        "Cache-Control": "public, max-age=86400, s-maxage=86400, immutable",
        Vary: "Origin",
      },
    });
  } catch (err: any) {
    console.error("Segment proxy failed:", err?.message || err);
    return new NextResponse("Failed to fetch stream segment", {
      status: 502,
      headers: {
        "Access-Control-Allow-Origin": allowedOrigin,
        Vary: "Origin",
      },
    });
  }
}
