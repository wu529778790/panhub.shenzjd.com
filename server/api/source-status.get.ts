import { defineEventHandler, setHeader } from "h3";
import { getOrCreateSearchService } from "../core/services";
import {
  friendlySourceName,
  getSearchQualitySummary,
} from "../core/services/searchQualityService";
import { getResourceDatabase } from "../utils/cloudflareBindings";

interface SyncRow {
  source_key: string;
  source_label: string;
  status: string;
  item_count: number;
  started_at: number;
  finished_at: number;
}

export default defineEventHandler(async (event) => {
  setHeader(event, "cache-control", "public, max-age=60");
  const database = getResourceDatabase(event);
  const live = getOrCreateSearchService(useRuntimeConfig(event))
    .getPluginHealthStatus()
    .map((source) => ({
      name: friendlySourceName(source.name),
      status: source.isHealthy ? "healthy" : "cooldown",
      averageLatencyMs: Math.round(source.avgResponseTime || 0),
      requestCount: source.successCount + source.failureCount,
      resultCount: 0,
      lastUpdatedAt: Math.max(source.lastSuccessTime || 0, source.lastFailureTime || 0),
    }));

  if (!database) {
    return { code: 0, message: "success", data: { sources: live } };
  }

  const [sync, metrics] = await Promise.all([
    database
      .prepare(
        `SELECT state.source_key, state.status, state.item_count,
                state.started_at, state.finished_at,
                COALESCE((
                  SELECT source_label FROM resource_catalog_sources catalog
                  WHERE catalog.source_key = state.source_key
                  ORDER BY updated_at DESC LIMIT 1
                ), '公开资料索引') AS source_label
         FROM resource_sync_state state
         ORDER BY state.source_key`
      )
      .all<SyncRow>()
      .catch(() => ({ results: [] })),
    getSearchQualitySummary(database, 1, false).catch(() => ({ sources: [] })),
  ]);
  const synced = (sync.results || []).map((source) => ({
    name: source.source_label || "公开资料索引",
    status:
      source.status === "success"
        ? "healthy"
        : source.status === "error"
          ? "degraded"
          : source.status,
    itemCount: Number(source.item_count || 0),
    averageLatencyMs: 0,
    requestCount: 0,
    resultCount: 0,
    lastUpdatedAt: Number(source.finished_at || source.started_at || 0),
  }));
  return {
    code: 0,
    message: "success",
    data: { sources: [...synced, ...metrics.sources, ...live] },
  };
});
