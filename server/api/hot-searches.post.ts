import { defineEventHandler, readBody, createError, setHeader } from "h3";
import { getFavoritesDatabase } from "../utils/cloudflareBindings";
import { recordD1HotSearch } from "../core/services/d1HotSearchService";
import { getOrCreateHotSearchService } from "../core/services/hotSearchService";
import { loggers } from "../core/utils/logger";

interface RequestBody {
  term: string;
}

// 只允许中文、英文、数字、空格
const SAFE_TERM_RE = /^[一-龥a-zA-Z0-9 ]+$/;

export default defineEventHandler(async (event) => {
  setHeader(event, "cache-control", "no-store");
  const body = await readBody<RequestBody>(event);

  if (!body || typeof body.term !== "string") {
    throw createError({ statusCode: 400, message: "缺少搜索词参数" });
  }

  const term = body.term.trim();

  if (term.length === 0) {
    throw createError({ statusCode: 400, message: "搜索词不能为空" });
  }

  if (term.length > 50) {
    throw createError({ statusCode: 400, message: "搜索词不能超过50个字符" });
  }

  if (!SAFE_TERM_RE.test(term)) {
    throw createError({ statusCode: 400, message: "搜索词包含非法字符" });
  }

  const database = getFavoritesDatabase(event);
  if (database) await recordD1HotSearch(database, term);
  else await getOrCreateHotSearchService().recordSearch(term);
  loggers.hotSearch.debug(`记录热搜: "${term}"`);

  return {
    code: 0,
    message: "success",
    data: null,
  };
});
