import { describe, expect, it } from "vitest";
import {
  scoreGeneralSearchResult,
  sortMergedLinksByRelevance,
} from "../../server/core/services/searchRanking";
import { evaluateSearchResult } from "../../utils/searchEvaluation";

const item = (note: string, extra: Record<string, any> = {}) => ({
  url: `https://pan.quark.cn/s/${note}`,
  password: "",
  note,
  datetime: "",
  ...extra,
});

describe("general search ranking", () => {
  it("prefers exact and prefix title matches", () => {
    const exact = scoreGeneralSearchResult(item("三体"), "三体", "quark", 0);
    const loose = scoreGeneralSearchResult(item("科幻电视剧三体合集"), "三体", "quark", 0);
    expect(exact).toBeGreaterThan(loose);
  });

  it("uses source support and health as deterministic tie breakers", () => {
    const supported = item("三体 4K", { support_count: 3, health_status: "alive" });
    const uncertain = item("三体 4K", { support_count: 1, health_status: "suspect" });
    expect(scoreGeneralSearchResult(supported, "三体", "quark", 0)).toBeGreaterThan(
      scoreGeneralSearchResult(uncertain, "三体", "quark", 0)
    );
  });

  it("sorts general cloud links by relevance", () => {
    const sorted = sortMergedLinksByRelevance(
      [item("三体访谈"), item("三体")],
      "三体",
      "quark"
    );
    expect(sorted[0]?.note).toBe("三体");
    expect(sorted[0]?.evaluation?.relevance).toBe(100);
    expect(sorted[0]?.relevance_score).toBe(sorted[0]?.evaluation?.overall);
  });

  it("scores cloud results across availability, sources, freshness and quality", () => {
    const now = Date.parse("2026-07-23T00:00:00.000Z");
    const evaluation = evaluateSearchResult(item("三体 4K 完整版", {
      datetime: "2026-07-22T00:00:00.000Z",
      health_status: "alive",
      sources: ["频道索引", "公开索引", "补充索引"],
      support_count: 3,
      category: "影视",
      metadata: { resolution: "4K", releaseType: "WEB-DL" },
    }), "三体", "quark", now);

    expect(evaluation).toMatchObject({
      availability: 100,
      freshness: 100,
      risk: 0,
    });
    expect(evaluation.relevance).toBeGreaterThanOrEqual(85);
    expect(evaluation.sourceConfidence).toBeGreaterThan(70);
    expect(evaluation.reasons).toContain("近期验证可用");
    expect(evaluation.reasons).toContain("3 个来源交叉收录");
  });

  it("uses magnet activity and technical metadata without treating adult classification as risk", () => {
    const now = Date.parse("2026-07-23T00:00:00.000Z");
    const evaluation = evaluateSearchResult(item("示例影片 4K REMUX", {
      url: "magnet:?xt=urn:btih:582FC386D0087DCEFE998B70D0BC6794C361E603",
      datetime: "2026-07-22T00:00:00.000Z",
      support_count: 2,
      metadata: {
        adult: true,
        seeders: 48,
        availabilityScore: 84,
        availabilityStatus: "active",
        verified: true,
        resolution: "4K",
        releaseType: "REMUX",
        videoCodec: "H.265",
        sizeBytes: 42_000_000_000,
        sources: ["索引 A", "索引 B"],
      },
    }), "示例影片", "magnet", now);

    expect(evaluation.availability).toBeGreaterThan(80);
    expect(evaluation.quality).toBeGreaterThan(70);
    expect(evaluation.risk).toBe(0);
    expect(evaluation.reasons).toContain("48 个做种");
  });

  it("penalizes explicit source risk signals", () => {
    const base = item("三体", {
      url: "magnet:?xt=urn:btih:582FC386D0087DCEFE998B70D0BC6794C361E603",
      metadata: { seeders: 12, availabilityScore: 72 },
    });
    const safe = evaluateSearchResult(base, "三体", "magnet", 0);
    const risky = evaluateSearchResult({
      ...base,
      metadata: {
        ...base.metadata,
        availabilityStatus: "risky",
        riskScore: 0.8,
        riskFlags: ["malware"],
      },
    }, "三体", "magnet", 0);

    expect(risky.risk).toBeGreaterThanOrEqual(80);
    expect(risky.overall).toBeLessThan(safe.overall);
    expect(risky.reasons[0]).toBe("来源提示风险");
  });
});
