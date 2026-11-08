/**
 * @jest-environment node
 */
import { GET as proxyM3u8Handler } from "@/app/proxy/proxy-m3u8/route";
import { NextRequest } from "next/server";

describe("Proxy M3U8 Route Handler", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it("returns 400 when url query parameter is missing", async () => {
    const req = new NextRequest("https://buzzclips.app/proxy/proxy-m3u8");
    const res = await proxyM3u8Handler(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Missing URL param");
  });

  it("blocks SSRF attempts targeting cloud metadata or loopback IPs with 403", async () => {
    const maliciousUrls = [
      "http://169.254.169.254/latest/meta-data/",
      "http://127.0.0.1:8080/admin",
      "http://localhost:8080/secret",
      "http://[::1]:8080/secret",
      "file:///etc/passwd",
    ];

    for (const badUrl of maliciousUrls) {
      const req = new NextRequest(`https://buzzclips.app/proxy/proxy-m3u8?url=${encodeURIComponent(badUrl)}`);
      const res = await proxyM3u8Handler(req);
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toContain("Forbidden");
    }
  });

  it("rewrites relative .m3u8 sub-playlists in master playlist to /proxy/proxy-m3u8 URLs", async () => {
    const masterPlaylist = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-STREAM-INF:BANDWIDTH=2628000,RESOLUTION=1280x720,NAME="720p"
720p.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=1296000,RESOLUTION=854x480,NAME="480p"
480p.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=664000,RESOLUTION=640x360,NAME="360p"
360p.m3u8
`;

    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => masterPlaylist,
    });

    const targetUrl = "https://s3.amazonaws.com/bucket/video_hls_123/master.m3u8";
    const req = new NextRequest(`https://buzzclips.app/proxy/proxy-m3u8?url=${encodeURIComponent(targetUrl)}`);
    const res = await proxyM3u8Handler(req);

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/vnd.apple.mpegurl");

    const text = await res.text();
    expect(text).toContain(
      `/proxy/proxy-m3u8?url=${encodeURIComponent("https://s3.amazonaws.com/bucket/video_hls_123/720p.m3u8")}`
    );
    expect(text).toContain(
      `/proxy/proxy-m3u8?url=${encodeURIComponent("https://s3.amazonaws.com/bucket/video_hls_123/480p.m3u8")}`
    );
    expect(text).toContain(
      `/proxy/proxy-m3u8?url=${encodeURIComponent("https://s3.amazonaws.com/bucket/video_hls_123/360p.m3u8")}`
    );
    // Must NOT contain naked relative 360p.m3u8
    expect(text).not.toMatch(/^360p\.m3u8$/m);
  });

  it("resolves relative .ts segments directly to AWS S3 without proxying through SSR", async () => {
    const renditionPlaylist = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:6
#EXTINF:5.000000,
360p_000.ts
#EXTINF:5.000000,
360p_001.ts
#EXT-X-ENDLIST
`;

    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => renditionPlaylist,
    });

    const targetUrl = "https://s3.amazonaws.com/bucket/video_hls_123/360p.m3u8";
    const req = new NextRequest(`https://buzzclips.app/proxy/proxy-m3u8?url=${encodeURIComponent(targetUrl)}`);
    const res = await proxyM3u8Handler(req);

    expect(res.status).toBe(200);
    const text = await res.text();
    // Directly hits AWS S3 URL - zero proxying through SSR
    expect(text).toContain("https://s3.amazonaws.com/bucket/video_hls_123/360p_000.ts");
    expect(text).toContain("https://s3.amazonaws.com/bucket/video_hls_123/360p_001.ts");
    expect(text).not.toContain("/proxy/proxy-m3u8-segment");
    expect(text).not.toMatch(/^360p_000\.ts$/m);
  });

  it("rewrites relative .ts segments in external non-CORS stream to /proxy/proxy-m3u8-segment URLs", async () => {
    const renditionPlaylist = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:6
#EXTINF:5.000000,
live_chunk_001.ts
#EXT-X-ENDLIST
`;

    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => renditionPlaylist,
    });

    const targetUrl = "https://restricted-external-cdn.org/live/stream.m3u8";
    const req = new NextRequest(`https://buzzclips.app/proxy/proxy-m3u8?url=${encodeURIComponent(targetUrl)}`);
    const res = await proxyM3u8Handler(req);

    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain(
      `/proxy/proxy-m3u8-segment?url=${encodeURIComponent("https://restricted-external-cdn.org/live/live_chunk_001.ts")}`
    );
  });
});
