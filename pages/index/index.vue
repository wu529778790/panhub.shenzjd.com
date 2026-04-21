<template>
  <div class="home">
    <!-- 英雄区域 + 热门搜索 -->
    <div class="hero-row">
      <div class="hero-noise" aria-hidden="true" />
      <header class="hero">
        <div class="hero-accent" aria-hidden="true" />
        <div class="hero-content">
          <div class="hero-badge">PanHub 搜索聚合引擎</div>
          <h1 class="hero-title">
            <span class="hero-title-line">一键检索</span>
            <span class="hero-title-line hero-title-line--accent">全网网盘资源</span>
          </h1>
          <p class="hero-description">
            聚合阿里云盘、夸克、百度网盘、115、迅雷等平台 · 快速、直达、少打扰
          </p>
          <ul class="hero-features" role="list">
            <li class="hero-feature">实时聚合</li>
            <li class="hero-feature">多平台覆盖</li>
            <li class="hero-feature">结果去重</li>
          </ul>
        </div>
        <div class="hero-shape" aria-hidden="true" />
      </header>
      <aside class="hero-aside">
        <HotSearchSection ref="hotSearchRef" :on-search="quickSearch" />
      </aside>
    </div>

    <!-- 搜索框 -->
    <SearchBox
      v-model="kw"
      :loading="searchState.loading"
      :paused="searchState.paused"
      :searched="searched"
      :placeholder="placeholder"
      @search="onSearch"
      @reset="fullReset"
      @pause="pauseSearch"
      @continue="handleContinueSearch" />

    <!-- 统计和过滤器 -->
    <div v-if="searched" class="stats-bar">
      <div class="stats-content">
        <div class="stats-main">
          <span class="stat-item">
            <span class="stat-label">结果</span>
            <span class="stat-value">{{ searchState.total }}</span>
          </span>
          <span class="stat-item">
            <span class="stat-label">用时</span>
            <span class="stat-value">{{ searchState.elapsedMs }}ms</span>
          </span>
          <span v-if="searchState.deepLoading && !searchState.paused" class="loading-indicator">
            <span class="pulse-dot"></span>
            <span class="loading-text">持续搜索中…</span>
          </span>
          <span v-if="searchState.paused" class="paused-indicator-bar">
            <span class="pause-icon">⏸</span>
            <span class="paused-text">搜索已暂停</span>
          </span>
        </div>

        <!-- 平台过滤器 -->
        <div class="platform-filters" v-if="hasResults">
          <button
            :class="['filter-pill', { active: filterPlatform === 'all' }]"
            @click="filterPlatform = 'all'">
            全部
          </button>
          <button
            v-for="p in platforms"
            :key="p"
            :class="['filter-pill', { active: filterPlatform === p }]"
            @click="filterPlatform = p">
            {{ platformName(p) }}
          </button>
        </div>

        <!-- 排序选择器 -->
        <div class="sorter" v-if="hasResults">
          <select v-model="sortType" class="sort-select">
            <option value="default">默认排序</option>
            <option value="date-desc">最新发布</option>
            <option value="date-asc">最早发布</option>
            <option value="name-asc">名称 A→Z</option>
            <option value="name-desc">名称 Z→A</option>
          </select>
        </div>
      </div>
    </div>

    <!-- 搜索结果 -->
    <section v-if="hasResults" class="results-section">
      <div class="results-grid">
        <ResultGroup
          v-for="group in groupedResults"
          :key="group.type"
          :title="platformName(group.type)"
          :color="platformColor(group.type)"
          :icon="platformIcon(group.type)"
          :items="visibleSorted(group.items)"
          :expanded="filterPlatform !== 'all' || isExpanded(group.type)"
          :initial-visible="initialVisible"
          :can-toggle-collapse="false"
          @toggle="handleToggle(group.type)"
          @copy="copyLink" />
      </div>
    </section>

    <!-- 空状态：仅当搜索完全结束且无结果时显示，搜索进行中不显示 -->
    <section v-else-if="searched && !searchState.loading && !searchState.deepLoading && !searchState.paused" class="empty-state">
      <div class="empty-card">
        <div class="empty-icon">🔍</div>
        <h3>未找到相关资源</h3>
        <p>试试其他关键词，或检查设置中的搜索来源是否已启用</p>
      </div>
    </section>

    <!-- 错误提示 -->
    <section v-if="searchState.error" class="error-alert">
      <span class="error-icon">⚠️</span>
      <span>{{ searchState.error }}</span>
    </section>

    <!-- 豆瓣电影新片榜 - 搜索时隐藏 -->
    <section v-if="!searched" class="douban-hot-section">
      <DoubanHotSection ref="doubanHotRef" :on-search="quickSearch" />
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from "vue";
import { PLATFORM_INFO } from "~/config/plugins";

const config = useRuntimeConfig();
const apiBase = (config.public?.apiBase as string) || "/api";
const siteUrl = (config.public?.siteUrl as string) || "";

// 热搜组件引用
const hotSearchRef = ref<InstanceType<typeof HotSearchSection> | null>(null);
const doubanHotRef = ref<InstanceType<typeof DoubanHotSection> | null>(null);

// 页面加载时初始化热搜数据
onMounted(async () => {
  await new Promise((resolve) => setTimeout(resolve, 100));
  if (doubanHotRef.value) await doubanHotRef.value.init();
  if (hotSearchRef.value) await hotSearchRef.value.init();
});

// SEO 元数据
useSeoMeta({
  title: "PanHub - 全网最全的网盘搜索",
  description:
    "聚合阿里云盘、夸克、百度网盘、115、迅雷等平台，实时检索各类分享链接与资源，免费、快速、无广告。",
  ogTitle: "PanHub - 全网最全的网盘搜索",
  ogDescription:
    "聚合阿里云盘、夸克、百度网盘、115、迅雷等平台，实时检索各类分享链接与资源，免费、快速、无广告。",
  ogType: "website",
  ogSiteName: "PanHub",
  ogImage: siteUrl ? `${siteUrl}/og.svg` : "/og.svg",
  twitterCard: "summary_large_image",
  twitterTitle: "PanHub - 全网最全的网盘搜索",
  twitterDescription:
    "聚合阿里云盘、夸克、百度网盘、115、迅雷等平台，实时检索各类分享链接与资源，免费、快速、无广告。",
  twitterImage: siteUrl ? `${siteUrl}/og.svg` : "/og.svg",
});

useHead({
  link: [{ rel: "canonical", href: siteUrl ? `${siteUrl}/` : "/" }],
  meta: [
    {
      name: "keywords",
      content:
        "网盘搜索, 阿里云盘搜索, 夸克网盘搜索, 百度网盘搜索, 115 网盘, 迅雷云盘, 资源搜索, 盘搜, PanHub",
    },
  ],
  script: [
    {
      type: "application/ld+json",
      innerHTML: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "PanHub",
        url: siteUrl || "",
        potentialAction: {
          "@type": "SearchAction",
          target: (siteUrl || "") + "/?q={search_term_string}",
          "query-input": "required name=search_term_string",
        },
      }),
    },
  ],
});

// 搜索相关状态
const kw = ref("");
const placeholder =
  "搜索网盘资源，支持百度云、阿里云盘、夸克网盘、115网盘、迅雷云盘、天翼云盘、123网盘、移动云盘、UC网盘等";

// 排序和过滤
const sortType = ref<"default" | "date-desc" | "date-asc" | "name-asc" | "name-desc">("default");
const filterPlatform = ref<string>("all");
const initialVisible = 3;
const expandedSet = ref<Set<string>>(new Set());

// 使用搜索 composable
const {
  state: searchState,
  searched,
  performSearch,
  resetSearch,
  copyLink,
  pauseSearch,
  continueSearch,
  hasResults,
} = useSearch();
const { settings, loadSettings } = useSettings();
const auth = useAuth();
const requestUnlock = inject<(onSuccess?: () => void) => void>("requestUnlock");

// 获取搜索选项（使用最新的用户设置）
function getSearchOptions() {
  return {
    apiBase,
    keyword: kw.value,
    settings: {
      enabledPlugins: settings.value.enabledPlugins,
      enabledTgChannels: settings.value.enabledTgChannels,
      concurrency: settings.value.concurrency,
      pluginTimeoutMs: settings.value.pluginTimeoutMs,
    },
  };
}

// 记录热搜词
async function recordHotSearch(keyword: string) {
  const term = keyword?.trim();
  if (!term) return;
  try {
    await $fetch(`${apiBase}/hot-searches`, { method: "POST", body: { term } });
  } catch (_e) {}
}

// 执行实际搜索逻辑（供 requestUnlock 回调复用）
async function doSearch() {
  if (!kw.value || searchState.value.loading) return;
  loadSettings();
  const keyword = kw.value.trim();
  recordHotSearch(keyword);
  await performSearch({
    ...getSearchOptions(),
    onAuthRequired: requestUnlock ?? undefined,
  });
}

// 搜索执行
async function onSearch() {
  if (!kw.value || searchState.value.loading) return;
  if (auth.locked.value && requestUnlock) {
    requestUnlock(doSearch);
    return;
  }
  await doSearch();
}

// 快速搜索
async function quickSearch(keyword: string) {
  kw.value = keyword;
  await onSearch();
}

// 继续搜索（从暂停处继续）
async function handleContinueSearch() {
  if (!searchState.value.paused) return;
  if (auth.locked.value && requestUnlock) {
    requestUnlock(async () => {
      loadSettings();
      await continueSearch({
        ...getSearchOptions(),
        onAuthRequired: requestUnlock ?? undefined,
      });
    });
    return;
  }
  loadSettings();
  await continueSearch({
    ...getSearchOptions(),
    onAuthRequired: requestUnlock ?? undefined,
  });
}

// 完全重置 - 清空输入框、结果、状态，并刷新页面
async function fullReset() {
  // 清空输入框和重置状态
  kw.value = "";
  sortType.value = "default";
  filterPlatform.value = "all";
  expandedSet.value = new Set();
  resetSearch();
  // 刷新页面以恢复初始状态（包括豆瓣电影）
  await nextTick();
  if (doubanHotRef.value) await doubanHotRef.value.init();
  if (hotSearchRef.value) await hotSearchRef.value.refresh();
}

// 平台信息
const platformIcon = (t: string): string => PLATFORM_INFO[t]?.icon || "📦";
const platformName = (t: string): string => PLATFORM_INFO[t]?.name || t;
const platformColor = (t: string): string => PLATFORM_INFO[t]?.color || "#9ca3af";

// 获取所有有结果的平台类型
const platforms = computed(() => {
  const m = searchState.value?.merged ?? {};
  return Object.keys(m).filter((type) => (m[type]?.length ?? 0) > 0);
});

const groupedResults = computed(() => {
  const list: Array<{ type: string; items: any[] }> = [];
  const source =
    filterPlatform.value === "all"
      ? searchState.value.merged
      : { [filterPlatform.value]: searchState.value.merged[filterPlatform.value] || [] };
  for (const type of Object.keys(source)) {
    if (!source[type]?.length) continue;
    list.push({ type, items: source[type] || [] });
  }
  return list;
});

// 展开/收起
function isExpanded(type: string) {
  return expandedSet.value.has(type);
}

function handleToggle(type: string) {
  filterPlatform.value = type;
}

function visibleItems(type: string, items: any[]) {
  return isExpanded(type) ? items : items.slice(0, initialVisible);
}

// 排序
function sortItems(items: any[]) {
  const arr = [...items];
  switch (sortType.value) {
    case "date-desc":
      return arr.sort(
        (a, b) =>
          new Date(b.datetime || "1970-01-01").getTime() -
          new Date(a.datetime || "1970-01-01").getTime()
      );
    case "date-asc":
      return arr.sort(
        (a, b) =>
          new Date(a.datetime || "1970-01-01").getTime() -
          new Date(b.datetime || "1970-01-01").getTime()
      );
    case "name-asc":
      return arr.sort((a, b) =>
        String(a.note || "").localeCompare(String(b.note || ""), "zh-CN")
      );
    case "name-desc":
      return arr.sort((a, b) =>
        String(b.note || "").localeCompare(String(a.note || ""), "zh-CN")
      );
    default:
      return items;
  }
}

function visibleSorted(items: any[]) {
  return sortItems(items);
}
</script>

<style scoped>
.home {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* 英雄区域 + 热门搜索（frontend-design: editorial + industrial） */
.hero-row {
  display: flex;
  align-items: stretch;
  gap: 0;
  position: relative;
  background: linear-gradient(145deg, rgba(15, 118, 110, 0.12) 0%, rgba(15, 118, 110, 0.04) 35%, rgba(245, 158, 11, 0.06) 70%, rgba(15, 118, 110, 0.08) 100%);
  border-radius: 20px;
  box-shadow: 0 4px 20px -4px rgba(15, 118, 110, 0.15);
  overflow: hidden;
}

.hero-noise {
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0.04;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  mix-blend-mode: overlay;
  z-index: 0;
}

.hero {
  flex: 1;
  min-width: 0;
  padding: 24px 28px;
  text-align: left;
  position: relative;
  z-index: 1;
}

.hero-accent {
  position: absolute;
  top: 0;
  left: 0;
  width: 6px;
  height: 100%;
  background: linear-gradient(180deg, var(--primary) 0%, var(--secondary) 50%, var(--primary) 100%);
  opacity: 1;
}

.hero-content {
  position: relative;
  z-index: 2;
  padding-left: 12px;
}

.hero-badge {
  display: inline-block;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--primary);
  margin-bottom: 10px;
  padding: 6px 12px;
  background: rgba(15, 118, 110, 0.12);
  border: 1px solid rgba(15, 118, 110, 0.25);
  border-radius: 8px;
  font-family: "Manrope", sans-serif;
  animation: heroReveal 0.6s ease-out both;
  animation-delay: 0.05s;
}

.hero-title {
  font-family: "Syne", "Manrope", sans-serif;
  font-size: 36px;
  font-weight: 800;
  margin: 0 0 10px;
  color: var(--text-primary);
  letter-spacing: -0.04em;
  line-height: 1.1;
  max-width: 560px;
  animation: heroReveal 0.6s ease-out both;
  animation-delay: 0.12s;
}

.hero-title-line {
  display: block;
}

.hero-title-line--accent {
  background: linear-gradient(120deg, var(--primary) 0%, #0d9488 40%, var(--secondary) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-description {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0 0 16px;
  line-height: 1.65;
  max-width: 520px;
  animation: heroReveal 0.6s ease-out both;
  animation-delay: 0.2s;
}

.hero-features {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 12px 20px;
}

.hero-feature {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--primary-dark);
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(15, 118, 110, 0.2);
  border-radius: 10px;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
  animation: heroReveal 0.6s ease-out both;
}

.hero-feature:nth-child(1) { animation-delay: 0.28s; }
.hero-feature:nth-child(2) { animation-delay: 0.34s; }
.hero-feature:nth-child(3) { animation-delay: 0.4s; }

.hero-feature:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(15, 118, 110, 0.15);
  border-color: rgba(15, 118, 110, 0.35);
}

.hero-shape {
  position: absolute;
  right: 8%;
  bottom: 10%;
  width: 120px;
  height: 120px;
  background: linear-gradient(135deg, rgba(15, 118, 110, 0.15) 0%, rgba(245, 158, 11, 0.08) 100%);
  border-radius: 30% 70% 70% 30% / 30% 30% 70% 70%;
  filter: blur(24px);
  pointer-events: none;
  z-index: 0;
}

@keyframes heroReveal {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.hero-aside {
  flex-shrink: 0;
  width: 340px;
}

/* 嵌入时去除热门搜索的独立卡片感 */
.hero-aside :deep(.tag-cloud-wrap),
.hero-aside :deep(.loading-state),
.hero-aside :deep(.tag-cloud-placeholder) {
  background: transparent;
  border: none;
  border-radius: 0;
  box-shadow: none;
}

.hero-aside :deep(.tag-cloud-wrap) {
  padding: 12px 16px;
  min-height: 260px;
}

.hero-aside :deep(.hot-tagcloud) {
  height: 240px !important;
}

/* 统计和过滤器栏 */
.stats-bar {
  background: var(--bg-primary);
  backdrop-filter: blur(10px);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-lg);
  padding: 16px;
  box-shadow: var(--shadow-md);
  animation: fadeIn 0.4s ease;
}

.stats-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.stats-main {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-light);
}

.stat-label {
  font-size: 13px;
  color: var(--text-tertiary);
  font-weight: 500;
}

.stat-value {
  font-size: 18px;
  font-weight: 700;
  color: var(--primary);
}

/* 加载指示器 */
.loading-indicator {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(15, 118, 110, 0.1);
  border-radius: var(--radius-md);
  border: 1px solid rgba(15, 118, 110, 0.2);
}

.pulse-dot {
  width: 8px;
  height: 8px;
  background: var(--primary);
  border-radius: 50%;
  animation: pulse 1.5s ease-in-out infinite;
}

.loading-text {
  font-size: 13px;
  color: var(--primary);
  font-weight: 500;
}

/* 暂停状态指示器（统计栏） */
.paused-indicator-bar {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(245, 158, 11, 0.1);
  border-radius: var(--radius-md);
  border: 1px solid rgba(245, 158, 11, 0.3);
  color: #f59e0b;
  font-weight: 500;
}

.pause-icon {
  font-size: 14px;
}

.paused-text {
  font-size: 13px;
}

/* 平台过滤器 */
.platform-filters {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}

.filter-pill {
  padding: 6px 12px;
  border: 1px solid var(--border-light);
  background: var(--bg-secondary);
  border-radius: 999px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
  transition: background-color var(--transition-fast), border-color var(--transition-fast),
    color var(--transition-fast), transform var(--transition-fast),
    box-shadow var(--transition-fast);
  white-space: nowrap;
}

.filter-pill:hover {
  background: var(--bg-primary);
  border-color: var(--border-medium);
  transform: translateY(-1px);
}

.filter-pill.active {
  background: linear-gradient(135deg, var(--primary), var(--secondary));
  color: white;
  border-color: transparent;
  box-shadow: 0 4px 12px rgba(15, 118, 110, 0.28);
}

/* 排序选择器 */
.sorter {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sort-select {
  padding: 8px 12px;
  border: 1px solid var(--border-light);
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  cursor: pointer;
  transition: background-color var(--transition-fast), border-color var(--transition-fast),
    box-shadow var(--transition-fast);
  min-width: 140px;
}

.sort-select:hover {
  background: var(--bg-primary);
  border-color: var(--border-medium);
}

.sort-select:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.12);
}

/* 搜索结果区域 */
.results-section {
  animation: fadeIn 0.5s ease;
}

.results-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}

/* 空状态 */
.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 48px 24px;
  animation: fadeIn 0.4s ease;
}

.empty-card {
  background: var(--bg-glass);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: var(--radius-xl);
  padding: 32px;
  text-align: center;
  max-width: 400px;
  box-shadow: var(--shadow-lg);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.6;
}

.empty-card h3 {
  margin: 0 0 8px 0;
  font-size: 20px;
  color: var(--text-primary);
}

.empty-card p {
  margin: 0;
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.6;
}

/* 错误提示 */
.error-alert {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: var(--radius-md);
  padding: 12px 16px;
  color: var(--error);
  font-weight: 500;
  animation: fadeIn 0.3s ease;
}

.error-icon {
  font-size: 18px;
}

/* 热搜推荐 */
.hot-search-section {
  animation: fadeIn 0.6s ease;
}

/* 移动端优化 */
@media (max-width: 900px) {
  .hero-row {
    flex-direction: column;
  }

  .hero-aside {
    width: 100%;
  }
}

@media (max-width: 640px) {
  .hero-aside {
    display: none;
  }

  .hero {
    padding: 24px 18px;
  }

  .hero-content {
    padding-left: 4px;
  }

  .hero-badge {
    font-size: 10px;
    letter-spacing: 0.1em;
    margin-bottom: 10px;
  }

  .hero-title {
    font-size: 26px;
  }

  .hero-description {
    font-size: 14px;
    margin-bottom: 16px;
  }

  .hero-feature {
    font-size: 12px;
    padding: 6px 12px;
  }

  .hero-shape {
    width: 80px;
    height: 80px;
    right: 5%;
    bottom: 5%;
  }

  .stats-bar {
    padding: 12px;
  }

  .stats-main {
    gap: 8px;
  }

  .stat-item {
    padding: 6px 10px;
  }

  .stat-value {
    font-size: 16px;
  }

  .platform-filters {
    gap: 6px;
  }

  .filter-pill {
    padding: 5px 10px;
    font-size: 12px;
  }

  .sort-select {
    min-width: 120px;
    font-size: 12px;
  }

  .empty-card {
    padding: 24px;
  }

  .empty-icon {
    font-size: 36px;
  }

  .empty-card h3 {
    font-size: 18px;
  }

  .suggestions-card {
    padding: 16px;
  }

  .tag {
    padding: 6px 12px;
    font-size: 12px;
  }
}

/* 深色模式支持 */
@media (prefers-color-scheme: dark) {
  .hero-row {
    background: linear-gradient(160deg, rgba(13, 148, 136, 0.14) 0%, rgba(13, 148, 136, 0.04) 40%, rgba(217, 119, 6, 0.08) 80%, rgba(13, 148, 136, 0.06) 100%);
    box-shadow: 0 4px 24px -4px rgba(0, 0, 0, 0.4);
    border: 1px solid var(--border-light);
  }

  .hero-accent {
    background: linear-gradient(180deg, var(--primary) 0%, var(--secondary) 50%, var(--primary) 100%);
  }

  .hero-badge {
    background: rgba(13, 148, 136, 0.2);
    color: var(--primary);
    border-color: rgba(45, 212, 191, 0.2);
  }

  .hero-title-line--accent {
    background: linear-gradient(120deg, #2dd4bf 0%, #14b8a6 40%, #fbbf24 100%);
    -webkit-background-clip: text;
    background-clip: text;
  }

  .hero-description {
    color: var(--text-secondary);
  }

  .hero-feature {
    color: var(--primary);
    background: rgba(13, 148, 136, 0.1);
    border-color: rgba(45, 212, 191, 0.15);
  }

  .hero-feature:hover {
    background: rgba(13, 148, 136, 0.16);
    border-color: rgba(45, 212, 191, 0.3);
    box-shadow: 0 4px 12px rgba(13, 148, 136, 0.15);
  }

  .hero-shape {
    background: linear-gradient(135deg, rgba(13, 148, 136, 0.12) 0%, rgba(217, 119, 6, 0.06) 100%);
  }

  .hero-noise {
    opacity: 0.03;
  }

  .stats-bar {
    background: var(--bg-glass);
    border-color: var(--border-light);
    box-shadow: var(--shadow-md);
  }

  .stat-item {
    background: var(--bg-secondary);
    border-color: var(--border-light);
  }

  .stat-value {
    color: var(--primary);
  }

  .loading-indicator {
    background: rgba(13, 148, 136, 0.12);
    border-color: rgba(13, 148, 136, 0.2);
  }

  .loading-text {
    color: var(--primary);
  }

  .paused-indicator-bar {
    background: rgba(217, 119, 6, 0.1);
    border-color: rgba(217, 119, 6, 0.25);
    color: #fbbf24;
  }

  .filter-pill {
    background: var(--bg-secondary);
    border-color: var(--border-light);
    color: var(--text-secondary);
  }

  .filter-pill:hover {
    background: rgba(255, 255, 255, 0.06);
    border-color: var(--border-medium);
    color: var(--text-primary);
  }

  .filter-pill.active {
    background: linear-gradient(135deg, #0d9488, #14b8a6);
    color: #042f2e;
    box-shadow: 0 4px 12px rgba(13, 148, 136, 0.35);
  }

  .sort-select {
    background: var(--bg-secondary);
    border-color: var(--border-light);
    color: var(--text-primary);
  }

  .sort-select:hover {
    background: rgba(255, 255, 255, 0.06);
    border-color: var(--border-medium);
  }

  .sort-select:focus {
    border-color: var(--primary);
    box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.15);
  }

  .empty-card {
    background: var(--bg-glass);
    border-color: var(--border-light);
    box-shadow: var(--shadow-lg);
  }

  .empty-card h3 {
    color: var(--text-primary);
  }

  .empty-card p {
    color: var(--text-secondary);
  }

  .error-alert {
    background: rgba(248, 113, 113, 0.1);
    border-color: rgba(248, 113, 113, 0.25);
    color: #f87171;
  }

  .hot-search-section {
    /* HotSearchSection 组件内部已处理 */
  }
}

/* 高对比度模式支持 */
@media (prefers-contrast: high) {
  .hero-title-line--accent {
    -webkit-text-fill-color: var(--primary);
    background: none;
  }

  .hero-badge,
  .hero-feature {
    border-width: 2px;
  }

  .filter-pill.active {
    border-width: 2px;
  }

  .sort-select {
    border-width: 2px;
  }

  .tag {
    border-width: 2px;
  }
}

/* 减少动画模式支持 */
@media (prefers-reduced-motion: reduce) {
  .hero-badge,
  .hero-title,
  .hero-description,
  .hero-feature {
    animation: none;
  }

  .hero-feature:hover {
    transform: none;
  }

  .hero,
  .stats-bar,
  .results-section,
  .empty-state,
  .error-alert,
  .hot-search-section {
    animation: none;
  }

  .filter-pill:hover,
  .sort-select:hover {
    transform: none;
  }

  .pulse-dot {
    animation: none;
    opacity: 0.7;
  }
}
</style>
