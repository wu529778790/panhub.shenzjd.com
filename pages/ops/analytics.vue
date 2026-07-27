<template>
  <div class="analytics-page">
    <header class="analytics-hero">
      <div>
        <NuxtLink class="back-link" to="/">返回网站</NuxtLink>
        <p class="section-label">运营数据</p>
        <h1>流量与搜索质量</h1>
        <p class="hero-copy">
          查看真实访问、获客来源、页面表现、搜索转化和前端体验。数据按匿名会话汇总。
        </p>
      </div>
      <div v-if="report" class="live-summary" aria-label="实时访问概览">
        <span class="live-indicator" aria-hidden="true"></span>
        <div>
          <strong>{{ formatNumber(report.realtime.activeNow) }}</strong>
          <span>近 5 分钟活跃</span>
        </div>
        <div>
          <strong>{{ formatNumber(report.realtime.last30Minutes) }}</strong>
          <span>近 30 分钟</span>
        </div>
      </div>
    </header>

    <section v-if="!authorized" class="access-panel" aria-labelledby="access-title">
      <div class="access-icon" aria-hidden="true">
        <PhLockKey :size="24" />
      </div>
      <div>
        <h2 id="access-title">输入后台访问密钥</h2>
        <p>密钥只保存在当前浏览器标签页，关闭标签页后自动清除。</p>
      </div>
      <form class="access-form" @submit.prevent="authenticate">
        <label for="ops-token">访问密钥</label>
        <div class="access-controls">
          <input
            id="ops-token"
            v-model.trim="token"
            type="password"
            autocomplete="current-password"
            placeholder="输入 NUXT_OPS_TOKEN"
            required />
          <button type="submit" :disabled="loading || !token">
            {{ loading ? "正在验证" : "进入后台" }}
          </button>
        </div>
        <p v-if="error" class="form-error" role="alert">{{ error }}</p>
      </form>
    </section>

    <template v-else>
      <nav class="analytics-toolbar" aria-label="统计时间范围">
        <div class="range-switcher">
          <button
            v-for="value in [7, 28, 90]"
            :key="value"
            type="button"
            :class="{ active: days === value }"
            @click="setDays(value)">
            {{ value }} 天
          </button>
        </div>
        <div class="toolbar-actions">
          <NuxtLink class="text-action" to="/ops/geo">
            SEO / GEO
          </NuxtLink>
          <span v-if="report" class="updated-at">
            更新于 {{ formatDateTime(report.generatedAt) }}
          </span>
          <button
            class="icon-action"
            type="button"
            :disabled="loading"
            aria-label="刷新数据"
            @click="loadReport">
            <PhArrowClockwise :size="18" :class="{ rotating: loading }" />
          </button>
          <button class="text-action" type="button" @click="logout">
            <PhSignOut :size="17" />
            退出
          </button>
        </div>
      </nav>

      <div v-if="loading && !report" class="dashboard-skeleton" aria-label="正在加载统计数据">
        <span v-for="index in 12" :key="index"></span>
      </div>

      <div v-else-if="error" class="error-panel" role="alert">
        <PhWarningCircle :size="23" />
        <div>
          <strong>数据读取失败</strong>
          <p>{{ error }}</p>
        </div>
        <button type="button" @click="loadReport">重试</button>
      </div>

      <main v-else-if="report" class="analytics-dashboard">
        <section class="metric-grid" aria-label="核心指标">
          <article
            v-for="metric in summaryMetrics"
            :key="metric.key"
            class="metric-item">
            <component :is="metric.icon" :size="19" aria-hidden="true" />
            <span>{{ metric.label }}</span>
            <strong>{{ metric.value }}</strong>
            <small :class="changeClass(metric.change)">
              {{ changeText(metric.change) }}
            </small>
          </article>
        </section>

        <section class="rate-strip" aria-label="访问质量指标">
          <div>
            <span>跳出率</span>
            <strong>{{ decimal(report.summary.bounceRate) }}%</strong>
          </div>
          <div>
            <span>每次会话浏览</span>
            <strong>{{ pagesPerSession }}</strong>
          </div>
          <div>
            <span>搜索转化率</span>
            <strong>{{ decimal(report.summary.searchConversionRate) }}%</strong>
          </div>
          <div>
            <span>结果点击率</span>
            <strong>{{ decimal(report.summary.resultClickRate) }}%</strong>
          </div>
          <div>
            <span>客户端错误</span>
            <strong :class="{ 'danger-text': Number(report.summary.errors) > 0 }">
              {{ formatNumber(report.summary.errors) }}
            </strong>
          </div>
        </section>

        <section class="analytics-section trend-section">
          <div class="section-heading">
            <div>
              <h2>访问趋势</h2>
              <p>按自然日统计访客、会话和浏览量。</p>
            </div>
            <div class="chart-legend" aria-label="图例">
              <span class="legend-views">浏览量</span>
              <span class="legend-visitors">访客</span>
            </div>
          </div>
          <div v-if="trendPoints.length" class="trend-chart">
            <svg
              viewBox="0 0 1000 260"
              role="img"
              aria-label="每日浏览量和访客趋势图"
              preserveAspectRatio="none">
              <line
                v-for="line in 4"
                :key="line"
                x1="0"
                :y1="line * 52"
                x2="1000"
                :y2="line * 52"
                class="chart-grid-line" />
              <polyline
                :points="viewPoints"
                class="chart-line chart-line--views"
                fill="none" />
              <polyline
                :points="visitorPoints"
                class="chart-line chart-line--visitors"
                fill="none" />
            </svg>
            <div class="chart-axis">
              <span
                v-for="point in axisLabels"
                :key="point.day">
                {{ shortDay(point.day) }}
              </span>
            </div>
          </div>
          <div v-else class="empty-state">采集开始后，这里会显示每日趋势。</div>
        </section>

        <div class="analytics-split">
          <section class="analytics-section">
            <div class="section-heading">
              <div>
                <h2>获客来源</h2>
                <p>识别自然搜索、直接访问、外部推荐和推广活动。</p>
              </div>
              <PhGlobeHemisphereWest :size="21" aria-hidden="true" />
            </div>
            <div class="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>来源</th>
                    <th>会话</th>
                    <th>搜索</th>
                    <th>点击</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in report.acquisition.slice(0, 12)" :key="acquisitionKey(row)">
                    <td>
                      <strong>{{ channelName(row.channel) }}</strong>
                      <span>{{ row.source }}<template v-if="row.campaign !== 'none'"> / {{ row.campaign }}</template></span>
                    </td>
                    <td>{{ formatNumber(row.sessions) }}</td>
                    <td>{{ formatNumber(row.searches) }}</td>
                    <td>{{ formatNumber(row.result_clicks) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-if="!report.acquisition.length" class="empty-state">
              暂无来源数据。
            </div>
          </section>

          <section class="analytics-section">
            <div class="section-heading">
              <div>
                <h2>访问环境</h2>
                <p>只保存汇总分类，不保存完整 User-Agent。</p>
              </div>
              <PhDeviceMobile :size="21" aria-hidden="true" />
            </div>
            <div class="dimension-groups">
              <div>
                <h3>设备</h3>
                <ul>
                  <li v-for="row in report.dimensions.devices" :key="row.name">
                    <span>{{ dimensionName(row.name) }}</span>
                    <strong>{{ formatNumber(row.sessions) }}</strong>
                  </li>
                </ul>
              </div>
              <div>
                <h3>浏览器</h3>
                <ul>
                  <li v-for="row in report.dimensions.browsers.slice(0, 6)" :key="row.name">
                    <span>{{ dimensionName(row.name) }}</span>
                    <strong>{{ formatNumber(row.sessions) }}</strong>
                  </li>
                </ul>
              </div>
              <div>
                <h3>系统</h3>
                <ul>
                  <li v-for="row in report.dimensions.systems.slice(0, 6)" :key="row.name">
                    <span>{{ dimensionName(row.name) }}</span>
                    <strong>{{ formatNumber(row.sessions) }}</strong>
                  </li>
                </ul>
              </div>
              <div>
                <h3>地区</h3>
                <ul>
                  <li v-for="row in report.dimensions.countries.slice(0, 6)" :key="row.name">
                    <span>{{ countryName(row.name) }}</span>
                    <strong>{{ formatNumber(row.sessions) }}</strong>
                  </li>
                </ul>
              </div>
            </div>
          </section>
        </div>

        <section class="analytics-section">
          <div class="section-heading">
            <div>
              <h2>页面表现</h2>
              <p>比较浏览量、入口、停留、搜索和结果点击。</p>
            </div>
            <PhBrowser :size="21" aria-hidden="true" />
          </div>
          <div class="table-scroll wide-table">
            <table>
              <thead>
                <tr>
                  <th>页面</th>
                  <th>浏览量</th>
                  <th>入口</th>
                  <th>平均参与</th>
                  <th>搜索</th>
                  <th>结果点击</th>
                  <th>错误</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in report.pages.slice(0, 30)" :key="row.path">
                  <td><code>{{ row.path }}</code></td>
                  <td>{{ formatNumber(row.page_views) }}</td>
                  <td>{{ formatNumber(row.entrances) }}</td>
                  <td>{{ pageEngagement(row) }}</td>
                  <td>{{ formatNumber(row.searches) }}</td>
                  <td>{{ formatNumber(row.result_clicks) }}</td>
                  <td :class="{ 'danger-text': Number(row.errors) > 0 }">
                    {{ formatNumber(row.errors) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-if="!report.pages.length" class="empty-state">
            暂无页面访问数据。
          </div>
        </section>

        <div class="analytics-split analytics-split--performance">
          <section class="analytics-section">
            <div class="section-heading">
              <div>
                <h2>真实用户性能</h2>
                <p>以用户浏览器实测值评估加载速度和交互稳定性。</p>
              </div>
              <PhPulse :size="21" aria-hidden="true" />
            </div>
            <div v-if="report.vitals.length" class="vitals-list">
              <article v-for="vital in report.vitals" :key="vital.metric">
                <div>
                  <strong>{{ vitalLabel(vital.metric) }}</strong>
                  <span>{{ vitalDescription(vital.metric) }}</span>
                </div>
                <div class="vital-value">
                  <strong>{{ formatVital(vital) }}</strong>
                  <span>{{ formatNumber(vital.sampleCount) }} 个样本</span>
                </div>
                <div class="vital-distribution" aria-label="体验评级分布">
                  <i
                    class="good"
                    :style="{ width: `${vital.goodRate}%` }"
                    :title="`良好 ${vital.goodRate}%`"></i>
                  <i
                    class="needs"
                    :style="{ width: `${vital.needsImprovementRate}%` }"
                    :title="`需要改进 ${vital.needsImprovementRate}%`"></i>
                  <i
                    class="poor"
                    :style="{ width: `${vital.poorRate}%` }"
                    :title="`较差 ${vital.poorRate}%`"></i>
                </div>
                <span class="good-rate">良好 {{ vital.goodRate }}%</span>
              </article>
            </div>
            <div v-else class="empty-state">
              等待浏览器上报首批性能样本。
            </div>
          </section>

          <section class="analytics-section">
            <div class="section-heading">
              <div>
                <h2>搜索漏斗</h2>
                <p>定位零结果、响应慢和结果点击不足的问题。</p>
              </div>
              <PhMagnifyingGlass :size="21" aria-hidden="true" />
            </div>
            <dl class="quality-metrics">
              <div>
                <dt>搜索次数</dt>
                <dd>{{ formatNumber(report.searchQuality.searchCount) }}</dd>
              </div>
              <div>
                <dt>零结果率</dt>
                <dd>{{ formatPercent(report.searchQuality.noResultRate) }}</dd>
              </div>
              <div>
                <dt>平均结果数</dt>
                <dd>{{ decimal(report.searchQuality.averageResultCount) }}</dd>
              </div>
              <div>
                <dt>P50 响应</dt>
                <dd>{{ duration(report.searchQuality.p50LatencyMs) }}</dd>
              </div>
              <div>
                <dt>P95 响应</dt>
                <dd>{{ duration(report.searchQuality.p95LatencyMs) }}</dd>
              </div>
              <div>
                <dt>结果点击</dt>
                <dd>{{ formatNumber(report.searchQuality.clickCount) }}</dd>
              </div>
            </dl>
            <div v-if="report.searchQuality.queries?.length" class="query-list">
              <h3>热门搜索</h3>
              <ol>
                <li v-for="row in report.searchQuality.queries.slice(0, 10)" :key="row.query">
                  <span>{{ row.query }}</span>
                  <strong>{{ formatNumber(row.search_count) }}</strong>
                  <small v-if="Number(row.no_result_count)">
                    {{ formatNumber(row.no_result_count) }} 次无结果
                  </small>
                </li>
              </ol>
            </div>
          </section>
        </div>

        <section class="analytics-section">
          <div class="section-heading">
            <div>
              <h2>搜索源质量</h2>
              <p>综合成功率、超时、重复结果、速度和有效产出评分。</p>
            </div>
            <PhMonitor :size="21" aria-hidden="true" />
          </div>
          <div class="source-grid">
            <article
              v-for="source in report.searchQuality.sources.slice(0, 18)"
              :key="source.key">
              <div>
                <strong>{{ source.name }}</strong>
                <span :class="`source-state source-state--${source.state}`">
                  {{ sourceStateName(source.state) }}
                </span>
              </div>
              <b>{{ source.score }}</b>
              <dl>
                <div><dt>成功率</dt><dd>{{ formatPercent(source.successRate) }}</dd></div>
                <div><dt>平均耗时</dt><dd>{{ duration(source.averageLatencyMs) }}</dd></div>
                <div><dt>有效结果</dt><dd>{{ formatNumber(source.uniqueResultCount) }}</dd></div>
                <div><dt>超时率</dt><dd>{{ formatPercent(source.timeoutRate) }}</dd></div>
              </dl>
            </article>
          </div>
          <div v-if="!report.searchQuality.sources.length" class="empty-state">
            搜索运行后，这里会显示各来源质量。
          </div>
        </section>

        <section class="analytics-section">
          <div class="section-heading">
            <div>
              <h2>客户端错误</h2>
              <p>错误信息已去除 URL、邮箱和手机号，不保存调用堆栈。</p>
            </div>
            <PhWarningCircle :size="21" aria-hidden="true" />
          </div>
          <div v-if="report.errors.length" class="error-list">
            <article v-for="row in report.errors" :key="`${row.path}:${row.fingerprint}`">
              <div>
                <strong>{{ row.message }}</strong>
                <code>{{ row.path }}</code>
              </div>
              <span>{{ formatNumber(row.error_count) }} 次</span>
              <time :datetime="new Date(Number(row.last_seen_at)).toISOString()">
                {{ formatDateTime(row.last_seen_at) }}
              </time>
            </article>
          </div>
          <div v-else class="empty-state">
            当前周期没有记录到客户端错误。
          </div>
        </section>
      </main>
    </template>
  </div>
</template>

<script setup lang="ts">
import {
  PhArrowClockwise,
  PhBrowser,
  PhClock,
  PhCursorClick,
  PhDeviceMobile,
  PhEye,
  PhGlobeHemisphereWest,
  PhLockKey,
  PhMagnifyingGlass,
  PhMonitor,
  PhPulse,
  PhSignOut,
  PhUsers,
  PhWarningCircle,
} from "@phosphor-icons/vue";

useSeoMeta({
  title: "运营统计 - 好搜库",
  description: "好搜库内部流量与搜索质量后台。",
  robots: "noindex, nofollow",
});

const TOKEN_KEY = "haosouku:ops-token";
const token = ref("");
const authorized = ref(false);
const loading = ref(false);
const error = ref("");
const days = ref(28);
const report = ref<any>(null);
let refreshTimer: ReturnType<typeof setInterval> | undefined;

const summaryMetrics = computed(() => {
  if (!report.value) return [];
  const summary = report.value.summary;
  const change = report.value.comparison.change;
  return [
    {
      key: "visitors",
      label: "访客",
      value: formatNumber(summary.visitors),
      change: change.visitors,
      icon: PhUsers,
    },
    {
      key: "sessions",
      label: "会话",
      value: formatNumber(summary.sessions),
      change: change.sessions,
      icon: PhPulse,
    },
    {
      key: "pageViews",
      label: "浏览量",
      value: formatNumber(summary.pageViews),
      change: change.pageViews,
      icon: PhEye,
    },
    {
      key: "engagement",
      label: "平均参与",
      value: `${decimal(summary.averageEngagementSeconds)} 秒`,
      change: null,
      icon: PhClock,
    },
    {
      key: "searches",
      label: "站内搜索",
      value: formatNumber(summary.searches),
      change: change.searches,
      icon: PhMagnifyingGlass,
    },
    {
      key: "clicks",
      label: "结果点击",
      value: formatNumber(summary.resultClicks),
      change: change.resultClicks,
      icon: PhCursorClick,
    },
  ];
});

const trendPoints = computed<any[]>(() => report.value?.daily || []);

function chartPoints(field: "page_views" | "visitors"): string {
  const rows = trendPoints.value;
  if (!rows.length) return "";
  const maximum = Math.max(
    1,
    ...rows.flatMap((row) => [
      Number(row.page_views || 0),
      Number(row.visitors || 0),
    ])
  );
  return rows
    .map((row, index) => {
      const x = rows.length === 1 ? 500 : (index / (rows.length - 1)) * 1000;
      const y = 240 - (Number(row[field] || 0) / maximum) * 220;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

const viewPoints = computed(() => chartPoints("page_views"));
const visitorPoints = computed(() => chartPoints("visitors"));
const pagesPerSession = computed(() => {
  const summary = report.value?.summary;
  if (!summary?.sessions) return "0";
  return decimal(Number(summary.pageViews || 0) / Number(summary.sessions));
});
const axisLabels = computed(() => {
  const rows = trendPoints.value;
  if (rows.length <= 6) return rows;
  const indexes = new Set([
    0,
    Math.floor((rows.length - 1) * 0.25),
    Math.floor((rows.length - 1) * 0.5),
    Math.floor((rows.length - 1) * 0.75),
    rows.length - 1,
  ]);
  return rows.filter((_, index) => indexes.has(index));
});

async function loadReport(): Promise<void> {
  if (!token.value) return;
  loading.value = true;
  error.value = "";
  try {
    const response = await $fetch<any>(`/api/ops/traffic?days=${days.value}`, {
      headers: { "x-ops-token": token.value },
    });
    report.value = response?.data || null;
    if (!report.value) throw new Error("统计数据库尚未启用");
    authorized.value = true;
    sessionStorage.setItem(TOKEN_KEY, token.value);
  } catch (cause: any) {
    const status = cause?.statusCode || cause?.response?.status;
    if (status === 401) {
      authorized.value = false;
      report.value = null;
      sessionStorage.removeItem(TOKEN_KEY);
      error.value = "访问密钥不正确";
    } else {
      error.value = cause?.data?.message || cause?.message || "暂时无法读取统计数据";
    }
  } finally {
    loading.value = false;
  }
}

async function authenticate(): Promise<void> {
  await loadReport();
}

async function setDays(value: number): Promise<void> {
  if (days.value === value) return;
  days.value = value;
  await loadReport();
}

function logout(): void {
  token.value = "";
  report.value = null;
  authorized.value = false;
  error.value = "";
  sessionStorage.removeItem(TOKEN_KEY);
}

function formatNumber(value: unknown): string {
  return new Intl.NumberFormat("zh-CN").format(Number(value || 0));
}

function decimal(value: unknown): string {
  return new Intl.NumberFormat("zh-CN", {
    maximumFractionDigits: 1,
  }).format(Number(value || 0));
}

function formatPercent(value: unknown): string {
  return `${decimal(Number(value || 0) * 100)}%`;
}

function duration(value: unknown): string {
  const milliseconds = Number(value || 0);
  if (milliseconds >= 1_000) return `${decimal(milliseconds / 1_000)} 秒`;
  return `${Math.round(milliseconds)} 毫秒`;
}

function formatDateTime(value: unknown): string {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(Number(value || 0)));
}

function shortDay(day: string): string {
  return day.slice(5).replace("-", "/");
}

function changeText(value: number | null): string {
  if (value === null) return "上期无数据";
  if (value === 0) return "与上期持平";
  return `${value > 0 ? "+" : ""}${decimal(value)}% 较上期`;
}

function changeClass(value: number | null): string {
  if (value === null || value === 0) return "change-neutral";
  return value > 0 ? "change-up" : "change-down";
}

function acquisitionKey(row: any): string {
  return [row.channel, row.source, row.medium, row.campaign].join(":");
}

function channelName(value: string): string {
  const names: Record<string, string> = {
    organic: "自然搜索",
    direct: "直接访问",
    referral: "外部推荐",
    social: "社交媒体",
    email: "邮件",
    paid: "付费推广",
    internal: "站内访问",
  };
  return names[value] || value || "未知";
}

function dimensionName(value: string): string {
  const names: Record<string, string> = {
    desktop: "桌面设备",
    mobile: "手机",
    tablet: "平板",
    windows: "Windows",
    macos: "macOS",
    ios: "iOS",
    android: "Android",
    linux: "Linux",
    chrome: "Chrome",
    safari: "Safari",
    edge: "Edge",
    firefox: "Firefox",
    wechat: "微信",
    qq: "QQ 浏览器",
    other: "其他",
    unknown: "未知",
  };
  return names[value] || value;
}

function countryName(value: string): string {
  const names: Record<string, string> = {
    CN: "中国",
    HK: "中国香港",
    MO: "中国澳门",
    TW: "中国台湾",
    US: "美国",
    SG: "新加坡",
    JP: "日本",
    KR: "韩国",
    unknown: "未知",
  };
  return names[value?.toUpperCase()] || value?.toUpperCase() || "未知";
}

function pageEngagement(row: any): string {
  const leaves = Math.max(1, Number(row.leaves || 0));
  return `${decimal(Number(row.engagement_ms || 0) / leaves / 1_000)} 秒`;
}

function vitalLabel(metric: string): string {
  return metric.toUpperCase();
}

function vitalDescription(metric: string): string {
  const descriptions: Record<string, string> = {
    lcp: "主要内容加载",
    cls: "页面布局稳定",
    inp: "交互响应速度",
    fcp: "首次内容绘制",
    ttfb: "首字节响应",
  };
  return descriptions[metric] || "性能指标";
}

function formatVital(vital: any): string {
  if (vital.metric === "cls") return decimal(vital.average);
  return duration(vital.average);
}

function sourceStateName(value: string): string {
  const names: Record<string, string> = {
    active: "正常",
    warming: "观察中",
    degraded: "降级",
    disabled: "停用",
    probe: "探测",
  };
  return names[value] || value;
}

onMounted(() => {
  token.value = sessionStorage.getItem(TOKEN_KEY) || "";
  if (token.value) void loadReport();
  refreshTimer = setInterval(() => {
    if (authorized.value && !document.hidden) void loadReport();
  }, 60_000);
});

onBeforeUnmount(() => {
  if (refreshTimer) clearInterval(refreshTimer);
});
</script>

<style scoped>
.analytics-page {
  width: min(100% - 40px, 1280px);
  margin: 0 auto;
  padding: 52px 0 96px;
}

.analytics-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
  gap: 48px;
  margin-bottom: 32px;
}

.back-link {
  display: inline-flex;
  margin-bottom: 28px;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 650;
}

.back-link:hover { color: var(--text-primary); }

.section-label {
  margin: 0 0 10px;
  color: var(--primary-strong);
  font-size: 12px;
  font-weight: 760;
  letter-spacing: 0.08em;
}

.analytics-hero h1 {
  margin: 0;
  font-size: clamp(34px, 5vw, 60px);
  font-weight: 820;
  letter-spacing: -0.055em;
  line-height: 0.98;
}

.hero-copy {
  max-width: 650px;
  margin: 18px 0 0;
  color: var(--text-secondary);
  font-size: 15px;
  line-height: 1.75;
}

.live-summary {
  display: grid;
  min-width: 300px;
  grid-template-columns: auto 1fr 1fr;
  align-items: center;
  gap: 20px;
  padding: 20px 22px;
  border: 1px solid var(--border-light);
  border-radius: var(--radius-lg);
  background: var(--bg-surface);
  box-shadow: var(--shadow-sm);
}

.live-indicator {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--primary-strong);
  box-shadow: 0 0 0 5px var(--primary-soft);
}

.live-summary div {
  display: grid;
  gap: 2px;
}

.live-summary strong {
  font-size: 23px;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.04em;
}

.live-summary span {
  color: var(--text-tertiary);
  font-size: 11px;
}

.access-panel {
  display: grid;
  max-width: 760px;
  margin-top: 56px;
  padding: 34px;
  grid-template-columns: auto 1fr;
  gap: 10px 18px;
  border-radius: var(--radius-xl);
  background: var(--bg-surface);
  box-shadow: var(--shadow-md);
}

.access-icon {
  display: grid;
  width: 46px;
  height: 46px;
  grid-row: span 2;
  place-items: center;
  border-radius: var(--radius-md);
  background: var(--primary-soft);
  color: var(--primary-strong);
}

.access-panel h2 {
  margin: 1px 0 5px;
  font-size: 21px;
  letter-spacing: -0.025em;
}

.access-panel p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.6;
}

.access-form {
  display: grid;
  grid-column: 2;
  gap: 8px;
  margin-top: 18px;
}

.access-form label {
  font-size: 12px;
  font-weight: 700;
}

.access-controls {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
}

.access-controls input {
  min-width: 0;
  height: 46px;
  padding: 0 14px;
  border: 1px solid var(--border-medium);
  border-radius: var(--radius-sm);
  background: var(--bg-input);
  color: var(--text-primary);
}

.access-controls button,
.error-panel button {
  min-height: 46px;
  padding: 0 20px;
  border: 0;
  border-radius: var(--radius-sm);
  background: var(--primary);
  color: var(--text-on-primary);
  font-weight: 760;
}

.form-error {
  color: var(--error) !important;
}

.analytics-toolbar {
  position: sticky;
  top: 80px;
  z-index: 10;
  display: flex;
  min-height: 54px;
  margin-bottom: 22px;
  padding: 7px;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  background: var(--bg-glass-strong);
  box-shadow: var(--shadow-sm);
  backdrop-filter: blur(14px);
}

.range-switcher,
.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.range-switcher button,
.icon-action,
.text-action {
  min-height: 38px;
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 700;
  transition: background var(--transition-fast), color var(--transition-fast);
}

.range-switcher button { padding: 0 14px; }
.range-switcher button:hover,
.range-switcher button.active,
.icon-action:hover,
.text-action:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.range-switcher button.active {
  background: var(--primary-soft);
  color: var(--primary-strong);
}

.updated-at {
  margin-right: 8px;
  color: var(--text-tertiary);
  font-size: 11px;
}

.icon-action {
  display: grid;
  width: 38px;
  padding: 0;
  place-items: center;
}

.text-action {
  display: inline-flex;
  padding: 0 12px;
  align-items: center;
  gap: 6px;
}

.rotating { animation: rotate 0.8s linear infinite; }
@keyframes rotate { to { transform: rotate(360deg); } }

.dashboard-skeleton {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
}

.dashboard-skeleton span {
  height: 132px;
  border-radius: var(--radius-md);
  background: var(--bg-skeleton);
  animation: pulse 1.4s ease-in-out infinite;
}

.dashboard-skeleton span:nth-child(n + 5) {
  height: 260px;
  grid-column: span 2;
}

.error-panel {
  display: flex;
  padding: 24px;
  align-items: center;
  gap: 16px;
  border: 1px solid color-mix(in srgb, var(--error) 35%, var(--border-light));
  border-radius: var(--radius-md);
  background: color-mix(in srgb, var(--error) 6%, var(--bg-surface));
}

.error-panel svg { color: var(--error); }
.error-panel strong { display: block; margin-bottom: 4px; }
.error-panel p { margin: 0; color: var(--text-secondary); font-size: 13px; }
.error-panel button { margin-left: auto; }

.analytics-dashboard {
  display: grid;
  gap: 18px;
}

.rate-strip {
  display: grid;
  padding: 14px 20px;
  grid-template-columns: repeat(5, 1fr);
  gap: 1px;
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  background: var(--bg-surface);
}

.rate-strip div {
  display: flex;
  min-width: 0;
  padding: 2px 16px;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  border-right: 1px solid var(--border-light);
}

.rate-strip div:first-child { padding-left: 0; }
.rate-strip div:last-child { padding-right: 0; border-right: 0; }
.rate-strip span { color: var(--text-tertiary); font-size: 10px; }
.rate-strip strong { font-size: 13px; font-variant-numeric: tabular-nums; white-space: nowrap; }

.metric-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-lg);
  overflow: hidden;
  background: var(--bg-surface);
}

.metric-item {
  display: grid;
  min-width: 0;
  padding: 20px;
  grid-template-columns: auto 1fr;
  align-items: center;
  gap: 5px 8px;
  border-right: 1px solid var(--border-light);
}

.metric-item:last-child { border-right: 0; }
.metric-item svg { color: var(--text-tertiary); }
.metric-item > span { color: var(--text-secondary); font-size: 11px; font-weight: 650; }

.metric-item strong {
  grid-column: 1 / -1;
  margin-top: 10px;
  font-size: clamp(23px, 2.4vw, 32px);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.05em;
  white-space: nowrap;
}

.metric-item small {
  grid-column: 1 / -1;
  font-size: 10px;
  font-weight: 650;
}

.change-up { color: var(--success); }
.change-down { color: var(--error); }
.change-neutral { color: var(--text-tertiary); }

.analytics-section {
  min-width: 0;
  padding: 24px;
  border: 1px solid var(--border-light);
  border-radius: var(--radius-lg);
  background: var(--bg-surface);
}

.section-heading {
  display: flex;
  margin-bottom: 22px;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
}

.section-heading h2 {
  margin: 0 0 6px;
  font-size: 17px;
  letter-spacing: -0.025em;
}

.section-heading p {
  margin: 0;
  color: var(--text-tertiary);
  font-size: 11px;
  line-height: 1.6;
}

.section-heading > svg { color: var(--text-tertiary); }

.trend-section { min-height: 360px; }

.chart-legend {
  display: flex;
  gap: 16px;
  color: var(--text-secondary);
  font-size: 10px;
}

.chart-legend span::before {
  display: inline-block;
  width: 16px;
  height: 2px;
  margin-right: 6px;
  vertical-align: middle;
  content: "";
}

.legend-views::before { background: var(--primary-strong); }
.legend-visitors::before { background: var(--text-tertiary); }

.trend-chart svg {
  display: block;
  width: 100%;
  height: 240px;
  overflow: visible;
}

.chart-grid-line {
  stroke: var(--border-light);
  stroke-width: 1;
  vector-effect: non-scaling-stroke;
}

.chart-line {
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
  vector-effect: non-scaling-stroke;
}

.chart-line--views { stroke: var(--primary-strong); }
.chart-line--visitors { stroke: var(--text-tertiary); stroke-width: 2; }

.chart-axis {
  display: flex;
  justify-content: space-between;
  color: var(--text-tertiary);
  font-size: 10px;
}

.analytics-split {
  display: grid;
  grid-template-columns: 1.12fr 0.88fr;
  gap: 18px;
}

.analytics-split--performance { grid-template-columns: 1fr 1fr; }

.table-scroll { overflow-x: auto; }
.table-scroll table { width: 100%; border-collapse: collapse; }
.table-scroll th {
  padding: 0 12px 10px;
  color: var(--text-tertiary);
  font-size: 10px;
  font-weight: 650;
  text-align: right;
  white-space: nowrap;
}

.table-scroll th:first-child,
.table-scroll td:first-child { padding-left: 0; text-align: left; }

.table-scroll td {
  padding: 13px 12px;
  border-top: 1px solid var(--border-light);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  text-align: right;
  white-space: nowrap;
}

.table-scroll td:first-child {
  white-space: normal;
}

.table-scroll td strong,
.table-scroll td span {
  display: block;
}

.table-scroll td span {
  margin-top: 3px;
  color: var(--text-tertiary);
  font-size: 10px;
}

.table-scroll code,
.error-list code {
  color: var(--text-secondary);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 11px;
}

.wide-table { max-height: 560px; }
.wide-table thead {
  position: sticky;
  top: 0;
  background: var(--bg-surface);
}

.danger-text { color: var(--error); font-weight: 700; }

.dimension-groups {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 22px 28px;
}

.dimension-groups h3,
.query-list h3 {
  margin: 0 0 10px;
  color: var(--text-tertiary);
  font-size: 10px;
  font-weight: 700;
}

.dimension-groups ul,
.query-list ol {
  margin: 0;
  padding: 0;
  list-style: none;
}

.dimension-groups li {
  display: flex;
  min-height: 30px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 11px;
}

.dimension-groups li strong {
  font-variant-numeric: tabular-nums;
}

.vitals-list {
  display: grid;
  gap: 2px;
}

.vitals-list article {
  display: grid;
  grid-template-columns: minmax(110px, 1fr) auto minmax(120px, 1.3fr) auto;
  align-items: center;
  gap: 14px;
  min-height: 62px;
  padding: 11px 0;
  border-top: 1px solid var(--border-light);
}

.vitals-list article:first-child { border-top: 0; }
.vitals-list article > div:first-child,
.vital-value { display: grid; gap: 2px; }
.vitals-list article span { color: var(--text-tertiary); font-size: 9px; }
.vital-value { text-align: right; }
.vital-value strong { font-size: 13px; font-variant-numeric: tabular-nums; }

.vital-distribution {
  display: flex;
  height: 6px;
  gap: 2px;
  overflow: hidden;
  border-radius: 3px;
  background: var(--bg-secondary);
}

.vital-distribution i { display: block; min-width: 0; }
.vital-distribution .good { background: var(--primary-strong); }
.vital-distribution .needs { background: var(--warning); }
.vital-distribution .poor { background: var(--error); }
.good-rate { white-space: nowrap; }

.quality-metrics {
  display: grid;
  margin: 0;
  grid-template-columns: repeat(3, 1fr);
  gap: 18px;
}

.quality-metrics div {
  display: grid;
  gap: 5px;
}

.quality-metrics dt {
  color: var(--text-tertiary);
  font-size: 10px;
}

.quality-metrics dd {
  margin: 0;
  font-size: 18px;
  font-weight: 740;
  font-variant-numeric: tabular-nums;
}

.query-list { margin-top: 25px; }
.query-list li {
  display: grid;
  min-height: 32px;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 10px;
  font-size: 11px;
}

.query-list li span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.query-list li strong { font-variant-numeric: tabular-nums; }
.query-list li small { color: var(--error); font-size: 9px; }

.source-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1px;
  overflow: hidden;
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  background: var(--border-light);
}

.source-grid article {
  display: grid;
  padding: 18px;
  grid-template-columns: 1fr auto;
  gap: 14px;
  background: var(--bg-surface);
}

.source-grid article > div {
  display: grid;
  gap: 6px;
}

.source-grid article > b {
  font-size: 27px;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.05em;
}

.source-state {
  width: fit-content;
  color: var(--text-tertiary);
  font-size: 9px;
}

.source-state--active { color: var(--success); }
.source-state--degraded,
.source-state--probe { color: var(--warning); }
.source-state--disabled { color: var(--error); }

.source-grid dl {
  display: grid;
  grid-column: 1 / -1;
  margin: 0;
  grid-template-columns: 1fr 1fr;
  gap: 7px 14px;
}

.source-grid dl div {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  font-size: 9px;
}

.source-grid dt { color: var(--text-tertiary); }
.source-grid dd { margin: 0; font-variant-numeric: tabular-nums; }

.error-list {
  display: grid;
}

.error-list article {
  display: grid;
  min-height: 58px;
  padding: 10px 0;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 20px;
  border-top: 1px solid var(--border-light);
}

.error-list article:first-child { border-top: 0; }
.error-list article > div { display: grid; gap: 4px; min-width: 0; }
.error-list strong { overflow: hidden; font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
.error-list > article > span { color: var(--error); font-size: 11px; font-weight: 700; }
.error-list time { color: var(--text-tertiary); font-size: 10px; white-space: nowrap; }

.empty-state {
  display: grid;
  min-height: 130px;
  place-items: center;
  color: var(--text-tertiary);
  font-size: 12px;
  text-align: center;
}

@media (max-width: 1100px) {
  .metric-grid { grid-template-columns: repeat(3, 1fr); }
  .metric-item:nth-child(3) { border-right: 0; }
  .metric-item:nth-child(-n + 3) { border-bottom: 1px solid var(--border-light); }
  .source-grid { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 820px) {
  .analytics-page { width: min(100% - 28px, 1280px); padding-top: 32px; }
  .analytics-hero,
  .analytics-split,
  .analytics-split--performance { grid-template-columns: 1fr; }
  .analytics-hero { align-items: start; gap: 24px; }
  .live-summary { min-width: 0; width: 100%; }
  .analytics-toolbar { top: 74px; }
  .rate-strip { grid-template-columns: repeat(2, 1fr); gap: 14px 1px; }
  .rate-strip div,
  .rate-strip div:first-child,
  .rate-strip div:last-child {
    padding: 2px 12px;
    border-right: 0;
  }
}

@media (max-width: 640px) {
  .analytics-page { width: min(100% - 20px, 1280px); }
  .analytics-hero h1 { font-size: 38px; }
  .access-panel {
    padding: 24px;
    grid-template-columns: 1fr;
  }
  .access-icon { grid-row: auto; }
  .access-form { grid-column: 1; }
  .access-controls { grid-template-columns: 1fr; }
  .analytics-toolbar { position: static; align-items: flex-start; }
  .updated-at { display: none; }
  .text-action { width: 38px; padding: 0; justify-content: center; font-size: 0; }
  .metric-grid { grid-template-columns: repeat(2, 1fr); }
  .metric-item,
  .metric-item:nth-child(3) { border-right: 1px solid var(--border-light); }
  .metric-item:nth-child(2n) { border-right: 0; }
  .metric-item:nth-child(-n + 4) { border-bottom: 1px solid var(--border-light); }
  .analytics-section { padding: 19px; }
  .source-grid { grid-template-columns: 1fr; }
  .dimension-groups { grid-template-columns: 1fr 1fr; gap: 18px; }
  .vitals-list article {
    grid-template-columns: 1fr auto;
  }
  .vital-distribution { grid-column: 1 / -1; }
  .good-rate { display: none; }
  .quality-metrics { grid-template-columns: 1fr 1fr; }
  .query-list li { grid-template-columns: minmax(0, 1fr) auto; }
  .query-list li small { display: none; }
  .error-list article {
    grid-template-columns: minmax(0, 1fr) auto;
  }
  .error-list time { grid-column: 1 / -1; }
}

@media (prefers-reduced-motion: reduce) {
  .rotating { animation: none; }
}
</style>
