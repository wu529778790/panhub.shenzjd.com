import { BaseAsyncPlugin } from "./manager";
import type { SearchResult } from "../types/models";
import { ofetch } from "ofetch";

type ApiItem = {
  id: number;
  title: string;
  url: string;
  updatetime?: string;
  category?: string;
  filetype?: string;
  size?: string;
};
type ApiResp = { status: number; message: string; data: ApiItem[] };

function determineLinkType(url: string): string {
  const u = url.toLowerCase();
  if (u.includes("pan.baidu.com")) return "baidu";
  if (u.includes("aliyundrive.com") || u.includes("alipan.com"))
    return "aliyun";
  if (u.includes("pan.quark.cn")) return "quark";
  if (u.includes("cloud.189.cn")) return "tianyi";
  if (u.includes("pan.xunlei.com")) return "xunlei";
  if (u.includes("caiyun.139.com") || u.includes("yun.139.com")) return "mobile";
  if (u.includes("115.com")) return "115";
  if (u.includes("drive.uc.cn")) return "uc";
  if (u.includes("123pan.com") || u.includes("pan.123.com")) return "123";
  if (u.includes("mypikpak.com")) return "pikpak";
  if (u.includes("lanzou")) return "lanzou";
  return "others";
}

export class QupansouPlugin extends BaseAsyncPlugin {
  constructor() {
    super("qupansou", 3);
  }
  override async search(
    keyword: string,
    ext?: Record<string, any>
  ): Promise<SearchResult[]> {
    const timeout = Math.max(
      3000,
      Number((ext as any)?.__plugin_timeout_ms) || 6000
    );
    const body = {
      style: "get",
      datasrc: "search",
      query: {
        id: "",
        datetime: "",
        courseid: 1,
        categoryid: "",
        filetypeid: "",
        filetype: "",
        reportid: "",
        validid: "",
        searchtext: keyword,
      },
      page: { pageSize: 1000, pageIndex: 1 },
      order: { prop: "sort", order: "desc" },
      message: "请求资源列表数据",
    };
    const resp = await ofetch<ApiResp>("https://v.funletu.com/search", {
      method: "POST",
      body,
      headers: {
        "content-type": "application/json",
        "user-agent": "Mozilla/5.0",
        referer: "https://pan.funletu.com/",
      },
      timeout,
    }).catch(() => ({ status: -1, message: "error", data: [] }));
    if (!resp || resp.status !== 200) return [];
    const out: SearchResult[] = [];
    for (const it of resp.data || []) {
      if (!it.url) continue;
      const dt = it.updatetime ? new Date(it.updatetime).toISOString() : "";
      out.push({
        message_id: "",
        unique_id: `qupansou-${it.id}`,
        channel: "",
        datetime: dt,
        title: (it.title || "").replace(/<[^>]+>/g, "").trim(),
        content: `类别:${it.category || ""} 文件类型:${
          it.filetype || ""
        } 大小:${it.size || ""}`.trim(),
        links: [{ type: determineLinkType(it.url), url: it.url, password: "" }],
      });
    }
    return out;
  }
}

