import { describe, expect, it } from "vitest";
import {
  normalizeD1HotSearchTerm,
  rankD1HotSearchRows,
} from "../../server/core/services/d1HotSearchService";

describe("D1 hot search helpers", () => {
  it("normalizes full-width characters and rejects unsafe terms", () => {
    expect(normalizeD1HotSearchTerm(" Ｈｅｌｌｏ２０２６ ")).toBe("Hello2026");
    expect(normalizeD1HotSearchTerm("https://example.com")).toBeUndefined();
    expect(normalizeD1HotSearchTerm("色情内容")).toBeUndefined();
  });

  it("ranks recent terms using score and recency decay", () => {
    const now = Date.UTC(2026, 6, 22);
    const rows = [
      { term: "较旧高分", score: 10, last_searched_at: now - 6 * 86_400_000, created_at: 1 },
      { term: "最新低分", score: 9, last_searched_at: now, created_at: 2 },
      { term: "已过期", score: 100, last_searched_at: now - 8 * 86_400_000, created_at: 3 },
    ];

    const result = rankD1HotSearchRows(rows, 10, now);
    expect(result.map((item) => item.term)).toEqual(["最新低分", "较旧高分"]);
    expect(result.map((item) => item.rank)).toEqual([1, 2]);
  });
});
