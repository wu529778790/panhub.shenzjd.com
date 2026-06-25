// ==UserScript==
// @name         PanHub 链接检测助手
// @name:zh      PanHub 链接检测助手
// @name:en      PanHub Link Checker
// @namespace    https://panhub.shenzjd.com
// @version      1.0.0
// @description  自动检测 PanHub 搜索结果中的失效网盘链接，标记已过期/已删除的资源，避免浪费时间点击
// @description:en  Detect expired cloud storage links in PanHub search results and mark them with a strikethrough
// @author       shenzjd
// @match        https://panhub.shenzjd.com/*
// @match        http://panhub.shenzjd.com/*
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @connect      pan.quark.cn
// @connect      alipan.com
// @connect      alyundrive.com
// @connect      pan.baidu.com
// @connect      115.com
// @connect      *.115.com
// @connect      cloud.189.cn
// @connect      pan.xunlei.com
// @connect      drive.uc.cn
// @connect      yun.139.com
// @connect      123pan.com
// @connect      *.123pan.com
// @license      MIT
// @compatible   chrome Tampermonkey / Violentmonkey
// @compatible   firefox Greasemonkey 4+ / Tampermonkey
// @compatible   edge Tampermonkey / Violentmonkey
// @run-at       document-idle
// @icon         https://panhub.shenzjd.com/favicon.ico
// ==/UserScript==

(function () {
  "use strict";

  // ========== 配置 ==========

  /** 并发检测数 */
  const CONCURRENCY = 3;
  /** 单个链接检测超时（毫秒） */
  const TIMEOUT_MS = 8000;
  /** 同一链接缓存时间（毫秒） */
  const CACHE_TTL_MS = 30 * 60 * 1000; // 30 分钟

  // ========== 失效关键词 ==========

  const EXPIRED_PATTERNS = [
    // 夸克
    /分享链接不存在/,
    /分享已失效/,
    /该分享已被取消/,
    /链接已失效/,
    // 阿里云盘
    /分享链接已失效/,
    /该分享已过期/,
    /分享已过期/,
    // 百度网盘
    /分享已过期/,
    /链接失效/,
    /页面不存在/,
    /啊哦，你来晚了/,
    // 115
    /文件已删除/,
    /分享已删除/,
    /不存在此分享/,
    // 天翼
    /分享已过期或不存在/,
    /访问的页面不存在/,
    // 迅雷
    /分享已失效/,
    /链接不存在/,
    // 通用
    /该页面无法访问/,
    /404.*Not Found/i,
    /资源不存在/,
    /已被取消/,
    /已停止分享/,
    /expired/i,
    /not found/i,
    /has been removed/i,
    /link.*invalid/i,
  ];

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

  /** 检查响应体是否包含失效关键词 */
  function isExpiredResponse(body) {
    if (!body || body.length < 10) return null; // 无法判断
    return EXPIRED_PATTERNS.some((pattern) => pattern.test(body));
  }

  /** 用 GM_xmlhttpRequest 检测单个链接 */
  function checkLink(url) {
    return new Promise((resolve) => {
      try {
        GM_xmlhttpRequest({
          method: "GET",
          url: url,
          timeout: TIMEOUT_MS,
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
          },
          onload: function (response) {
            const body = response.responseText || "";
            const expired = isExpiredResponse(body);
            resolve({
              alive: expired === false,
              expired: expired === true,
              status: response.status,
            });
          },
          onerror: function () {
            resolve({ alive: false, expired: true, status: 0 });
          },
          ontimeout: function () {
            resolve({ alive: null, expired: null, status: 0 }); // 未知，不标记
          },
        });
      } catch {
        resolve({ alive: null, expired: null, status: 0 });
      }
    });
  }

  // ========== 缓存 ==========

  const resultCache = new Map(); // url → { expired, timestamp }

  function getCached(url) {
    const entry = resultCache.get(url);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
      resultCache.delete(url);
      return null;
    }
    return entry;
  }

  function setCache(url, expired) {
    resultCache.set(url, { expired, timestamp: Date.now() });
  }

  // ========== UI 操作 ==========

  const CHECKED_ATTR = "data-link-checked";

  /** 标记链接为失效 */
  function markExpired(linkEl) {
    linkEl.style.textDecoration = "line-through";
    linkEl.style.opacity = "0.5";
    linkEl.style.cursor = "not-allowed";
    linkEl.setAttribute("title", "⚠️ 链接已失效，点击可能无法访问");

    // 添加失效标签
    const badge = document.createElement("span");
    badge.textContent = "失效";
    badge.style.cssText =
      "display:inline-block;margin-left:6px;padding:1px 6px;font-size:11px;font-weight:600;color:#fff;background:#ef4444;border-radius:4px;vertical-align:middle;line-height:1.4;";
    linkEl.appendChild(badge);

    // 点击失效链接时弹提示而非跳转
    linkEl.addEventListener(
      "click",
      function (e) {
        e.preventDefault();
        e.stopPropagation();
        alert("该链接已失效（分享已过期或被取消），无法访问。");
      },
      { once: true }
    );
  }

  /** 标记链接为有效 */
  function markAlive(linkEl) {
    // 可选：给有效链接加一个小绿点
    // linkEl.style.borderLeft = "3px solid #10b981";
  }

  // ========== 核心逻辑 ==========

  async function processLinks() {
    const linkEls = document.querySelectorAll(
      ".resource-link:not([" + CHECKED_ATTR + "])"
    );
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
          if (cached.expired) markExpired(linkEl);
          else markAlive(linkEl);
          return;
        }

        // 检测链接
        const result = await checkLink(url);

        if (result.expired === true) {
          setCache(url, true);
          markExpired(linkEl);
        } else if (result.alive === true) {
          setCache(url, false);
          markAlive(linkEl);
        }
        // result.expired === null (超时) → 不标记，不缓存
      })
    );

    await Promise.allSettled(tasks);
  }

  // ========== 监听 ==========

  /** 用 MutationObserver 监听新结果加载 */
  const observer = new MutationObserver(function (mutations) {
    let hasNewLinks = false;
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType !== 1) continue;
        if (
          node.classList?.contains("resource-link") ||
          node.querySelector?.(".resource-link")
        ) {
          hasNewLinks = true;
          break;
        }
      }
      if (hasNewLinks) break;
    }
    if (hasNewLinks) {
      // 延迟一点等 DOM 稳定
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

  // 暴露给 PanHub 页面（供未来集成使用）
  if (typeof unsafeWindow !== "undefined") {
    unsafeWindow.__panhub_linkCheckerReady = true;
    unsafeWindow.__panhub_checkLink = checkLink;
  }

  console.log("[PanHub Link Checker] ✅ 链接检测助手已加载");
})();
