import { defineEventHandler, getQuery, setHeader } from "h3";
import { getSeoGrowthReport } from "../../core/services/seoAnalyticsService";
import { getLinkHealthDatabase } from "../../utils/cloudflareBindings";

export default defineEventHandler(async (event) => {
  setHeader(event, "cache-control", "private, no-store");
  const database = getLinkHealthDatabase(event);
  if (!database) return { code: 0, message: "disabled", data: null };
  const query = getQuery(event);
  const days = Math.max(1, Math.min(90, Number(query.days || 28)));
  return {
    code: 0,
    message: "success",
    data: await getSeoGrowthReport(database, days),
  };
});
