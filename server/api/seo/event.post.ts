import { createError, defineEventHandler, readBody, setHeader } from "h3";
import { recordSeoEvent } from "../../core/services/seoAnalyticsService";
import { getLinkHealthDatabase } from "../../utils/cloudflareBindings";
import type { SeoAttribution } from "../../../utils/seoAttribution";

interface SeoEventBody {
  event?: unknown;
  eventId?: unknown;
  attribution?: Partial<SeoAttribution> | null;
}

export default defineEventHandler(async (event) => {
  setHeader(event, "cache-control", "no-store");
  const body = (await readBody<SeoEventBody>(event)) || {};
  if (body.event !== "landing" || typeof body.eventId !== "string") {
    throw createError({ statusCode: 400, statusMessage: "invalid event" });
  }
  const database = getLinkHealthDatabase(event);
  if (!database) return { code: 0, message: "disabled" };
  await recordSeoEvent(database, {
    event: "landing",
    eventId: body.eventId,
    attribution: body.attribution,
  });
  return { code: 0, message: "success" };
});
