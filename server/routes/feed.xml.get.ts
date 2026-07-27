import {
  getIndexableSeoPages,
  seoHubs,
} from "../../config/seoContent";
import {
  getMediaCatalogPath,
  getMediaDescription,
  getMediaSeoTitle,
  mediaCatalogEntries,
} from "../../config/mediaCatalog";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export default defineEventHandler((event) => {
  const config = useRuntimeConfig(event);
  const siteUrl = String(config.public?.siteUrl || "https://haosouku.com")
    .replace(/\/$/, "");
  const entries = [
    {
      path: "/media",
      title: "电影电视剧网盘资源搜索资料库 - 好搜库",
      summary: "按具体片名查看高评分电影和近期电视剧的网盘搜索写法。",
      updatedAt: "2026-07-25",
    },
    ...mediaCatalogEntries.map((entry) => ({
      path: getMediaCatalogPath(entry),
      title: getMediaSeoTitle(entry),
      summary: getMediaDescription(entry),
      updatedAt: entry.updatedAt,
    })),
    ...seoHubs.map((page) => ({
      path: page.path,
      title: page.seoTitle,
      summary: page.description,
      updatedAt: page.updatedAt,
    })),
    ...getIndexableSeoPages().map((page) => ({
      path: page.path,
      title: page.seoTitle,
      summary: page.description,
      updatedAt: page.updatedAt,
    })),
  ]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.path.localeCompare(b.path))
    .slice(0, 40);
  const updated = entries[0]?.updatedAt || "2026-07-22";
  const feedUrl = `${siteUrl}/feed.xml`;
  const body =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<feed xmlns="http://www.w3.org/2005/Atom">` +
    `<id>${escapeXml(siteUrl)}/</id>` +
    `<title>好搜库搜索指南与专题</title>` +
    `<subtitle>网盘平台、资源分类、专题与搜索方法更新</subtitle>` +
    `<link href="${escapeXml(siteUrl)}/"/>` +
    `<link href="${escapeXml(feedUrl)}" rel="self" type="application/atom+xml"/>` +
    `<updated>${escapeXml(updated)}T00:00:00+08:00</updated>` +
    entries
      .map((entry) => {
        const url = `${siteUrl}${entry.path}`;
        return (
          `<entry>` +
          `<id>${escapeXml(url)}</id>` +
          `<title>${escapeXml(entry.title)}</title>` +
          `<link href="${escapeXml(url)}"/>` +
          `<updated>${escapeXml(entry.updatedAt)}T00:00:00+08:00</updated>` +
          `<summary>${escapeXml(entry.summary)}</summary>` +
          `</entry>`
        );
      })
      .join("") +
    `</feed>`;

  setHeader(event, "content-type", "application/atom+xml; charset=utf-8");
  setHeader(event, "cache-control", "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400");
  return body;
});
