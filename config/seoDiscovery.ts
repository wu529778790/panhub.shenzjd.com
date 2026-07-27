export interface SeoDiscoveryLink {
  slug: string;
  path: string;
  title: string;
  summary?: string;
}

export const discoveryPlatforms: SeoDiscoveryLink[] = [
  {
    slug: "quark",
    path: "/pan/quark",
    title: "夸克网盘",
    summary: "影视、短剧、课程和电子书更新较快。",
  },
  {
    slug: "aliyun",
    path: "/pan/aliyun",
    title: "阿里云盘",
    summary: "常见高清影视、纪录片和大型资料合集。",
  },
  {
    slug: "baidu",
    path: "/pan/baidu",
    title: "百度网盘",
    summary: "考试资料、电子书、教程和旧资料较多。",
  },
  {
    slug: "115",
    path: "/pan/115",
    title: "115 网盘",
    summary: "适合继续找系列影视、原盘和音乐收藏。",
  },
  {
    slug: "xunlei",
    path: "/pan/xunlei",
    title: "迅雷云盘",
    summary: "影视、动画和近期整理的合集较常见。",
  },
  {
    slug: "uc",
    path: "/pan/uc",
    title: "UC 网盘",
    summary: "移动端短剧、影视合集和日常资料较多。",
  },
  {
    slug: "123",
    path: "/pan/123",
    title: "123 网盘",
    summary: "常见软件、设计素材和文档模板。",
  },
];

export const discoveryCategories: SeoDiscoveryLink[] = [
  { slug: "movie", path: "/category/movie", title: "电影资源" },
  { slug: "tv", path: "/category/tv", title: "电视剧资源" },
  { slug: "documentary", path: "/category/documentary", title: "纪录片资源" },
  { slug: "education", path: "/category/education", title: "学习资料" },
  { slug: "software", path: "/category/software", title: "软件工具" },
  { slug: "music", path: "/category/music", title: "音乐资源" },
  { slug: "animation", path: "/category/animation", title: "动漫资源" },
  { slug: "ebooks", path: "/category/ebooks", title: "电子书资源" },
  { slug: "design", path: "/category/design", title: "设计素材" },
];

export const discoveryTopics: SeoDiscoveryLink[] = [
  { slug: "short-drama", path: "/topic/short-drama", title: "短剧资源搜索" },
  { slug: "4k-movie", path: "/topic/4k-movie", title: "4K 电影资源搜索" },
  { slug: "comic", path: "/topic/comic", title: "漫画资源搜索" },
  { slug: "concert", path: "/topic/concert", title: "演唱会资源搜索" },
  { slug: "kaogong", path: "/topic/kaogong", title: "考公资料搜索" },
  { slug: "ielts", path: "/topic/ielts", title: "雅思学习资料搜索" },
  { slug: "data-analysis", path: "/topic/data-analysis", title: "数据分析课程搜索" },
  { slug: "python", path: "/topic/python", title: "Python 学习资源搜索" },
  { slug: "lossless-music", path: "/topic/lossless-music", title: "无损音乐搜索" },
  { slug: "photoshop-brushes", path: "/topic/photoshop-brushes", title: "Photoshop 笔刷素材搜索" },
];

export const discoveryIntents: SeoDiscoveryLink[] = [
  { slug: "quark-movie", path: "/search/quark-movie", title: "夸克网盘电影资源" },
  { slug: "quark-short-drama", path: "/search/quark-short-drama", title: "夸克网盘短剧资源" },
  { slug: "aliyun-documentary", path: "/search/aliyun-documentary", title: "阿里云盘纪录片资源" },
  { slug: "baidu-exam", path: "/search/baidu-exam", title: "百度网盘考试资料" },
  { slug: "115-movie", path: "/search/115-movie", title: "115 网盘电影资源" },
  { slug: "xunlei-animation", path: "/search/xunlei-animation", title: "迅雷云盘动漫资源" },
  { slug: "123-software", path: "/search/123-software", title: "123 网盘软件资源" },
  { slug: "pikpak-animation", path: "/search/pikpak-animation", title: "PikPak动漫资源" },
];
