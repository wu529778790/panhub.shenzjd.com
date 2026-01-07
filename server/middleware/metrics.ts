/**
 * Metrics Middleware
 *
 * 自动收集 API 请求的性能指标和统计信息
 */

import { defineEventHandler } from 'h3';
import { metrics } from '../core/monitoring/metrics';
import { createLogger } from '../core/utils/logger';

const logger = createLogger('metrics-middleware');

export default defineEventHandler(async (event) => {
  const start = process.hrtime.bigint();
  const startTime = Date.now();

  // 获取请求信息
  const path = event.node.req.url || '';
  const method = event.node.req.method || 'GET';

  // 只收集 API 请求的指标
  if (!path.startsWith('/api/')) {
    return;
  }

  try {
    // 记录搜索开始（如果是搜索请求）
    if (path.includes('/api/search')) {
      metrics.recordSearchStart();
    }

    // 继续请求处理
    const result = await next();

    // 计算响应时间
    const end = process.hrtime.bigint();
    const duration = Number(end - start) / 1000000; // 转换为毫秒

    // 获取响应状态码
    const statusCode = event.node.res.statusCode || 200;

    // 记录 API 指标
    metrics.recordApiRequest(statusCode, duration);

    // 记录搜索结果
    if (path.includes('/api/search')) {
      try {
        // 尝试从响应中提取结果数量
        const body = result?.data || result;
        const total = body?.total || body?.data?.total || 0;
        metrics.recordSearchEnd(total, duration);
      } catch (e) {
        metrics.recordSearchEnd(0, duration);
      }
    }

    // 记录详细日志（仅在调试模式）
    if (process.env.NODE_ENV === 'development') {
      logger.debug(`${method} ${path} - ${statusCode} - ${duration}ms`);
    }

    return result;
  } catch (error) {
    // 计算响应时间
    const end = process.hrtime.bigint();
    const duration = Number(end - start) / 1000000;

    // 记录失败的 API 请求
    const statusCode = event.node.res.statusCode || 500;
    metrics.recordApiRequest(statusCode, duration);

    // 记录搜索失败
    if (path.includes('/api/search')) {
      metrics.recordSearchEnd(0, duration);
    }

    // 记录错误指标
    if (error && typeof error === 'object' && 'code' in error) {
      const err = error as any;
      metrics.recordError(err.code || 'UNKNOWN', err.type || 'Error', err.message || 'Unknown error');
    } else {
      metrics.recordError('UNKNOWN', 'Error', String(error));
    }

    // 记录错误日志
    logger.error(`${method} ${path} - ${statusCode} - ${duration}ms - ${error}`);

    throw error;
  }
});
