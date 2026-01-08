<template>
  <!-- 无数据时不显示整个组件 -->
  <div v-if="!loading && searches.length === 0" class="hidden"></div>

  <div v-else class="hot-search-section">
    <div class="cloud-container">
      <!-- 加载状态 -->
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <span>搜索热度加载中...</span>
      </div>

      <!-- 智能标签云 -->
      <div v-else class="tag-cloud">
        <button
          v-for="item in searches"
          :key="item.term"
          class="tag-item"
          :style="getTagStyle(item.score)"
          @click="onSearchClick(item.term)"
        >
          {{ item.term }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

interface Props {
  onSearch: (term: string) => void;
}

interface HotSearchItem {
  term: string;
  score: number;
  lastSearched: number;
  createdAt: number;
}

const props = defineProps<Props>();

// 状态
const loading = ref(false);
const searches = ref<HotSearchItem[]>([]);
const hasInitialized = ref(false);

// 获取热搜数据
async function fetchHotSearches() {
  console.log('[HotSearchSection] 开始获取热搜数据...');
  loading.value = true;
  try {
    const response = await fetch('/api/hot-searches?limit=30');
    const data = await response.json();
    console.log('[HotSearchSection] API 响应:', data);

    if (data.code === 0 && data.data?.hotSearches) {
      // 按分数排序，高分在前
      searches.value = data.data.hotSearches
        .sort((a: HotSearchItem, b: HotSearchItem) => b.score - a.score)
        .slice(0, 30);
      console.log('[HotSearchSection] 获取到热搜数据:', searches.value.length, '条');
    }
  } catch (error) {
    console.error('[HotSearchSection] 获取热搜失败:', error);
    // 失败时不显示任何内容
    searches.value = [];
  } finally {
    loading.value = false;
  }
}

// 首次初始化（只在页面加载时执行一次）
async function init() {
  if (hasInitialized.value) {
    console.log('[HotSearchSection] 已初始化，跳过');
    return;
  }
  console.log('[HotSearchSection] 首次初始化...');
  hasInitialized.value = true;
  await fetchHotSearches();
}

// 刷新数据（每次重置时调用）
async function refresh() {
  console.log('[HotSearchSection] 手动刷新数据...');
  await fetchHotSearches();
}

// 根据分数计算标签样式
function getTagStyle(score: number) {
  if (searches.value.length === 0) return {};

  // 分数映射到字体大小（12px - 24px）
  const minScore = Math.min(...searches.value.map(s => s.score));
  const maxScore = Math.max(...searches.value.map(s => s.score));
  const normalized = (score - minScore) / (maxScore - minScore || 1);
  const fontSize = 12 + normalized * 12; // 12px - 24px

  // 分数映射到颜色 - 使用 PanHub 主题色系
  const colors = [
    { threshold: 80, color: '#ef4444' },  // 红色 - 最热
    { threshold: 60, color: '#f59e0b' },  // 橙色 - 热门
    { threshold: 40, color: '#eab308' },  // 黄色 - 较热
    { threshold: 20, color: '#22c55e' },  // 绿色 - 普通
    { threshold: 0, color: '#3b82f6' }    // 蓝色 - 一般
  ];

  const color = colors.find(c => score >= c.threshold)?.color || '#6b7280';

  // 分数映射到粗细和透明度
  const fontWeight = score >= 70 ? 800 : score >= 40 ? 700 : 600;
  const opacity = 0.7 + normalized * 0.3; // 0.7 - 1.0

  return {
    fontSize: `${fontSize}px`,
    color: color,
    fontWeight: fontWeight,
    opacity: opacity,
    padding: `${6 + normalized * 2}px ${10 + normalized * 4}px`,
    margin: `${4 + (1 - normalized) * 2}px`
  };
}

// 点击搜索词
function onSearchClick(term: string) {
  props.onSearch(term);
}

// 暴露方法给父组件
defineExpose({
  init,           // 首次初始化（只执行一次）
  refresh         // 手动刷新
});
</script>

<style scoped>
.hot-search-section {
  width: 100%;
}

.section-title {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 16px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 使用 SVG 图标替代 emoji */
.section-title::before {
  content: '';
  display: inline-block;
  width: 24px;
  height: 24px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%236366f1' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2'/%3E%3Ccircle cx='9' cy='7' r='4'/%3E%3Cpath d='M22 21v-2a4 4 0 0 0-3-3.87'/%3E%3Cpath d='M16 3.13a4 4 0 0 1 0 7.75'/%3E%3C/svg%3E");
  background-size: contain;
  background-repeat: no-repeat;
}

.cloud-container {
  width: 100%;
}

/* 标签云容器 - 玻璃拟态风格 */
.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 24px;
  background: var(--bg-glass);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: var(--radius-lg);
  min-height: 180px;
}

/* 标签样式 - 现代设计 */
.tag-item {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-primary);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 200ms ease;
  white-space: nowrap;
  text-align: center;
  line-height: 1.2;
  user-select: none;
  position: relative;
}

.tag-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  filter: brightness(1.08);
  z-index: 10;
}

/* 加载状态 */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 40px 20px;
  color: var(--text-secondary);
  background: var(--bg-glass);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: var(--radius-lg);
}

.spinner {
  width: 28px;
  height: 28px;
  border: 3px solid rgba(99, 102, 241, 0.2);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

/* 动画 */
@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 移动端优化 */
@media (max-width: 640px) {
  .section-title {
    font-size: 18px;
  }

  .section-title::before {
    width: 20px;
    height: 20px;
  }

  .tag-cloud {
    padding: 16px;
    gap: 4px;
    min-height: 140px;
  }

  .loading-state {
    padding: 30px 16px;
  }
}

/* 深色模式 */
@media (prefers-color-scheme: dark) {
  .tag-cloud {
    background: rgba(15, 23, 42, 0.6);
    border-color: rgba(255, 255, 255, 0.08);
  }

  .loading-state {
    background: rgba(15, 23, 42, 0.6);
    border-color: rgba(255, 255, 255, 0.08);
  }

  .tag-item {
    background: rgba(30, 41, 59, 0.5);
    border-color: rgba(100, 116, 139, 0.3);
  }

  .tag-item:hover {
    background: rgba(15, 23, 42, 0.7);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }
}

/* 减少动画模式 */
@media (prefers-reduced-motion: reduce) {
  .tag-item,
  .spinner {
    animation: none;
    transition: none;
  }

  .tag-item:hover {
    transform: none;
  }
}

.hidden {
  display: none;
}
</style>
