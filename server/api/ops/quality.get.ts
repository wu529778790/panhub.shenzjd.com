import { defineEventHandler, getHeader, getQuery, setHeader } from "h3";
import { getSearchQualitySummary } from "../../core/services/searchQualityService";
import { getLinkHealthDatabase } from "../../utils/cloudflareBindings";

export default defineEventHandler(async (event) => {
  setHeader(event, "cache-control", "private, no-store");
  const database = getLinkHealthDatabase(event);
  if (!database) {
    return { code: 0, message: "disabled", data: null };
  }
  const query = getQuery(event);
  const days = Math.max(1, Math.min(31, Number(query.days || 7)));
  const configuredToken = String(useRuntimeConfig(event).opsToken || "");
  const suppliedToken = getHeader(event, "x-ops-token") || "";
  const includeQueries = Boolean(
    configuredToken && suppliedToken && suppliedToken === configuredToken
  );
  return {
    code: 0,
    message: "success",
    data: await getSearchQualitySummary(database, days, includeQueries),
  };
});
