import { defineEventHandler, readBody, sendError } from "h3";
import { getOrCreateSearchService } from "../core/services";
import { SearchRequestSchema, type SearchRequest } from "../core/types/search";
import type { GenericResponse } from "../core/types/models";
import { AppError } from "../core/errors/app-error";
import { handleError, createErrorResponse } from "../core/utils/error-handler";
import { MESSAGES } from "../core/constants";

export default defineEventHandler(async (event) => {
  try {
    const config = useRuntimeConfig();
    const service = getOrCreateSearchService(config);
    const body = await readBody(event);

    // 使用 Zod Schema 验证请求体
    const validationResult = SearchRequestSchema.safeParse(body);

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

    // 规范化入参：支持字符串与数组两种形式（兼容原有逻辑）
    const parseList = (val: any): string[] | undefined => {
      if (Array.isArray(val))
        return val.filter((s) => typeof s === "string" && s.trim());
      if (typeof val === "string")
        return val
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
      return undefined;
    };

    // 如果传入的是字符串，转换为数组
    req.channels = parseList(req.channels);
    req.plugins = parseList(req.plugins);
    req.cloud_types = parseList(req.cloud_types);

    // 互斥逻辑
    if (req.src === "tg") req.plugins = undefined;
    else if (req.src === "plugin") req.channels = undefined;

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
    return sendError(event, createErrorResponse(appError));
  }
});
