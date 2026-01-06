import { executeBatchSearch } from './request';
import { mergeMergedByType } from './merger';
import type { SearchOptions, SearchContext } from './types';
import type { MergedLinks } from "~/server/core/types/models";

/**
 * 执行快速搜索（第一批）
 */
export async function performFastSearch(
  options: SearchOptions,
  context: SearchContext
): Promise<MergedLinks> {
  const { apiBase, keyword, settings } = options;
  const { activeControllers } = context;

  const conc = Math.min(16, Math.max(1, Number(settings.concurrency || 3)));
  const batchSize = conc;

  // 插件批次
  const fastPlugins = settings.enabledPlugins.slice(0, conc);
  // TG 频道批次
  const fastTg = settings.enabledTgChannels.slice(0, batchSize);

  const batchParams: Array<Record<string, any>> = [];

  // 插件请求参数
  if (fastPlugins.length > 0) {
    batchParams.push({
      kw: keyword,
      res: "merged_by_type",
      src: "plugin",
      plugins: fastPlugins.join(","),
      conc: conc,
      ext: JSON.stringify({ __plugin_timeout_ms: settings.pluginTimeoutMs }),
    });
  }

  // TG 频道请求参数
  if (fastTg.length > 0) {
    batchParams.push({
      kw: keyword,
      res: "merged_by_type",
      src: "tg",
      channels: fastTg.join(","),
      conc: conc,
      ext: JSON.stringify({ __plugin_timeout_ms: settings.pluginTimeoutMs }),
    });
  }

  if (batchParams.length === 0) return {};

  const results = await executeBatchSearch(
    `${apiBase}/search`,
    batchParams,
    activeControllers
  );

  let merged: MergedLinks = {};
  for (const r of results) {
    if (r?.merged_by_type) {
      merged = mergeMergedByType(merged, r.merged_by_type);
    }
  }
  return merged;
}

/**
 * 执行深度搜索（后续批次）
 */
export async function performDeepSearch(
  options: SearchOptions,
  context: SearchContext
): Promise<void> {
  const { apiBase, keyword, settings } = options;
  const { state, searchSeq, activeControllers } = context;

  const conc = Math.min(16, Math.max(1, Number(settings.concurrency || 3)));
  const batchSize = conc;

  // 剩余插件
  const restPlugins = settings.enabledPlugins.slice(conc);
  const pluginBatches: string[][] = [];
  for (let i = 0; i < restPlugins.length; i += batchSize) {
    pluginBatches.push(restPlugins.slice(i, i + batchSize));
  }

  // 剩余 TG 频道
  const restTg = settings.enabledTgChannels.slice(batchSize);
  const tgBatches: string[][] = [];
  for (let i = 0; i < restTg.length; i += batchSize) {
    tgBatches.push(restTg.slice(i, i + batchSize));
  }

  const maxLen = Math.max(pluginBatches.length, tgBatches.length);

  for (let i = 0; i < maxLen; i++) {
    if (searchSeq.value !== context.searchSeq.value) break;
    // 检查是否暂停
    if (state.value.paused) break;

    const batchParams: Array<Record<string, any>> = [];

    // 插件批次
    const pb = pluginBatches[i];
    if (pb && pb.length) {
      batchParams.push({
        kw: keyword,
        res: "merged_by_type",
        src: "plugin",
        plugins: pb.join(","),
        conc: conc,
        ext: JSON.stringify({ __plugin_timeout_ms: settings.pluginTimeoutMs }),
      });
    }

    // TG 批次
    const tb = tgBatches[i];
    if (tb && tb.length) {
      batchParams.push({
        kw: keyword,
        res: "merged_by_type",
        src: "tg",
        channels: tb.join(","),
        conc: conc,
        ext: JSON.stringify({ __plugin_timeout_ms: settings.pluginTimeoutMs }),
      });
    }

    if (batchParams.length === 0) continue;

    try {
      const resps = await executeBatchSearch(
        `${apiBase}/search`,
        batchParams,
        activeControllers
      );

      for (const r of resps) {
        if (!r || searchSeq.value !== context.searchSeq.value) continue;
        if (r.merged_by_type) {
          state.value.merged = mergeMergedByType(
            state.value.merged,
            r.merged_by_type
          );
        }
      }

      // 更新总数
      state.value.total = Object.values(state.value.merged).reduce(
        (sum, arr) => sum + (arr?.length || 0),
        0
      );
    } catch (error) {
      // 单批失败忽略
    }
  }
}
