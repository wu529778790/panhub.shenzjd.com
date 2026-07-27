import { describe, expect, it, vi } from "vitest";
import { SearchService } from "../../server/core/services/searchService";
import {
  BaseAsyncPlugin,
  PluginManager,
} from "../../server/core/plugins/manager";
import type { SearchResult } from "../../server/core/types/models";

class ThrowingPlugin extends BaseAsyncPlugin {
  async search(): Promise<SearchResult[]> {
    throw new Error("plugin exploded");
  }
}

class SuccessPlugin extends BaseAsyncPlugin {
  async search(): Promise<SearchResult[]> {
    return [
      {
        message_id: "1",
        unique_id: "ok-1",
        channel: "success-plugin",
        datetime: new Date("2026-01-01T00:00:00.000Z").toISOString(),
        title: "ok result",
        content: "ok result",
        links: [{ type: "quark", url: "https://example.com/1", password: "" }],
      },
    ];
  }
}

class EmptyPlugin extends BaseAsyncPlugin {
  async search(): Promise<SearchResult[]> {
    return [];
  }
}

// 模拟一个卡死的插件：永不自行 resolve，只有收到 abort 信号才结束
class HangingPlugin extends BaseAsyncPlugin {
  receivedSignal: AbortSignal | undefined;

  async search(
    _keyword: string,
    ext?: Record<string, any>
  ): Promise<SearchResult[]> {
    this.receivedSignal = ext?.signal;
    return new Promise<SearchResult[]>((resolve) => {
      this.receivedSignal?.addEventListener(
        "abort",
        () => resolve([]),
        { once: true }
      );
    });
  }
}

class FallbackPlugin extends BaseAsyncPlugin {
  async search(keyword: string): Promise<SearchResult[]> {
    if (keyword === "movie") {
      return [
        {
          message_id: "fallback-1",
          unique_id: "fallback-1",
          channel: "fallback-plugin",
          datetime: new Date("2026-01-01T00:00:00.000Z").toISOString(),
          title: "fallback result",
          content: "fallback result",
          links: [{ type: "quark", url: "https://example.com/fallback", password: "" }],
        },
      ];
    }

    return [];
  }
}

class VariantMergePlugin extends BaseAsyncPlugin {
  async search(keyword: string): Promise<SearchResult[]> {
    if (keyword === "肖申克的救赎") {
      return [
        {
          message_id: "variant-1",
          unique_id: "variant-1",
          channel: "variant-plugin",
          datetime: new Date("2026-01-01T00:00:00.000Z").toISOString(),
          title: "肖申克的救赎",
          content: "exact",
          links: [{ type: "quark", url: "https://example.com/exact", password: "" }],
        },
      ];
    }

    if (keyword === "肖申克 救赎") {
      return [
        {
          message_id: "variant-2",
          unique_id: "variant-2",
          channel: "variant-plugin",
          datetime: new Date("2026-01-02T00:00:00.000Z").toISOString(),
          title: "肖申克 救赎 导演剪辑版",
          content: "variant",
          links: [{ type: "quark", url: "https://example.com/variant", password: "" }],
        },
      ];
    }

    return [];
  }
}

class MatchModePlugin extends BaseAsyncPlugin {
  queries: string[] = [];

  async search(keyword: string): Promise<SearchResult[]> {
    this.queries.push(keyword);
    if (keyword !== "肖申克的救赎") return [];

    return [
      {
        message_id: "match-exact",
        unique_id: "match-exact",
        channel: "match-plugin",
        datetime: new Date("2026-01-03T00:00:00.000Z").toISOString(),
        title: "肖申克 的救赎 4K 修复版",
        content: "完整片名资源",
        links: [{ type: "quark", url: "https://example.com/match-exact", password: "" }],
      },
      {
        message_id: "match-partial",
        unique_id: "match-partial",
        channel: "match-plugin",
        datetime: new Date("2026-01-02T00:00:00.000Z").toISOString(),
        title: "肖申克 4K 修复版",
        content: "高分电影合集",
        links: [{ type: "quark", url: "https://example.com/match-partial", password: "" }],
      },
    ];
  }
}

class AliasMagnetPlugin extends BaseAsyncPlugin {
  queries: string[] = [];

  useKeywordVariants(): boolean {
    return false;
  }

  async search(keyword: string): Promise<SearchResult[]> {
    this.queries.push(keyword);
    if (keyword !== "three body") return [];
    return [
      {
        message_id: "magnet-relevant",
        unique_id: "magnet-relevant",
        channel: "magnet-plugin",
        datetime: "2026-01-03T00:00:00.000Z",
        title: "The Three Body Problem 2024 1080P",
        content: "",
        links: [{
          type: "magnet",
          url: `magnet:?xt=urn:btih:${"a".repeat(40)}`,
          password: "",
        }],
      },
      {
        message_id: "magnet-noise",
        unique_id: "magnet-noise",
        channel: "magnet-plugin",
        datetime: "2026-01-02T00:00:00.000Z",
        title: "These Three Slut Sisters Are Lusting For My Body",
        content: "",
        links: [{
          type: "magnet",
          url: `magnet:?xt=urn:btih:${"b".repeat(40)}`,
          password: "",
        }],
      },
    ];
  }
}

class TimedVariantPlugin extends BaseAsyncPlugin {
  queries: Array<{ keyword: string; budgetMs: number }> = [];

  async search(
    keyword: string,
    ext?: Record<string, any>
  ): Promise<SearchResult[]> {
    this.queries.push({
      keyword,
      budgetMs: Number(ext?.__plugin_timeout_ms || 0),
    });
    return new Promise((resolve) => setTimeout(() => resolve([]), 1600));
  }
}

function createService(plugin: BaseAsyncPlugin) {
  const manager = new PluginManager();
  manager.registerPlugin(plugin);

  return new SearchService(
    {
      priorityChannels: [],
      defaultChannels: [],
      defaultConcurrency: 2,
      pluginTimeoutMs: 100,
      cacheEnabled: false,
      cacheTtlMinutes: 1,
    },
    manager
  );
}

function createServiceWithPlugins(plugins: BaseAsyncPlugin[]) {
  const manager = new PluginManager();
  for (const plugin of plugins) {
    manager.registerPlugin(plugin);
  }

  return new SearchService(
    {
      priorityChannels: [],
      defaultChannels: [],
      defaultConcurrency: 2,
      pluginTimeoutMs: 100,
      cacheEnabled: false,
      cacheTtlMinutes: 1,
    },
    manager
  );
}

describe("SearchService warnings", () => {
  it("returns warnings for the current failed search", async () => {
    const service = createService(new ThrowingPlugin("thrower", 1));

    const result = await service.searchWithWarnings(
      "test",
      [],
      1,
      false,
      "merged_by_type",
      "plugin",
      ["thrower"],
      undefined,
      {}
    );

    expect(result.response.total).toBe(0);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]?.source).toBe("plugin_search");
  });

  it("does not leak warnings into the next successful search", async () => {
    const service = createServiceWithPlugins([
      new ThrowingPlugin("thrower", 1),
      new SuccessPlugin("success", 1),
    ]);

    await service.searchWithWarnings(
      "test",
      [],
      1,
      false,
      "merged_by_type",
      "plugin",
      ["thrower"],
      undefined,
      {}
    );

    const result = await service.searchWithWarnings(
      "test",
      [],
      1,
      false,
      "merged_by_type",
      "plugin",
      ["success"],
      undefined,
      {}
    );

    expect(result.response.total).toBe(1);
    expect(result.warnings).toEqual([]);
  });

  it("records plugin failures so the circuit breaker can trip", async () => {
    const service = createService(new ThrowingPlugin("thrower", 1));

    // maxFailures 为 5，跑 6 次确保跨过熔断阈值
    for (let i = 0; i < 6; i++) {
      await service.searchWithWarnings(
        "test",
        [],
        1,
        false,
        "merged_by_type",
        "plugin",
        ["thrower"],
        undefined,
        {}
      );
    }

    const status = service
      .getPluginHealthStatus()
      .find((item) => item.name === "thrower");

    expect(status?.failureCount).toBeGreaterThanOrEqual(5);
    expect(status?.isHealthy).toBe(false);
  });

  it("does not mark a plugin unhealthy when it simply returns no results", async () => {
    const service = createService(new EmptyPlugin("empty", 1));

    for (let i = 0; i < 6; i++) {
      const result = await service.searchWithWarnings(
        `miss-${i}`,
        [],
        1,
        false,
        "merged_by_type",
        "plugin",
        ["empty"],
        undefined,
        {}
      );

      expect(result.response.total).toBe(0);
    }

    const status = service.getPluginHealthStatus().find((item) => item.name === "empty");
    expect(status?.isHealthy).toBe(true);
    expect(status?.failureCount).toBe(0);
  });

  it("skips quality-disabled plugins when the web client enables quality controls", async () => {
    const disabled = new EmptyPlugin("disabled", 1);
    const active = new EmptyPlugin("active", 2);
    const disabledSearch = vi.spyOn(disabled, "search");
    const activeSearch = vi.spyOn(active, "search");
    const service = createServiceWithPlugins([disabled, active]);

    const result = await service.searchWithWarnings(
      "test",
      [],
      2,
      false,
      "merged_by_type",
      "plugin",
      ["disabled", "active"],
      undefined,
      {
        __respect_source_quality: true,
        __source_quality_policies: {
          disabled: { state: "disabled", score: 20 },
          active: { state: "active", score: 95 },
        },
      }
    );

    expect(disabledSearch).not.toHaveBeenCalled();
    expect(activeSearch).toHaveBeenCalledOnce();
    expect(result.sourceMetrics.map((metric) => metric.sourceKey)).toEqual([
      "active",
    ]);
  });

  it("does not count a successful fallback search as a plugin failure", async () => {
    const service = createService(new FallbackPlugin("fallback", 1));

    const result = await service.searchWithWarnings(
      "a",
      [],
      1,
      false,
      "merged_by_type",
      "plugin",
      ["fallback"],
      undefined,
      {}
    );

    expect(result.response.total).toBe(1);

    const status = service.getPluginHealthStatus().find((item) => item.name === "fallback");
    expect(status?.isHealthy).toBe(true);
    expect(status?.failureCount).toBe(0);
    expect(status?.successCount).toBe(1);
    expect(result.sourceMetrics).toMatchObject([
      {
        sourceKey: "fallback",
        success: true,
        timedOut: false,
      },
    ]);
  });

  it("aborts the plugin abort signal when its search exceeds the timeout", async () => {
    const plugin = new HangingPlugin("hanging", 1);
    const service = createService(plugin); // pluginTimeoutMs: 100

    vi.useFakeTimers();
    try {
      const pending = service.searchWithWarnings(
        "test",
        [],
        1,
        false,
        "merged_by_type",
        "plugin",
        ["hanging"],
        undefined,
        {}
      );

      // searchPlugins 的 timeoutMs 有 Math.max(3000, ...) 下限，需推进超过 3000ms
      await vi.advanceTimersByTimeAsync(3500);
      const result = await pending;

      // 插件应通过 ext 收到一个 abort signal，且超时后被 abort
      expect(plugin.receivedSignal).toBeDefined();
      expect(plugin.receivedSignal?.aborted).toBe(true);
      expect(result.sourceMetrics[0]).toMatchObject({
        sourceKey: "hanging",
        success: false,
        timedOut: true,
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it("shares one timeout budget across all keyword variants", async () => {
    const plugin = new TimedVariantPlugin("timed-variant", 1);
    const service = createService(plugin);

    vi.useFakeTimers();
    try {
      const pending = service.searchWithWarnings(
        "肖申克的救赎 4K",
        [],
        1,
        false,
        "merged_by_type",
        "plugin",
        ["timed-variant"],
        undefined,
        {}
      );

      await vi.advanceTimersByTimeAsync(3200);
      const result = await pending;

      expect(plugin.queries).toHaveLength(2);
      expect(plugin.queries[0]?.budgetMs).toBe(3000);
      expect(plugin.queries[1]?.budgetMs).toBeLessThanOrEqual(1400);
      expect(result.sourceMetrics[0]).toMatchObject({
        sourceKey: "timed-variant",
        timedOut: true,
      });
      expect(result.sourceMetrics[0]?.latencyMs).toBeLessThanOrEqual(3000);
    } finally {
      vi.useRealTimers();
    }
  });

  it("merges variant query results when exact plugin results are sparse", async () => {
    const service = createService(new VariantMergePlugin("variant", 1));

    const result = await service.searchWithWarnings(
      "肖申克的救赎",
      [],
      1,
      false,
      "merged_by_type",
      "plugin",
      ["variant"],
      undefined,
      {}
    );

    expect(result.response.total).toBe(2);
    expect(result.warnings).toEqual([]);
  });

  it("keeps broad matches and keyword variants in fuzzy mode", async () => {
    const plugin = new MatchModePlugin("match", 1);
    const service = createService(plugin);

    const result = await service.searchWithWarnings(
      "肖申克的救赎",
      [],
      1,
      false,
      "merged_by_type",
      "plugin",
      ["match"],
      undefined,
      {}
    );

    expect(result.response.total).toBe(2);
    expect(plugin.queries.length).toBeGreaterThan(1);
  });

  it("keeps relevant alias magnets and drops scattered keyword noise", async () => {
    const plugin = new AliasMagnetPlugin("alias-magnet", 1);
    const service = createService(plugin);

    const result = await service.searchWithWarnings(
      "三体",
      [],
      1,
      false,
      "merged_by_type",
      "plugin",
      ["alias-magnet"],
      undefined,
      {}
    );

    expect(result.response.merged_by_type?.magnet).toHaveLength(1);
    expect(result.response.merged_by_type?.magnet?.[0]?.note).toContain(
      "Three Body Problem"
    );
    expect(plugin.queries[0]).toBe("three body");
  });

  it("limits a degraded source to the original query", async () => {
    const plugin = new MatchModePlugin("match", 1);
    const service = createService(plugin);

    await service.searchWithWarnings(
      "肖申克的救赎",
      [],
      1,
      false,
      "merged_by_type",
      "plugin",
      ["match"],
      undefined,
      {
        __source_quality_policies: {
          match: { score: 30, state: "degraded", maxVariants: 1, timeoutMs: 4000 },
        },
      }
    );

    expect(plugin.queries).toEqual(["肖申克的救赎"]);
  });

  it("skips disabled sources by default but honors explicit selection", async () => {
    const plugin = new MatchModePlugin("match", 1);
    const service = createService(plugin);
    const ext = {
      __source_quality_policies: {
        match: { score: 10, state: "disabled", maxVariants: 1 },
      },
    };

    const automatic = await service.searchWithWarnings(
      "肖申克的救赎",
      [],
      1,
      false,
      "merged_by_type",
      "plugin",
      undefined,
      undefined,
      ext
    );
    expect(automatic.response.total).toBe(0);
    expect(plugin.queries).toEqual([]);

    const explicit = await service.searchWithWarnings(
      "肖申克的救赎",
      [],
      1,
      false,
      "merged_by_type",
      "plugin",
      ["match"],
      undefined,
      ext
    );
    expect(explicit.response.total).toBeGreaterThan(0);
  });

  it("uses only the original query and removes partial matches in exact mode", async () => {
    const plugin = new MatchModePlugin("match", 1);
    const service = createService(plugin);

    const result = await service.searchWithWarnings(
      "肖申克的救赎",
      [],
      1,
      false,
      "merged_by_type",
      "plugin",
      ["match"],
      undefined,
      {},
      undefined,
      "exact"
    );

    expect(result.response.total).toBe(1);
    expect(result.response.merged_by_type?.quark?.[0]?.url).toBe(
      "https://example.com/match-exact"
    );
    expect(plugin.queries).toEqual(["肖申克的救赎"]);
  });

  it("sorts newest-first and puts missing-datetime entries last (no NaN breakage)", () => {
    const service = createService(new EmptyPlugin("empty", 1));
    const results: { title: string; datetime: string }[] = [
      { title: "no-date", datetime: "" },
      { title: "old", datetime: "2020-01-01T00:00:00.000Z" },
      { title: "new", datetime: "2026-06-01T00:00:00.000Z" },
    ];

    (service as any).sortResultsByTimeDesc(results);

    // 有日期的按时间倒序，无日期的排到最后，比较器不能产生 NaN
    expect(results.map((r) => r.title)).toEqual(["new", "old", "no-date"]);
  });
});
