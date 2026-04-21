# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PanHub is a Nuxt 4 web application that aggregates search results from Telegram channels and external plugin sites to find cloud storage resources (Aliyun, Quark, Baidu, 115, Xunlei, etc.). It supports priority-based batch processing, unified LRU caching with namespaces, JSON file hot search persistence (with memory fallback), and deploys to Cloudflare Workers (default), Vercel, or Docker.

## Package Manager

`pnpm` (lockfile: `pnpm-lock.yaml`). Always use `pnpm install`.

## Development Commands

```bash
pnpm dev                  # Start dev server
pnpm build                # Production build
pnpm preview              # Preview production build
pnpm test                 # Run all unit tests (Vitest)
pnpm test:watch           # Tests in watch mode
pnpm test:coverage        # Coverage reports (V8)
pnpm test:api             # API integration tests
vitest run test/unit/memoryCache.test.ts   # Run a single test file
vitest run -t "test name pattern"          # Run tests matching a name
pnpm deploy:cf            # Deploy to Cloudflare Workers
```

## Architecture

### Search Flow (Two-Tier)

1. **Client** (`composables/useSearch.ts`): Manages search state, batching, pause/continue, fast/deep phases. Calls `/api/search` and `/api/search.post`.
2. **Server** (`server/core/services/searchService.ts`): Orchestrates concurrent searches across TG channels and plugins with priority batching, caching, timeout control, and plugin health checking.

**Fast Search**: First batch of priority TG channels + plugins returns immediately.  
**Deep Search**: Remaining channels/plugins continue loading in batches.

### Server Core (`server/core/`)

- **`services/searchService.ts`**: Main orchestrator. Uses `p-limit` for concurrency, `UnifiedCache` for caching, `PluginHealthChecker` to skip unhealthy plugins.
- **`services/tg.ts`**: Telegram channel post fetching with Cheerio HTML parsing.
- **`services/hotSearchService.ts`** + **`hotSearchStore.ts`** / **`jsonFileHotSearchStore.ts`** / **`memoryHotSearchStore.ts`**: Hot search persistence with adapter pattern — JSON file (Docker/local) or memory (serverless).
- **`services/doubanHotService.ts`**: Douban hot list fetching.
- **`cache/unifiedCache.ts`**: Namespaced cache wrapper around `MemoryCache`. Namespaces: `TG_SEARCH`, `PLUGIN_SEARCH`, `HOT_SEARCH`. Cache keys: `tg:${keyword}:${channels}`, `plugin:${keyword}:${plugins}`.
- **`cache/memoryCache.ts`**: LRU cache with TTL expiration and memory monitoring.
- **`plugins/manager.ts`**: Plugin registry (`BaseAsyncPlugin` base class, global registry). Each plugin implements `AsyncSearchPlugin` interface.
- **`plugins/*.ts`**: ~20 search plugins (pansearch, qupansou, panta, etc.).
- **`plugins/pluginHealth.ts`**: Tracks plugin failure rates, auto-skips unhealthy plugins.
- **`utils/fetch.ts`**: Network wrapper with retry/timeout. **`utils/searchKeyword.ts`**: Builds keyword variants for deep search. **`utils/errors.ts`**: Error classification and `ErrorCollector`. **`utils/logger.ts`**: Logging.
- **`types/models.ts`**: Core interfaces — `SearchResult`, `MergedLink`, `MergedLinks`, `SearchResponse`, `SearchRequest`.

### Client-Side

- **`app.vue`**: Single-page app with header, search box, results, hot searches, Douban section, settings drawer.
- **`composables/useSearch.ts`**: Search state machine (loading → deepLoading → done), with pause/resume.
- **`composables/useSettings.ts`**: User settings (enabled plugins, TG channels, concurrency, timeout).
- **`composables/useAuth.ts`**: Password gate — calls `/api/auth/status` and `/api/auth/unlock`.
- **`utils/extractMergedFromResponse.ts`** + **`utils/mergeMergedByType.ts`**: Client-side result merging helpers.
- **Components**: `SearchBox`, `ResultGroup`, `ResultHeader`, `PasswordGate`, `HotSearchSection`, `DoubanHotSection`, `SettingsDrawer`.

### Configuration (`config/`)

- **`channels.json`**: TG channel lists (`priorityChannels`, `defaultChannels`), concurrency, timeouts, cache TTL. Loaded into `nuxt.config.ts` runtimeConfig.
- **`plugins.ts`**: Plugin names (`ALL_PLUGIN_NAMES`), platform info (`PLATFORM_INFO` with colors/icons), `DEFAULT_USER_SETTINGS`, `STORAGE_KEYS`.
- **`doubanHot.ts`**: Douban API configuration.

### Authentication

Optional password gate controlled by `SEARCH_PASSWORD` env var. When set, `/api/auth/status` returns `locked: true`, and users must POST to `/api/auth/unlock` with the password to receive a cookie. The cookie is checked on `/api/search` routes.

## API Routes (`server/api/`)

All routes use the `name.method.ts` convention (e.g., `search.get.ts`, `hot-searches.post.ts`).

Key routes: `search.get.ts`/`search.post.ts`, `hot-searches.get.ts`/`hot-searches.post.ts`, `auth/status.get.ts`/`auth/unlock.post.ts`, `douban-hot.get.ts`, `img.get.ts` (image proxy), `health.get.ts`, `plugin-health.get.ts`.

Route rules in `nuxt.config.ts` disable caching for all API routes (SWR 3600 only on `/**` catch-all).

## Deployment

- **Cloudflare Workers** (default): `wrangler.toml` with `nodejs_compat` flag. `pnpm deploy:cf` or `wrangler deploy`.
- **Vercel**: Auto-detected via `VERCEL` env var. Sets `nitro.preset: "vercel"`.
- **Docker**: `Dockerfile` uses `node:20-alpine`, builds with `NITRO_PRESET=node-server`. Data dir `/app/data` for JSON hot search persistence. CI builds push to GHCR and Docker Hub.
- **Nitro preset**: Auto-detected via `NITRO_PRESET` env var or platform detection. Defaults to `cloudflare-module`.

## CI/CD (`.github/workflows/`)

- **`docker-image.yml`**: Builds and pushes Docker image on push to main/dev. Publishes to GHCR and Docker Hub (if secrets configured).
- **`sync-upstream.yml`**: Daily cron (03:00 UTC) merges from upstream `main` into fork's default branch.

## Testing

- Framework: Vitest with Node environment, globals enabled.
- Config: `vitest.config.ts` — includes `test/unit/**/*.test.ts`, alias `#internal` → `.nuxt`.
- Coverage: V8 provider, excludes `node_modules/`, `test/`, `*.d.ts`, config/index files.
- Run `pnpm test` before committing changes to `server/core/`.

## Conventions

- Vue composables: `use` prefix (`useSearch`, `useSettings`, `useAuth`).
- Server routes: `name.get.ts` / `name.post.ts` under `server/api/`.
- Unit tests: `test/unit/*.test.ts`.
- Integration tests: `test/*.mjs`.
- Code style: 2-space indent, semicolons, double quotes.

## Environment Variables

- `SEARCH_PASSWORD`: Optional password for search access. Empty = no password gate.
- `LOG_LEVEL`: Logging level (default: `info`).
- `NITRO_PRESET`: Deployment preset (auto-detect if unset).
- `PORT`: Server port (default: `3000`).
- `VERCEL`: Auto-detected for Vercel deployment.
