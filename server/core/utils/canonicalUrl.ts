const CANONICAL_HOST = "haosouku.com";
const REDIRECT_HOSTS = new Set([
  "www.haosouku.com",
  "haosoku.com",
  "www.haosoku.com",
]);

export interface CanonicalRequest {
  host: string;
  forwardedProto?: string;
  method?: string;
  pathname: string;
  search?: string;
}

export function getCanonicalRedirectTarget(
  request: CanonicalRequest
): string | null {
  const host = request.host.split(":")[0].toLowerCase();
  const proto = request.forwardedProto?.split(",")[0]?.trim().toLowerCase();
  const method = (request.method || "GET").toUpperCase();
  const canNormalizePath = method === "GET" || method === "HEAD";
  const hasTrailingSlash =
    request.pathname.length > 1 && request.pathname.endsWith("/");
  const shouldRedirectHost =
    (host === CANONICAL_HOST && proto === "http") ||
    REDIRECT_HOSTS.has(host);
  const shouldNormalizePath =
    host === CANONICAL_HOST && canNormalizePath && hasTrailingSlash;

  if (!shouldRedirectHost && !shouldNormalizePath) return null;

  const pathname =
    canNormalizePath && hasTrailingSlash
      ? request.pathname.replace(/\/+$/, "")
      : request.pathname;
  const target = new URL(
    `${pathname || "/"}${request.search || ""}`,
    `https://${CANONICAL_HOST}`
  );
  return target.toString();
}
