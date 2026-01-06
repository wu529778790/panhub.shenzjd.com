import { defineEventHandler, getQuery, sendError } from 'h3';
import { getOrCreateHotSearchSQLiteService } from '../core/services/hotSearchSQLite';
import { GetHotSearchesSchema } from '../core/types/hot-search';
import { AppError } from '../core/errors/app-error';
import { handleError, createErrorResponse } from '../core/utils/error-handler';
import { MESSAGES, HOT_SEARCH } from '../core/constants';

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event);

    // 使用 Zod Schema 验证查询参数
    const validationResult = GetHotSearchesSchema.safeParse({
      limit: query.limit ? Number(query.limit) : undefined,
    });

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

    const { limit = HOT_SEARCH.DEFAULT_LIMIT } = validationResult.data;
    const service = getOrCreateHotSearchSQLiteService();

    console.log(`[GET /api/hot-searches] 请求 limit=${limit}`);
    const hotSearches = await service.getHotSearches(limit);
    console.log(`[GET /api/hot-searches] 返回 ${hotSearches.length} 条:`, hotSearches.map(s => `${s.term}(score:${s.score})`).join(', '));

    return {
      code: 0,
      message: MESSAGES.SUCCESS,
      data: {
        hotSearches,
      },
    };
  } catch (error) {
    const appError = handleError(error);
    event.node.res.statusCode = appError.statusCode;
    return createErrorResponse(appError);
  }
});
