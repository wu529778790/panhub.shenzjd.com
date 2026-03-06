import { defineEventHandler, getQuery, sendError, createError } from "h3";
import { getOrCreateSearchService } from "../core/services";
import type { GenericResponse, SearchRequest } from "../core/types/models";

function parseList(val: string | undefined): string[] | undefined {
  if (!val) return undefined;
  const parts = val
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length ? parts : undefined;
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const service = getOrCreateSearchService(config);
  const q = getQuery(event);

  const kw = ((q.kw as string) || "").trim();
  if (!kw) {
    return sendError(
      event,
      createError({ statusCode: 400, statusMessage: "kw is required" })
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
            statusMessage: "invalid ext json: " + e?.message,
          })
        );
      }
    }
  }

  const req: SearchRequest = {
    kw,
    channels: parseList(q.channels as string | undefined),
    conc: q.conc ? parseInt(String(q.conc), 10) : undefined,
    refresh: String(q.refresh).trim() === "true",
    res: (q.res as any) || "merged_by_type",
    src: (q.src as any) || "all",
    plugins: parseList(q.plugins as string | undefined),
    cloud_types: parseList(q.cloud_types as string | undefined),
    ext,
  };

  // 互斥逻辑
  if (req.src === "tg") req.plugins = undefined;
  else if (req.src === "plugin") req.channels = undefined;
  if (!req.res || req.res === "merge") req.res = "merged_by_type";

  const result = await service.search(
    req.kw,
    req.channels,
    req.conc,
    !!req.refresh,
    req.res,
    req.src,
    req.plugins,
    req.cloud_types,
    req.ext || {}
  );

  const resp: GenericResponse<typeof result> = {
    code: 0,
    message: warnings.length > 0 ? "partial_success" : "success",
    data: result,
  };
  
  // 获取警告信息
  const warnings = service.getWarnings();
  
  // 如果有警告，添加到响应中
  if (warnings.length > 0) {
    (resp as any).warnings = warnings;
    resp.message = "partial_success";
  }
  };
  return resp;
});
