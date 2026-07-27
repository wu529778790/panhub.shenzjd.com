import { defineEventHandler, createError } from 'h3';
import { getOrCreateHotSearchService } from '../core/services/hotSearchService';
import { getFavoritesDatabase } from "../utils/cloudflareBindings";
import { getD1HotSearchStats } from "../core/services/d1HotSearchService";

export default defineEventHandler(async (event) => {
  try {
    const database = getFavoritesDatabase(event);
    if (database) {
      return {
        code: 0,
        message: "success",
        data: {
          stats: await getD1HotSearchStats(database),
          dbSizeMB: 0,
          mode: "d1",
        },
      };
    }

    const service = getOrCreateHotSearchService();

    const stats = await service.getStats();
    const fileSizeMB = service.getDatabaseSize();
    const storeType = service.getStoreType();

    return {
      code: 0,
      message: 'success',
      data: {
        stats,
        dbSizeMB: fileSizeMB,
        mode: storeType,
      },
    };
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      message: '获取热搜统计信息失败',
    });
  }
});
