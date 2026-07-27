import { createError, defineEventHandler, readBody, setHeader } from "h3";
import {
  recordResultClick,
  recordSearchQuality,
} from "../core/services/searchQualityService";
import { recordSeoEvent } from "../core/services/seoAnalyticsService";
import { getLinkHealthDatabase } from "../utils/cloudflareBindings";
import type { SeoAttribution } from "../../utils/seoAttribution";
import type { TrafficClientContext } from "../../types/analytics";
import { recordTrafficInteraction } from "../core/services/trafficAnalyticsService";

interface QualityEventBody {
  event?: unknown;
  eventId?: unknown;
  query?: unknown;
  resultCount?: unknown;
  latencyMs?: unknown;
  matchMode?: unknown;
  url?: unknown;
  platform?: unknown;
  title?: unknown;
  attribution?: Partial<SeoAttribution> | null;
  traffic?: Partial<TrafficClientContext> | null;
}

export default defineEventHandler(async (event) => {
  setHeader(event, "cache-control", "no-store");
  const body = (await readBody<QualityEventBody>(event)) || {};
  const eventId = typeof body.eventId === "string" ? body.eventId : "";
  const database = getLinkHealthDatabase(event);
  if (!database) return { code: 0, message: "disabled" };

  if (body.event === "search_complete") {
    if (typeof body.query !== "string") {
      throw createError({ statusCode: 400, statusMessage: "invalid query" });
    }
    const recorded = await recordSearchQuality(database, {
      eventId,
      query: body.query,
      resultCount: Number(body.resultCount || 0),
      latencyMs: Number(body.latencyMs || 0),
      matchMode: body.matchMode === "exact" ? "exact" : "fuzzy",
    });
    if (recorded) {
      await Promise.all([
        recordSeoEvent(database, {
          event: "search",
          eventId,
          attribution: body.attribution,
        }),
        recordTrafficInteraction(database, body.traffic, "search"),
      ]);
    }
    return { code: 0, message: "success" };
  }

  if (body.event === "result_click") {
    if (typeof body.url !== "string") {
      throw createError({ statusCode: 400, statusMessage: "invalid url" });
    }
    const recorded = await recordResultClick(database, {
      eventId,
      query: typeof body.query === "string" ? body.query : "",
      url: body.url,
      platform: typeof body.platform === "string" ? body.platform : "",
      title: typeof body.title === "string" ? body.title : "",
    });
    if (recorded) {
      await Promise.all([
        recordSeoEvent(database, {
          event: "result_click",
          eventId,
          attribution: body.attribution,
        }),
        recordTrafficInteraction(database, body.traffic, "result_click"),
      ]);
    }
    return { code: 0, message: "success" };
  }

  throw createError({ statusCode: 400, statusMessage: "invalid event" });
});
