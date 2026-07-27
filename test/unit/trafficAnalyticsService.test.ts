import { describe, expect, it } from "vitest";
import {
  recordTrafficEvent,
  sanitizeTrafficError,
} from "../../server/core/services/trafficAnalyticsService";

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

function fakeDatabase(receiptChanges = 1) {
  const statements: FakeStatement[] = [];
  const batches: FakeStatement[][] = [];
  return {
    statements,
    batches,
    database: {
      prepare(query: string) {
        const changes = query.includes("traffic_event_receipts")
          ? receiptChanges
          : 1;
        const statement = new FakeStatement(query, changes);
        statements.push(statement);
        return statement;
      },
      async batch(value: FakeStatement[]) {
        batches.push(value);
        return [];
      },
    },
  };
}

describe("traffic analytics service", () => {
  it("removes obvious personal data from client errors", () => {
    expect(
      sanitizeTrafficError(
        "Load https://example.com/private failed for a@b.com 13800138000"
      )
    ).toBe("Load [url] failed for [email] [phone]");
  });

  it("records an anonymized page view with bounded dimensions", async () => {
    const { database, statements, batches } = fakeDatabase();
    const recorded = await recordTrafficEvent(
      database as any,
      {
        event: "page_view",
        eventId: "view:12345678",
        context: {
          visitorId: "visitor:12345678",
          sessionId: "session:12345678",
          path: "/topic/4k-movie?secret=1",
          attribution: {
            landingPath: "/topic/4k-movie",
            channel: "organic",
            source: "google",
            medium: "organic",
            campaign: "none",
          },
          language: "zh-CN",
          screen: "lg",
        },
      },
      {
        country: "CN",
        userAgent:
          "Mozilla/5.0 (Macintosh; Intel Mac OS X) AppleWebKit Safari/605.1",
      },
      Date.UTC(2026, 6, 24, 2)
    );

    expect(recorded).toBe(true);
    const sessionInsert = statements.find((item) =>
      item.query.includes("INSERT OR IGNORE INTO traffic_sessions")
    );
    expect(sessionInsert?.values[2]).toBe("2026-07-24");
    expect(sessionInsert?.values[5]).toBe("/topic/4k-movie");
    expect(sessionInsert?.values).toContain("safari");
    expect(sessionInsert?.values).toContain("macos");
    expect(sessionInsert?.values).not.toContain("visitor:12345678");
    expect(sessionInsert?.values).not.toContain("session:12345678");
    expect(batches).toHaveLength(1);
  });

  it("ignores a duplicate event receipt", async () => {
    const { database, statements } = fakeDatabase(0);
    const recorded = await recordTrafficEvent(
      database as any,
      {
        event: "page_view",
        eventId: "view:12345678",
        context: {
          visitorId: "visitor:12345678",
          sessionId: "session:12345678",
          path: "/",
          attribution: {
            landingPath: "/",
            channel: "direct",
            source: "direct",
            medium: "none",
            campaign: "none",
          },
          language: "zh-CN",
          screen: "lg",
        },
      },
      {},
      Date.UTC(2026, 6, 24, 2)
    );

    expect(recorded).toBe(false);
    expect(
      statements.some((item) => item.query.includes("traffic_sessions"))
    ).toBe(false);
  });
});
