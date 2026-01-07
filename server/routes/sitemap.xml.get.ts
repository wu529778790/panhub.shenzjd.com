import { defineEventHandler, setHeader } from 'h3';

export default defineEventHandler((event) => {
  const config = useRuntimeConfig();
  const siteUrl = (config.public?.siteUrl as string) || "";
  const base = siteUrl.replace(/\/$/, "");
  const today = new Date().toISOString().split("T")[0];

  const urls = [
    { loc: `${base}/`, priority: 0.9 },
    { loc: `${base}/api`, priority: 0.3 },
  ];

  const body =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">` +
    urls
      .map(
        (u) =>
          `<url><loc>${
            u.loc
          }</loc><lastmod>${today}</lastmod><changefreq>daily</changefreq><priority>${u.priority.toFixed(
            1
          )}</priority></url>`
      )
      .join("") +
    `</urlset>`;

  setHeader(event, "content-type", "application/xml; charset=utf-8");
  return body;
});
