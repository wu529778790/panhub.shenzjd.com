import { MagnetIndexPlugin } from "../../../server/core/plugins/magnetIndex";
import { NyaaPlugin } from "../../../server/core/plugins/nyaa";
import { SolidTorrentsPlugin } from "../../../server/core/plugins/solidtorrents";
import {
  listRecentMagnetCacheQueries,
  pruneMagnetSearchCache,
} from "../../../server/core/services/magnetSearchCache";
import type { D1DatabaseLike } from "../../../server/utils/cloudflareBindings";

export interface MagnetCacheSyncEnv {
  RESOURCE_DB: D1DatabaseLike;
}

const PLUGIN_FACTORIES = new Map([
  ["磁力索引", () => new MagnetIndexPlugin()],
  ["nyaa", () => new NyaaPlugin()],
  ["solidtorrents", () => new SolidTorrentsPlugin()],
]);

export async function syncMagnetSearchCache(
  env: MagnetCacheSyncEnv
): Promise<{
  status: "success";
  refreshed: number;
  resultCount: number;
}> {
  const entries = await listRecentMagnetCacheQueries(env.RESOURCE_DB, 8);
  let nextIndex = 0;
  let refreshed = 0;
  let resultCount = 0;

  async function worker(): Promise<void> {
    while (nextIndex < entries.length) {
      const entry = entries[nextIndex++];
      if (!entry) continue;
      const createPlugin = PLUGIN_FACTORIES.get(entry.sourceKey);
      if (!createPlugin) continue;
      const results = await createPlugin()
        .search(entry.query, {
          __resource_database: env.RESOURCE_DB,
          __force_magnet_refresh: true,
          __plugin_timeout_ms: 6000,
        })
        .catch(() => []);
      refreshed += 1;
      resultCount += results.length;
    }
  }

  await Promise.all([worker(), worker()]);
  await pruneMagnetSearchCache(env.RESOURCE_DB);
  return { status: "success", refreshed, resultCount };
}
