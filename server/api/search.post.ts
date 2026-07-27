import { defineEventHandler, readBody, sendError, createError } from "h3";

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

export default defineEventHandler(async (event) => {
  const requestStartedAt = Date.now();
  const config = useRuntimeConfig();
  const service = getOrCreateSearchService(config);
  const healthDatabase = getLinkHealthDatabase(event);
  const body = (await readBody<SearchRequest>(event)) || ({} as SearchRequest);

  const kw = (body.kw || "").trim();
  if (!kw) {
    return sendError(
      event,
      createError({ statusCode: 400, statusMessage: "kw is required" })
    );
  }

  const parseList = (val: any): string[] | undefined => {
    if (Array.isArray(val)) {
      return val.filter((s) => typeof s === "string" && s.trim());
    }
    if (typeof val === "string") {
      return val
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
    return undefined;
  };

  body.channels = parseList((body as any).channels);
  body.plugins = parseList((body as any).plugins);
  body.cloud_types = parseList((body as any).cloud_types);

  if (!body.res || body.res === "merge") body.res = "merged_by_type";
  if (!body.src) body.src = "all";
  body.match = body.match === "exact" ? "exact" : "fuzzy";
  if (body.src === "tg") body.plugins = undefined;
  else if (body.src === "plugin") body.channels = undefined;
  const sourcePolicies = await getSourceQualityPolicies(healthDatabase).catch(
    () => ({})
  );

  const signal = getClientAbortSignal(event);

  const {
    response: searchResult,
    warnings,
    sourceMetrics,
  } = await service.searchWithWarnings(
    kw,
    body.channels,
    body.conc,
    !!body.refresh,
    body.res,
    body.src,
    body.plugins,
    body.cloud_types,
    attachCloudflareBindings(event, {
      ...(body.ext || {}),
      __source_quality_policies: sourcePolicies,
    }),
    signal,
    body.match
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
            body.src === "tg"
              ? "tg"
              : body.plugins?.length === 1
                ? body.plugins[0]!
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
