import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const outputDir = resolve(process.cwd(), "outputs/seo");
const seeds = [
  ...[
    "夸克网盘",
    "阿里云盘",
    "百度网盘",
    "115网盘",
    "迅雷云盘",
    "UC网盘",
    "123网盘",
    "天翼云盘",
    "移动云盘",
    "PikPak",
    "蓝奏云",
  ].map((term) => ({ term, cluster: "网盘平台" })),
  ...[
    "视频素材",
    "音效素材",
    "字体素材",
    "图标素材",
    "Photoshop笔刷",
    "Procreate笔刷",
    "纹理素材",
    "背景素材",
    "摄影RAW素材",
    "音乐制作素材",
    "无损音效",
    "Figma UI素材",
    "PSD样机",
    "AE模板",
    "PR模板",
    "LUT调色预设",
    "Lightroom预设",
    "CAD图纸",
    "3D模型素材",
    "简历模板",
    "Excel表格模板",
    "合同模板",
    "教案课件",
    "电商设计素材",
    "演示图表素材",
  ].map((term) => ({ term, cluster: "素材模板" })),
  ...[
    "英语学习资料",
    "日语学习资料",
    "雅思资料",
    "托福资料",
    "四六级资料",
    "会计考试资料",
    "法考资料",
    "建造师资料",
    "医学考试资料",
    "数据分析课程",
    "人工智能课程",
    "产品经理资料",
    "小学学习资料",
    "初中学习资料",
    "高中学习资料",
  ].map((term) => ({ term, cluster: "学习考试" })),
  ...[
    "Word模板",
    "思维导图模板",
    "Notion模板",
    "论文模板",
    "行业报告资料",
    "标准规范资料",
    "技术手册",
    "面试题资料",
  ].map((term) => ({ term, cluster: "办公文档" })),
  ...[
    "电影字幕资源",
    "影视原声资源",
    "演唱会资源",
    "广播剧资源",
    "儿童绘本资源",
    "漫画资源搜索",
    "纪录片资源搜索",
    "短剧资源搜索",
    "老电影资源搜索",
  ].map((term) => ({ term, cluster: "影音阅读" })),
  ...[
    "网盘搜索引擎",
    "网盘资源搜索",
    "电影资源搜索",
    "电视剧资源搜索",
    "学习资料搜索",
    "软件资源搜索",
    "无损音乐搜索",
    "动漫资源搜索",
    "电子书资源搜索",
    "磁力资源搜索",
    "网盘精确搜索",
    "网盘模糊搜索",
    "网盘文件名搜索",
    "网盘链接失效",
    "网盘资源搜不到",
    "网盘资源版本",
  ].map((term) => ({ term, cluster: "搜索需求" })),
];

const blockedPattern =
  /破解|激活码|会员|svip|不限速|解析|分享群|资源群|论坛|盗版|免登录|账号|客服电话|官网|登录入口|网页版入口|扩容|app下载|电脑版下载|官方下载|免费下载|下载网站|网站免费|下载器|下载$|神器|国家网站/i;
const intentPattern =
  /搜索|资源|资料|素材|模板|教程|课程|真题|题库|文档|手册|报告|标准|规范|电子书|绘本|漫画|电影|电视剧|短剧|纪录片|字幕|演唱会|广播剧|动漫|音乐|音效|字体|图标|笔刷|样机|预设|图纸|模型|课件|网盘|磁力|失效|版本/i;

function cleanTerm(value) {
  return String(value || "")
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

async function fetchBuffer(url) {
  const response = await fetch(url, {
    headers: {
      accept: "application/json,text/javascript,*/*",
      "user-agent": "Haosouku-Keyword-Research/1.0",
    },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.arrayBuffer();
}

async function fetchJson(url, encoding = "utf-8") {
  const buffer = await fetchBuffer(url);
  const text = new TextDecoder(encoding).decode(buffer);
  return JSON.parse(text);
}

const providers = [
  {
    name: "bing",
    async suggest(term) {
      const data = await fetchJson(
        `https://api.bing.com/osjson.aspx?query=${encodeURIComponent(term)}`
      );
      return Array.isArray(data?.[1]) ? data[1] : [];
    },
  },
  ...(process.env.SEO_GOOGLE_SUGGESTIONS === "1"
    ? [{
        name: "google",
        async suggest(term) {
          const data = await fetchJson(
            `https://suggestqueries.google.com/complete/search?client=firefox&hl=zh-CN&q=${encodeURIComponent(term)}`
          );
          return Array.isArray(data?.[1]) ? data[1] : [];
        },
      }]
    : []),
  {
    name: "360",
    async suggest(term) {
      const data = await fetchJson(
        `https://sug.so.360.cn/suggest?word=${encodeURIComponent(term)}&encodein=utf-8&encodeout=utf-8`
      );
      return Array.isArray(data?.result)
        ? data.result.map((item) => item?.word)
        : [];
    },
  },
  {
    name: "baidu",
    async suggest(term) {
      const data = await fetchJson(
        `https://suggestion.baidu.com/su?wd=${encodeURIComponent(term)}&action=opensearch`,
        "gbk"
      );
      return Array.isArray(data?.[1]) ? data[1] : [];
    },
  },
];

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

const tasks = seeds.flatMap((seed) =>
  providers.map((provider) => ({ seed, provider }))
);
const providerStatus = new Map(
  providers.map((provider) => [
    provider.name,
    { requests: 0, successes: 0, failures: 0 },
  ])
);

const results = await mapLimit(tasks, 6, async ({ seed, provider }) => {
  const status = providerStatus.get(provider.name);
  status.requests += 1;
  try {
    const suggestions = (await provider.suggest(seed.term))
      .map(cleanTerm)
      .filter(Boolean);
    status.successes += 1;
    return { seed, provider: provider.name, suggestions, error: "" };
  } catch (error) {
    status.failures += 1;
    return {
      seed,
      provider: provider.name,
      suggestions: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
});

const candidates = new Map();
for (const result of results) {
  for (const term of result.suggestions) {
    if (
      term.length < 3 ||
      term.length > 40 ||
      blockedPattern.test(term) ||
      !intentPattern.test(term)
    ) {
      continue;
    }
    const key = term.toLocaleLowerCase("zh-CN");
    const current = candidates.get(key) || {
      term,
      clusters: new Set(),
      seeds: new Set(),
      sources: new Set(),
    };
    current.clusters.add(result.seed.cluster);
    current.seeds.add(result.seed.term);
    current.sources.add(result.provider);
    candidates.set(key, current);
  }
}

const opportunities = [...candidates.values()]
  .map((item) => {
    const sourceCount = item.sources.size;
    const score =
      sourceCount * 100 +
      (item.term.includes("搜索") ? 18 : 0) +
      (item.term.includes("资源") ? 14 : 0) +
      (item.term.includes("素材") ? 12 : 0) +
      (item.term.includes("网盘") ? 10 : 0) -
      Math.max(0, item.term.length - 16);
    return {
      term: item.term,
      score,
      sourceCount,
      sources: [...item.sources].sort(),
      clusters: [...item.clusters].sort(),
      seeds: [...item.seeds].sort(),
    };
  })
  .sort(
    (a, b) =>
      b.score - a.score ||
      b.sourceCount - a.sourceCount ||
      a.term.localeCompare(b.term, "zh-CN")
  );

const generatedAt = new Date().toISOString();
const statusRows = [...providerStatus.entries()].map(([provider, status]) => ({
  provider,
  ...status,
}));
const markdown = [
  "# 好搜库长尾关键词机会",
  "",
  `生成时间：${generatedAt}`,
  "",
  "数据来自公开搜索建议，只表示建议词在多个搜索引擎中出现，不代表搜索量或排名。已过滤登录、破解、会员、解析等与本站功能无关或风险较高的词。",
  "",
  "## 抓取状态",
  "",
  "| 来源 | 请求 | 成功 | 失败 |",
  "| --- | ---: | ---: | ---: |",
  ...statusRows.map(
    (item) =>
      `| ${item.provider} | ${item.requests} | ${item.successes} | ${item.failures} |`
  ),
  "",
  "## 优先机会",
  "",
  "| 关键词 | 来源数 | 来源 | 关联种子 |",
  "| --- | ---: | --- | --- |",
  ...opportunities
    .slice(0, 200)
    .map(
      (item) =>
        `| ${item.term.replaceAll("|", " ")} | ${item.sourceCount} | ${item.sources.join("、")} | ${item.seeds.slice(0, 3).join("、")} |`
    ),
  "",
].join("\n");

await mkdir(outputDir, { recursive: true });
await Promise.all([
  writeFile(
    resolve(outputDir, "keyword-opportunities.json"),
    `${JSON.stringify(
      {
        generatedAt,
        seedCount: seeds.length,
        providerStatus: statusRows,
        opportunityCount: opportunities.length,
        opportunities,
      },
      null,
      2
    )}\n`,
    "utf8"
  ),
  writeFile(
    resolve(outputDir, "keyword-opportunities.md"),
    `${markdown}\n`,
    "utf8"
  ),
]);

console.log(
  `Collected ${opportunities.length} filtered opportunities from ${seeds.length} seeds.`
);
