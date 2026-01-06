// API 集成测试套件
// 使用方法:
//   1. 启动开发服务器: npm run dev
//   2. 运行测试: npm run test:api
//   3. 或者: API_BASE=http://localhost:3000/api node ./test/api.test.mjs

import { ofetch } from "ofetch";

const API_BASE = process.env.API_BASE || "http://localhost:3000/api";
const KW = process.env.KW || "1"; // 统一关键词：1
const KW_LIST = (() => {
  const raw = process.env.KW_LIST;
  if (raw && raw.trim()) {
    return raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  // 默认测试关键词列表：短词 + 常用英文/中文
  const arr = [KW, "电影", "movie", "1080p"];
  // 去重
  return Array.from(new Set(arr));
})();

function log(...args) {
  console.log("[TEST]", ...args);
}
function err(...args) {
  console.error("[FAIL]", ...args);
}

let failures = 0;
function expect(cond, msg) {
  if (!cond) {
    failures++;
    err(msg);
  }
}

async function safeFetch(url, opts) {
  try {
    return await ofetch(url, { retry: 0, timeout: 20000, ...opts });
  } catch (e) {
    failures++;
    err("Request error:", url, e?.message || e);
    return null;
  }
}

async function testHealth() {
  if (process.env.PLUGINS) {
    log("[skip] health (PLUGINS specified)");
    return;
  }
  log("GET /health");
  const data = await safeFetch(`${API_BASE}/health`);
  expect(!!data, "health: response should not be null");
  if (!data) return;
  expect(data.status === "ok", "health: status should be 'ok'");
  expect(
    typeof data.plugin_count === "number",
    "health: plugin_count should be number"
  );
  expect(Array.isArray(data.plugins), "health: plugins should be array");
}

async function testSearchGetPlugin() {
  log(`GET /search (plugin, kw=${KW})`);
  // 从 /health 动态获取全部插件名
  let selected = process.env.PLUGINS
    ? String(process.env.PLUGINS)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
  if (selected.length === 0) {
    const health = await safeFetch(`${API_BASE}/health`);
    const all = health && Array.isArray(health.plugins) ? health.plugins : [];
    selected = all;
  }
  for (const name of selected) {
    let ok = false;
    for (const kw of KW_LIST) {
      const q = new URLSearchParams({
        kw,
        src: "plugin",
        res: "results",
        plugins: name,
        refresh: "true",
        ext: JSON.stringify({ __plugin_timeout_ms: 6000, __detail_limit: 6 }),
      });
      const data = await safeFetch(`${API_BASE}/search?${q.toString()}`);
      if (!data) {
        err(`plugin:${name}: response null for kw=${kw}`);
        continue;
      }
      if (data.code !== 0) {
        err(`plugin:${name}: bad code(${data.code}) for kw=${kw}`);
        continue;
      }
      const total = data?.data?.total || 0;
      if (total > 0) {
        ok = true;
        log(`plugin:${name}: ok, kw=${kw}, total=${total}`);
        break;
      } else {
        log(`plugin:${name}: empty for kw=${kw}`);
      }
    }
    if (!ok) {
      failures++;
      err(`plugin:${name}: 所有关键词(${KW_LIST.join(", ")}) 均返回 0，需适配`);
    }
  }
}

async function testSearchGetAll() {
  if (process.env.PLUGINS) {
    log("[skip] search all (PLUGINS specified)");
    return;
  }
  log(`GET /search (all, kw=${KW})`);
  const q = new URLSearchParams({
    kw: KW,
    src: "all",
    res: "results",
    refresh: "true",
    ext: JSON.stringify({ __plugin_timeout_ms: 6000, __detail_limit: 6 }),
  });
  const data = await safeFetch(`${API_BASE}/search?${q.toString()}`);
  expect(!!data, "search GET all: response should not be null");
  if (!data) return;
  expect(data.code === 0, "search GET all: code should be 0");
  const total = data?.data?.total || 0;
  if (!(total > 0)) {
    failures++;
    err(`search GET all: 关键词(${KW}) 返回 0 条，接口可能需要重新适配`);
  } else {
    log(`search GET all: ok, total=${total}`);
  }
}

async function testSearchPostTG() {
  if (process.env.PLUGINS) {
    log("[skip] search tg (PLUGINS specified)");
    return;
  }
  log(`POST /search (tg, kw=${KW})`);
  const body = {
    kw: KW,
    src: "tg",
    res: "results",
    channels: "tgsearchers3",
    refresh: true,
    ext: { __plugin_timeout_ms: 6000 },
  };
  const data = await safeFetch(`${API_BASE}/search`, { method: "POST", body });
  expect(!!data, "search POST tg: response should not be null");
  if (!data) return;
  expect(data.code === 0, "search POST tg: code should be 0");
  const total = data?.data?.total || 0;
  if (!(total > 0)) {
    failures++;
    err(`search POST tg: 关键词(${KW}) 返回 0 条，接口可能需要重新适配`);
  } else {
    log(`search POST tg: ok, total=${total}`);
  }
}

// 测试输入验证
async function testInputValidation() {
  log("=== 测试输入验证 ===");

  // 测试 1: GET /search 缺少参数
  log("测试: GET /search (缺少 kw 参数)");
  try {
    const data = await ofetch(`${API_BASE}/search`, { retry: 0, timeout: 5000 });
    err("应该返回验证错误，但请求成功了");
    failures++;
  } catch (e) {
    if (e.response?.status === 400) {
      const data = await e.response.json();
      if (data.code === 'VALIDATION_ERROR') {
        log("✓ 正确返回验证错误");
      } else {
        err(`错误码不正确: ${data.code}`);
        failures++;
      }
    } else {
      err(`状态码不正确: ${e.response?.status}`);
      failures++;
    }
  }

  // 测试 2: GET /search 空关键词
  log("测试: GET /search (空关键词)");
  try {
    const data = await ofetch(`${API_BASE}/search?kw=`, { retry: 0, timeout: 5000 });
    err("应该返回验证错误，但请求成功了");
    failures++;
  } catch (e) {
    if (e.response?.status === 400) {
      log("✓ 正确返回验证错误");
    } else {
      err(`状态码不正确: ${e.response?.status}`);
      failures++;
    }
  }

  // 测试 3: GET /search 无效字符
  log("测试: GET /search (无效字符)");
  try {
    const data = await ofetch(`${API_BASE}/search?kw=<>`, { retry: 0, timeout: 5000 });
    err("应该返回验证错误，但请求成功了");
    failures++;
  } catch (e) {
    if (e.response?.status === 400) {
      log("✓ 正确返回验证错误");
    } else {
      err(`状态码不正确: ${e.response?.status}`);
      failures++;
    }
  }

  // 测试 4: GET /search 并发数过大
  log("测试: GET /search (并发数过大)");
  try {
    const data = await ofetch(`${API_BASE}/search?kw=test&concurrency=100`, { retry: 0, timeout: 5000 });
    err("应该返回验证错误，但请求成功了");
    failures++;
  } catch (e) {
    if (e.response?.status === 400) {
      log("✓ 正确返回验证错误");
    } else {
      err(`状态码不正确: ${e.response?.status}`);
      failures++;
    }
  }

  // 测试 5: POST /search 无效 JSON
  log("测试: POST /search (无效 JSON)");
  try {
    const data = await ofetch(`${API_BASE}/search`, {
      method: "POST",
      body: "invalid json",
      retry: 0,
      timeout: 5000
    });
    err("应该返回错误，但请求成功了");
    failures++;
  } catch (e) {
    if (e.response?.status === 400 || e.response?.status === 500) {
      log("✓ 正确返回错误");
    } else {
      err(`状态码不正确: ${e.response?.status}`);
      failures++;
    }
  }

  // 测试 6: GET /hot-searches limit 过大
  log("测试: GET /hot-searches (limit 过大)");
  try {
    const data = await ofetch(`${API_BASE}/hot-searches?limit=1000`, { retry: 0, timeout: 5000 });
    err("应该返回验证错误，但请求成功了");
    failures++;
  } catch (e) {
    if (e.response?.status === 400) {
      log("✓ 正确返回验证错误");
    } else {
      err(`状态码不正确: ${e.response?.status}`);
      failures++;
    }
  }

  // 测试 7: POST /hot-searches 缺少 term
  log("测试: POST /hot-searches (缺少 term)");
  try {
    const data = await ofetch(`${API_BASE}/hot-searches`, {
      method: "POST",
      body: {},
      retry: 0,
      timeout: 5000
    });
    err("应该返回验证错误，但请求成功了");
    failures++;
  } catch (e) {
    if (e.response?.status === 400) {
      log("✓ 正确返回验证错误");
    } else {
      err(`状态码不正确: ${e.response?.status}`);
      failures++;
    }
  }

  log("=== 输入验证测试完成 ===\n");
}

// 测试错误响应格式
async function testErrorFormat() {
  log("=== 测试错误响应格式 ===");

  try {
    const data = await ofetch(`${API_BASE}/search?kw=<>`, { retry: 0, timeout: 5000 });
    err("应该返回错误");
    failures++;
  } catch (e) {
    if (e.response) {
      const data = await e.response.json();

      // 验证标准错误格式
      const checks = [
        ["code 字段存在", !!data.code],
        ["message 字段存在", !!data.message],
        ["data 字段存在", data.hasOwnProperty('data')],
        ["error 字段存在", !!data.error],
        ["error.statusCode 存在", !!data.error?.statusCode],
      ];

      for (const [name, pass] of checks) {
        if (pass) {
          log(`✓ ${name}`);
        } else {
          err(`✗ ${name}`);
          failures++;
        }
      }
    } else {
      err("无法获取错误响应");
      failures++;
    }
  }

  log("=== 错误格式测试完成 ===\n");
}

async function main() {
  log("API_BASE =", API_BASE);

  // 基础功能测试
  await testHealth();
  await testSearchGetPlugin();
  await testSearchGetAll();
  await testSearchPostTG();

  // 新增验证测试
  await testInputValidation();
  await testErrorFormat();

  if (failures > 0) {
    err(`Completed with ${failures} failure(s)`);
    process.exit(1);
  } else {
    log("All tests passed ✓");
  }
}

main();
