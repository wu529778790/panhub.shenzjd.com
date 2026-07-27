import { defineEventHandler, setHeader } from "h3";
import { requestGeoPipelineRun } from "../../../core/services/geoContentService";
import { getResourceDatabase } from "../../../utils/cloudflareBindings";
import { requireOpsToken } from "../../../utils/opsAuth";

export default defineEventHandler(async (event) => {
  setHeader(event, "cache-control", "private, no-store");
  await requireOpsToken(event);
  const database = getResourceDatabase(event);
  if (!database) return { code: 0, message: "disabled", data: null };
  const requestedAt = await requestGeoPipelineRun(database);
  return {
    code: 0,
    message: "queued",
    data: {
      requestedAt,
      note: "资源同步 Worker 会在下一次十分钟检查中执行。",
    },
  };
});
