import { defineEventHandler, getQuery, setHeader } from "h3";
import { listPublishedGeoPages } from "../../core/services/geoContentService";
import { getResourceDatabase } from "../../utils/cloudflareBindings";

export default defineEventHandler(async (event) => {
  const database = getResourceDatabase(event);
  if (!database) {
    return { code: 0, message: "disabled", data: [] };
  }
  const query = getQuery(event);
  const limit = Math.max(1, Math.min(200, Number(query.limit || 60)));
  const pages = await listPublishedGeoPages(database, limit);
  setHeader(
    event,
    "cache-control",
    "public, max-age=300, s-maxage=1800, stale-while-revalidate=86400"
  );
  return { code: 0, message: "success", data: pages };
});
