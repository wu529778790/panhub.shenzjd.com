import { defineEventHandler, getQuery, setHeader } from "h3";
import { searchGeoKnowledge } from "../../core/services/geoContentService";
import {
  getGeoVectorBinding,
  getResourceDatabase,
  getWorkersAiBinding,
} from "../../utils/cloudflareBindings";

export default defineEventHandler(async (event) => {
  setHeader(event, "cache-control", "private, no-store");
  const database = getResourceDatabase(event);
  if (!database) {
    return { code: 0, message: "disabled", data: null };
  }
  const query = String(getQuery(event).q || "").slice(0, 120);
  const model = String(
    useRuntimeConfig(event).geoEmbedModel || "@cf/baai/bge-m3"
  );
  return {
    code: 0,
    message: "success",
    data: await searchGeoKnowledge(
      database,
      getWorkersAiBinding(event),
      getGeoVectorBinding(event),
      query,
      model
    ),
  };
});
