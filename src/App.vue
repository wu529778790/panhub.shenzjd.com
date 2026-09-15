<template>
  <div class="layout">
    <!-- 背景装饰光斑（纯径向渐变，滚动零重绘） -->
    <div class="bg-decoration" aria-hidden="true">
      <div class="blob blob-1"></div>
      <div class="blob blob-2"></div>
      <div class="blob blob-3"></div>
    </div>

    <!-- 公告条 -->
    <div v-if="announcementVisible" class="announce-bar" role="status">
      <span class="announce-bar__icon" aria-hidden="true">📢</span>
      <div class="announce-bar__viewport">
        <span :key="announcementIndex" class="announce-bar__slide">
          <a
            v-if="currentAnnouncement?.link"
            :href="currentAnnouncement.link"
            target="_blank"
            rel="noopener">{{ currentAnnouncement.text }}</a>
          <template v-else>{{ currentAnnouncement?.text }}</template>
        </span>
      </div>
      <button class="announce-bar__close" type="button" aria-label="关闭公告" title="关闭" @click="dismissAnnouncement">✕</button>
    </div>

    <main class="main">
      <!-- 英雄区 + 热搜 -->
      <div class="hero-row">
        <div class="hero-noise" aria-hidden="true"></div>
        <header class="hero">
          <div class="hero-accent" aria-hidden="true"></div>
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
          <div class="hero-shape" aria-hidden="true"></div>
        </header>
      </div>

      <SearchBox
        v-model="kw"
        v-model:cat="searchCat"
        :loading="loading"
        :paused="paused"
        :searched="searched"
        placeholder="搜索网盘资源，支持百度云、阿里云盘、夸克网盘、115网盘、迅雷云盘、天翼云盘、123网盘、移动云盘、UC网盘等"
        @search="onSearch"
        @reset="fullReset"
        @pause="pauseSearch"
        @continue="handleContinueSearch" />

      <!-- 统计 + 平台过滤 -->
      <div v-if="searched" class="stats-bar">
        <div class="stats-main">
          <span class="stat-item">
            <span class="stat-label">结果</span>
            <span class="stat-value">{{ total }}</span>
          </span>
          <span class="stat-item">
            <span class="stat-label">用时</span>
            <span class="stat-value">{{ elapsedMs }}ms</span>
          </span>
          <span v-if="deepLoading && !paused" class="loading-indicator">
            <span class="pulse-dot"></span>
            <span class="loading-text">持续搜索中…</span>
          </span>
          <span v-if="paused" class="paused-indicator-bar">
            <span>⏸</span>
            <span class="paused-text">
              {{ autoPausedAtLimit ? `已找到 ${total} 条结果，可继续搜索更多` : "搜索已暂停" }}
            </span>
          </span>
        </div>

        <div v-if="hasResults" class="platform-filters">
          <button
            :class="['filter-pill', { active: filterPlatform === 'all' }]"
            @click="filterPlatform = 'all'">
            全部 ({{ total }})
          </button>
          <button
            v-for="p in platforms"
            :key="p"
            :class="['filter-pill', { active: filterPlatform === p }]"
            @click="filterPlatform = p">
            {{ platformInfo(p).name }} ({{ merged[p]?.length || 0 }})
          </button>
        </div>
      </div>

      <!-- 结果区 -->
      <section
        v-if="hasResults"
        class="results-section"
        :class="{ 'results-section--refreshing': loading && !paused }">
        <div class="results-grid">
          <ResultGroup
            v-for="group in groupedResults"
            :key="group.type"
            :title="platformInfo(group.type).name"
            :color="platformInfo(group.type).color"
            :icon="platformInfo(group.type).icon"
            :items="sortedItems(group.items)"
            :expanded="filterPlatform !== 'all' || expandedSet.has(group.type)"
            :initial-visible="3"
            @toggle="handleToggle(group.type)" />
        </div>
      </section>

      <!-- 骨架屏 -->
      <section v-else-if="loading || deepLoading" class="skeleton-section" aria-hidden="true">
        <div v-for="i in 2" :key="i" class="result-card skeleton-card">
          <div class="card-header">
            <span class="sk sk-circle"></span>
            <span class="sk sk-bar" style="width: 120px"></span>
          </div>
          <div class="skeleton-body">
            <span class="sk sk-bar" style="width: 72%"></span>
            <span class="sk sk-bar" style="width: 55%"></span>
            <span class="sk sk-bar" style="width: 38%"></span>
          </div>
        </div>
      </section>

      <!-- 空状态 -->
      <section v-else-if="searched && !loading && !deepLoading && !paused" class="empty-state">
        <div class="empty-card">
          <div class="empty-card__main">
            <div class="empty-icon" aria-hidden="true">
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
                <path d="m8.5 8.5 5 5" />
                <path d="m13.5 8.5-5 5" />
              </svg>
            </div>
            <div class="empty-card__text">
              <h3>未找到相关资源</h3>
              <p>试试其他关键词，或稍后再试</p>
            </div>
          </div>
        </div>
      </section>

      <!-- 错误提示 -->
      <section v-if="error" class="error-alert">
        <span class="error-icon">⚠️</span>
        <span>{{ error }}</span>
      </section>

      <!-- 豆瓣新��榜（搜索时隐藏，用 v-show 保留已加载数据） -->
      <section v-show="!searched" class="douban-hot-section">
        <DoubanHot @search="quickSearch" />
      </section>
    </main>

    <footer class="site-footer">
      <span class="footer-copy">PanHub · 聚合搜索，不存储任何文件</span>
    </footer>

    <TransferDialog />
  </div>

  <!-- 全站 Toast -->
  <div v-if="toast.show" class="toast" :class="toast.type" role="status" aria-live="polite">
    {{ toast.message }}
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref } from "vue";
import SearchBox from "./components/SearchBox.vue";
import ResultGroup from "./components/ResultGroup.vue";
import DoubanHot from "./components/DoubanHot.vue";
import TransferDialog from "./components/TransferDialog.vue";
import { useSearch } from "./composables/useSearch";
import { useAnnouncement } from "./composables/useAnnouncement";
import { useToast } from "./composables/useToast";
import { platformInfo } from "./config/platforms";
import { checkSearchAuth } from "./api/auth";
import type { MergedLink } from "./types";

// ===== 状态 =====
const kw = ref("");
const searchCat = ref("");
const filterPlatform = ref("all");
const expandedSet = ref<Set<string>>(new Set());

const {
  loading,
  deepLoading,
  paused,
  error,
  searched,
  elapsedMs,
  total,
  merged,
  hasResults,
  autoPausedAtLimit,
  performSearch,
  continueSearch,
  pauseSearch,
  resetSearch,
} = useSearch();

const {
  items: announcementItems,
  visible: announcementVisible,
  load: loadAnnouncement,
  dismiss: dismissAnnouncement,
} = useAnnouncement();
const { toast } = useToast();

const announcementIndex = ref(0);
let rotateTimer: ReturnType<typeof setInterval> | null = null;

const currentAnnouncement = computed(
  () => announcementItems.value[announcementIndex.value] ?? null
);

// ===== 搜索 =====

async function doSearch() {
  const keyword = kw.value.trim();
  if (!keyword || loading.value) return;
  syncUrl(keyword);
  await performSearch({
    keyword,
    cat: searchCat.value || undefined,
  });
}

/** 搜索词与类别同步到 URL（可分享，刷新后自动重搜） */
function syncUrl(keyword: string) {
  const url = new URL(window.location.href);
  url.searchParams.set("q", keyword);
  if (searchCat.value) url.searchParams.set("cat", searchCat.value);
  else url.searchParams.delete("cat");
  window.history.replaceState(null, "", url.toString());
}

async function onSearch() {
  if (!kw.value.trim()) return;
  if (paused.value) resetSearch();
  if (loading.value) return;
  await checkSearchAuth(); // 保留接口兼容性，但已无实际作用
  await doSearch();
}

async function quickSearch(keyword: string) {
  kw.value = keyword;
  await onSearch();
}

async function handleContinueSearch() {
  if (!paused.value) return;
  await continueSearch({
    keyword: kw.value.trim(),
    cat: searchCat.value || undefined,
  });
}

function fullReset() {
  kw.value = "";
  searchCat.value = "";
  filterPlatform.value = "all";
  expandedSet.value = new Set();
  resetSearch();
  const url = new URL(window.location.href);
  url.search = "";
  window.history.replaceState(null, "", url.toString());
}

// ===== 结果展示 =====

/** 平台 pill 按结果数量降序（SSE 推送顺序不定，不能依赖 key 顺序） */
const platforms = computed(() => {
  const m = merged.value || {};
  return Object.keys(m)
    .filter((type) => (m[type]?.length ?? 0) > 0)
    .sort((a, b) => (m[b]?.length ?? 0) - (m[a]?.length ?? 0));
});

const groupedResults = computed(() => {
  const list: Array<{ type: string; items: MergedLink[] }> = [];
  const source =
    filterPlatform.value === "all"
      ? merged.value
      : { [filterPlatform.value]: merged.value[filterPlatform.value] || [] };
  for (const type of Object.keys(source)) {
    if (!source[type]?.length) continue;
    list.push({ type, items: source[type] || [] });
  }
  list.sort((a, b) => (b.items?.length ?? 0) - (a.items?.length ?? 0));
  return list;
});

function handleToggle(type: string) {
  filterPlatform.value = type;
}

/** 固定按发布时间降序（流式推送时组内顺序是到达顺序） */
function sortedItems(items: MergedLink[]): MergedLink[] {
  return [...items].sort(
    (a, b) =>
      new Date(b?.datetime || "1970-01-01").getTime() -
      new Date(a?.datetime || "1970-01-01").getTime()
  );
}

// ===== 生命周期 =====

onMounted(async () => {
  loadAnnouncement().then(() => {
    if (announcementItems.value.length > 1) {
      rotateTimer = setInterval(() => {
        announcementIndex.value =
          (announcementIndex.value + 1) % announcementItems.value.length;
      }, 6000);
    }
  });

  // 从 URL 读取搜索词与类别，自动搜索（?q= 直访）
  const params = new URLSearchParams(window.location.search);
  const q = params.get("q");
  const cat = params.get("cat");
  if (cat) searchCat.value = cat;
  if (q) {
    kw.value = q;
    await onSearch();
  }
});

onBeforeUnmount(() => {
  if (rotateTimer) clearInterval(rotateTimer);
});
</script>

<style scoped>
/* ===== 布局骨架 ===== */
.layout {
  /* 用文档级滚动（不设 height + overflow-y）：
     内层 100vh 滚动容器会让移动端的原生惯性滚动、回弹、地址栏自动收起
     全部失效，滚动发涩。由 body 承担滚动才符合移动端预期 */
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow-x: hidden;
}

/* 背景装饰光斑：径向渐变（不用 filter: blur，滚动零重绘开销） */
.bg-decoration {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: -1;
  overflow: hidden;
}
.blob {
  position: absolute;
  border-radius: 50%;
  opacity: 0.28;
  animation: blobFloat 8s ease-in-out infinite;
}
.blob-1 {
  width: 400px;
  height: 400px;
  background: radial-gradient(circle at 40% 40%, #14b8a6 0%, #0f766e 45%, transparent 72%);
  top: -100px;
  left: -100px;
}
.blob-2 {
  width: 300px;
  height: 300px;
  background: radial-gradient(circle at 40% 40%, #fb7185 0%, #f59e0b 45%, transparent 72%);
  bottom: -50px;
  right: -50px;
  animation-delay: 2s;
}
.blob-3 {
  width: 250px;
  height: 250px;
  background: radial-gradient(circle at 40% 40%, #14b8a6 0%, #0ea5e9 45%, transparent 72%);
  top: 50%;
  left: 70%;
  animation-delay: 4s;
}
@keyframes blobFloat {
  0%,
  100% {
    transform: translate(0, 0) scale(1);
  }
  33% {
    transform: translate(30px, -50px) scale(1.1);
  }
  66% {
    transform: translate(-20px, 20px) scale(0.9);
  }
}

/* ===== 公告条 ===== */
.announce-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  margin-top: 12px;
  padding: 7px 16px;
  background: linear-gradient(90deg, rgba(15, 118, 110, 0.08) 0%, rgba(59, 130, 246, 0.08) 100%);
  border-bottom: 1px solid rgba(15, 118, 110, 0.12);
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.5;
}
.announce-bar__viewport {
  flex: 0 1 auto;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-align: center;
}
.announce-bar__slide {
  display: inline-block;
  max-width: 100%;
}
.announce-bar__slide a {
  color: var(--primary);
  text-decoration: underline;
}
.announce-bar__close {
  flex-shrink: 0;
  background: none;
  border: none;
  font-size: 14px;
  color: var(--text-tertiary);
  cursor: pointer;
  padding: 0 4px;
  line-height: 1;
}
.announce-bar__close:hover {
  color: var(--text-secondary);
}

/* ===== 主内容 ===== */
.main {
  flex: 1;
  width: 100%;
  max-width: 1100px;
  margin: 0 auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* ===== 英雄区 ===== */
.hero-row {
  display: flex;
  align-items: stretch;
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
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves[...]");
  mix-blend-mode: overlay;
  z-index: 0;
}
.hero {
  flex: 1;
  min-width: 0;
  padding: 24px 28px;
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
}
.hero-title {
  font-size: 36px;
  font-weight: 800;
  margin: 0 0 10px;
  color: var(--text-primary);
  letter-spacing: -0.04em;
  line-height: 1.1;
  max-width: 560px;
}
.hero-title-line {
  display: block;
}
.hero-title-line--accent {
  background: linear-gradient(120deg, var(--primary) 0%, #0d9488 40%, var(--secondary) 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
.hero-description {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0 0 16px;
  line-height: 1.65;
  max-width: 520px;
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
  color: var(--primary-dark);
  padding: 6px 12px;
  background: var(--bg-input);
  border: 1px solid rgba(15, 118, 110, 0.2);
  border-radius: 10px;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}
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
/* ===== 统计栏 ===== */
.stats-bar {
  background: var(--bg-primary);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-lg);
  padding: 16px;
  box-shadow: var(--shadow-md);
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
.paused-text {
  font-size: 13px;
}
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
  white-space: nowrap;
  transition: all var(--transition-fast);
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

/* ===== 结果区 ===== */
.results-section {
  position: relative;
}
.results-section--refreshing::before {
  content: "";
  position: absolute;
  inset: -8px;
  z-index: 5;
  background: var(--bg-primary);
  opacity: 0.55;
  border-radius: 16px;
  cursor: progress;
}
.results-section--refreshing::after {
  content: "正在搜索新内容…";
  position: absolute;
  top: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 6;
  padding: 8px 16px;
  background: rgba(17, 24, 39, 0.85);
  color: #fff;
  font-size: 13px;
  border-radius: 999px;
  pointer-events: none;
}
.results-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}

/* ===== 骨架屏 ===== */
.skeleton-section {
  display: grid;
  gap: 20px;
}
.skeleton-card {
  padding-bottom: 8px;
  pointer-events: none;
  background: var(--bg-primary);
  border: 1px solid var(--border-light);
  border-radius: 16px;
  overflow: hidden;
}
.skeleton-card .card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border-light);
}
.skeleton-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 14px 16px;
}
.sk {
  display: inline-block;
  height: 14px;
  border-radius: 8px;
  background: linear-gradient(90deg, var(--bg-secondary) 25%, var(--bg-hover) 37%, var(--bg-secondary) 63%);
  background-size: 400% 100%;
  animation: sk-shimmer 1.2s ease infinite;
}
.sk-circle {
  width: 36px;
  height: 36px;
  border-radius: 12px;
  flex-shrink: 0;
}
@keyframes sk-shimmer {
  0% {
    background-position: 100% 0;
  }
  100% {
    background-position: -100% 0;
  }
}

/* ===== 空状态 ===== */
.empty-state {
  display: flex;
  justify-content: center;
  padding: 32px 0;
}
.empty-card {
  width: 100%;
  background: var(--bg-primary);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-xl);
  padding: 40px 44px;
  box-shadow: var(--shadow-xl);
  display: flex;
  align-items: center;
  gap: 40px;
  flex-wrap: wrap;
}
.empty-card__main {
  display: flex;
  align-items: center;
  gap: 24px;
  min-width: 280px;
  flex: 1 1 320px;
}
.empty-icon {
  flex-shrink: 0;
  width: 88px;
  height: 88px;
  border-radius: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-input);
  border: 1px solid var(--border-light);
  color: var(--primary);
}
.empty-card__text h3 {
  margin: 0 0 8px;
  font-size: 22px;
  font-weight: 600;
  color: var(--text-primary);
}
.empty-card__text p {
  margin: 0;
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.6;
}
/* ===== 错误 ===== */
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
}

/* ===== 页脚 ===== */
.site-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 18px 16px 28px;
  font-size: 13px;
  color: var(--text-tertiary);
}

/* ===== Toast ===== */
.toast {
  position: fixed;
  top: 80px;
  right: 24px;
  padding: 12px 20px;
  border-radius: var(--radius-md);
  background: var(--bg-primary);
  box-shadow: var(--shadow-xl);
  border: 1px solid var(--border-light);
  font-weight: 500;
  z-index: 2000;
  display: flex;
  align-items: center;
  gap: 8px;
}
.toast.info {
  color: var(--primary);
  border-left: 4px solid var(--primary);
}
.toast.success {
  color: var(--success);
  border-left: 4px solid var(--success);
}
.toast.error {
  color: var(--error);
  border-left: 4px solid var(--error);
}

@media (max-width: 900px) {
  .hero-row {
    flex-direction: column;
  }
  .main {
    padding: 16px;
  }
  .toast {
    right: 16px;
    left: 16px;
  }
}

@media (max-width: 640px) {
  .hero {
    padding: 24px 18px;
  }
  .hero-content {
    padding-left: 4px;
  }
  .hero-title {
    font-size: 26px;
  }
  .stats-bar {
    padding: 12px;
  }
  .empty-card {
    padding: 24px 20px;
    flex-direction: column;
    align-items: flex-start;
    gap: 20px;
  }
  .empty-icon {
    width: 64px;
    height: 64px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .pulse-dot,
  .sk {
    animation: none;
  }
}
</style>
