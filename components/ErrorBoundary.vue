<template>
  <div v-if="error" class="error-boundary">
    <div class="error-boundary__content">
      <PhWarningCircle :size="24" weight="regular" aria-hidden="true" />
      <span>{{ message }}</span>
      <button class="error-boundary__retry" @click="retry">重试</button>
    </div>
  </div>
  <slot v-else />
</template>

<script setup lang="ts">
import { PhWarningCircle } from "@phosphor-icons/vue";
defineProps<{
  message?: string;
}>();

const error = ref<Error | null>(null);

function retry() {
  error.value = null;
}

onErrorCaptured((err: Error) => {
  error.value = err;
  return false; // 阻止错误继续向上传播
});
</script>

<style scoped>
.error-boundary {
  padding: 24px;
  text-align: center;
}

.error-boundary__content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: var(--text-tertiary);
}

.error-boundary__retry {
  padding: 6px 16px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-light);
  background: var(--bg-surface);
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 13px;
}

.error-boundary__retry:hover {
  border-color: var(--primary);
  color: var(--primary);
}
</style>
