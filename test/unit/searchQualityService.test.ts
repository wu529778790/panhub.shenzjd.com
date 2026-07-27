import { describe, expect, it, vi } from "vitest";
import {
  calculateSourceQualityPolicy,
  normalizeQualityQuery,
  recordResultClick,
  recordSearchQuality,
  recordSourcePerformance,
} from "../../server/core/services/searchQualityService";

function createDatabase() {
  const statements: Array<{ sql: string; values: unknown[] }> = [];
  const prepare = vi.fn((sql: string) => {
    const entry = { sql, values: [] as unknown[] };
    statements.push(entry);
    const statement = {
      bind(...values: unknown[]) {
        entry.values = values;
        return statement;
      },
      run: vi.fn().mockResolvedValue({ success: true, meta: { changes: 1 } }),
      all: vi.fn().mockResolvedValue({ results: [] }),
      first: vi.fn().mockResolvedValue(null),
    };
    return statement;
  });
  return {
    database: {
      prepare,
      batch: vi.fn().mockResolvedValue([]),
    } as any,
    statements,
  };
}

describe("search quality service", () => {
  it("removes obvious personal data and truncates aggregate queries", () => {
    expect(
      normalizeQualityQuery("三体 13800138000 test@example.com https://example.com/a")
    ).toBe("三体");
    expect(normalizeQualityQuery("书".repeat(120))).toHaveLength(80);
  });

  it("records one aggregate search event without user identifiers", async () => {
    const { database, statements } = createDatabase();
    await expect(
      recordSearchQuality(database, {
        eventId: "search:test-event-01",
        query: "三体",
        resultCount: 12,
        latencyMs: 860,
        matchMode: "fuzzy",
      }, 1_784_736_000_000)
    ).resolves.toBe(true);

    expect(statements.some((entry) => entry.sql.includes("search_quality_daily"))).toBe(true);
    expect(statements.some((entry) => entry.sql.includes("search_query_daily"))).toBe(true);
  });

  it("records source performance and prioritizes clicked share links", async () => {
    const { database, statements } = createDatabase();
    await recordSourcePerformance(database, {
      sourceKey: "精选资料库",
      resultCount: 8,
      latencyMs: 210,
      success: true,
    });
    await recordResultClick(database, {
      eventId: "click:test-event-01",
      query: "三体",
      url: "https://pan.quark.cn/s/abc123",
      platform: "quark",
      title: "三体 4K",
    });

    expect(statements.some((entry) => entry.sql.includes("source_performance_daily"))).toBe(true);
    expect(
      statements.some((entry) => entry.sql.includes("duplicate_count"))
    ).toBe(true);
    expect(statements.some((entry) => entry.sql.includes("result_click_daily"))).toBe(true);
    expect(statements.some((entry) => entry.sql.includes("link_health_checks"))).toBe(true);
  });

  it("scores stable sources above slow duplicate-heavy sources", () => {
    const active = calculateSourceQualityPolicy({
      sourceKey: "active",
      requestCount: 20,
      successCount: 19,
      errorCount: 1,
      resultCount: 180,
      uniqueResultCount: 160,
      duplicateCount: 20,
      emptyCount: 1,
      timeoutCount: 0,
      cachedCount: 4,
      latencyMs: 24_000,
      lastRequestedAt: 1_000,
    });
    const degraded = calculateSourceQualityPolicy({
      sourceKey: "duplicate",
      requestCount: 20,
      successCount: 20,
      errorCount: 0,
      resultCount: 200,
      uniqueResultCount: 20,
      duplicateCount: 180,
      emptyCount: 0,
      timeoutCount: 0,
      cachedCount: 0,
      latencyMs: 180_000,
      lastRequestedAt: 1_000,
    });

    expect(active.state).toBe("active");
    expect(active.score).toBeGreaterThan(degraded.score);
    expect(degraded.state).toBe("degraded");
    expect(degraded.maxVariants).toBe(1);
  });

  it("temporarily disables timeout-heavy sources and later allows a probe", () => {
    const stats = {
      sourceKey: "slow",
      requestCount: 12,
      successCount: 1,
      errorCount: 11,
      resultCount: 0,
      uniqueResultCount: 0,
      duplicateCount: 0,
      emptyCount: 12,
      timeoutCount: 10,
      cachedCount: 0,
      latencyMs: 120_000,
      lastRequestedAt: 1_000_000,
    };

    expect(calculateSourceQualityPolicy(stats, 1_100_000).state).toBe(
      "disabled"
    );
    expect(calculateSourceQualityPolicy(stats, 3_000_001).state).toBe("probe");
  });
});
