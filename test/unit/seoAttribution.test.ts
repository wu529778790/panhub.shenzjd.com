import { describe, expect, it } from "vitest";
import {
  buildSeoAttribution,
  normalizeLandingPath,
  sanitizeSeoAttribution,
} from "../../utils/seoAttribution";

describe("SEO attribution", () => {
  it("recognizes Chinese search engines without retaining a full referrer", () => {
    expect(
      buildSeoAttribution({
        landingPath: "/guide/search-tips?from=test",
        referrer: "https://www.baidu.com/s?wd=%E8%B5%84%E6%BA%90",
        siteHost: "haosouku.com",
      })
    ).toEqual({
      landingPath: "/guide/search-tips",
      channel: "organic",
      source: "baidu",
      medium: "organic",
      campaign: "none",
    });
  });

  it("prefers explicit UTM attribution and bounds dimensions", () => {
    expect(
      buildSeoAttribution({
        landingPath: "/topic/4k-movie",
        referrer: "",
        siteHost: "haosouku.com",
        utmSource: "WeChat Group",
        utmMedium: "social",
        utmCampaign: "Summer Guide",
      })
    ).toMatchObject({
      channel: "social",
      source: "wechat-group",
      medium: "social",
      campaign: "summer-guide",
    });
  });

  it("rejects unsafe paths and unknown channel values", () => {
    expect(normalizeLandingPath("//other.example/path")).toBe("/");
    expect(
      sanitizeSeoAttribution({
        landingPath: "https://other.example/private",
        channel: "unknown" as any,
        source: "",
      })
    ).toEqual({
      landingPath: "/",
      channel: "direct",
      source: "direct",
      medium: "none",
      campaign: "none",
    });
  });
});
