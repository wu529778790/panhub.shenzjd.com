# Code Rot Report

> **PROOF COMPLETE** — The real project was not changed.

Project: `/Users/sean/Documents/panpanso`
Generated: `2026-07-22T20:04:04Z`

## Executive summary

| Result | Candidates | LOC | Size |
|---|---:|---:|---:|
| SAFE TO REMOVE | 0 | 0 | 0 B |
| REVIEW | 60 | 131 | 5.0 KB |
| KEEP | 88 | 3,664 | 1.1 MB |

## Proof status

Baseline in disposable copy: **FAILED**

| Command | Result | Duration |
|---|---|---:|
| `pnpm test` | FAIL | 86.570s |
| `pnpm build` | PASS | 14.523s |

## Ranked candidates

| ID | Status | Category | Subject | Confidence | Risk | LOC | Proof |
|---|---|---|---|---|---|---:|---|
| CRT-001 | **REVIEW** | orphan-file | `.codex-seo-visual-test.py` | high | low | 45 | Not proven in a disposable copy. |
| CRT-002 | **KEEP** | orphan-file | `.output/public/_nuxt/BCYUChiP.js` | medium | medium | 2 | Generated Nuxt build output under .output; excluded from source cleanup scope. |
| CRT-003 | **KEEP** | orphan-file | `.output/public/_nuxt/BGxsx0TN.js` | medium | medium | 1 | Generated Nuxt build output under .output; excluded from source cleanup scope. |
| CRT-004 | **KEEP** | orphan-file | `.output/public/_nuxt/BHoPddxq.js` | medium | medium | 1 | Generated Nuxt build output under .output; excluded from source cleanup scope. |
| CRT-005 | **KEEP** | orphan-file | `.output/public/_nuxt/BhwPdyg7.js` | medium | medium | 1 | Generated Nuxt build output under .output; excluded from source cleanup scope. |
| CRT-006 | **KEEP** | orphan-file | `.output/public/_nuxt/BrEz5IKj.js` | medium | medium | 1 | Generated Nuxt build output under .output; excluded from source cleanup scope. |
| CRT-007 | **KEEP** | orphan-file | `.output/public/_nuxt/CHTgmpFa.js` | medium | medium | 1 | Generated Nuxt build output under .output; excluded from source cleanup scope. |
| CRT-008 | **KEEP** | orphan-file | `.output/public/_nuxt/CT52cIms.js` | medium | medium | 1 | Generated Nuxt build output under .output; excluded from source cleanup scope. |
| CRT-009 | **KEEP** | orphan-file | `.output/public/_nuxt/CZbx7lNI.js` | medium | medium | 1 | Generated Nuxt build output under .output; excluded from source cleanup scope. |
| CRT-010 | **KEEP** | orphan-file | `.output/public/_nuxt/CbNbuWb2.js` | medium | medium | 1 | Generated Nuxt build output under .output; excluded from source cleanup scope. |
| CRT-011 | **KEEP** | orphan-file | `.output/public/_nuxt/CfUrNL1K.js` | medium | medium | 1 | Generated Nuxt build output under .output; excluded from source cleanup scope. |
| CRT-012 | **KEEP** | orphan-file | `.output/public/_nuxt/Cuu9779P.js` | medium | medium | 1 | Generated Nuxt build output under .output; excluded from source cleanup scope. |
| CRT-013 | **KEEP** | orphan-file | `.output/public/_nuxt/D3bGyH_U.js` | medium | medium | 3 | Generated Nuxt build output under .output; excluded from source cleanup scope. |
| CRT-014 | **KEEP** | orphan-file | `.output/public/_nuxt/D65ukYnA.js` | medium | medium | 1 | Generated Nuxt build output under .output; excluded from source cleanup scope. |
| CRT-015 | **KEEP** | orphan-file | `.output/public/_nuxt/D748dLCJ.js` | medium | medium | 1 | Generated Nuxt build output under .output; excluded from source cleanup scope. |
| CRT-016 | **KEEP** | orphan-file | `.output/public/_nuxt/DMwX1WEl.js` | medium | medium | 1 | Generated Nuxt build output under .output; excluded from source cleanup scope. |
| CRT-017 | **KEEP** | orphan-file | `.output/public/_nuxt/DWoqGCi-.js` | medium | medium | 3 | Generated Nuxt build output under .output; excluded from source cleanup scope. |
| CRT-018 | **KEEP** | orphan-file | `.output/public/_nuxt/DWr_OC-d.js` | medium | medium | 1 | Generated Nuxt build output under .output; excluded from source cleanup scope. |
| CRT-019 | **KEEP** | orphan-file | `.output/public/_nuxt/D_X6GRZy.js` | medium | medium | 1 | Generated Nuxt build output under .output; excluded from source cleanup scope. |
| CRT-020 | **KEEP** | orphan-file | `.output/public/_nuxt/Din6mfaL.js` | medium | medium | 1 | Generated Nuxt build output under .output; excluded from source cleanup scope. |
| CRT-021 | **KEEP** | orphan-file | `.output/public/_nuxt/DnOljBaa.js` | medium | medium | 1 | Generated Nuxt build output under .output; excluded from source cleanup scope. |
| CRT-022 | **KEEP** | orphan-file | `.output/public/_nuxt/Dp84xg9x.js` | medium | medium | 1 | Generated Nuxt build output under .output; excluded from source cleanup scope. |
| CRT-023 | **KEEP** | orphan-file | `.output/public/_nuxt/DrEnm75J.js` | medium | medium | 1 | Generated Nuxt build output under .output; excluded from source cleanup scope. |
| CRT-024 | **KEEP** | orphan-file | `.output/public/_nuxt/Nn3Fh2eE.js` | medium | medium | 1 | Generated Nuxt build output under .output; excluded from source cleanup scope. |
| CRT-025 | **KEEP** | orphan-file | `.output/public/_nuxt/OckstAWV.js` | medium | medium | 1 | Generated Nuxt build output under .output; excluded from source cleanup scope. |
| CRT-026 | **KEEP** | orphan-file | `.output/public/_nuxt/popr4JVf.js` | medium | medium | 1 | Generated Nuxt build output under .output; excluded from source cleanup scope. |
| CRT-027 | **KEEP** | orphan-file | `.output/public/panhub-link-checker.user.js` | medium | medium | 569 | Generated copy of a public asset under .output; excluded from source cleanup scope. |
| CRT-028 | **KEEP** | orphan-file | `.output/server/chunks/_/PhArrowRight.vue.mjs` | medium | medium | 2 | Generated Nitro server chunk under .output; excluded from source cleanup scope. |
| CRT-029 | **KEEP** | orphan-file | `.output/server/chunks/_/PhArrowUpRight.vue.mjs` | medium | medium | 2 | Generated Nitro server chunk under .output; excluded from source cleanup scope. |
| CRT-030 | **KEEP** | orphan-file | `.output/server/chunks/_/PhMagnifyingGlass.vue.mjs` | medium | medium | 2 | Generated Nitro server chunk under .output; excluded from source cleanup scope. |
| CRT-031 | **KEEP** | orphan-file | `.output/server/chunks/_/cloudflareBindings.mjs` | medium | medium | 2 | Generated Nitro server chunk under .output; excluded from source cleanup scope. |
| CRT-032 | **KEEP** | orphan-file | `.output/server/chunks/_/d1HotSearchService.mjs` | medium | medium | 2 | Generated Nitro server chunk under .output; excluded from source cleanup scope. |
| CRT-033 | **KEEP** | orphan-file | `.output/server/chunks/_/index.mjs` | medium | medium | 2 | Generated Nitro server chunk under .output; excluded from source cleanup scope. |
| CRT-034 | **KEEP** | orphan-file | `.output/server/chunks/_/index2.mjs` | medium | medium | 2 | Generated Nitro server chunk under .output; excluded from source cleanup scope. |
| CRT-035 | **KEEP** | orphan-file | `.output/server/chunks/_/linkHealthService.mjs` | medium | medium | 2 | Generated Nitro server chunk under .output; excluded from source cleanup scope. |
| CRT-036 | **KEEP** | orphan-file | `.output/server/chunks/_/logger.mjs` | medium | medium | 2 | Generated Nitro server chunk under .output; excluded from source cleanup scope. |
| CRT-037 | **KEEP** | orphan-file | `.output/server/chunks/_/memoryCache.mjs` | medium | medium | 2 | Generated Nitro server chunk under .output; excluded from source cleanup scope. |
| CRT-038 | **KEEP** | orphan-file | `.output/server/chunks/_/performance.mjs` | medium | medium | 2 | Generated Nitro server chunk under .output; excluded from source cleanup scope. |
| CRT-039 | **KEEP** | orphan-file | `.output/server/chunks/_/searchLinkHealth.mjs` | medium | medium | 2 | Generated Nitro server chunk under .output; excluded from source cleanup scope. |
| CRT-040 | **KEEP** | orphan-file | `.output/server/chunks/_/searchQualityService.mjs` | medium | medium | 2 | Generated Nitro server chunk under .output; excluded from source cleanup scope. |
| CRT-041 | **KEEP** | orphan-file | `.output/server/chunks/_/shared.esm-bundler.mjs` | medium | medium | 2 | Generated Nitro server chunk under .output; excluded from source cleanup scope. |
| CRT-042 | **KEEP** | orphan-file | `.output/server/chunks/nitro/nitro.mjs` | medium | medium | 2 | Generated Nitro runtime entry under .output; excluded from source cleanup scope. |
| CRT-043 | **KEEP** | orphan-file | `.output/server/chunks/virtual/_commonjsHelpers.mjs` | medium | medium | 2 | Generated bundler helper under .output; excluded from source cleanup scope. |
| CRT-044 | **KEEP** | orphan-file | `.output/server/index.mjs` | medium | medium | 2 | Generated Nitro deployment entry under .output; excluded from source cleanup scope. |
| CRT-045 | **KEEP** | orphan-file | `composables/useAiAnalysis.ts` | high | low | 98 | Nuxt auto-imported composable; used by pages/index/index.vue. |
| CRT-046 | **KEEP** | orphan-file | `composables/useDarkMode.ts` | medium | medium | 39 | Nuxt auto-imported composable; used by app.vue. |
| CRT-047 | **KEEP** | orphan-file | `composables/useFavorites.ts` | medium | medium | 200 | Nuxt auto-imported composable; used by app.vue, FavoritesDrawer and SearchResultList. |
| CRT-048 | **KEEP** | orphan-file | `composables/useLinkHealth.ts` | high | low | 83 | Nuxt auto-imported composable; used by the home page and FavoritesDrawer. |
| CRT-049 | **KEEP** | orphan-file | `composables/useRecentSearches.ts` | high | low | 44 | Nuxt auto-imported composable; used by pages/index/index.vue. |
| CRT-050 | **KEEP** | orphan-file | `composables/useSearch.ts` | medium | medium | 443 | Nuxt auto-imported composable; it is the home-page search state machine. |
| CRT-051 | **KEEP** | orphan-file | `composables/useSettings.ts` | medium | medium | 250 | Nuxt auto-imported composable; used by app.vue and the home page. |
| CRT-052 | **KEEP** | orphan-file | `composables/useToast.ts` | medium | medium | 26 | Nuxt auto-imported composable; used by app.vue and the home page. |
| CRT-053 | **KEEP** | orphan-file | `config/plugins.ts` | medium | medium | 50 | Imported through Nuxt aliases by app, page, components and composables. |
| CRT-054 | **KEEP** | orphan-file | `config/seoContent.ts` | medium | medium | 1237 | SEO route data imported by category, topic, guide and pan routes plus sitemap. |
| CRT-055 | **KEEP** | orphan-file | `config/seoDiscovery.ts` | medium | medium | 71 | Imported by SeoDiscoverySection and its unit tests. |
| CRT-056 | **KEEP** | orphan-file | `nuxt.config.ts` | medium | medium | 89 | Conventional Nuxt configuration entry point. |
| CRT-057 | **KEEP** | orphan-file | `public/panhub-link-checker.user.js` | medium | medium | 569 | Intentional public userscript linked from README and self-update metadata. |
| CRT-058 | **KEEP** | orphan-file | `server/api/ai/analyze.post.ts` | medium | medium | 197 | Conventional Nuxt server API route. |
| CRT-059 | **KEEP** | orphan-file | `server/api/douban-hot.get.ts` | medium | medium | 203 | Conventional Nuxt server API route used by the home page. |
| CRT-060 | **KEEP** | orphan-file | `server/api/favorites/sync.get.ts` | medium | medium | 39 | Conventional Nuxt server API route used by favorites sync. |
| CRT-061 | **KEEP** | orphan-file | `server/api/favorites/sync.post.ts` | medium | medium | 100 | Conventional Nuxt server API route used by favorites sync. |
| CRT-062 | **KEEP** | orphan-file | `server/api/health.get.ts` | medium | medium | 17 | Conventional Nuxt health API route and deployment probe. |
| CRT-063 | **KEEP** | orphan-file | `server/api/hot-search-stats.get.ts` | medium | medium | 42 | Conventional Nuxt server API route. |
| CRT-064 | **KEEP** | orphan-file | `server/api/hot-searches.get.ts` | medium | medium | 34 | Conventional Nuxt server API route used by HotSearchSection. |
| CRT-065 | **KEEP** | orphan-file | `server/api/hot-searches.post.ts` | medium | medium | 46 | Conventional Nuxt server API route used to record hot searches. |
| CRT-066 | **KEEP** | orphan-file | `server/api/img.get.ts` | medium | medium | 81 | Conventional Nuxt image proxy route used by Douban artwork. |
| CRT-067 | **KEEP** | orphan-file | `server/api/link-health/query.post.ts` | medium | medium | 24 | Conventional Nuxt server API route used by useLinkHealth. |
| CRT-068 | **KEEP** | orphan-file | `server/api/link-health/report.post.ts` | medium | medium | 57 | Conventional Nuxt server API route for link-health feedback. |
| CRT-069 | **KEEP** | orphan-file | `server/api/ops/quality.get.ts` | medium | medium | 23 | Conventional Nuxt operations API route for quality metrics. |
| CRT-070 | **KEEP** | orphan-file | `server/api/plugin-health.get.ts` | medium | medium | 18 | Conventional Nuxt server API route for plugin health. |
| CRT-071 | **KEEP** | orphan-file | `server/api/search-quality.post.ts` | medium | medium | 56 | Conventional Nuxt API route used by the client quality beacon. |
| CRT-072 | **KEEP** | orphan-file | `server/api/search.get.ts` | medium | medium | 183 | Conventional Nuxt GET search route used by useSearch. |
| CRT-073 | **KEEP** | orphan-file | `server/api/search.post.ts` | medium | medium | 152 | Conventional Nuxt POST search route retained for API compatibility. |
| CRT-074 | **KEEP** | orphan-file | `server/api/source-status.get.ts` | medium | medium | 72 | Conventional Nuxt API route used by the source-status UI. |
| CRT-075 | **KEEP** | orphan-file | `server/core/services/d1DoubanHotCache.ts` | medium | medium | 96 | Imported by the Douban API route and unit tests. |
| CRT-076 | **KEEP** | orphan-file | `server/core/utils/errors.ts` | medium | medium | 175 | Imported by SearchService for ErrorCollector, classifyError and WarningInfo. |
| CRT-077 | **KEEP** | orphan-file | `server/middleware/rateLimiter.ts` | medium | medium | 82 | Conventional Nuxt server middleware; applies rate limits to API routes. |
| CRT-078 | **KEEP** | orphan-file | `server/middleware/seoHeaders.ts` | high | low | 28 | Conventional Nuxt server middleware; applies SEO response headers. |
| CRT-079 | **REVIEW** | orphan-file | `test/tg-parse-test.mjs` | high | low | 82 | Not proven in a disposable copy. |
| CRT-080 | **KEEP** | orphan-file | `utils/autoLinkHealth.ts` | medium | medium | 186 | Imported by the Cloudflare resource-sync Worker and covered by unit tests. |
| CRT-081 | **KEEP** | orphan-file | `utils/favoritesVault.ts` | medium | medium | 149 | Imported by the favorites composable and unit tests. |
| CRT-082 | **KEEP** | orphan-file | `utils/groupCloudSearchItems.ts` | medium | medium | 101 | Imported by the home page and unit tests. |
| CRT-083 | **KEEP** | orphan-file | `vitest.config.ts` | medium | medium | 28 | Conventional Vitest configuration entry point. |
| CRT-084 | **KEEP** | unused-export | `PanSouContainer from cloudflare/pansou-container/src/index.ts` | medium | medium | 0 | Cloudflare Containers class exported by name and referenced in wrangler durable-object configuration. |
| CRT-085 | **REVIEW** | unused-export | `ParseCatalogOptions from cloudflare/resource-sync/src/catalog.ts` | medium | medium | 0 | Not proven in a disposable copy. |
| CRT-086 | **KEEP** | unused-export | `useAiAnalysis from composables/useAiAnalysis.ts` | medium | medium | 0 | Nuxt auto-imported composable export used by pages/index/index.vue. |
| CRT-087 | **KEEP** | unused-export | `useLinkHealth from composables/useLinkHealth.ts` | medium | medium | 0 | Nuxt auto-imported composable export used by the home page and FavoritesDrawer. |
| CRT-088 | **KEEP** | unused-export | `useRecentSearches from composables/useRecentSearches.ts` | medium | medium | 0 | Nuxt auto-imported composable export used by pages/index/index.vue. |
| CRT-089 | **REVIEW** | unused-export | `SearchOptions from composables/useSearch.ts` | medium | medium | 0 | Not proven in a disposable copy. |
| CRT-090 | **REVIEW** | unused-export | `SearchState from composables/useSearch.ts` | medium | medium | 0 | Not proven in a disposable copy. |
| CRT-091 | **REVIEW** | unused-export | `DEFAULT_DOUBAN_CATEGORIES from config/doubanHot.ts` | medium | medium | 0 | Not proven in a disposable copy. |
| CRT-092 | **REVIEW** | unused-export | `SeoFact from config/seoContent.ts` | medium | medium | 0 | Not proven in a disposable copy. |
| CRT-093 | **REVIEW** | unused-export | `SeoHub from config/seoContent.ts` | medium | medium | 0 | Not proven in a disposable copy. |
| CRT-094 | **REVIEW** | unused-export | `SeoPage from config/seoContent.ts` | medium | medium | 0 | Not proven in a disposable copy. |
| CRT-095 | **REVIEW** | unused-export | `SeoPageKind from config/seoContent.ts` | medium | medium | 0 | Not proven in a disposable copy. |
| CRT-096 | **REVIEW** | unused-export | `SeoSection from config/seoContent.ts` | medium | medium | 0 | Not proven in a disposable copy. |
| CRT-097 | **KEEP** | unused-export | `getSeoPageByKind from config/seoContent.ts` | medium | medium | 0 | Imported through the Nuxt alias by four dynamic SEO routes. |
| CRT-098 | **KEEP** | unused-export | `legalPages from config/seoContent.ts` | medium | medium | 0 | Aggregated into the exported SEO page collection consumed by the sitemap. |
| CRT-099 | **REVIEW** | unused-export | `SeoDiscoveryLink from config/seoDiscovery.ts` | medium | medium | 0 | Not proven in a disposable copy. |
| CRT-100 | **REVIEW** | unused-export | `MemoryCacheOptions from server/core/cache/memoryCache.ts` | medium | medium | 0 | Not proven in a disposable copy. |
| CRT-101 | **REVIEW** | unused-export | `MemoryCacheStats from server/core/cache/memoryCache.ts` | medium | medium | 0 | Not proven in a disposable copy. |
| CRT-102 | **REVIEW** | unused-export | `UnifiedCacheConfig from server/core/cache/unifiedCache.ts` | medium | medium | 0 | Not proven in a disposable copy. |
| CRT-103 | **REVIEW** | unused-export | `createSearchCache from server/core/cache/unifiedCache.ts` | medium | medium | 0 | Factory export has no repository reference; removal is small but should be proved with build and tests. |
| CRT-104 | **REVIEW** | unused-export | `Fox4kPlugin from server/core/plugins/fox4k.ts` | medium | medium | 0 | No inbound import and not registered by SearchService; the whole legacy plugin file is a strong removal candidate pending proof. |
| CRT-105 | **REVIEW** | unused-export | `Hdr4kPlugin from server/core/plugins/hdr4k.ts` | medium | medium | 0 | No inbound import and not registered by SearchService; the whole legacy plugin file is a strong removal candidate pending proof. |
| CRT-106 | **REVIEW** | unused-export | `HubanPlugin from server/core/plugins/huban.ts` | medium | medium | 0 | No inbound import and not registered by SearchService; the whole legacy plugin file is a strong removal candidate pending proof. |
| CRT-107 | **REVIEW** | unused-export | `MuouPlugin from server/core/plugins/muou.ts` | medium | medium | 0 | No inbound import and not registered by SearchService; the whole legacy plugin file is a strong removal candidate pending proof. |
| CRT-108 | **REVIEW** | unused-export | `OugePlugin from server/core/plugins/ouge.ts` | medium | medium | 0 | No inbound import and not registered by SearchService; the whole legacy plugin file is a strong removal candidate pending proof. |
| CRT-109 | **REVIEW** | unused-export | `Pan666Plugin from server/core/plugins/pan666.ts` | medium | medium | 0 | No inbound import and not registered by SearchService; the whole legacy plugin file is a strong removal candidate pending proof. |
| CRT-110 | **REVIEW** | unused-export | `PanyqPlugin from server/core/plugins/panyq.ts` | medium | medium | 0 | No inbound import and not registered by SearchService; the whole legacy plugin file is a strong removal candidate pending proof. |
| CRT-111 | **REVIEW** | unused-export | `PluginHealthConfig from server/core/plugins/pluginHealth.ts` | medium | medium | 0 | Not proven in a disposable copy. |
| CRT-112 | **REVIEW** | unused-export | `PluginHealthStatus from server/core/plugins/pluginHealth.ts` | medium | medium | 0 | Not proven in a disposable copy. |
| CRT-113 | **REVIEW** | unused-export | `ShandianPlugin from server/core/plugins/shandian.ts` | medium | medium | 0 | No inbound import and not registered by SearchService; the whole legacy plugin file is a strong removal candidate pending proof. |
| CRT-114 | **REVIEW** | unused-export | `SusuPlugin from server/core/plugins/susu.ts` | medium | medium | 0 | No inbound import and not registered by SearchService; the whole legacy plugin file is a strong removal candidate pending proof. |
| CRT-115 | **REVIEW** | unused-export | `TorrentGalaxyPlugin from server/core/plugins/torrentgalaxy.ts` | medium | medium | 0 | No inbound import and not registered by SearchService; the whole legacy plugin file is a strong removal candidate pending proof. |
| CRT-116 | **REVIEW** | unused-export | `WanouPlugin from server/core/plugins/wanou.ts` | medium | medium | 0 | No inbound import and not registered by SearchService; the whole legacy plugin file is a strong removal candidate pending proof. |
| CRT-117 | **REVIEW** | unused-export | `X1337xPlugin from server/core/plugins/x1337x.ts` | medium | medium | 0 | No inbound import and not registered by SearchService; the whole legacy plugin file is a strong removal candidate pending proof. |
| CRT-118 | **REVIEW** | unused-export | `ZhizhenPlugin from server/core/plugins/zhizhen.ts` | medium | medium | 0 | No inbound import and not registered by SearchService; the whole legacy plugin file is a strong removal candidate pending proof. |
| CRT-119 | **REVIEW** | unused-export | `AiServiceConfig from server/core/services/aiAnalysisService.ts` | medium | medium | 0 | Not proven in a disposable copy. |
| CRT-120 | **REVIEW** | unused-export | `D1DoubanHotCacheEntry from server/core/services/d1DoubanHotCache.ts` | medium | medium | 0 | Not proven in a disposable copy. |
| CRT-121 | **REVIEW** | unused-export | `extractSearchTerm from server/core/services/doubanHotService.ts` | medium | medium | 0 | Not proven in a disposable copy. |
| CRT-122 | **REVIEW** | unused-export | `fetchDoubanHot from server/core/services/doubanHotService.ts` | medium | medium | 0 | Not proven in a disposable copy. |
| CRT-123 | **REVIEW** | unused-export | `getSearchServiceStats from server/core/services/index.ts` | medium | medium | 0 | Monitoring helper has no repository reference; removal should be proved with API and unit checks. |
| CRT-124 | **REVIEW** | unused-export | `resetSearchService from server/core/services/index.ts` | medium | medium | 0 | Test reset helper has no repository reference; removal should be proved against all tests. |
| CRT-125 | **REVIEW** | unused-export | `ResultClickInput from server/core/services/searchQualityService.ts` | medium | medium | 0 | Not proven in a disposable copy. |
| CRT-126 | **REVIEW** | unused-export | `SearchQualityInput from server/core/services/searchQualityService.ts` | medium | medium | 0 | Not proven in a disposable copy. |
| CRT-127 | **REVIEW** | unused-export | `SourcePerformanceInput from server/core/services/searchQualityService.ts` | medium | medium | 0 | Not proven in a disposable copy. |
| CRT-128 | **REVIEW** | unused-export | `SourceQualityState from server/core/services/searchQualityService.ts` | medium | medium | 0 | Not proven in a disposable copy. |
| CRT-129 | **REVIEW** | unused-export | `SourceQualityStats from server/core/services/searchQualityService.ts` | medium | medium | 0 | Not proven in a disposable copy. |
| CRT-130 | **REVIEW** | unused-export | `clearSourceQualityPolicyCache from server/core/services/searchQualityService.ts` | medium | medium | 0 | Policy-cache reset helper has no repository reference; removal should be proved against quality tests. |
| CRT-131 | **REVIEW** | unused-export | `SearchExecutionResult from server/core/services/searchService.ts` | medium | medium | 0 | Not proven in a disposable copy. |
| CRT-132 | **REVIEW** | unused-export | `SourceExecutionMetric from server/core/services/searchService.ts` | medium | medium | 0 | Not proven in a disposable copy. |
| CRT-133 | **REVIEW** | unused-export | `TgFetchOptions from server/core/services/tg.ts` | medium | medium | 0 | Not proven in a disposable copy. |
| CRT-134 | **REVIEW** | unused-export | `ErrorDetail from server/core/utils/errors.ts` | medium | medium | 0 | Not proven in a disposable copy. |
| CRT-135 | **REVIEW** | unused-export | `ErrorSeverity from server/core/utils/errors.ts` | medium | medium | 0 | Not proven in a disposable copy. |
| CRT-136 | **REVIEW** | unused-export | `ErrorType from server/core/utils/errors.ts` | medium | medium | 0 | Not proven in a disposable copy. |
| CRT-137 | **REVIEW** | unused-export | `FetchWithRetryOptions from server/core/utils/fetch.ts` | medium | medium | 0 | Not proven in a disposable copy. |
| CRT-138 | **REVIEW** | unused-export | `createPersistentFetcher from server/core/utils/fetch.ts` | medium | medium | 0 | Persistent fetch factory has no repository reference; removal should be proved with unit tests and build. |
| CRT-139 | **REVIEW** | unused-export | `LogLevel from server/core/utils/logger.ts` | medium | medium | 0 | Not proven in a disposable copy. |
| CRT-140 | **REVIEW** | unused-export | `LogMeta from server/core/utils/logger.ts` | medium | medium | 0 | Not proven in a disposable copy. |
| CRT-141 | **REVIEW** | unused-export | `LogOptions from server/core/utils/logger.ts` | medium | medium | 0 | Not proven in a disposable copy. |
| CRT-142 | **REVIEW** | unused-export | `AutomaticLinkHealthStatus from utils/autoLinkHealth.ts` | medium | medium | 0 | Not proven in a disposable copy. |
| CRT-143 | **REVIEW** | unused-export | `ConfirmedAutomaticLinkHealthDecision from utils/autoLinkHealth.ts` | medium | medium | 0 | Not proven in a disposable copy. |
| CRT-144 | **REVIEW** | unused-export | `MAX_FAVORITE_ITEMS from utils/favoritesVault.ts` | medium | medium | 0 | Not proven in a disposable copy. |
| CRT-145 | **REVIEW** | unused-export | `inferTorrentMetadata from utils/torrentMetadata.ts` | medium | medium | 0 | Not proven in a disposable copy. |
| CRT-146 | **REVIEW** | unused-export | `withTorrentAvailability from utils/torrentMetadata.ts` | medium | medium | 0 | Not proven in a disposable copy. |
| CRT-147 | **KEEP** | duplicate-file | `public/panhub-link-checker.user.js duplicates .output/public/panhub-link-checker.user.js` | high | medium | 569 | The second copy is generated build output; public/ remains the canonical source asset. |
| CRT-148 | **REVIEW** | commented-code | `Comment block in test/unit/hot-search.test.ts` | low | medium | 4 | Not proven in a disposable copy. |

## Evidence by candidate

### CRT-001 — REVIEW

- Location: `.codex-seo-visual-test.py`
- Category: `orphan-file`
- Potential size: 45 LOC / 2.3 KB
- Status reason: Not proven in a disposable copy.
- Evidence: No resolved static inbound import was found. The file is not a detected package or conventional entry point.
- Caveats: Dynamic loading, reflection, external consumers, or incomplete framework detection can hide reachability.

### CRT-002 — KEEP

- Location: `.output/public/_nuxt/BCYUChiP.js`
- Category: `orphan-file`
- Potential size: 2 LOC / 136.7 KB
- Status reason: Generated Nuxt build output under .output; excluded from source cleanup scope.
- Evidence: No resolved static inbound import was found. The file is not a detected package or conventional entry point. Repository text contains possible string/name references: BCYUChiP, BCYUChiP.js.
- Caveats: Dynamic loading, reflection, external consumers, or incomplete framework detection can hide reachability. Possible string reachability prevents high-confidence deletion.

### CRT-003 — KEEP

- Location: `.output/public/_nuxt/BGxsx0TN.js`
- Category: `orphan-file`
- Potential size: 1 LOC / 275 B
- Status reason: Generated Nuxt build output under .output; excluded from source cleanup scope.
- Evidence: No resolved static inbound import was found. The file is not a detected package or conventional entry point. Repository text contains possible string/name references: BGxsx0TN, BGxsx0TN.js.
- Caveats: Dynamic loading, reflection, external consumers, or incomplete framework detection can hide reachability. Possible string reachability prevents high-confidence deletion.

### CRT-004 — KEEP

- Location: `.output/public/_nuxt/BHoPddxq.js`
- Category: `orphan-file`
- Potential size: 1 LOC / 414 B
- Status reason: Generated Nuxt build output under .output; excluded from source cleanup scope.
- Evidence: No resolved static inbound import was found. The file is not a detected package or conventional entry point. Repository text contains possible string/name references: BHoPddxq, BHoPddxq.js.
- Caveats: Dynamic loading, reflection, external consumers, or incomplete framework detection can hide reachability. Possible string reachability prevents high-confidence deletion.

### CRT-005 — KEEP

- Location: `.output/public/_nuxt/BhwPdyg7.js`
- Category: `orphan-file`
- Potential size: 1 LOC / 305 B
- Status reason: Generated Nuxt build output under .output; excluded from source cleanup scope.
- Evidence: No resolved static inbound import was found. The file is not a detected package or conventional entry point. Repository text contains possible string/name references: BhwPdyg7, BhwPdyg7.js.
- Caveats: Dynamic loading, reflection, external consumers, or incomplete framework detection can hide reachability. Possible string reachability prevents high-confidence deletion.

### CRT-006 — KEEP

- Location: `.output/public/_nuxt/BrEz5IKj.js`
- Category: `orphan-file`
- Potential size: 1 LOC / 410 B
- Status reason: Generated Nuxt build output under .output; excluded from source cleanup scope.
- Evidence: No resolved static inbound import was found. The file is not a detected package or conventional entry point. Repository text contains possible string/name references: BrEz5IKj, BrEz5IKj.js.
- Caveats: Dynamic loading, reflection, external consumers, or incomplete framework detection can hide reachability. Possible string reachability prevents high-confidence deletion.

### CRT-007 — KEEP

- Location: `.output/public/_nuxt/CHTgmpFa.js`
- Category: `orphan-file`
- Potential size: 1 LOC / 310 B
- Status reason: Generated Nuxt build output under .output; excluded from source cleanup scope.
- Evidence: No resolved static inbound import was found. The file is not a detected package or conventional entry point. Repository text contains possible string/name references: CHTgmpFa, CHTgmpFa.js.
- Caveats: Dynamic loading, reflection, external consumers, or incomplete framework detection can hide reachability. Possible string reachability prevents high-confidence deletion.

### CRT-008 — KEEP

- Location: `.output/public/_nuxt/CT52cIms.js`
- Category: `orphan-file`
- Potential size: 1 LOC / 2.0 KB
- Status reason: Generated Nuxt build output under .output; excluded from source cleanup scope.
- Evidence: No resolved static inbound import was found. The file is not a detected package or conventional entry point. Repository text contains possible string/name references: CT52cIms, CT52cIms.js.
- Caveats: Dynamic loading, reflection, external consumers, or incomplete framework detection can hide reachability. Possible string reachability prevents high-confidence deletion.

### CRT-009 — KEEP

- Location: `.output/public/_nuxt/CZbx7lNI.js`
- Category: `orphan-file`
- Potential size: 1 LOC / 3.6 KB
- Status reason: Generated Nuxt build output under .output; excluded from source cleanup scope.
- Evidence: No resolved static inbound import was found. The file is not a detected package or conventional entry point. Repository text contains possible string/name references: CZbx7lNI, CZbx7lNI.js.
- Caveats: Dynamic loading, reflection, external consumers, or incomplete framework detection can hide reachability. Possible string reachability prevents high-confidence deletion.

### CRT-010 — KEEP

- Location: `.output/public/_nuxt/CbNbuWb2.js`
- Category: `orphan-file`
- Potential size: 1 LOC / 267 B
- Status reason: Generated Nuxt build output under .output; excluded from source cleanup scope.
- Evidence: No resolved static inbound import was found. The file is not a detected package or conventional entry point. Repository text contains possible string/name references: CbNbuWb2, CbNbuWb2.js.
- Caveats: Dynamic loading, reflection, external consumers, or incomplete framework detection can hide reachability. Possible string reachability prevents high-confidence deletion.

### CRT-011 — KEEP

- Location: `.output/public/_nuxt/CfUrNL1K.js`
- Category: `orphan-file`
- Potential size: 1 LOC / 2.9 KB
- Status reason: Generated Nuxt build output under .output; excluded from source cleanup scope.
- Evidence: No resolved static inbound import was found. The file is not a detected package or conventional entry point. Repository text contains possible string/name references: CfUrNL1K, CfUrNL1K.js.
- Caveats: Dynamic loading, reflection, external consumers, or incomplete framework detection can hide reachability. Possible string reachability prevents high-confidence deletion.

### CRT-012 — KEEP

- Location: `.output/public/_nuxt/Cuu9779P.js`
- Category: `orphan-file`
- Potential size: 1 LOC / 419 B
- Status reason: Generated Nuxt build output under .output; excluded from source cleanup scope.
- Evidence: No resolved static inbound import was found. The file is not a detected package or conventional entry point. Repository text contains possible string/name references: Cuu9779P, Cuu9779P.js.
- Caveats: Dynamic loading, reflection, external consumers, or incomplete framework detection can hide reachability. Possible string reachability prevents high-confidence deletion.

### CRT-013 — KEEP

- Location: `.output/public/_nuxt/D3bGyH_U.js`
- Category: `orphan-file`
- Potential size: 3 LOC / 91.8 KB
- Status reason: Generated Nuxt build output under .output; excluded from source cleanup scope.
- Evidence: No resolved static inbound import was found. The file is not a detected package or conventional entry point. Repository text contains possible string/name references: D3bGyH_U, D3bGyH_U.js.
- Caveats: Dynamic loading, reflection, external consumers, or incomplete framework detection can hide reachability. Possible string reachability prevents high-confidence deletion.

### CRT-014 — KEEP

- Location: `.output/public/_nuxt/D65ukYnA.js`
- Category: `orphan-file`
- Potential size: 1 LOC / 25.9 KB
- Status reason: Generated Nuxt build output under .output; excluded from source cleanup scope.
- Evidence: No resolved static inbound import was found. The file is not a detected package or conventional entry point. Repository text contains possible string/name references: D65ukYnA, D65ukYnA.js.
- Caveats: Dynamic loading, reflection, external consumers, or incomplete framework detection can hide reachability. Possible string reachability prevents high-confidence deletion.

### CRT-015 — KEEP

- Location: `.output/public/_nuxt/D748dLCJ.js`
- Category: `orphan-file`
- Potential size: 1 LOC / 65.6 KB
- Status reason: Generated Nuxt build output under .output; excluded from source cleanup scope.
- Evidence: No resolved static inbound import was found. The file is not a detected package or conventional entry point. Repository text contains possible string/name references: D748dLCJ, D748dLCJ.js.
- Caveats: Dynamic loading, reflection, external consumers, or incomplete framework detection can hide reachability. Possible string reachability prevents high-confidence deletion.

### CRT-016 — KEEP

- Location: `.output/public/_nuxt/DMwX1WEl.js`
- Category: `orphan-file`
- Potential size: 1 LOC / 23.3 KB
- Status reason: Generated Nuxt build output under .output; excluded from source cleanup scope.
- Evidence: No resolved static inbound import was found. The file is not a detected package or conventional entry point. Repository text contains possible string/name references: DMwX1WEl, DMwX1WEl.js.
- Caveats: Dynamic loading, reflection, external consumers, or incomplete framework detection can hide reachability. Possible string reachability prevents high-confidence deletion.

### CRT-017 — KEEP

- Location: `.output/public/_nuxt/DWoqGCi-.js`
- Category: `orphan-file`
- Potential size: 3 LOC / 110.4 KB
- Status reason: Generated Nuxt build output under .output; excluded from source cleanup scope.
- Evidence: No resolved static inbound import was found. The file is not a detected package or conventional entry point. Repository text contains possible string/name references: DWoqGCi-, DWoqGCi-.js.
- Caveats: Dynamic loading, reflection, external consumers, or incomplete framework detection can hide reachability. Possible string reachability prevents high-confidence deletion.

### CRT-018 — KEEP

- Location: `.output/public/_nuxt/DWr_OC-d.js`
- Category: `orphan-file`
- Potential size: 1 LOC / 1.5 KB
- Status reason: Generated Nuxt build output under .output; excluded from source cleanup scope.
- Evidence: No resolved static inbound import was found. The file is not a detected package or conventional entry point. Repository text contains possible string/name references: DWr_OC-d, DWr_OC-d.js.
- Caveats: Dynamic loading, reflection, external consumers, or incomplete framework detection can hide reachability. Possible string reachability prevents high-confidence deletion.

### CRT-019 — KEEP

- Location: `.output/public/_nuxt/D_X6GRZy.js`
- Category: `orphan-file`
- Potential size: 1 LOC / 2.0 KB
- Status reason: Generated Nuxt build output under .output; excluded from source cleanup scope.
- Evidence: No resolved static inbound import was found. The file is not a detected package or conventional entry point. Repository text contains possible string/name references: D_X6GRZy, D_X6GRZy.js.
- Caveats: Dynamic loading, reflection, external consumers, or incomplete framework detection can hide reachability. Possible string reachability prevents high-confidence deletion.

### CRT-020 — KEEP

- Location: `.output/public/_nuxt/Din6mfaL.js`
- Category: `orphan-file`
- Potential size: 1 LOC / 271 B
- Status reason: Generated Nuxt build output under .output; excluded from source cleanup scope.
- Evidence: No resolved static inbound import was found. The file is not a detected package or conventional entry point. Repository text contains possible string/name references: Din6mfaL, Din6mfaL.js.
- Caveats: Dynamic loading, reflection, external consumers, or incomplete framework detection can hide reachability. Possible string reachability prevents high-confidence deletion.

### CRT-021 — KEEP

- Location: `.output/public/_nuxt/DnOljBaa.js`
- Category: `orphan-file`
- Potential size: 1 LOC / 4.4 KB
- Status reason: Generated Nuxt build output under .output; excluded from source cleanup scope.
- Evidence: No resolved static inbound import was found. The file is not a detected package or conventional entry point. Repository text contains possible string/name references: DnOljBaa, DnOljBaa.js.
- Caveats: Dynamic loading, reflection, external consumers, or incomplete framework detection can hide reachability. Possible string reachability prevents high-confidence deletion.

### CRT-022 — KEEP

- Location: `.output/public/_nuxt/Dp84xg9x.js`
- Category: `orphan-file`
- Potential size: 1 LOC / 2.1 KB
- Status reason: Generated Nuxt build output under .output; excluded from source cleanup scope.
- Evidence: No resolved static inbound import was found. The file is not a detected package or conventional entry point. Repository text contains possible string/name references: Dp84xg9x, Dp84xg9x.js.
- Caveats: Dynamic loading, reflection, external consumers, or incomplete framework detection can hide reachability. Possible string reachability prevents high-confidence deletion.

### CRT-023 — KEEP

- Location: `.output/public/_nuxt/DrEnm75J.js`
- Category: `orphan-file`
- Potential size: 1 LOC / 410 B
- Status reason: Generated Nuxt build output under .output; excluded from source cleanup scope.
- Evidence: No resolved static inbound import was found. The file is not a detected package or conventional entry point. Repository text contains possible string/name references: DrEnm75J, DrEnm75J.js.
- Caveats: Dynamic loading, reflection, external consumers, or incomplete framework detection can hide reachability. Possible string reachability prevents high-confidence deletion.

### CRT-024 — KEEP

- Location: `.output/public/_nuxt/Nn3Fh2eE.js`
- Category: `orphan-file`
- Potential size: 1 LOC / 267 B
- Status reason: Generated Nuxt build output under .output; excluded from source cleanup scope.
- Evidence: No resolved static inbound import was found. The file is not a detected package or conventional entry point. Repository text contains possible string/name references: Nn3Fh2eE, Nn3Fh2eE.js.
- Caveats: Dynamic loading, reflection, external consumers, or incomplete framework detection can hide reachability. Possible string reachability prevents high-confidence deletion.

### CRT-025 — KEEP

- Location: `.output/public/_nuxt/OckstAWV.js`
- Category: `orphan-file`
- Potential size: 1 LOC / 302 B
- Status reason: Generated Nuxt build output under .output; excluded from source cleanup scope.
- Evidence: No resolved static inbound import was found. The file is not a detected package or conventional entry point. Repository text contains possible string/name references: OckstAWV, OckstAWV.js.
- Caveats: Dynamic loading, reflection, external consumers, or incomplete framework detection can hide reachability. Possible string reachability prevents high-confidence deletion.

### CRT-026 — KEEP

- Location: `.output/public/_nuxt/popr4JVf.js`
- Category: `orphan-file`
- Potential size: 1 LOC / 307 B
- Status reason: Generated Nuxt build output under .output; excluded from source cleanup scope.
- Evidence: No resolved static inbound import was found. The file is not a detected package or conventional entry point. Repository text contains possible string/name references: popr4JVf, popr4JVf.js.
- Caveats: Dynamic loading, reflection, external consumers, or incomplete framework detection can hide reachability. Possible string reachability prevents high-confidence deletion.

### CRT-027 — KEEP

- Location: `.output/public/panhub-link-checker.user.js`
- Category: `orphan-file`
- Potential size: 569 LOC / 19.5 KB
- Status reason: Generated copy of a public asset under .output; excluded from source cleanup scope.
- Evidence: No resolved static inbound import was found. The file is not a detected package or conventional entry point. Repository text contains possible string/name references: panhub-link-checker.user, panhub-link-checker.user.js.
- Caveats: Dynamic loading, reflection, external consumers, or incomplete framework detection can hide reachability. Possible string reachability prevents high-confidence deletion.

### CRT-028 — KEEP

- Location: `.output/server/chunks/_/PhArrowRight.vue.mjs`
- Category: `orphan-file`
- Potential size: 2 LOC / 2.1 KB
- Status reason: Generated Nitro server chunk under .output; excluded from source cleanup scope.
- Evidence: No resolved static inbound import was found. The file is not a detected package or conventional entry point. Repository text contains possible string/name references: PhArrowRight.vue.
- Caveats: Dynamic loading, reflection, external consumers, or incomplete framework detection can hide reachability. Possible string reachability prevents high-confidence deletion.

### CRT-029 — KEEP

- Location: `.output/server/chunks/_/PhArrowUpRight.vue.mjs`
- Category: `orphan-file`
- Potential size: 2 LOC / 2.0 KB
- Status reason: Generated Nitro server chunk under .output; excluded from source cleanup scope.
- Evidence: No resolved static inbound import was found. The file is not a detected package or conventional entry point. Repository text contains possible string/name references: PhArrowUpRight.vue.
- Caveats: Dynamic loading, reflection, external consumers, or incomplete framework detection can hide reachability. Possible string reachability prevents high-confidence deletion.

### CRT-030 — KEEP

- Location: `.output/server/chunks/_/PhMagnifyingGlass.vue.mjs`
- Category: `orphan-file`
- Potential size: 2 LOC / 2.2 KB
- Status reason: Generated Nitro server chunk under .output; excluded from source cleanup scope.
- Evidence: No resolved static inbound import was found. The file is not a detected package or conventional entry point. Repository text contains possible string/name references: PhMagnifyingGlass.vue.
- Caveats: Dynamic loading, reflection, external consumers, or incomplete framework detection can hide reachability. Possible string reachability prevents high-confidence deletion.

### CRT-031 — KEEP

- Location: `.output/server/chunks/_/cloudflareBindings.mjs`
- Category: `orphan-file`
- Potential size: 2 LOC / 1.2 KB
- Status reason: Generated Nitro server chunk under .output; excluded from source cleanup scope.
- Evidence: No resolved static inbound import was found. The file is not a detected package or conventional entry point. Repository text contains possible string/name references: cloudflareBindings, cloudflareBindings.mjs.
- Caveats: Dynamic loading, reflection, external consumers, or incomplete framework detection can hide reachability. Possible string reachability prevents high-confidence deletion.

### CRT-032 — KEEP

- Location: `.output/server/chunks/_/d1HotSearchService.mjs`
- Category: `orphan-file`
- Potential size: 2 LOC / 4.7 KB
- Status reason: Generated Nitro server chunk under .output; excluded from source cleanup scope.
- Evidence: No resolved static inbound import was found. The file is not a detected package or conventional entry point. Repository text contains possible string/name references: d1HotSearchService, d1HotSearchService.mjs.
- Caveats: Dynamic loading, reflection, external consumers, or incomplete framework detection can hide reachability. Possible string reachability prevents high-confidence deletion.

### CRT-033 — KEEP

- Location: `.output/server/chunks/_/index.mjs`
- Category: `orphan-file`
- Potential size: 2 LOC / 64.2 KB
- Status reason: Generated Nitro server chunk under .output; excluded from source cleanup scope.
- Evidence: No resolved static inbound import was found. The file is not a detected package or conventional entry point. Repository text contains possible string/name references: index, index.mjs.
- Caveats: Dynamic loading, reflection, external consumers, or incomplete framework detection can hide reachability. Possible string reachability prevents high-confidence deletion.

### CRT-034 — KEEP

- Location: `.output/server/chunks/_/index2.mjs`
- Category: `orphan-file`
- Potential size: 2 LOC / 1.7 KB
- Status reason: Generated Nitro server chunk under .output; excluded from source cleanup scope.
- Evidence: No resolved static inbound import was found. The file is not a detected package or conventional entry point. Repository text contains possible string/name references: index2, index2.mjs.
- Caveats: Dynamic loading, reflection, external consumers, or incomplete framework detection can hide reachability. Possible string reachability prevents high-confidence deletion.

### CRT-035 — KEEP

- Location: `.output/server/chunks/_/linkHealthService.mjs`
- Category: `orphan-file`
- Potential size: 2 LOC / 8.1 KB
- Status reason: Generated Nitro server chunk under .output; excluded from source cleanup scope.
- Evidence: No resolved static inbound import was found. The file is not a detected package or conventional entry point. Repository text contains possible string/name references: linkHealthService, linkHealthService.mjs.
- Caveats: Dynamic loading, reflection, external consumers, or incomplete framework detection can hide reachability. Possible string reachability prevents high-confidence deletion.

### CRT-036 — KEEP

- Location: `.output/server/chunks/_/logger.mjs`
- Category: `orphan-file`
- Potential size: 2 LOC / 2.2 KB
- Status reason: Generated Nitro server chunk under .output; excluded from source cleanup scope.
- Evidence: No resolved static inbound import was found. The file is not a detected package or conventional entry point. Repository text contains possible string/name references: logger, logger.mjs.
- Caveats: Dynamic loading, reflection, external consumers, or incomplete framework detection can hide reachability. Possible string reachability prevents high-confidence deletion.

### CRT-037 — KEEP

- Location: `.output/server/chunks/_/memoryCache.mjs`
- Category: `orphan-file`
- Potential size: 2 LOC / 294.8 KB
- Status reason: Generated Nitro server chunk under .output; excluded from source cleanup scope.
- Evidence: No resolved static inbound import was found. The file is not a detected package or conventional entry point. Repository text contains possible string/name references: memoryCache, memoryCache.mjs.
- Caveats: Dynamic loading, reflection, external consumers, or incomplete framework detection can hide reachability. Possible string reachability prevents high-confidence deletion.

### CRT-038 — KEEP

- Location: `.output/server/chunks/_/performance.mjs`
- Category: `orphan-file`
- Potential size: 2 LOC / 3.6 KB
- Status reason: Generated Nitro server chunk under .output; excluded from source cleanup scope.
- Evidence: No resolved static inbound import was found. The file is not a detected package or conventional entry point. Repository text contains possible string/name references: performance, performance.mjs.
- Caveats: Dynamic loading, reflection, external consumers, or incomplete framework detection can hide reachability. Possible string reachability prevents high-confidence deletion.

### CRT-039 — KEEP

- Location: `.output/server/chunks/_/searchLinkHealth.mjs`
- Category: `orphan-file`
- Potential size: 2 LOC / 3.9 KB
- Status reason: Generated Nitro server chunk under .output; excluded from source cleanup scope.
- Evidence: No resolved static inbound import was found. The file is not a detected package or conventional entry point. Repository text contains possible string/name references: searchLinkHealth, searchLinkHealth.mjs.
- Caveats: Dynamic loading, reflection, external consumers, or incomplete framework detection can hide reachability. Possible string reachability prevents high-confidence deletion.

### CRT-040 — KEEP

- Location: `.output/server/chunks/_/searchQualityService.mjs`
- Category: `orphan-file`
- Potential size: 2 LOC / 16.1 KB
- Status reason: Generated Nitro server chunk under .output; excluded from source cleanup scope.
- Evidence: No resolved static inbound import was found. The file is not a detected package or conventional entry point. Repository text contains possible string/name references: searchQualityService, searchQualityService.mjs.
- Caveats: Dynamic loading, reflection, external consumers, or incomplete framework detection can hide reachability. Possible string reachability prevents high-confidence deletion.

### CRT-041 — KEEP

- Location: `.output/server/chunks/_/shared.esm-bundler.mjs`
- Category: `orphan-file`
- Potential size: 2 LOC / 16.4 KB
- Status reason: Generated Nitro server chunk under .output; excluded from source cleanup scope.
- Evidence: No resolved static inbound import was found. The file is not a detected package or conventional entry point. Repository text contains possible string/name references: shared.esm-bundler, shared.esm-bundler.mjs.
- Caveats: Dynamic loading, reflection, external consumers, or incomplete framework detection can hide reachability. Possible string reachability prevents high-confidence deletion.

### CRT-042 — KEEP

- Location: `.output/server/chunks/nitro/nitro.mjs`
- Category: `orphan-file`
- Potential size: 2 LOC / 104.0 KB
- Status reason: Generated Nitro runtime entry under .output; excluded from source cleanup scope.
- Evidence: No resolved static inbound import was found. The file is not a detected package or conventional entry point. Repository text contains possible string/name references: nitro, nitro.mjs.
- Caveats: Dynamic loading, reflection, external consumers, or incomplete framework detection can hide reachability. Possible string reachability prevents high-confidence deletion.

### CRT-043 — KEEP

- Location: `.output/server/chunks/virtual/_commonjsHelpers.mjs`
- Category: `orphan-file`
- Potential size: 2 LOC / 206 B
- Status reason: Generated bundler helper under .output; excluded from source cleanup scope.
- Evidence: No resolved static inbound import was found. The file is not a detected package or conventional entry point. Repository text contains possible string/name references: _commonjsHelpers, _commonjsHelpers.mjs.
- Caveats: Dynamic loading, reflection, external consumers, or incomplete framework detection can hide reachability. Possible string reachability prevents high-confidence deletion.

### CRT-044 — KEEP

- Location: `.output/server/index.mjs`
- Category: `orphan-file`
- Potential size: 2 LOC / 252 B
- Status reason: Generated Nitro deployment entry under .output; excluded from source cleanup scope.
- Evidence: No resolved static inbound import was found. The file is not a detected package or conventional entry point. Repository text contains possible string/name references: .output/server/index, .output/server/index.mjs, index, index.mjs.
- Caveats: Dynamic loading, reflection, external consumers, or incomplete framework detection can hide reachability. Possible string reachability prevents high-confidence deletion.

### CRT-045 — KEEP

- Location: `composables/useAiAnalysis.ts`
- Category: `orphan-file`
- Potential size: 98 LOC / 2.4 KB
- Status reason: Nuxt auto-imported composable; used by pages/index/index.vue.
- Evidence: No resolved static inbound import was found. The file is not a detected package or conventional entry point.
- Caveats: Dynamic loading, reflection, external consumers, or incomplete framework detection can hide reachability.

### CRT-046 — KEEP

- Location: `composables/useDarkMode.ts`
- Category: `orphan-file`
- Potential size: 39 LOC / 1.1 KB
- Status reason: Nuxt auto-imported composable; used by app.vue.
- Evidence: No resolved static inbound import was found. The file is not a detected package or conventional entry point. Repository text contains possible string/name references: composables/useDarkMode, composables/useDarkMode.ts, useDarkMode, useDarkMode.ts.
- Caveats: Dynamic loading, reflection, external consumers, or incomplete framework detection can hide reachability. Possible string reachability prevents high-confidence deletion.

### CRT-047 — KEEP

- Location: `composables/useFavorites.ts`
- Category: `orphan-file`
- Potential size: 200 LOC / 5.6 KB
- Status reason: Nuxt auto-imported composable; used by app.vue, FavoritesDrawer and SearchResultList.
- Evidence: No resolved static inbound import was found. The file is not a detected package or conventional entry point. Repository text contains possible string/name references: useFavorites.
- Caveats: Dynamic loading, reflection, external consumers, or incomplete framework detection can hide reachability. Possible string reachability prevents high-confidence deletion.

### CRT-048 — KEEP

- Location: `composables/useLinkHealth.ts`
- Category: `orphan-file`
- Potential size: 83 LOC / 2.6 KB
- Status reason: Nuxt auto-imported composable; used by the home page and FavoritesDrawer.
- Evidence: No resolved static inbound import was found. The file is not a detected package or conventional entry point.
- Caveats: Dynamic loading, reflection, external consumers, or incomplete framework detection can hide reachability.

### CRT-049 — KEEP

- Location: `composables/useRecentSearches.ts`
- Category: `orphan-file`
- Potential size: 44 LOC / 1.3 KB
- Status reason: Nuxt auto-imported composable; used by pages/index/index.vue.
- Evidence: No resolved static inbound import was found. The file is not a detected package or conventional entry point.
- Caveats: Dynamic loading, reflection, external consumers, or incomplete framework detection can hide reachability.

### CRT-050 — KEEP

- Location: `composables/useSearch.ts`
- Category: `orphan-file`
- Potential size: 443 LOC / 12.9 KB
- Status reason: Nuxt auto-imported composable; it is the home-page search state machine.
- Evidence: No resolved static inbound import was found. The file is not a detected package or conventional entry point. Repository text contains possible string/name references: composables/useSearch, composables/useSearch.ts, useSearch, useSearch.ts.
- Caveats: Dynamic loading, reflection, external consumers, or incomplete framework detection can hide reachability. Possible string reachability prevents high-confidence deletion.

### CRT-051 — KEEP

- Location: `composables/useSettings.ts`
- Category: `orphan-file`
- Potential size: 250 LOC / 7.0 KB
- Status reason: Nuxt auto-imported composable; used by app.vue and the home page.
- Evidence: No resolved static inbound import was found. The file is not a detected package or conventional entry point. Repository text contains possible string/name references: composables/useSettings, composables/useSettings.ts, useSettings, useSettings.ts.
- Caveats: Dynamic loading, reflection, external consumers, or incomplete framework detection can hide reachability. Possible string reachability prevents high-confidence deletion.

### CRT-052 — KEEP

- Location: `composables/useToast.ts`
- Category: `orphan-file`
- Potential size: 26 LOC / 640 B
- Status reason: Nuxt auto-imported composable; used by app.vue and the home page.
- Evidence: No resolved static inbound import was found. The file is not a detected package or conventional entry point. Repository text contains possible string/name references: composables/useToast, composables/useToast.ts, useToast, useToast.ts.
- Caveats: Dynamic loading, reflection, external consumers, or incomplete framework detection can hide reachability. Possible string reachability prevents high-confidence deletion.

### CRT-053 — KEEP

- Location: `config/plugins.ts`
- Category: `orphan-file`
- Potential size: 50 LOC / 1.9 KB
- Status reason: Imported through Nuxt aliases by app, page, components and composables.
- Evidence: No resolved static inbound import was found. The file is not a detected package or conventional entry point. Repository text contains possible string/name references: config/plugins, plugins, plugins.ts.
- Caveats: Dynamic loading, reflection, external consumers, or incomplete framework detection can hide reachability. Possible string reachability prevents high-confidence deletion.

### CRT-054 — KEEP

- Location: `config/seoContent.ts`
- Category: `orphan-file`
- Potential size: 1,237 LOC / 74.9 KB
- Status reason: SEO route data imported by category, topic, guide and pan routes plus sitemap.
- Evidence: No resolved static inbound import was found. The file is not a detected package or conventional entry point. Repository text contains possible string/name references: config/seoContent, seoContent.
- Caveats: Dynamic loading, reflection, external consumers, or incomplete framework detection can hide reachability. Possible string reachability prevents high-confidence deletion.

### CRT-055 — KEEP

- Location: `config/seoDiscovery.ts`
- Category: `orphan-file`
- Potential size: 71 LOC / 2.3 KB
- Status reason: Imported by SeoDiscoverySection and its unit tests.
- Evidence: No resolved static inbound import was found. The file is not a detected package or conventional entry point. Repository text contains possible string/name references: config/seoDiscovery, seoDiscovery.
- Caveats: Dynamic loading, reflection, external consumers, or incomplete framework detection can hide reachability. Possible string reachability prevents high-confidence deletion.

### CRT-056 — KEEP

- Location: `nuxt.config.ts`
- Category: `orphan-file`
- Potential size: 89 LOC / 3.2 KB
- Status reason: Conventional Nuxt configuration entry point.
- Evidence: No resolved static inbound import was found. The file is not a detected package or conventional entry point. Repository text contains possible string/name references: nuxt.config, nuxt.config.ts.
- Caveats: Dynamic loading, reflection, external consumers, or incomplete framework detection can hide reachability. Possible string reachability prevents high-confidence deletion.

### CRT-057 — KEEP

- Location: `public/panhub-link-checker.user.js`
- Category: `orphan-file`
- Potential size: 569 LOC / 19.5 KB
- Status reason: Intentional public userscript linked from README and self-update metadata.
- Evidence: No resolved static inbound import was found. The file is not a detected package or conventional entry point. Repository text contains possible string/name references: panhub-link-checker.user, panhub-link-checker.user.js, public/panhub-link-checker.user, public/panhub-link-checker.user.js.
- Caveats: Dynamic loading, reflection, external consumers, or incomplete framework detection can hide reachability. Possible string reachability prevents high-confidence deletion.

### CRT-058 — KEEP

- Location: `server/api/ai/analyze.post.ts`
- Category: `orphan-file`
- Potential size: 197 LOC / 5.6 KB
- Status reason: Conventional Nuxt server API route.
- Evidence: No resolved static inbound import was found. The file is not a detected package or conventional entry point. Repository text contains possible string/name references: analyze.post.
- Caveats: Dynamic loading, reflection, external consumers, or incomplete framework detection can hide reachability. Possible string reachability prevents high-confidence deletion.

### CRT-059 — KEEP

- Location: `server/api/douban-hot.get.ts`
- Category: `orphan-file`
- Potential size: 203 LOC / 6.1 KB
- Status reason: Conventional Nuxt server API route used by the home page.
- Evidence: No resolved static inbound import was found. The file is not a detected package or conventional entry point. Repository text contains possible string/name references: douban-hot.get, douban-hot.get.ts.
- Caveats: Dynamic loading, reflection, external consumers, or incomplete framework detection can hide reachability. Possible string reachability prevents high-confidence deletion.

### CRT-060 — KEEP

- Location: `server/api/favorites/sync.get.ts`
- Category: `orphan-file`
- Potential size: 39 LOC / 1.1 KB
- Status reason: Conventional Nuxt server API route used by favorites sync.
- Evidence: No resolved static inbound import was found. The file is not a detected package or conventional entry point. Repository text contains possible string/name references: sync.get.
- Caveats: Dynamic loading, reflection, external consumers, or incomplete framework detection can hide reachability. Possible string reachability prevents high-confidence deletion.

### CRT-061 — KEEP

- Location: `server/api/favorites/sync.post.ts`
- Category: `orphan-file`
- Potential size: 100 LOC / 3.0 KB
- Status reason: Conventional Nuxt server API route used by favorites sync.
- Evidence: No resolved static inbound import was found. The file is not a detected package or conventional entry point. Repository text contains possible string/name references: sync.post.
- Caveats: Dynamic loading, reflection, external consumers, or incomplete framework detection can hide reachability. Possible string reachability prevents high-confidence deletion.

### CRT-062 — KEEP

- Location: `server/api/health.get.ts`
- Category: `orphan-file`
- Potential size: 17 LOC / 452 B
- Status reason: Conventional Nuxt health API route and deployment probe.
- Evidence: No resolved static inbound import was found. The file is not a detected package or conventional entry point. Repository text contains possible string/name references: health.get, health.get.ts.
- Caveats: Dynamic loading, reflection, external consumers, or incomplete framework detection can hide reachability. Possible string reachability prevents high-confidence deletion.

### CRT-063 — KEEP

- Location: `server/api/hot-search-stats.get.ts`
- Category: `orphan-file`
- Potential size: 42 LOC / 1.1 KB
- Status reason: Conventional Nuxt server API route.
- Evidence: No resolved static inbound import was found. The file is not a detected package or conventional entry point. Repository text contains possible string/name references: hot-search-stats.get.
- Caveats: Dynamic loading, reflection, external consumers, or incomplete framework detection can hide reachability. Possible string reachability prevents high-confidence deletion.

### CRT-064 — KEEP

- Location: `server/api/hot-searches.get.ts`
- Category: `orphan-file`
- Potential size: 34 LOC / 1.2 KB
- Status reason: Conventional Nuxt server API route used by HotSearchSection.
- Evidence: No resolved static inbound import was found. The file is not a detected package or conventional entry point. Repository text contains possible string/name references: hot-searches.get, hot-searches.get.ts, server/api/hot-searches.get, server/api/hot-searches.get.ts.
- Caveats: Dynamic loading, reflection, external consumers, or incomplete framework detection can hide reachability. Possible string reachability prevents high-confidence deletion.

### CRT-065 — KEEP

- Location: `server/api/hot-searches.post.ts`
- Category: `orphan-file`
- Potential size: 46 LOC / 1.4 KB
- Status reason: Conventional Nuxt server API route used to record hot searches.
- Evidence: No resolved static inbound import was found. The file is not a detected package or conventional entry point. Repository text contains possible string/name references: hot-searches.post, hot-searches.post.ts, server/api/hot-searches.post, server/api/hot-searches.post.ts.
- Caveats: Dynamic loading, reflection, external consumers, or incomplete framework detection can hide reachability. Possible string reachability prevents high-confidence deletion.

### CRT-066 — KEEP

- Location: `server/api/img.get.ts`
- Category: `orphan-file`
- Potential size: 81 LOC / 2.7 KB
- Status reason: Conventional Nuxt image proxy route used by Douban artwork.
- Evidence: No resolved static inbound import was found. The file is not a detected package or conventional entry point. Repository text contains possible string/name references: img.get, img.get.ts.
- Caveats: Dynamic loading, reflection, external consumers, or incomplete framework detection can hide reachability. Possible string reachability prevents high-confidence deletion.

### CRT-067 — KEEP

- Location: `server/api/link-health/query.post.ts`
- Category: `orphan-file`
- Potential size: 24 LOC / 908 B
- Status reason: Conventional Nuxt server API route used by useLinkHealth.
- Evidence: No resolved static inbound import was found. The file is not a detected package or conventional entry point. Repository text contains possible string/name references: query.post.
- Caveats: Dynamic loading, reflection, external consumers, or incomplete framework detection can hide reachability. Possible string reachability prevents high-confidence deletion.

### CRT-068 — KEEP

- Location: `server/api/link-health/report.post.ts`
- Category: `orphan-file`
- Potential size: 57 LOC / 1.6 KB
- Status reason: Conventional Nuxt server API route for link-health feedback.
- Evidence: No resolved static inbound import was found. The file is not a detected package or conventional entry point. Repository text contains possible string/name references: report.post.
- Caveats: Dynamic loading, reflection, external consumers, or incomplete framework detection can hide reachability. Possible string reachability prevents high-confidence deletion.

### CRT-069 — KEEP

- Location: `server/api/ops/quality.get.ts`
- Category: `orphan-file`
- Potential size: 23 LOC / 950 B
- Status reason: Conventional Nuxt operations API route for quality metrics.
- Evidence: No resolved static inbound import was found. The file is not a detected package or conventional entry point. Repository text contains possible string/name references: quality.get.
- Caveats: Dynamic loading, reflection, external consumers, or incomplete framework detection can hide reachability. Possible string reachability prevents high-confidence deletion.

### CRT-070 — KEEP

- Location: `server/api/plugin-health.get.ts`
- Category: `orphan-file`
- Potential size: 18 LOC / 558 B
- Status reason: Conventional Nuxt server API route for plugin health.
- Evidence: No resolved static inbound import was found. The file is not a detected package or conventional entry point. Repository text contains possible string/name references: plugin-health.get, plugin-health.get.ts.
- Caveats: Dynamic loading, reflection, external consumers, or incomplete framework detection can hide reachability. Possible string reachability prevents high-confidence deletion.

### CRT-071 — KEEP

- Location: `server/api/search-quality.post.ts`
- Category: `orphan-file`
- Potential size: 56 LOC / 1.8 KB
- Status reason: Conventional Nuxt API route used by the client quality beacon.
- Evidence: No resolved static inbound import was found. The file is not a detected package or conventional entry point. Repository text contains possible string/name references: search-quality.post.
- Caveats: Dynamic loading, reflection, external consumers, or incomplete framework detection can hide reachability. Possible string reachability prevents high-confidence deletion.

### CRT-072 — KEEP

- Location: `server/api/search.get.ts`
- Category: `orphan-file`
- Potential size: 183 LOC / 5.2 KB
- Status reason: Conventional Nuxt GET search route used by useSearch.
- Evidence: No resolved static inbound import was found. The file is not a detected package or conventional entry point. Repository text contains possible string/name references: search.get, search.get.ts.
- Caveats: Dynamic loading, reflection, external consumers, or incomplete framework detection can hide reachability. Possible string reachability prevents high-confidence deletion.

### CRT-073 — KEEP

- Location: `server/api/search.post.ts`
- Category: `orphan-file`
- Potential size: 152 LOC / 4.5 KB
- Status reason: Conventional Nuxt POST search route retained for API compatibility.
- Evidence: No resolved static inbound import was found. The file is not a detected package or conventional entry point. Repository text contains possible string/name references: search.post, search.post.ts.
- Caveats: Dynamic loading, reflection, external consumers, or incomplete framework detection can hide reachability. Possible string reachability prevents high-confidence deletion.

### CRT-074 — KEEP

- Location: `server/api/source-status.get.ts`
- Category: `orphan-file`
- Potential size: 72 LOC / 2.4 KB
- Status reason: Conventional Nuxt API route used by the source-status UI.
- Evidence: No resolved static inbound import was found. The file is not a detected package or conventional entry point. Repository text contains possible string/name references: source-status.get.
- Caveats: Dynamic loading, reflection, external consumers, or incomplete framework detection can hide reachability. Possible string reachability prevents high-confidence deletion.

### CRT-075 — KEEP

- Location: `server/core/services/d1DoubanHotCache.ts`
- Category: `orphan-file`
- Potential size: 96 LOC / 2.4 KB
- Status reason: Imported by the Douban API route and unit tests.
- Evidence: No resolved static inbound import was found. The file is not a detected package or conventional entry point. Repository text contains possible string/name references: d1DoubanHotCache, server/core/services/d1DoubanHotCache.
- Caveats: Dynamic loading, reflection, external consumers, or incomplete framework detection can hide reachability. Possible string reachability prevents high-confidence deletion.

### CRT-076 — KEEP

- Location: `server/core/utils/errors.ts`
- Category: `orphan-file`
- Potential size: 175 LOC / 3.6 KB
- Status reason: Imported by SearchService for ErrorCollector, classifyError and WarningInfo.
- Evidence: No resolved static inbound import was found. The file is not a detected package or conventional entry point. Repository text contains possible string/name references: errors, errors.ts.
- Caveats: Dynamic loading, reflection, external consumers, or incomplete framework detection can hide reachability. Possible string reachability prevents high-confidence deletion.

### CRT-077 — KEEP

- Location: `server/middleware/rateLimiter.ts`
- Category: `orphan-file`
- Potential size: 82 LOC / 2.4 KB
- Status reason: Conventional Nuxt server middleware; applies rate limits to API routes.
- Evidence: No resolved static inbound import was found. The file is not a detected package or conventional entry point. Repository text contains possible string/name references: rateLimiter, rateLimiter.ts, server/middleware/rateLimiter, server/middleware/rateLimiter.ts.
- Caveats: Dynamic loading, reflection, external consumers, or incomplete framework detection can hide reachability. Possible string reachability prevents high-confidence deletion.

### CRT-078 — KEEP

- Location: `server/middleware/seoHeaders.ts`
- Category: `orphan-file`
- Potential size: 28 LOC / 871 B
- Status reason: Conventional Nuxt server middleware; applies SEO response headers.
- Evidence: No resolved static inbound import was found. The file is not a detected package or conventional entry point.
- Caveats: Dynamic loading, reflection, external consumers, or incomplete framework detection can hide reachability.

### CRT-079 — REVIEW

- Location: `test/tg-parse-test.mjs`
- Category: `orphan-file`
- Potential size: 82 LOC / 2.6 KB
- Status reason: Not proven in a disposable copy.
- Evidence: No resolved static inbound import was found. The file is not a detected package or conventional entry point.
- Caveats: Dynamic loading, reflection, external consumers, or incomplete framework detection can hide reachability.

### CRT-080 — KEEP

- Location: `utils/autoLinkHealth.ts`
- Category: `orphan-file`
- Potential size: 186 LOC / 6.0 KB
- Status reason: Imported by the Cloudflare resource-sync Worker and covered by unit tests.
- Evidence: No resolved static inbound import was found. The file is not a detected package or conventional entry point. Repository text contains possible string/name references: autoLinkHealth, utils/autoLinkHealth.
- Caveats: Dynamic loading, reflection, external consumers, or incomplete framework detection can hide reachability. Possible string reachability prevents high-confidence deletion.

### CRT-081 — KEEP

- Location: `utils/favoritesVault.ts`
- Category: `orphan-file`
- Potential size: 149 LOC / 4.5 KB
- Status reason: Imported by the favorites composable and unit tests.
- Evidence: No resolved static inbound import was found. The file is not a detected package or conventional entry point. Repository text contains possible string/name references: favoritesVault, utils/favoritesVault.
- Caveats: Dynamic loading, reflection, external consumers, or incomplete framework detection can hide reachability. Possible string reachability prevents high-confidence deletion.

### CRT-082 — KEEP

- Location: `utils/groupCloudSearchItems.ts`
- Category: `orphan-file`
- Potential size: 101 LOC / 2.9 KB
- Status reason: Imported by the home page and unit tests.
- Evidence: No resolved static inbound import was found. The file is not a detected package or conventional entry point. Repository text contains possible string/name references: groupCloudSearchItems, utils/groupCloudSearchItems.
- Caveats: Dynamic loading, reflection, external consumers, or incomplete framework detection can hide reachability. Possible string reachability prevents high-confidence deletion.

### CRT-083 — KEEP

- Location: `vitest.config.ts`
- Category: `orphan-file`
- Potential size: 28 LOC / 561 B
- Status reason: Conventional Vitest configuration entry point.
- Evidence: No resolved static inbound import was found. The file is not a detected package or conventional entry point. Repository text contains possible string/name references: vitest.config, vitest.config.ts.
- Caveats: Dynamic loading, reflection, external consumers, or incomplete framework detection can hide reachability. Possible string reachability prevents high-confidence deletion.

### CRT-084 — KEEP

- Location: `cloudflare/pansou-container/src/index.ts:36`
- Category: `unused-export`
- Potential size: 0 LOC / 0 B
- Status reason: Cloudflare Containers class exported by name and referenced in wrangler durable-object configuration.
- Evidence: No reference to the exported symbol was found outside its defining file.
- Caveats: Public APIs, re-export patterns, generated declarations, templates, or external consumers may use it.

### CRT-085 — REVIEW

- Location: `cloudflare/resource-sync/src/catalog.ts:18`
- Category: `unused-export`
- Potential size: 0 LOC / 0 B
- Status reason: Not proven in a disposable copy.
- Evidence: No reference to the exported symbol was found outside its defining file.
- Caveats: Public APIs, re-export patterns, generated declarations, templates, or external consumers may use it.

### CRT-086 — KEEP

- Location: `composables/useAiAnalysis.ts:14`
- Category: `unused-export`
- Potential size: 0 LOC / 0 B
- Status reason: Nuxt auto-imported composable export used by pages/index/index.vue.
- Evidence: No reference to the exported symbol was found outside its defining file.
- Caveats: Public APIs, re-export patterns, generated declarations, templates, or external consumers may use it.

### CRT-087 — KEEP

- Location: `composables/useLinkHealth.ts:11`
- Category: `unused-export`
- Potential size: 0 LOC / 0 B
- Status reason: Nuxt auto-imported composable export used by the home page and FavoritesDrawer.
- Evidence: No reference to the exported symbol was found outside its defining file.
- Caveats: Public APIs, re-export patterns, generated declarations, templates, or external consumers may use it.

### CRT-088 — KEEP

- Location: `composables/useRecentSearches.ts:4`
- Category: `unused-export`
- Potential size: 0 LOC / 0 B
- Status reason: Nuxt auto-imported composable export used by pages/index/index.vue.
- Evidence: No reference to the exported symbol was found outside its defining file.
- Caveats: Public APIs, re-export patterns, generated declarations, templates, or external consumers may use it.

### CRT-089 — REVIEW

- Location: `composables/useSearch.ts:21`
- Category: `unused-export`
- Potential size: 0 LOC / 0 B
- Status reason: Not proven in a disposable copy.
- Evidence: No reference to the exported symbol was found outside its defining file.
- Caveats: Public APIs, re-export patterns, generated declarations, templates, or external consumers may use it.

### CRT-090 — REVIEW

- Location: `composables/useSearch.ts:33`
- Category: `unused-export`
- Potential size: 0 LOC / 0 B
- Status reason: Not proven in a disposable copy.
- Evidence: No reference to the exported symbol was found outside its defining file.
- Caveats: Public APIs, re-export patterns, generated declarations, templates, or external consumers may use it.

### CRT-091 — REVIEW

- Location: `config/doubanHot.ts:35`
- Category: `unused-export`
- Potential size: 0 LOC / 0 B
- Status reason: Not proven in a disposable copy.
- Evidence: No reference to the exported symbol was found outside its defining file.
- Caveats: Public APIs, re-export patterns, generated declarations, templates, or external consumers may use it.

### CRT-092 — REVIEW

- Location: `config/seoContent.ts:3`
- Category: `unused-export`
- Potential size: 0 LOC / 0 B
- Status reason: Not proven in a disposable copy.
- Evidence: No reference to the exported symbol was found outside its defining file.
- Caveats: Public APIs, re-export patterns, generated declarations, templates, or external consumers may use it.

### CRT-093 — REVIEW

- Location: `config/seoContent.ts:32`
- Category: `unused-export`
- Potential size: 0 LOC / 0 B
- Status reason: Not proven in a disposable copy.
- Evidence: No reference to the exported symbol was found outside its defining file.
- Caveats: Public APIs, re-export patterns, generated declarations, templates, or external consumers may use it.

### CRT-094 — REVIEW

- Location: `config/seoContent.ts:14`
- Category: `unused-export`
- Potential size: 0 LOC / 0 B
- Status reason: Not proven in a disposable copy.
- Evidence: No reference to the exported symbol was found outside its defining file.
- Caveats: Public APIs, re-export patterns, generated declarations, templates, or external consumers may use it.

### CRT-095 — REVIEW

- Location: `config/seoContent.ts:1`
- Category: `unused-export`
- Potential size: 0 LOC / 0 B
- Status reason: Not proven in a disposable copy.
- Evidence: No reference to the exported symbol was found outside its defining file.
- Caveats: Public APIs, re-export patterns, generated declarations, templates, or external consumers may use it.

### CRT-096 — REVIEW

- Location: `config/seoContent.ts:8`
- Category: `unused-export`
- Potential size: 0 LOC / 0 B
- Status reason: Not proven in a disposable copy.
- Evidence: No reference to the exported symbol was found outside its defining file.
- Caveats: Public APIs, re-export patterns, generated declarations, templates, or external consumers may use it.

### CRT-097 — KEEP

- Location: `config/seoContent.ts:1183`
- Category: `unused-export`
- Potential size: 0 LOC / 0 B
- Status reason: Imported through the Nuxt alias by four dynamic SEO routes.
- Evidence: No reference to the exported symbol was found outside its defining file.
- Caveats: Public APIs, re-export patterns, generated declarations, templates, or external consumers may use it.

### CRT-098 — KEEP

- Location: `config/seoContent.ts:969`
- Category: `unused-export`
- Potential size: 0 LOC / 0 B
- Status reason: Aggregated into the exported SEO page collection consumed by the sitemap.
- Evidence: No reference to the exported symbol was found outside its defining file.
- Caveats: Public APIs, re-export patterns, generated declarations, templates, or external consumers may use it.

### CRT-099 — REVIEW

- Location: `config/seoDiscovery.ts:1`
- Category: `unused-export`
- Potential size: 0 LOC / 0 B
- Status reason: Not proven in a disposable copy.
- Evidence: No reference to the exported symbol was found outside its defining file.
- Caveats: Public APIs, re-export patterns, generated declarations, templates, or external consumers may use it.

### CRT-100 — REVIEW

- Location: `server/core/cache/memoryCache.ts:3`
- Category: `unused-export`
- Potential size: 0 LOC / 0 B
- Status reason: Not proven in a disposable copy.
- Evidence: No reference to the exported symbol was found outside its defining file.
- Caveats: Public APIs, re-export patterns, generated declarations, templates, or external consumers may use it.

### CRT-101 — REVIEW

- Location: `server/core/cache/memoryCache.ts:10`
- Category: `unused-export`
- Potential size: 0 LOC / 0 B
- Status reason: Not proven in a disposable copy.
- Evidence: No reference to the exported symbol was found outside its defining file.
- Caveats: Public APIs, re-export patterns, generated declarations, templates, or external consumers may use it.

### CRT-102 — REVIEW

- Location: `server/core/cache/unifiedCache.ts:16`
- Category: `unused-export`
- Potential size: 0 LOC / 0 B
- Status reason: Not proven in a disposable copy.
- Evidence: No reference to the exported symbol was found outside its defining file.
- Caveats: Public APIs, re-export patterns, generated declarations, templates, or external consumers may use it.

### CRT-103 — REVIEW

- Location: `server/core/cache/unifiedCache.ts:148`
- Category: `unused-export`
- Potential size: 0 LOC / 0 B
- Status reason: Factory export has no repository reference; removal is small but should be proved with build and tests.
- Evidence: No reference to the exported symbol was found outside its defining file.
- Caveats: Public APIs, re-export patterns, generated declarations, templates, or external consumers may use it.

### CRT-104 — REVIEW

- Location: `server/core/plugins/fox4k.ts:94`
- Category: `unused-export`
- Potential size: 0 LOC / 0 B
- Status reason: No inbound import and not registered by SearchService; the whole legacy plugin file is a strong removal candidate pending proof.
- Evidence: No reference to the exported symbol was found outside its defining file.
- Caveats: Public APIs, re-export patterns, generated declarations, templates, or external consumers may use it.

### CRT-105 — REVIEW

- Location: `server/core/plugins/hdr4k.ts:80`
- Category: `unused-export`
- Potential size: 0 LOC / 0 B
- Status reason: No inbound import and not registered by SearchService; the whole legacy plugin file is a strong removal candidate pending proof.
- Evidence: No reference to the exported symbol was found outside its defining file.
- Caveats: Public APIs, re-export patterns, generated declarations, templates, or external consumers may use it.

### CRT-106 — REVIEW

- Location: `server/core/plugins/huban.ts:95`
- Category: `unused-export`
- Potential size: 0 LOC / 0 B
- Status reason: No inbound import and not registered by SearchService; the whole legacy plugin file is a strong removal candidate pending proof.
- Evidence: No reference to the exported symbol was found outside its defining file.
- Caveats: Public APIs, re-export patterns, generated declarations, templates, or external consumers may use it.

### CRT-107 — REVIEW

- Location: `server/core/plugins/muou.ts:66`
- Category: `unused-export`
- Potential size: 0 LOC / 0 B
- Status reason: No inbound import and not registered by SearchService; the whole legacy plugin file is a strong removal candidate pending proof.
- Evidence: No reference to the exported symbol was found outside its defining file.
- Caveats: Public APIs, re-export patterns, generated declarations, templates, or external consumers may use it.

### CRT-108 — REVIEW

- Location: `server/core/plugins/ouge.ts:101`
- Category: `unused-export`
- Potential size: 0 LOC / 0 B
- Status reason: No inbound import and not registered by SearchService; the whole legacy plugin file is a strong removal candidate pending proof.
- Evidence: No reference to the exported symbol was found outside its defining file.
- Caveats: Public APIs, re-export patterns, generated declarations, templates, or external consumers may use it.

### CRT-109 — REVIEW

- Location: `server/core/plugins/pan666.ts:42`
- Category: `unused-export`
- Potential size: 0 LOC / 0 B
- Status reason: No inbound import and not registered by SearchService; the whole legacy plugin file is a strong removal candidate pending proof.
- Evidence: No reference to the exported symbol was found outside its defining file.
- Caveats: Public APIs, re-export patterns, generated declarations, templates, or external consumers may use it.

### CRT-110 — REVIEW

- Location: `server/core/plugins/panyq.ts:10`
- Category: `unused-export`
- Potential size: 0 LOC / 0 B
- Status reason: No inbound import and not registered by SearchService; the whole legacy plugin file is a strong removal candidate pending proof.
- Evidence: No reference to the exported symbol was found outside its defining file.
- Caveats: Public APIs, re-export patterns, generated declarations, templates, or external consumers may use it.

### CRT-111 — REVIEW

- Location: `server/core/plugins/pluginHealth.ts:19`
- Category: `unused-export`
- Potential size: 0 LOC / 0 B
- Status reason: Not proven in a disposable copy.
- Evidence: No reference to the exported symbol was found outside its defining file.
- Caveats: Public APIs, re-export patterns, generated declarations, templates, or external consumers may use it.

### CRT-112 — REVIEW

- Location: `server/core/plugins/pluginHealth.ts:6`
- Category: `unused-export`
- Potential size: 0 LOC / 0 B
- Status reason: Not proven in a disposable copy.
- Evidence: No reference to the exported symbol was found outside its defining file.
- Caveats: Public APIs, re-export patterns, generated declarations, templates, or external consumers may use it.

### CRT-113 — REVIEW

- Location: `server/core/plugins/shandian.ts:39`
- Category: `unused-export`
- Potential size: 0 LOC / 0 B
- Status reason: No inbound import and not registered by SearchService; the whole legacy plugin file is a strong removal candidate pending proof.
- Evidence: No reference to the exported symbol was found outside its defining file.
- Caveats: Public APIs, re-export patterns, generated declarations, templates, or external consumers may use it.

### CRT-114 — REVIEW

- Location: `server/core/plugins/susu.ts:78`
- Category: `unused-export`
- Potential size: 0 LOC / 0 B
- Status reason: No inbound import and not registered by SearchService; the whole legacy plugin file is a strong removal candidate pending proof.
- Evidence: No reference to the exported symbol was found outside its defining file.
- Caveats: Public APIs, re-export patterns, generated declarations, templates, or external consumers may use it.

### CRT-115 — REVIEW

- Location: `server/core/plugins/torrentgalaxy.ts:54`
- Category: `unused-export`
- Potential size: 0 LOC / 0 B
- Status reason: No inbound import and not registered by SearchService; the whole legacy plugin file is a strong removal candidate pending proof.
- Evidence: No reference to the exported symbol was found outside its defining file.
- Caveats: Public APIs, re-export patterns, generated declarations, templates, or external consumers may use it.

### CRT-116 — REVIEW

- Location: `server/core/plugins/wanou.ts:95`
- Category: `unused-export`
- Potential size: 0 LOC / 0 B
- Status reason: No inbound import and not registered by SearchService; the whole legacy plugin file is a strong removal candidate pending proof.
- Evidence: No reference to the exported symbol was found outside its defining file.
- Caveats: Public APIs, re-export patterns, generated declarations, templates, or external consumers may use it.

### CRT-117 — REVIEW

- Location: `server/core/plugins/x1337x.ts:54`
- Category: `unused-export`
- Potential size: 0 LOC / 0 B
- Status reason: No inbound import and not registered by SearchService; the whole legacy plugin file is a strong removal candidate pending proof.
- Evidence: No reference to the exported symbol was found outside its defining file.
- Caveats: Public APIs, re-export patterns, generated declarations, templates, or external consumers may use it.

### CRT-118 — REVIEW

- Location: `server/core/plugins/zhizhen.ts:94`
- Category: `unused-export`
- Potential size: 0 LOC / 0 B
- Status reason: No inbound import and not registered by SearchService; the whole legacy plugin file is a strong removal candidate pending proof.
- Evidence: No reference to the exported symbol was found outside its defining file.
- Caveats: Public APIs, re-export patterns, generated declarations, templates, or external consumers may use it.

### CRT-119 — REVIEW

- Location: `server/core/services/aiAnalysisService.ts:10`
- Category: `unused-export`
- Potential size: 0 LOC / 0 B
- Status reason: Not proven in a disposable copy.
- Evidence: No reference to the exported symbol was found outside its defining file.
- Caveats: Public APIs, re-export patterns, generated declarations, templates, or external consumers may use it.

### CRT-120 — REVIEW

- Location: `server/core/services/d1DoubanHotCache.ts:9`
- Category: `unused-export`
- Potential size: 0 LOC / 0 B
- Status reason: Not proven in a disposable copy.
- Evidence: No reference to the exported symbol was found outside its defining file.
- Caveats: Public APIs, re-export patterns, generated declarations, templates, or external consumers may use it.

### CRT-121 — REVIEW

- Location: `server/core/services/doubanHotService.ts:262`
- Category: `unused-export`
- Potential size: 0 LOC / 0 B
- Status reason: Not proven in a disposable copy.
- Evidence: No reference to the exported symbol was found outside its defining file.
- Caveats: Public APIs, re-export patterns, generated declarations, templates, or external consumers may use it.

### CRT-122 — REVIEW

- Location: `server/core/services/doubanHotService.ts:281`
- Category: `unused-export`
- Potential size: 0 LOC / 0 B
- Status reason: Not proven in a disposable copy.
- Evidence: No reference to the exported symbol was found outside its defining file.
- Caveats: Public APIs, re-export patterns, generated declarations, templates, or external consumers may use it.

### CRT-123 — REVIEW

- Location: `server/core/services/index.ts:89`
- Category: `unused-export`
- Potential size: 0 LOC / 0 B
- Status reason: Monitoring helper has no repository reference; removal should be proved with API and unit checks.
- Evidence: No reference to the exported symbol was found outside its defining file.
- Caveats: Public APIs, re-export patterns, generated declarations, templates, or external consumers may use it.

### CRT-124 — REVIEW

- Location: `server/core/services/index.ts:82`
- Category: `unused-export`
- Potential size: 0 LOC / 0 B
- Status reason: Test reset helper has no repository reference; removal should be proved against all tests.
- Evidence: No reference to the exported symbol was found outside its defining file.
- Caveats: Public APIs, re-export patterns, generated declarations, templates, or external consumers may use it.

### CRT-125 — REVIEW

- Location: `server/core/services/searchQualityService.ts:73`
- Category: `unused-export`
- Potential size: 0 LOC / 0 B
- Status reason: Not proven in a disposable copy.
- Evidence: No reference to the exported symbol was found outside its defining file.
- Caveats: Public APIs, re-export patterns, generated declarations, templates, or external consumers may use it.

### CRT-126 — REVIEW

- Location: `server/core/services/searchQualityService.ts:17`
- Category: `unused-export`
- Potential size: 0 LOC / 0 B
- Status reason: Not proven in a disposable copy.
- Evidence: No reference to the exported symbol was found outside its defining file.
- Caveats: Public APIs, re-export patterns, generated declarations, templates, or external consumers may use it.

### CRT-127 — REVIEW

- Location: `server/core/services/searchQualityService.ts:25`
- Category: `unused-export`
- Potential size: 0 LOC / 0 B
- Status reason: Not proven in a disposable copy.
- Evidence: No reference to the exported symbol was found outside its defining file.
- Caveats: Public APIs, re-export patterns, generated declarations, templates, or external consumers may use it.

### CRT-128 — REVIEW

- Location: `server/core/services/searchQualityService.ts:36`
- Category: `unused-export`
- Potential size: 0 LOC / 0 B
- Status reason: Not proven in a disposable copy.
- Evidence: No reference to the exported symbol was found outside its defining file.
- Caveats: Public APIs, re-export patterns, generated declarations, templates, or external consumers may use it.

### CRT-129 — REVIEW

- Location: `server/core/services/searchQualityService.ts:43`
- Category: `unused-export`
- Potential size: 0 LOC / 0 B
- Status reason: Not proven in a disposable copy.
- Evidence: No reference to the exported symbol was found outside its defining file.
- Caveats: Public APIs, re-export patterns, generated declarations, templates, or external consumers may use it.

### CRT-130 — REVIEW

- Location: `server/core/services/searchQualityService.ts:398`
- Category: `unused-export`
- Potential size: 0 LOC / 0 B
- Status reason: Policy-cache reset helper has no repository reference; removal should be proved against quality tests.
- Evidence: No reference to the exported symbol was found outside its defining file.
- Caveats: Public APIs, re-export patterns, generated declarations, templates, or external consumers may use it.

### CRT-131 — REVIEW

- Location: `server/core/services/searchService.ts:55`
- Category: `unused-export`
- Potential size: 0 LOC / 0 B
- Status reason: Not proven in a disposable copy.
- Evidence: No reference to the exported symbol was found outside its defining file.
- Caveats: Public APIs, re-export patterns, generated declarations, templates, or external consumers may use it.

### CRT-132 — REVIEW

- Location: `server/core/services/searchService.ts:44`
- Category: `unused-export`
- Potential size: 0 LOC / 0 B
- Status reason: Not proven in a disposable copy.
- Evidence: No reference to the exported symbol was found outside its defining file.
- Caveats: Public APIs, re-export patterns, generated declarations, templates, or external consumers may use it.

### CRT-133 — REVIEW

- Location: `server/core/services/tg.ts:16`
- Category: `unused-export`
- Potential size: 0 LOC / 0 B
- Status reason: Not proven in a disposable copy.
- Evidence: No reference to the exported symbol was found outside its defining file.
- Caveats: Public APIs, re-export patterns, generated declarations, templates, or external consumers may use it.

### CRT-134 — REVIEW

- Location: `server/core/utils/errors.ts:25`
- Category: `unused-export`
- Potential size: 0 LOC / 0 B
- Status reason: Not proven in a disposable copy.
- Evidence: No reference to the exported symbol was found outside its defining file.
- Caveats: Public APIs, re-export patterns, generated declarations, templates, or external consumers may use it.

### CRT-135 — REVIEW

- Location: `server/core/utils/errors.ts:16`
- Category: `unused-export`
- Potential size: 0 LOC / 0 B
- Status reason: Not proven in a disposable copy.
- Evidence: No reference to the exported symbol was found outside its defining file.
- Caveats: Public APIs, re-export patterns, generated declarations, templates, or external consumers may use it.

### CRT-136 — REVIEW

- Location: `server/core/utils/errors.ts:4`
- Category: `unused-export`
- Potential size: 0 LOC / 0 B
- Status reason: Not proven in a disposable copy.
- Evidence: No reference to the exported symbol was found outside its defining file.
- Caveats: Public APIs, re-export patterns, generated declarations, templates, or external consumers may use it.

### CRT-137 — REVIEW

- Location: `server/core/utils/fetch.ts:15`
- Category: `unused-export`
- Potential size: 0 LOC / 0 B
- Status reason: Not proven in a disposable copy.
- Evidence: No reference to the exported symbol was found outside its defining file.
- Caveats: Public APIs, re-export patterns, generated declarations, templates, or external consumers may use it.

### CRT-138 — REVIEW

- Location: `server/core/utils/fetch.ts:177`
- Category: `unused-export`
- Potential size: 0 LOC / 0 B
- Status reason: Persistent fetch factory has no repository reference; removal should be proved with unit tests and build.
- Evidence: No reference to the exported symbol was found outside its defining file.
- Caveats: Public APIs, re-export patterns, generated declarations, templates, or external consumers may use it.

### CRT-139 — REVIEW

- Location: `server/core/utils/logger.ts:6`
- Category: `unused-export`
- Potential size: 0 LOC / 0 B
- Status reason: Not proven in a disposable copy.
- Evidence: No reference to the exported symbol was found outside its defining file.
- Caveats: Public APIs, re-export patterns, generated declarations, templates, or external consumers may use it.

### CRT-140 — REVIEW

- Location: `server/core/utils/logger.ts:24`
- Category: `unused-export`
- Potential size: 0 LOC / 0 B
- Status reason: Not proven in a disposable copy.
- Evidence: No reference to the exported symbol was found outside its defining file.
- Caveats: Public APIs, re-export patterns, generated declarations, templates, or external consumers may use it.

### CRT-141 — REVIEW

- Location: `server/core/utils/logger.ts:18`
- Category: `unused-export`
- Potential size: 0 LOC / 0 B
- Status reason: Not proven in a disposable copy.
- Evidence: No reference to the exported symbol was found outside its defining file.
- Caveats: Public APIs, re-export patterns, generated declarations, templates, or external consumers may use it.

### CRT-142 — REVIEW

- Location: `utils/autoLinkHealth.ts:1`
- Category: `unused-export`
- Potential size: 0 LOC / 0 B
- Status reason: Not proven in a disposable copy.
- Evidence: No reference to the exported symbol was found outside its defining file.
- Caveats: Public APIs, re-export patterns, generated declarations, templates, or external consumers may use it.

### CRT-143 — REVIEW

- Location: `utils/autoLinkHealth.ts:14`
- Category: `unused-export`
- Potential size: 0 LOC / 0 B
- Status reason: Not proven in a disposable copy.
- Evidence: No reference to the exported symbol was found outside its defining file.
- Caveats: Public APIs, re-export patterns, generated declarations, templates, or external consumers may use it.

### CRT-144 — REVIEW

- Location: `utils/favoritesVault.ts:7`
- Category: `unused-export`
- Potential size: 0 LOC / 0 B
- Status reason: Not proven in a disposable copy.
- Evidence: No reference to the exported symbol was found outside its defining file.
- Caveats: Public APIs, re-export patterns, generated declarations, templates, or external consumers may use it.

### CRT-145 — REVIEW

- Location: `utils/torrentMetadata.ts:154`
- Category: `unused-export`
- Potential size: 0 LOC / 0 B
- Status reason: Not proven in a disposable copy.
- Evidence: No reference to the exported symbol was found outside its defining file.
- Caveats: Public APIs, re-export patterns, generated declarations, templates, or external consumers may use it.

### CRT-146 — REVIEW

- Location: `utils/torrentMetadata.ts:84`
- Category: `unused-export`
- Potential size: 0 LOC / 0 B
- Status reason: Not proven in a disposable copy.
- Evidence: No reference to the exported symbol was found outside its defining file.
- Caveats: Public APIs, re-export patterns, generated declarations, templates, or external consumers may use it.

### CRT-147 — KEEP

- Location: `public/panhub-link-checker.user.js`
- Category: `duplicate-file`
- Potential size: 569 LOC / 19.5 KB
- Status reason: The second copy is generated build output; public/ remains the canonical source asset.
- Evidence: Normalized content matches .output/public/panhub-link-checker.user.js exactly.
- Caveats: Duplication is not proof that either implementation is unreachable. Callers may depend on separate module boundaries.

### CRT-148 — REVIEW

- Location: `test/unit/hot-search.test.ts:127`
- Category: `commented-code`
- Potential size: 4 LOC / 195 B
- Status reason: Not proven in a disposable copy.
- Evidence: A block of four or more code-like line comments was found.
- Caveats: The block may be documentation, an example, a protocol, or an intentional workaround.

## Cleanup approval checklist

No cleanup has been applied. To continue, select exact candidate IDs and review their paths, evidence, proof, and residual risk. Manifest or lockfile changes require separate explicit approval.

```text
Approved candidate IDs: ____________________
Approved files / manifest entries: __________
Approved verification commands: _____________
```

## Scope and limitations

- Scanned 214 source files, 22,491 LOC, 2.2 MB.
- Static analysis cannot prove absence of dynamic, reflective, operational, platform-specific, or external use.
- JavaScript/TypeScript and Python import resolution is intentionally conservative and does not implement every alias or framework convention.
- Unused dependencies and exports are leads only until project-native tooling and focused proof support removal.
- No project code, package command, or dependency was executed by this scanner.
- Commands ran in a disposable copy; the real project was not changed.
- The untouched baseline was not fully green because two tests depend on live Telegram content.
- The removal batch produced exactly the same two external-data failures and no new test failures, and the production build remained green.
- Strict SAFE TO REMOVE classification is withheld because the baseline did not fully pass.
