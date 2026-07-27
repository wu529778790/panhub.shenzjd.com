// https://nuxt.com/docs/api/configuration/nuxt-config
import channelsConfig from "./config/channels.json";

export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: false },
  devServer: {
    port: 4000,
  },
  app: {
    head: {
      htmlAttrs: { lang: "zh-CN" },
      title: "好搜库 - 网盘资源搜索",
      titleTemplate: "%s",
      meta: [
        {
          name: "viewport",
          content:
            "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover",
        },
        {
          name: "description",
          content:
            "好搜库搜索多个网盘公开分享索引，结果按平台整理，重复地址自动合并，已确认失效的链接会被隐藏。",
        },
        { name: "theme-color", content: "#72d83b" },
        { property: "og:type", content: "website" },
        { property: "og:site_name", content: "好搜库" },
      ],
      link: [
        { rel: "icon", type: "image/svg+xml", href: "/brand-mark.svg" },
        { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-32x32.png" },
        { rel: "icon", type: "image/png", sizes: "16x16", href: "/favicon-16x16.png" },
        { rel: "shortcut icon", type: "image/x-icon", href: "/favicon.ico" },
        { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
        { rel: "manifest", href: "/site.webmanifest" },
        { rel: "alternate", type: "application/atom+xml", title: "好搜库搜索指南与专题", href: "/feed.xml" },
        { rel: "search", type: "application/opensearchdescription+xml", title: "好搜库", href: "/opensearch.xml" },
      ],
    },
  },
  nitro: {
    preset: "cloudflare_module",
  },
  routeRules: {
    // 首页品牌和 SEO 元数据需要在部署后立即生效，避免跨版本 SWR 命中旧 HTML
    "/": { swr: false, cache: false },
    // 影视专题页的豆瓣资料由 D1 控制刷新，HTML 不跨版本缓存。
    "/media/**": { swr: false, cache: false },
    // 热搜接口不缓存，否则 POST 写入后 GET 仍返回旧数据
    "/api/hot-searches": { swr: false, cache: false },
    // 豆瓣热搜允许短时缓存（服务端已有 60 分钟 cache）
    "/api/douban-hot": { swr: false, cache: false },
    // 搜索接口实时返回多来源结果，禁止页面级缓存
    "/api/search": { swr: false, cache: false },
    "/api/ai/**": { swr: false, cache: false },
    "/api/favorites/**": { swr: false, cache: false },
    "/api/link-health/**": { swr: false, cache: false },
    "/api/traffic/**": { swr: false, cache: false },
    "/api/ops/**": { swr: false, cache: false },
    "/api/**": {
      cache: false,
      headers: { "x-robots-tag": "noindex, nofollow" },
    },
    // 图片代理依赖豆瓣，禁止 SWR 缓存避免错误响应被缓存
    "/api/img": { swr: false, cache: false },
    "/ios-test": {
      swr: false,
      cache: false,
      headers: { "x-robots-tag": "noindex, nofollow" },
    },
    "/ops/**": {
      swr: false,
      cache: false,
      headers: { "x-robots-tag": "noindex, nofollow" },
    },
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
    aiBaseUrl: "https://cliproxy.fullcoin.com/v1",
    aiModel: "gpt-5.6-luna",
    geoEmbedModel: "@cf/baai/bge-m3",
    opsToken: "",
    public: {
      apiBase: "/api",
      siteUrl: "https://haosouku.com",
      googleSiteVerification: "",
      bingSiteVerification: "",
      // 向前端暴露默认频道清单
      tgDefaultChannels: channelsConfig.defaultChannels,
    },
  },
});
