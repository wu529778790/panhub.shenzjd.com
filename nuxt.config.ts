// https://nuxt.com/docs/api/configuration/nuxt-config
import channelsConfig from "./config/channels.json";

export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: false },
  app: {
    head: {
      htmlAttrs: { lang: "zh-CN" },
      title: "PanHub · 全网最全的网盘搜索",
      titleTemplate: "%s · PanHub",
      meta: [
        {
          name: "viewport",
          content:
            "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover",
        },
        {
          name: "description",
          content:
            "PanHub：聚合阿里云盘、夸克、百度网盘、115、迅雷等平台的全网最全网盘搜索工具，实时检索分享资源，免费、快速、无广告。",
        },
        {
          name: "keywords",
          content:
            "网盘搜索, 阿里云盘, 夸克, 百度网盘, 115, 迅雷, 资源搜索, 盘搜, panhub, 网盘聚合搜索",
        },
        { name: "theme-color", content: "#111111" },
        { property: "og:type", content: "website" },
        { property: "og:site_name", content: "PanHub" },
      ],
      link: [{ rel: "icon", type: "image/x-icon", href: "/favicon.ico" }],
    },
  },
  nitro: {
    // 根据环境变量动态选择部署预设
    preset: process.env.VERCEL
      ? "vercel"
      : process.env.NITRO_PRESET || "cloudflare-module",
  },
  routeRules: {
    "/**": { swr: 3600 },
  },
  runtimeConfig: {
    // server-only 配置
    priorityChannels: channelsConfig.priorityChannels,
    defaultChannels: channelsConfig.defaultChannels,
    defaultConcurrency: channelsConfig.defaultConcurrency,
    pluginTimeoutMs: channelsConfig.pluginTimeoutMs,
    cacheEnabled: true,
    cacheTtlMinutes: channelsConfig.cacheTtlMinutes,
    // 速率限制配置
    rateLimit: {
      windowMs: 60 * 1000,  // 1 分钟
      maxRequests: 60,      // 每分钟 60 次
      skipPaths: ['/api/health', '/api/hot-search-stats', '/api/metrics'],
    },
    // 管理员令牌（用于 metrics API）
    adminToken: process.env.ADMIN_TOKEN || '',
    public: {
      apiBase: "/api",
      siteUrl: "https://panhub.shenzjd.com",
      // 向前端暴露默认频道清单
      tgDefaultChannels: channelsConfig.defaultChannels,
    },
  },
});
