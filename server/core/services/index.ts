import { SearchService, type SearchServiceOptions } from "./searchService";
import { PluginManager, registerGlobalPlugin } from "../plugins/manager";
// NOTE: 8 dead plugins removed on 2026-07-06 based on log analysis:
//   hunhepan   - 3 APIs all dead (504/414/404)
//   jikepan    - source down (CF 522)
//   labi       - domain expired
//   qupansou   - search upstream 502
//   duoduo     - Cloudflare JS challenge blocks all HTTP scraping
//   thepiratebay - mirror URL expired + anti-scrape
//   panta      - overseas IP unreachable (likely blocked)
//   xuexizhinan - small site offline
// See: data/panhub.shenzjd.com-20260706090537.log analysis
import { PansearchPlugin } from "../plugins/pansearch";
import { NyaaPlugin } from "../plugins/nyaa";
import { HaosouAggregatePlugin } from "../plugins/haosouAggregate";
import { SolidTorrentsPlugin } from "../plugins/solidtorrents";
import { ResourceCatalogPlugin } from "../plugins/resourceCatalog";
import { FastMediaPlugin } from "../plugins/fastMedia";
import { ResourceSupplementPlugin } from "../plugins/resourceSupplement";
import { MagnetIndexPlugin } from "../plugins/magnetIndex";
import { GlobalIndexPlugin } from "../plugins/globalIndex";
import { MediaDiscoveryPlugin } from "../plugins/mediaDiscovery";
import { OpenResourceIndexPlugin } from "../plugins/openResourceIndex";
import { NetworkResourceIndexPlugin } from "../plugins/networkResourceIndex";

const SERVICE_CONTEXT_KEY = "__panhub_search_service__";

/**
 * 创建插件管理器并注册所有可用插件
 */
function createPluginManager(): PluginManager {
  const pm = new PluginManager();
  // 仅注册稳定可用的插件
  registerGlobalPlugin(new PansearchPlugin());
  registerGlobalPlugin(new NyaaPlugin());
  registerGlobalPlugin(new SolidTorrentsPlugin());
  registerGlobalPlugin(new HaosouAggregatePlugin());
  registerGlobalPlugin(new ResourceCatalogPlugin());
  registerGlobalPlugin(new FastMediaPlugin());
  registerGlobalPlugin(new MediaDiscoveryPlugin());
  registerGlobalPlugin(new ResourceSupplementPlugin());
  registerGlobalPlugin(new MagnetIndexPlugin());
  registerGlobalPlugin(new GlobalIndexPlugin());
  registerGlobalPlugin(new OpenResourceIndexPlugin());
  registerGlobalPlugin(new NetworkResourceIndexPlugin());
  pm.registerAllGlobalPlugins();
  return pm;
}

/**
 * 创建搜索服务选项
 */
function createServiceOptions(runtimeConfig: any): SearchServiceOptions {
  return {
    priorityChannels: runtimeConfig.priorityChannels || [],
    defaultChannels: runtimeConfig.defaultChannels || [],
    defaultConcurrency: runtimeConfig.defaultConcurrency || 6,
    pluginTimeoutMs: runtimeConfig.pluginTimeoutMs || 4000,
    cacheEnabled: !!runtimeConfig.cacheEnabled,
    cacheTtlMinutes: runtimeConfig.cacheTtlMinutes || 30,
  };
}

/**
 * 获取或创建搜索服务实例
 * 使用 Nitro 上下文存储，支持测试时重置
 */
export function getOrCreateSearchService(runtimeConfig: any): SearchService {
  // 尝试从 Nitro 上下文获取
  const context = (globalThis as any)[SERVICE_CONTEXT_KEY];
  if (context?.service) {
    return context.service;
  }

  // 创建新实例
  const options = createServiceOptions(runtimeConfig);
  const pluginManager = createPluginManager();
  const service = new SearchService(options, pluginManager);

  // 存储到上下文
  (globalThis as any)[SERVICE_CONTEXT_KEY] = { service, options, pluginManager };
  return service;
}

/**
 * 重置搜索服务实例（仅用于测试）
 */
export function resetSearchService(): void {
  delete (globalThis as any)[SERVICE_CONTEXT_KEY];
}

/**
 * 获取搜索服务统计信息（用于监控）
 */
export function getSearchServiceStats(): { exists: boolean; options?: SearchServiceOptions } {
  const context = (globalThis as any)[SERVICE_CONTEXT_KEY];
  if (!context) {
    return { exists: false };
  }
  return {
    exists: true,
    options: context.options,
  };
}
