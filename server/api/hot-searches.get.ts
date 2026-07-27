import { defineEventHandler, getQuery, createError, setHeader } from "h3";
import { getFavoritesDatabase } from "../utils/cloudflareBindings";
import { getD1HotSearches } from "../core/services/d1HotSearchService";
import { getOrCreateHotSearchService } from "../core/services/hotSearchService";

export default defineEventHandler(async (event) => {
  setHeader(event, "cache-control", "no-store");
  const query = getQuery(event);
  const limit = parseInt((query.limit as string) || "30", 10);

  if (isNaN(limit) || limit < 1 || limit > 100) {
    throw createError({ statusCode: 400, message: "limit 参数无效，范围 1-100" });
  }

  const database = getFavoritesDatabase(event);
  const hotSearches = database
    ? await getD1HotSearches(database, limit)
    : await getOrCreateHotSearchService().getHotSearches(limit);

  const maxScore = hotSearches.length > 0 ? (hotSearches[0].displayScore ?? hotSearches[0].score) : 1;

  return {
    code: 0,
    message: "success",
    data: {
      hotSearches: hotSearches.map((item) => ({
        ...item,
        rank: item.rank ?? 0,
        displayScore: item.displayScore ?? item.score,
        heatPercent: maxScore > 0 ? Math.round(((item.displayScore ?? item.score) / maxScore) * 100) : 0,
      })),
    },
  };
});
