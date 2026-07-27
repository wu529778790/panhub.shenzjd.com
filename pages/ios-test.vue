<template>
  <div class="ios-test">
    <h1>iOS 兼容性测试页面</h1>

    <div class="test-section">
      <h2>搜索框测试</h2>
      <div class="search-test">
        <input
          ref="testInput"
          v-model="testKeyword"
          placeholder="请输入搜索关键词"
          class="test-input"
          @keyup.enter="testSearch"
          @focus="logEvent('focus')"
          @blur="logEvent('blur')"
          @input="logEvent('input')"
          @touchstart="logEvent('touchstart')"
          @touchend="logEvent('touchend')" />
        <button
          class="test-btn"
          @click="testSearch"
          @touchstart="logEvent('btn-touchstart')"
          @touchend="logEvent('btn-touchend')">
          测试搜索
        </button>
      </div>
    </div>

    <div class="test-section">
      <h2>事件日志</h2>
      <div class="event-log">
        <div v-for="(event, index) in eventLog" :key="index" class="event-item">
          <span class="event-time">{{ event.time }}</span>
          <span class="event-name">{{ event.name }}</span>
          <span class="event-details">{{ event.details }}</span>
        </div>
      </div>
      <button @click="clearLog" class="clear-btn">清空日志</button>
    </div>

    <div class="test-section">
      <h2>设备信息</h2>
      <div class="device-info">
        <p><strong>User Agent:</strong> {{ userAgent }}</p>
        <p><strong>平台:</strong> {{ platform }}</p>
        <p><strong>iOS版本:</strong> {{ iosVersion }}</p>
        <p><strong>Safari版本:</strong> {{ safariVersion }}</p>
        <p><strong>屏幕尺寸:</strong> {{ screenSize }}</p>
        <p><strong>视口尺寸:</strong> {{ viewportSize }}</p>
        <p><strong>触摸支持:</strong> {{ touchSupport }}</p>
      </div>
    </div>

    <div class="test-section">
      <h2>功能测试</h2>
      <div class="function-tests">
        <button @click="testFocus" class="test-btn">测试焦点</button>
        <button @click="testBlur" class="test-btn">测试失焦</button>
        <button @click="testInputValue" class="test-btn">测试输入</button>
        <button @click="testSearch" class="test-btn">测试搜索</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
useSeoMeta({
  title: "iOS 兼容性测试",
  robots: "noindex,nofollow",
});

const testKeyword = ref("");
const testInput = ref<HTMLInputElement | null>(null);
const eventLog = ref<Array<{ time: string; name: string; details: string }>>(
  []
);

// 设备信息
const userAgent = ref("");
const platform = ref("");
const iosVersion = ref("");
const safariVersion = ref("");
const screenSize = ref("");
const viewportSize = ref("");
const touchSupport = ref("");

// 记录事件
function logEvent(eventName: string, details: string = "") {
  const time = new Date().toLocaleTimeString();
  eventLog.value.unshift({
    time,
    name: eventName,
    details,
  });

  // 限制日志数量
  if (eventLog.value.length > 20) {
    eventLog.value = eventLog.value.slice(0, 20);
  }
}

// 清空日志
function clearLog() {
  eventLog.value = [];
}

// 测试焦点
function testFocus() {
  testInput.value?.focus();
  logEvent("manual-focus", "手动触发焦点");
}

// 测试失焦
function testBlur() {
  testInput.value?.blur();
  logEvent("manual-blur", "手动触发失焦");
}

// 测试输入
function testInputValue() {
  testKeyword.value = "测试关键词 " + Date.now();
  logEvent("manual-input", "手动设置输入值");
}

// 测试搜索
function testSearch() {
  if (!testKeyword.value) {
    logEvent("search-error", "搜索关键词为空");
    return;
  }

  logEvent("search-start", `开始搜索: ${testKeyword.value}`);

  // 模拟搜索延迟
  setTimeout(() => {
    logEvent("search-complete", `搜索完成: ${testKeyword.value}`);
  }, 1000);
}

// 获取设备信息
function getDeviceInfo() {
  if (typeof window === "undefined") return;

  userAgent.value = navigator.userAgent;
  platform.value = navigator.platform;

  // 检测iOS版本
  const iosMatch = navigator.userAgent.match(/OS (\d+)_(\d+)_?(\d+)?/);
  if (iosMatch) {
    iosVersion.value = `${iosMatch[1]}.${iosMatch[2]}${
      iosMatch[3] ? "." + iosMatch[3] : ""
    }`;
  } else {
    iosVersion.value = "非iOS设备";
  }

  // 检测Safari版本
  const safariMatch = navigator.userAgent.match(/Version\/(\d+\.\d+)/);
  if (safariMatch && safariMatch[1]) {
    safariVersion.value = safariMatch[1];
  } else {
    safariVersion.value = "非Safari浏览器";
  }

  // 屏幕信息
  screenSize.value = `${screen.width} x ${screen.height}`;
  viewportSize.value = `${window.innerWidth} x ${window.innerHeight}`;

  // 触摸支持
  touchSupport.value = "ontouchstart" in window ? "支持" : "不支持";
}

onMounted(() => {
  getDeviceInfo();

  // 监听窗口大小变化
  window.addEventListener("resize", () => {
    viewportSize.value = `${window.innerWidth} x ${window.innerHeight}`;
  });

  logEvent("page-loaded", "页面加载完成");
});
</script>

<style scoped>
.ios-test {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

.test-section {
  margin-bottom: 30px;
  padding: 20px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #fff;
}

.test-section h2 {
  margin-top: 0;
  margin-bottom: 15px;
  color: #111;
  font-size: 18px;
}

.search-test {
  display: flex;
  gap: 10px;
  align-items: center;
}

.test-input {
  flex: 1;
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 16px;
  /* iOS Safari兼容性 */
  -webkit-appearance: none;
  -webkit-border-radius: 8px;
  -webkit-text-size-adjust: 100%;
  -webkit-tap-highlight-color: transparent;
}

.test-btn {
  padding: 12px 16px;
  border: 1px solid #e5e7eb;
  background: #111;
  color: #fff;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  /* iOS Safari兼容性 */
  -webkit-appearance: none;
  -webkit-tap-highlight-color: transparent;
  -webkit-user-select: none;
  user-select: none;
  min-height: 44px;
  min-width: 44px;
}

.test-btn:hover {
  background: #000;
}

.event-log {
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 10px;
  background: #f9fafb;
  font-family: "Monaco", "Menlo", monospace;
  font-size: 12px;
}

.event-item {
  display: flex;
  gap: 10px;
  margin-bottom: 5px;
  padding: 5px;
  border-bottom: 1px solid #e5e7eb;
}

.event-time {
  color: #666;
  min-width: 80px;
}

.event-name {
  color: #2563eb;
  font-weight: bold;
  min-width: 120px;
}

.event-details {
  color: #111;
  flex: 1;
}

.clear-btn {
  margin-top: 10px;
  padding: 8px 12px;
  border: 1px solid #e5e7eb;
  background: #fff;
  color: #111;
  border-radius: 6px;
  cursor: pointer;
}

.device-info p {
  margin: 8px 0;
  font-size: 14px;
}

.device-info strong {
  color: #111;
  min-width: 100px;
  display: inline-block;
}

.function-tests {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

/* iOS Safari特定优化 */
@supports (-webkit-touch-callout: none) {
  .test-input,
  .test-btn {
    -webkit-appearance: none;
    -webkit-border-radius: 8px;
  }

  .test-btn {
    min-height: 44px;
    min-width: 44px;
  }
}

/* 小屏优化 */
@media (max-width: 640px) {
  .ios-test {
    padding: 15px;
  }

  .search-test {
    flex-direction: column;
    align-items: stretch;
  }

  .function-tests {
    flex-direction: column;
  }

  .test-btn {
    width: 100%;
  }
}
</style>
