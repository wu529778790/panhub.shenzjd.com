import { defineEventHandler, readBody, sendError } from 'h3';
import { getOrCreateHotSearchSQLiteService } from '../core/services/hotSearchSQLite';
import { HotSearchRecordSchema } from '../core/types/search';
import { AppError } from '../core/errors/app-error';
import { handleError, createErrorResponse } from '../core/utils/error-handler';
import { MESSAGES } from '../core/constants';

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);

    // 使用 Zod Schema 验证请求体
    const validationResult = HotSearchRecordSchema.safeParse(body);

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

    const { term } = validationResult.data;

    const service = getOrCreateHotSearchSQLiteService();
    await service.recordSearch(term);

    return {
      code: 0,
      message: MESSAGES.SUCCESS,
      data: null,
    };
  } catch (error) {
    const appError = handleError(error);
    return sendError(event, createErrorResponse(appError));
  }
});
