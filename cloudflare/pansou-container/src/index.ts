import { Container, getContainer } from "@cloudflare/containers";

interface Env {
  PANSOU_CONTAINER: DurableObjectNamespace<PanSouContainer>;
}

const ENABLED_PLUGINS = [
  "lingjisp",
  "ouge",
  "muou",
  "wanou",
  "quarktv",
  "panwiki",
  "sousou",
  "quarksoo",
  "haisou",
  "yiove",
  "panzun",
  "jupansou",
  "yunso",
  "duanjuw",
  "gying",
  "aikanzy",
  // Benchmarked supplemental cloud-drive sources. Keep magnet-only and
  // consistently empty/blocked plugins out of the default search path.
  "qupanshe",
  "lou1",
  "quark4k",
  // Fast, high-signal additions verified across movies, books and courses.
  "melost",
  "hunhepan",
  "kkv",
  "jutoushe",
  // Public movie indexes with direct cloud-drive and magnet links. Both stay
  // within the existing async budget and add Chinese-title coverage.
  "dyyjpro",
  "gaoqing888",
  // Fast public detail indexes with independent Quark, Xunlei, UC, Aliyun
  // and Baidu links. Four-title sampling added 9-17 unique links per query.
  "duoduo",
  "xiaozhang",
].join(",");

export class PanSouContainer extends Container<Env> {
  defaultPort = 8888;
  sleepAfter = "30m";
  pingEndpoint = "localhost/api/health";
  enableInternet = true;

  envVars = {
    PORT: "8888",
    CHANNELS: "tgsearchers3",
    ENABLED_PLUGINS,
    AUTH_ENABLED: "false",
    CACHE_ENABLED: "false",
    ASYNC_PLUGIN_ENABLED: "true",
    ASYNC_RESPONSE_TIMEOUT: "4",
    PLUGIN_TIMEOUT: "8",
    ASYNC_MAX_BACKGROUND_WORKERS: "20",
    ASYNC_MAX_BACKGROUND_TASKS: "80",
    ASYNC_CACHE_TTL_HOURS: "1",
    ASYNC_LOG_ENABLED: "false",
    ENABLE_COMPRESSION: "false",
    HTTP_READ_TIMEOUT: "20",
    HTTP_WRITE_TIMEOUT: "30",
    HTTP_IDLE_TIMEOUT: "120",
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const isSearch = url.pathname === "/api/search";
    const isHealth = url.pathname === "/api/health";

    if ((!isSearch && !isHealth) || (isSearch && !["GET", "POST"].includes(request.method))) {
      return new Response("Not found", { status: 404 });
    }

    return getContainer(env.PANSOU_CONTAINER, "haosouku-primary").fetch(request);
  },
};
