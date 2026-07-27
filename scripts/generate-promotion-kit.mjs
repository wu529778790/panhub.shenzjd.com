import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const siteUrl = String(process.env.SITE_URL || "https://haosouku.com").replace(/\/$/, "");
const outputDir = resolve(process.cwd(), "outputs/seo");
const channels = [
  { source: "zhihu", medium: "community", label: "知乎" },
  { source: "wechat", medium: "social", label: "微信" },
  { source: "xiaohongshu", medium: "social", label: "小红书" },
];

function decodeXml(value) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'");
}

function cleanText(value) {
  return String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function campaignSlug(url) {
  const path = new URL(url).pathname.replace(/^\/|\/$/g, "");
  return (path || "home").replaceAll("/", "_").replace(/[^\w-]/g, "").slice(0, 48);
}

function trackedUrl(url, source, medium) {
  const value = new URL(url);
  value.searchParams.set("utm_source", source);
  value.searchParams.set("utm_medium", medium);
  value.searchParams.set("utm_campaign", `evergreen_${campaignSlug(url)}`);
  return value.toString();
}

async function fetchText(url, accept) {
  const response = await fetch(url, {
    headers: {
      accept,
      "user-agent": "Haosouku-Promotion-Kit/1.0",
    },
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return response.text();
}

async function mapLimit(items, concurrency, mapper) {
  const output = new Array(items.length);
  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, async () => {
      while (cursor < items.length) {
        const index = cursor++;
        output[index] = await mapper(items[index]);
      }
    })
  );
  return output;
}

const sitemap = await fetchText(`${siteUrl}/sitemap.xml`, "application/xml,text/xml");
const urls = [...sitemap.matchAll(/<loc>([\s\S]*?)<\/loc>/gi)]
  .map((match) => decodeXml(match[1].trim()))
  .filter((url) => new URL(url).origin === new URL(siteUrl).origin);

const pages = await mapLimit(urls, 6, async (url) => {
  const html = await fetchText(url, "text/html");
  const title = cleanText(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]);
  const descriptionTag = [...html.matchAll(/<meta\b[^>]*>/gi)].find((match) =>
    /name=["']description["']/i.test(match[0])
  )?.[0] || "";
  const description = cleanText(
    descriptionTag.match(/content=["']([^"']*)["']/i)?.[1]
  );
  return {
    url,
    path: new URL(url).pathname,
    title,
    description,
    links: Object.fromEntries(
      channels.map((channel) => [
        channel.source,
        trackedUrl(url, channel.source, channel.medium),
      ])
    ),
  };
});

const generatedAt = new Date().toISOString();
const markdown = [
  "# 好搜库推广素材包",
  "",
  `生成时间：${generatedAt}`,
  "",
  "使用说明：只在内容真正相关的问答、文章或社群中分享对应页面。不要批量刷帖，不承诺资源永久有效。",
  "",
  ...pages.flatMap((page) => [
    `## ${page.title}`,
    "",
    page.description,
    "",
    ...channels.map(
      (channel) => `- ${channel.label}：${page.links[channel.source]}`
    ),
    "",
  ]),
].join("\n");

await mkdir(outputDir, { recursive: true });
await Promise.all([
  writeFile(
    resolve(outputDir, "promotion-kit.json"),
    `${JSON.stringify({ generatedAt, siteUrl, pages }, null, 2)}\n`,
    "utf8"
  ),
  writeFile(resolve(outputDir, "promotion-kit.md"), `${markdown}\n`, "utf8"),
]);

console.log(`Generated ${pages.length} page briefs in ${outputDir}.`);
