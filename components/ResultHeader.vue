<template>
  <section class="result-header">
    <!-- 左侧平台过滤器 -->
    <div class="left-section" v-if="hasResults">
      <div class="platform-filters">
        <button
          :class="['filter-pill', { active: currentFilter === 'all' }]"
          @click="$emit('change-filter', 'all')">
          全部
        </button>
        <button
          v-for="p in platforms"
          :key="p"
          :class="['filter-pill', { active: currentFilter === p }]"
          @click="$emit('change-filter', p)">
          {{ platformName(p) }}
        </button>
      </div>
    </div>

    <!-- 右侧统计和排序 -->
    <div class="right-section">
      <!-- 持续搜索指示器 -->
      <div v-if="deepLoading" class="loading-indicator">
        <span class="pulse-dot"></span>
        <span class="loading-text">持续搜索中…</span>
      </div>

      <!-- 统计信息 -->
      <div class="stats" v-if="total > 0 && elapsedMs > 0">
        <span class="stat-item">
          <span class="stat-label">结果</span>
          <span class="stat-value">{{ total }}</span>
        </span>
        <span class="stat-item">
          <span class="stat-label">用时</span>
          <span class="stat-value">{{ elapsedMs }}ms</span>
        </span>
      </div>

      <!-- 排序选择器 -->
      <div class="sorter" v-if="hasResults">
        <div class="sort-wrapper">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 5h10M11 9h7M11 13h4M3 17l3 3 3-3M6 18V6"></path>
          </svg>
          <select
            :value="currentSort"
            class="sort-select"
            @change="$emit('change-sort', ($event.target as HTMLSelectElement).value)">
            <option value="default">默认排序</option>
            <option value="date-desc">最新发布</option>
            <option value="date-asc">最早发布</option>
            <option value="name-asc">名称 A→Z</option>
            <option value="name-desc">名称 Z→A</option>
          </select>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
const props = defineProps<{
  total: number;
  elapsedMs: number;
  platforms: string[];
  hasResults: boolean;
  platformName: (p: string) => string;
  model: { sortType: string; filterPlatform: string };
  deepLoading?: boolean;
}>();
defineEmits(["update:model", "change-filter", "change-sort"]);

const currentFilter = computed(() =>
  typeof props.model.filterPlatform === "object" &&
  (props.model.filterPlatform as any).value !== undefined
    ? (props.model.filterPlatform as any).value
    : props.model.filterPlatform
);
const currentSort = computed(() =>
  typeof props.model.sortType === "object" &&
  (props.model.sortType as any).value !== undefined
    ? (props.model.sortType as any).value
    : props.model.sortType
);

// 交互通过事件通知父组件处理，避免在子组件内直接修改 props
</script>

<style scoped>
/* 结果头部容器 */
.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.62);
  backdrop-filter: blur(8px);
  border: 1px solid var(--border-light);
  border-radius: 14px;
  box-shadow: 0 8px 18px rgba(17, 24, 39, 0.06);
  margin: 16px 0;
}

/* 左侧部分 - 平台过滤器 */
.left-section {
  flex: 1;
  min-width: 0;
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
  transition: background-color var(--transition-fast), border-color var(--transition-fast),
    color var(--transition-fast), transform var(--transition-fast),
    box-shadow var(--transition-fast);
  white-space: nowrap;
}

.filter-pill:hover {
  background: var(--bg-primary);
  border-color: var(--border-medium);
  color: var(--text-primary);
  transform: translateY(-1px);
}

.filter-pill.active {
  background: linear-gradient(135deg, var(--primary), #14b8a6);
  color: white;
  border-color: transparent;
  box-shadow: 0 4px 12px rgba(15, 118, 110, 0.3);
}

/* 右侧部分 - 统计和排序 */
.right-section {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
}

/* 加载指示器 */
.loading-indicator {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: rgba(15, 118, 110, 0.12);
  border: 1px solid rgba(15, 118, 110, 0.24);
  border-radius: 999px;
  font-size: 12px;
  color: var(--primary);
  font-weight: 500;
}

.pulse-dot {
  width: 8px;
  height: 8px;
  background: var(--primary);
  border-radius: 50%;
  animation: pulse 1.5s ease-in-out infinite;
}

.loading-text {
  white-space: nowrap;
}

/* 统计信息 */
.stats {
  display: flex;
  gap: 8px;
  align-items: center;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  font-size: 12px;
}

.stat-label {
  color: var(--text-tertiary);
  font-weight: 500;
}

.stat-value {
  color: var(--primary);
  font-weight: 700;
}

/* 排序器 */
.sorter {
  display: flex;
  align-items: center;
}

.sort-wrapper {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  transition: background-color var(--transition-fast), border-color var(--transition-fast);
}

.sort-wrapper:hover {
  background: var(--bg-primary);
  border-color: var(--border-medium);
}

.sort-wrapper svg {
  color: var(--text-tertiary);
  flex-shrink: 0;
}

.sort-select {
  border: none;
  background: transparent;
  outline: none;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  cursor: pointer;
  min-width: 100px;
}

.sort-select:focus {
  outline: none;
}

/* 移动端优化 */
@media (max-width: 640px) {
  .result-header {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
    padding: 10px;
  }

  .left-section {
    width: 100%;
  }

  .platform-filters {
    gap: 6px;
  }

  .filter-pill {
    padding: 5px 10px;
    font-size: 12px;
  }

  .right-section {
    width: 100%;
    justify-content: space-between;
    gap: 8px;
  }

  .loading-indicator {
    font-size: 11px;
    padding: 5px 10px;
  }

  .stats {
    gap: 6px;
  }

  .stat-item {
    padding: 5px 8px;
    font-size: 11px;
  }

  .sort-wrapper {
    padding: 5px 8px;
  }

  .sort-select {
    font-size: 12px;
    min-width: 80px;
  }
}

/* 超小屏幕优化 */
@media (max-width: 360px) {
  .filter-pill {
    padding: 4px 8px;
    font-size: 11px;
  }

  .stat-item {
    padding: 4px 6px;
  }

  .sort-wrapper {
    padding: 4px 6px;
  }

  .sort-select {
    min-width: 70px;
  }
}

/* 深色模式支持 */
@media (prefers-color-scheme: dark) {
  .result-header {
    background: rgba(22, 27, 34, 0.65);
    border-color: var(--border-light);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
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
    border-color: transparent;
    box-shadow: 0 4px 12px rgba(13, 148, 136, 0.35);
  }

  .loading-indicator {
    background: rgba(13, 148, 136, 0.12);
    border-color: rgba(13, 148, 136, 0.2);
    color: var(--primary);
  }

  .pulse-dot {
    background: var(--primary);
  }

  .stat-item {
    background: var(--bg-secondary);
    border-color: var(--border-light);
  }

  .stat-value {
    color: var(--primary);
  }

  .sort-wrapper {
    background: var(--bg-secondary);
    border-color: var(--border-light);
  }

  .sort-wrapper:hover {
    background: rgba(255, 255, 255, 0.06);
    border-color: var(--border-medium);
  }

  .sort-wrapper svg {
    color: var(--text-tertiary);
  }

  .sort-select {
    color: var(--text-primary);
  }

  .sort-select option {
    background: var(--bg-secondary);
    color: var(--text-primary);
  }
}

/* 高对比度模式支持 */
@media (prefers-contrast: high) {
  .filter-pill.active {
    border-width: 2px;
  }

  .stat-item {
    border-width: 2px;
  }

  .sort-wrapper {
    border-width: 2px;
  }
}

/* 减少动画模式支持 */
@media (prefers-reduced-motion: reduce) {
  .result-header,
  .filter-pill,
  .sort-wrapper {
    transition: none;
  }

  .filter-pill:hover,
  .sort-wrapper:hover {
    transform: none;
  }

  .pulse-dot {
    animation: none;
    opacity: 0.7;
  }
}

/* 动画 */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
</style>
