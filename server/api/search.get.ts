import { defineEventHandler, getQuery, sendError, readBody } from "h3";
import { getOrCreateSearchService } from "../core/services";
import { SearchRequestSchema, type SearchRequest } from "../core/types/search";
import type { GenericResponse } from "../core/types/models";
import { AppError } from "../core/errors/app-error";
import { handleError, createErrorResponse } from "../core/utils/error-handler";
import { MESSAGES } from "../core/constants";

export default defineEventHandler(async (event) => {
  try {
    // 支持测试环境（无 Nuxt 上下文）
    let config: any;
    try {
      config = useRuntimeConfig();
    } catch {
      // 测试环境使用默认配置
      config = {
        priorityChannels: [],
        defaultChannels: [],
        defaultConcurrency: 10,
        pluginTimeoutMs: 15000,
        cacheEnabled: true,
        cacheTtlMinutes: 30,
      };
    }
    const service = getOrCreateSearchService(config);
    const query = getQuery(event);

    // 支持 GET 查询参数和 POST 请求体
    let bodyParams: any = {};
    try {
      // 尝试读取请求体（仅对 POST/PUT 等方法）
      if (event.node.req.method !== 'GET') {
        bodyParams = await readBody(event);
      }
    } catch {
      // 忽略读取 body 的错误
    }

    // 合并 query 和 body 参数（body 优先）
    const params = {
      kw: bodyParams.kw || query.kw,
      conc: bodyParams.conc || query.conc,
      channels: bodyParams.channels || query.channels,
      refresh: bodyParams.refresh || query.refresh,
      res: bodyParams.res || query.res,
      src: bodyParams.src || query.src,
      plugins: bodyParams.plugins || query.plugins,
      cloud_types: bodyParams.cloud_types || query.cloud_types,
      ext: bodyParams.ext || query.ext,
    };

    // 使用 Zod Schema 验证和转换参数
    const validationResult = SearchRequestSchema.safeParse({
      kw: params.kw,
      conc: params.conc ? Number(params.conc) : undefined,
      channels: params.channels,
      refresh: params.refresh,
      res: params.res,
      src: params.src,
      plugins: params.plugins,
      cloud_types: params.cloud_types,
      ext: params.ext,
    });

    // 验证失败，返回详细错误信息
    if (!validationResult.success) {
      throw AppError.badRequest(
        'VALIDATION_ERROR',
        '参数验证失败',
        validationResult.error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }))
      );
    }

    const req: SearchRequest = validationResult.data;

    // 互斥逻辑（保持原有逻辑）
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
      message: MESSAGES.SUCCESS,
      data: result,
    };
    return resp;
  } catch (error) {
    const appError = handleError(error);
    // h3 的 sendError 会自动设置状态码，但我们需要传递正确的错误对象
    // 我们需要手动设置响应状态码和返回格式
    event.node.res.statusCode = appError.statusCode;
    return createErrorResponse(appError);
  }
});
