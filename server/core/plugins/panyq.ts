import { BaseAsyncPlugin } from "./manager";
import type { SearchResult } from "../types/models";
import { ofetch } from "ofetch";

// 轻量版：直接走 /api/search?sign= 获取列表，再尝试解析最终 url
// 注意：该站点存在动态 action id 流程，轻量实现仅在可用时返回结果

const BASE = "https://panyq.com";

export class PanyqPlugin extends BaseAsyncPlugin {
  constructor() {
    super("panyq", 2);
  }
  override async search(keyword: string): Promise<SearchResult[]> {
    // 尝试先获取 sign（降级：若失败则直接返回空）
    const sign = await getSign(keyword).catch(() => "");
    if (!sign) return [];
    const list = await ofetch<{
      data: { hits: Array<{ eid: string; desc: string }> };
    }>(`${BASE}/api/search?sign=${encodeURIComponent(sign)}&page=1`, {
      headers: { "user-agent": "Mozilla/5.0", referer: BASE },
      timeout: 10000,
    }).catch(() => undefined);
    if (!list) return [];
    const out: SearchResult[] = [];
    for (const h of list.data?.hits || []) {
      const url = await getFinalLink(h.eid).catch(() => "");
      if (!url) continue;
      out.push({
        message_id: "",
        unique_id: `panyq-${h.eid}`,
        channel: "",
        datetime: "",
        title: extractTitle(h.desc),
        content: cleanDesc(h.desc),
        links: [{ type: mapType(url), url, password: extractPwd(url) }],
      });
    }
    return out;
  }
}

async function getSign(keyword: string): Promise<string> {
  // 轻量尝试：直接 POST 首页触发 action
  const payload = `[{
    "cat":"all",
    "query":"${keyword.replace(/"/g, '"')}",
    "pageNum":1
  }]`;
  const html = await ofetch<string>(BASE, {
    method: "POST",
    body: payload,
    headers: {
      "content-type": "text/plain;charset=UTF-8",
      "user-agent": "Mozilla/5.0",
      referer: BASE,
    },
    timeout: 10000,
  });
  const m = /"sign":"([^"]+)"/.exec(html);
  if (!m) throw new Error("no sign");
  return m[1];
}

async function getFinalLink(eid: string): Promise<string> {
  // 轻量尝试：直接请求 /go/:eid 并解析最后一行 JSON 中的 url
  const txt = await ofetch<string>(`${BASE}/go/${encodeURIComponent(eid)}`, {
    method: "POST",
    body: `[{"eid":"${eid}"}]`,
    headers: {
      "content-type": "text/plain;charset=UTF-8",
      "user-agent": "Mozilla/5.0",
      referer: `${BASE}/go/${eid}`,
    },
    timeout: 10000,
  });
  const lines = txt.trim().split(/\n+/);
  const last = lines[lines.length - 1] || "";
  try {
    const arr = JSON.parse(last);
    if (Array.isArray(arr) && arr[1] && typeof arr[1].url === "string")
      return arr[1].url;
  } catch {}
  const m = /(https?:[^\s"'<>]+|magnet:\?[^\s"'<>]+)/.exec(txt);
  return m ? m[1] : "";
}

function cleanDesc(s: string): string {
  return s
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
function extractTitle(s: string): string {
  const c = cleanDesc(s);
  const m1 = /《([^》]+)》/.exec(c);
  if (m1) return m1[1];
  const m2 = /【([^】]+)】/.exec(c);
  if (m2) return m2[1];
  return c.slice(0, 30);
}
function mapType(u: string): string {
  const url = u.toLowerCase();
  if (url.startsWith("magnet:")) return "magnet";
  if (url.startsWith("ed2k:")) return "ed2k";
  if (url.includes("pan.baidu.com")) return "baidu";
  if (url.includes("alipan.com") || url.includes("aliyundrive.com"))
    return "aliyun";
  if (url.includes("pan.quark.cn")) return "quark";
  if (url.includes("cloud.189.cn")) return "tianyi";
  if (url.includes("pan.xunlei.com")) return "xunlei";
  if (url.includes("caiyun.139.com") || url.includes("yun.139.com"))
    return "mobile";
  if (url.includes("115.com")) return "115";
  if (url.includes("weiyun.com")) return "weiyun";
  if (url.includes("lanzou")) return "lanzou";
  if (url.includes("jianguoyun.com")) return "jianguoyun";
  if (url.includes("123pan.com")) return "123";
  if (url.includes("drive.uc.cn")) return "uc";
  if (url.includes("mypikpak.com")) return "pikpak";
  return "others";
}
function extractPwd(url: string): string {
  const m1 = /[?&]pwd=([0-9a-zA-Z]+)/.exec(url);
  if (m1) return m1[1];
  const m2 = /[?&]password=([^&#]+)/.exec(url);
  if (m2) return m2[1];
  return "";
}

