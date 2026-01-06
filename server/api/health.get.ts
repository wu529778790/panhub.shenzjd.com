import { defineEventHandler, sendError } from "h3";
import { getOrCreateSearchService } from "../core/services";
import { handleError, createErrorResponse } from "../core/utils/error-handler";
import { MESSAGES } from "../core/constants";

export default defineEventHandler(async (event) => {
  try {
    const config = useRuntimeConfig();
    const service = getOrCreateSearchService(config);
    const plugins = service
      .getPluginManager()
      .getPlugins()
      .map((p) => p.name());
    return {
      status: "ok",
      plugins_enabled: true,
      plugin_count: plugins.length,
      plugins,
      channels: config.defaultChannels,
    };
  } catch (error) {
    const appError = handleError(error);
    return sendError(event, createErrorResponse(appError));
  }
});
