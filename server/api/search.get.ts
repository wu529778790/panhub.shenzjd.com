import { defineEventHandler, getQuery, sendError, createError } from "h3";

/** 从 H3 event 中提取客户端断开信号（兼容 h3 无 getAbortSignal 的版本） */
function getClientAbortSignal(event: any): AbortSignal | undefined {
  // 优先使用 h3 原生能力（若未来版本支持）
  if (typeof event._signal === "object" && event._signal instanceof AbortSignal) {
    return event._signal;
  }
  // 回退：监听 node req 的 close 事件
  const req = event.node?.req;
  if (req && typeof req.on === "function") {
    const controller = new AbortController();
    req.on("close", () => {
      if (req.destroyed || req.writableEnded === false && req.readableEnded) {
        controller.abort();
      }
    });
    return controller.signal;
  }
  return undefined;
}
import { getOrCreateSearchService } from "../core/services";
import { registerSearchLinksForAutomaticCheck } from "../core/services/automaticLinkHealthService";
import {
  getSourceQualityPolicies,
  recordSourcePerformance,
} from "../core/services/searchQualityService";
import { filterKnownDeadSearchLinks } from "../core/services/searchLinkHealth";
import { evaluateMergedSearchResponse } from "../core/services/searchRanking";
import type { GenericResponse, SearchRequest } from "../core/types/models";
import {
  attachCloudflareBindings,
  deferCloudflareTask,
  getLinkHealthDatabase,
} from "../utils/cloudflareBindings";

function parseList(val: string | undefined): string[] | undefined {
  if (!val) return undefined;
  const parts = val
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length ? parts : undefined;
}

export default defineEventHandler(async (event) => {
  const requestStartedAt = Date.now();
  const config = useRuntimeConfig();
  const service = getOrCreateSearchService(config);
  const q = getQuery(event);
  const healthDatabase = getLinkHealthDatabase(event);

  const kw = ((q.kw as string) || "").trim();
  if (!kw) {
    return sendError(
      event,
      createError({ statusCode: 400, statusMessage: "kw is required" })
    );
  }
  if (kw.length > 200) {
    return sendError(
      event,
      createError({ statusCode: 400, statusMessage: "kw too long (max 200)" })
    );
  }

  let ext: Record<string, any> | undefined;
  const extStr = (q.ext as string | undefined)?.trim();
  if (extStr) {
    if (extStr === "{}") ext = {};
    else {
      try {
        ext = JSON.parse(extStr);
      } catch (e: any) {
        return sendError(
          event,
          createError({
            statusCode: 400,
            statusMessage: "invalid ext json",
          })
        );
      }
    }
  }
  const sourcePolicies = await getSourceQualityPolicies(healthDatabase).catch(
    () => ({})
  );

  const req: SearchRequest = {
    kw,
    channels: parseList(q.channels as string | undefined),
    conc: (() => {
      const n = q.conc ? parseInt(String(q.conc), 10) : NaN;
      return Number.isFinite(n) && n >= 1 && n <= 16 ? n : undefined;
    })(),
    refresh: String(q.refresh).trim() === "true",
    match: String(q.match).trim() === "exact" ? "exact" : "fuzzy",
    res: (q.res as any) || "merged_by_type",
    src: (q.src as any) || "all",
    plugins: parseList(q.plugins as string | undefined),
    cloud_types: parseList(q.cloud_types as string | undefined),
    ext: attachCloudflareBindings(event, {
      ...(ext || {}),
      __source_quality_policies: sourcePolicies,
    }),
  };

  if (req.src === "tg") req.plugins = undefined;
  else if (req.src === "plugin") req.channels = undefined;
  if (!req.res || req.res === "merge") req.res = "merged_by_type";

  const signal = getClientAbortSignal(event);

  const {
    response: searchResult,
    warnings,
    sourceMetrics,
  } = await service.searchWithWarnings(
    req.kw,
    req.channels,
    req.conc,
    !!req.refresh,
    req.res,
    req.src,
    req.plugins,
    req.cloud_types,
    req.ext || {},
    signal,
    req.match
  );

  let result = searchResult;
  try {
    result = (
      await filterKnownDeadSearchLinks(healthDatabase, searchResult)
    ).response;
  } catch {
    // 健康库不可用时仍返回搜索结果，不能让过滤逻辑阻断搜索。
  }
  result = evaluateMergedSearchResponse(result, kw);

  const registration = registerSearchLinksForAutomaticCheck(
    healthDatabase,
    searchResult
  ).catch(() => 0);
  if (!deferCloudflareTask(event, registration)) await registration;

  const observations = sourceMetrics.length
    ? sourceMetrics
    : [
        {
          sourceKey:
            req.src === "tg"
              ? "tg"
              : req.plugins?.length === 1
                ? req.plugins[0]!
                : "aggregate",
          resultCount: result.total,
          uniqueResultCount: result.total,
          duplicateCount: 0,
          latencyMs: Date.now() - requestStartedAt,
          success: warnings.length === 0,
          timedOut: false,
          cached: false,
        },
      ];
  const sourceMetric = Promise.all(
    observations.map((observation) =>
      recordSourcePerformance(healthDatabase, observation)
    )
  ).catch(() => undefined);
  if (!deferCloudflareTask(event, sourceMetric)) await sourceMetric;

  const resp: GenericResponse<typeof result> = {
    code: 0,
    message: warnings.length > 0 ? "partial_success" : "success",
    data: result,
  };

  if (warnings.length > 0) {
    (resp as any).warnings = warnings;
  }

  return resp;
});
