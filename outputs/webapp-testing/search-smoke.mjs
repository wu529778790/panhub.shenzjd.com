import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require(
  "/Users/sean/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright"
);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const baseUrl = process.env.BASE_URL || "http://127.0.0.1:8787";
const searchRequests = [];
const consoleErrors = [];

page.on("console", (message) => {
  if (message.type() === "error") consoleErrors.push(message.text());
});
page.on("pageerror", (error) => consoleErrors.push(error.message));

await page.route("**/api/search?**", async (route) => {
  searchRequests.push(route.request().url());
  const index = searchRequests.length;
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      code: 0,
      message: "success",
      data: {
        total: 1,
        merged_by_type: {
          quark: [
            {
              url: `https://pan.quark.cn/s/smoke-${index}`,
              password: "",
              note: `三体 测试资源 ${index}`,
              datetime: "2026-07-23T00:00:00.000Z",
              source: "smoke",
            },
            {
              url: `https://pan.quark.cn/s/adult-smoke-${index}`,
              password: "",
              note: `三体 成人分类测试 ${index}`,
              datetime: "2026-07-23T00:00:00.000Z",
              source: "smoke",
              metadata: { adult: true },
            },
          ],
        },
      },
    }),
  });
});

await page.route("**/api/search-quality", (route) =>
  route.fulfill({ status: 200, contentType: "application/json", body: "{}" })
);
await page.route("**/api/link-health/query", (route) =>
  route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ code: 0, data: { items: [] } }),
  })
);
await page.route("**/api/hot-searches*", (route) =>
  route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ code: 0, data: { hotSearches: [] } }),
  })
);

await page.goto(baseUrl, { waitUntil: "networkidle" });
await page.getByLabel("搜索关键词").fill("三体");
await page.getByRole("button", { name: "开始搜索" }).click();
await page.getByText("三体 测试资源 1").waitFor({ state: "visible" });
const adultResult = page.getByText("三体 成人分类测试 1");
await page.waitForTimeout(500);
if (!(await adultResult.isVisible())) {
  const diagnostics = await page.evaluate(() => ({
    settings: localStorage.getItem("panhub.settings"),
    sourceVersion: localStorage.getItem("haosouku.sources.version"),
    body: document.body.innerText.slice(0, 3000),
  }));
  throw new Error(`Adult result was hidden by default: ${JSON.stringify(diagnostics)}`);
}
await page.getByRole("button", { name: "过滤成人资源" }).click();
await adultResult.waitFor({ state: "hidden" });
await page.getByRole("button", { name: "显示成人资源" }).click();
await adultResult.waitFor({ state: "visible" });
await page.getByRole("button", { name: "重置搜索" }).waitFor({
  state: "visible",
});
await page.waitForTimeout(500);

const pluginRequests = searchRequests.filter((value) =>
  new URL(value).searchParams.get("src") === "plugin"
);
const tgRequests = searchRequests.filter((value) =>
  new URL(value).searchParams.get("src") === "tg"
);
const qualityFlags = pluginRequests.map((value) => {
  const ext = new URL(value).searchParams.get("ext") || "{}";
  return JSON.parse(ext).__respect_source_quality;
});

if (searchRequests.length !== 8) {
  throw new Error(`Expected 8 search requests, received ${searchRequests.length}`);
}
if (pluginRequests.length !== 2 || tgRequests.length !== 6) {
  throw new Error(
    `Unexpected request split: ${pluginRequests.length} plugin, ${tgRequests.length} TG`
  );
}
if (!qualityFlags.every(Boolean)) {
  throw new Error("Web search requests did not enable source quality controls");
}
if (consoleErrors.length > 0) {
  throw new Error(`Browser errors: ${consoleErrors.join(" | ")}`);
}

await page.screenshot({
  path: process.env.BASE_URL
    ? "/Users/sean/Documents/panpanso/outputs/webapp-testing/search-smoke-production.png"
    : "/Users/sean/Documents/panpanso/outputs/webapp-testing/search-smoke.png",
  fullPage: true,
});
console.log(
  JSON.stringify({
    ok: true,
    searchRequests: searchRequests.length,
    pluginRequests: pluginRequests.length,
    tgRequests: tgRequests.length,
  })
);
await browser.close();
