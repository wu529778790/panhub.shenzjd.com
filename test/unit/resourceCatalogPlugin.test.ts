import { describe, expect, it, vi } from "vitest";
import { ResourceCatalogPlugin } from "../../server/core/plugins/resourceCatalog";

describe("ResourceCatalogPlugin", () => {
  it("keeps two-character searches on the compatible LIKE query", async () => {
    const all = vi.fn().mockResolvedValue({
      results: [
        {
          normalized_url: "https://pan.quark.cn/s/abc",
          url: "https://pan.quark.cn/s/abc",
          type: "quark",
          password: "",
          title: "三体 4K",
          category: "影视",
          last_seen_at: 1_700_000_000_000,
          source_label: "影视资料库",
        },
      ],
    });
    const bind = vi.fn().mockReturnValue({ all });
    const database = { prepare: vi.fn().mockReturnValue({ bind }) };

    const results = await new ResourceCatalogPlugin().search("三体", {
      __resource_database: database,
    });

    expect(bind).toHaveBeenCalledWith("%三体%", "%三体%", "三体", "三体%");
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      title: "三体 4K",
      source: "影视资料库",
      links: [{ type: "quark", url: "https://pan.quark.cn/s/abc" }],
    });
  });

  it("uses the trigram index for searches of three characters or more", async () => {
    const all = vi.fn().mockResolvedValue({ results: [] });
    const bind = vi.fn().mockReturnValue({ all });
    const prepare = vi.fn().mockReturnValue({ bind });

    await new ResourceCatalogPlugin().search("流浪地球", {
      __resource_database: { prepare },
    });

    expect(prepare.mock.calls[0][0]).toContain("resource_catalog_fts MATCH ?");
    expect(bind).toHaveBeenCalledWith('"流浪地球"', "流浪地球", "流浪地球%");
  });

  it("falls back to LIKE while the FTS migration is pending", async () => {
    const fallbackAll = vi.fn().mockResolvedValue({ results: [] });
    const fallbackBind = vi.fn().mockReturnValue({ all: fallbackAll });
    const prepare = vi
      .fn()
      .mockReturnValueOnce({
        bind: () => ({
          all: () => Promise.reject(new Error("no such table: resource_catalog_fts")),
        }),
      })
      .mockReturnValueOnce({ bind: fallbackBind });

    await new ResourceCatalogPlugin().search("流浪地球", {
      __resource_database: { prepare },
    });

    expect(prepare).toHaveBeenCalledTimes(2);
    expect(prepare.mock.calls[1][0]).toContain("c.title LIKE ?");
    expect(fallbackBind).toHaveBeenCalledWith(
      "%流浪地球%",
      "%流浪地球%",
      "流浪地球",
      "流浪地球%"
    );
  });

  it("stays empty before the catalog migration is applied", async () => {
    const database = {
      prepare: () => ({
        bind: () => ({ all: () => Promise.reject(new Error("no such table: resource_catalog")) }),
      }),
    };
    await expect(
      new ResourceCatalogPlugin().search("三体", { __resource_database: database })
    ).resolves.toEqual([]);
  });
});
