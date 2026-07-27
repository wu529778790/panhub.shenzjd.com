import {
  createError,
  defineEventHandler,
  getHeader,
  readBody,
  setHeader,
} from "h3";
import type { TrafficEventBody } from "../../../types/analytics";
import { recordTrafficEvent } from "../../core/services/trafficAnalyticsService";
import {
  deferCloudflareTask,
  getLinkHealthDatabase,
} from "../../utils/cloudflareBindings";

const ALLOWED_EVENTS = new Set(["page_view", "page_leave", "client_error"]);

export default defineEventHandler(async (event) => {
  setHeader(event, "cache-control", "no-store");
  const body = await readBody<Partial<TrafficEventBody>>(event);
  if (
    !body ||
    !ALLOWED_EVENTS.has(String(body.event || "")) ||
    typeof body.eventId !== "string" ||
    !body.context ||
    typeof body.context !== "object"
  ) {
    throw createError({
      statusCode: 400,
      statusMessage: "invalid traffic event",
    });
  }
  const database = getLinkHealthDatabase(event);
  if (!database) return { code: 0, message: "disabled" };

  const cloudflareRequest =
    event.context?.cloudflare?.request ||
    event.context?.cloudflare?.platform?.request;
  const task = recordTrafficEvent(
    database,
    body as TrafficEventBody,
    {
      country:
        cloudflareRequest?.cf?.country ||
        event.context?.cloudflare?.cf?.country ||
        "",
      userAgent: getHeader(event, "user-agent") || "",
    }
  );
  if (!deferCloudflareTask(event, task)) await task;
  return { code: 0, message: "accepted" };
});
