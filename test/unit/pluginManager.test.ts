/**
 * 插件管理器单元测试
 */

import { describe, it, expect, beforeEach } from "vitest";
import { BaseAsyncPlugin, PluginManager } from "../../server/core/plugins/manager";
import type { SearchResult } from "../../server/core/types/models";

// 测试插件类
class TestPlugin1 extends BaseAsyncPlugin {
  constructor() {
    super("test1", 3);
  }

  async search(keyword: string): Promise<SearchResult[]> {
    return [
      {
        message_id: "test1-1",
        unique_id: "test1-1",
        channel: "test1",
        datetime: new Date().toISOString(),
        title: `Test1: ${keyword}`,
        content: "Test content 1",
        links: [{ type: "baidu", url: "https://pan.baidu.com/test1", password: "" }],
      },
    ];
  }
}

class TestPlugin2 extends BaseAsyncPlugin {
  constructor() {
    super("test2", 1);
  }

  async search(keyword: string): Promise<SearchResult[]> {
    return [
      {
        message_id: "test2-1",
        unique_id: "test2-1",
        channel: "test2",
        datetime: new Date().toISOString(),
        title: `Test2: ${keyword}`,
        content: "Test content 2",
        links: [{ type: "aliyun", url: "https://alipan.com/test2", password: "" }],
      },
    ];
  }
}

describe("BaseAsyncPlugin", () => {
  it("应该正确返回插件名称和优先级", () => {
    const plugin = new TestPlugin1();
    expect(plugin.name()).toBe("test1");
    expect(plugin.priority()).toBe(3);
  });

  it("应该正确设置缓存键和关键词", () => {
    const plugin = new TestPlugin1();
    plugin.setMainCacheKey("cache-key");
    plugin.setCurrentKeyword("test-keyword");
    expect(plugin["mainCacheKey"]).toBe("cache-key");
    expect(plugin["currentKeyword"]).toBe("test-keyword");
  });

  it("默认应该不跳过服务过滤", () => {
    const plugin = new TestPlugin1();
    expect(plugin.skipServiceFilter()).toBe(false);
  });

  it("默认搜索应该返回空数组", async () => {
    const basePlugin = new BaseAsyncPlugin("base", 1);
    await expect(basePlugin.search("test")).resolves.toEqual([]);
  });
});

describe("PluginManager", () => {
  let manager: PluginManager;

  beforeEach(() => {
    manager = new PluginManager();
  });

  it("应该正确注册插件", () => {
    const plugin = new TestPlugin1();
    manager.registerPlugin(plugin);
    const plugins = manager.getPlugins();
    expect(plugins).toHaveLength(1);
    expect(plugins[0].name()).toBe("test1");
  });

  it("应该返回所有已注册插件", () => {
    const plugin1 = new TestPlugin1();
    const plugin2 = new TestPlugin2();
    manager.registerPlugin(plugin1);
    manager.registerPlugin(plugin2);
    const plugins = manager.getPlugins();
    expect(plugins).toHaveLength(2);
  });

  it("应该按优先级排序插件", () => {
    const plugin1 = new TestPlugin1(); // priority 3
    const plugin2 = new TestPlugin2(); // priority 1
    manager.registerPlugin(plugin1);
    manager.registerPlugin(plugin2);
    const plugins = manager.getPlugins();

    // 优先级数字越小越靠前
    expect(plugins[0].name()).toBe("test2");
    expect(plugins[1].name()).toBe("test1");
  });

  it("应该能获取指定名称的插件", () => {
    const plugin1 = new TestPlugin1();
    const plugin2 = new TestPlugin2();
    manager.registerPlugin(plugin1);
    manager.registerPlugin(plugin2);

    expect(manager.getPlugin("test1")).toBe(plugin1);
    expect(manager.getPlugin("test2")).toBe(plugin2);
    expect(manager.getPlugin("nonexistent")).toBeUndefined();
  });

  it("应该正确返回插件数量", () => {
    expect(manager.size).toBe(0);

    manager.registerPlugin(new TestPlugin1());
    expect(manager.size).toBe(1);

    manager.registerPlugin(new TestPlugin2());
    expect(manager.size).toBe(2);
  });

  it("应该能清空所有插件", () => {
    manager.registerPlugin(new TestPlugin1());
    manager.registerPlugin(new TestPlugin2());
    expect(manager.size).toBe(2);

    manager.clear();
    expect(manager.size).toBe(0);
    expect(manager.getPlugins()).toEqual([]);
  });

  it("应该正确批量注册插件", () => {
    const plugins = [new TestPlugin1(), new TestPlugin2()];
    manager.registerPlugins(plugins);

    expect(manager.size).toBe(2);
    expect(manager.getPlugin("test1")).toBe(plugins[0]);
    expect(manager.getPlugin("test2")).toBe(plugins[1]);
  });

  it("应该处理空值注册", () => {
    manager.registerPlugin(null as any);
    manager.registerPlugin(undefined as any);
    expect(manager.size).toBe(0);
  });
});
