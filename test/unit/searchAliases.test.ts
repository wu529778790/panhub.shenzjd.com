import { describe, expect, it } from "vitest";
import { buildSearchAliasVariants } from "../../server/core/utils/searchAliases";

describe("search aliases", () => {
  it("expands common Chinese and English titles", () => {
    expect(buildSearchAliasVariants("got")).toContain("权力的游戏");
    expect(buildSearchAliasVariants("盗梦空间")).toContain("inception");
    expect(buildSearchAliasVariants("让子弹飞")).toContain("let the bullets fly");
  });

  it("normalizes year and season forms with a strict cap", () => {
    expect(buildSearchAliasVariants("三体 2023")).toContain("三体");
    expect(buildSearchAliasVariants("权力的游戏 S02", 3)).toContain("权力的游戏 第2季");
    expect(buildSearchAliasVariants("权力的游戏 S02", 2)).toHaveLength(2);
  });

  it("offers simplified Chinese for traditional queries", () => {
    expect(buildSearchAliasVariants("權力的遊戲", 3)).toContain("权力的游戏");
  });
});
