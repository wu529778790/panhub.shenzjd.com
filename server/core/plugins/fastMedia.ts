import pLimit from "p-limit";
import { load } from "cheerio";
import { BaseAsyncPlugin } from "./manager";
import type { Link, SearchResult } from "../types/models";
import {
  classifyShareUrl,
  extractSharePassword,
  isStrictTitleMatch,
} from "../../../utils/sourceContent";

const BASE_URL = "https://binhd.com";
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36";

function absoluteUrl(value: string): string {
  try {
    return new URL(value, BASE_URL).href;
  } catch {
    return "";
  }
}

async function resolveDetailLinks(
  detailUrl: string,
  signal?: AbortSignal
): Promise<Link[]> {
  const detailResponse = await fetch(detailUrl, {
    headers: { accept: "text/html", "user-agent": USER_AGENT },
    signal,
  }).catch(() => undefined);
  if (!detailResponse?.ok) return [];

  const cookieHeader = detailResponse.headers.get("set-cookie") || "";
  const csrfCookie = cookieHeader.match(/(?:^|[,;]\s*)csrftoken=([^;,\s]+)/i)?.[1] || "";
  const html = await detailResponse.text();
  const $ = load(html);
  const forms: Array<{ action: string; token: string; password: string }> = [];

  $("form[data-resource-download-form]").each((_, form) => {
    if (forms.length >= 3) return;
    const node = $(form);
    const action = absoluteUrl(node.attr("action") || "");
    const token = node.find("input[name='csrfmiddlewaretoken']").attr("value") || "";
    const cardText = node.closest(".resource-download-card").text();
    const password =
      cardText.match(/提取码\s*[:：]\s*([a-z0-9]{4,16})/i)?.[1] || "";
    if (action && token) forms.push({ action, token, password });
  });

  const resolved = await Promise.all(
    forms.map(async (form) => {
      const body = new URLSearchParams({ csrfmiddlewaretoken: form.token });
      const response = await fetch(form.action, {
        method: "POST",
        redirect: "manual",
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          origin: BASE_URL,
          referer: detailUrl,
          "user-agent": USER_AGENT,
          ...(csrfCookie ? { cookie: `csrftoken=${csrfCookie}` } : {}),
        },
        body,
        signal,
      }).catch(() => undefined);
      const url = response?.headers.get("location") || "";
      const type = classifyShareUrl(url);
      if (!type) return undefined;
      return {
        type,
        url,
        password: form.password || extractSharePassword(url),
      } satisfies Link;
    })
  );

  const seen = new Set<string>();
  return resolved.filter((link): link is Link => {
    if (!link || seen.has(link.url)) return false;
    seen.add(link.url);
    return true;
  });
}

export class FastMediaPlugin extends BaseAsyncPlugin {
  constructor() {
    super("影视速搜", 2);
  }

  timeoutMs(): number {
    return 2600;
  }

  useKeywordVariants(): boolean {
    return false;
  }

  override async search(
    keyword: string,
    ext: Record<string, any> = {}
  ): Promise<SearchResult[]> {
    const signal = ext.signal as AbortSignal | undefined;
    const searchUrl = `${BASE_URL}/resources/?q=${encodeURIComponent(keyword)}`;
    const response = await fetch(searchUrl, {
      headers: { accept: "text/html", "user-agent": USER_AGENT },
      signal,
    }).catch(() => undefined);
    if (!response?.ok) return [];

    const $ = load(await response.text());
    const candidates: Array<{ title: string; detailUrl: string }> = [];
    $("article.resource-card").each((_, card) => {
      if (candidates.length >= 4) return;
      const node = $(card);
      const titleLink = node.find("h2 a").first();
      const title = titleLink.text().replace(/\s+/g, " ").trim();
      const detailUrl = absoluteUrl(titleLink.attr("href") || "");
      if (
        !title ||
        !detailUrl ||
        !isStrictTitleMatch(title, keyword)
      ) return;
      candidates.push({ title, detailUrl });
    });

    const detailLimit = pLimit(2);
    const results = await Promise.all(
      candidates.map((candidate) => detailLimit(async () => {
        const links = await resolveDetailLinks(candidate.detailUrl, signal);
        if (!links.length) return undefined;
        const id = candidate.detailUrl.match(/\/([^/]+)\/?$/)?.[1] || candidate.title;
        return {
          message_id: "",
          unique_id: `fast-media-${id}`,
          channel: "",
          datetime: "",
          title: candidate.title,
          content: "",
          source: "影视速搜",
          links,
        } satisfies SearchResult;
      }))
    );
    return results.filter((result): result is SearchResult => Boolean(result));
  }
}
