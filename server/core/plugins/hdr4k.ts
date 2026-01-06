import { BaseAsyncPlugin } from "./manager";
import type { SearchResult } from "../types/models";
import { ofetch } from "ofetch";
import { load } from "cheerio";

const SEARCH_URL = "https://www.4khdr.cn/search.php?mod=forum";

const re = {
  // 网盘/磁力类型
  pan: {
    baidu:
      /https?:\/\/pan\.baidu\.com\/s\/[0-9a-zA-Z_-]+(?:\?pwd=[0-9a-zA-Z]+)?/g,
    aliyun:
      /https?:\/\/(?:www\.)?(?:aliyundrive\.com|alipan\.com)\/s\/[0-9a-zA-Z_-]+/g,
    tianyi: /https?:\/\/cloud\.189\.cn\/t\/[0-9a-zA-Z_-]+/g,
    uc: /https?:\/\/drive\.uc\.cn\/s\/[0-9a-fA-F]+(?:\?[^"\s]*)?/g,
    mobile: /https?:\/\/(?:caiyun\.139|caiyun\.feixin\.10086|yun\.139)\.com\/[^"\s]+/g,
    oneonefive: /https?:\/\/(?:115\.com|115cdn\.com)\/s\/[0-9a-zA-Z_-]+/g,
    pikpak: /https?:\/\/mypikpak\.com\/s\/[0-9a-zA-Z_-]+/g,
    xunlei:
      /https?:\/\/pan\.xunlei\.com\/s\/[0-9a-zA-Z_-]+(?:\?pwd=[0-9a-zA-Z]+)?/g,
    _123: /https?:\/\/(?:www\.)?123pan\.com\/s\/[0-9a-zA-Z_-]+/g,
    lanzou: /https?:\/\/(?:www\.)?(?:lanzou|lanzo)[^\s]+/g,
    weiyun: /https?:\/\/share\.weiyun\.com\/[0-9a-zA-Z]+/g,
    jianguoyun: /https?:\/\/(?:www\.)?jianguoyun\.com\/p\/[0-9a-zA-Z]+/g,
  },
  magnet: /magnet:\?xt=urn:btih:[0-9a-fA-F]{40}[^"'\s]*/g,
  ed2k: /ed2k:\/\/\|file\|.+\|\d+\|[0-9a-fA-F]{32}\|\//g,
};

function collectLinks(textOrHtml: string) {
  const links: SearchResult["links"] = [];
  const addAll = (rg: RegExp, type: string) => {
    const m = textOrHtml.match(rg);
    if (m)
      for (const u of m)
        if (!links.some((l) => l.url === u))
          links.push({ type, url: u, password: "" });
  };
  addAll(re.magnet, "magnet");
  addAll(re.ed2k, "ed2k");
  addAll(re.pan.baidu, "baidu");
  addAll(re.pan.aliyun, "aliyun");
  addAll(re.pan.tianyi, "tianyi");
  addAll(re.pan.uc, "uc");
  addAll(re.pan.mobile, "mobile");
  addAll(re.pan.oneonefive, "115");
  addAll(re.pan.pikpak, "pikpak");
  addAll(re.pan.xunlei, "xunlei");
  addAll(re.pan._123, "123");
  addAll(re.pan.lanzou, "lanzou");
  addAll(re.pan.weiyun, "weiyun");
  addAll(re.pan.jianguoyun, "jianguoyun");
  return links;
}

async function fetchDetail(detailUrl: string) {
  try {
    const html = await ofetch<string>(detailUrl, {
      headers: {
        "user-agent": "Mozilla/5.0",
        referer: "https://www.4khdr.cn/",
      },
      timeout: 10000,
    });
    const $ = load(html);
    // 内容区包含 .t_f 与回复 [id^=postmessage_]
    const text =
      $(".t_f").text() +
      "\n" +
      $("[id^=postmessage_]").text() +
      "\n" +
      $("body").html();
    return collectLinks(text || "");
  } catch {
    return [];
  }
}

export class Hdr4kPlugin extends BaseAsyncPlugin {
  constructor() {
    super("hdr4k", 1);
  }
  override async search(
    keyword: string,
    ext?: Record<string, any>
  ): Promise<SearchResult[]> {
    const timeout = Math.max(
      3000,
      Number((ext as any)?.__plugin_timeout_ms) || 10000
    );
    // POST 搜索
    const form = new URLSearchParams();
    form.set("srchtxt", keyword);
    form.set("searchsubmit", "yes");
    const html = await ofetch<string>(SEARCH_URL, {
      method: "POST",
      body: form,
      headers: {
        "user-agent": "Mozilla/5.0",
        "content-type": "application/x-www-form-urlencoded",
        referer: "https://www.4khdr.cn/",
      },
      timeout,
    }).catch(() => "");
    if (!html) return [];
    const $ = load(html);
    const items: SearchResult[] = [];
    const nodes = $(".slst.mtw ul li.pbw");
    const tasks = nodes
      .map(async (_, el) => {
        const s = $(el);
        const id = s.attr("id") || "";
        const a = s.find("h3.xs3 a").first();
        const title = a.text().trim();
        const href = a.attr("href") || "";
        if (!title || !href) return;
        const detailUrl = href.startsWith("/")
          ? `https://www.4khdr.cn${href}`
          : href;
        const content = s.find("p").first().text().trim();
        // 分类tag
        const tags: string[] = [];
        const cat = s.find("p span a.xi1").first().text().trim();
        if (cat) tags.push(cat);
        const links = await fetchDetail(detailUrl);
        if (links.length) {
          items.push({
            message_id: "",
            unique_id: `hdr4k-${id || detailUrl}`,
            channel: "",
            datetime: "",
            title,
            content,
            links,
            tags,
          } as any);
        }
      })
      .get();
    await Promise.allSettled(tasks);
    return items;
  }
}

