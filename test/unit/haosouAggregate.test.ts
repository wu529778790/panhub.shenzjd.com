import { describe, expect, it } from "vitest";
import { HaosouAggregatePlugin } from "../../server/core/plugins/haosouAggregate";

describe("HaosouAggregatePlugin", () => {
  it("returns container search results through a service binding", async () => {
    let requestedUrl = "";
    const fetcher = {
      async fetch(request: Request) {
        requestedUrl = request.url;
        return Response.json({
          code: 0,
          message: "success",
          data: {
            total: 1,
            results: [
              {
                message_id: "1",
                unique_id: "aggregate-1",
                channel: "",
                datetime: "2026-07-22T00:00:00Z",
                title: "测试资源",
                content: "测试资源",
                links: [
                  {
                    type: "quark",
                    url: "https://pan.quark.cn/s/example",
                    password: "",
                  },
                ],
              },
            ],
          },
        });
      },
    };

    const plugin = new HaosouAggregatePlugin();
    const results = await plugin.search("测试资源", {
      __pansou_fetcher: fetcher,
    });

    expect(results).toHaveLength(1);
    expect(results[0].unique_id).toBe("aggregate-1");
    expect(requestedUrl).toContain("kw=%E6%B5%8B%E8%AF%95%E8%B5%84%E6%BA%90");
    expect(requestedUrl).toContain("src=plugin");
    expect(requestedUrl).toContain("res=results");
  });

  it("degrades to no results when the binding is unavailable", async () => {
    const plugin = new HaosouAggregatePlugin();
    await expect(plugin.search("测试资源")).resolves.toEqual([]);
  });
});
