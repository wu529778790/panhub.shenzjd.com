<template>
  <div class="result-card">
    <!-- 卡片头部 -->
    <div class="card-header">
      <div class="platform-badge" :style="{ background: color }">
        <span class="platform-icon">{{ icon }}</span>
      </div>
      <div class="header-info">
        <h3 class="platform-title">{{ title }}</h3>
        <span class="resource-count">{{ items.length }} 个资源</span>
      </div>
      <button
        v-if="canToggleCollapse && !expanded && items.length > initialVisible"
        class="expand-btn"
        @click="$emit('toggle')">
        展开
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M6 9l6 6 6-6"></path>
        </svg>
      </button>
    </div>

    <!-- 资源列表 -->
    <ul class="resource-list">
      <li v-for="(r, idx) in visibleItems" :key="idx" class="resource-item">
        <div class="resource-content">
          <a
            class="resource-link"
            :href="r.url"
            target="_blank"
            rel="noopener noreferrer nofollow"
            :title="r.note || r.url">
            <span class="link-text">{{ r.note || r.url }}</span>
            <svg class="external-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
              <polyline points="15 3 21 3 21 9"></polyline>
              <line x1="10" y1="14" x2="21" y2="3"></line>
            </svg>
          </a>

          <div class="resource-meta">
            <div class="meta-tags">
              <span class="meta-tag date">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                {{ formatDate(r.datetime) || "时间未知" }}
              </span>

              <span v-if="r.password" class="meta-tag password">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <circle cx="12" cy="16" r="1"></circle>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
                提取码: {{ r.password }}
              </span>
            </div>

            <button class="copy-btn" @click.prevent="$emit('copy', r.url)" title="复制链接">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
              复制
            </button>
          </div>
        </div>
      </li>
    </ul>

    <!-- 底部展开按钮 -->
    <div v-if="!expanded && items.length > initialVisible" class="card-footer">
      <button class="load-more-btn" @click="$emit('toggle')">
        显示更多 ({{ items.length - initialVisible }})
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 5v14M5 12l7 7 7-7"></path>
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  title: string;
  color: string;
  icon: string;
  items: any[];
  expanded: boolean;
  initialVisible: number;
  canToggleCollapse?: boolean;
}>();
defineEmits(["toggle", "copy"]);

const visibleItems = computed(() =>
  props.expanded ? props.items : props.items.slice(0, props.initialVisible)
);

function formatDate(d?: string) {
  if (!d) return "";
  const dt = new Date(d);
  return isNaN(dt.getTime())
    ? ""
    : dt.toLocaleDateString() + " " + dt.toLocaleTimeString();
}
</script>

<style scoped>
/* 结果卡片主体 - 玻璃拟态设计 */
.result-card {
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid var(--border-light);
  border-radius: 16px;
  box-shadow: 0 8px 22px rgba(17, 24, 39, 0.06);
  overflow: hidden;
  transition: box-shadow var(--transition-normal), transform var(--transition-normal),
    border-color var(--transition-normal);
}

.result-card:hover {
  box-shadow: 0 14px 28px rgba(17, 24, 39, 0.1);
  transform: translateY(-3px);
}

/* 卡片头部 */
.card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: rgba(255, 255, 255, 0.6);
  border-bottom: 1px solid var(--border-light);
  position: relative;
}

.card-header::after {
  content: "";
  position: absolute;
  bottom: 0;
  left: 16px;
  right: 16px;
  height: 1px;
  background: linear-gradient(90deg, var(--primary), transparent 70%);
  opacity: 0.25;
}

/* 平台徽章 */
.platform-badge {
  width: 36px;
  height: 36px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 16px;
  font-weight: 700;
  box-shadow: 0 5px 10px rgba(17, 24, 39, 0.2);
  flex-shrink: 0;
}

.platform-icon {
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.2));
}

/* 头部信息 */
.header-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.platform-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
  line-height: 1.2;
}

.resource-count {
  font-size: 12px;
  color: var(--text-tertiary);
  font-weight: 500;
}

/* 展开按钮 */
.expand-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  background: transparent;
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color var(--transition-fast), border-color var(--transition-fast),
    color var(--transition-fast), transform var(--transition-fast);
  white-space: nowrap;
}

.expand-btn:hover {
  background: var(--bg-secondary);
  border-color: var(--border-medium);
  color: var(--text-primary);
  transform: translateY(-1px);
}

.expand-btn svg {
  stroke: currentColor;
}

/* 资源列表 */
.resource-list {
  list-style: none;
  padding: 0;
  margin: 0;
  max-height: 600px;
  overflow-y: auto;
}

/* 自定义滚动条 */
.resource-list::-webkit-scrollbar {
  width: 6px;
}

.resource-list::-webkit-scrollbar-track {
  background: transparent;
}

.resource-list::-webkit-scrollbar-thumb {
  background: var(--border-light);
  border-radius: 3px;
}

.resource-list::-webkit-scrollbar-thumb:hover {
  background: var(--border-medium);
}

/* 单个资源项 */
.resource-item {
  padding: 14px 16px;
  border-bottom: 1px solid var(--border-light);
  transition: background var(--transition-fast);
}

.resource-item:last-child {
  border-bottom: none;
}

.resource-item:hover {
  background: rgba(15, 118, 110, 0.04);
}

.resource-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* 资源链接 */
.resource-link {
  display: flex;
  align-items: center;
  gap: 6px;
  text-decoration: none;
  color: var(--primary);
  font-weight: 600;
  font-size: 14px;
  line-height: 1.4;
  transition: color var(--transition-fast), gap var(--transition-fast);
  word-break: break-word;
  overflow-wrap: anywhere;
}

.resource-link:hover {
  color: var(--primary-dark);
  gap: 8px;
}

.link-text {
  flex: 1;
  min-width: 0;
}

.external-icon {
  opacity: 0;
  transform: translateX(-4px);
  transition: opacity var(--transition-fast), transform var(--transition-fast);
  flex-shrink: 0;
}

.resource-link:hover .external-icon {
  opacity: 1;
  transform: translateX(0);
}

.external-icon {
  stroke: currentColor;
}

/* 资源元数据 */
.resource-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
}

.meta-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  flex: 1;
}

/* 元数据标签 */
.meta-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-light);
  border-radius: 999px;
  font-size: 11px;
  color: var(--text-secondary);
  font-weight: 500;
}

.meta-tag svg {
  stroke: currentColor;
  opacity: 0.7;
}

.meta-tag.date {
  background: rgba(99, 102, 241, 0.08);
  border-color: rgba(99, 102, 241, 0.15);
  color: var(--primary);
}

.meta-tag.password {
  background: rgba(16, 185, 129, 0.1);
  border-color: rgba(16, 185, 129, 0.2);
  color: var(--success);
}

/* 复制按钮 */
.copy-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  background: transparent;
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color var(--transition-fast), border-color var(--transition-fast),
    color var(--transition-fast), transform var(--transition-fast);
  white-space: nowrap;
}

.copy-btn:hover {
  background: var(--bg-secondary);
  border-color: var(--border-medium);
  color: var(--text-primary);
  transform: translateY(-1px);
}

.copy-btn:active {
  transform: translateY(0);
  background: var(--border-light);
}

.copy-btn svg {
  stroke: currentColor;
}

/* 卡片底部 */
.card-footer {
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.3);
  border-top: 1px solid var(--border-light);
  text-align: center;
}

.load-more-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: linear-gradient(135deg, var(--primary), #14b8a6);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: transform var(--transition-fast), box-shadow var(--transition-fast);
  box-shadow: 0 4px 12px rgba(15, 118, 110, 0.3);
}

.load-more-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(15, 118, 110, 0.4);
}

.load-more-btn:active {
  transform: translateY(0);
}

.load-more-btn svg {
  stroke: currentColor;
}

/* 移动端优化 */
@media (max-width: 640px) {
  .card-header {
    padding: 12px;
    gap: 10px;
  }

  .platform-badge {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    font-size: 14px;
  }

  .platform-title {
    font-size: 15px;
  }

  .resource-item {
    padding: 12px;
  }

  .resource-link {
    font-size: 13px;
  }

  .meta-tag {
    padding: 3px 6px;
    font-size: 10px;
  }

  .copy-btn {
    padding: 5px 8px;
    font-size: 11px;
  }

  .expand-btn {
    padding: 5px 8px;
    font-size: 11px;
  }

  .load-more-btn {
    padding: 8px 12px;
    font-size: 13px;
  }
}

/* 深色模式支持 */
@media (prefers-color-scheme: dark) {
  .result-card {
    background: rgba(22, 27, 34, 0.7);
    border-color: var(--border-light);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  }

  .result-card:hover {
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  }

  .card-header {
    background: rgba(22, 27, 34, 0.5);
    border-bottom-color: var(--border-light);
  }

  .card-header::after {
    background: linear-gradient(90deg, var(--primary), transparent 70%);
    opacity: 0.2;
  }

  .platform-badge {
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.4);
  }

  .resource-item {
    border-bottom-color: var(--border-light);
  }

  .resource-item:hover {
    background: rgba(13, 148, 136, 0.06);
  }

  .resource-link {
    color: var(--primary);
  }

  .resource-link:hover {
    color: var(--primary-dark);
  }

  .meta-tag {
    background: var(--bg-secondary);
    border-color: var(--border-light);
    color: var(--text-secondary);
  }

  .meta-tag.date {
    background: rgba(13, 148, 136, 0.1);
    border-color: rgba(13, 148, 136, 0.18);
    color: var(--primary);
  }

  .meta-tag.password {
    background: rgba(52, 211, 153, 0.1);
    border-color: rgba(52, 211, 153, 0.18);
    color: #34d399;
  }

  .expand-btn {
    background: var(--bg-secondary);
    border-color: var(--border-light);
    color: var(--text-secondary);
  }

  .expand-btn:hover {
    background: rgba(255, 255, 255, 0.06);
    border-color: var(--border-medium);
    color: var(--text-primary);
  }

  .copy-btn {
    background: var(--bg-secondary);
    border-color: var(--border-light);
    color: var(--text-secondary);
  }

  .copy-btn:hover {
    background: rgba(255, 255, 255, 0.06);
    border-color: var(--border-medium);
    color: var(--text-primary);
  }

  .card-footer {
    background: rgba(22, 27, 34, 0.4);
    border-top-color: var(--border-light);
  }

  .load-more-btn {
    background: linear-gradient(135deg, #0d9488, #14b8a6);
    color: #042f2e;
    box-shadow: 0 4px 12px rgba(13, 148, 136, 0.35);
  }

  .load-more-btn:hover {
    box-shadow: 0 6px 16px rgba(13, 148, 136, 0.45);
  }

  .resource-list::-webkit-scrollbar-thumb {
    background: var(--border-medium);
  }
}

/* 高对比度模式支持 */
@media (prefers-contrast: high) {
  .result-card {
    border-width: 2px;
  }

  .platform-badge {
    border: 2px solid white;
  }

  .meta-tag {
    border-width: 2px;
  }

  .copy-btn,
  .expand-btn,
  .load-more-btn {
    border-width: 2px;
  }
}

/* 减少动画模式支持 */
@media (prefers-reduced-motion: reduce) {
  .result-card,
  .resource-item,
  .resource-link,
  .expand-btn,
  .copy-btn,
  .load-more-btn {
    transition: none;
  }

  .result-card:hover,
  .resource-link:hover,
  .expand-btn:hover,
  .copy-btn:hover,
  .load-more-btn:hover {
    transform: none;
  }

  .external-icon {
    transition: none;
  }
}
</style>
