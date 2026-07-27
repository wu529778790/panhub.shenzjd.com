<template>
  <div class="douban-section">
    <!-- 分类 Tabs - 始终可点击 -->
    <nav class="category-nav" role="tablist">
      <button
        v-for="cat in availableCategories"
        :key="cat.id"
        :class="['tab-button', { 'is-active': selectedCategoryId === cat.id }]"
        data-theme-part="tab-button"
        :aria-selected="selectedCategoryId === cat.id"
        role="tab"
        @click="selectCategory(cat.id)"
      >
        <span class="tab-label">{{ cat.type || cat.label }}</span>
      </button>
    </nav>

    <!-- 内容区域 -->
    <div class="content-area">
      <!-- 骨架屏 Loading -->
      <div v-if="loading && items.length === 0" class="skeleton-grid">
        <div
          v-for="i in 10"
          :key="`skeleton-${i}`"
          class="skeleton-card"
          data-theme-part="skeleton-card"
          :style="{ animationDelay: `${i * 0.05}s` }"
        >
          <div class="skeleton-cover">
            <div class="skeleton-shimmer"></div>
          </div>
          <div class="skeleton-info">
            <div class="skeleton-title"></div>
            <div class="skeleton-desc"></div>
          </div>
        </div>
      </div>

      <!-- 内容网格 -->
      <transition
        name="grid-transition"
        mode="out-in"
        @before-enter="onBeforeEnter"
        @enter="onEnter"
        @leave="onLeave"
      >
        <div v-show="!loading || items.length > 0" key="content" class="movie-grid">
          <transition-group
            name="card-fade"
            tag="div"
            class="grid-container"
          >
            <button
              v-for="item in items"
              :key="item.id || item.title"
              class="movie-card"
              data-theme-part="movie-card"
              :aria-label="`搜索 ${extractTerm(item.title)}`"
              @click="onItemClick(item.title)"
            >
              <div class="card-cover">
                <div
                  v-if="item.cover && !isImageLoaded(item) && !imgFailed.includes(item.id ?? 0)"
                  class="cover-loading"
                  aria-hidden="true" />
                <img
                  v-if="item.cover && !imgFailed.includes(item.id ?? 0)"
                  :src="proxyCover(item.cover)"
                  :alt="extractTerm(item.title)"
                  :class="{ 'is-loaded': isImageLoaded(item) }"
                  loading="lazy"
                  fetchpriority="low"
                  decoding="async"
                  width="300"
                  height="450"
                  referrerpolicy="no-referrer"
                  @load="onImgLoad(item)"
                  @error="onImgError(item.id ?? 0)"
                />
                <div v-else class="cover-placeholder">
                  <PhFilmSlate :size="32" weight="regular" aria-hidden="true" />
                </div>
              </div>
              <div class="card-info">
                <span class="card-title">{{ item.title }}</span>
                <span v-if="item.desc" class="card-desc">{{ item.desc }}</span>
              </div>
            </button>
          </transition-group>
        </div>
      </transition>

      <!-- 加载更多 -->
      <div v-if="items.length > 0" class="load-section">
        <div
          v-if="hasMore || loadingMore"
          ref="loadTriggerRef"
          class="load-trigger"
        >
          <div v-if="loadingMore" class="loading-more">
            <div class="spinner-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <span>加载更多…</span>
          </div>
        </div>

        <div v-else-if="items.length > 0" class="end-message">
          没有更多了
        </div>
      </div>

      <!-- 可恢复的错误状态 -->
      <div
        v-if="!loading && items.length === 0"
        class="empty-state"
        role="status"
        aria-live="polite"
      >
        <PhWarningCircle class="empty-icon" :size="30" weight="regular" aria-hidden="true" />
        <strong class="empty-title">{{ errorMessage || "片单暂时没加载出来" }}</strong>
        <span class="empty-text">可能是网络波动，稍后重试即可。</span>
        <button class="retry-button" type="button" @click="retryCurrentCategory">
          <PhArrowClockwise :size="16" aria-hidden="true" />
          重新加载
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onBeforeUnmount, nextTick } from "vue";
import { PhArrowClockwise, PhFilmSlate, PhWarningCircle } from "@phosphor-icons/vue";

interface Props {
  onSearch: (term: string) => void;
}

interface DoubanHotItem {
  id?: number;
  title: string;
  url?: string;
  cover?: string;
  desc?: string;
  hot?: number;
}

interface CategorySnapshot {
  items: DoubanHotItem[];
  hasMore: boolean;
  savedAt?: number;
}

const props = defineProps<Props>();

const loading = ref(false);
const loadingMore = ref(false);
const items = ref<DoubanHotItem[]>([]);
const hasMore = ref(true);
const imgFailed = ref<number[]>([]);
const loadedImages = ref<Set<string>>(new Set());
const selectedCategoryId = ref<string>("douban-top250");
const currentPage = ref(1);
const loadObserver = ref<IntersectionObserver | null>(null);
const loadTriggerRef = ref<HTMLElement | null>(null);
const errorMessage = ref("");
const PAGE_LIMIT = 10;
const SNAPSHOT_PREFIX = "haosouku:douban-hot:v2:";
const SNAPSHOT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const categorySnapshots = new Map<string, CategorySnapshot>();

// 防止快速切换分类时旧响应覆盖新数据
let fetchSeq = 0;

// 所有可用的分类配置（与 config/doubanHot.ts 同步）
const availableCategories = computed(() => {
  return [
    { id: "douban-top250", label: "电影", type: "Top250" },
    { id: "douban-drama", label: "电影", type: "剧情" },
    { id: "douban-comedy", label: "电影", type: "喜剧" },
    { id: "douban-action", label: "电影", type: "动作" },
    { id: "douban-romance", label: "电影", type: "爱情" },
    { id: "douban-scifi", label: "电影", type: "科幻" },
    { id: "douban-animation", label: "电影", type: "动画" },
    { id: "douban-mystery", label: "电影", type: "悬疑" },
    { id: "douban-crime", label: "电影", type: "犯罪" },
    { id: "douban-war", label: "电影", type: "战争" },
    { id: "douban-documentary", label: "纪录片", type: "纪录片" },
    { id: "douban-tv", label: "电视剧", type: "电视剧" },
  ];
});

function onImgError(id: number) {
  if (!imgFailed.value.includes(id)) {
    imgFailed.value = [...imgFailed.value, id];
  }
}

function imageKey(item: DoubanHotItem): string {
  return String(item.id ?? item.cover ?? item.title);
}

function isImageLoaded(item: DoubanHotItem): boolean {
  return loadedImages.value.has(imageKey(item));
}

function onImgLoad(item: DoubanHotItem) {
  const next = new Set(loadedImages.value);
  next.add(imageKey(item));
  loadedImages.value = next;
}

function extractTerm(title: string): string {
  return title.replace(/^【[\d.]+】/, "").replace(/^#\d+\s*/, "").trim() || title;
}

function proxyCover(url: string): string {
  if (!url) return "";
  return `/api/img?url=${encodeURIComponent(url)}`;
}

function readCategorySnapshot(categoryId: string): CategorySnapshot | undefined {
  const memorySnapshot = categorySnapshots.get(categoryId);
  if (memorySnapshot) return memorySnapshot;

  const storages: Storage[] = [];
  if (typeof sessionStorage !== "undefined") storages.push(sessionStorage);
  if (typeof localStorage !== "undefined") storages.push(localStorage);

  for (const storage of storages) {
    try {
      const key = `${SNAPSHOT_PREFIX}${categoryId}`;
      const raw = storage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as Partial<CategorySnapshot>;
      if (
        parsed.savedAt &&
        Date.now() - parsed.savedAt > SNAPSHOT_MAX_AGE_MS
      ) {
        storage.removeItem(key);
        continue;
      }
      const snapshot = {
        items: Array.isArray(parsed.items)
          ? parsed.items.filter((item) => item && typeof item.title === "string")
          : [],
        hasMore: Boolean(parsed.hasMore),
        savedAt: parsed.savedAt,
      };
      if (snapshot.items.length === 0) continue;
      categorySnapshots.set(categoryId, snapshot);
      return snapshot;
    } catch {
      // Safari 隐私模式可能禁用存储，继续尝试其他缓存层。
    }
  }

  return undefined;
}

function saveCategorySnapshot(categoryId: string, snapshot: CategorySnapshot) {
  if (snapshot.items.length === 0) return;
  const savedSnapshot = {
    ...snapshot,
    savedAt: Date.now(),
  };
  categorySnapshots.set(categoryId, savedSnapshot);

  const storages: Storage[] = [];
  if (typeof sessionStorage !== "undefined") storages.push(sessionStorage);
  if (typeof localStorage !== "undefined") storages.push(localStorage);
  for (const storage of storages) {
    try {
      storage.setItem(
        `${SNAPSHOT_PREFIX}${categoryId}`,
        JSON.stringify(savedSnapshot)
      );
    } catch {
      // Safari 隐私模式可能禁用存储，内存缓存仍然可用。
    }
  }
}

async function requestCategoryPage(categoryId: string, page: number) {
  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    try {
      const response = await fetch(
        `/api/douban-hot?category=${categoryId}&page=${page}&limit=${PAGE_LIMIT}`,
        { signal: controller.signal, headers: { Accept: "application/json" } }
      );
      if (!response.ok) throw new Error(`request failed with ${response.status}`);

      const payload = await response.json();
      const nextItems = Array.isArray(payload?.data?.items) ? payload.data.items : [];
      if (payload?.code !== 0 || !payload?.data || (page === 1 && nextItems.length === 0)) {
        throw new Error("invalid or empty response");
      }

      return {
        items: nextItems as DoubanHotItem[],
        hasMore: payload.data.hasMore !== undefined
          ? Boolean(payload.data.hasMore)
          : nextItems.length >= PAGE_LIMIT,
      };
    } catch (error) {
      lastError = error;
      if (attempt === 0) {
        await new Promise((resolve) => setTimeout(resolve, 240));
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError instanceof Error ? lastError : new Error("request failed");
}

async function fetchCategoryData(categoryId: string, page: number, append = false) {
  const mySeq = ++fetchSeq;
  if (page === 1) {
    loading.value = true;
    errorMessage.value = "";
    const snapshot = readCategorySnapshot(categoryId);
    if (!append) {
      items.value = snapshot?.items || [];
      hasMore.value = snapshot?.hasMore ?? true;
    }
  } else {
    loadingMore.value = true;
  }

  try {
    const data = await requestCategoryPage(categoryId, page);

    // 如果在请求期间用户切换了分类，丢弃过期响应
    if (mySeq !== fetchSeq) return;

    if (append) {
      items.value = [...items.value, ...data.items];
    } else {
      items.value = data.items;
      saveCategorySnapshot(categoryId, data);
    }
    hasMore.value = data.hasMore;
    currentPage.value = page;
    errorMessage.value = "";
  } catch {
    if (mySeq !== fetchSeq) return;

    if (!append && items.value.length === 0) {
      errorMessage.value = "片单暂时没加载出来";
    }
    hasMore.value = false;
  } finally {
    // 旧请求不能关闭新请求的加载状态。
    if (mySeq === fetchSeq) {
      loading.value = false;
      loadingMore.value = false;
    }
  }
}

async function selectCategory(categoryId: string) {
  // 如果点击的是当前分类且有数据且正在加载，不做处理
  if (categoryId === selectedCategoryId.value && items.value.length > 0 && loading.value) return;

  // 立即更新状态和清空内容，给用户即时反馈
  selectedCategoryId.value = categoryId;
  currentPage.value = 1;
  hasMore.value = true;
  errorMessage.value = "";
  items.value = readCategorySnapshot(categoryId)?.items || [];
  loadedImages.value = new Set();
  loading.value = true;
  loadingMore.value = false;

  // 开始获取新数据
  await fetchCategoryData(categoryId, 1, false);
  await nextTick();
  setupLoadMoreObserver();
}

async function loadMore() {
  if (loadingMore.value || !hasMore.value) return;
  await fetchCategoryData(selectedCategoryId.value, currentPage.value + 1, true);
}

async function retryCurrentCategory() {
  currentPage.value = 1;
  hasMore.value = true;
  await fetchCategoryData(selectedCategoryId.value, 1, false);
  await nextTick();
  setupLoadMoreObserver();
}

function setupLoadMoreObserver() {
  if (loadObserver.value) {
    loadObserver.value.disconnect();
  }

  nextTick(() => {
    const target = loadTriggerRef.value;
    if (!target) return;

    // 检测是否为移动设备
    const isMobile = window.innerWidth < 640;

    loadObserver.value = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore.value && !loading.value && !loadingMore.value) {
          loadMore();
        }
      },
      {
        root: null,
        // 移动端使用更大的 rootMargin 以提前触发加载
        rootMargin: isMobile ? "200px" : "150px",
        // 移动端使用更低的 threshold，PC端使用标准的 0.1
        threshold: isMobile ? 0.01 : 0.1,
      }
    );

    loadObserver.value.observe(target);
  });
}

// Transition hooks
function onBeforeEnter(el: Element) {
  (el as HTMLElement).style.opacity = '0';
}

function onEnter(el: Element, done: () => void) {
  const element = el as HTMLElement;
  element.style.transition = 'opacity 0.3s ease-out';

  requestAnimationFrame(() => {
    element.style.opacity = '1';
    setTimeout(done, 300);
  });
}

function onLeave(el: Element, done: () => void) {
  const element = el as HTMLElement;
  element.style.transition = 'opacity 0.2s ease-in';
  element.style.opacity = '0';
  setTimeout(done, 200);
}

function onItemClick(title: string) {
  const term = extractTerm(title);
  if (term) props.onSearch(term);
}

async function init() {
  await fetchCategoryData(selectedCategoryId.value, 1, false);
  await nextTick();
  setupLoadMoreObserver();
}

async function refresh() {
  currentPage.value = 1;
  hasMore.value = true;
  await fetchCategoryData(selectedCategoryId.value, 1, false);
}

onBeforeUnmount(() => {
  if (loadObserver.value) {
    loadObserver.value.disconnect();
  }
});

defineExpose({ init, refresh });
</script>

<style scoped>
.douban-section {
  width: 100%;
}

/* 分类导航 */
.category-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 20px;
  padding: 8px 0;
}

.tab-button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary, #6b7280);
  background: var(--bg-surface);
  backdrop-filter: blur(8px);
  border: 1px solid var(--border-light, #e5e7eb);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
}

.tab-button::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(15, 118, 110, 0.1) 0%, rgba(245, 158, 11, 0.05) 100%);
  opacity: 0;
  transition: opacity 0.2s ease;
}

.tab-button:hover::before {
  opacity: 1;
}

.tab-button:active {
  transform: scale(0.98);
}

.tab-button.is-active {
  color: var(--primary, #0f766e);
  background: rgba(15, 118, 110, 0.08);
  border-color: var(--primary, #0f766e);
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(15, 118, 110, 0.15);
}

.tab-label {
  font-weight: 600;
}

.tab-type {
  font-size: 11px;
  opacity: 0.85;
}

/* 内容区域 */
.content-area {
  position: relative;
  min-height: 300px;
}

/* 骨架屏 Loading */
.skeleton-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12px;
}

.skeleton-card {
  display: flex;
  flex-direction: column;
  background: var(--bg-surface);
  backdrop-filter: blur(10px);
  border: 1px solid var(--border-light, #e5e7eb);
  border-radius: 12px;
  overflow: hidden;
  animation: skeleton-pulse 2s ease-in-out infinite;
}

.skeleton-cover {
  aspect-ratio: 2 / 3;
  background: linear-gradient(90deg, var(--bg-skeleton) 25%, #e0e0e0 50%, var(--bg-skeleton) 75%);
  background-size: 200% 100%;
  position: relative;
  overflow: hidden;
}

.skeleton-shimmer {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    90deg,
    transparent 0%,
    var(--bg-skeleton-shine) 50%,
    transparent 100%
  );
  transform: translateX(-100%);
  animation: shimmer 1.5s ease-in-out infinite;
}

.skeleton-info {
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.skeleton-title {
  height: 32px;
  background: linear-gradient(90deg, #e5e7eb 25%, #d1d5db 50%, #e5e7eb 75%);
  background-size: 200% 100%;
  border-radius: 4px;
  animation: skeleton-shimmer 1.5s ease-in-out infinite;
}

.skeleton-desc {
  height: 12px;
  background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%);
  background-size: 200% 100%;
  border-radius: 4px;
  animation: skeleton-shimmer 1.5s ease-in-out infinite 0.2s;
}

@keyframes skeleton-pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.8;
  }
}

@keyframes shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

@keyframes skeleton-shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

/* 网格容器 */
.grid-container {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12px;
}

.movie-card {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  background: var(--bg-surface);
  backdrop-filter: blur(10px);
  border: 1px solid var(--border-light, #e5e7eb);
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  text-align: left;
  padding: 0;
  will-change: transform;
}

.movie-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 20px rgba(15, 118, 110, 0.12);
}

.card-cover {
  aspect-ratio: 2 / 3;
  background: linear-gradient(135deg, #e5e7eb 0%, #d1d5db 100%);
  overflow: hidden;
  position: relative;
}

.card-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  opacity: 0;
  transition: opacity 0.2s ease, transform 0.3s ease;
}

.card-cover img.is-loaded {
  opacity: 1;
}

.cover-loading {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    100deg,
    var(--bg-skeleton) 20%,
    var(--bg-skeleton-shine) 42%,
    var(--bg-skeleton) 64%
  );
  background-size: 220% 100%;
  animation: cover-shimmer 1.2s ease-in-out infinite;
}

@keyframes cover-shimmer {
  from { background-position: 120% 0; }
  to { background-position: -120% 0; }
}

.movie-card:hover .card-cover img {
  transform: scale(1.05);
}

.cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  background: rgba(15, 118, 110, 0.05);
}

.card-info {
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-height: 0;
}

.card-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary, #1f2937);
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-desc {
  font-size: 11px;
  color: var(--text-tertiary, #9ca3af);
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 加载更多区域 */
.load-section {
  margin-top: 8px;
}

.load-trigger {
  padding: 24px 0;
  min-height: 60px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.loading-more {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--text-secondary, #6b7280);
  font-size: 14px;
}

.spinner-dots {
  display: flex;
  gap: 4px;
}

.spinner-dots span {
  width: 8px;
  height: 8px;
  background: var(--primary, #0f766e);
  border-radius: 50%;
  animation: bounce 1.4s ease-in-out infinite both;
}

.spinner-dots span:nth-child(1) {
  animation-delay: -0.32s;
}

.spinner-dots span:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes bounce {
  0%, 80%, 100% {
    transform: scale(0.8);
    opacity: 0.6;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

.end-message {
  padding: 20px 0;
  text-align: center;
  color: var(--text-tertiary, #9ca3af);
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.05em;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 7px;
  padding: 48px 16px;
  text-align: center;
}
.empty-icon {
  margin-bottom: 3px;
  color: var(--text-tertiary, #9ca3af);
}
.empty-title {
  color: var(--text-primary, #1f2937);
  font-size: 14px;
  font-weight: 650;
}
.empty-text {
  color: var(--text-tertiary, #9ca3af);
  font-size: 12px;
}
.retry-button {
  display: inline-flex;
  min-height: 36px;
  align-items: center;
  justify-content: center;
  gap: 7px;
  margin-top: 8px;
  padding: 0 14px;
  border: 1px solid var(--border-light, #e5e7eb);
  border-radius: 9px;
  background: var(--bg-surface);
  color: var(--text-primary, #1f2937);
  font: inherit;
  font-size: 12px;
  font-weight: 650;
  white-space: nowrap;
  cursor: pointer;
  transition: background var(--transition-fast), transform var(--transition-fast);
}
.retry-button:hover {
  background: var(--bg-hover);
}
.retry-button:active {
  transform: scale(0.98);
}
.retry-button:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 3px;
}

/* 过渡动画 */
.grid-transition-enter-active,
.grid-transition-leave-active {
  transition: opacity 0.25s ease;
}

.grid-transition-enter-from,
.grid-transition-leave-to {
  opacity: 0;
}

.card-fade-enter-active,
.card-fade-leave-active {
  transition: all 0.3s ease;
}

.card-fade-enter-from,
.card-fade-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

.card-fade-move {
  transition: transform 0.3s ease;
}

/* 隐藏 */
.hidden {
  display: none;
}

/* 响应式 */
@media (max-width: 640px) {
  .category-nav {
    gap: 6px;
  }

  .tab-button {
    padding: 6px 10px;
    font-size: 12px;
  }

  .skeleton-grid,
  .grid-container {
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
  }

  .card-title {
    font-size: 12px;
  }

  .card-desc {
    font-size: 10px;
  }
}

@media (min-width: 640px) {
  .grid-container {
    gap: 14px;
  }

  .card-title {
    font-size: 13px;
  }
}

/* 减少动画模式 */
@media (prefers-reduced-motion: reduce) {
  .tab-button,
  .movie-card,
  .skeleton-card,
  .retry-button {
    transition: none;
    animation: none;
  }

  .movie-card:hover {
    transform: none;
  }

  .grid-transition-enter-active,
  .grid-transition-leave-active,
  .card-fade-enter-active,
  .card-fade-leave-active {
    transition: none;
  }

  .card-fade-move {
    transition: none;
  }

  .skeleton-shimmer {
    animation: none;
  }

  .cover-loading {
    animation: none;
  }

  .skeleton-cover {
    background: var(--bg-secondary);
  }

  .skeleton-title,
  .skeleton-desc {
    background: var(--border-light);
    animation: none;
  }

  .spinner-dots span {
    animation: none;
  }
}
</style>

<style scoped>
.category-nav {
  display: flex;
  margin: 0 0 24px;
  padding: 0 0 14px;
  flex-wrap: nowrap;
  gap: 6px;
  overflow-x: auto;
  border-bottom: 1px solid var(--border-light);
  scrollbar-width: none;
}

.category-nav::-webkit-scrollbar {
  display: none;
}

.tab-button {
  position: relative;
  min-height: 36px;
  flex: 0 0 auto;
  padding: 0 13px;
  overflow: visible;
  border: 0;
  border-radius: 9px;
  background: transparent;
  box-shadow: none;
  color: var(--text-secondary);
  font-size: 12px;
  transition: background var(--transition-fast), color var(--transition-fast);
}

.tab-button::before {
  display: none;
}

.tab-button:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.tab-button.is-active {
  border: 0;
  background: var(--primary-soft);
  box-shadow: none;
  color: var(--primary-strong);
}

.content-area {
  min-height: 280px;
}

.skeleton-grid,
.grid-container {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: clamp(12px, 1.8vw, 20px);
}

.skeleton-card,
.movie-card {
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  backdrop-filter: none;
}

.movie-card {
  overflow: visible;
}

.movie-card:hover {
  box-shadow: none;
  transform: translateY(-3px);
}

.card-cover,
.skeleton-cover {
  aspect-ratio: 2 / 3;
  overflow: hidden;
  border: 1px solid var(--border-light);
  border-radius: 12px;
  background: var(--bg-skeleton);
  box-shadow: var(--shadow-sm);
}

.card-cover img {
  transition: transform var(--transition-normal), filter var(--transition-normal);
}

.movie-card:hover .card-cover img {
  transform: scale(1.025);
  filter: saturate(1.04);
}

.cover-placeholder {
  color: var(--text-tertiary);
  background: var(--bg-secondary);
}

.card-info,
.skeleton-info {
  min-height: 58px;
  padding: 10px 2px 0;
}

.card-title {
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 680;
  line-height: 1.45;
}

.card-desc {
  color: var(--text-tertiary);
  font-size: 10px;
}

.end-message,
.empty-state {
  color: var(--text-tertiary);
}

.empty-icon {
  color: var(--text-tertiary);
}

@media (max-width: 840px) {
  .skeleton-grid,
  .grid-container {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

@media (max-width: 620px) {
  .skeleton-grid,
  .grid-container {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 18px 12px;
  }

  .category-nav {
    margin-right: -14px;
    padding-right: 14px;
  }

  .card-title {
    font-size: 12px;
  }
}
</style>
