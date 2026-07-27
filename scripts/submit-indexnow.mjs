const siteUrl = (process.env.SITE_URL || "https://haosouku.com").replace(/\/$/, "");
const indexNowKey = "354ab0e4f5b524289a256cffd8618500";

async function loadSitemapUrls() {
  const response = await fetch(`${siteUrl}/sitemap.xml`, {
    headers: { "user-agent": "Haosouku-SEO-Submit/1.0" },
  });
  if (!response.ok) {
    throw new Error(`sitemap returned ${response.status}`);
  }
  const xml = await response.text();
  return [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) =>
    match[1]
      .replaceAll("&amp;", "&")
      .replaceAll("&lt;", "<")
      .replaceAll("&gt;", ">")
  );
}

async function submitIndexNow(urlList) {
  const response = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      host: new URL(siteUrl).host,
      key: indexNowKey,
      keyLocation: `${siteUrl}/${indexNowKey}.txt`,
      urlList,
    }),
  });
  if (!response.ok && response.status !== 202) {
    throw new Error(`IndexNow returned ${response.status}`);
  }
  return response.status;
}

async function submitBaidu(urlList) {
  const token = process.env.BAIDU_PUSH_TOKEN;
  if (!token) return null;
  const response = await fetch(
    `https://data.zz.baidu.com/urls?site=${encodeURIComponent(siteUrl)}&token=${encodeURIComponent(token)}`,
    {
      method: "POST",
      headers: { "content-type": "text/plain" },
      body: urlList.join("\n"),
    }
  );
  if (!response.ok) {
    throw new Error(`Baidu push returned ${response.status}`);
  }
  return response.json();
}

try {
  const urlList = await loadSitemapUrls();
  if (urlList.length === 0) throw new Error("sitemap contains no URLs");
  const indexNowStatus = await submitIndexNow(urlList);
  const baiduResult = await submitBaidu(urlList);
  console.log(`Submitted ${urlList.length} URLs to IndexNow (${indexNowStatus}).`);
  if (baiduResult) console.log("Submitted URLs to Baidu.");
} catch (error) {
  console.warn(`SEO submission skipped: ${error instanceof Error ? error.message : String(error)}`);
}
