<template>
  <div class="geo-ops-page">
    <header class="geo-ops-hero">
      <div>
        <nav class="back-links" aria-label="后台导航">
          <NuxtLink to="/ops/analytics">流量统计</NuxtLink>
          <NuxtLink to="/">返回网站</NuxtLink>
        </nav>
        <p class="section-label">内容增长</p>
        <h1>SEO / GEO 工作流</h1>
        <p class="hero-copy">
          查看关键词机会、内容审核、知识库索引、页面收录和自然搜索表现。
        </p>
      </div>
      <div v-if="report" class="pipeline-state">
        <PhFlowArrow :size="21" aria-hidden="true" />
        <div>
          <strong>{{ latestRunLabel }}</strong>
          <span>{{ latestRunTime }}</span>
        </div>
      </div>
    </header>

    <section v-if="!authorized" class="access-panel" aria-labelledby="geo-access-title">
      <PhLockKey :size="24" aria-hidden="true" />
      <div>
        <h2 id="geo-access-title">输入后台访问密钥</h2>
        <p>与流量统计后台使用同一密钥，只保存在当前浏览器标签页。</p>
      </div>
      <form @submit.prevent="authenticate">
        <label for="geo-ops-token">访问密钥</label>
        <div>
          <input
            id="geo-ops-token"
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
      <nav class="ops-toolbar" aria-label="GEO 工作流操作">
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
          <span v-if="report">更新于 {{ formatDateTime(report.generatedAt) }}</span>
          <button
            class="secondary-action"
            type="button"
            :disabled="loading"
            @click="loadReport">
            <PhArrowClockwise :size="17" :class="{ rotating: loading }" />
            刷新
          </button>
          <button
            class="primary-action"
            type="button"
            :disabled="runLoading"
            @click="requestRun">
            <PhPlay :size="17" weight="fill" />
            {{ runLoading ? "正在加入" : "执行一轮" }}
          </button>
        </div>
      </nav>

      <div v-if="loading && !report" class="dashboard-skeleton" aria-label="正在加载">
        <span v-for="index in 10" :key="index"></span>
      </div>

      <div v-else-if="error" class="error-panel" role="alert">
        <PhWarningCircle :size="22" />
        <div>
          <strong>数据读取失败</strong>
          <p>{{ error }}</p>
        </div>
        <button type="button" @click="loadReport">重试</button>
      </div>

      <main v-else-if="report" class="geo-dashboard">
        <p v-if="runMessage" class="run-message" role="status">{{ runMessage }}</p>

        <section class="metric-grid" aria-label="GEO 核心指标">
          <article v-for="metric in summaryMetrics" :key="metric.label">
            <span>{{ metric.label }}</span>
            <strong>{{ metric.value }}</strong>
            <small>{{ metric.note }}</small>
          </article>
        </section>

        <section class="ops-section pipeline-section">
          <header>
            <div>
              <h2>自动发布流程</h2>
              <p>发现、检索、生成、审核、发布和索引提交均在 Cloudflare 内完成。</p>
            </div>
            <PhArrowsClockwise :size="22" aria-hidden="true" />
          </header>
          <ol class="pipeline-steps">
            <li>
              <strong>关键词发现</strong>
              <span>读取真实搜索词、无结果率和资源目录信号。</span>
            </li>
            <li>
              <strong>知识检索</strong>
              <span>Vectorize 语义检索失败时自动回退到 D1 文本检索。</span>
            </li>
            <li>
              <strong>内容生成</strong>
              <span>Workers AI 只根据可核对材料生成中文指南。</span>
            </li>
            <li>
              <strong>质量审核</strong>
              <span>检查长度、证据、重复度、关键词比例和无法证实的承诺。</span>
            </li>
            <li>
              <strong>发布提交</strong>
              <span>达到 72 分后进入站点地图并提交 IndexNow。</span>
            </li>
          </ol>
        </section>

        <div class="dashboard-split">
          <section class="ops-section">
            <header>
              <div>
                <h2>近期产出</h2>
                <p>每日发现、处理、发布和驳回数量。</p>
              </div>
              <PhChartLineUp :size="22" aria-hidden="true" />
            </header>
            <div class="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>日期</th>
                    <th>发现</th>
                    <th>处理</th>
                    <th>发布</th>
                    <th>驳回</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in report.metrics.slice(-14).reverse()" :key="row.day">
                    <td>{{ row.day }}</td>
                    <td>{{ formatNumber(row.keywords_discovered) }}</td>
                    <td>{{ formatNumber(row.jobs_processed) }}</td>
                    <td>{{ formatNumber(row.pages_published) }}</td>
                    <td>{{ formatNumber(row.pages_rejected) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p v-if="!report.metrics.length" class="empty-state">执行首轮任务后显示每日数据。</p>
          </section>

          <section class="ops-section">
            <header>
              <div>
                <h2>AI 与向量用量</h2>
                <p>用于观察生成失败和知识库索引是否正常。</p>
              </div>
              <PhDatabase :size="22" aria-hidden="true" />
            </header>
            <dl class="usage-list">
              <div>
                <dt>AI 请求</dt>
                <dd>{{ aggregateMetric("ai_requests") }}</dd>
              </div>
              <div>
                <dt>AI 失败</dt>
                <dd :class="{ danger: aggregateMetricNumber('ai_failures') > 0 }">
                  {{ aggregateMetric("ai_failures") }}
                </dd>
              </div>
              <div>
                <dt>向量写入</dt>
                <dd>{{ aggregateMetric("vector_upserts") }}</dd>
              </div>
              <div>
                <dt>语义查询</dt>
                <dd>{{ aggregateMetric("vector_queries") }}</dd>
              </div>
              <div>
                <dt>提交索引</dt>
                <dd>{{ aggregateMetric("index_submitted") }}</dd>
              </div>
            </dl>
          </section>
        </div>

        <section class="ops-section knowledge-search">
          <header>
            <div>
              <h2>知识库检索验收</h2>
              <p>输入问题，验证 Vectorize 与 D1 回退检索返回的材料。</p>
            </div>
            <PhMagnifyingGlass :size="22" aria-hidden="true" />
          </header>
          <form @submit.prevent="searchKnowledge">
            <label for="knowledge-query">检索问题</label>
            <div>
              <input
                id="knowledge-query"
                v-model.trim="knowledgeQuery"
                type="search"
                placeholder="例如：115 电影资源怎么找"
                minlength="2"
                maxlength="120" />
              <button type="submit" :disabled="knowledgeLoading || knowledgeQuery.length < 2">
                {{ knowledgeLoading ? "正在检索" : "开始检索" }}
              </button>
            </div>
          </form>
          <div v-if="knowledgeResult" class="knowledge-results">
            <p>检索方式：{{ knowledgeResult.mode === "vector" ? "Vectorize 语义检索" : "D1 文本检索" }}</p>
            <article v-for="item in knowledgeResult.results" :key="item.document_id">
              <strong>{{ item.title }}</strong>
              <p>{{ item.body }}</p>
              <a v-if="item.source_url" :href="item.source_url">查看来源页面</a>
            </article>
            <p v-if="!knowledgeResult.results.length" class="empty-state">没有找到相关材料。</p>
          </div>
        </section>

        <section class="ops-section">
          <header>
            <div>
              <h2>关键词机会</h2>
              <p>按分类、意图、平台和状态汇总真实需求。</p>
            </div>
            <PhTreeStructure :size="22" aria-hidden="true" />
          </header>
          <div class="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>分类</th>
                  <th>意图</th>
                  <th>平台</th>
                  <th>状态</th>
                  <th>关键词</th>
                  <th>机会分</th>
                  <th>搜索</th>
                  <th>结果</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="row in report.classifications.slice(0, 40)"
                  :key="[row.category, row.intent, row.platform, row.status].join(':')">
                  <td>{{ row.category }}</td>
                  <td>{{ intentName(row.intent) }}</td>
                  <td>{{ row.platform || "未限定" }}</td>
                  <td><span class="status-label" :data-status="row.status">{{ statusName(row.status) }}</span></td>
                  <td>{{ formatNumber(row.keyword_count) }}</td>
                  <td>{{ decimal(row.opportunity_score) }}</td>
                  <td>{{ formatNumber(row.search_count) }}</td>
                  <td>{{ formatNumber(row.result_count) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section class="ops-section">
          <header>
            <div>
              <h2>已生成页面</h2>
              <p>质量分、重复度与自然搜索表现放在同一张表中。</p>
            </div>
            <PhFileText :size="22" aria-hidden="true" />
          </header>
          <div class="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>页面</th>
                  <th>状态</th>
                  <th>质量</th>
                  <th>字数</th>
                  <th>重复度</th>
                  <th>自然访问</th>
                  <th>站内搜索</th>
                  <th>结果点击</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in pageRows" :key="row.path">
                  <td>
                    <NuxtLink v-if="row.status === 'published'" :to="row.path">
                      {{ row.title }}
                    </NuxtLink>
                    <span v-else>{{ row.title }}</span>
                    <small>{{ row.keyword }}</small>
                  </td>
                  <td><span class="status-label" :data-status="row.status">{{ statusName(row.status) }}</span></td>
                  <td>{{ formatNumber(row.quality_score) }}</td>
                  <td>{{ formatNumber(row.word_count) }}</td>
                  <td>{{ decimal(Number(row.duplicate_score || 0) * 100) }}%</td>
                  <td>{{ formatNumber(row.organic_landings) }}</td>
                  <td>{{ formatNumber(row.searches) }}</td>
                  <td>{{ formatNumber(row.result_clicks) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-if="!pageRows.length" class="empty-state">首轮内容通过审核后显示页面数据。</p>
        </section>

        <div class="dashboard-split">
          <section class="ops-section">
            <header>
              <div>
                <h2>最近执行</h2>
                <p>每轮任务的发现、发布和错误状态。</p>
              </div>
              <PhClockCounterClockwise :size="22" aria-hidden="true" />
            </header>
            <ul class="run-list">
              <li v-for="run in report.runs.slice(0, 12)" :key="run.run_id">
                <div>
                  <strong>{{ statusName(run.status) }}</strong>
                  <span>{{ formatDateTime(run.started_at) }}</span>
                </div>
                <p>
                  发现 {{ formatNumber(run.discovered_count) }}，
                  处理 {{ formatNumber(run.processed_count) }}，
                  发布 {{ formatNumber(run.published_count) }}
                </p>
                <small v-if="run.error_message">{{ run.error_message }}</small>
              </li>
            </ul>
            <p v-if="!report.runs.length" class="empty-state">暂无执行记录。</p>
          </section>

          <section class="ops-section">
            <header>
              <div>
                <h2>审核驳回原因</h2>
                <p>用来持续调整提示词和质量门槛。</p>
              </div>
              <PhShieldCheckered :size="22" aria-hidden="true" />
            </header>
            <ul class="issue-list">
              <li v-for="row in report.reviewIssues" :key="row.issues_json">
                <span>{{ issueText(row.issues_json) }}</span>
                <strong>{{ formatNumber(row.issue_count) }}</strong>
              </li>
            </ul>
            <p v-if="!report.reviewIssues.length" class="empty-state">暂无驳回记录。</p>
          </section>
        </div>
      </main>
    </template>
  </div>
</template>

<script setup lang="ts">
import {
  PhArrowClockwise,
  PhArrowsClockwise,
  PhChartLineUp,
  PhClockCounterClockwise,
  PhDatabase,
  PhFileText,
  PhFlowArrow,
  PhLockKey,
  PhMagnifyingGlass,
  PhPlay,
  PhShieldCheckered,
  PhTreeStructure,
  PhWarningCircle,
} from "@phosphor-icons/vue";

definePageMeta({ layout: "default" });
useSeoMeta({
  title: "SEO / GEO 工作流 - 好搜库运营后台",
  robots: "noindex,nofollow",
});

const TOKEN_KEY = "haosouku:ops-token";
const token = ref("");
const days = ref(28);
const report = ref<any>(null);
const loading = ref(false);
const runLoading = ref(false);
const error = ref("");
const runMessage = ref("");
const knowledgeQuery = ref("");
const knowledgeLoading = ref(false);
const knowledgeResult = ref<any>(null);

const authorized = computed(() => Boolean(report.value));
const latestRun = computed(() => report.value?.runs?.[0] || null);
const latestRunLabel = computed(() =>
  latestRun.value ? statusName(latestRun.value.status) : "等待首轮执行"
);
const latestRunTime = computed(() =>
  latestRun.value ? formatDateTime(latestRun.value.started_at) : "尚无执行记录"
);

const summaryMetrics = computed(() => {
  const summary = report.value?.summary || {};
  const knowledge = Number(summary.knowledge_document_count || 0);
  const indexed = Number(summary.vector_document_count || 0);
  return [
    {
      label: "关键词机会",
      value: formatNumber(summary.keyword_count),
      note: `${formatNumber(summary.queued_keyword_count)} 个等待处理`,
    },
    {
      label: "已发布页面",
      value: formatNumber(summary.published_page_count),
      note: `平均质量 ${decimal(summary.average_quality_score)} 分`,
    },
    {
      label: "审核驳回",
      value: formatNumber(summary.rejected_page_count),
      note: "不会进入站点地图",
    },
    {
      label: "知识库文档",
      value: formatNumber(knowledge),
      note: `${formatNumber(indexed)} 个已向量化`,
    },
    {
      label: "向量覆盖率",
      value: knowledge ? `${decimal((indexed / knowledge) * 100)}%` : "0%",
      note: "Vectorize 可检索比例",
    },
  ];
});

const pageRows = computed(() => {
  const performance = new Map(
    (report.value?.performance || []).map((row: any) => [row.path, row])
  );
  return (report.value?.pages || []).map((row: any) => ({
    ...row,
    ...(performance.get(row.path) || {}),
  }));
});

async function loadReport(): Promise<void> {
  if (!token.value) return;
  loading.value = true;
  error.value = "";
  try {
    const response = await $fetch<any>(`/api/ops/geo?days=${days.value}`, {
      headers: { "x-ops-token": token.value },
    });
    report.value = response.data;
    sessionStorage.setItem(TOKEN_KEY, token.value);
  } catch (requestError: any) {
    report.value = null;
    error.value =
      requestError?.statusCode === 401
        ? "访问密钥不正确。"
        : requestError?.data?.message || "暂时无法读取 GEO 数据。";
  } finally {
    loading.value = false;
  }
}

async function authenticate(): Promise<void> {
  await loadReport();
}

async function requestRun(): Promise<void> {
  runLoading.value = true;
  runMessage.value = "";
  try {
    const response = await $fetch<any>("/api/ops/geo/run", {
      method: "POST",
      headers: { "x-ops-token": token.value },
    });
    runMessage.value =
      response.data?.note || "任务已加入队列，将在十分钟内开始执行。";
    window.setTimeout(() => void loadReport(), 12_000);
  } catch (requestError: any) {
    runMessage.value =
      requestError?.data?.message || "任务加入失败，请稍后重试。";
  } finally {
    runLoading.value = false;
  }
}

async function searchKnowledge(): Promise<void> {
  if (knowledgeQuery.value.length < 2) return;
  knowledgeLoading.value = true;
  try {
    const response = await $fetch<any>("/api/geo/search", {
      query: { q: knowledgeQuery.value },
    });
    knowledgeResult.value = response.data;
  } finally {
    knowledgeLoading.value = false;
  }
}

function setDays(value: number): void {
  days.value = value;
  void loadReport();
}

function aggregateMetricNumber(key: string): number {
  return (report.value?.metrics || []).reduce(
    (total: number, row: any) => total + Number(row[key] || 0),
    0
  );
}

function aggregateMetric(key: string): string {
  return formatNumber(aggregateMetricNumber(key));
}

function formatNumber(value: unknown): string {
  return new Intl.NumberFormat("zh-CN").format(Number(value || 0));
}

function decimal(value: unknown): string {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number.toFixed(1).replace(/\.0$/, "") : "0";
}

function formatDateTime(value: unknown): string {
  const timestamp = Number(value || 0);
  if (!timestamp) return "暂无";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(timestamp));
}

function intentName(value: string): string {
  return (
    {
      how_to: "使用方法",
      comparison: "平台对比",
      troubleshooting: "问题处理",
      freshness: "近期更新",
      resource_discovery: "资源查找",
    }[value] || value
  );
}

function statusName(value: string): string {
  return (
    {
      discovered: "已发现",
      queued: "等待处理",
      generating: "正在生成",
      reviewing: "正在审核",
      published: "已发布",
      rejected: "未通过",
      failed: "执行失败",
      paused: "已暂停",
      running: "执行中",
      success: "执行完成",
      partial: "部分完成",
    }[value] || value
  );
}

function issueText(value: string): string {
  try {
    const issues = JSON.parse(value);
    return Array.isArray(issues) ? issues.join("、") : String(value);
  } catch {
    return String(value || "未知原因");
  }
}

onMounted(() => {
  token.value = sessionStorage.getItem(TOKEN_KEY) || "";
  if (token.value) void loadReport();
});
</script>

<style scoped>
.geo-ops-page {
  width: min(100% - 40px, 1280px);
  margin: 0 auto;
  padding: 52px 0 96px;
}

.geo-ops-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
  gap: 48px;
  margin-bottom: 32px;
}

.back-links {
  display: flex;
  gap: 20px;
  margin-bottom: 28px;
}

.back-links a {
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 650;
}

.back-links a:hover {
  color: var(--text-primary);
}

.section-label {
  margin: 0 0 10px;
  color: var(--primary-strong);
  font-size: 12px;
  font-weight: 760;
  letter-spacing: 0.08em;
}

.geo-ops-hero h1 {
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

.pipeline-state {
  display: flex;
  min-width: 230px;
  align-items: center;
  gap: 14px;
  padding: 18px 20px;
  border: 1px solid var(--border-light);
  border-radius: var(--radius-lg);
  background: var(--bg-surface);
}

.pipeline-state svg {
  color: var(--primary-strong);
}

.pipeline-state div {
  display: grid;
  gap: 3px;
}

.pipeline-state strong {
  font-size: 15px;
}

.pipeline-state span {
  color: var(--text-tertiary);
  font-size: 12px;
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

.access-panel > svg {
  grid-row: span 2;
  margin: 10px;
  color: var(--primary-strong);
}

.access-panel h2 {
  margin: 0 0 5px;
  font-size: 21px;
}

.access-panel p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 13px;
}

.access-panel form {
  display: grid;
  grid-column: 2;
  gap: 8px;
  margin-top: 18px;
}

.access-panel label,
.knowledge-search label {
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 700;
}

.access-panel form > div,
.knowledge-search form > div {
  display: flex;
  gap: 10px;
}

input {
  min-width: 0;
  flex: 1;
  padding: 12px 14px;
  border: 1px solid var(--border-medium);
  border-radius: var(--radius-sm);
  background: var(--bg-primary);
  color: var(--text-primary);
  font: inherit;
}

input:focus {
  border-color: var(--primary-strong);
  outline: 3px solid var(--primary-soft);
}

button {
  font: inherit;
}

.access-panel button,
.knowledge-search form button,
.primary-action {
  border: 0;
  border-radius: var(--radius-sm);
  background: var(--primary-strong);
  color: #13200d;
  font-weight: 760;
  cursor: pointer;
}

.access-panel button,
.knowledge-search form button {
  padding: 0 18px;
}

button:disabled {
  cursor: wait;
  opacity: 0.6;
}

button:active:not(:disabled) {
  transform: translateY(1px);
}

.form-error {
  color: #b73535 !important;
}

.ops-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 24px;
  padding: 10px 12px;
  border: 1px solid var(--border-light);
  border-radius: var(--radius-lg);
  background: var(--bg-surface);
}

.range-switcher {
  display: flex;
  gap: 4px;
}

.range-switcher button,
.secondary-action {
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
}

.range-switcher button {
  padding: 9px 13px;
  font-size: 13px;
  font-weight: 680;
}

.range-switcher button.active {
  background: var(--primary-soft);
  color: var(--text-primary);
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.toolbar-actions > span {
  margin-right: 6px;
  color: var(--text-tertiary);
  font-size: 12px;
}

.secondary-action,
.primary-action {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 10px 13px;
  white-space: nowrap;
}

.secondary-action:hover {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.geo-dashboard {
  display: grid;
  gap: 24px;
}

.run-message {
  margin: 0;
  padding: 13px 16px;
  border-radius: var(--radius-md);
  background: var(--primary-soft);
  color: var(--text-primary);
  font-size: 13px;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  border: 1px solid var(--border-light);
  border-radius: var(--radius-xl);
  background: var(--bg-surface);
  overflow: hidden;
}

.metric-grid article {
  display: grid;
  gap: 7px;
  min-width: 0;
  padding: 24px;
}

.metric-grid article + article {
  border-left: 1px solid var(--border-light);
}

.metric-grid span,
.metric-grid small {
  color: var(--text-tertiary);
  font-size: 12px;
}

.metric-grid strong {
  font-size: clamp(26px, 3vw, 38px);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.05em;
}

.ops-section {
  min-width: 0;
  padding: 28px;
  border: 1px solid var(--border-light);
  border-radius: var(--radius-xl);
  background: var(--bg-surface);
}

.ops-section > header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 24px;
}

.ops-section > header svg {
  color: var(--primary-strong);
}

.ops-section h2 {
  margin: 0;
  font-size: 20px;
  letter-spacing: -0.025em;
}

.ops-section header p {
  margin: 7px 0 0;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.6;
}

.pipeline-steps {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 1px;
  margin: 0;
  padding: 0;
  background: var(--border-light);
  list-style: none;
}

.pipeline-steps li {
  min-height: 144px;
  padding: 20px;
  background: var(--bg-surface);
}

.pipeline-steps strong {
  display: block;
  margin-bottom: 12px;
  font-size: 14px;
}

.pipeline-steps span {
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.7;
}

.dashboard-split {
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(300px, 0.55fr);
  gap: 24px;
}

.table-scroll {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

th,
td {
  padding: 13px 12px;
  border-bottom: 1px solid var(--border-light);
  text-align: left;
  white-space: nowrap;
}

th {
  color: var(--text-tertiary);
  font-size: 11px;
  font-weight: 700;
}

td {
  color: var(--text-secondary);
  font-variant-numeric: tabular-nums;
}

td:first-child {
  color: var(--text-primary);
}

td a {
  color: var(--text-primary);
  font-weight: 650;
}

td small {
  display: block;
  max-width: 280px;
  margin-top: 4px;
  overflow: hidden;
  color: var(--text-tertiary);
  text-overflow: ellipsis;
}

.usage-list {
  display: grid;
  margin: 0;
}

.usage-list div,
.issue-list li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 15px 0;
  border-bottom: 1px solid var(--border-light);
}

.usage-list dt,
.issue-list span {
  color: var(--text-secondary);
  font-size: 13px;
}

.usage-list dd,
.issue-list strong {
  margin: 0;
  font-weight: 760;
  font-variant-numeric: tabular-nums;
}

.danger {
  color: #b73535;
}

.knowledge-search form {
  display: grid;
  gap: 8px;
}

.knowledge-search form button {
  min-width: 108px;
}

.knowledge-results {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  margin-top: 24px;
}

.knowledge-results > p {
  grid-column: 1 / -1;
  margin: 0;
  color: var(--text-tertiary);
  font-size: 12px;
}

.knowledge-results article {
  padding: 18px;
  border-radius: var(--radius-md);
  background: var(--bg-secondary);
}

.knowledge-results article strong {
  font-size: 14px;
}

.knowledge-results article p {
  margin: 9px 0 0;
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.7;
}

.knowledge-results article a {
  display: inline-flex;
  margin-top: 12px;
  color: var(--text-primary);
  font-size: 12px;
  font-weight: 650;
}

.status-label {
  display: inline-flex;
  padding: 4px 8px;
  border-radius: 6px;
  background: var(--bg-secondary);
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 700;
}

.status-label[data-status="published"],
.status-label[data-status="success"] {
  background: var(--primary-soft);
  color: var(--text-primary);
}

.status-label[data-status="rejected"],
.status-label[data-status="failed"] {
  background: color-mix(in srgb, #c33 11%, transparent);
  color: #aa3030;
}

.run-list,
.issue-list {
  display: grid;
  margin: 0;
  padding: 0;
  list-style: none;
}

.run-list li {
  padding: 15px 0;
  border-bottom: 1px solid var(--border-light);
}

.run-list li > div {
  display: flex;
  justify-content: space-between;
  gap: 18px;
}

.run-list strong {
  font-size: 13px;
}

.run-list span,
.run-list small {
  color: var(--text-tertiary);
  font-size: 11px;
}

.run-list p {
  margin: 7px 0 0;
  color: var(--text-secondary);
  font-size: 12px;
}

.run-list small {
  display: block;
  margin-top: 6px;
  color: #aa3030;
  line-height: 1.5;
}

.empty-state {
  margin: 22px 0 0;
  color: var(--text-tertiary);
  font-size: 13px;
}

.error-panel {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 22px;
  border-radius: var(--radius-lg);
  background: var(--bg-surface);
}

.error-panel p {
  margin: 4px 0 0;
  color: var(--text-secondary);
}

.error-panel button {
  margin-left: auto;
}

.dashboard-skeleton {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 16px;
}

.dashboard-skeleton span {
  height: 130px;
  border-radius: var(--radius-lg);
  background: var(--bg-secondary);
  animation: pulse 1.4s ease-in-out infinite alternate;
}

.rotating {
  animation: rotate 0.8s linear infinite;
}

@keyframes pulse {
  to { opacity: 0.45; }
}

@keyframes rotate {
  to { transform: rotate(360deg); }
}

@media (max-width: 980px) {
  .metric-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .metric-grid article + article {
    border-left: 0;
  }

  .metric-grid article:nth-child(even) {
    border-left: 1px solid var(--border-light);
  }

  .pipeline-steps {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .dashboard-split {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 700px) {
  .geo-ops-page {
    width: min(100% - 28px, 1280px);
    padding-top: 30px;
  }

  .geo-ops-hero {
    grid-template-columns: 1fr;
    gap: 24px;
  }

  .pipeline-state {
    min-width: 0;
  }

  .access-panel {
    grid-template-columns: 1fr;
    padding: 24px;
  }

  .access-panel > svg {
    grid-row: auto;
  }

  .access-panel form {
    grid-column: 1;
  }

  .access-panel form > div,
  .knowledge-search form > div,
  .ops-toolbar,
  .toolbar-actions {
    align-items: stretch;
    flex-direction: column;
  }

  .ops-toolbar {
    padding: 14px;
  }

  .toolbar-actions > span {
    margin: 0;
  }

  .metric-grid,
  .pipeline-steps,
  .knowledge-results {
    grid-template-columns: 1fr;
  }

  .metric-grid article:nth-child(even) {
    border-left: 0;
  }

  .ops-section {
    padding: 22px 18px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .dashboard-skeleton span,
  .rotating {
    animation: none;
  }
}
</style>
