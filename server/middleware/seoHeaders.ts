import { getCanonicalRedirectTarget } from "../core/utils/canonicalUrl";

export default defineEventHandler((event) => {
  const url = getRequestURL(event);
  const forwardedProto = getHeader(event, "x-forwarded-proto")
    ?.split(",")[0]
    ?.trim();
  const target = getCanonicalRedirectTarget({
    host: getHeader(event, "host") || url.host,
    forwardedProto,
    method: event.method,
    pathname: url.pathname,
    search: url.search,
  });

  if (target) {
    setResponseStatus(event, 308);
    setHeader(event, "location", target);
    return "Redirecting to the canonical URL.";
  }

  if (url.pathname.startsWith("/api/") || url.pathname === "/ios-test") {
    setHeader(event, "x-robots-tag", "noindex, nofollow");
  }
});
