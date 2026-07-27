import { describe, expect, it, vi } from "vitest";
import {
  collectSearchLinksForAutomaticCheck,
  registerSearchLinksForAutomaticCheck,
} from "../../server/core/services/automaticLinkHealthService";

describe("automatic link health registration", () => {
  it("collects merged and detailed result links without duplicates", () => {
    const url = "https://pan.quark.cn/s/abc";
    expect(
      collectSearchLinksForAutomaticCheck({
        total: 1,
        merged_by_type: {
          quark: [{ url, password: "", note: "测试", datetime: "" }],
        },
        results: [
          {
            message_id: "1",
            unique_id: "1",
            channel: "test",
            datetime: "",
            title: "测试",
            content: "",
            links: [{ type: "quark", url, password: "" }],
          },
        ],
      })
    ).toEqual([url]);
  });

  it("queues supported HTTP shares but skips magnets and unknown hosts", async () => {
    const statements: Array<{ sql: string; values: unknown[] }> = [];
    const database = {
      prepare: vi.fn((sql: string) => {
        const statement = {
          bind: (...values: unknown[]) => {
            const prepared = {
              sql,
              values,
              bind: statement.bind,
              run: vi.fn().mockResolvedValue({ success: true }),
              all: vi.fn(),
              first: vi.fn(),
            };
            statements.push(prepared);
            return prepared;
          },
          run: vi.fn(),
          all: vi.fn(),
          first: vi.fn(),
        };
        return statement;
      }),
      batch: vi.fn().mockResolvedValue([]),
    };
    const count = await registerSearchLinksForAutomaticCheck(database as any, {
      total: 3,
      merged_by_type: {
        quark: [
          {
            url: "https://pan.quark.cn/s/abc",
            password: "",
            note: "测试",
            datetime: "",
          },
        ],
        magnet: [
          {
            url: `magnet:?xt=urn:btih:${"a".repeat(40)}`,
            password: "",
            note: "磁力",
            datetime: "",
          },
        ],
        others: [
          {
            url: "https://example.com/file",
            password: "",
            note: "未知",
            datetime: "",
          },
        ],
      },
    });

    expect(count).toBe(1);
    expect(database.batch).toHaveBeenCalledTimes(1);
    expect(statements).toHaveLength(1);
    expect(statements[0]?.values).toContain("quark");
  });
});
