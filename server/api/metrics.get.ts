/**
 * GET /api/metrics
 *
 * 获取应用监控指标
 *
 * 需要管理员权限（通过 API 密钥或 token）
 */

import { metrics } from '../core/monitoring/metrics';
import { AppError } from '../core/errors/app-error';
import { handleError, createErrorResponse } from '../core/utils/error-handler';

export default defineEventHandler(async (event) => {
  try {
    // 简单的认证检查（生产环境应该使用更安全的认证方式）
    const query = getQuery(event);
    const token = query.token as string;

    // 如果配置了管理 token，需要验证
    const runtimeConfig = useRuntimeConfig();
    const adminToken = runtimeConfig.adminToken;

    if (adminToken && token !== adminToken) {
      throw AppError.unauthorized('UNAUTHORIZED', '需要有效的访问令牌');
    }

    // 获取所有指标
    const allMetrics = metrics.getAllMetrics();

    // 格式化响应
    return {
      code: 0,
      message: '成功',
      data: {
        ...allMetrics,
        summary: {
          api: metrics.getApiSummary(),
          search: metrics.getSearchSummary(),
          errors: metrics.getErrorSummary(),
          cache: metrics.getCacheSummary(),
        },
      },
    };
  } catch (error) {
    const appError = handleError(error);
    return createErrorResponse(appError);
  }
});
