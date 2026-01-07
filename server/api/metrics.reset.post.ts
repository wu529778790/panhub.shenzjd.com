/**
 * POST /api/metrics/reset
 *
 * 重置监控指标
 *
 * 需要管理员权限
 */

import { defineEventHandler, readBody } from 'h3';
import { metrics } from '../core/monitoring/metrics';
import { AppError } from '../core/errors/app-error';
import { handleError, createErrorResponse } from '../core/utils/error-handler';

export default defineEventHandler(async (event) => {
  try {
    // 验证管理员权限
    const body = await readBody(event);
    const token = body?.token;

    const runtimeConfig = useRuntimeConfig();
    const adminToken = runtimeConfig.adminToken;

    if (adminToken && token !== adminToken) {
      throw AppError.unauthorized('UNAUTHORIZED', '需要有效的访问令牌');
    }

    // 重置指标
    metrics.resetAllMetrics();

    return {
      code: 0,
      message: '指标已重置',
      data: {
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    const appError = handleError(error);
    return createErrorResponse(appError);
  }
});
