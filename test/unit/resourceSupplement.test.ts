import { describe, expect, it } from "vitest";
import { extractSupplementLinks } from "../../server/core/plugins/resourceSupplement";

describe("resource supplement parsing", () => {
  it("keeps supported cloud links and their passwords", () => {
    const links = extractSupplementLinks(
      "夸克：https://pan.quark.cn/s/abc 百度：https://pan.baidu.com/s/def?pwd=5kep 广告：https://example.com"
    );
    expect(links).toEqual([
      { type: "quark", url: "https://pan.quark.cn/s/abc", password: "" },
      { type: "baidu", url: "https://pan.baidu.com/s/def?pwd=5kep", password: "5kep" },
    ]);
  });
});
