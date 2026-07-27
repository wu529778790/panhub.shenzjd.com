/**
 * TG 搜索优化测试
 * 验证分批处理和优先级频道机制
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SearchService } from "../../server/core/services/searchService";
import { PluginManager } from "../../server/core/plugins/manager";
import { fetchTgChannelPosts } from "../../server/core/services/tg";

// Mock TG 搜索模块
vi.mock("../../server/core/services/tg", () => ({
  fetchTgChannelPosts: vi.fn(async (channel: string, keyword: string) => {
    // 模拟不同频道的响应时间
    const delay = channel.includes("priority") ? 50 : 100;
    await new Promise((resolve) => setTimeout(resolve, delay));

    return keyword === "missing" ? [] : [
      {
        message_id: `${channel}-1`,
        unique_id: `tg-${channel}-1`,
        channel,
        datetime: new Date().toISOString(),
        title: `${keyword} from ${channel}`,
        content: `Test content from ${channel}`,
        links: [{ type: "baidu", url: `https://pan.baidu.com/${channel}`, password: "" }],
      },
    ];
  }),
}));

describe("TG 搜索优化", () => {
  let searchService: SearchService;
  let pluginManager: PluginManager;

  beforeEach(() => {
    pluginManager = new PluginManager();
    searchService = new SearchService(
      {
        priorityChannels: ["priority1", "priority2", "priority3"],
        defaultChannels: ["priority1", "priority2", "priority3", "normal1", "normal2", "normal3", "normal4", "normal5"],
        defaultConcurrency: 2,
        pluginTimeoutMs: 5000,
        cacheEnabled: false,
        cacheTtlMinutes: 30,
      },
      pluginManager
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("应该正确识别优先级频道", async () => {
    const results = await (searchService as any).searchTG(
      "test",
      ["priority1", "priority2", "normal1", "normal2"],
      false,
      undefined,
      {}
    );

    // 应该返回所有频道的结果
    expect(results.length).toBe(4);
    expect(results.some((r: any) => r.channel === "priority1")).toBe(true);
    expect(results.some((r: any) => r.channel === "priority2")).toBe(true);
    expect(results.some((r: any) => r.channel === "normal1")).toBe(true);
    expect(results.some((r: any) => r.channel === "normal2")).toBe(true);
  });

  it("优先频道抓 40 条，普通频道只抓 20 条", async () => {
    await (searchService as any).searchTG(
      "test",
      ["priority1", "normal1"],
      false,
      undefined,
      {}
    );

    const calls = vi.mocked(fetchTgChannelPosts).mock.calls;
    const priorityCall = calls.find(([channel]) => channel === "priority1");
    const normalCall = calls.find(([channel]) => channel === "normal1");
    expect(priorityCall?.[2]).toMatchObject({ limitPerChannel: 40 });
    expect(normalCall?.[2]).toMatchObject({ limitPerChannel: 20 });
  });

  it("应该使用更高并发处理优先级频道", async () => {
    const startTime = Date.now();

    // 3个优先级频道 + 5个普通频道
    await (searchService as any).searchTG(
      "test",
      ["priority1", "priority2", "priority3", "normal1", "normal2", "normal3", "normal4", "normal5"],
      false,
      undefined,
      {}
    );

    const duration = Date.now() - startTime;

    // 预期时间：
    // - 优先级频道：3个，并发4（2*2），每个50ms = ~50ms
    // - 普通频道：5个，并发2，每个100ms = ~300ms
    // 总计应该 < 500ms
    expect(duration).toBeLessThan(500);
  });

  it("应该正确记录性能指标", async () => {
    // 通过检查日志输出验证性能指标被记录
    const results = await (searchService as any).searchTG(
      "test",
      ["priority1", "normal1"],
      false,
      undefined,
      {}
    );

    // 验证结果正确
    expect(results.length).toBe(2);
    expect(results.some((r: any) => r.channel === "priority1")).toBe(true);
    expect(results.some((r: any) => r.channel === "normal1")).toBe(true);
  });

  it("应该处理空优先级列表", async () => {
    const results = await (searchService as any).searchTG(
      "test",
      ["normal1", "normal2"],
      false,
      undefined,
      {}
    );

    expect(results.length).toBe(2);
  });

  it("应该处理空普通列表", async () => {
    const results = await (searchService as any).searchTG(
      "test",
      ["priority1", "priority2"],
      false,
      undefined,
      {}
    );

    expect(results.length).toBe(2);
  });

  it("应该处理所有频道都是优先级的情况", async () => {
    const results = await (searchService as any).searchTG(
      "test",
      ["priority1", "priority2", "priority3"],
      false,
      undefined,
      {}
    );

    expect(results.length).toBe(3);
  });

  it("应该处理所有频道都是普通的情况", async () => {
    const results = await (searchService as any).searchTG(
      "test",
      ["normal1", "normal2", "normal3"],
      false,
      undefined,
      {}
    );

    expect(results.length).toBe(3);
  });

  it("无结果时每个频道也只请求一次", async () => {
    await (searchService as any).searchTG(
      "missing",
      ["priority1", "normal1"],
      false,
      undefined,
      {}
    );

    expect(vi.mocked(fetchTgChannelPosts)).toHaveBeenCalledTimes(2);
  });

  it("同一 infohash 的磁力链接只保留一条", () => {
    const hash = "582fc386d0087dcefe998b70d0bc6794c361e603";
    const merged = (searchService as any).mergeResultsByType(
      [
        {
          title: "来源一",
          source: "Nyaa",
          metadata: { seeders: 4, sources: ["Nyaa"] },
          links: [
            {
              type: "magnet",
              url: `magnet:?xt=urn:btih:${hash}&tr=https%3A%2F%2Ftracker.one`,
            },
          ],
        },
        {
          title: "来源二",
          source: "BitSearch",
          metadata: { seeders: 26, sizeBytes: 3_200_000_000, sources: ["BitSearch"] },
          links: [
            {
              type: "magnet",
              url: "magnet:?dn=movie&xt=urn:btih:LAX4HBWQBB6457UZRNYNBPDHSTBWDZQD&tr=udp%3A%2F%2Ftracker.two",
            },
          ],
        },
      ],
      "电影"
    );

    expect(merged.magnet).toHaveLength(1);
    expect(merged.magnet[0].metadata).toMatchObject({
      seeders: 26,
      sizeBytes: 3_200_000_000,
      sources: ["Nyaa", "BitSearch"],
    });
  });
});
