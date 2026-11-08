import { isAllowedProxyUrl } from "@/utility/proxy-security";

describe("isAllowedProxyUrl", () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  describe("input validation & URL parsing", () => {
    it("rejects non-string or falsy inputs", () => {
      // @ts-expect-error testing invalid type
      expect(isAllowedProxyUrl(null)).toBe(false);
      // @ts-expect-error testing invalid type
      expect(isAllowedProxyUrl(undefined)).toBe(false);
      // @ts-expect-error testing invalid type
      expect(isAllowedProxyUrl(12345)).toBe(false);
      expect(isAllowedProxyUrl("")).toBe(false);
    });

    it("rejects malformed URLs", () => {
      expect(isAllowedProxyUrl("not-a-valid-url")).toBe(false);
      expect(isAllowedProxyUrl("htp:///invalid")).toBe(false);
      expect(isAllowedProxyUrl("://missing-scheme")).toBe(false);
    });
  });

  describe("protocol validation", () => {
    it("rejects non-http/https protocols", () => {
      expect(isAllowedProxyUrl("ftp://buzzclips.app/stream.m3u8")).toBe(false);
      expect(isAllowedProxyUrl("file:///etc/passwd")).toBe(false);
      expect(isAllowedProxyUrl("javascript:alert(1)")).toBe(false);
      expect(isAllowedProxyUrl("data:text/plain;base64,SGVsbG8=")).toBe(false);
    });

    it("allows http in non-production environments", () => {
      process.env.NODE_ENV = "test";
      expect(isAllowedProxyUrl("http://buzzclips.app/stream.m3u8")).toBe(true);
      expect(isAllowedProxyUrl("http://s3.amazonaws.com/bucket/stream.m3u8")).toBe(true);
    });

    it("rejects http in production environment", () => {
      process.env.NODE_ENV = "production";
      expect(isAllowedProxyUrl("http://buzzclips.app/stream.m3u8")).toBe(false);
      expect(isAllowedProxyUrl("https://buzzclips.app/stream.m3u8")).toBe(true);
    });
  });

  describe("IP address & local subnet blocking", () => {
    it("rejects IPv4 addresses", () => {
      expect(isAllowedProxyUrl("https://127.0.0.1/video.m3u8")).toBe(false);
      expect(isAllowedProxyUrl("https://169.254.169.254/latest/meta-data")).toBe(false);
      expect(isAllowedProxyUrl("https://10.0.0.1/stream.m3u8")).toBe(false);
      expect(isAllowedProxyUrl("https://192.168.1.1/stream.m3u8")).toBe(false);
      expect(isAllowedProxyUrl("https://172.16.0.1/stream.m3u8")).toBe(false);
    });

    it("rejects IPv6 addresses and hostnames with colons", () => {
      expect(isAllowedProxyUrl("https://[::1]/video.m3u8")).toBe(false);
      expect(isAllowedProxyUrl("https://[fe80::1]/video.m3u8")).toBe(false);
      expect(isAllowedProxyUrl("https://[2001:db8::1]/video.m3u8")).toBe(false);
    });
  });

  describe("localhost and internal network domain blocking", () => {
    it("rejects localhost and derivatives", () => {
      expect(isAllowedProxyUrl("https://localhost/video.m3u8")).toBe(false);
      expect(isAllowedProxyUrl("https://app.localhost/video.m3u8")).toBe(false);
      expect(isAllowedProxyUrl("https://service.local/video.m3u8")).toBe(false);
      expect(isAllowedProxyUrl("https://db.internal/video.m3u8")).toBe(false);
      expect(isAllowedProxyUrl("https://metadata.google.internal/computeMetadata")).toBe(false);
      expect(isAllowedProxyUrl("https://aws-metadata-service.com/metadata")).toBe(false);
    });
  });

  describe("allowed domains", () => {
    it("allows AWS S3 domains", () => {
      expect(
        isAllowedProxyUrl("https://buzzclips.app.s3.ap-southeast-2.amazonaws.com/uploads/1/master.m3u8")
      ).toBe(true);
      expect(isAllowedProxyUrl("https://my-bucket.s3.amazonaws.com/video.m3u8")).toBe(true);
      expect(isAllowedProxyUrl("https://amazonaws.com/resource")).toBe(true);
    });

    it("allows CloudFront CDN domains", () => {
      expect(isAllowedProxyUrl("https://d1234abcd.cloudfront.net/hls/video.m3u8")).toBe(true);
      expect(isAllowedProxyUrl("https://cloudfront.net/hls/video.m3u8")).toBe(true);
    });

    it("allows verified external media CDNs", () => {
      expect(isAllowedProxyUrl("https://restricted-external-cdn.org/live/stream.m3u8")).toBe(true);
      expect(isAllowedProxyUrl("https://edge-stream.cdn.org/live.m3u8")).toBe(true);
    });

    it("allows BuzzClips platform domains", () => {
      expect(isAllowedProxyUrl("https://buzzclips.app/video.m3u8")).toBe(true);
      expect(isAllowedProxyUrl("https://api.buzzclips.app/stream.m3u8")).toBe(true);
      expect(isAllowedProxyUrl("https://cdn.buzzclips.app/video.m3u8")).toBe(true);
    });

    it("allows legacy platform domains", () => {
      expect(isAllowedProxyUrl("https://bideo.tech/video.m3u8")).toBe(true);
      expect(isAllowedProxyUrl("https://api.bideo.tech/video.m3u8")).toBe(true);
      expect(isAllowedProxyUrl("https://bideo.rajit.cc/video.m3u8")).toBe(true);
      expect(isAllowedProxyUrl("https://stream.bideo.rajit.cc/video.m3u8")).toBe(true);
    });

    it("rejects unauthorized external domains", () => {
      expect(isAllowedProxyUrl("https://evil.com/video.m3u8")).toBe(false);
      expect(isAllowedProxyUrl("https://attacker.net/exploit.m3u8")).toBe(false);
      expect(isAllowedProxyUrl("https://fake-buzzclips.app.attacker.com/stream.m3u8")).toBe(false);
      expect(isAllowedProxyUrl("https://amazonaws.com.attacker.org/test.m3u8")).toBe(false);
    });
  });
});
