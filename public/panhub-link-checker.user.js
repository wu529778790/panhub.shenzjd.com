// ==UserScript==
// @name         好搜库链接检测助手
// @name:zh      好搜库链接检测助手
// @name:en      HAOSOUKU Link Checker
// @namespace    https://haosouku.com
// @version      2.2.0
// @description  自动检测好搜库搜索结果中的失效网盘链接，标记已过期或已删除的资源
// @description:en  Detect expired cloud storage links in HAOSOUKU search results
// @author       好搜库
// @match        https://haosouku.com/*
// @match        https://www.haosouku.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM.xmlHttpRequest
// @grant        unsafeWindow
// @connect      pan.quark.cn
// @connect      drive-h.quark.cn
// @connect      alipan.com
// @connect      alyundrive.com
// @connect      api.aliyundrive.com
// @connect      pan.baidu.com
// @connect      115.com
// @connect      *.115.com
// @connect      115cdn.com
// @connect      cloud.189.cn
// @connect      api.cloud.189.cn
// @connect      pan.xunlei.com
// @connect      xluser-ssl.xunlei.com
// @connect      api-pan.xunlei.com
// @connect      drive.uc.cn
// @connect      yun.139.com
// @connect      123pan.com
// @connect      *.123pan.com
// @connect      www.123pan.com
// @license      MIT
// @compatible   chrome Tampermonkey / Violentmonkey
// @compatible   firefox Greasemonkey 4+ / Tampermonkey
// @compatible   edge Tampermonkey / Violentmonkey
// @run-at       document-idle
// @icon         https://haosouku.com/favicon.ico
// @downloadURL  https://haosouku.com/panhub-link-checker.user.js
// @updateURL    https://haosouku.com/panhub-link-checker.user.js
// ==/UserScript==

(function () {
  "use strict";

  // ========== 配置 ==========

  /** 并发检测数 */
  const CONCURRENCY = 3;
  /** 单个链接检测超时（毫秒） */
  const TIMEOUT_MS = 10000;
  /** 同一链接缓存时间（毫秒） */
  const CACHE_TTL_MS = 30 * 60 * 1000; // 30 分钟
  /** 检测结果批量回传延迟（毫秒） */
  const REPORT_DELAY_MS = 600;

  // ========== 工具函数 ==========

  /** 简易并发控制器 */
  function createPool(limit) {
    let active = 0;
    const queue = [];
    function next() {
      if (queue.length === 0 || active >= limit) return;
      active++;
      const { fn, resolve, reject } = queue.shift();
      fn().then(resolve, reject).finally(() => {
        active--;
        next();
      });
    }
    return function (fn) {
      return new Promise((resolve, reject) => {
        queue.push({ fn, resolve, reject });
        next();
      });
    };
  }

  /** 从 URL 中提取 share_id */
  function extractShareId(url, pattern) {
    const m = url.match(pattern);
    return m ? m[1] : null;
  }

  /** 封装 GM_xmlhttpRequest 为 Promise */
  function gmRequest(options) {
    return new Promise((resolve) => {
      try {
        const request =
          typeof GM_xmlhttpRequest === "function"
            ? GM_xmlhttpRequest
            : typeof GM !== "undefined" && typeof GM.xmlHttpRequest === "function"
              ? GM.xmlHttpRequest.bind(GM)
              : null;
        if (!request) {
          resolve({ ok: false, status: 0, body: "" });
          return;
        }
        request({
          ...options,
          timeout: TIMEOUT_MS,
          onload: function (response) {
            resolve({ ok: true, status: response.status, body: response.responseText || "" });
          },
          onerror: function () {
            resolve({ ok: false, status: 0, body: "" });
          },
          ontimeout: function () {
            resolve({ ok: false, status: 0, body: "", timeout: true });
          },
        });
      } catch {
        resolve({ ok: false, status: 0, body: "" });
      }
    });
  }

  // ========== 平台检测器 ==========
  // state: 1=有效, -1=失效, 2=需要密码, 0=无法判断

  const PLATFORM_CHECKERS = [
    // ---- 夸克网盘 (API) ----
    {
      name: "夸克",
      match: (url) => url.includes("pan.quark.cn"),
      extractId: (url) => extractShareId(url, /pan\.quark\.cn\/s\/([\w\-]+)/),
      check: async (shareId) => {
        // 第一步：获取 token
        const resp = await gmRequest({
          method: "POST",
          url: "https://drive-h.quark.cn/1/clouddrive/share/sharepage/token?pr=ucpro&fr=pc",
          headers: { "Content-Type": "application/json" },
          data: JSON.stringify({ pwd_id: shareId, passcode: "" }),
        });
        if (!ok(resp)) return 0;
        const rsp = parse(resp.body);
        if (!rsp) return 0;

        if (rsp.message && rsp.message.includes("需要提取码")) return 2;
        if (!rsp.message || !rsp.message.includes("ok")) return -1;

        // 第二步：获取详情确认状态
        const token = (rsp.data.stoken || "")
          .replace(/\+/g, "%2B").replace(/"/g, "%22")
          .replace(/'/g, "%27").replace(/\//g, "%2F");
        const detail = await gmRequest({
          method: "GET",
          url: `https://drive-h.quark.cn/1/clouddrive/share/sharepage/detail?pwd_id=${shareId}&stoken=${token}&_fetch_share=1`,
        });
        if (!ok(detail)) return 0;
        const rsp2 = parse(detail.body);
        if (!rsp2 || !rsp2.data || !rsp2.data.share) return 0;

        const s = rsp2.data.share;
        if (s.status === 1 || s.status === 3) return s.partial_violation ? -1 : 1;
        if (s.status > 1) return -1;
        return 0;
      },
    },
    // ---- 阿里云盘 (API) ----
    {
      name: "阿里",
      match: (url) => url.includes("alipan.com") || url.includes("aliyundrive.com"),
      extractId: (url) => extractShareId(url, /(?:alipan|aliyundrive)\.com\/s\/([\w\-]+)/),
      check: async (shareId) => {
        const resp = await gmRequest({
          method: "POST",
          url: "https://api.aliyundrive.com/adrive/v3/share_link/get_share_by_anonymous",
          headers: { "Content-Type": "application/json" },
          data: JSON.stringify({ share_id: shareId }),
        });
        if (!ok(resp)) return 0;
        const rsp = parse(resp.body);
        if (!rsp) return 0;

        // code 包含 ShareLink 表示链接异常
        if (rsp.code && rsp.code.indexOf("ShareLink") > -1) return -1;
        // 有 file_count 说明有效
        if (rsp.file_count && rsp.file_count > 0) return 1;
        // 有 creator 说明有效（空文件夹也可能有效）
        if (rsp.creator) return 1;
        // code 存在但不是 ShareLink → 未知状态
        if (rsp.code) return 0;
        return 0;
      },
    },
    // ---- 百度网盘 (HTML) ----
    {
      name: "百度",
      match: (url) => url.includes("pan.baidu.com"),
      extractId: (url) => {
        let m = url.match(/pan\.baidu\.com\/s\/([\w\-]+)/);
        if (m) return m[1];
        m = url.match(/surl=([\w\-]+)/);
        return m ? m[1] : null;
      },
      check: async (shareId, url) => {
        const checkUrl = shareId.includes("http")
          ? shareId
          : url.includes("surl=")
            ? `https://pan.baidu.com/share/init?surl=${shareId}`
            : `https://pan.baidu.com/s/${shareId}`;
        const resp = await gmRequest({ method: "GET", url: checkUrl });
        if (!ok(resp)) return 0;
        const body = resp.body;
        if (body.includes("过期时间：") || body.includes("过期时间:")) return 1;
        if (body.includes("输入提取") || body.includes("请输入提取码")) return 2;
        if (body.includes("不存在") || body.includes("已失效") || body.includes("来晚了")) return -1;
        return 0;
      },
    },
    // ---- 115网盘 (API) ----
    {
      name: "115",
      match: (url) => url.includes("115.com") || url.includes("115cdn.com") || url.includes("anxia.com"),
      extractId: (url) => extractShareId(url, /(?:115|115cdn|anxia)\.com\/s\/([\w\-]+)/),
      check: async (shareId) => {
        const resp = await gmRequest({
          method: "GET",
          url: `https://115cdn.com/webapi/share/snap?share_code=${shareId}&receive_code=`,
        });
        if (!ok(resp)) return 0;
        const rsp = parse(resp.body);
        if (!rsp) return 0;

        if (rsp.state) return 1;
        if (rsp.error) {
          if (rsp.error.includes("访问码")) return 2;
          if (rsp.error.includes("不存在或已被删除") || rsp.error.includes("分享已取消")) return -1;
        }
        return 0;
      },
    },
    // ---- 天翼云盘 (API) ----
    {
      name: "天翼",
      match: (url) => url.includes("cloud.189.cn"),
      extractId: (url) => extractShareId(url, /cloud\.189\.cn\/(?:t\/|web\/share\?code=)([\w\-]+)/),
      check: async (shareId) => {
        const resp = await gmRequest({
          method: "POST",
          url: "https://api.cloud.189.cn/open/share/getShareInfoByCodeV2.action",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          data: `shareCode=${shareId}`,
        });
        if (!ok(resp)) return 0;
        const body = resp.body;
        if (body.includes("ShareInfoNotFound") || body.includes("ShareNotFound")
          || body.includes("FileNotFound") || body.includes("ShareExpiredError")
          || body.includes("ShareAuditNotPass")) return -1;
        if (body.includes("needAccessCode")) return 2;
        // 有响应且不含错误 → 有效
        if (body.length > 50) return 1;
        return 0;
      },
    },
    // ---- 迅雷云盘 (API) ----
    {
      name: "迅雷",
      match: (url) => url.includes("pan.xunlei.com"),
      extractId: (url) => extractShareId(url, /pan\.xunlei\.com\/s\/([\w\-]+)/),
      check: async (shareId) => {
        // 第一步：获取 captcha token
        const tokenResp = await gmRequest({
          method: "POST",
          url: "https://xluser-ssl.xunlei.com/v1/shield/captcha/init",
          headers: { "Content-Type": "application/json" },
          data: JSON.stringify({
            client_id: "Xqp0kJBXWhwaTpB6",
            device_id: "925b7631473a13716b791d7f28289cad",
            action: "get:/drive/v1/share",
            meta: {
              package_name: "pan.xunlei.com",
              client_version: "1.45.0",
              captcha_sign: "1.fe2108ad808a74c9ac0243309242726c",
              timestamp: "1645241033384",
            },
          }),
        });
        if (!ok(tokenResp)) return 0;
        const tokenRsp = parse(tokenResp.body);
        if (!tokenRsp || !tokenRsp.captcha_token) return 0;

        // 第二步：查询分享状态
        const resp = await gmRequest({
          method: "GET",
          url: `https://api-pan.xunlei.com/drive/v1/share?share_id=${shareId}`,
          headers: {
            "x-captcha-token": tokenRsp.captcha_token,
            "x-client-id": "Xqp0kJBXWhwaTpB6",
            "x-device-id": "925b7631473a13716b791d7f28289cad",
          },
        });
        if (!ok(resp)) return 0;
        const body = resp.body;
        if (body.includes("NOT_FOUND") || body.includes("SENSITIVE_RESOURCE") || body.includes("EXPIRED")) return -1;
        if (body.includes("PASS_CODE_EMPTY")) return 2;
        if (body.length > 50) return 1;
        return 0;
      },
    },
    // ---- 123网盘 (API) ----
    {
      name: "123",
      match: (url) => url.includes("123pan.com") || url.includes("123865.com") || url.includes("123684.com") || url.includes("123912.com"),
      extractId: (url) => extractShareId(url, /(?:123pan|123865|123684|123912)\.com\/s\/([\w\-]+)/),
      check: async (shareId) => {
        const resp = await gmRequest({
          method: "GET",
          url: `https://www.123pan.com/api/share/info?shareKey=${shareId}`,
        });
        if (!ok(resp)) return 0;
        const rsp = parse(resp.body);
        if (!rsp) {
          // 尝试从原文判断
          if (resp.body.includes("分享页面不存在")) return -1;
          return 0;
        }
        if (rsp.code !== 0) return -1;
        if (rsp.data && rsp.data.HasPwd) return 2;
        return 1;
      },
    },
    // ---- UC网盘 (HTML fallback) ----
    {
      name: "UC",
      match: (url) => url.includes("drive.uc.cn"),
      extractId: (url) => extractShareId(url, /drive\.uc\.cn\/s\/([\w\-]+)/),
      check: async (shareId, url) => {
        const resp = await gmRequest({ method: "GET", url });
        if (!ok(resp)) return 0;
        const title = extractTitle(resp.body);
        if (/不存在|已失效|已过期|已取消/.test(title)) return -1;
        return 0;
      },
    },
    // ---- 移动139云盘 (HTML fallback) ----
    {
      name: "139",
      match: (url) => url.includes("yun.139.com"),
      extractId: (url) => extractShareId(url, /yun\.139\.com\/(?:s|w\/share)\/([\w\-]+)/),
      check: async (shareId, url) => {
        const resp = await gmRequest({ method: "GET", url });
        if (!ok(resp)) return 0;
        const title = extractTitle(resp.body);
        if (/不存在|已失效|已过期|已取消/.test(title)) return -1;
        return 0;
      },
    },
  ];

  // ========== 辅助函数 ==========

  function ok(resp) {
    return resp.ok && resp.status >= 200 && resp.status < 400;
  }

  function parse(body) {
    try { return JSON.parse(body); } catch { return null; }
  }

  function extractTitle(body) {
    const m = body.match(/<title[^>]*>([^<]*)<\/title>/i);
    return m ? m[1].trim() : "";
  }

  // ========== 缓存 ==========

  const resultCache = new Map(); // url → { state, timestamp }
  const pendingHealthReports = new Map();
  let reportTimer;

  function getCached(url) {
    const entry = resultCache.get(url);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
      resultCache.delete(url);
      return null;
    }
    return entry;
  }

  function setCache(url, state) {
    resultCache.set(url, { state, timestamp: Date.now() });
  }

  function reportStatus(state) {
    if (state === -1) return "dead";
    if (state === 1) return "alive";
    if (state === 2) return "password";
    return null;
  }

  function queueHealthReport(url, state) {
    const status = reportStatus(state);
    if (!status) return;
    pendingHealthReports.set(url, { url, status });
    if (reportTimer) clearTimeout(reportTimer);
    reportTimer = setTimeout(flushHealthReports, REPORT_DELAY_MS);
  }

  async function flushHealthReports() {
    reportTimer = undefined;
    const reports = Array.from(pendingHealthReports.values()).slice(0, 100);
    reports.forEach((report) => pendingHealthReports.delete(report.url));
    if (reports.length === 0) return;

    const pageWindow = typeof unsafeWindow !== "undefined" ? unsafeWindow : window;
    try {
      const response = await pageWindow.fetch.call(pageWindow, "/api/link-health/report", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reports }),
      });
      if (!response.ok) return;
      const payload = await response.json();
      const items = payload && payload.data && Array.isArray(payload.data.items)
        ? payload.data.items
        : [];
      pageWindow.postMessage(
        { type: "haosouku:link-health", items },
        pageWindow.location.origin
      );
    } catch {}

    if (pendingHealthReports.size > 0 && !reportTimer) {
      reportTimer = setTimeout(flushHealthReports, REPORT_DELAY_MS);
    }
  }

  // ========== UI 操作 ==========

  const CHECKED_ATTR = "data-link-checked";
  const LINK_SELECTOR = ".resource-link, .resource-row__title";
  const UNCHECKED_LINK_SELECTOR =
    `.resource-link:not([${CHECKED_ATTR}]), .resource-row__title:not([${CHECKED_ATTR}])`;

  /** 标记链接为失效 */
  function markExpired(linkEl) {
    linkEl.setAttribute("data-link-status", "expired");
    linkEl.style.textDecoration = "line-through";
    linkEl.style.color = "var(--text-tertiary, #6b7280)";
    linkEl.setAttribute("title", "该链接可能已失效（系统自动检测），点击可自行验证");

    const badge = document.createElement("span");
    badge.textContent = "可能失效";
    badge.style.cssText =
      "display:inline-block;flex:0 0 auto;align-self:center;margin-left:6px;padding:1px 6px;font-size:11px;font-weight:600;color:#fff;background:#ef4444;border-radius:4px;vertical-align:middle;line-height:1.4;white-space:nowrap;text-decoration:none;";
    linkEl.appendChild(badge);
  }

  /** 标记链接为需要密码 */
  function markNeedsPassword(linkEl) {
    linkEl.setAttribute("data-link-status", "password");
    const badge = document.createElement("span");
    badge.textContent = "需要密码";
    badge.style.cssText =
      "display:inline-block;flex:0 0 auto;align-self:center;margin-left:6px;padding:1px 6px;font-size:11px;font-weight:600;color:#fff;background:#f59e0b;border-radius:4px;vertical-align:middle;line-height:1.4;white-space:nowrap;text-decoration:none;";
    linkEl.appendChild(badge);
  }

  /** 标记链接为有效 */
  function markAlive(linkEl) {
    linkEl.setAttribute("data-link-status", "alive");
  }

  // ========== 核心逻辑 ==========

  async function processLinks() {
    const linkEls = document.querySelectorAll(UNCHECKED_LINK_SELECTOR);
    if (linkEls.length === 0) return;

    // 标记为已处理（防止重复检测）
    linkEls.forEach((el) => el.setAttribute(CHECKED_ATTR, "true"));

    const pool = createPool(CONCURRENCY);
    const tasks = Array.from(linkEls).map((linkEl) =>
      pool(async () => {
        const url = linkEl.getAttribute("href");
        if (!url || !url.startsWith("http")) return;

        // 检查缓存
        const cached = getCached(url);
        if (cached) {
          applyState(linkEl, cached.state);
          queueHealthReport(url, cached.state);
          return;
        }

        // 查找匹配的平台检测器
        const checker = PLATFORM_CHECKERS.find((c) => c.match(url));
        if (!checker) return;

        const shareId = checker.extractId(url);
        if (!shareId) return;

        // 执行检测
        const state = await checker.check(shareId, url);
        setCache(url, state);
        applyState(linkEl, state);
        queueHealthReport(url, state);
      })
    );

    await Promise.allSettled(tasks);
  }

  function applyState(linkEl, state) {
    if (state === -1) markExpired(linkEl);
    else if (state === 2) markNeedsPassword(linkEl);
    else if (state === 1) markAlive(linkEl);
    // state === 0 → 无法判断，不标记
  }

  // ========== 监听 ==========

  const observer = new MutationObserver(function (mutations) {
    let hasNewLinks = false;
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType !== 1) continue;
        if (
          node.matches?.(LINK_SELECTOR) ||
          node.querySelector?.(LINK_SELECTOR)
        ) {
          hasNewLinks = true;
          break;
        }
      }
      if (hasNewLinks) break;
    }
    if (hasNewLinks) {
      setTimeout(processLinks, 300);
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // 页面加载完成后也执行一次
  if (document.readyState === "complete") {
    setTimeout(processLinks, 1000);
  } else {
    window.addEventListener("load", function () {
      setTimeout(processLinks, 1000);
    });
  }

  // 暴露给好搜库页面
  if (typeof unsafeWindow !== "undefined") {
    unsafeWindow.__panhub_linkCheckerReady = true;
    unsafeWindow.__panhub_linkCheckerVersion = "2.2.0";
    unsafeWindow.__panhub_checkLink = async function (url) {
      const checker = PLATFORM_CHECKERS.find((c) => c.match(url));
      if (!checker) return { state: 0, platform: "unknown" };
      const shareId = checker.extractId(url);
      if (!shareId) return { state: 0, platform: checker.name };
      const state = await checker.check(shareId, url);
      return { state, platform: checker.name };
    };
  }

  console.log("[HAOSOUKU Link Checker] 链接检测助手 v2.2.0 已加载");
})();
