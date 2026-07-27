import { describe, expect, it } from "vitest";
import {
  buildSearchKeywordVariants,
  matchesExactSearchKeyword,
  matchesSearchKeyword,
  normalizeSearchKeyword,
} from "../../server/core/utils/searchKeyword";

describe("search keyword helpers", () => {
  it("normalizes punctuation and whitespace", () => {
    expect(normalizeSearchKeyword(" 肖申克 的 救赎 4K ")).toBe("肖申克的救赎4k");
  });

  it("builds useful variants for cjk queries", () => {
    const variants = buildSearchKeywordVariants("肖申克的救赎 4K");

    expect(variants).toContain("肖申克的救赎 4K");
    expect(variants).toContain("肖申克 救赎");
    expect(variants).toContain("肖申克");
    expect(variants).not.toContain("救赎");
  });

  it("matches text by normalized phrase", () => {
    expect(matchesSearchKeyword("肖申克的救赎 (1994) 4K", "肖申克的救赎")).toBe(true);
  });

  it("matches an exact phrase while ignoring spaces and punctuation", () => {
    expect(matchesExactSearchKeyword("肖申克的救赎 (1994) 4K", "肖申克 的救赎")).toBe(true);
    expect(matchesExactSearchKeyword("肖申克 4K 修复版", "肖申克的救赎")).toBe(false);
  });

  it("matches text by cjk keyword variants", () => {
    expect(matchesSearchKeyword("经典高分电影: 肖申克 4K 修复版", "肖申克的救赎 4K")).toBe(true);
  });

  it("strips cjk noise words (蓝光) without relying on ascii word boundaries", () => {
    // \b 对 CJK 字符不生效，"蓝光" 必须被剔除，从而产出 "复仇者联盟" 变体
    const variants = buildSearchKeywordVariants("蓝光复仇者联盟");
    expect(variants.map(normalizeSearchKeyword)).toContain("复仇者联盟");
  });

  it("strips multiple cjk noise words (国语/双字)", () => {
    const variants = buildSearchKeywordVariants("国语双字复仇者");
    expect(variants.map(normalizeSearchKeyword)).toContain("复仇者");
  });

  it("does not create weak two-character fragments from a longer title", () => {
    expect(buildSearchKeywordVariants("三体")).toEqual(["三体"]);
    expect(buildSearchKeywordVariants("肖申克的救赎")).not.toContain("救赎");
  });
});
