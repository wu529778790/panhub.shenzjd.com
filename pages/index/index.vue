<template>
  <div class="home" :class="{ 'home--searched': searched }">
    <section class="search-stage" aria-labelledby="page-title">
      <div v-if="!searched" class="landing-layout">
        <div class="landing-primary">
          <div class="search-area-switch" role="tablist" aria-label="选择搜索区域">
            <button
              type="button"
              role="tab"
              :aria-selected="searchArea === 'cloud'"
              :class="{ active: searchArea === 'cloud' }"
              @click="setSearchArea('cloud')">
              <PhCloud :size="17" aria-hidden="true" />
              网盘搜索
            </button>
            <button
              type="button"
              role="tab"
              :aria-selected="searchArea === 'magnet'"
              :class="{ active: searchArea === 'magnet' }"
              @click="setSearchArea('magnet')">
              <PhMagnet :size="17" aria-hidden="true" />
              磁力搜索
            </button>
          </div>

          <header class="landing-copy">
            <p>{{ searchArea === "magnet" ? "按质量筛磁力" : "跨平台搜网盘" }}</p>
            <h1 id="page-title">
              {{ searchArea === "magnet" ? "磁力结果，先看质量" : "想找什么，直接搜" }}
            </h1>
            <span>
              {{ searchArea === "magnet"
                ? "先看大小、做种和清晰度，再决定复制哪一条。"
                : "一次检索多个公开索引，重复链接合并，失效结果自动隐藏。" }}
            </span>
          </header>

          <SearchBox
            v-model="kw"
            :match-mode="searchMode"
            :loading="searchState.loading"
            :paused="searchState.paused"
            :searched="searched"
            :placeholder="activePlaceholder"
            :search-label="searchBoxLabel"
            @update:match-mode="handleSearchModeChange"
            @search="onSearch"
            @reset="fullReset"
            @pause="pauseSearch"
            @continue="handleContinueSearch" />

          <div v-if="searchArea === 'cloud'" class="coverage-line" aria-label="支持的网盘平台">
            <span>支持</span>
            <strong>夸克</strong>
            <strong>阿里云盘</strong>
            <strong>百度网盘</strong>
            <strong>115</strong>
            <strong>迅雷</strong>
            <strong>UC</strong>
            <strong>123 网盘</strong>
          </div>
          <div v-else class="coverage-line" aria-label="磁力搜索说明">
            <span>结果包含</span>
            <strong>文件大小</strong>
            <strong>做种热度</strong>
            <strong>清晰度</strong>
            <strong>索引来源</strong>
          </div>

          <div v-if="recentSearches.length" class="recent-searches" aria-label="最近搜索">
            <span>最近搜索</span>
            <button
              v-for="term in recentSearches"
              :key="term"
              type="button"
              @click="quickSearch(term)">
              {{ term }}
            </button>
            <button class="recent-searches__clear" type="button" @click="clearRecentSearches">
              清除
            </button>
          </div>
        </div>

        <ErrorBoundary message="热门搜索加载失败">
          <HotSearchSection ref="hotSearchRef" @search="quickSearch" />
        </ErrorBoundary>
      </div>

      <div v-else class="compact-search">
        <div class="search-area-switch search-area-switch--compact" role="tablist" aria-label="选择搜索区域">
          <button
            type="button"
            role="tab"
            :aria-selected="searchArea === 'cloud'"
            :class="{ active: searchArea === 'cloud' }"
            @click="setSearchArea('cloud')">
            <PhCloud :size="16" aria-hidden="true" />
            网盘搜索
            <span>{{ cloudAvailableTotal }}</span>
          </button>
          <button
            type="button"
            role="tab"
            :aria-selected="searchArea === 'magnet'"
            :class="{ active: searchArea === 'magnet' }"
            @click="setSearchArea('magnet')">
            <PhMagnet :size="16" aria-hidden="true" />
            磁力搜索
            <span>{{ magnetAvailableTotal }}</span>
          </button>
        </div>
        <SearchBox
          v-model="kw"
          :match-mode="searchMode"
          :loading="searchState.loading"
          :paused="searchState.paused"
          :searched="searched"
          :placeholder="activePlaceholder"
          :search-label="searchBoxLabel"
          @update:match-mode="handleSearchModeChange"
          @search="onSearch"
          @reset="fullReset"
          @pause="pauseSearch"
          @continue="handleContinueSearch" />
      </div>
    </section>

    <section v-if="!searched" class="popular-stream" aria-labelledby="popular-stream-title">
      <header class="popular-stream__header">
        <div>
          <h2 id="popular-stream-title">豆瓣高分片库</h2>
          <p>电影与电视剧分区浏览，全部平铺展开，点片名直接搜索资源。</p>
        </div>
        <span>300+ 部电影 / 6.0 分起 / 每 2 小时更新</span>
      </header>

      <ErrorBoundary message="影视信息加载失败">
        <LatestEntertainmentSection />
      </ErrorBoundary>
    </section>

    <SeoDiscoverySection v-if="!searched" />

    <section v-if="searched" class="results-shell" aria-label="搜索结果">
      <header class="results-summary">
        <div class="results-title">
          <span>{{ searchArea === "magnet" ? "磁力结果" : "网盘结果" }}</span>
          <h2>“{{ kw }}”</h2>
        </div>

        <dl class="result-metrics" aria-label="搜索概况">
          <div>
            <dt>可用</dt>
            <dd>{{ availableTotal }}</dd>
          </div>
          <div>
            <dt>{{ searchArea === "magnet" ? "索引源" : "平台" }}</dt>
            <dd>{{ searchArea === "magnet" ? magnetSourceCount : platforms.length }}</dd>
          </div>
          <div v-if="searchState.elapsedMs">
            <dt>用时</dt>
            <dd>{{ (searchState.elapsedMs / 1000).toFixed(1) }}<small>秒</small></dd>
          </div>
        </dl>

        <button
          class="ai-button"
          type="button"
          :disabled="!activeHasResults || searchState.loading || aiLoading || aiRemainingCount === 0"
          @click="optimizeVisibleResults">
          <PhSparkle :size="18" :weight="aiLoading ? 'fill' : 'regular'" aria-hidden="true" />
          {{ aiLoading ? "正在优化" : aiAnalyzedCount ? (aiRemainingCount ? "继续优化" : `已优化 ${aiAnalyzedCount} 条`) : "AI 优化" }}
        </button>
      </header>

      <div class="results-status" aria-live="polite">
        <span>{{ searchMode === "exact" ? "精确匹配" : "模糊匹配" }}</span>
        <span v-if="confirmedDeadCount">已隐藏 {{ confirmedDeadCount }} 条失效链接</span>
        <span v-if="adultResourceCount">
          {{ settings.filterAdultContent ? `已过滤 ${adultResourceCount} 条成人资源` : `成人资源 ${adultResourceCount} 条` }}
        </span>
        <span v-if="searchState.deepLoading && !searchState.paused">仍在补充更多来源</span>
        <span v-if="searchState.paused">搜索已暂停</span>
      </div>

      <div
        v-if="activeHasResults"
        class="results-controls"
        :class="{ 'results-controls--magnet': searchArea === 'magnet' }">
        <div v-if="searchArea === 'cloud'" class="platform-filters" aria-label="按网盘平台筛选">
          <button :class="{ active: filterPlatform === 'all' }" @click="setPlatformFilter('all')">
            全部 <span>{{ cloudFilterableTotal }}</span>
          </button>
          <button
            v-for="platform in platforms"
            :key="platform"
            :class="{ active: filterPlatform === platform }"
            @click="setPlatformFilter(platform)">
            {{ platformName(platform) }}
            <span>{{ platformCount(platform) }}</span>
          </button>
        </div>
        <div v-else class="platform-filters magnet-filters" aria-label="按磁力质量筛选">
          <button
            v-for="filter in magnetFilters"
            :key="filter.value"
            :class="{ active: magnetFilter === filter.value }"
            @click="magnetFilter = filter.value">
            {{ filter.label }}
            <span>{{ filter.count }}</span>
          </button>
        </div>

        <div class="result-options">
          <button
            v-if="adultResourceCount"
            class="adult-toggle"
            :class="{ active: settings.filterAdultContent }"
            type="button"
            :aria-pressed="settings.filterAdultContent"
            @click="toggleAdultFilter">
            <PhEye v-if="settings.filterAdultContent" :size="16" aria-hidden="true" />
            <PhEyeSlash v-else :size="16" aria-hidden="true" />
            {{ settings.filterAdultContent ? "显示成人资源" : "过滤成人资源" }}
          </button>

          <button
            v-if="confirmedDeadCount"
            class="health-toggle"
            type="button"
            :aria-pressed="showDeadLinks"
            @click="showDeadLinks = !showDeadLinks">
            <PhEyeSlash v-if="showDeadLinks" :size="16" aria-hidden="true" />
            <PhEye v-else :size="16" aria-hidden="true" />
            {{ showDeadLinks ? "隐藏失效链接" : "显示失效链接" }}
          </button>

          <label class="sorter">
            <span>排序</span>
            <select v-model="sortType">
              <option value="default">综合排序</option>
              <option value="relevance-desc">最相关</option>
              <option value="availability-desc">可用优先</option>
              <option value="quality-desc">质量优先</option>
              <option v-if="searchArea === 'magnet'" value="seeders-desc">做种最多</option>
              <option v-if="searchArea === 'magnet'" value="size-desc">文件最大</option>
              <option v-if="searchArea === 'magnet'" value="size-asc">文件最小</option>
              <option value="date-desc">最新</option>
              <option value="date-asc">最早</option>
              <option value="name-asc">名称 A-Z</option>
              <option value="name-desc">名称 Z-A</option>
            </select>
            <PhCaretDown :size="14" aria-hidden="true" />
          </label>
        </div>
      </div>

      <div v-if="activeHasResults" class="secondary-filters" aria-label="更多结果筛选">
        <label v-if="categoryOptions.length > 1">
          <span>分类</span>
          <select v-model="filterCategory">
            <option value="all">全部分类</option>
            <option v-for="category in categoryOptions" :key="category" :value="category">
              {{ category }}
            </option>
          </select>
        </label>
        <label v-if="yearOptions.length">
          <span>年份</span>
          <select v-model="filterYear">
            <option value="all">全部年份</option>
            <option v-for="year in yearOptions" :key="year" :value="year">{{ year }}</option>
          </select>
        </label>
        <label v-if="resolutionOptions.length">
          <span>清晰度</span>
          <select v-model="filterResolution">
            <option value="all">全部清晰度</option>
            <option v-for="resolution in resolutionOptions" :key="resolution" :value="resolution">
              {{ resolution }}
            </option>
          </select>
        </label>
        <label v-if="searchArea === 'cloud'">
          <span>可用状态</span>
          <select v-model="filterHealth">
            <option value="all">全部状态</option>
            <option value="valid">已验证可用</option>
            <option value="unknown">待验证</option>
          </select>
        </label>
        <button v-if="hasAdvancedFilters" class="reset-filters" type="button" @click="resetAdvancedFilters">
          清除筛选
        </button>
      </div>

      <div v-if="aiError" class="inline-alert" role="alert">
        <PhWarningCircle :size="18" aria-hidden="true" />
        <span>{{ aiError }}，原始搜索结果不受影响。</span>
      </div>

      <div
        v-if="searchState.loading && !visibleItems.length"
        class="result-skeleton"
        aria-label="正在搜索资源"
        aria-live="polite">
        <span class="result-skeleton__status">正在连接多个索引源</span>
        <div v-for="i in 5" :key="i" class="result-skeleton__row" aria-hidden="true">
          <i />
          <p><b /><b /></p>
          <em />
        </div>
      </div>

      <SearchResultList
        v-if="visibleItems.length"
        :items="visibleItems"
        :analyses="analyses"
        :ai-loading="aiLoading"
        :pending-ids="aiPendingIds"
        :health-by-url="healthByUrl"
        :reportable="searchArea === 'cloud'"
        :label="searchArea === 'magnet' ? '磁力资源列表' : '网盘资源列表'"
        @open="handleResultOpen"
        @copy="handleCopy"
        @report-invalid="handleInvalidReport" />

      <button
        v-if="visibleItems.length && filteredItems.length > visibleCount"
        class="load-more"
        type="button"
        @click="visibleCount += 30">
        显示更多
        <span>{{ filteredItems.length - visibleCount }} 条</span>
      </button>

      <div
        v-if="activeHasResults && !visibleItems.length && confirmedDeadCount === sectionItems.length"
        class="empty-state">
        <PhMagnifyingGlassMinus :size="34" aria-hidden="true" />
        <h2>当前结果均已确认失效</h2>
        <p>这些链接默认不再展示，你仍可手动查看并自行验证。</p>
        <div class="empty-suggestions">
          <button type="button" @click="showDeadLinks = true">显示失效链接</button>
        </div>
      </div>

      <div
        v-else-if="activeHasResults && !visibleItems.length && settings.filterAdultContent && adultResourceCount"
        class="empty-state">
        <PhMagnifyingGlassMinus :size="34" aria-hidden="true" />
        <h2>成人资源已过滤</h2>
        <p>关闭过滤后，可以继续查看这些搜索结果。</p>
        <div class="empty-suggestions">
          <button type="button" @click="toggleAdultFilter">显示成人资源</button>
        </div>
      </div>

      <div
        v-else-if="activeHasResults && !visibleItems.length && searchArea === 'magnet' && magnetFilter !== 'all'"
        class="empty-state">
        <PhMagnifyingGlassMinus :size="34" aria-hidden="true" />
        <h2>这个筛选下暂时没有结果</h2>
        <p>可以查看全部磁力结果，或换一个更短的关键词。</p>
        <div class="empty-suggestions">
          <button type="button" @click="magnetFilter = 'all'">查看全部磁力结果</button>
        </div>
      </div>

      <div
        v-else-if="activeHasResults && !visibleItems.length && !searchState.loading && !searchState.deepLoading && searchArea === 'cloud' && filterPlatform !== 'all'"
        class="empty-state">
        <PhMagnifyingGlassMinus :size="34" aria-hidden="true" />
        <h2>{{ platformName(filterPlatform) }}暂时没有符合当前条件的结果</h2>
        <p>可能是其他筛选条件仍在生效，可以清除筛选后查看全部网盘结果。</p>
        <div class="empty-suggestions">
          <button type="button" @click="clearCloudFilters">查看全部网盘结果</button>
        </div>
      </div>

      <div
        v-if="!activeHasResults && !searchState.loading && !searchState.deepLoading && !searchState.paused"
        class="empty-state">
        <PhMagnifyingGlassMinus :size="34" aria-hidden="true" />
        <h2>{{ emptyAreaTitle }}</h2>
        <p>{{ emptyAreaDescription }}</p>
        <div v-if="otherAreaAvailableTotal" class="empty-suggestions">
          <button type="button" @click="setSearchArea(searchArea === 'magnet' ? 'cloud' : 'magnet')">
            查看{{ searchArea === "magnet" ? "网盘" : "磁力" }}区 {{ otherAreaAvailableTotal }} 条结果
          </button>
        </div>
        <div v-else-if="searchMode === 'exact'" class="empty-suggestions">
          <button type="button" @click="handleSearchModeChange('fuzzy')">改用模糊搜索</button>
        </div>
        <div v-else-if="hotTerms.length" class="empty-suggestions">
          <button v-for="term in hotTerms" :key="term" @click="quickSearch(term)">{{ term }}</button>
        </div>
      </div>

      <div v-if="searchState.error" class="inline-alert" role="alert">
        <PhWarningCircle :size="18" aria-hidden="true" />
        <span>{{ searchState.error }}</span>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import {
  PhCaretDown,
  PhCloud,
  PhEye,
  PhEyeSlash,
  PhMagnet,
  PhMagnifyingGlassMinus,
  PhSparkle,
  PhWarningCircle,
} from "@phosphor-icons/vue";
import { PLATFORM_INFO } from "~/config/plugins";
import type { SearchMatchMode, SearchViewItem } from "~/types/search";
import { groupCloudSearchItems } from "~/utils/groupCloudSearchItems";
import { evaluateSearchResult } from "~/utils/searchEvaluation";
import { createSearchViewId } from "~/utils/searchViewId";
import { isAdultContent } from "~/utils/torrentMetadata";
import { parsePlatformSearchIntent } from "~/utils/platformSearchIntent";

const runtimeConfig = useRuntimeConfig();
const apiBase = (runtimeConfig.public?.apiBase as string) || "/api";
const siteUrl = (runtimeConfig.public?.siteUrl as string) || "https://haosouku.com";
const route = useRoute();
const router = useRouter();
const { showToast } = useToast();
const { getAttribution } = useSeoAttribution();
const { getContext: getTrafficContext } = useTrafficAnalytics();
const homeResetRequest = useState<number>("home-reset-request", () => 0);
const hotSearchRef = ref<InstanceType<typeof HotSearchSection> | null>(null);

const kw = ref("");
type SearchArea = "cloud" | "magnet";
const searchArea = ref<SearchArea>("cloud");
const searchMode = ref<SearchMatchMode>("fuzzy");
const activePlaceholder = computed(() =>
  searchArea.value === "magnet"
    ? "搜索电影、剧集、软件或资料的磁力资源"
    : "搜索电影、剧集、软件或资料"
);
const searchBoxLabel = computed(() =>
  searchArea.value === "magnet" ? "磁力资源搜索" : "网盘资源搜索"
);
const filterPlatform = ref("all");
const filterCategory = ref("all");
const filterYear = ref("all");
const filterResolution = ref("all");
const filterHealth = ref<"all" | "valid" | "unknown">("all");
type MagnetFilter = "all" | "4k" | "1080p" | "active";
type SortType = "default" | "relevance-desc" | "availability-desc" | "quality-desc" | "seeders-desc" | "size-desc" | "size-asc" | "date-desc" | "date-asc" | "name-asc" | "name-desc";
const magnetFilter = ref<MagnetFilter>("all");
const sortType = ref<SortType>("default");
const visibleCount = ref(30);
const hotTerms = ref<string[]>([]);
const showDeadLinks = ref(false);
const { recentSearches, add: addRecentSearch, clear: clearRecentSearches } = useRecentSearches();

const {
  state: searchState,
  searched,
  performSearch,
  resetSearch,
  copyLink,
  pauseSearch,
  continueSearch,
} = useSearch();
const { settings, loadSettings, saveSettings } = useSettings();
const {
  analyses,
  loading: aiLoading,
  error: aiError,
  pendingIds: aiPendingIds,
  optimize,
  reset: resetAi,
} = useAiAnalysis();
const {
  healthByUrl,
  get: getLinkHealth,
  load: loadLinkHealth,
  report: reportLinkHealth,
  reset: resetLinkHealth,
} = useLinkHealth();

useSeoMeta({
  title: "好搜库 - 网盘搜索引擎｜夸克、百度、阿里、115资源搜索",
  description:
    "好搜库同时搜索夸克、百度、阿里、115、迅雷、UC、123、天翼等公开分享索引，重复链接自动合并，已确认失效的结果会被隐藏。",
  robots: computed(() => (route.query.q ? "noindex,follow" : "index,follow")),
  ogTitle: "好搜库 - 免费网盘资源搜索",
  ogDescription: "一次搜索多个网盘公开索引，重复链接自动合并。",
  ogUrl: `${siteUrl}/`,
  ogImage: `${siteUrl}/og.png`,
  twitterCard: "summary_large_image",
  twitterTitle: "好搜库 - 免费网盘资源搜索",
  twitterDescription: "一次搜索多个网盘公开索引，重复链接自动合并。",
  twitterImage: `${siteUrl}/og.png`,
});

useHead({
  link: [{ rel: "canonical", href: `${siteUrl}/` }],
  script: [
    {
      type: "application/ld+json",
      innerHTML: JSON.stringify({
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "WebSite",
            "@id": `${siteUrl}/#website`,
            name: "好搜库",
            alternateName: "HAOSOUKU",
            url: siteUrl,
            description: "搜索多个网盘公开分享索引，并合并重复链接。",
            inLanguage: "zh-CN",
            potentialAction: {
              "@type": "SearchAction",
              target: `${siteUrl}/?q={search_term_string}`,
              "query-input": "required name=search_term_string",
            },
          },
          {
            "@type": "Organization",
            "@id": `${siteUrl}/#organization`,
            name: "好搜库",
            url: siteUrl,
            logo: `${siteUrl}/android-chrome-512x512.png`,
          },
          {
            "@type": "WebApplication",
            name: "好搜库",
            url: siteUrl,
            applicationCategory: "UtilitiesApplication",
            operatingSystem: "Web",
            isAccessibleForFree: true,
            description: "搜索多个网盘公开分享索引，并按平台整理结果。",
          },
        ],
      }),
    },
  ],
});

function platformName(type: string): string {
  return PLATFORM_INFO[type]?.name || type;
}

const allItems = computed<SearchViewItem[]>(() => {
  const seen = new Set<string>();
  const result: SearchViewItem[] = [];
  for (const [type, links] of Object.entries(searchState.value.merged)) {
    for (const link of links || []) {
      const url = String(link.url || "").trim();
      if (!url) continue;
      const normalized = url.replace(/\/$/, "").toLowerCase();
      if (seen.has(normalized)) continue;
      seen.add(normalized);
      result.push({
        ...link,
        id: createSearchViewId(type, url),
        type,
        title: String(link.note || url).slice(0, 500),
      });
    }
  }
  return result;
});

function isMagnetItem(item: SearchViewItem): boolean {
  return item.type === "magnet" || /^magnet:\?/i.test(item.url);
}

const rawCloudItems = computed(() => allItems.value.filter((item) => !isMagnetItem(item)));
const cloudItems = computed(() =>
  groupCloudSearchItems(
    rawCloudItems.value,
    (url) => getLinkHealth(url)?.status
  ).map(evaluateItem)
);
const magnetItems = computed(() => allItems.value.filter(isMagnetItem).map(evaluateItem));
const magnetSourceCount = computed(() => new Set(
  magnetItems.value.flatMap((item) => item.metadata?.sources || (item.source ? [item.source] : []))
).size);
const magnetFilters = computed<Array<{ value: MagnetFilter; label: string; count: number }>>(() => [
  { value: "all", label: "全部", count: magnetItems.value.length },
  { value: "4k", label: "4K", count: magnetItems.value.filter((item) => item.metadata?.resolution === "4K").length },
  { value: "1080p", label: "1080P", count: magnetItems.value.filter((item) => item.metadata?.resolution === "1080P").length },
  { value: "active", label: "有做种", count: magnetItems.value.filter((item) => (item.metadata?.seeders || 0) > 0).length },
]);
const sectionItems = computed(() =>
  searchArea.value === "magnet" ? magnetItems.value : cloudItems.value
);
const platforms = computed(() =>
  [...new Set(cloudItems.value.map((item) => item.type))].filter(Boolean)
);

function itemCategory(item: SearchViewItem): string {
  if (isAdultResource(item)) return "成人资源";
  const value = `${item.category || ""} ${item.metadata?.category || ""} ${item.title}`;
  if (/短剧/.test(value)) return "短剧";
  if (/电视剧|剧集|连续剧|第\d+季|S\d{1,2}/i.test(value)) return "剧集";
  if (/动漫|动画|番剧/.test(value)) return "动漫";
  if (/综艺|真人秀/.test(value)) return "综艺";
  if (/电影|影视|蓝光|纪录片/.test(value)) return "影视";
  if (/课程|教育|学习|教程|考研|考试/.test(value)) return "学习";
  if (/电子书|书籍|小说|PDF|EPUB/i.test(value)) return "书籍";
  if (/软件|工具|应用|APP/i.test(value)) return "软件";
  if (/游戏/.test(value)) return "游戏";
  return "其他";
}

function isAdultResource(item: SearchViewItem): boolean {
  return item.metadata?.adult === true || isAdultContent(
    item.title,
    `${item.category || ""} ${item.metadata?.category || ""}`
  );
}

function itemYear(item: SearchViewItem): string {
  const metadataYear = Number(item.metadata?.year || 0);
  if (metadataYear >= 1900 && metadataYear <= 2100) return String(metadataYear);
  return item.title.match(/(?:19|20)\d{2}/)?.[0] || "";
}

function itemResolution(item: SearchViewItem): string {
  const value = item.metadata?.resolution || item.title.match(/(?:8K|4K|2160P|1080P|720P)/i)?.[0] || "";
  const normalized = value.toUpperCase();
  if (normalized === "2160P") return "4K";
  return normalized;
}

function itemHealth(item: SearchViewItem) {
  return getLinkHealth(item.url)?.status || item.health_status || "unknown";
}

function evaluateItem(item: SearchViewItem): SearchViewItem {
  const sources = item.sources || (item.source ? [item.source] : []);
  const evaluatedItem = {
    ...item,
    health_status: isMagnetItem(item) ? item.health_status : itemHealth(item),
    support_count: Math.max(item.support_count || 1, sources.length || 1),
  };
  const evaluation = evaluateSearchResult(
    evaluatedItem,
    kw.value,
    isMagnetItem(item) ? "magnet" : item.type
  );
  return {
    ...evaluatedItem,
    evaluation,
    relevance_score: evaluation.overall,
  };
}

const categoryOptions = computed(() =>
  [...new Set(
    sectionItems.value
      .filter((item) => !settings.value.filterAdultContent || !isAdultResource(item))
      .map(itemCategory)
  )].sort((a, b) => a.localeCompare(b, "zh-CN"))
);
const yearOptions = computed(() =>
  [...new Set(sectionItems.value.map(itemYear).filter(Boolean))].sort((a, b) => Number(b) - Number(a))
);
const resolutionOptions = computed(() => {
  const order = ["8K", "4K", "1080P", "720P"];
  return [...new Set(sectionItems.value.map(itemResolution).filter(Boolean))].sort(
    (a, b) => order.indexOf(a) - order.indexOf(b)
  );
});
const hasAdvancedFilters = computed(() =>
  filterCategory.value !== "all" ||
  filterYear.value !== "all" ||
  filterResolution.value !== "all" ||
  filterHealth.value !== "all"
);

function isConfirmedDead(item: SearchViewItem): boolean {
  return getLinkHealth(item.url)?.status === "dead";
}

const confirmedDeadCount = computed(
  () => sectionItems.value.filter(isConfirmedDead).length
);
const adultResourceCount = computed(
  () => sectionItems.value.filter(isAdultResource).length
);
const availableTotal = computed(
  () => sectionItems.value.filter(
    (item) => !isConfirmedDead(item) && (!settings.value.filterAdultContent || !isAdultResource(item))
  ).length
);
const cloudAvailableTotal = computed(
  () => cloudItems.value.filter(
    (item) => !isConfirmedDead(item) && (!settings.value.filterAdultContent || !isAdultResource(item))
  ).length
);
const magnetAvailableTotal = computed(() => magnetItems.value.filter(
  (item) => !settings.value.filterAdultContent || !isAdultResource(item)
).length);
const activeHasResults = computed(() => sectionItems.value.length > 0);
const otherAreaAvailableTotal = computed(() =>
  searchArea.value === "magnet" ? cloudAvailableTotal.value : magnetAvailableTotal.value
);
const emptyAreaTitle = computed(() => {
  if (otherAreaAvailableTotal.value) {
    return searchArea.value === "magnet" ? "磁力区暂时没有结果" : "网盘区暂时没有结果";
  }
  return "没有找到相关资源";
});
const emptyAreaDescription = computed(() =>
  otherAreaAvailableTotal.value
    ? `本次搜索在${searchArea.value === "magnet" ? "网盘" : "磁力"}区找到了结果。`
    : searchMode.value === "exact"
      ? "没有找到完整包含该关键词的结果，可以改用模糊搜索。"
      : "换一个更短的关键词，或在设置中启用更多来源。"
);

function platformCount(type: string): number {
  return cloudItems.value.filter(
    (item) => item.type === type && matchesActiveResultFilters(item)
  ).length;
}

const cloudFilterableTotal = computed(
  () => cloudItems.value.filter(matchesActiveResultFilters).length
);

function sortItems(items: SearchViewItem[]): SearchViewItem[] {
  const list = [...items];
  const time = (value?: string) => {
    const parsed = Date.parse(value || "");
    return Number.isFinite(parsed) ? parsed : 0;
  };
  switch (sortType.value) {
    case "relevance-desc":
      return list.sort((a, b) =>
        Number(b.evaluation?.relevance || 0) - Number(a.evaluation?.relevance || 0)
        || Number(b.evaluation?.overall || 0) - Number(a.evaluation?.overall || 0)
      );
    case "availability-desc":
      return list.sort((a, b) =>
        Number(b.evaluation?.availability || 0) - Number(a.evaluation?.availability || 0)
        || Number(b.evaluation?.overall || 0) - Number(a.evaluation?.overall || 0)
      );
    case "quality-desc":
      return list.sort((a, b) =>
        Number(b.evaluation?.quality || 0) - Number(a.evaluation?.quality || 0)
        || Number(b.evaluation?.overall || 0) - Number(a.evaluation?.overall || 0)
      );
    case "date-desc":
      return list.sort((a, b) => time(b.datetime) - time(a.datetime));
    case "date-asc":
      return list.sort((a, b) => time(a.datetime) - time(b.datetime));
    case "name-asc":
      return list.sort((a, b) => a.title.localeCompare(b.title, "zh-CN"));
    case "name-desc":
      return list.sort((a, b) => b.title.localeCompare(a.title, "zh-CN"));
    case "seeders-desc":
      return list.sort((a, b) => (b.metadata?.seeders || 0) - (a.metadata?.seeders || 0));
    case "size-desc":
      return list.sort((a, b) => (b.metadata?.sizeBytes || 0) - (a.metadata?.sizeBytes || 0));
    case "size-asc":
      return list.sort((a, b) => {
        const aSize = a.metadata?.sizeBytes || Number.POSITIVE_INFINITY;
        const bSize = b.metadata?.sizeBytes || Number.POSITIVE_INFINITY;
        return aSize - bSize;
      });
    default:
      return list.sort((a, b) =>
        Number(b.evaluation?.overall || b.relevance_score || 0)
          - Number(a.evaluation?.overall || a.relevance_score || 0)
        || Number(b.evaluation?.relevance || 0)
          - Number(a.evaluation?.relevance || 0)
        || a.title.localeCompare(b.title, "zh-CN")
      );
  }
}

const filteredItems = computed(() => {
  const platformItems =
    searchArea.value === "magnet"
      ? magnetItems.value.filter((item) => {
          if (magnetFilter.value === "4k") return item.metadata?.resolution === "4K";
          if (magnetFilter.value === "1080p") return item.metadata?.resolution === "1080P";
          if (magnetFilter.value === "active") return (item.metadata?.seeders || 0) > 0;
          return true;
        })
      : filterPlatform.value === "all"
        ? cloudItems.value
        : cloudItems.value.filter((item) => item.type === filterPlatform.value);
  return sortItems(platformItems.filter(matchesActiveResultFilters));
});

function matchesActiveResultFilters(item: SearchViewItem): boolean {
  if (!showDeadLinks.value && isConfirmedDead(item)) return false;
  if (settings.value.filterAdultContent && isAdultResource(item)) return false;
  if (filterCategory.value !== "all" && itemCategory(item) !== filterCategory.value) return false;
  if (filterYear.value !== "all" && itemYear(item) !== filterYear.value) return false;
  if (filterResolution.value !== "all" && itemResolution(item) !== filterResolution.value) return false;
  if (searchArea.value === "cloud" && filterHealth.value !== "all") {
    const status = itemHealth(item);
    if (filterHealth.value === "valid" && !["alive", "password"].includes(status)) return false;
    if (filterHealth.value === "unknown" && ["alive", "password", "dead"].includes(status)) return false;
  }
  return true;
}

function toggleAdultFilter() {
  settings.value.filterAdultContent = !settings.value.filterAdultContent;
  if (settings.value.filterAdultContent && filterCategory.value === "成人资源") {
    filterCategory.value = "all";
  }
  saveSettings();
}
const visibleItems = computed(() => filteredItems.value.slice(0, visibleCount.value));
const aiAnalyzedCount = computed(() =>
  sectionItems.value.reduce((count, item) => count + (analyses.value[item.id] ? 1 : 0), 0)
);
const aiRemainingCount = computed(() => sectionItems.value.length - aiAnalyzedCount.value);

async function setSearchArea(area: SearchArea) {
  if (searchArea.value === area) return;
  searchArea.value = area;
  filterPlatform.value = "all";
  magnetFilter.value = "all";
  sortType.value = "default";
  visibleCount.value = 30;
  showDeadLinks.value = false;
  resetAdvancedFilters();
  if (searched.value) {
    await router.replace({
      query: {
        q: kw.value.trim() || undefined,
        area: area === "magnet" ? "magnet" : undefined,
        match: searchMode.value === "exact" ? "exact" : undefined,
      },
    });
  }
}

function searchOptions() {
  return {
    apiBase,
    keyword: kw.value,
    matchMode: searchMode.value,
    settings: {
      enabledPlugins: settings.value.enabledPlugins,
      enabledTgChannels: settings.value.enabledTgChannels,
      concurrency: settings.value.concurrency,
      pluginTimeoutMs: settings.value.pluginTimeoutMs,
    },
  };
}

function resetAdvancedFilters() {
  filterCategory.value = "all";
  filterYear.value = "all";
  filterResolution.value = "all";
  filterHealth.value = "all";
}

async function setPlatformFilter(platform: string) {
  filterPlatform.value = platform;
  visibleCount.value = 30;
  await router.replace({
    query: {
      q: kw.value.trim() || undefined,
      area: searchArea.value === "magnet" ? "magnet" : undefined,
      match: searchMode.value === "exact" ? "exact" : undefined,
      platform: platform === "all" ? undefined : platform,
    },
  });
}

async function clearCloudFilters() {
  resetAdvancedFilters();
  showDeadLinks.value = false;
  await setPlatformFilter("all");
}

async function recordHotSearch(keyword: string) {
  try {
    await $fetch(`${apiBase}/hot-searches`, {
      method: "POST",
      body: { term: keyword.trim() },
    });
  } catch {}
}

type SearchHistoryMode = "push" | "replace";
let searchRouteNavigationPending = false;

async function updateSearchRoute(
  query: Record<string, string | undefined>,
  historyMode: SearchHistoryMode
) {
  searchRouteNavigationPending = true;
  try {
    await router[historyMode]({ query });
  } finally {
    searchRouteNavigationPending = false;
  }
}

async function doSearch(
  preferredPlatform?: string,
  historyMode: SearchHistoryMode = "push"
) {
  if (!kw.value.trim() || searchState.value.loading) return;
  loadSettings();
  resetAi();
  resetLinkHealth();
  showDeadLinks.value = false;
  visibleCount.value = 30;
  resetAdvancedFilters();
  const intent = searchArea.value === "cloud"
    ? parsePlatformSearchIntent(kw.value)
    : { keyword: kw.value.trim(), platform: undefined };
  const requestedPlatform =
    preferredPlatform && PLATFORM_INFO[preferredPlatform]
      ? preferredPlatform
      : intent.platform;
  kw.value = intent.keyword;
  filterPlatform.value = requestedPlatform || "all";
  magnetFilter.value = "all";
  const keyword = intent.keyword;
  addRecentSearch(keyword);
  void recordHotSearch(keyword);
  const routeUpdate = updateSearchRoute(
    {
      q: keyword,
      area: searchArea.value === "magnet" ? "magnet" : undefined,
      match: searchMode.value === "exact" ? "exact" : undefined,
      platform: requestedPlatform,
    },
    historyMode
  ).catch(() => undefined);
  await performSearch(searchOptions());
  await routeUpdate;
}

async function onSearch() {
  await doSearch();
}

async function handleSearchModeChange(mode: SearchMatchMode) {
  if (searchMode.value === mode || searchState.value.loading) return;
  searchMode.value = mode;
  if (searched.value) {
    await doSearch(
      filterPlatform.value === "all" ? undefined : filterPlatform.value,
      "replace"
    );
  }
}

async function quickSearch(keyword: string) {
  kw.value = keyword;
  await doSearch();
}

async function handleContinueSearch() {
  if (!searchState.value.paused) return;
  loadSettings();
  await continueSearch(searchOptions());
}

function resetSearchViewState() {
  kw.value = "";
  filterPlatform.value = "all";
  magnetFilter.value = "all";
  sortType.value = "default";
  visibleCount.value = 30;
  resetSearch();
  resetAi();
  searchArea.value = "cloud";
  searchMode.value = "fuzzy";
  resetAdvancedFilters();
}

async function fullReset() {
  resetSearchViewState();
  await router.replace({ query: {} });
  await nextTick();
  await hotSearchRef.value?.refresh();
}

async function optimizeVisibleResults() {
  await optimize(visibleItems.value);
  if (!aiError.value) showToast("AI 优化完成", "success");
}

async function handleCopy(url: string) {
  const copied = await copyLink(url);
  showToast(copied ? "链接已复制" : "复制失败", copied ? "success" : "error");
}

function handleResultOpen(item: SearchViewItem) {
  const random = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  void fetch(`${apiBase}/search-quality`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "same-origin",
    keepalive: true,
    body: JSON.stringify({
      event: "result_click",
      eventId: `click:${random}`,
      query: kw.value,
      url: item.url,
      platform: item.type,
      title: item.title,
      attribution: getAttribution(),
      traffic: getTrafficContext(),
    }),
  }).catch(() => undefined);
}

async function handleInvalidReport(url: string) {
  try {
    const result = await reportLinkHealth(url, "dead");
    showToast(
      result?.status === "dead"
        ? "链接已确认失效，后续将自动隐藏"
        : "反馈已记录，另一位用户确认后自动隐藏",
      "success"
    );
  } catch {
    showToast("反馈失败，请稍后再试", "error");
  }
}

async function fetchHotTerms() {
  try {
    const response: any = await $fetch("/api/hot-searches?limit=5");
    hotTerms.value = response?.data?.hotSearches
      ?.map((item: any) => item.term)
      .filter(Boolean)
      .slice(0, 5) || [];
  } catch {
    hotTerms.value = [];
  }
}

let healthLoadTimer: ReturnType<typeof setTimeout> | undefined;
const cloudHealthUrls = computed(() =>
  cloudItems.value.flatMap((item) => [
    item.url,
    ...(item.alternate_links || []).map((alternative) => alternative.url),
  ])
);
watch(
  () => cloudHealthUrls.value.join("\n"),
  () => {
    if (healthLoadTimer) clearTimeout(healthLoadTimer);
    healthLoadTimer = setTimeout(
      () => void loadLinkHealth(cloudHealthUrls.value),
      220
    );
  }
);
watch(
  [
    searchArea,
    filterPlatform,
    filterCategory,
    filterYear,
    filterResolution,
    filterHealth,
    magnetFilter,
    sortType,
    showDeadLinks,
    () => settings.value.filterAdultContent,
  ],
  () => (visibleCount.value = 30)
);
watch(homeResetRequest, () => void fullReset());
watch(
  () => route.fullPath,
  () => {
    if (searchRouteNavigationPending) return;
    const routeKeyword =
      typeof route.query.q === "string" ? route.query.q.trim() : "";

    if (!routeKeyword) {
      if (searched.value) {
        resetSearchViewState();
        void nextTick().then(() => hotSearchRef.value?.refresh());
      }
      return;
    }

    if (searched.value && routeKeyword === kw.value.trim()) return;

    if (route.query.area === "magnet") searchArea.value = "magnet";
    else searchArea.value = "cloud";
    searchMode.value = route.query.match === "exact" ? "exact" : "fuzzy";
    kw.value = routeKeyword;
    const routePlatform =
      typeof route.query.platform === "string" && PLATFORM_INFO[route.query.platform]
        ? route.query.platform
        : undefined;
    void doSearch(routePlatform, "replace");
  }
);

onBeforeUnmount(() => {
  if (healthLoadTimer) clearTimeout(healthLoadTimer);
});

onMounted(async () => {
  await nextTick();
  const query = route.query.q;
  if (route.query.area === "magnet") searchArea.value = "magnet";
  if (route.query.match === "exact") searchMode.value = "exact";
  if (typeof query === "string" && query.trim()) {
    kw.value = query;
    const routePlatform =
      typeof route.query.platform === "string" && PLATFORM_INFO[route.query.platform]
        ? route.query.platform
        : undefined;
    await doSearch(routePlatform, "replace");
  }
  await Promise.allSettled([
    hotSearchRef.value?.init(),
    fetchHotTerms(),
  ]);
});
</script>

<style scoped>
.home {
  display: flex;
  width: 100%;
  flex-direction: column;
  gap: 28px;
}

.popular-stream {
  padding: 66px 0 34px;
  border-top: 1px solid var(--border-light);
}

.popular-stream__header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 28px;
  margin-bottom: 28px;
}

.popular-stream__header h2,
.popular-stream__header p {
  margin: 0;
}

.popular-stream__header h2 {
  color: var(--text-primary);
  font-size: clamp(28px, 4vw, 44px);
  font-weight: 800;
  letter-spacing: -0.055em;
  line-height: 1.08;
  text-wrap: balance;
}

.popular-stream__header p {
  margin-top: 10px;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.7;
}

.popular-stream__header > span {
  flex: 0 0 auto;
  color: var(--text-tertiary);
  font-size: 12px;
}

.landing-layout {
  display: grid;
  min-height: min(620px, calc(100dvh - 190px));
  grid-template-columns: minmax(0, 1.5fr) minmax(280px, 0.68fr);
  align-items: center;
  gap: clamp(44px, 7vw, 96px);
}

.landing-primary {
  padding: 30px 0 54px;
}

.search-area-switch {
  display: inline-grid;
  margin-bottom: 24px;
  padding: 4px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 4px;
  border: 1px solid var(--border-light);
  border-radius: 12px;
  background: var(--bg-secondary);
}

.search-area-switch button {
  display: inline-flex;
  min-height: 38px;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 0 13px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
  transition: background var(--transition-fast), border-color var(--transition-fast), color var(--transition-fast), transform 360ms var(--ease-spring), box-shadow var(--transition-fast);
}

.search-area-switch button:hover {
  color: var(--text-primary);
}

.search-area-switch button:active {
  transform: scale(0.98);
}

.search-area-switch button.active {
  border-color: var(--border-medium);
  background: var(--bg-surface);
  color: var(--text-primary);
  box-shadow: var(--shadow-sm);
  transform: translateY(-1px);
}

.search-area-switch--compact {
  margin: 0 0 8px 4px;
}

.search-area-switch--compact button span {
  color: var(--text-tertiary);
  font-variant-numeric: tabular-nums;
}

.landing-copy {
  max-width: 710px;
  margin-bottom: 34px;
}

.landing-copy p {
  margin: 0 0 14px;
  color: var(--primary-strong);
  font-size: 12px;
  font-weight: 760;
  letter-spacing: 0.08em;
}

.landing-copy h1 {
  max-width: 680px;
  margin: 0;
  color: var(--text-primary);
  font-size: clamp(42px, 5.4vw, 64px);
  font-weight: 820;
  letter-spacing: -0.065em;
  line-height: 1.04;
  text-wrap: balance;
}

.landing-copy > span {
  display: block;
  max-width: 590px;
  margin-top: 18px;
  color: var(--text-secondary);
  font-size: clamp(15px, 1.6vw, 18px);
  line-height: 1.7;
  text-wrap: pretty;
}

.coverage-line {
  display: flex;
  margin-top: 20px;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 15px;
  color: var(--text-tertiary);
  font-size: 12px;
}

.coverage-line strong {
  color: var(--text-secondary);
  font-weight: 650;
}

.recent-searches {
  display: flex;
  margin-top: 12px;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

.recent-searches > span {
  margin-right: 3px;
  color: var(--text-tertiary);
  font-size: 11px;
}

.recent-searches button {
  min-height: 30px;
  padding: 0 9px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: var(--bg-secondary);
  color: var(--text-secondary);
  font-size: 11px;
  transition: background var(--transition-fast), color var(--transition-fast), border-color var(--transition-fast);
}

.recent-searches button:hover {
  border-color: var(--border-light);
  background: var(--bg-surface);
  color: var(--text-primary);
}

.recent-searches .recent-searches__clear {
  background: transparent;
  color: var(--text-tertiary);
}

.compact-search {
  position: sticky;
  top: 84px;
  z-index: 10;
  max-width: 930px;
  margin: 0 auto;
  padding: 8px 4px 4px;
  border-radius: 20px;
  background: color-mix(in srgb, var(--bg-body) 88%, transparent);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
}

.results-shell {
  display: grid;
  gap: 16px;
}

.results-summary {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: center;
  gap: clamp(20px, 4vw, 52px);
  padding: 22px 0 20px;
  border-bottom: 1px solid var(--border-light);
}

.results-title {
  min-width: 0;
}

.results-title > span {
  display: block;
  margin-bottom: 5px;
  color: var(--text-tertiary);
  font-size: 12px;
  font-weight: 680;
}

.results-title h2 {
  margin: 0;
  overflow: hidden;
  color: var(--text-primary);
  font-size: clamp(23px, 3vw, 34px);
  font-weight: 780;
  letter-spacing: -0.045em;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.result-metrics {
  display: flex;
  margin: 0;
  align-items: stretch;
}

.result-metrics > div {
  min-width: 76px;
  padding: 0 20px;
  border-left: 1px solid var(--border-light);
}

.result-metrics dt {
  margin-bottom: 3px;
  color: var(--text-tertiary);
  font-size: 10px;
  font-weight: 680;
}

.result-metrics dd {
  margin: 0;
  color: var(--text-primary);
  font-size: 21px;
  font-weight: 760;
  font-variant-numeric: tabular-nums;
}

.result-metrics small {
  margin-left: 2px;
  color: var(--text-tertiary);
  font-size: 10px;
  font-weight: 600;
}

.results-status {
  display: flex;
  min-height: 20px;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px 16px;
  color: var(--text-tertiary);
  font-size: 11px;
}

.results-status span:first-child {
  color: var(--text-secondary);
  font-weight: 680;
}

.ai-button {
  display: inline-flex;
  min-height: 42px;
  align-items: center;
  gap: 8px;
  padding: 0 15px;
  border: 1px solid var(--border-medium);
  border-radius: 10px;
  background: var(--text-primary);
  color: var(--bg-body);
  font-size: 13px;
  font-weight: 720;
  white-space: nowrap;
  transition: transform 360ms var(--ease-spring), background var(--transition-fast), color var(--transition-fast), opacity var(--transition-fast);
}

.ai-button:hover:not(:disabled) { transform: translateY(-2px) scale(1.015); }
.ai-button:disabled { cursor: not-allowed; opacity: 0.45; }

.results-controls {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 4px;
}

.platform-filters {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 7px;
  overflow-x: auto;
  scrollbar-width: none;
}

.platform-filters::-webkit-scrollbar { display: none; }

.platform-filters button {
  min-height: 36px;
  flex: 0 0 auto;
  padding: 0 11px;
  border: 1px solid transparent;
  border-radius: 9px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 650;
  white-space: nowrap;
}

.platform-filters button:hover { background: var(--bg-secondary); }
.platform-filters button.active {
  border-color: var(--border-medium);
  background: var(--bg-surface);
  color: var(--text-primary);
}
.platform-filters span { margin-left: 4px; color: var(--text-tertiary); font-variant-numeric: tabular-nums; }

.secondary-filters {
  display: flex;
  min-width: 0;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 12px;
  padding: 2px 0 5px;
}

.secondary-filters label {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: var(--text-tertiary);
  font-size: 11px;
  white-space: nowrap;
}

.secondary-filters select {
  min-height: 34px;
  padding: 0 26px 0 9px;
  border: 1px solid var(--border-light);
  border-radius: 8px;
  background: var(--bg-btn);
  color: var(--text-primary);
  font-size: 11px;
}

.reset-filters {
  min-height: 34px;
  padding: 0 9px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 650;
}

.reset-filters:hover {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.sorter {
  position: relative;
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 7px;
  color: var(--text-tertiary);
  font-size: 12px;
}

.result-options,
.health-toggle,
.adult-toggle {
  display: flex;
  align-items: center;
}

.result-options {
  flex: 0 0 auto;
  gap: 10px;
}

.health-toggle,
.adult-toggle {
  min-height: 36px;
  gap: 6px;
  padding: 0 10px;
  border: 1px solid var(--border-light);
  border-radius: 9px;
  background: var(--bg-btn);
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 650;
  white-space: nowrap;
}

.health-toggle:hover,
.adult-toggle:hover {
  border-color: var(--border-medium);
  background: var(--bg-hover);
  color: var(--text-primary);
}

.adult-toggle.active {
  border-color: var(--primary);
  background: var(--primary-soft);
  color: var(--primary-strong);
}

.sorter select {
  height: 36px;
  padding: 0 30px 0 10px;
  appearance: none;
  border: 1px solid var(--border-light);
  border-radius: 9px;
  background: var(--bg-btn);
  color: var(--text-primary);
  font-size: 12px;
}

.sorter svg { position: absolute; right: 9px; pointer-events: none; }

.inline-alert {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 11px 13px;
  border: 1px solid color-mix(in srgb, var(--warning) 34%, var(--border-light));
  border-radius: 10px;
  background: color-mix(in srgb, var(--warning) 8%, var(--bg-surface));
  color: var(--text-secondary);
  font-size: 12px;
}

.result-skeleton {
  overflow: hidden;
  border: 1px solid var(--border-light);
  border-radius: var(--radius-lg);
  background: var(--bg-surface);
}

.result-skeleton__status {
  display: block;
  padding: 13px 18px;
  border-bottom: 1px solid var(--border-light);
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 650;
}

.result-skeleton__row {
  display: grid;
  min-height: 92px;
  grid-template-columns: 92px minmax(0, 1fr) 84px;
  align-items: center;
  gap: 20px;
  padding: 18px 22px;
}

.result-skeleton__row + .result-skeleton__row {
  border-top: 1px solid var(--border-light);
}

.result-skeleton__row i,
.result-skeleton__row b,
.result-skeleton__row em {
  display: block;
  border-radius: 7px;
  background: linear-gradient(100deg, var(--bg-skeleton) 20%, var(--bg-skeleton-shine) 46%, var(--bg-skeleton) 72%);
  background-size: 220% 100%;
  animation: skeletonFlow 1.4s var(--ease-glide) infinite;
}

.result-skeleton__row i { width: 68px; height: 22px; }
.result-skeleton__row p { display: grid; margin: 0; gap: 11px; }
.result-skeleton__row b:first-child { width: min(86%, 620px); height: 18px; }
.result-skeleton__row b:last-child { width: min(54%, 360px); height: 12px; }
.result-skeleton__row em { width: 84px; height: 34px; }

@keyframes skeletonFlow {
  from { background-position: 180% 0; }
  to { background-position: -80% 0; }
}

.load-more {
  display: flex;
  width: 100%;
  min-height: 48px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px solid var(--border-light);
  border-radius: 10px;
  background: var(--bg-surface);
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 680;
}
.load-more:hover { background: var(--bg-hover); color: var(--text-primary); }
.load-more span { color: var(--text-tertiary); font-weight: 500; }

.empty-state {
  padding: 80px 20px;
  text-align: center;
  color: var(--text-tertiary);
}
.empty-state h2 { margin: 14px 0 7px; color: var(--text-primary); font-size: 20px; }
.empty-state p { margin: 0; font-size: 13px; }
.empty-suggestions { display: flex; margin-top: 18px; justify-content: center; flex-wrap: wrap; gap: 8px; }
.empty-suggestions button { min-height: 34px; padding: 0 11px; border: 1px solid var(--border-light); border-radius: 8px; background: var(--bg-btn); color: var(--text-secondary); font-size: 12px; }

@media (max-width: 820px) {
  .landing-layout {
    min-height: auto;
    grid-template-columns: 1fr;
    gap: 16px;
  }
  .landing-primary { padding: 32px 0 12px; }
  .landing-copy { margin-bottom: 26px; }
  .landing-copy h1 { font-size: clamp(40px, 11vw, 58px); }
  .results-summary {
    grid-template-columns: minmax(0, 1fr) auto;
  }
  .result-metrics {
    grid-column: 1 / -1;
    grid-row: 2;
  }
  .result-metrics > div:first-child { padding-left: 0; border-left: 0; }
}

@media (max-width: 640px) {
  .home { gap: 20px; }
  .popular-stream { padding-top: 48px; }
  .popular-stream__header {
    align-items: flex-start;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 22px;
  }
  .popular-stream__header > span { display: none; }
  .landing-primary { padding-top: 20px; }
  .landing-copy h1 { font-size: clamp(38px, 12vw, 50px); }
  .coverage-line { margin-top: 16px; }
  .recent-searches {
    max-height: 76px;
    overflow: hidden;
  }
  .compact-search { top: 76px; }
  .search-area-switch {
    display: grid;
    width: 100%;
    margin-bottom: 18px;
  }
  .search-area-switch--compact {
    width: calc(100% - 8px);
    margin: 0 4px 8px;
  }
  .results-summary,
  .results-controls { align-items: stretch; }
  .results-summary {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  .results-title h2 { white-space: normal; overflow-wrap: anywhere; }
  .result-metrics {
    grid-column: 1;
    grid-row: auto;
    overflow-x: auto;
  }
  .result-metrics > div { min-width: 72px; padding: 0 15px; }
  .ai-button { width: 100%; justify-content: center; }
  .results-controls { max-width: 100%; overflow: hidden; flex-direction: column; }
  .platform-filters { width: 100%; max-width: 100%; }
  .result-options {
    width: 100%;
    justify-content: flex-start;
    flex-wrap: wrap;
  }
  .secondary-filters {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .secondary-filters label {
    min-width: 0;
    align-items: stretch;
    flex-direction: column;
    gap: 4px;
  }
  .secondary-filters select { width: 100%; }
  .reset-filters { grid-column: 1 / -1; }
  .result-skeleton__row {
    min-height: 78px;
    grid-template-columns: 52px minmax(0, 1fr);
    gap: 12px;
    padding: 15px;
  }
  .result-skeleton__row em { display: none; }
}
</style>
