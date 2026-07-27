import { describe, expect, it } from "vitest";
import {
  extractLinkedMarkdownPaths,
  parseApiResourcePage,
  parseCatalogDocument,
  parseOpenDataFeed,
} from "../../cloudflare/resource-sync/src/catalog";
import {
  parsePublicDetailPage,
  parseSitemapUrls,
} from "../../cloudflare/resource-sync/src/feed";

describe("resource catalog parser", () => {
  it("parses public paginated API rows and ignores unsupported URLs", () => {
    const page = parseApiResourcePage({
      success: true,
      code: 200,
      data: {
        page: 1,
        page_size: 100,
        total: 219737,
        data: [
          {
            title: "三体 4K",
            url: "https://pan.quark.cn/s/quark123",
            updated_at: "2026-07-23 03:13:21",
          },
          {
            title: "三体 115版",
            url: "https://115cdn.com/s/share115?password=8888",
          },
          {
            title: "三体 123版",
            url: "https://123pan.cn/s/share123?pwd=xoxo",
          },
          { title: "广告", url: "https://example.com/ad" },
        ],
      },
    });

    expect(page).toMatchObject({
      page: 1,
      pageSize: 100,
      total: 219737,
      headUpdatedAt: "2026-07-23 03:13:21",
    });
    expect(page.items.map((item) => item.type)).toEqual([
      "quark",
      "115",
      "123",
    ]);
    expect(page.items[1]).toMatchObject({ password: "8888" });
  });

  it("parses list, URL-first and metadata-block formats", () => {
    const items = parseCatalogDocument(
      `# 影视资料
- 三体 4K-超过100T资料总站网站-doc.869hr.uk | https://pan.quark.cn/s/abc123?pwd=k9x2
https://115cdn.com/s/share001?password=sa53 豆瓣|TOP250电影_1.67TB
> **资源名**：流浪地球 4K
> **网盘链接**：\`https://pan.baidu.com/s/share002?pwd=8abc\``,
      { category: "影视" }
    );

    expect(items).toHaveLength(3);
    expect(items[0]).toMatchObject({
      type: "quark",
      password: "k9x2",
      title: "三体 4K",
    });
    expect(items[1]).toMatchObject({ type: "115", password: "sa53" });
    expect(items[1].title).toContain("TOP250电影");
    expect(items[2]).toMatchObject({
      type: "baidu",
      password: "8abc",
      title: "流浪地球 4K",
    });
  });

  it("parses public Markdown table rows used by the daily archive", () => {
    const items = parseCatalogDocument(
      `| 资源名称 | 分类 | 分享地址 | 更新时间 |
       | --- | --- | --- | --- |
       | J九个弹孔2026 | 国产剧集 | https://pan.baidu.com/s/abc123?pwd=6666 | 2026-07-22 |`,
      { category: "影视与阅读" }
    );

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      type: "baidu",
      password: "6666",
    });
    expect(items[0].title).toContain("九个弹孔2026");
  });

  it("uses frontmatter and section context for multi-link documents", () => {
    const items = parseCatalogDocument(
      `---
title: Lastman
---
**第一季**
[☁️百度](https://pan.baidu.com/s/one?pwd=npko) [☁️迅雷](https://pan.xunlei.com/s/two?pwd=w85d) [🧲磁力链接](magnet:?xt=urn:btih:43d59f11717c37635e0a6db69367f4f21ee11e08)`,
      { category: "动画" }
    );

    expect(items.map((item) => item.type)).toEqual(["baidu", "xunlei", "magnet"]);
    expect(items.every((item) => item.title.includes("Lastman"))).toBe(true);
  });

  it("keeps all content categories during import", () => {
    const items = parseCatalogDocument(
      `# 合集
- 正常动画 https://pan.quark.cn/s/safe001
- XXX无码成人影片 https://pan.quark.cn/s/blocked01`,
      { category: "动画" }
    );
    expect(items).toHaveLength(2);
    expect(items[0].title).toContain("正常动画");
    expect(items[1].title).toContain("成人影片");
  });

  it("extracts only safe relative markdown paths", () => {
    expect(
      extractLinkedMarkdownPaths(
        "[202607](202607.md) [外部](https://example.com/a.md) [越级](../x.md)"
      )
    ).toEqual(["202607.md"]);
  });

  it("parses and deduplicates the rolling open-data feed", () => {
    const items = parseOpenDataFeed({
      code: 200,
      Data: [
        {
          ScrName: "疯 狂 动 物 城 2",
          Scrurl: "https://pan.quark.cn/s/abc123",
          Scrpass: null,
        },
        {
          ScrName: "疯狂动物城 2 4K",
          Scrurl: "https://pan.quark.cn/s/abc123",
          Scrpass: "k9x2",
        },
        {
          ScrName: "成人影片",
          Scrurl: "https://pan.quark.cn/s/blocked",
        },
        { ScrName: "无效站点", Scrurl: "https://example.com/file" },
      ],
    });

    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      type: "quark",
      password: "k9x2",
      title: "疯狂动物城 2 4K",
      category: "实时分享",
    });
    expect(items[1]).toMatchObject({
      type: "quark",
      title: "成人影片",
      category: "实时分享",
    });
  });

  it("keeps only same-origin public detail pages from a sitemap", () => {
    const urls = parseSitemapUrls(
      `<?xml version="1.0"?>
      <urlset>
        <url><loc>https://dagehao889.cn/d/10778.html</loc></url>
        <url><loc>https://dagehao889.cn/s/三体.html</loc></url>
        <url><loc>https://tracker.example/d/10777.html</loc></url>
      </urlset>`,
      "https://dagehao889.cn",
      /^\/d\/\d+\.html$/
    );

    expect(urls).toEqual(["https://dagehao889.cn/d/10778.html"]);
  });

  it("parses the namespace and paths used by the Fuxipan sitemap index", () => {
    const urls = parseSitemapUrls(
      `<?xml version="1.0" encoding="UTF-8"?>
       <sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
         <sitemap><loc>https://fuxipan.com/sitemaps/sitemap-1.xml</loc></sitemap>
         <sitemap><loc>https://fuxipan.com/sitemaps/sitemap-279.xml</loc></sitemap>
       </sitemapindex>`,
      "https://fuxipan.com",
      /^\/sitemaps\/sitemap-\d+\.xml$/
    );

    expect(urls).toEqual([
      "https://fuxipan.com/sitemaps/sitemap-1.xml",
      "https://fuxipan.com/sitemaps/sitemap-279.xml",
    ]);
  });

  it("rewrites a known stale sitemap origin without accepting other hosts", () => {
    const urls = parseSitemapUrls(
      `<urlset>
        <url><loc>http://208.92.225.208:8888/d/20660.html</loc></url>
        <url><loc>https://tracker.example/d/20659.html</loc></url>
      </urlset>`,
      "https://www.zlxapp.top",
      /^\/d\/\d+\.html$/,
      "http://208.92.225.208:8888"
    );

    expect(urls).toEqual(["https://www.zlxapp.top/d/20660.html"]);
  });

  it("extracts titled direct links from public detail pages", () => {
    const items = parsePublicDetailPage(
      `<title>资源标题：杀人者的购物中心2 资源描述：测试 - 海豚搜索</title>
       <a href="https://pan.quark.cn/s/abc123">夸克</a>
       <a href="https://pan.baidu.com/s/share002?pwd=8abc">百度</a>
       <script>go('https://pan.quark.cn/s/abc123','')</script>`,
      "影视与短剧"
    );

    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      type: "quark",
      title: "杀人者的购物中心2",
    });
    expect(items[1]).toMatchObject({
      type: "baidu",
      password: "8abc",
    });
  });

  it("removes the public source brand from detail-page titles", () => {
    const items = parsePublicDetailPage(
      `<title>迅雷会员版(1) - 小鸡窝</title>
       <a href="https://pan.quark.cn/s/77f3fa798574">夸克</a>`,
      "影视与软件"
    );

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      type: "quark",
      title: "迅雷会员版(1)",
    });
  });

  it("cleans titles from the newly audited public indexes", () => {
    const items = parsePublicDetailPage(
      `<h1>名称：三体 全集 - 爱搜-网盘资源搜索</h1>
       <a href="https://pan.baidu.com/s/share003?pwd=8abc">百度</a>`,
      "综合资源"
    );

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      type: "baidu",
      title: "三体 全集",
      password: "8abc",
    });
  });

  it("extracts links exposed in public JSON with escaped slashes", () => {
    const items = parsePublicDetailPage(
      `<title>野狗骨头_电视剧 - 热门资源</title>
       <script>const detailData = {
         "url":"https:\\/\\/pan.baidu.com\\/s\\/abc123?pwd=8888",
         "links":[{"url":"https:\\/\\/drive.uc.cn\\/s\\/uc123?public=1"}]
       };</script>`,
      "影视"
    );

    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ type: "baidu", password: "8888" });
    expect(items[1]).toMatchObject({ type: "uc" });
    expect(items[0].title).toBe("野狗骨头 电视剧");
  });

  it("skips public detail rows that the source marks as deleted", () => {
    const items = parsePublicDetailPage(
      `<title>已失效资源 - KK网盘搜</title>
       <script>var jsonData = '{"title":"已失效资源","url":"https:\\/\\/pan.quark.cn\\/s\\/dead123","is_delete":1}';</script>`,
      "综合资源"
    );

    expect(items).toEqual([]);
  });

  it("ignores platform homepages and can keep only the primary page item", () => {
    const items = parsePublicDetailPage(
      `<title>江海潮生 更06 [2026] - 盘小子</title>
       <a href="https://pan.quark.cn">夸克官网</a>
       <script>
         const primary = { url: "https://pan.quark.cn/s/primary" };
         const related = { url: "https://pan.quark.cn/s/related" };
       </script>`,
      "综合资源",
      1
    );

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      title: "江海潮生 更06 [2026]",
      url: "https://pan.quark.cn/s/primary",
    });
  });

  it("selects the current SSR resource instead of an earlier listing item", () => {
    const items = parsePublicDetailPage(
      `<title>江海潮生 更06 [2026] - 盘小子</title>
       <script>
         const page = {
           resources: [
             { pinyin:"361685",url:"https://pan.quark.cn/s/unrelated" },
             { pinyin:"361684",url:"https://pan.quark.cn/s/current" }
           ],
           resource: {
             pinyin:"361684",
             diskList:[{ externalUrl:"https://pan.quark.cn/s/current" }]
           }
         };
       </script>`,
      "综合资源",
      1,
      "361684"
    );

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      title: "江海潮生 更06 [2026]",
      url: "https://pan.quark.cn/s/current",
    });
  });
});
