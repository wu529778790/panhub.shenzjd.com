import { defineEventHandler, getQuery, setHeader } from "h3";
import { getTrafficAnalyticsReport } from "../../core/services/trafficAnalyticsService";
import { getLinkHealthDatabase } from "../../utils/cloudflareBindings";
import { requireOpsToken } from "../../utils/opsAuth";

export default defineEventHandler(async (event) => {
  setHeader(event, "cache-control", "private, no-store");
  await requireOpsToken(event);
  const database = getLinkHealthDatabase(event);
  if (!database) return { code: 0, message: "disabled", data: null };
  const query = getQuery(event);
  const days = Math.max(1, Math.min(90, Number(query.days || 28)));
  return {
    code: 0,
    message: "success",
    data: await getTrafficAnalyticsReport(database, days),
  };
});
