/**
 * Returns `raw` only if it is a same-origin relative path (e.g. "/video/upload?x=1"),
 * otherwise `fallback`. Prevents open redirects via ?next=https://evil.com or //evil.com.
 */
export function safeRedirectPath(raw: string | null | undefined, fallback = "/"): string {
  if (!raw || typeof raw !== "string") return fallback;
  const value = raw.trim();
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  if (/[\u0000-\u001f]/.test(value)) return fallback;
  if (value.startsWith("/auth/")) return fallback;
  return value;
}
