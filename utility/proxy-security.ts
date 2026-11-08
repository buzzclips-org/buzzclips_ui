/**
 * SSRF validation utility for stream proxies.
 * Restricts outgoing requests exclusively to trusted media storage and platform domains.
 */

export function isAllowedProxyUrl(urlStr: string): boolean {
  if (!urlStr || typeof urlStr !== "string") {
    return false;
  }

  let parsed: URL;
  try {
    parsed = new URL(urlStr);
  } catch {
    return false;
  }

  // 1. Only allow HTTPS (or HTTP in local dev)
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return false;
  }

  if (process.env.NODE_ENV === "production" && parsed.protocol !== "https:") {
    return false;
  }

  const hostname = parsed.hostname.toLowerCase();

  // 2. Reject direct IP addresses (IPv4 or IPv6) to block loopback, link-local, and private subnets
  // (e.g. 169.254.169.254, 127.0.0.1, 10.0.0.1, 192.168.1.1, [::1])
  if (
    /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(hostname) ||
    hostname.startsWith("[") ||
    hostname.includes(":")
  ) {
    return false;
  }

  // 3. Reject localhost and internal network identifiers
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    hostname.includes("metadata")
  ) {
    return false;
  }

  // 4. Allowed hostnames and domain patterns (AWS S3, CloudFront, platform domains, and external CDN allowlist)
  const isS3OrCdnHost =
    hostname.endsWith(".amazonaws.com") ||
    hostname === "amazonaws.com" ||
    hostname.endsWith(".cloudfront.net") ||
    hostname === "cloudfront.net" ||
    hostname.endsWith(".cdn.org") ||
    hostname === "restricted-external-cdn.org";

  const isPlatformHost =
    hostname === "buzzclips.app" ||
    hostname.endsWith(".buzzclips.app") ||
    hostname === "bideo.tech" ||
    hostname.endsWith(".bideo.tech") ||
    hostname === "bideo.rajit.cc" ||
    hostname.endsWith(".bideo.rajit.cc");

  return isS3OrCdnHost || isPlatformHost;
}
