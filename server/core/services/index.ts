import { SearchService, type SearchServiceOptions } from "./searchService";
import { PluginManager } from "../plugins/manager";
import { HunhepanPlugin } from "../plugins/example/hunhepan";
// import { ZhizhenPlugin } from "../plugins/zhizhen";
// import { OugePlugin } from "../plugins/ouge";
// import { WanouPlugin } from "../plugins/wanou";
import { LabiPlugin } from "../plugins/labi";
import { PantaPlugin } from "../plugins/panta";
// import { SusuPlugin } from "../plugins/susu";
import { JikepanPlugin } from "../plugins/jikepan";
import { QupansouPlugin } from "../plugins/qupansou";
// import { Fox4kPlugin } from "../plugins/fox4k";
// import { Hdr4kPlugin } from "../plugins/hdr4k";
import { ThePirateBayPlugin } from "../plugins/thepiratebay";
import { DuoduoPlugin } from "../plugins/duoduo";
// import { MuouPlugin } from "../plugins/muou";
// import { Pan666Plugin } from "../plugins/pan666";
import { XuexizhinanPlugin } from "../plugins/xuexizhinan";
// import { HubanPlugin } from "../plugins/huban";
// import { PanyqPlugin } from "../plugins/panyq";
import { PansearchPlugin } from "../plugins/pansearch";
// import { ShandianPlugin } from "../plugins/shandian";
import { NyaaPlugin } from "../plugins/nyaa";
// import { SolidTorrentsPlugin } from "../plugins/solidtorrents";
// import { X1337xPlugin } from "../plugins/x1337x";
// import { TorrentGalaxyPlugin } from "../plugins/torrentgalaxy";

let singleton: SearchService | undefined;

/**
 * 创建插件管理器 - 使用依赖注入方式
 *
 * 重构说明：
 * - 移除全局注册表（registerGlobalPlugin）
 * - 直接创建插件实例并注入到 PluginManager
 * - 通过配置控制启用的插件
 */
export function createPluginManager(): PluginManager {
  const pm = new PluginManager();

  // 使用依赖注入方式注册插件
  pm.registerPlugins([
    new HunhepanPlugin(),
    new LabiPlugin(),
    new PantaPlugin(),
    new JikepanPlugin(),
    new QupansouPlugin(),
    new ThePirateBayPlugin(),
    new DuoduoPlugin(),
    new XuexizhinanPlugin(),
    new PansearchPlugin(),
    new NyaaPlugin(),
  ]);

  // 下线未通过单测的插件，待后续适配稳定后再恢复：
  // Zhizhen, Ouge, Wanou, Susu, Fox4k, Hdr4k, Muou, Pan666, Huban, Panyq, Shandian, SolidTorrents, 1337x, TorrentGalaxy

  return pm;
}

export function getOrCreateSearchService(runtimeConfig: any): SearchService {
  if (singleton) return singleton;
  const options: SearchServiceOptions = {
    priorityChannels: runtimeConfig.priorityChannels || [],
    defaultChannels: runtimeConfig.defaultChannels || [],
    defaultConcurrency: runtimeConfig.defaultConcurrency || 10,
    pluginTimeoutMs: runtimeConfig.pluginTimeoutMs || 15000,
    cacheEnabled: !!runtimeConfig.cacheEnabled,
    cacheTtlMinutes: runtimeConfig.cacheTtlMinutes || 30,
  };

  const pm = createPluginManager();

  singleton = new SearchService(options, pm);
  return singleton;
}
