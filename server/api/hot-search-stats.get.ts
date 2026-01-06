import { defineEventHandler, sendError } from 'h3';
import { getOrCreateHotSearchSQLiteService } from '../core/services/hotSearchSQLite';
import { existsSync } from 'fs';
import { handleError, createErrorResponse } from '../core/utils/error-handler';
import { MESSAGES } from '../core/constants';

export default defineEventHandler(async (event) => {
  try {
    const service = getOrCreateHotSearchSQLiteService();

    // 获取统计信息
    const stats = await service.getStats();
    const dbSize = service.getDatabaseSize();

    // 检查数据库文件是否存在
    const dbExists = existsSync('./data/hot-searches.db');

    // 检查是否在内存模式（通过检查是否有数据库方法）
    const isMemoryMode = !service['db']?.close;

    return {
      code: 0,
      message: MESSAGES.SUCCESS,
      data: {
        stats,
        dbSizeMB: dbSize,
        dbExists,
        isMemoryMode,
        dbPath: './data/hot-searches.db',
        mode: isMemoryMode ? 'memory' : 'sqlite'
      }
    };
  } catch (error) {
    const appError = handleError(error);
    return sendError(event, createErrorResponse(appError));
  }
});
