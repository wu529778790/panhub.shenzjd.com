<template>
  <Teleport to="body">
    <Transition name="gate">
      <div v-if="visible" class="gate-overlay" role="dialog" aria-modal="true" aria-labelledby="gate-title">
        <div class="gate-card">
          <h2 id="gate-title" class="gate-title">请输入访问密码</h2>
          <p class="gate-desc">搜索功能已加密保护，输入正确密码后可继续使用</p>
          <form @submit.prevent="onSubmit" class="gate-form">
            <input
              ref="inputRef"
              v-model="password"
              type="password"
              class="gate-input"
              placeholder="密码"
              autocomplete="current-password"
              aria-label="访问密码"
              @keydown.esc="password = ''" />
            <p v-if="error" class="gate-error">{{ error }}</p>
            <button type="submit" class="gate-btn" :disabled="submitting || !password.trim()">
              {{ submitting ? "验证中…" : "解锁" }}
            </button>
          </form>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
const props = defineProps<{
  show: boolean;
  error: string;
  submitting: boolean;
}>();

const emit = defineEmits<{
  (e: "unlock", password: string): void;
}>();

const password = ref("");
const inputRef = ref<HTMLInputElement | null>(null);

const visible = computed(() => props.show);

watch(visible, (v) => {
  if (v) {
    password.value = "";
    nextTick(() => inputRef.value?.focus());
  }
});

function onSubmit() {
  const p = password.value.trim();
  if (p) emit("unlock", p);
}
</script>

<style scoped>
.gate-overlay {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
}

.gate-card {
  width: 90%;
  max-width: 400px;
  padding: 28px 32px;
  background: var(--bg-primary, #fff);
  border-radius: var(--radius-lg, 16px);
  box-shadow: var(--shadow-xl, 0 20px 25px -5px rgba(0, 0, 0, 0.1));
  border: 1px solid var(--border-light, #e5e7eb);
}

.gate-title {
  margin: 0 0 8px;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-primary, #1f2937);
}

.gate-desc {
  margin: 0 0 20px;
  font-size: 0.9rem;
  color: var(--text-secondary, #6b7280);
}

.gate-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.gate-input {
  width: 100%;
  padding: 12px 16px;
  font-size: 1rem;
  border: 1px solid var(--border-medium, #d1d5db);
  border-radius: var(--radius-md, 12px);
  background: var(--bg-primary, #fff);
  color: var(--text-primary, #1f2937);
  outline: none;
  transition: border-color 0.15s;
}

.gate-input:focus {
  border-color: var(--primary, #0f766e);
}

.gate-input::placeholder {
  color: var(--text-tertiary, #9ca3af);
}

.gate-error {
  margin: 0;
  font-size: 0.875rem;
  color: var(--error, #ef4444);
}

.gate-btn {
  padding: 12px 24px;
  font-size: 1rem;
  font-weight: 600;
  color: #fff;
  background: var(--primary, #0f766e);
  border: none;
  border-radius: var(--radius-md, 12px);
  cursor: pointer;
  transition: opacity 0.15s, transform 0.1s;
}

.gate-btn:hover:not(:disabled) {
  opacity: 0.95;
  transform: translateY(-1px);
}

.gate-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.gate-enter-active,
.gate-leave-active {
  transition: opacity 0.2s ease;
}

.gate-enter-from,
.gate-leave-to {
  opacity: 0;
}

.gate-enter-active .gate-card,
.gate-leave-active .gate-card {
  transition: transform 0.2s ease;
}

.gate-enter-from .gate-card,
.gate-leave-to .gate-card {
  transform: scale(0.95) translateY(-10px);
}
</style>
