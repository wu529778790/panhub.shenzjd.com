import { BaseAsyncPlugin } from "./manager";
import type { SearchResult } from "../types/models";
import { ofetch } from "ofetch";

type ApiLink = { service: string; link: string; pwd?: string };
type ApiItem = { name: string; links: ApiLink[] };
type ApiResp = { msg: string; list: ApiItem[] };

function mapService(s: string): string {
  const k = s.toLowerCase();
  switch (k) {
    case "baidu":
      return "baidu";
    case "aliyun":
      return "aliyun";
    case "xunlei":
      return "xunlei";
    case "quark":
      return "quark";
    case "189cloud":
      return "tianyi";
    case "115":
      return "115";
    case "123":
      return "123";
    case "weiyun":
      return "weiyun";
    case "pikpak":
      return "pikpak";
    case "lanzou":
      return "lanzou";
    case "jianguoyun":
      return "jianguoyun";
    case "caiyun":
      return "mobile";
    case "ed2k":
      return "ed2k";
    case "magnet":
      return "magnet";
    case "unknown":
      return "";
    default:
      return "others";
  }
}

export class JikepanPlugin extends BaseAsyncPlugin {
  constructor() {
    super("jikepan", 3);
  }
  override async search(keyword: string): Promise<SearchResult[]> {
    const body = { name: keyword, is_all: false };
    const resp = await ofetch<ApiResp>("https://api.jikepan.xyz/search", {
      method: "POST",
      body,
      headers: {
        "content-type": "application/json",
        referer: "https://jikepan.xyz/",
        "user-agent": "Mozilla/5.0",
      },
      timeout: 8000,
    }).catch(() => ({ msg: "error", list: [] }));
    if (resp.msg !== "success") return [];
    const out: SearchResult[] = [];
    let idx = 0;
    for (const item of resp.list || []) {
      const links: SearchResult["links"] = [];
      for (const l of item.links || []) {
        let t = mapService(l.service);
        if (
          t === "others" &&
          (l.link || "").toLowerCase().includes("drive.uc.cn")
        )
          t = "uc";
        if (!t) continue;
        links.push({ type: t, url: l.link, password: l.pwd || "" });
      }
      if (!links.length) continue;
      out.push({
        message_id: "",
        unique_id: `jikepan-${idx++}`,
        channel: "",
        datetime: "",
        title: item.name,
        content: "",
        links,
      });
    }
    return out;
  }
}

