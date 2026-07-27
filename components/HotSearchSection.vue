<template>
  <aside v-if="loading || searches.length" class="hot-search-section" aria-labelledby="hot-search-title">
    <header class="hot-header">
      <div>
        <span class="hot-kicker">{{ usingFallback ? "热门推荐" : "实时趋势" }}</span>
        <h2 id="hot-search-title">{{ usingFallback ? "试试这些" : "大家正在找" }}</h2>
      </div>
      <PhTrendUp :size="24" weight="regular" aria-hidden="true" />
    </header>

    <div v-if="loading" class="hot-skeleton" aria-label="热门搜索加载中">
      <span v-for="i in 6" :key="i" :style="{ width: `${92 - i * 6}%` }" />
    </div>

    <ol v-else class="hot-list">
      <li v-for="(item, index) in searches.slice(0, 9)" :key="item.term">
        <button
          type="button"
          :aria-label="`搜索 ${item.term}`"
          @click="emit('search', item.term)">
          <span class="hot-rank">{{ String(index + 1).padStart(2, "0") }}</span>
          <span class="hot-term">{{ item.term }}</span>
          <PhArrowUpRight :size="16" aria-hidden="true" />
        </button>
      </li>
    </ol>
  </aside>
</template>

<script setup lang="ts">
import { PhArrowUpRight, PhTrendUp } from "@phosphor-icons/vue";

interface HotSearchItem {
  term: string;
  score: number;
  lastSearched: number;
  createdAt: number;
}

const FALLBACK_SEARCHES: HotSearchItem[] = [
  "热门电影",
  "国产剧",
  "纪录片",
  "考公资料",
  "Office 教程",
  "Python",
  "无损音乐",
  "设计素材",
  "儿童动画",
].map((term) => ({ term, score: 0, lastSearched: 0, createdAt: 0 }));

const emit = defineEmits<{
  search: [term: string];
}>();
const loading = ref(false);
const searches = ref<HotSearchItem[]>([...FALLBACK_SEARCHES]);
const hasInitialized = ref(false);
const usingFallback = ref(true);

async function fetchHotSearches() {
  loading.value = true;
  try {
    const response = await fetch("/api/hot-searches?limit=12");
    const data = await response.json();
    const incoming = data.code === 0 && data.data?.hotSearches
      ? [...data.data.hotSearches]
          .sort((a: HotSearchItem, b: HotSearchItem) => b.score - a.score)
          .slice(0, 9)
      : [];
    usingFallback.value = incoming.length === 0;
    searches.value = usingFallback.value ? FALLBACK_SEARCHES : incoming;
  } catch {
    usingFallback.value = true;
    searches.value = FALLBACK_SEARCHES;
  } finally {
    loading.value = false;
  }
}

async function init() {
  if (hasInitialized.value) return;
  hasInitialized.value = true;
  await fetchHotSearches();
}

async function refresh() {
  await fetchHotSearches();
}

onMounted(() => void init());

defineExpose({ init, refresh });
</script>

<style scoped>
.hot-search-section {
  width: 100%;
  padding: 12px 0 0 38px;
  border-left: 1px solid var(--border-light);
}

.hot-header {
  display: flex;
  margin-bottom: 16px;
  align-items: flex-start;
  justify-content: space-between;
  color: var(--text-secondary);
}

.hot-kicker {
  display: block;
  margin-bottom: 7px;
  color: var(--primary-strong);
  font-size: 12px;
  font-weight: 760;
  letter-spacing: 0.08em;
}

.hot-header h2 {
  margin: 0;
  color: var(--text-primary);
  font-size: clamp(22px, 2vw, 28px);
  font-weight: 760;
  letter-spacing: -0.04em;
}

.hot-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.hot-list li + li {
  border-top: 1px solid var(--border-light);
}

.hot-list button {
  display: grid;
  width: 100%;
  min-height: 43px;
  grid-template-columns: 28px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  padding: 0 4px;
  border: 0;
  background: transparent;
  color: var(--text-secondary);
  text-align: left;
  transition: color var(--transition-fast), transform 360ms var(--ease-spring);
}

.hot-list button:hover {
  color: var(--text-primary);
  transform: translateX(4px);
}

.hot-list button:active {
  transform: scale(0.985);
}

.hot-list button svg {
  transition: color var(--transition-fast), transform 360ms var(--ease-spring);
}

.hot-list button:hover svg {
  color: var(--primary-strong);
  transform: translate(2px, -2px);
}

.hot-rank {
  color: var(--text-tertiary);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  font-weight: 650;
}

.hot-term {
  overflow: hidden;
  font-size: 14px;
  font-weight: 560;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hot-skeleton {
  display: grid;
  gap: 12px;
}

.hot-skeleton span {
  display: block;
  height: 20px;
  border-radius: 6px;
  background: var(--bg-skeleton);
  animation: pulse 1.3s ease-in-out infinite;
}

@media (max-width: 820px) {
  .hot-search-section {
    padding: 24px 0 0;
    border-top: 1px solid var(--border-light);
    border-left: 0;
  }

  .hot-list {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    column-gap: 20px;
  }

  .hot-list li:nth-child(2) {
    border-top: 0;
  }
}

@media (max-width: 520px) {
  .hot-list {
    grid-template-columns: 1fr;
  }

  .hot-list li:nth-child(2) {
    border-top: 1px solid var(--border-light);
  }
}
</style>
