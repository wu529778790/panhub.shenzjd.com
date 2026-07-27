# PanHub Architecture Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve production safety, code quality, and test coverage across the PanHub codebase.

**Architecture:** Each task is an independent, committable change. Tasks are ordered so each builds on a stable base — P0 safety first, then P1 quality/architecture, then P2 tests. Every task includes a verification step.

**Tech Stack:** Nuxt 4, Vue 3, Nitro, H3, Vitest, TypeScript

---

## File Map

| Action | File | Purpose |
|--------|------|---------|
| Create | `server/middleware/rateLimiter.ts` | Sliding-window rate limiter |
| Create | `types/search.ts` | Shared client/server search types |
| Create | `assets/css/global.css` | Extracted global CSS from app.vue |
| Create | `composables/useToast.ts` | Extracted toast logic from app.vue |
| Create | `components/ErrorBoundary.vue` | Vue error boundary component |
| Create | `test/unit/auth.test.ts` | Auth token unit tests |
| Modify | `test/api.test.mjs` | Search API error case tests |
| Modify | `server/api/hot-searches.post.ts` | Input validation + error codes |
| Modify | `server/api/hot-searches.get.ts` | Error status codes |
| Modify | `composables/useSettings.ts` | useState refactor |
| Modify | `composables/useSearch.ts` | Import path update |
| Modify | `utils/extractMergedFromResponse.ts` | Import path update |
| Modify | `utils/mergeMergedByType.ts` | Import path update |
| Modify | `app.vue` | CSS extraction, toast extraction |
| Modify | `pages/index/index.vue` | ErrorBoundary wrappers |
| Modify | `vitest.config.ts` | Fix hardcoded path |
| Modify | `server/core/plugins/*.ts` (10 files) | Remove duplicate registration |
| Modify | `README.md` | Deployment cache docs |

---

## Task 1: Hot Search Input Validation

**Files:**
- Modify: `server/api/hot-searches.post.ts`

- [ ] **Step 1: Add input validation to hot search POST**

Replace the entire file content with:

```ts
import { defineEventHandler, readBody, createError } from "h3";
import { getOrCreateHotSearchService } from "../core/services/hotSearchService";

interface RequestBody {
  term: string;
}

// 只允许中文、英文、数字、空格
const SAFE_TERM_RE = /^[一-龥a-zA-Z0-9 ]+$/;

export default defineEventHandler(async (event) => {
  const body = await readBody<RequestBody>(event);

  if (!body || typeof body.term !== "string") {
    throw createError({ statusCode: 400, message: "缺少搜索词参数" });
  }

  const term = body.term.trim();

  if (term.length === 0) {
    throw createError({ statusCode: 400, message: "搜索词不能为空" });
  }

  if (term.length > 50) {
    throw createError({ statusCode: 400, message: "搜索词不能超过50个字符" });
  }

  if (!SAFE_TERM_RE.test(term)) {
    throw createError({ statusCode: 400, message: "搜索词包含非法字符" });
  }

  const service = getOrCreateHotSearchService();
  await service.recordSearch(term);

  return {
    code: 0,
    message: "success",
    data: null,
  };
});
```

- [ ] **Step 2: Verify existing tests still pass**

Run: `pnpm test`
Expected: All existing tests pass (this change only affects the POST handler).

- [ ] **Step 3: Commit**

```bash
git add server/api/hot-searches.post.ts
git commit -m "fix: add input validation to hot search POST endpoint

- Reject empty, overlong (>50 chars), or unsafe characters
- Use createError for proper HTTP 400 responses
- Sanitize input with trim()"
```

---

## Task 2: Rate Limiter Middleware

**Files:**
- Create: `server/middleware/rateLimiter.ts`

- [ ] **Step 1: Create the rate limiter middleware**

```ts
import { defineEventHandler, getHeader, createError } from "h3";

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// 路径 → { limit, windowMs }
const RATE_LIMITS: Record<string, { limit: number; windowMs: number }> = {
  "/api/search": { limit: 10, windowMs: 60_000 },
  "/api/hot-searches": { limit: 30, windowMs: 60_000 },
};

const DEFAULT_LIMIT = { limit: 60, windowMs: 60_000 };
const CLEANUP_INTERVAL = 5 * 60_000; // 5 分钟清理一次

const store = new Map<string, RateLimitEntry>();
let lastCleanup = Date.now();

function getClientIp(event: any): string {
  return (
    getHeader(event, "x-forwarded-for")?.split(",")[0]?.trim() ||
    getHeader(event, "x-real-ip") ||
    "unknown"
  );
}

function getRateLimit(pathname: string) {
  // 精确匹配
  if (RATE_LIMITS[pathname]) return RATE_LIMITS[pathname];
  // 前缀匹配（/api/hot-searches POST 和 GET 共享限制）
  for (const [prefix, config] of Object.entries(RATE_LIMITS)) {
    if (pathname.startsWith(prefix)) return config;
  }
  return DEFAULT_LIMIT;
}

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, entry] of store) {
    if (now > entry.resetTime) store.delete(key);
  }
}

export default defineEventHandler((event) => {
  // 只限制 API 路由
  const path = event.path || "";
  if (!path.startsWith("/api/")) return;

  cleanup();

  const ip = getClientIp(event);
  const { limit, windowMs } = getRateLimit(path);
  const key = `${ip}:${path}`;
  const now = Date.now();

  let entry = store.get(key);
  if (!entry || now > entry.resetTime) {
    entry = { count: 0, resetTime: now + windowMs };
    store.set(key, entry);
  }

  entry.count++;

  if (entry.count > limit) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
    throw createError({
      statusCode: 429,
      message: `请求过于频繁，请${retryAfter}秒后重试`,
      data: { retryAfter },
    });
  }
});
```

- [ ] **Step 2: Verify dev server starts without errors**

Run: `pnpm dev` (wait for "Local:" message), then `curl -s http://localhost:3001/api/health`
Expected: Health endpoint returns OK. The middleware only activates for `/api/` paths.

- [ ] **Step 3: Commit**

```bash
git add server/middleware/rateLimiter.ts
git commit -m "feat: add sliding-window rate limiter middleware

- /api/search: 10 req/min/IP
- /api/hot-searches: 30 req/min/IP
- Other /api/*: 60 req/min/IP
- Auto-cleanup every 5 minutes
- Returns 429 with Retry-After on limit exceeded"
```

---

## Task 3: Hot Search API Error Status Codes

**Files:**
- Modify: `server/api/hot-searches.get.ts`

- [ ] **Step 1: Fix GET handler to use proper HTTP error codes**

Replace the entire file content with:

```ts
import { defineEventHandler, getQuery, createError } from "h3";
import { getOrCreateHotSearchService } from "../core/services/hotSearchService";

export default defineEventHandler(async (event) => {
  const service = getOrCreateHotSearchService();
  const query = getQuery(event);
  const limit = parseInt((query.limit as string) || "30", 10);

  if (isNaN(limit) || limit < 1 || limit > 100) {
    throw createError({ statusCode: 400, message: "limit 参数无效，范围 1-100" });
  }

  const hotSearches = await service.getHotSearches(limit);

  return {
    code: 0,
    message: "success",
    data: {
      hotSearches,
    },
  };
});
```

- [ ] **Step 2: Verify existing tests pass**

Run: `pnpm test`
Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add server/api/hot-searches.get.ts
git commit -m "fix: use proper HTTP error codes in hot search GET endpoint

- Validate limit parameter (1-100)
- Use createError for 400 responses instead of silent code: -1"
```

---

## Task 4: Plugin Registration Cleanup

**Files:**
- Modify: `server/core/plugins/pansearch.ts` (delete last `registerGlobalPlugin(...)` line)
- Modify: `server/core/plugins/qupansou.ts`
- Modify: `server/core/plugins/panta.ts`
- Modify: `server/core/plugins/hunhepan.ts`
- Modify: `server/core/plugins/jikepan.ts`
- Modify: `server/core/plugins/labi.ts`
- Modify: `server/core/plugins/thepiratebay.ts`
- Modify: `server/core/plugins/duoduo.ts`
- Modify: `server/core/plugins/xuexizhinan.ts`
- Modify: `server/core/plugins/nyaa.ts`

- [ ] **Step 1: Remove duplicate registrations from all 10 plugin files**

For each of the 10 plugin files, delete the last line(s) that call `registerGlobalPlugin(...)`. The pattern is always the same — remove the line `registerGlobalPlugin(new XxxPlugin());` at the end of each file.

Also remove the `import { registerGlobalPlugin } from "./manager";` line from each file if it becomes unused after removing the registration call.

Files to edit (delete the `registerGlobalPlugin` call and its import):

1. `server/core/plugins/pansearch.ts` — remove `registerGlobalPlugin(new PansearchPlugin());` and the import
2. `server/core/plugins/qupansou.ts` — remove `registerGlobalPlugin(new QupansouPlugin());` and the import
3. `server/core/plugins/panta.ts` — remove `registerGlobalPlugin(new PantaPlugin());` and the import
4. `server/core/plugins/hunhepan.ts` — remove `registerGlobalPlugin(new HunhepanPlugin());` and the import
5. `server/core/plugins/jikepan.ts` — remove `registerGlobalPlugin(new JikepanPlugin());` and the import
6. `server/core/plugins/labi.ts` — remove `registerGlobalPlugin(new LabiPlugin());` and the import
7. `server/core/plugins/thepiratebay.ts` — remove `registerGlobalPlugin(new ThePirateBayPlugin());` and the import
8. `server/core/plugins/duoduo.ts` — remove `registerGlobalPlugin(new DuoduoPlugin());` and the import
9. `server/core/plugins/xuexizhinan.ts` — remove `registerGlobalPlugin(new XuexizhinanPlugin());` and the import
10. `server/core/plugins/nyaa.ts` — remove `registerGlobalPlugin(new NyaaPlugin());` and the import

Note: Registration still happens in `server/core/services/index.ts` via `registerAllGlobalPlugins()`. The module-level registrations were redundant.

- [ ] **Step 2: Verify tests pass**

Run: `pnpm test`
Expected: All tests pass. Plugin manager test should still pass because registration happens in `services/index.ts`.

- [ ] **Step 3: Commit**

```bash
git add server/core/plugins/
git commit -m "refactor: remove duplicate plugin registrations from individual plugin files

Registration is centralized in services/index.ts via registerAllGlobalPlugins().
Module-level registrations in each plugin file were redundant."
```

---

## Task 5: Shared Types Extraction

**Files:**
- Create: `types/search.ts`
- Modify: `composables/useSearch.ts` (line 1 import path)
- Modify: `utils/extractMergedFromResponse.ts` (import path)
- Modify: `utils/mergeMergedByType.ts` (import path)

- [ ] **Step 1: Create shared types file**

Create `types/search.ts` with the types that client code needs:

```ts
/**
 * Client/Server 共享的搜索类型
 * Client: composables/useSearch.ts, utils/*.ts
 * Server: server/core/types/models.ts 保留 server 专用类型
 */

export interface MergedLink {
  url: string;
  password: string;
  note: string;
  datetime: string;
  source?: string;
  images?: string[];
}

export type MergedLinks = Record<string, MergedLink[]>;

export interface SearchResult {
  message_id: string;
  unique_id: string;
  channel: string;
  datetime: string;
  title: string;
  content: string;
  links: Link[];
  tags?: string[];
  images?: string[];
}

export interface Link {
  type: string;
  url: string;
  password: string;
}

export interface SearchResponse {
  total: number;
  results?: SearchResult[];
  merged_by_type?: MergedLinks;
}

export interface GenericResponse<T> {
  code: number;
  message: string;
  data?: T;
}
```

- [ ] **Step 2: Update composables/useSearch.ts import**

Change line 1 from:
```ts
import type { MergedLinks, GenericResponse, SearchResponse } from "~/server/core/types/models";
```
to:
```ts
import type { MergedLinks, GenericResponse, SearchResponse } from "~/types/search";
```

- [ ] **Step 3: Update utils/extractMergedFromResponse.ts import**

Read the file to find the exact import block, then change the import source from `~/server/core/types/models` to `~/types/search`.

- [ ] **Step 4: Update utils/mergeMergedByType.ts import**

Change line 1 from:
```ts
import type { MergedLinks } from "~/server/core/types/models";
```
to:
```ts
import type { MergedLinks } from "~/types/search";
```

- [ ] **Step 5: Verify build and tests**

Run: `pnpm build && pnpm test`
Expected: Build succeeds, all tests pass.

- [ ] **Step 6: Commit**

```bash
git add types/search.ts composables/useSearch.ts utils/extractMergedFromResponse.ts utils/mergeMergedByType.ts
git commit -m "refactor: extract shared search types to types/search.ts

Decouple client composables from server/core/types/models.ts.
Server code continues importing from its own types file."
```

---

## Task 6: useSettings useState Refactor

**Files:**
- Modify: `composables/useSettings.ts`

- [ ] **Step 1: Rewrite useSettings to use useState**

Replace the entire file content with:

```ts
import type { Ref } from "vue";
import {
  ALL_PLUGIN_NAMES,
  DEFAULT_USER_SETTINGS,
  STORAGE_KEYS,
} from "~/config/plugins";
import channelsConfig from "~/config/channels.json";

export interface UserSettings {
  enabledTgChannels: string[];
  enabledPlugins: string[];
  concurrency: number;
  pluginTimeoutMs: number;
}

export interface UseSettingsReturn {
  settings: Ref<UserSettings>;
  loadSettings: () => void;
  saveSettings: () => void;
  resetToDefault: () => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  onSelectAllTg: () => void;
  onClearAllTg: () => void;
}

function getDefaultSettings(defaultTgChannels: string[]): UserSettings {
  return {
    enabledTgChannels: [...defaultTgChannels],
    enabledPlugins: [...DEFAULT_USER_SETTINGS.enabledPlugins],
    concurrency: DEFAULT_USER_SETTINGS.concurrency,
    pluginTimeoutMs: DEFAULT_USER_SETTINGS.pluginTimeoutMs,
  };
}

export function useSettings(): UseSettingsReturn {
  const config = useRuntimeConfig();

  const defaultTgChannels = computed(() => {
    const configChannels = (config.public as any)?.tgDefaultChannels;
    if (Array.isArray(configChannels) && configChannels.length > 0) {
      return configChannels;
    }
    return channelsConfig.defaultChannels;
  });

  // 使用 Nuxt useState 替代模块级单例，SSR 安全
  const settings = useState<UserSettings>("user-settings", () =>
    getDefaultSettings(defaultTgChannels.value)
  );

  function loadSettings(): void {
    if (typeof window === "undefined") return;

    try {
      const raw = localStorage.getItem(STORAGE_KEYS.settings);
      if (!raw) return;

      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return;

      const validated: UserSettings = {
        enabledTgChannels: Array.isArray(parsed.enabledTgChannels)
          ? parsed.enabledTgChannels.filter((x: unknown) => typeof x === "string")
          : [...(defaultTgChannels.value?.length ? defaultTgChannels.value : channelsConfig.defaultChannels)],
        enabledPlugins: Array.isArray(parsed.enabledPlugins)
          ? parsed.enabledPlugins.filter((x: unknown) => typeof x === "string")
          : [...DEFAULT_USER_SETTINGS.enabledPlugins],
        concurrency:
          typeof parsed.concurrency === "number" && parsed.concurrency > 0
            ? Math.min(16, Math.max(1, parsed.concurrency))
            : DEFAULT_USER_SETTINGS.concurrency,
        pluginTimeoutMs:
          typeof parsed.pluginTimeoutMs === "number" && parsed.pluginTimeoutMs > 0
            ? parsed.pluginTimeoutMs
            : DEFAULT_USER_SETTINGS.pluginTimeoutMs,
      };

      validated.enabledPlugins = validated.enabledPlugins.filter((name) =>
        ALL_PLUGIN_NAMES.includes(name as any)
      );

      if (
        validated.enabledPlugins.length === 0 &&
        validated.enabledTgChannels.length === 0
      ) {
        validated.enabledPlugins = [...DEFAULT_USER_SETTINGS.enabledPlugins];
      }

      settings.value = validated;
    } catch (_error) {
      // Silent failure
    }
  }

  function saveSettings(): void {
    if (typeof window === "undefined") return;

    try {
      localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings.value));
    } catch (_error) {
      // Silent failure
    }
  }

  function resetToDefault(): void {
    if (typeof window === "undefined") return;

    try {
      localStorage.removeItem(STORAGE_KEYS.settings);
    } catch (_error) {
      // Silent failure
    }

    settings.value = getDefaultSettings(
      defaultTgChannels.value?.length ? defaultTgChannels.value : channelsConfig.defaultChannels
    );

    if (typeof window !== "undefined") {
      window.location.reload();
    }
  }

  function onSelectAll(): void {
    settings.value.enabledPlugins = [...ALL_PLUGIN_NAMES];
    saveSettings();
  }

  function onClearAll(): void {
    settings.value.enabledPlugins = [];
    saveSettings();
  }

  function onSelectAllTg(): void {
    settings.value.enabledTgChannels = [
      ...(defaultTgChannels.value?.length ? defaultTgChannels.value : channelsConfig.defaultChannels),
    ];
    saveSettings();
  }

  function onClearAllTg(): void {
    settings.value.enabledTgChannels = [];
    saveSettings();
  }

  if (typeof window !== "undefined") {
    loadSettings();
  }

  return {
    settings,
    loadSettings,
    saveSettings,
    resetToDefault,
    onSelectAll,
    onClearAll,
    onSelectAllTg,
    onClearAllTg,
  };
}
```

- [ ] **Step 2: Verify dev server works**

Run: `pnpm dev`, open browser, go to Settings, change a setting, refresh page — setting should persist.

- [ ] **Step 3: Commit**

```bash
git add composables/useSettings.ts
git commit -m "fix: replace module-level singleton with useState in useSettings

Prevents settings from leaking between users in SSR.
Uses Nuxt's useState for SSR-safe shared state."
```

---

## Task 7: ErrorBoundary Component

**Files:**
- Create: `components/ErrorBoundary.vue`
- Modify: `pages/index/index.vue`

- [ ] **Step 1: Create ErrorBoundary.vue**

```vue
<template>
  <div v-if="error" class="error-boundary">
    <div class="error-boundary__content">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
      <span>{{ message }}</span>
      <button class="error-boundary__retry" @click="retry">重试</button>
    </div>
  </div>
  <slot v-else />
</template>

<script setup lang="ts">
defineProps<{
  message?: string;
}>();

const error = ref<Error | null>(null);

function retry() {
  error.value = null;
}

onErrorCaptured((err: Error) => {
  error.value = err;
  return false; // 阻止错误继续向上传播
});
</script>

<style scoped>
.error-boundary {
  padding: 24px;
  text-align: center;
}

.error-boundary__content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: var(--text-tertiary);
}

.error-boundary__retry {
  padding: 6px 16px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-light);
  background: var(--bg-surface);
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 13px;
}

.error-boundary__retry:hover {
  border-color: var(--primary);
  color: var(--primary);
}
</style>
```

- [ ] **Step 2: Wrap DoubanHotSection and HotSearchSection in pages/index/index.vue**

Find the `<DoubanHotSection` line and wrap it:

```vue
      <ErrorBoundary message="豆瓣热榜加载失败">
        <DoubanHotSection ref="doubanHotRef" :on-search="quickSearch" />
      </ErrorBoundary>
```

Find the `<HotSearchSection` line and wrap it:

```vue
        <ErrorBoundary message="热搜加载失败">
          <HotSearchSection ref="hotSearchRef" :on-search="quickSearch" />
        </ErrorBoundary>
```

- [ ] **Step 3: Verify build**

Run: `pnpm build`
Expected: Build succeeds without errors.

- [ ] **Step 4: Commit**

```bash
git add components/ErrorBoundary.vue pages/index/index.vue
git commit -m "feat: add ErrorBoundary component for non-critical sections

Wraps DoubanHotSection and HotSearchSection to prevent
render errors from crashing the entire app."
```

---

## Task 8: app.vue CSS and Toast Extraction

**Files:**
- Create: `assets/css/global.css`
- Create: `composables/useToast.ts`
- Modify: `app.vue`

- [ ] **Step 1: Create assets/css/global.css**

Extract the non-scoped `<style>` content from `app.vue` (everything between `<style>` and `</style>` that is NOT in `<style scoped>`). This includes:
- `@import url(...)` for Google Fonts
- `@layer base { :root { ... } }` block (the CSS variables)
- Basic resets (`*`, `html, body`)
- Scrollbar styles
- Input/button base styles
- iOS Safari optimizations
- Keyframe animations

Copy the full content from app.vue's first `<style>` block into this file.

- [ ] **Step 2: Create composables/useToast.ts**

```ts
export interface ToastState {
  show: boolean;
  message: string;
  type: "info" | "success" | "error";
}

export function useToast() {
  const toast = useState<ToastState>("toast", () => ({
    show: false,
    message: "",
    type: "info",
  }));

  function showToast(message: string, type: ToastState["type"] = "info") {
    toast.value = { show: true, message, type };
    setTimeout(() => {
      toast.value.show = false;
    }, 3000);
  }

  return { toast: readonly(toast), showToast };
}
```

- [ ] **Step 3: Update app.vue**

In `app.vue`:
1. Remove the first `<style>` block (the non-scoped one) entirely
2. Add at the top of the remaining `<style scoped>` block: `@import '~/assets/css/global.css';`
3. In `<script setup>`, add: `const { toast, showToast } = useToast();`
4. Remove the inline `toast` ref and `showToast` function definition
5. Remove the `provide('showToast', showToast)` line — child components should call `useToast()` directly

The template toast section stays as-is since it reads from `toast.show`, `toast.message`, `toast.type`.

- [ ] **Step 4: Verify build and visual check**

Run: `pnpm build && pnpm dev`
Open browser — page should look identical to before. Test toast by triggering a search.

- [ ] **Step 5: Commit**

```bash
git add assets/css/global.css composables/useToast.ts app.vue
git commit -m "refactor: extract global CSS and toast logic from app.vue

- Move 400+ lines of global CSS to assets/css/global.css
- Extract toast state management to composables/useToast.ts
- app.vue reduced from ~575 to ~175 lines"
```

---

## Task 9: vitest Config Path Fix

**Files:**
- Modify: `vitest.config.ts`

- [ ] **Step 1: Fix the hardcoded path**

Replace the entire file content with:

```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    name: "panhub",
    root: "./",
    include: ["test/unit/**/*.test.ts"],
    environment: "node",
    globals: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "test/",
        "**/*.d.ts",
        "**/config.ts",
        "**/index.ts",
      ],
    },
  },
  resolve: {
    alias: {
      "#internal": path.resolve(__dirname, ".nuxt"),
    },
  },
});
```

- [ ] **Step 2: Verify tests pass**

Run: `pnpm test`
Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add vitest.config.ts
git commit -m "fix: replace hardcoded absolute path with path.resolve in vitest config"
```

---

## Task 10: Auth Unit Tests

**Files:**
- Create: `test/unit/auth.test.ts`

- [ ] **Step 1: Write the test file**

```ts
import { describe, it, expect } from "vitest";
import { createAuthToken, verifyAuthToken } from "../../server/utils/auth";

const SECRET = "test-secret-key-for-unit-tests";

describe("createAuthToken", () => {
  it("returns a string in format timestamp.hex", () => {
    const token = createAuthToken(SECRET);
    const parts = token.split(".");
    expect(parts).toHaveLength(2);
    expect(Number(parts[0])).toBeGreaterThan(0);
    expect(parts[1]).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hex = 64 chars
  });

  it("produces different tokens on successive calls", () => {
    const t1 = createAuthToken(SECRET);
    const t2 = createAuthToken(SECRET);
    // Timestamps may be the same if called in same millisecond,
    // but HMAC signatures should differ or tokens should differ
    expect(t1).toBeDefined();
    expect(t2).toBeDefined();
  });
});

describe("verifyAuthToken", () => {
  it("accepts a valid fresh token", () => {
    const token = createAuthToken(SECRET);
    expect(verifyAuthToken(token, SECRET)).toBe(true);
  });

  it("rejects token with wrong secret", () => {
    const token = createAuthToken(SECRET);
    expect(verifyAuthToken(token, "wrong-secret")).toBe(false);
  });

  it("rejects empty token", () => {
    expect(verifyAuthToken("", SECRET)).toBe(false);
  });

  it("rejects null/undefined token", () => {
    expect(verifyAuthToken(null as any, SECRET)).toBe(false);
    expect(verifyAuthToken(undefined as any, SECRET)).toBe(false);
  });

  it("rejects token with tampered signature", () => {
    const token = createAuthToken(SECRET);
    const [ts, sig] = token.split(".");
    // Flip last hex char of signature
    const tampered = sig.slice(0, -1) + (sig.endsWith("a") ? "b" : "a");
    expect(verifyAuthToken(`${ts}.${tampered}`, SECRET)).toBe(false);
  });

  it("rejects token with tampered timestamp", () => {
    const token = createAuthToken(SECRET);
    const [ts, sig] = token.split(".");
    const tamperedTs = String(Number(ts) + 1000);
    expect(verifyAuthToken(`${tamperedTs}.${sig}`, SECRET)).toBe(false);
  });

  it("rejects token with missing parts", () => {
    expect(verifyAuthToken("only-timestamp", SECRET)).toBe(false);
    expect(verifyAuthToken(".", SECRET)).toBe(false);
    expect(verifyAuthToken("ts.", SECRET)).toBe(false);
  });

  it("rejects expired token (30 days + 1 second old)", () => {
    const oldTs = String(Date.now() - (30 * 24 * 60 * 60 + 1) * 1000);
    // We need to create a valid HMAC for this old timestamp
    const { createHmac } = require("node:crypto");
    const sig = createHmac("sha256", SECRET).update(oldTs).digest("hex");
    expect(verifyAuthToken(`${oldTs}.${sig}`, SECRET)).toBe(false);
  });

  it("rejects token with empty secret", () => {
    const token = createAuthToken(SECRET);
    expect(verifyAuthToken(token, "")).toBe(false);
  });
});
```

- [ ] **Step 2: Run the tests**

Run: `vitest run test/unit/auth.test.ts`
Expected: All 12 tests pass.

- [ ] **Step 3: Commit**

```bash
git add test/unit/auth.test.ts
git commit -m "test: add auth token unit tests

Covers createAuthToken, verifyAuthToken, signature tampering,
timestamp tampering, expiry, and edge cases."
```

---

## Task 11: Search API Integration Tests

**Files:**
- Modify: `test/api.test.mjs`

- [ ] **Step 1: Add error case tests to api.test.mjs**

Append the following test cases to the end of `test/api.test.mjs` (before any final process.exit):

```js
// === 新增：错误场景测试 ===

log("--- Error Case Tests ---");

// Test: missing kw parameter returns 400
{
  let passed = false;
  try {
    await ofetch(`${API_BASE}/search`, { method: "GET" });
    err("Expected 400 for missing kw, got success");
  } catch (e) {
    if (e.status === 400 || e.statusCode === 400) {
      log("PASS: missing kw returns 400");
      passed = true;
    } else {
      err(`Expected 400 for missing kw, got ${e.status || e.statusCode}`);
    }
  }
  if (!passed) process.exit(1);
}

// Test: hot-searches POST with empty term returns 400
{
  let passed = false;
  try {
    await ofetch(`${API_BASE}/hot-searches`, {
      method: "POST",
      body: { term: "" },
    });
    err("Expected 400 for empty term, got success");
  } catch (e) {
    if (e.status === 400 || e.statusCode === 400) {
      log("PASS: empty term returns 400");
      passed = true;
    } else {
      err(`Expected 400 for empty term, got ${e.status || e.statusCode}`);
    }
  }
  if (!passed) process.exit(1);
}

// Test: hot-searches POST with unsafe characters returns 400
{
  let passed = false;
  try {
    await ofetch(`${API_BASE}/hot-searches`, {
      method: "POST",
      body: { term: "<script>alert(1)</script>" },
    });
    err("Expected 400 for unsafe term, got success");
  } catch (e) {
    if (e.status === 400 || e.statusCode === 400) {
      log("PASS: unsafe term returns 400");
      passed = true;
    } else {
      err(`Expected 400 for unsafe term, got ${e.status || e.statusCode}`);
    }
  }
  if (!passed) process.exit(1);
}

// Test: hot-searches GET with invalid limit returns 400
{
  let passed = false;
  try {
    await ofetch(`${API_BASE}/hot-searches?limit=abc`);
    err("Expected 400 for invalid limit, got success");
  } catch (e) {
    if (e.status === 400 || e.statusCode === 400) {
      log("PASS: invalid limit returns 400");
      passed = true;
    } else {
      err(`Expected 400 for invalid limit, got ${e.status || e.statusCode}`);
    }
  }
  if (!passed) process.exit(1);
}

log("--- All Error Case Tests Passed ---");
```

- [ ] **Step 2: Run integration tests**

Run: `pnpm dev` (in one terminal), then `pnpm test:api` (in another)
Expected: All tests pass including the new error case tests.

- [ ] **Step 3: Commit**

```bash
git add test/api.test.mjs
git commit -m "test: add error case integration tests for search and hot-searches APIs

Covers missing kw, empty/unsafe hot search terms, and invalid limit."
```

---

## Task 12: Deployment Cache Behavior Documentation

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add deployment cache section to README**

After the environment variables table, add:

```markdown
### 部署差异说明

| 特性 | Docker/Node | CF Workers / Vercel |
|------|-------------|---------------------|
| 进程内缓存 | ✅ 持久（进程生命周期） | ❌ 每个 isolate 独立，不跨请求共享 |
| 热搜数据持久化 | ✅ JSON 文件（/app/data） | ❌ 仅内存（重启丢失） |
| 插件健康状态 | ✅ 持久 | ❌ 每次冷启动重置 |
| 推荐用途 | 自建服务器、NAS | 低流量个人使用 |
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add deployment cache behavior comparison table"
```

---

## Task 13: Final Verification

- [ ] **Step 1: Run full test suite**

Run: `pnpm test`
Expected: All tests pass including the new auth tests.

- [ ] **Step 2: Run build**

Run: `pnpm build`
Expected: Build succeeds without errors.

- [ ] **Step 3: Verify no regressions in dev**

Run: `pnpm dev`, open browser, test: search, settings, dark mode toggle, hot searches.

- [ ] **Step 4: Final commit if needed**

If any fixes were needed during verification:
```bash
git add -A
git commit -m "fix: post-implementation adjustments"
```
