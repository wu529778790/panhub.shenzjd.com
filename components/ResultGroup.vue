<template>
  <section class="result-group" :aria-labelledby="`platform-${safeId}`">
    <header class="group-header">
      <div class="platform-identity">
        <span class="platform-mark" :style="{ '--platform-color': color }">
          <img :src="icon" alt="" aria-hidden="true" />
        </span>
        <div>
          <h2 :id="`platform-${safeId}`">{{ title }}</h2>
          <span>{{ items.length }} 条资源</span>
        </div>
      </div>

      <button
        v-if="canToggleCollapse && !expanded && items.length > initialVisible"
        class="quiet-button"
        type="button"
        @click="$emit('toggle')">
        展开
        <PhCaretDown :size="14" aria-hidden="true" />
      </button>
    </header>

    <ul class="resource-list">
      <li v-for="r in visibleItems" :key="r.url" class="resource-item">
        <a
          class="resource-link"
          :href="r.url"
          target="_blank"
          rel="noopener noreferrer nofollow"
          :title="r.note || r.url">
          <span>{{ r.note || r.url }}</span>
          <PhArrowUpRight :size="16" aria-hidden="true" />
        </a>

        <div class="resource-meta">
          <span v-if="formatDate(r.datetime)" class="meta-item">
            <PhCalendarBlank :size="14" aria-hidden="true" />
            {{ formatDate(r.datetime) }}
          </span>
          <span v-if="r.password" class="meta-item meta-item--password">
            <PhKey :size="14" aria-hidden="true" />
            提取码 {{ r.password }}
          </span>
          <button
            class="copy-button"
            :class="{ copied: copiedUrl === r.url }"
            type="button"
            :aria-label="copiedUrl === r.url ? '链接已复制' : '复制资源链接'"
            @click.prevent="handleCopy(r.url)">
            <PhCheck v-if="copiedUrl === r.url" :size="15" weight="bold" aria-hidden="true" />
            <PhCopy v-else :size="15" aria-hidden="true" />
            {{ copiedUrl === r.url ? "已复制" : "复制" }}
          </button>
        </div>
      </li>
    </ul>

    <button
      v-if="!expanded && items.length > initialVisible"
      class="more-button"
      type="button"
      @click="$emit('toggle')">
      查看其余 {{ items.length - initialVisible }} 条
      <PhArrowRight :size="15" aria-hidden="true" />
    </button>
  </section>
</template>

<script setup lang="ts">
import {
  PhArrowRight,
  PhArrowUpRight,
  PhCalendarBlank,
  PhCaretDown,
  PhCheck,
  PhCopy,
  PhKey,
} from "@phosphor-icons/vue";

const props = defineProps<{
  title: string;
  color: string;
  icon: string;
  items: any[];
  expanded: boolean;
  initialVisible: number;
  canToggleCollapse?: boolean;
}>();

const emit = defineEmits(["toggle", "copy"]);
const copiedUrl = ref("");
let copyTimer: ReturnType<typeof setTimeout> | null = null;

const safeId = computed(() => props.title.replace(/[^\w\u4e00-\u9fa5-]/g, "-"));
const visibleItems = computed(() =>
  props.expanded ? props.items : props.items.slice(0, props.initialVisible)
);

function handleCopy(url: string) {
  emit("copy", url);
  copiedUrl.value = url;
  if (copyTimer) clearTimeout(copyTimer);
  copyTimer = setTimeout(() => {
    copiedUrl.value = "";
  }, 1500);
}

function formatDate(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const days = Math.floor((Date.now() - date.getTime()) / 86400000);
  if (days <= 0) return "今天";
  if (days === 1) return "昨天";
  if (days < 7) return `${days} 天前`;
  if (days < 365) return `${Math.max(1, Math.floor(days / 30))} 个月前`;
  return date.toLocaleDateString("zh-CN", { year: "numeric", month: "short", day: "numeric" });
}

onBeforeUnmount(() => {
  if (copyTimer) clearTimeout(copyTimer);
});
</script>

<style scoped>
.result-group {
  min-width: 0;
  overflow: hidden;
  border: 1px solid var(--border-light);
  border-radius: var(--radius-lg);
  background: var(--bg-surface);
  box-shadow: var(--shadow-sm);
}

.group-header {
  display: flex;
  min-height: 78px;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 18px;
  border-bottom: 1px solid var(--border-light);
}

.platform-identity {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 12px;
}

.platform-mark {
  display: grid;
  width: 42px;
  height: 42px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 12px;
  background: color-mix(in srgb, var(--platform-color) 14%, var(--bg-surface));
}

.platform-mark img {
  width: 24px;
  height: 24px;
  object-fit: contain;
}

.platform-identity h2 {
  margin: 0 0 3px;
  color: var(--text-primary);
  font-size: 16px;
  font-weight: 760;
  letter-spacing: -0.02em;
}

.platform-identity span span,
.platform-identity div > span {
  color: var(--text-tertiary);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

.quiet-button {
  display: inline-flex;
  min-height: 34px;
  align-items: center;
  gap: 5px;
  padding: 0 10px;
  border: 1px solid var(--border-light);
  border-radius: 9px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 12px;
}

.resource-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.resource-item {
  padding: 16px 18px 14px;
  transition: background var(--transition-fast);
}

.resource-item + .resource-item {
  border-top: 1px solid var(--border-light);
}

.resource-item:hover {
  background: var(--bg-hover);
}

.resource-link {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 650;
  line-height: 1.55;
}

.resource-link span {
  display: -webkit-box;
  overflow: hidden;
  overflow-wrap: anywhere;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.resource-link svg {
  margin-top: 3px;
  color: var(--text-tertiary);
  transition: color var(--transition-fast), transform var(--transition-fast);
}

.resource-link:hover svg {
  color: var(--primary-strong);
  transform: translate(2px, -2px);
}

.resource-meta {
  display: flex;
  margin-top: 10px;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px 14px;
}

.meta-item,
.copy-button {
  display: inline-flex;
  min-height: 26px;
  align-items: center;
  gap: 5px;
  color: var(--text-tertiary);
  font-size: 11px;
}

.meta-item--password {
  color: var(--text-secondary);
}

.copy-button {
  margin-left: auto;
  padding: 0 7px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  transition: background var(--transition-fast), color var(--transition-fast);
}

.copy-button:hover {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.copy-button.copied {
  color: var(--success);
}

.more-button {
  display: flex;
  width: 100%;
  min-height: 48px;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border: 0;
  border-top: 1px solid var(--border-light);
  background: var(--bg-surface-subtle);
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 650;
}

.more-button:hover {
  color: var(--primary-strong);
}

@media (max-width: 520px) {
  .group-header {
    min-height: 70px;
    padding: 12px 14px;
  }

  .platform-mark {
    width: 38px;
    height: 38px;
  }

  .resource-item {
    padding: 14px;
  }

  .resource-link {
    font-size: 13px;
  }
}
</style>
