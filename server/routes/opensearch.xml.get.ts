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
  const searchUrl = `${siteUrl}/?q={searchTerms}`;
  const body =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<OpenSearchDescription xmlns="http://a9.com/-/spec/opensearch/1.1/">` +
    `<ShortName>好搜库</ShortName>` +
    `<Description>搜索公开网盘与磁力资源索引</Description>` +
    `<InputEncoding>UTF-8</InputEncoding>` +
    `<Image height="32" width="32" type="image/png">${escapeXml(siteUrl)}/favicon-32x32.png</Image>` +
    `<Url type="text/html" method="get" template="${escapeXml(searchUrl)}"/>` +
    `</OpenSearchDescription>`;

  setHeader(event, "content-type", "application/opensearchdescription+xml; charset=utf-8");
  setHeader(event, "cache-control", "public, max-age=86400, s-maxage=86400");
  return body;
});
