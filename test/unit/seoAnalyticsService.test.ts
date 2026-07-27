import { describe, expect, it } from "vitest";
import { recordSeoEvent } from "../../server/core/services/seoAnalyticsService";

class FakeStatement {
  values: unknown[] = [];

  constructor(
    public query: string,
    private changes = 1
  ) {}

  bind(...values: unknown[]) {
    this.values = values;
    return this;
  }

  async run() {
    return { success: true, meta: { changes: this.changes } };
  }

  async first() {
    return null;
  }

  async all() {
    return { results: [] };
  }
}

describe("SEO analytics service", () => {
  it("records one privacy-bounded aggregate event", async () => {
    const statements: FakeStatement[] = [];
    const batches: FakeStatement[][] = [];
    const database = {
      prepare(query: string) {
        const statement = new FakeStatement(query);
        statements.push(statement);
        return statement;
      },
      async batch(value: FakeStatement[]) {
        batches.push(value);
        return [];
      },
    };

    const recorded = await recordSeoEvent(
      database as any,
      {
        eventId: "landing:12345678",
        event: "landing",
        attribution: {
          landingPath: "/guide/search-tips?secret=1",
          channel: "organic",
          source: "baidu",
          medium: "organic",
          campaign: "none",
        },
      },
      Date.UTC(2026, 6, 23, 2)
    );

    expect(recorded).toBe(true);
    expect(batches).toHaveLength(1);
    expect(batches[0]).toHaveLength(2);
    expect(
      batches[0][0].values.slice(0, 9)
    ).toEqual([
      "2026-07-23",
      "/guide/search-tips",
      "organic",
      "baidu",
      "organic",
      "none",
      1,
      0,
      0,
    ]);
    expect(statements.some((item) => item.query.includes("seo_event_receipts"))).toBe(true);
  });
});
