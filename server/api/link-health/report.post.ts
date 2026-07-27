import {
  createError,
  defineEventHandler,
  getHeader,
  readBody,
  setHeader,
} from "h3";
import {
  reportLinkHealth,
  sha256Hex,
  MAX_LINK_HEALTH_BATCH,
  type LinkHealthReportInput,
} from "../../core/services/linkHealthService";
import { getLinkHealthDatabase } from "../../utils/cloudflareBindings";

function getReporterIp(event: any): string {
  return (
    getHeader(event, "cf-connecting-ip") ||
    getHeader(event, "x-forwarded-for")?.split(",")[0]?.trim() ||
    getHeader(event, "x-real-ip") ||
    "unknown"
  );
}

export default defineEventHandler(async (event) => {
  setHeader(event, "cache-control", "no-store");
  const body = await readBody<{ reports?: unknown }>(event);
  if (!Array.isArray(body?.reports) || body.reports.length > MAX_LINK_HEALTH_BATCH) {
    throw createError({ statusCode: 400, statusMessage: "invalid health reports" });
  }

  const reports = body.reports.filter(
    (report): report is LinkHealthReportInput =>
      !!report &&
      typeof report === "object" &&
      typeof (report as any).url === "string" &&
      ["alive", "dead", "password"].includes((report as any).status)
  );
  if (reports.length === 0) {
    throw createError({ statusCode: 400, statusMessage: "empty health reports" });
  }

  const database = getLinkHealthDatabase(event);
  if (!database) {
    throw createError({ statusCode: 503, statusMessage: "link health is not configured" });
  }

  const reporterHash = await sha256Hex(
    `haosouku-link-health:${getReporterIp(event)}`
  );
  return {
    code: 0,
    message: "success",
    data: { items: await reportLinkHealth(database, reports, reporterHash) },
  };
});
