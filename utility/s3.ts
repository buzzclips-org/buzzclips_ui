/**
 * Utility to normalize AWS S3 URLs.
 *
 * When an S3 bucket name contains dots (e.g. `buzzclips.app`), AWS's wildcard SSL
 * certificate (`*.s3.<region>.amazonaws.com`) fails RFC 6125 TLS verification in
 * browsers and Node.js (`ERR_CERT_COMMON_NAME_INVALID`).
 *
 * Converting to path-style format (`https://s3.<region>.amazonaws.com/<bucket>/<key>`)
 * satisfies SSL certificate verification across all browsers, Node.js, and Next.js image optimization.
 */
export function normalizeS3Url(urlStr: string | null | undefined): string {
  if (!urlStr || typeof urlStr !== "string") return urlStr || "";

  // Only attempt transformation if it looks like an S3 URL with a dot in the subdomain
  if (!urlStr.includes(".s3") || !urlStr.includes("amazonaws.com")) {
    return urlStr;
  }

  try {
    const url = new URL(urlStr);
    // Matches: <bucket_with_dot>.s3.<region>.amazonaws.com or <bucket_with_dot>.s3.amazonaws.com
    const match = url.hostname.match(/^(.+\..+?)\.s3(?:[.-]([a-z0-9-]+))?\.amazonaws\.com$/i);
    if (match) {
      const bucket = match[1];
      const region = match[2];
      const s3Host = region ? `s3.${region}.amazonaws.com` : "s3.amazonaws.com";
      const cleanPath = url.pathname.startsWith("/") ? url.pathname : `/${url.pathname}`;
      return `${url.protocol}//${s3Host}/${bucket}${cleanPath}${url.search}`;
    }
  } catch {
    // Return original if URL parsing fails
  }

  return urlStr;
}

/**
 * Recursively normalizes all S3 URLs in an object (e.g. VideoDTO, UserDTO).
 */
export function sanitizeMediaUrls<T>(data: T): T {
  if (!data || typeof data !== "object") return data;

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeMediaUrls(item)) as unknown as T;
  }

  const result: any = { ...data };
  const urlFields = ["m3u8Url", "thumbnail_url", "avatar_url", "poster", "banner_url", "video_url"];

  for (const key of Object.keys(result)) {
    if (urlFields.includes(key) && typeof result[key] === "string") {
      result[key] = normalizeS3Url(result[key]);
    } else if (typeof result[key] === "object" && result[key] !== null) {
      result[key] = sanitizeMediaUrls(result[key]);
    }
  }

  return result;
}
