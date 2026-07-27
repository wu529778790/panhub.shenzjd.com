import { describe, expect, it } from "vitest";
import { getCanonicalRedirectTarget } from "../../server/core/utils/canonicalUrl";

describe("canonical URL redirects", () => {
  it("redirects HTTP and alternate hosts to the HTTPS apex domain", () => {
    expect(
      getCanonicalRedirectTarget({
        host: "haosouku.com",
        forwardedProto: "http",
        pathname: "/",
      })
    ).toBe("https://haosouku.com/");
    expect(
      getCanonicalRedirectTarget({
        host: "www.haosouku.com",
        forwardedProto: "https",
        pathname: "/topic/ebooks",
        search: "?utm_source=bing",
      })
    ).toBe("https://haosouku.com/topic/ebooks?utm_source=bing");
    expect(
      getCanonicalRedirectTarget({
        host: "haosoku.com",
        forwardedProto: "https",
        pathname: "/category/movie",
      })
    ).toBe("https://haosouku.com/category/movie");
  });

  it("removes trailing slashes from public GET and HEAD page URLs", () => {
    expect(
      getCanonicalRedirectTarget({
        host: "haosouku.com",
        forwardedProto: "https",
        method: "GET",
        pathname: "/category/movie/",
        search: "?utm_source=bing",
      })
    ).toBe("https://haosouku.com/category/movie?utm_source=bing");
    expect(
      getCanonicalRedirectTarget({
        host: "haosouku.com",
        forwardedProto: "https",
        method: "HEAD",
        pathname: "/topic/ebooks///",
      })
    ).toBe("https://haosouku.com/topic/ebooks");
  });

  it("leaves canonical and non-idempotent requests unchanged", () => {
    expect(
      getCanonicalRedirectTarget({
        host: "haosouku.com",
        forwardedProto: "https",
        method: "GET",
        pathname: "/",
      })
    ).toBeNull();
    expect(
      getCanonicalRedirectTarget({
        host: "haosouku.com",
        forwardedProto: "https",
        method: "GET",
        pathname: "/topic/ebooks",
      })
    ).toBeNull();
    expect(
      getCanonicalRedirectTarget({
        host: "haosouku.com",
        forwardedProto: "https",
        method: "POST",
        pathname: "/api/search/",
      })
    ).toBeNull();
    expect(
      getCanonicalRedirectTarget({
        host: "example.com",
        forwardedProto: "https",
        method: "GET",
        pathname: "/topic/ebooks/",
      })
    ).toBeNull();
  });
});
