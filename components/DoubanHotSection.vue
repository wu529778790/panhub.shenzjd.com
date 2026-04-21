<template>
  <div v-if="!hasAnyData" class="hidden"></div>

  <div v-else class="douban-section">
    <!-- 分类 Tabs - 始终可点击 -->
    <nav class="category-nav" role="tablist">
      <button
        v-for="cat in availableCategories"
        :key="cat.id"
        :class="['tab-button', { 'is-active': selectedCategoryId === cat.id }]"
        :aria-selected="selectedCategoryId === cat.id"
        role="tab"
        @click="selectCategory(cat.id)"
      >
        <span class="tab-label">{{ cat.label }}</span>
        <span class="tab-type">{{ cat.type || "榜单" }}</span>
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
              :aria-label="`搜索 ${extractTerm(item.title)}`"
              @click="onItemClick(item.title)"
            >
              <div class="card-cover">
                <img
                  v-if="item.cover && !imgFailed.includes(item.id ?? 0)"
                  :src="proxyCover(item.cover)"
                  :alt="extractTerm(item.title)"
                  loading="lazy"
                  referrerpolicy="no-referrer"
                  @error="onImgError(item.id ?? 0)"
                />
                <div v-else class="cover-placeholder">🎬</div>
              </div>
              <div class="card-info">
                <span class="card-title">{{ extractTerm(item.title) }}</span>
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
          — 已经到底了 —
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onBeforeUnmount, nextTick } from "vue";

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

const props = defineProps<Props>();

const loading = ref(false);
const loadingMore = ref(false);
const items = ref<DoubanHotItem[]>([]);
const hasMore = ref(true);
const imgFailed = ref<number[]>([]);
const selectedCategoryId = ref<string>("douban-top250");
const currentPage = ref(1);
const loadObserver = ref<IntersectionObserver | null>(null);
const loadTriggerRef = ref<HTMLElement | null>(null);

// 所有可用的分类配置
const availableCategories = computed(() => {
  return [
    { id: "douban-top250", label: "电影", type: "Top250" },
    { id: "douban-movie", label: "电影", type: "新片榜" },
    { id: "douban-weekly", label: "电影", type: "口碑榜" },
    { id: "douban-us-box", label: "电影", type: "北美票房" },
  ];
});

// 是否有任何数据
const hasAnyData = computed(() => {
  return items.value.length > 0 || loading.value;
});

function onImgError(id: number) {
  if (!imgFailed.value.includes(id)) {
    imgFailed.value = [...imgFailed.value, id];
  }
}

function extractTerm(title: string): string {
  return title.replace(/^【[\d.]+】/, "").replace(/^#\d+\s*/, "").trim() || title;
}

function proxyCover(url: string): string {
  if (!url) return "";
  return `/api/img?url=${encodeURIComponent(url)}`;
}

async function fetchCategoryData(categoryId: string, page: number, append = false) {
  if (page === 1) {
    loading.value = true;
  } else {
    loadingMore.value = true;
  }

  try {
    const response = await fetch(`/api/douban-hot?category=${categoryId}&page=${page}&limit=25`);
    const data = await response.json();

    if (data.code === 0 && data.data) {
      const newItems = data.data.items || [];
      if (append) {
        items.value = [...items.value, ...newItems];
      } else {
        items.value = newItems;
      }
      hasMore.value = data.data.hasMore !== undefined ? data.data.hasMore : newItems.length >= 25;
      currentPage.value = page;
    } else {
      if (!append) {
        items.value = [];
      }
      hasMore.value = false;
    }
  } catch {
    if (!append) {
      items.value = [];
    }
    hasMore.value = false;
  } finally {
    loading.value = false;
    loadingMore.value = false;
  }
}

async function selectCategory(categoryId: string) {
  // 如果点击的是当前分类且有数据且正在加载，不做处理
  if (categoryId === selectedCategoryId.value && items.value.length > 0 && loading.value) return;

  // 立即更新状态和清空内容，给用户即时反馈
  selectedCategoryId.value = categoryId;
  currentPage.value = 1;
  hasMore.value = true;
  items.value = []; // 立即清空当前内容
  loading.value = true; // 立即显示骨架屏

  // 开始获取新数据
  await fetchCategoryData(categoryId, 1, false);
  await nextTick();
  setupLoadMoreObserver();
}

async function loadMore() {
  if (loadingMore.value || !hasMore.value) return;
  await fetchCategoryData(selectedCategoryId.value, currentPage.value + 1, true);
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
  background: rgba(255, 255, 255, 0.7);
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
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(10px);
  border: 1px solid var(--border-light, #e5e7eb);
  border-radius: 12px;
  overflow: hidden;
  animation: skeleton-pulse 2s ease-in-out infinite;
}

.skeleton-cover {
  aspect-ratio: 2 / 3;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
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
    rgba(255, 255, 255, 0.6) 50%,
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
  background: rgba(255, 255, 255, 0.75);
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
  transition: transform 0.3s ease;
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

/* 深色模式 */
@media (prefers-color-scheme: dark) {
  .tab-button {
    background: rgba(22, 27, 34, 0.6);
    border-color: var(--border-light);
    color: var(--text-secondary);
  }

  .tab-button::before {
    background: linear-gradient(135deg, rgba(13, 148, 136, 0.08) 0%, rgba(251, 191, 36, 0.04) 100%);
  }

  .tab-button:hover {
    background: rgba(255, 255, 255, 0.06);
    border-color: var(--border-medium);
  }

  .tab-button.is-active {
    background: rgba(13, 148, 136, 0.12);
    border-color: var(--primary);
    color: var(--primary);
    box-shadow: 0 2px 8px rgba(13, 148, 136, 0.2);
  }

  .skeleton-card {
    background: rgba(22, 27, 34, 0.7);
    border-color: var(--border-light);
  }

  .skeleton-cover {
    background: linear-gradient(90deg, #161b22 25%, #21262d 50%, #161b22 75%);
    background-size: 200% 100%;
  }

  .skeleton-shimmer {
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(255, 255, 255, 0.04) 50%,
      transparent 100%
    );
  }

  .skeleton-title {
    background: linear-gradient(90deg, #21262d 25%, #30363d 50%, #21262d 75%);
    background-size: 200% 100%;
  }

  .skeleton-desc {
    background: linear-gradient(90deg, #1a1f26 25%, #262c34 50%, #1a1f26 75%);
    background-size: 200% 100%;
  }

  .movie-card {
    background: rgba(22, 27, 34, 0.7);
    border-color: var(--border-light);
  }

  .card-cover {
    background: linear-gradient(135deg, #161b22 0%, #21262d 100%);
  }

  .cover-placeholder {
    background: rgba(13, 148, 136, 0.08);
  }

  .movie-card:hover {
    box-shadow: 0 8px 20px rgba(13, 148, 136, 0.15);
  }

  .card-info {
    background: transparent;
  }

  .card-title {
    color: var(--text-primary);
  }

  .card-desc {
    color: var(--text-tertiary);
  }

  .loading-more {
    color: var(--text-secondary);
  }

  .spinner-dots span {
    background: var(--primary);
  }

  .end-message {
    color: var(--text-tertiary);
  }
}

/* 减少动画模式 */
@media (prefers-reduced-motion: reduce) {
  .tab-button,
  .movie-card,
  .skeleton-card {
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
