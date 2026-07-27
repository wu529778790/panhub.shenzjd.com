<template>
  <section class="search" :aria-label="searchLabel">
    <div class="search-container">
      <label class="search-label" for="resource-search">搜索关键词</label>
      <div
        class="search-box"
        data-theme-part="search-box"
        :class="{ focused: isFocused, loading, paused }">
        <PhMagnifyingGlass class="search-icon" :size="24" weight="regular" aria-hidden="true" />

        <input
          id="resource-search"
          ref="inputEl"
          :value="modelValue"
          :placeholder="placeholder"
          name="kw"
          autocomplete="off"
          autocorrect="off"
          autocapitalize="off"
          spellcheck="false"
          class="search-input"
          aria-describedby="match-mode-help"
          @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
          @focus="isFocused = true"
          @blur="isFocused = false"
          @keyup.enter="handleSearch" />

        <div class="search-actions">
          <kbd v-if="!modelValue && !loading" class="shortcut-hint">{{ shortcutLabel }}</kbd>

          <button
            v-if="searched"
            class="action-button action-button--quiet reset-button"
            type="button"
            @click="
              $emit('update:modelValue', '');
              $emit('reset');
            "
            aria-label="重置搜索"
            title="重置搜索">
            <PhArrowCounterClockwise :size="18" aria-hidden="true" />
            <span>重置</span>
          </button>

          <button
            v-else-if="modelValue && !loading"
            class="clear-button"
            type="button"
            @click="$emit('update:modelValue', '')"
            aria-label="清空关键词"
            title="清空关键词">
            <PhX :size="18" aria-hidden="true" />
          </button>

          <button
            v-if="loading && !paused"
            class="action-button action-button--quiet"
            type="button"
            @click="$emit('pause')"
            aria-label="暂停搜索">
            <PhPause :size="17" weight="fill" aria-hidden="true" />
            <span>暂停</span>
          </button>

          <button
            v-if="loading && paused"
            class="action-button action-button--primary"
            type="button"
            @click="$emit('continue')"
            aria-label="继续搜索">
            <PhPlay :size="17" weight="fill" aria-hidden="true" />
            <span>继续</span>
          </button>

          <button
            v-else-if="!loading"
            class="action-button action-button--primary"
            type="button"
            :disabled="!modelValue.trim()"
            aria-label="开始搜索"
            @click="handleSearch">
            <span>开始搜索</span>
            <PhArrowRight :size="18" weight="bold" aria-hidden="true" />
          </button>
        </div>

        <span v-if="loading && !paused" class="search-progress" aria-hidden="true" />
      </div>

      <fieldset class="match-mode" :disabled="loading">
        <legend>匹配方式</legend>
        <div class="match-mode__options" role="group" aria-label="选择关键词匹配方式">
          <button
            type="button"
            :class="{ active: matchMode === 'fuzzy' }"
            :aria-pressed="matchMode === 'fuzzy'"
            @click="selectMatchMode('fuzzy')">
            模糊搜索
          </button>
          <button
            type="button"
            :class="{ active: matchMode === 'exact' }"
            :aria-pressed="matchMode === 'exact'"
            @click="selectMatchMode('exact')">
            精确搜索
          </button>
        </div>
        <p id="match-mode-help">
          {{ matchMode === "exact"
            ? "完整关键词必须出现在标题、正文或标签中"
            : "自动尝试相近写法，优先找到更多结果" }}
        </p>
      </fieldset>
    </div>
  </section>
</template>

<script setup lang="ts">
import {
  PhArrowCounterClockwise,
  PhArrowRight,
  PhMagnifyingGlass,
  PhPause,
  PhPlay,
  PhX,
} from "@phosphor-icons/vue";
import type { SearchMatchMode } from "~/types/search";

const props = withDefaults(defineProps<{
  modelValue: string;
  matchMode: SearchMatchMode;
  loading: boolean;
  paused: boolean;
  placeholder: string;
  searched: boolean;
  searchLabel?: string;
}>(), {
  searchLabel: "资源搜索",
});

const emit = defineEmits<{
  (event: "update:modelValue", value: string): void;
  (event: "update:matchMode", value: SearchMatchMode): void;
  (event: "search" | "reset" | "pause" | "continue"): void;
}>();
const isFocused = ref(false);
const inputEl = ref<HTMLInputElement | null>(null);
const shortcutLabel = ref("Ctrl K");

function selectMatchMode(mode: SearchMatchMode) {
  if (props.loading || props.matchMode === mode) return;
  emit("update:matchMode", mode);
}

function handleSearch() {
  if (
    typeof window !== "undefined" &&
    document.activeElement instanceof HTMLInputElement
  ) {
    document.activeElement.blur();
  }

  setTimeout(() => emit("search"), 50);
}

function onKeyDownGlobal(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
    e.preventDefault();
    inputEl.value?.focus();
    inputEl.value?.select();
  }
}

onMounted(() => {
  if (/Mac|iPhone|iPad|iPod/i.test(navigator.userAgent)) shortcutLabel.value = "⌘ K";
  document.addEventListener("keydown", onKeyDownGlobal);
  if (window.matchMedia("(pointer: fine)").matches) {
    requestAnimationFrame(() => setTimeout(() => inputEl.value?.focus(), 100));
  }
});

onBeforeUnmount(() => document.removeEventListener("keydown", onKeyDownGlobal));
</script>

<style scoped>
.search {
  width: 100%;
}

.search-container {
  width: 100%;
}

.search-label {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.match-mode {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 12px;
  margin: 10px 2px 0;
  padding: 0;
  border: 0;
}

.match-mode legend {
  flex: 0 0 auto;
  padding: 0;
  color: var(--text-tertiary);
  font-size: 12px;
  font-weight: 650;
}

.match-mode__options {
  display: inline-flex;
  flex: 0 0 auto;
  gap: 3px;
  padding: 3px;
  border: 1px solid var(--border-light);
  border-radius: 10px;
  background: var(--bg-secondary);
}

.match-mode__options button {
  min-height: 32px;
  padding: 0 11px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 680;
  white-space: nowrap;
  transition: background var(--transition-fast), color var(--transition-fast), box-shadow var(--transition-fast), transform var(--transition-fast);
}

.match-mode__options button:hover:not(:disabled) {
  color: var(--text-primary);
}

.match-mode__options button:active:not(:disabled) {
  transform: translateY(1px);
}

.match-mode__options button.active {
  background: var(--bg-surface);
  color: var(--text-primary);
  box-shadow: var(--shadow-sm);
}

.match-mode__options button:focus-visible {
  outline: 2px solid var(--primary-strong);
  outline-offset: 2px;
}

.match-mode:disabled {
  opacity: 0.62;
}

.match-mode p {
  min-width: 0;
  margin: 0;
  overflow: hidden;
  color: var(--text-tertiary);
  font-size: 12px;
  line-height: 1.5;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.search-box {
  position: relative;
  display: grid;
  min-height: 68px;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 14px;
  padding: 8px 8px 8px 20px;
  overflow: hidden;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-lg);
  background: var(--bg-input);
  box-shadow: var(--shadow-sm);
  transition: border-color var(--transition-normal), box-shadow var(--transition-normal), background var(--transition-normal), transform 420ms var(--ease-spring);
}

.search-box.focused {
  border-color: color-mix(in srgb, var(--primary-strong) 72%, var(--border-strong));
  box-shadow: 0 0 0 4px var(--primary-glow), var(--shadow-md);
  transform: translateY(-1px);
}

.search-box.loading {
  border-color: color-mix(in srgb, var(--primary) 56%, var(--border-medium));
}

.search-icon {
  color: var(--text-tertiary);
  transition: color var(--transition-fast), transform 420ms var(--ease-spring);
}

.search-box.focused .search-icon {
  color: var(--primary-strong);
  transform: scale(1.1) rotate(-7deg);
}

.search-input {
  width: 100%;
  min-width: 0;
  height: 50px;
  padding: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--text-primary);
  font-size: clamp(16px, 1.4vw, 18px);
  font-weight: 520;
}

.search-input::placeholder {
  color: var(--text-tertiary);
  opacity: 1;
}

.search-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.shortcut-hint {
  display: inline-flex;
  min-width: 46px;
  min-height: 28px;
  align-items: center;
  justify-content: center;
  padding: 0 7px;
  border: 1px solid var(--border-light);
  border-bottom-color: var(--border-medium);
  border-radius: 7px;
  background: var(--bg-surface-subtle);
  color: var(--text-tertiary);
  font-family: inherit;
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
  box-shadow: 0 2px 0 var(--border-light);
}

.action-button,
.clear-button {
  display: inline-flex;
  min-height: 50px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: var(--radius-md);
  transition: background var(--transition-fast), color var(--transition-fast), border-color var(--transition-fast), opacity var(--transition-fast), transform 360ms var(--ease-spring);
}

.action-button {
  min-width: 124px;
  padding: 0 20px;
  border: 1px solid transparent;
  font-size: 15px;
  font-weight: 760;
  white-space: nowrap;
}

.action-button--primary {
  background: var(--primary);
  color: var(--primary-ink);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.36);
}

.action-button--primary:hover:not(:disabled) {
  background: var(--primary-strong);
  transform: translateY(-1px) scale(1.015);
}

.action-button--primary:hover:not(:disabled) svg {
  transform: translateX(3px);
}

.action-button--primary svg {
  transition: transform 360ms var(--ease-spring);
}

.action-button--primary:disabled {
  opacity: 0.38;
}

.action-button--quiet {
  min-width: auto;
  padding: 0 14px;
  border-color: var(--border-light);
  background: var(--bg-btn);
  color: var(--text-secondary);
}

.action-button--quiet:hover {
  border-color: var(--border-medium);
  background: var(--bg-btn-hover);
  color: var(--text-primary);
}

.clear-button {
  width: 44px;
  min-width: 44px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--text-tertiary);
}

.clear-button:hover {
  background: var(--bg-btn-hover);
  color: var(--text-primary);
}

.search-progress {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--primary), transparent);
  transform: translateX(-100%);
  animation: searchProgress 1.4s ease-in-out infinite;
}

@keyframes searchProgress {
  50%, 100% { transform: translateX(100%); }
}

@media (max-width: 640px) {
  .search-box {
    min-height: 62px;
    gap: 10px;
    padding: 7px 7px 7px 15px;
  }

  .search-icon {
    width: 21px;
    height: 21px;
  }

  .search-input {
    height: 46px;
    font-size: 16px;
  }

  .action-button {
    min-width: 50px;
    width: 50px;
    min-height: 48px;
    padding: 0;
  }

  .action-button span {
    display: none;
  }

  .shortcut-hint {
    display: none;
  }

  .match-mode {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: 8px 10px;
    margin-top: 9px;
  }

  .match-mode__options {
    justify-self: start;
  }

  .match-mode p {
    grid-column: 1 / -1;
    white-space: normal;
  }
}
</style>
