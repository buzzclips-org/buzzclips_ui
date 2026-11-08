import { NextRequest, NextResponse } from "next/server";

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
    return NextResponse.json(
      { error: "Missing URL param" },
      { status: 400, headers: { "Access-Control-Allow-Origin": allowedOrigin } }
    );
  }

  // Validate URL protocol
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return NextResponse.json(
        { error: "Invalid protocol" },
        { status: 400, headers: { "Access-Control-Allow-Origin": allowedOrigin } }
      );
    }
  } catch {
    return NextResponse.json(
      { error: "Invalid URL" },
      { status: 400, headers: { "Access-Control-Allow-Origin": allowedOrigin } }
    );
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
        Accept: "*/*",
      },
      next: { revalidate: 0 },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return NextResponse.json(
        { error: `Upstream error: ${res.status} ${res.statusText}` },
        {
          status: res.status >= 500 ? 502 : res.status,
          headers: { "Access-Control-Allow-Origin": allowedOrigin },
        }
      );
    }

    const text = await res.text();

    // Helper to resolve relative URL to absolute URL cleanly
    const resolveUrl = (relativeOrAbsolute: string) => {
      try {
        return new URL(relativeOrAbsolute, url).toString();
      } catch {
        const basePath = url.substring(0, url.lastIndexOf("/") + 1);
        return relativeOrAbsolute.startsWith("http")
          ? relativeOrAbsolute
          : basePath + relativeOrAbsolute;
      }
    };

    // 1. Rewrite non-comment lines
    const lines = text.split(/\r?\n/);
    const rewrittenLines = lines.map((line) => {
      const trimmed = line.trim();

      // Comment or metadata line
      if (trimmed.startsWith("#")) {
        // Rewrite initialization maps if present: #EXT-X-MAP:URI="init.mp4"
        if (trimmed.startsWith("#EXT-X-MAP:") && trimmed.includes('URI="')) {
          return trimmed.replace(/URI="([^"]+)"/, (_, match) => {
            const absolute = resolveUrl(match);
            try {
              const mapHost = new URL(absolute).hostname.toLowerCase();
              if (
                mapHost.includes("amazonaws.com") ||
                mapHost.endsWith(".buzzclips.app") ||
                mapHost.endsWith(".bideo.tech")
              ) {
                return `URI="${absolute}"`;
              }
            } catch {
              // fallback
            }
            return `URI="/proxy/proxy-m3u8-segment?url=${encodeURIComponent(absolute)}"`;
          });
        }
        return line;
      }

      // Empty line
      if (!trimmed) return line;

      const absoluteUrl = resolveUrl(trimmed);

      // Sub-playlist manifest (.m3u8)
      if (trimmed.includes(".m3u8") || trimmed.includes("manifest")) {
        return `/proxy/proxy-m3u8?url=${encodeURIComponent(absoluteUrl)}`;
      }

      // Media segment: if chunk is already hosted on AWS S3 or direct BuzzClips domain,
      // hit AWS directly without routing through the Next.js SSR proxy!
      try {
        const segHost = new URL(absoluteUrl).hostname.toLowerCase();
        if (
          segHost.includes("amazonaws.com") ||
          segHost.endsWith(".buzzclips.app") ||
          segHost.endsWith(".bideo.tech")
        ) {
          return absoluteUrl;
        }
      } catch {
        // fallback
      }

      // Media segment (.ts, .m4s, .mp4, etc.) for non-CORS external streams
      return `/proxy/proxy-m3u8-segment?url=${encodeURIComponent(absoluteUrl)}`;
    });

    const rewrittenText = rewrittenLines.join("\n");

    // Detect if live stream (live manifests lack #EXT-X-ENDLIST)
    const isLiveStream = !text.includes("#EXT-X-ENDLIST");
    const cacheHeader = isLiveStream
      ? "no-cache, no-store, must-revalidate"
      : "public, max-age=3600, s-maxage=86400";

    return new NextResponse(rewrittenText, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.apple.mpegurl",
        "Access-Control-Allow-Origin": allowedOrigin,
        "Cache-Control": cacheHeader,
        Vary: "Origin",
      },
    });
  } catch (err: any) {
    console.error("m3u8 proxy error:", err?.message || err);
    return NextResponse.json(
      { error: "Failed to fetch upstream stream", message: err?.message || "Stream unreachable" },
      {
        status: 502,
        headers: {
          "Access-Control-Allow-Origin": allowedOrigin,
          Vary: "Origin",
        },
      }
    );
  }
}
