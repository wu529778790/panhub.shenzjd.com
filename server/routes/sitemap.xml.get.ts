import {
  getIndexableSeoPages,
  seoHubs,
} from "../../config/seoContent";
import {
  getMediaCatalogPath,
  mediaCatalogEntries,
} from "../../config/mediaCatalog";
import { listPublishedGeoSitemapEntries } from "../core/services/geoContentService";
import { getResourceDatabase } from "../utils/cloudflareBindings";

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const siteUrl = (config.public?.siteUrl as string) || "";
  const base = siteUrl.replace(/\/$/, "");
  const pages = getIndexableSeoPages();
  const database = getResourceDatabase(event);
  const generatedPages = database
    ? await listPublishedGeoSitemapEntries(database, 10_000)
    : [];
  const latestUpdate = [
    ...seoHubs.map((page) => page.updatedAt),
    ...pages.map((page) => page.updatedAt),
    ...generatedPages.map((page) => page.updatedAt),
  ]
    .sort()
    .at(-1) || "2026-07-22";
  const rawUrls = [
    { loc: `${base}/`, lastmod: latestUpdate },
    { loc: `${base}/media`, lastmod: "2026-07-25" },
    ...seoHubs.map((hub) => ({
      loc: `${base}${hub.path}`,
      lastmod: hub.updatedAt,
    })),
    ...mediaCatalogEntries.map((entry) => ({
      loc: `${base}${getMediaCatalogPath(entry)}`,
      lastmod: entry.updatedAt,
    })),
    ...pages.map((page) => ({
      loc: `${base}${page.path}`,
      lastmod: page.updatedAt,
    })),
    ...generatedPages.map((page) => ({
      loc: `${base}${page.path}`,
      lastmod: page.updatedAt,
    })),
  ];
  const urls = Array.from(
    new Map(rawUrls.map((url) => [url.loc, url])).values()
  );

  const body =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">` +
    urls
      .map(
        (u) =>
          `<url><loc>${escapeXml(u.loc)}</loc><lastmod>${escapeXml(u.lastmod)}</lastmod></url>`
      )
      .join("") +
    `</urlset>`;

  setHeader(event, "content-type", "application/xml; charset=utf-8");
  setHeader(event, "cache-control", "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400");
  return body;
});
