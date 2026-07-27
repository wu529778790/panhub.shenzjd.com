import {
  defineEventHandler,
  getRouterParam,
  setHeader,
} from "h3";
import { getPublishedGeoPage } from "../../../core/services/geoContentService";
import { getResourceDatabase } from "../../../utils/cloudflareBindings";

export default defineEventHandler(async (event) => {
  const database = getResourceDatabase(event);
  if (!database) {
    return { code: 0, message: "disabled", data: null };
  }
  const page = await getPublishedGeoPage(
    database,
    String(getRouterParam(event, "slug") || "")
  );
  setHeader(
    event,
    "cache-control",
    page
      ? "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400"
      : "private, no-store"
  );
  return {
    code: page ? 0 : 404,
    message: page ? "success" : "not_found",
    data: page,
  };
});
