import { defineEventHandler, getQuery, setHeader } from "h3";
import { getGeoOpsReport } from "../../core/services/geoContentService";
import { getResourceDatabase } from "../../utils/cloudflareBindings";
import { requireOpsToken } from "../../utils/opsAuth";

export default defineEventHandler(async (event) => {
  setHeader(event, "cache-control", "private, no-store");
  await requireOpsToken(event);
  const database = getResourceDatabase(event);
  if (!database) return { code: 0, message: "disabled", data: null };
  const days = Math.max(1, Math.min(90, Number(getQuery(event).days || 28)));
  return {
    code: 0,
    message: "success",
    data: await getGeoOpsReport(database, days),
  };
});
