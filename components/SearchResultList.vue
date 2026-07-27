<template>
  <section class="resource-results" :aria-label="label">
    <ol class="resource-results__list">
      <li
        v-for="(item, index) in items"
        :key="item.id"
        class="resource-row"
        :class="{
          'resource-row--dead': healthInfo(item.url)?.status === 'dead',
          'resource-row--magnet': isMagnet(item),
        }"
        :style="{ '--result-index': String(Math.min(index, 9)) }">
        <div class="resource-row__platform">
          <PhMagnet v-if="isMagnet(item)" :size="22" aria-hidden="true" />
          <img v-else :src="platformInfo(item.type).icon" alt="" aria-hidden="true" />
          <span :title="isMagnet(item) ? magnetSourceTitle(item) : undefined">
            {{ isMagnet(item) ? magnetSourceLabel(item) : platformInfo(item.type).name }}
          </span>
        </div>

        <div class="resource-row__body">
          <div class="resource-row__title-line">
            <a
              class="resource-row__title"
              :href="item.url"
              target="_blank"
              :data-link-status="healthInfo(item.url)?.status || 'unknown'"
              rel="noopener noreferrer nofollow"
              @click="emit('open', item)">
              {{ analyses[item.id]?.normalizedTitle || item.title }}
              <PhArrowUpRight :size="16" aria-hidden="true" />
            </a>
            <span v-if="isAdultResource(item)" class="resource-row__adult">成人资源</span>
          </div>

          <div v-if="isMagnet(item) && hasTorrentMetadata(item)" class="resource-row__torrent">
            <dl class="torrent-metrics" aria-label="磁力资源数据">
              <div v-if="torrentSize(item)">
                <dt>大小</dt>
                <dd>{{ torrentSize(item) }}</dd>
              </div>
              <div
                v-if="item.metadata?.seeders !== undefined"
                :class="{ 'torrent-metric--active': (item.metadata.seeders || 0) > 0 }">
                <dt>做种</dt>
                <dd>{{ item.metadata.seeders }}</dd>
              </div>
              <div v-if="item.metadata?.leechers !== undefined">
                <dt>下载中</dt>
                <dd>{{ item.metadata.leechers }}</dd>
              </div>
              <div v-if="item.metadata?.completed">
                <dt>已完成</dt>
                <dd>{{ item.metadata.completed }}</dd>
              </div>
              <div v-if="item.metadata?.fileCount">
                <dt>文件</dt>
                <dd>{{ item.metadata.fileCount }}</dd>
              </div>
              <div v-if="item.metadata?.trackerCount">
                <dt>Tracker</dt>
                <dd>{{ item.metadata.trackerCount }}</dd>
              </div>
              <div v-if="item.metadata?.grabs">
                <dt>抓取</dt>
                <dd>{{ item.metadata.grabs }}</dd>
              </div>
            </dl>
            <div
              v-if="item.metadata?.verified || item.metadata?.category || item.metadata?.originSource || torrentAvailabilityLabel(item)"
              class="torrent-details">
              <span
                v-if="torrentAvailabilityLabel(item)"
                :class="`torrent-detail--${item.metadata?.availabilityStatus}`"
                :title="torrentAvailabilityTitle(item)">
                {{ torrentAvailabilityLabel(item) }}
              </span>
              <span v-if="item.metadata?.verified" title="索引源标记为已验证">
                <PhShieldCheck :size="14" aria-hidden="true" />
                已验证
              </span>
              <span v-if="item.metadata?.category">
                <PhTag :size="14" aria-hidden="true" />
                {{ item.metadata.category }}
              </span>
              <span v-if="item.metadata?.originSource">
                来源 {{ item.metadata.originSource }}
              </span>
            </div>
            <div v-if="torrentTags(item).length" class="torrent-tags" aria-label="资源规格">
              <span v-for="tag in torrentTags(item)" :key="tag">{{ tag }}</span>
            </div>
          </div>

          <div
            v-if="item.evaluation"
            class="resource-row__evaluation"
            :title="evaluationTitle(item)">
            <details class="evaluation-details">
              <summary class="evaluation-score" :class="evaluationTone(item)">
                综合 {{ item.evaluation.overall }}
              </summary>
              <dl class="evaluation-dimensions" aria-label="结果评估明细">
                <div v-for="dimension in evaluationDimensions(item)" :key="dimension.label">
                  <dt>{{ dimension.label }}</dt>
                  <dd>{{ dimension.value }}</dd>
                </div>
              </dl>
            </details>
            <span v-for="reason in item.evaluation.reasons" :key="reason">
              {{ reason }}
            </span>
          </div>

          <div v-if="analyses[item.id]" class="resource-row__analysis">
            <span class="quality-score" :title="`AI 置信度 ${analyses[item.id].confidence}`">
              {{ analyses[item.id].qualityScore }} 分
            </span>
            <span>{{ analyses[item.id].category }}</span>
            <span v-for="tag in analyses[item.id].tags" :key="tag">{{ tag }}</span>
            <span v-if="analyses[item.id].summary" class="analysis-summary">
              {{ analyses[item.id].summary }}
            </span>
          </div>
          <div v-else-if="aiLoading && pendingIds[item.id]" class="resource-row__ai-skeleton" aria-label="AI 优化中">
            <span /><span /><span />
          </div>

          <div class="resource-row__meta">
            <span v-if="healthInfo(item.url)?.status === 'dead'" class="health-label health-label--dead">
              <PhLinkBreak :size="14" aria-hidden="true" />
              已确认失效
            </span>
            <span v-else-if="healthInfo(item.url)?.status === 'password'" class="health-label">
              <PhKey :size="14" aria-hidden="true" />
              需要提取码
            </span>
            <span v-if="formatDate(item.datetime)">
              <PhCalendarBlank :size="14" aria-hidden="true" />
              {{ formatDate(item.datetime) }}
            </span>
            <span v-else-if="isMagnet(item) && formatDate(item.metadata?.lastSeenAt)">
              <PhCalendarBlank :size="14" aria-hidden="true" />
              活跃数据 {{ formatDate(item.metadata?.lastSeenAt) }}
            </span>
            <span v-if="item.password">
              <PhKey :size="14" aria-hidden="true" />
              提取码 {{ item.password }}
            </span>
          </div>

          <div v-if="item.alternate_links?.length" class="alternate-links">
            <button
              class="alternate-links__toggle"
              type="button"
              :aria-expanded="isAlternateExpanded(item.id)"
              @click="toggleAlternateLinks(item.id)">
              <PhLink :size="14" aria-hidden="true" />
              另有 {{ item.alternate_links.length }} 个备用链接
              <PhCaretDown
                :size="13"
                aria-hidden="true"
                :class="{ 'is-expanded': isAlternateExpanded(item.id) }" />
            </button>

            <ul v-if="isAlternateExpanded(item.id)" class="alternate-links__list">
              <li
                v-for="(alternative, alternativeIndex) in item.alternate_links"
                :key="alternative.url"
                :class="{ 'is-dead': healthInfo(alternative.url)?.status === 'dead' }">
                <a
                  :href="alternative.url"
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  @click="openAlternate(item, alternative)">
                  备用链接 {{ alternativeIndex + 1 }}
                  <span v-if="healthInfo(alternative.url)?.status === 'alive'">可用</span>
                  <span v-else-if="healthInfo(alternative.url)?.status === 'password'">需提取码</span>
                  <span v-else-if="healthInfo(alternative.url)?.status === 'dead'">已失效</span>
                  <PhArrowUpRight :size="14" aria-hidden="true" />
                </a>
                <span v-if="alternative.password" class="alternate-links__password">
                  提取码 {{ alternative.password }}
                </span>
                <div class="alternate-links__actions">
                  <button
                    v-if="reportable"
                    type="button"
                    :disabled="reportedUrls[alternative.url] || healthInfo(alternative.url)?.status === 'dead'"
                    :aria-label="reportedUrls[alternative.url] ? '已反馈失效' : '反馈备用链接失效'"
                    @click="reportInvalid(alternative.url)">
                    <PhLinkBreak :size="14" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    :aria-label="copiedUrl === alternative.url ? '已复制备用链接' : '复制备用链接'"
                    @click="copy(alternative.url)">
                    <PhCheck v-if="copiedUrl === alternative.url" :size="14" weight="bold" aria-hidden="true" />
                    <PhCopy v-else :size="14" aria-hidden="true" />
                  </button>
                </div>
              </li>
            </ul>
          </div>
        </div>

        <div class="resource-row__actions">
          <button
            v-if="reportable"
            type="button"
            :class="{ active: reportedUrls[item.url] }"
            :disabled="reportedUrls[item.url] || healthInfo(item.url)?.status === 'dead'"
            :aria-label="healthInfo(item.url)?.status === 'dead' ? '链接已确认失效' : reportedUrls[item.url] ? '已反馈失效' : '反馈链接失效'"
            title="反馈链接失效"
            @click="reportInvalid(item.url)">
            <PhLinkBreak :size="17" aria-hidden="true" />
          </button>
          <button
            type="button"
            :class="{ active: isFavorite(item.url) }"
            :aria-label="isFavorite(item.url) ? '取消收藏' : '收藏资源'"
            @click="toggleFavorite(item)">
            <PhBookmarkSimple
              :size="17"
              :weight="isFavorite(item.url) ? 'fill' : 'regular'"
              aria-hidden="true" />
          </button>
          <button
            type="button"
            :aria-label="copiedUrl === item.url ? '已复制' : '复制链接'"
            @click="copy(item.url)">
            <PhCheck v-if="copiedUrl === item.url" :size="17" weight="bold" aria-hidden="true" />
            <PhCopy v-else :size="17" aria-hidden="true" />
          </button>
        </div>
      </li>
    </ol>
  </section>
</template>

<script setup lang="ts">
import {
  PhArrowUpRight,
  PhBookmarkSimple,
  PhCalendarBlank,
  PhCaretDown,
  PhCheck,
  PhCopy,
  PhKey,
  PhLink,
  PhLinkBreak,
  PhMagnet,
  PhShieldCheck,
  PhTag,
} from "@phosphor-icons/vue";
import { PLATFORM_INFO } from "~/config/plugins";
import type { AiResourceAnalysis, MergedLink, SearchViewItem } from "~/types/search";
import type { LinkHealthInfo } from "~/utils/linkHealth";
import { linkHealthKey } from "~/utils/linkHealth";
import {
  formatTorrentSize,
  isAdultContent,
  torrentDisplayTags,
} from "~/utils/torrentMetadata";

const props = withDefaults(defineProps<{
  items: SearchViewItem[];
  analyses: Record<string, AiResourceAnalysis>;
  aiLoading: boolean;
  pendingIds: Record<string, true>;
  healthByUrl: Record<string, LinkHealthInfo>;
  reportable?: boolean;
  label?: string;
}>(), {
  reportable: true,
  label: "资源列表",
});

const emit = defineEmits<{
  copy: [url: string];
  reportInvalid: [url: string];
  open: [item: SearchViewItem];
}>();
const { isFavorite, toggleFavorite } = useFavorites();
const copiedUrl = ref("");
const reportedUrls = ref<Record<string, true>>({});
const expandedAlternateIds = ref<Set<string>>(new Set());
let copyTimer: ReturnType<typeof setTimeout> | undefined;

function platformInfo(type: string) {
  if (type === "magnet") {
    return { name: "磁力链接", color: "#6b7280", icon: "" };
  }
  return (
    PLATFORM_INFO[type] || {
      name: type || "其他",
      color: "#6b7280",
      icon: "/icons/others.png",
    }
  );
}

function isMagnet(item: SearchViewItem) {
  return item.type === "magnet" || /^magnet:\?/i.test(item.url);
}

function isAdultResource(item: SearchViewItem): boolean {
  return item.metadata?.adult === true || isAdultContent(
    item.title,
    `${item.category || ""} ${item.metadata?.category || ""}`
  );
}

function magnetSources(item: SearchViewItem): string[] {
  return item.metadata?.sources?.filter(Boolean) || (item.source ? [item.source] : []);
}

function magnetSourceLabel(item: SearchViewItem): string {
  const sources = magnetSources(item);
  if (sources.length > 1) return `${sources.length} 个来源`;
  return sources[0] || "磁力索引";
}

function magnetSourceTitle(item: SearchViewItem): string {
  return magnetSources(item).join("、") || "磁力索引";
}

function torrentSize(item: SearchViewItem): string {
  return item.metadata?.size || formatTorrentSize(item.metadata?.sizeBytes);
}

function torrentTags(item: SearchViewItem): string[] {
  return torrentDisplayTags(item.metadata, 5);
}

function torrentAvailabilityLabel(item: SearchViewItem): string {
  switch (item.metadata?.availabilityStatus) {
    case "active": return "近期活跃";
    case "cold": return "暂无做种";
    case "stale": return "数据较旧";
    case "risky": return "风险较高";
    default: return "";
  }
}

function torrentAvailabilityTitle(item: SearchViewItem): string {
  const score = item.metadata?.availabilityScore;
  return score === undefined
    ? torrentAvailabilityLabel(item)
    : `${torrentAvailabilityLabel(item)}，可用度 ${score} 分`;
}

function hasTorrentMetadata(item: SearchViewItem): boolean {
  const metadata = item.metadata;
  return Boolean(
    torrentSize(item)
    || metadata?.seeders !== undefined
    || metadata?.leechers !== undefined
    || metadata?.fileCount
    || metadata?.verified
    || metadata?.category
    || torrentTags(item).length
  );
}

function evaluationTone(item: SearchViewItem): string {
  const score = item.evaluation?.overall || 0;
  if (score >= 78) return "evaluation-score--high";
  if (score >= 58) return "evaluation-score--medium";
  return "evaluation-score--low";
}

function evaluationTitle(item: SearchViewItem): string {
  const evaluation = item.evaluation;
  if (!evaluation) return "";
  return [
    `相关 ${evaluation.relevance}`,
    `可用 ${evaluation.availability}`,
    `质量 ${evaluation.quality}`,
    `来源 ${evaluation.sourceConfidence}`,
    `时效 ${evaluation.freshness}`,
    `风险 ${evaluation.risk}`,
  ].join("，");
}

function evaluationDimensions(item: SearchViewItem) {
  const evaluation = item.evaluation;
  if (!evaluation) return [];
  return [
    { label: "相关", value: evaluation.relevance },
    { label: "可用", value: evaluation.availability },
    { label: "质量", value: evaluation.quality },
    { label: "来源", value: evaluation.sourceConfidence },
    { label: "时效", value: evaluation.freshness },
    { label: "风险", value: evaluation.risk },
  ];
}

function healthInfo(url: string) {
  return props.healthByUrl[linkHealthKey(url)];
}

function reportInvalid(url: string) {
  reportedUrls.value = { ...reportedUrls.value, [url]: true };
  emit("reportInvalid", url);
}

function isAlternateExpanded(id: string): boolean {
  return expandedAlternateIds.value.has(id);
}

function toggleAlternateLinks(id: string) {
  const next = new Set(expandedAlternateIds.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  expandedAlternateIds.value = next;
}

function openAlternate(parent: SearchViewItem, alternative: MergedLink) {
  emit("open", {
    ...parent,
    ...alternative,
    id: `${parent.id}:alternate`,
    title: alternative.note || parent.title,
  });
}

function copy(url: string) {
  emit("copy", url);
  copiedUrl.value = url;
  if (copyTimer) clearTimeout(copyTimer);
  copyTimer = setTimeout(() => (copiedUrl.value = ""), 1500);
}

function formatDate(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const days = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  if (days <= 0) return "今天";
  if (days === 1) return "昨天";
  if (days < 7) return `${days} 天前`;
  if (days < 365) return `${Math.max(1, Math.floor(days / 30))} 个月前`;
  return date.toLocaleDateString("zh-CN", { year: "numeric", month: "short" });
}

onBeforeUnmount(() => {
  if (copyTimer) clearTimeout(copyTimer);
});
</script>

<style scoped>
.resource-results {
  overflow: hidden;
  border: 1px solid var(--border-light);
  border-radius: var(--radius-lg);
  background: var(--bg-surface);
}

.resource-results__list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.resource-row {
  display: grid;
  grid-template-columns: 112px minmax(0, 1fr) auto;
  gap: 18px;
  padding: 20px 22px;
  align-items: start;
  animation: resultRowIn 480ms var(--ease-glide) both;
  animation-delay: calc(var(--result-index, 0) * 34ms);
  transition: background var(--transition-fast), transform 360ms var(--ease-spring);
}

.resource-row + .resource-row {
  border-top: 1px solid var(--border-light);
}

.resource-row:hover {
  background: var(--bg-hover);
  transform: translateX(2px);
}

.resource-row--dead {
  opacity: 0.72;
}

.resource-row--dead .resource-row__title {
  text-decoration: line-through;
  text-decoration-thickness: 1px;
}

.resource-row__platform {
  display: flex;
  align-items: center;
  gap: 9px;
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 650;
}

.resource-row__platform img {
  width: 24px;
  height: 24px;
  object-fit: contain;
}

.resource-row__body {
  min-width: 0;
}

.resource-row__title-line {
  display: flex;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 7px 9px;
}

.resource-row__title {
  display: inline-flex;
  max-width: 100%;
  align-items: flex-start;
  gap: 7px;
  color: var(--text-primary);
  font-size: 15px;
  font-weight: 720;
  line-height: 1.55;
  overflow-wrap: anywhere;
}

.resource-row__adult {
  flex: 0 0 auto;
  margin-top: 2px;
  padding: 3px 7px;
  border: 1px solid var(--border-medium);
  border-radius: 6px;
  background: var(--bg-secondary);
  color: var(--text-secondary);
  font-size: 10px;
  font-weight: 700;
  line-height: 1.35;
}

.resource-row__title svg {
  flex: 0 0 auto;
  margin-top: 4px;
  color: var(--text-tertiary);
  transition: color var(--transition-fast), transform var(--transition-fast);
}

.resource-row__title:hover svg {
  color: var(--primary-strong);
  transform: translate(2px, -2px);
}

.resource-row__analysis,
.resource-row__evaluation,
.resource-row__meta {
  display: flex;
  margin-top: 10px;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px 12px;
  color: var(--text-tertiary);
  font-size: 11px;
}

.resource-row__evaluation {
  display: flex;
  margin-top: 10px;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px 11px;
  color: var(--text-tertiary);
  font-size: 11px;
}

.resource-row__evaluation > span:not(.evaluation-score) {
  color: var(--text-secondary);
}

.evaluation-details {
  flex: 0 0 auto;
}

.evaluation-details[open] {
  flex-basis: 100%;
}

.evaluation-score {
  display: inline-flex;
  align-items: center;
  padding: 3px 7px;
  border: 1px solid var(--border-light);
  border-radius: 6px;
  background: var(--bg-secondary);
  color: var(--text-secondary);
  font-weight: 760;
  font-variant-numeric: tabular-nums;
  cursor: pointer;
  list-style: none;
}

.evaluation-score::-webkit-details-marker {
  display: none;
}

.evaluation-score:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

.evaluation-dimensions {
  display: flex;
  margin: 8px 0 2px;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px 14px;
  padding: 8px 10px;
  border-left: 2px solid var(--primary);
  background: var(--bg-surface-subtle);
}

.evaluation-dimensions > div {
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
}

.evaluation-dimensions dt {
  color: var(--text-tertiary);
  font-size: 10px;
}

.evaluation-dimensions dd {
  margin: 0;
  color: var(--text-primary);
  font-size: 11px;
  font-weight: 760;
  font-variant-numeric: tabular-nums;
}

.evaluation-score--high {
  border-color: color-mix(in srgb, var(--primary) 28%, var(--border-light));
  background: var(--primary-soft);
  color: var(--primary-ink);
}

.evaluation-score--low {
  color: var(--warning);
}

.resource-row__torrent {
  display: grid;
  gap: 9px;
  margin-top: 11px;
}

.torrent-metrics,
.torrent-details,
.torrent-tags {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
}

.torrent-metrics {
  margin: 0;
  color: var(--text-tertiary);
  font-variant-numeric: tabular-nums;
}

.torrent-metrics > div {
  min-width: 66px;
  padding: 0 14px;
  border-left: 1px solid var(--border-light);
}

.torrent-metrics > div:first-child {
  padding-left: 0;
  border-left: 0;
}

.torrent-metrics dt {
  margin-bottom: 2px;
  color: var(--text-tertiary);
  font-size: 9px;
  font-weight: 650;
}

.torrent-metrics dd {
  margin: 0;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 720;
  line-height: 1.3;
}

.torrent-metrics .torrent-metric--active dd {
  color: var(--primary-strong);
}

.torrent-details {
  gap: 6px 12px;
  color: var(--text-tertiary);
  font-size: 10px;
}

.torrent-details span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.torrent-details .torrent-detail--active {
  color: var(--primary-strong);
  font-weight: 720;
}

.torrent-details .torrent-detail--cold,
.torrent-details .torrent-detail--stale {
  color: var(--warning);
  font-weight: 700;
}

.torrent-details .torrent-detail--risky {
  color: var(--error);
  font-weight: 700;
}

.torrent-tags {
  gap: 6px;
}

.torrent-tags span {
  padding: 3px 7px;
  border-radius: 6px;
  background: var(--bg-secondary);
  color: var(--text-secondary);
  font-size: 10px;
  font-weight: 680;
  line-height: 1.3;
}

.resource-row__analysis > span:not(.analysis-summary) {
  padding: 3px 7px;
  border-radius: 6px;
  background: var(--bg-secondary);
}

.resource-row__analysis .quality-score {
  background: var(--primary-soft);
  color: var(--primary-ink);
  font-weight: 760;
  font-variant-numeric: tabular-nums;
}

.analysis-summary {
  color: var(--text-secondary);
}

.resource-row__meta span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.resource-row__meta .health-label {
  color: var(--text-secondary);
  font-weight: 650;
}

.resource-row__meta .health-label--dead {
  color: var(--danger, #b9382f);
}

.alternate-links {
  margin-top: 11px;
}

.alternate-links__toggle {
  display: inline-flex;
  min-height: 30px;
  align-items: center;
  gap: 6px;
  padding: 0 9px;
  border: 1px solid var(--border-light);
  border-radius: 8px;
  background: var(--bg-secondary);
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 680;
  transition: border-color var(--transition-fast), color var(--transition-fast), transform var(--transition-fast);
}

.alternate-links__toggle:hover {
  border-color: var(--border-medium);
  color: var(--primary-strong);
}

.alternate-links__toggle:active {
  transform: translateY(1px);
}

.alternate-links__toggle svg:last-child {
  transition: transform var(--transition-fast);
}

.alternate-links__toggle svg.is-expanded {
  transform: rotate(180deg);
}

.alternate-links__list {
  display: grid;
  gap: 7px;
  margin: 9px 0 0;
  padding: 0;
  list-style: none;
}

.alternate-links__list li {
  display: flex;
  min-height: 38px;
  align-items: center;
  gap: 9px;
  padding: 6px 8px 6px 10px;
  border-left: 2px solid var(--border-medium);
  background: var(--bg-surface-subtle);
}

.alternate-links__list li.is-dead {
  opacity: 0.62;
}

.alternate-links__list li > a {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: 6px;
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 680;
}

.alternate-links__list li > a span {
  color: var(--text-tertiary);
  font-size: 10px;
  font-weight: 600;
}

.alternate-links__password {
  color: var(--text-tertiary);
  font-size: 10px;
}

.alternate-links__actions {
  display: flex;
  margin-left: auto;
  gap: 4px;
}

.alternate-links__actions button {
  display: grid;
  width: 28px;
  height: 28px;
  place-items: center;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: var(--text-tertiary);
}

.alternate-links__actions button:hover {
  background: var(--bg-active);
  color: var(--primary-strong);
}

.alternate-links__actions button:disabled {
  opacity: 0.45;
}

.resource-row__actions {
  display: flex;
  gap: 6px;
}

.resource-row__actions button {
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  border: 1px solid var(--border-light);
  border-radius: 9px;
  background: var(--bg-btn);
  color: var(--text-secondary);
  transition: background var(--transition-fast), color var(--transition-fast), border-color var(--transition-fast), transform 320ms var(--ease-spring);
}

.resource-row__actions button:hover,
.resource-row__actions button.active {
  border-color: var(--border-medium);
  background: var(--bg-active);
  color: var(--primary-strong);
  transform: translateY(-2px) scale(1.04);
}

.resource-row__actions button:disabled {
  cursor: default;
  opacity: 0.58;
}

.resource-row__ai-skeleton {
  display: flex;
  margin-top: 10px;
  gap: 7px;
}

.resource-row__ai-skeleton span {
  width: 48px;
  height: 18px;
  border-radius: 6px;
  background: var(--bg-skeleton);
  animation: pulse 1.3s ease-in-out infinite;
}

.resource-row__ai-skeleton span:nth-child(2) { width: 64px; }
.resource-row__ai-skeleton span:nth-child(3) { width: 84px; }

@keyframes resultRowIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 720px) {
  .resource-row {
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 12px;
    padding: 16px;
  }

  .resource-row__platform {
    grid-column: 1 / -1;
  }

  .resource-row__actions {
    grid-column: 2;
    grid-row: 2;
  }

  .alternate-links__list li {
    align-items: flex-start;
    flex-wrap: wrap;
  }

  .alternate-links__actions {
    margin-left: auto;
  }
}
</style>
