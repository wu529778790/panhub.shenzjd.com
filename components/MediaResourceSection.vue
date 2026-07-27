<template>
  <section id="media-resources" class="media-resources" aria-labelledby="media-resources-title">
    <header class="media-resources__header">
      <div>
        <h2 id="media-resources-title">《{{ title }}》相关资源</h2>
        <p>资料页先显示，网盘和磁力结果在浏览器空闲后并行补充。</p>
      </div>
      <dl aria-label="资源搜索概况">
        <div>
          <dt>网盘</dt>
          <dd>{{ cloudAvailableCount }}</dd>
        </div>
        <div>
          <dt>磁力</dt>
          <dd>{{ magnetAvailableCount }}</dd>
        </div>
        <div v-if="searchState.elapsedMs">
          <dt>用时</dt>
          <dd>{{ (searchState.elapsedMs / 1000).toFixed(1) }} 秒</dd>
        </div>
      </dl>
    </header>

    <div class="media-resources__controls">
      <div class="media-resources__areas" role="tablist" aria-label="资源类型">
        <button
          type="button"
          role="tab"
          :aria-selected="activeArea === 'cloud'"
          :class="{ active: activeArea === 'cloud' }"
          @click="activeArea = 'cloud'">
          <PhCloud :size="17" aria-hidden="true" />
          网盘
          <span>{{ cloudAvailableCount }}</span>
        </button>
        <button
          type="button"
          role="tab"
          :aria-selected="activeArea === 'magnet'"
          :class="{ active: activeArea === 'magnet' }"
          @click="activeArea = 'magnet'">
          <PhMagnet :size="17" aria-hidden="true" />
          磁力
          <span>{{ magnetAvailableCount }}</span>
        </button>
      </div>

      <div class="media-resources__actions">
        <div class="media-resources__match" aria-label="匹配方式">
          <button
            type="button"
            :class="{ active: matchMode === 'exact' }"
            @click="changeMatchMode('exact')">
            精确
          </button>
          <button
            type="button"
            :class="{ active: matchMode === 'fuzzy' }"
            @click="changeMatchMode('fuzzy')">
            模糊
          </button>
        </div>
        <button
          v-if="adultCount"
          class="media-resources__quiet-action"
          type="button"
          @click="toggleAdultFilter">
          <PhEyeSlash v-if="settings.filterAdultContent" :size="16" aria-hidden="true" />
          <PhEye v-else :size="16" aria-hidden="true" />
          {{ settings.filterAdultContent ? "显示成人资源" : "隐藏成人资源" }}
        </button>
        <button
          v-if="deadCount"
          class="media-resources__quiet-action"
          type="button"
          @click="showDeadLinks = !showDeadLinks">
          <PhLinkBreak :size="16" aria-hidden="true" />
          {{ showDeadLinks ? "隐藏失效" : `查看失效 ${deadCount}` }}
        </button>
        <button
          class="media-resources__refresh"
          type="button"
          :disabled="searchState.loading"
          @click="startSearch(activeKeyword)">
          <PhArrowClockwise :size="16" aria-hidden="true" />
          {{ searchState.loading ? "搜索中" : "重新搜索" }}
        </button>
      </div>
    </div>

    <div v-if="suggestions.length" class="media-resources__suggestions" aria-label="搜索写法">
      <span>换个写法</span>
      <button
        v-for="keyword in suggestions"
        :key="keyword"
        type="button"
        :class="{ active: keyword === activeKeyword }"
        :disabled="searchState.loading"
        @click="startSearch(keyword)">
        {{ keyword }}
      </button>
    </div>

    <div
      v-if="searchState.loading && !visibleItems.length"
      class="media-resources__skeleton"
      role="status"
      aria-live="polite"
      aria-label="正在搜索相关资源">
      <span>正在连接多个公开索引</span>
      <div v-for="index in 5" :key="index" aria-hidden="true">
        <i />
        <p><b /><b /></p>
        <em />
      </div>
    </div>

    <SearchResultList
      v-else-if="visibleItems.length"
      :items="visibleItems"
      :analyses="{}"
      :ai-loading="false"
      :pending-ids="{}"
      :health-by-url="healthByUrl"
      :reportable="activeArea === 'cloud'"
      :label="activeArea === 'cloud' ? '网盘资源列表' : '磁力资源列表'"
      @open="recordResultOpen"
      @copy="copyResult"
      @report-invalid="reportInvalid" />

    <button
      v-if="filteredItems.length > visibleCount"
      class="media-resources__more"
      type="button"
      @click="visibleCount += 24">
      显示更多
      <span>{{ filteredItems.length - visibleCount }} 条</span>
    </button>

    <div
      v-if="
        searchState.searched &&
        !searchState.loading &&
        !searchState.deepLoading &&
        !visibleItems.length
      "
      class="media-resources__empty"
      role="status">
      <PhMagnifyingGlassMinus :size="30" aria-hidden="true" />
      <div>
        <h3>{{ emptyTitle }}</h3>
        <p>{{ emptyDescription }}</p>
      </div>
      <button
        v-if="otherAreaCount"
        type="button"
        @click="activeArea = activeArea === 'cloud' ? 'magnet' : 'cloud'">
        查看{{ activeArea === "cloud" ? "磁力" : "网盘" }}结果
      </button>
      <button
        v-else-if="matchMode === 'exact'"
        type="button"
        @click="changeMatchMode('fuzzy')">
        改用模糊搜索
      </button>
    </div>

    <div v-if="searchState.error" class="media-resources__error" role="alert">
      <PhWarningCircle :size="18" aria-hidden="true" />
      {{ searchState.error }}
    </div>

    <footer v-if="searchState.deepLoading || searchState.loading" aria-live="polite">
      <span>{{ searchState.deepLoading ? "仍在补充更多来源" : "正在搜索" }}</span>
      <button v-if="searchState.loading && !searchState.paused" type="button" @click="pauseSearch">
        暂停
      </button>
      <button v-else-if="searchState.paused" type="button" @click="resumeSearch">
        继续
      </button>
    </footer>
  </section>
</template>

<script setup lang="ts">
import {
  PhArrowClockwise,
  PhCloud,
  PhEye,
  PhEyeSlash,
  PhLinkBreak,
  PhMagnet,
  PhMagnifyingGlassMinus,
  PhWarningCircle,
} from "@phosphor-icons/vue";
import type { SearchMatchMode, SearchViewItem } from "~/types/search";
import { groupCloudSearchItems } from "~/utils/groupCloudSearchItems";
import { evaluateSearchResult } from "~/utils/searchEvaluation";
import { createSearchViewId } from "~/utils/searchViewId";
import { isAdultContent } from "~/utils/torrentMetadata";

const props = withDefaults(defineProps<{
  title: string;
  year?: string;
  kind: "movie" | "tv";
  suggestions?: string[];
}>(), {
  year: "",
  suggestions: () => [],
});

const runtimeConfig = useRuntimeConfig();
const apiBase = (runtimeConfig.public?.apiBase as string) || "/api";
const activeArea = ref<"cloud" | "magnet">("cloud");
const matchMode = ref<SearchMatchMode>("fuzzy");
const activeKeyword = ref(props.title);
const visibleCount = ref(24);
const showDeadLinks = ref(false);
let scheduledSearch: number | undefined;

const {
  state: searchState,
  performSearch,
  cancelActiveRequests,
  pauseSearch,
  continueSearch,
  copyLink,
} = useSearch();
const { settings, loadSettings, saveSettings } = useSettings();
const {
  healthByUrl,
  get: getLinkHealth,
  load: loadLinkHealth,
  report: reportLinkHealth,
} = useLinkHealth();
const { showToast } = useToast();
const { getAttribution } = useSeoAttribution();
const { getContext: getTrafficContext } = useTrafficAnalytics();

const allItems = computed<SearchViewItem[]>(() => {
  const seen = new Set<string>();
  const result: SearchViewItem[] = [];
  for (const [type, links] of Object.entries(searchState.value.merged)) {
    for (const link of links || []) {
      const url = String(link.url || "").trim();
      if (!url) continue;
      const normalizedUrl = url.replace(/\/$/, "").toLowerCase();
      if (seen.has(normalizedUrl)) continue;
      seen.add(normalizedUrl);
      const item: SearchViewItem = {
        ...link,
        id: createSearchViewId(type, url),
        type,
        title: String(link.note || url).slice(0, 500),
      };
      const evaluation = evaluateSearchResult(item, activeKeyword.value, type);
      result.push({
        ...item,
        evaluation,
        relevance_score: evaluation.overall,
      });
    }
  }
  return result;
});

function isMagnet(item: SearchViewItem): boolean {
  return item.type === "magnet" || /^magnet:\?/i.test(item.url);
}

function isAdult(item: SearchViewItem): boolean {
  return item.metadata?.adult === true || isAdultContent(
    item.title,
    `${item.category || ""} ${item.metadata?.category || ""}`
  );
}

function isDead(item: SearchViewItem): boolean {
  return getLinkHealth(item.url)?.status === "dead";
}

function sortByQuality(items: SearchViewItem[]): SearchViewItem[] {
  return [...items].sort(
    (left, right) =>
      Number(right.evaluation?.overall || 0) -
        Number(left.evaluation?.overall || 0) ||
      Number(right.evaluation?.relevance || 0) -
        Number(left.evaluation?.relevance || 0) ||
      left.title.localeCompare(right.title, "zh-CN")
  );
}

const cloudItems = computed(() =>
  sortByQuality(
    groupCloudSearchItems(
      allItems.value.filter((item) => !isMagnet(item)),
      (url) => getLinkHealth(url)?.status
    )
  )
);
const magnetItems = computed(() =>
  sortByQuality(allItems.value.filter(isMagnet))
);
const activeItems = computed(() =>
  activeArea.value === "cloud" ? cloudItems.value : magnetItems.value
);
const deadCount = computed(() => activeItems.value.filter(isDead).length);
const adultCount = computed(() => activeItems.value.filter(isAdult).length);
const filteredItems = computed(() =>
  activeItems.value.filter(
    (item) =>
      (showDeadLinks.value || !isDead(item)) &&
      (!settings.value.filterAdultContent || !isAdult(item))
  )
);
const visibleItems = computed(() =>
  filteredItems.value.slice(0, visibleCount.value)
);
const cloudAvailableCount = computed(
  () =>
    cloudItems.value.filter(
      (item) =>
        !isDead(item) &&
        (!settings.value.filterAdultContent || !isAdult(item))
    ).length
);
const magnetAvailableCount = computed(
  () =>
    magnetItems.value.filter(
      (item) => !settings.value.filterAdultContent || !isAdult(item)
    ).length
);
const otherAreaCount = computed(() =>
  activeArea.value === "cloud"
    ? magnetAvailableCount.value
    : cloudAvailableCount.value
);
const emptyTitle = computed(() =>
  otherAreaCount.value
    ? `${activeArea.value === "cloud" ? "网盘" : "磁力"}区暂时没有结果`
    : "暂时没有找到相关资源"
);
const emptyDescription = computed(() =>
  matchMode.value === "exact"
    ? "精确匹配没有命中，可以改用模糊搜索或换一个搜索写法。"
    : props.kind === "tv"
      ? "可以尝试片名加季数、全集或年份。"
      : "可以尝试片名加年份、清晰度或字幕。"
);

function searchOptions() {
  return {
    apiBase,
    keyword: activeKeyword.value,
    matchMode: matchMode.value,
    settings: {
      enabledPlugins: settings.value.enabledPlugins,
      enabledTgChannels: settings.value.enabledTgChannels,
      concurrency: Math.min(6, settings.value.concurrency),
      pluginTimeoutMs: Math.min(5000, settings.value.pluginTimeoutMs),
    },
  };
}

async function startSearch(keyword: string) {
  if (searchState.value.loading) return;
  loadSettings();
  activeKeyword.value = String(keyword || props.title).trim() || props.title;
  visibleCount.value = 24;
  showDeadLinks.value = false;
  await performSearch(searchOptions());
}

async function changeMatchMode(mode: SearchMatchMode) {
  if (matchMode.value === mode || searchState.value.loading) return;
  matchMode.value = mode;
  await startSearch(activeKeyword.value);
}

async function resumeSearch() {
  loadSettings();
  await continueSearch(searchOptions());
}

function toggleAdultFilter() {
  settings.value.filterAdultContent = !settings.value.filterAdultContent;
  saveSettings();
}

async function copyResult(url: string) {
  const copied = await copyLink(url);
  showToast(copied ? "链接已复制" : "复制失败", copied ? "success" : "error");
}

async function reportInvalid(url: string) {
  try {
    await reportLinkHealth(url, "dead");
    showToast("已记录失效反馈", "success");
  } catch {
    showToast("反馈未提交，请稍后重试", "error");
  }
}

function recordResultOpen(item: SearchViewItem) {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  void fetch(`${apiBase}/search-quality`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "same-origin",
    keepalive: true,
    body: JSON.stringify({
      event: "result_click",
      eventId: `media-click:${random}`,
      query: activeKeyword.value,
      url: item.url,
      platform: item.type,
      title: item.title,
      attribution: getAttribution(),
      traffic: getTrafficContext(),
    }),
  }).catch(() => undefined);
}

watch(
  () => allItems.value.map((item) => item.url).join("\n"),
  () => {
    void loadLinkHealth(
      allItems.value
        .filter((item) => !isMagnet(item))
        .map((item) => item.url)
    );
  }
);

onMounted(() => {
  loadSettings();
  scheduledSearch = window.setTimeout(() => {
    void startSearch(props.title);
  }, 120);
});

onBeforeUnmount(() => {
  if (scheduledSearch !== undefined) window.clearTimeout(scheduledSearch);
  cancelActiveRequests();
});
</script>

<style scoped>
.media-resources {
  padding: clamp(58px, 8vw, 96px) 0 34px;
  scroll-margin-top: 96px;
}

.media-resources__header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
  gap: 32px;
  padding-bottom: 26px;
  border-bottom: 1px solid var(--border-light);
}

.media-resources__header h2,
.media-resources__header p,
.media-resources__header dl,
.media-resources__header dt,
.media-resources__header dd {
  margin: 0;
}

.media-resources__header h2 {
  color: var(--text-primary);
  font-size: clamp(30px, 4vw, 46px);
  font-weight: 800;
  letter-spacing: -0.055em;
  line-height: 1.08;
  text-wrap: balance;
}

.media-resources__header p {
  max-width: 56ch;
  margin-top: 10px;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.7;
}

.media-resources__header dl {
  display: flex;
  align-items: stretch;
}

.media-resources__header dl > div {
  display: grid;
  min-width: 78px;
  gap: 4px;
  padding: 0 18px;
  border-left: 1px solid var(--border-light);
}

.media-resources__header dt {
  color: var(--text-tertiary);
  font-size: 10px;
}

.media-resources__header dd {
  color: var(--text-primary);
  font-size: 16px;
  font-weight: 760;
  font-variant-numeric: tabular-nums;
}

.media-resources__controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 20px 0;
}

.media-resources__areas,
.media-resources__match,
.media-resources__actions {
  display: flex;
  align-items: center;
}

.media-resources__areas,
.media-resources__match {
  padding: 3px;
  border-radius: 11px;
  background: var(--bg-secondary);
}

.media-resources__areas button,
.media-resources__match button {
  display: inline-flex;
  min-height: 38px;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 0 13px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 12px;
  font-weight: 700;
  transition:
    background var(--transition-fast),
    color var(--transition-fast),
    transform var(--transition-fast);
}

.media-resources__areas button:active,
.media-resources__match button:active,
.media-resources__quiet-action:active,
.media-resources__refresh:active {
  transform: scale(0.98);
}

.media-resources__areas button.active,
.media-resources__match button.active {
  background: var(--bg-surface);
  color: var(--text-primary);
  box-shadow: var(--shadow-sm);
}

.media-resources__areas button span {
  color: var(--primary-strong);
  font-size: 10px;
  font-variant-numeric: tabular-nums;
}

.media-resources__actions {
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.media-resources__quiet-action,
.media-resources__refresh {
  display: inline-flex;
  min-height: 40px;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 0 12px;
  border: 1px solid var(--border-light);
  border-radius: 9px;
  background: var(--bg-surface);
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 11px;
  font-weight: 680;
  transition:
    border-color var(--transition-fast),
    color var(--transition-fast),
    transform var(--transition-fast);
}

.media-resources__quiet-action:hover,
.media-resources__refresh:hover {
  border-color: color-mix(in srgb, var(--primary) 48%, var(--border-light));
  color: var(--primary-strong);
}

.media-resources__refresh:disabled,
.media-resources__suggestions button:disabled {
  cursor: not-allowed;
  opacity: 0.58;
}

.media-resources__suggestions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 22px;
}

.media-resources__suggestions > span {
  margin-right: 3px;
  color: var(--text-tertiary);
  font-size: 10px;
}

.media-resources__suggestions button {
  min-height: 30px;
  padding: 0 10px;
  border: 1px solid var(--border-light);
  border-radius: 8px;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 10px;
  transition:
    border-color var(--transition-fast),
    color var(--transition-fast);
}

.media-resources__suggestions button:hover,
.media-resources__suggestions button.active {
  border-color: color-mix(in srgb, var(--primary) 48%, var(--border-light));
  color: var(--primary-strong);
}

.media-resources__skeleton {
  overflow: hidden;
  border: 1px solid var(--border-light);
  border-radius: var(--radius-lg);
  background: var(--bg-surface);
}

.media-resources__skeleton > span {
  display: block;
  padding: 16px 22px;
  border-bottom: 1px solid var(--border-light);
  color: var(--text-secondary);
  font-size: 12px;
}

.media-resources__skeleton > div {
  display: grid;
  min-height: 90px;
  grid-template-columns: 90px minmax(0, 1fr) 28px;
  align-items: center;
  gap: 20px;
  padding: 18px 22px;
}

.media-resources__skeleton > div + div {
  border-top: 1px solid var(--border-light);
}

.media-resources__skeleton i,
.media-resources__skeleton b,
.media-resources__skeleton em {
  display: block;
  border-radius: 6px;
  background: var(--bg-skeleton);
  animation: mediaResourcePulse 1.35s ease-in-out infinite;
}

.media-resources__skeleton i {
  width: 60px;
  height: 18px;
}

.media-resources__skeleton p {
  display: grid;
  gap: 10px;
  margin: 0;
}

.media-resources__skeleton b {
  width: min(520px, 82%);
  height: 13px;
}

.media-resources__skeleton b + b {
  width: min(340px, 58%);
  height: 10px;
}

.media-resources__skeleton em {
  width: 28px;
  height: 28px;
}

.media-resources__more {
  display: flex;
  width: 100%;
  min-height: 48px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 14px;
  border: 1px solid var(--border-light);
  border-radius: 10px;
  background: var(--bg-surface);
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 12px;
  font-weight: 680;
}

.media-resources__more span {
  color: var(--text-tertiary);
  font-variant-numeric: tabular-nums;
}

.media-resources__empty {
  display: flex;
  min-height: 150px;
  align-items: center;
  gap: 18px;
  padding: 28px;
  border: 1px solid var(--border-light);
  border-radius: var(--radius-lg);
  color: var(--text-tertiary);
}

.media-resources__empty div {
  display: grid;
  flex: 1;
  gap: 6px;
}

.media-resources__empty h3,
.media-resources__empty p {
  margin: 0;
}

.media-resources__empty h3 {
  color: var(--text-primary);
  font-size: 16px;
}

.media-resources__empty p {
  color: var(--text-secondary);
  font-size: 12px;
}

.media-resources__empty button,
.media-resources footer button {
  min-height: 36px;
  padding: 0 12px;
  border: 1px solid var(--border-light);
  border-radius: 8px;
  background: var(--bg-surface);
  color: var(--text-primary);
  cursor: pointer;
  font-size: 11px;
  font-weight: 680;
}

.media-resources__error {
  display: flex;
  min-height: 46px;
  align-items: center;
  gap: 9px;
  margin-top: 14px;
  padding: 0 14px;
  border: 1px solid color-mix(in srgb, var(--danger) 25%, var(--border-light));
  border-radius: 9px;
  color: var(--danger);
  font-size: 12px;
}

.media-resources footer {
  display: flex;
  min-height: 44px;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  color: var(--text-tertiary);
  font-size: 11px;
}

@keyframes mediaResourcePulse {
  0%,
  100% {
    opacity: 0.55;
  }
  50% {
    opacity: 1;
  }
}

@media (max-width: 760px) {
  .media-resources__header {
    grid-template-columns: 1fr;
    align-items: start;
  }

  .media-resources__header dl > div:first-child {
    padding-left: 0;
    border-left: 0;
  }

  .media-resources__controls {
    align-items: stretch;
    flex-direction: column;
  }

  .media-resources__areas {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .media-resources__actions {
    justify-content: flex-start;
  }

  .media-resources__skeleton > div {
    grid-template-columns: 54px minmax(0, 1fr);
  }

  .media-resources__skeleton em {
    display: none;
  }
}

@media (max-width: 520px) {
  .media-resources__header dl {
    width: 100%;
  }

  .media-resources__header dl > div {
    min-width: 0;
    flex: 1;
  }

  .media-resources__actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .media-resources__match {
    grid-column: 1 / -1;
  }

  .media-resources__match button {
    flex: 1;
  }

  .media-resources__quiet-action,
  .media-resources__refresh {
    width: 100%;
  }

  .media-resources__empty {
    align-items: flex-start;
    flex-wrap: wrap;
  }

  .media-resources__empty button {
    width: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .media-resources__skeleton i,
  .media-resources__skeleton b,
  .media-resources__skeleton em {
    animation: none;
  }
}
</style>
