import { createError, defineEventHandler, readBody, setHeader } from "h3";
import { queryLinkHealth, MAX_LINK_HEALTH_BATCH } from "../../core/services/linkHealthService";
import { getLinkHealthDatabase } from "../../utils/cloudflareBindings";

export default defineEventHandler(async (event) => {
  setHeader(event, "cache-control", "no-store");
  const body = await readBody<{ urls?: unknown }>(event);
  if (!Array.isArray(body?.urls) || body.urls.length > MAX_LINK_HEALTH_BATCH) {
    throw createError({ statusCode: 400, statusMessage: "invalid link batch" });
  }

  const urls = body.urls.filter((url): url is string => typeof url === "string");
  const database = getLinkHealthDatabase(event);
  if (!database) {
    return { code: 0, message: "success", data: { items: [] } };
  }

  return {
    code: 0,
    message: "success",
    data: { items: await queryLinkHealth(database, urls) },
  };
});
