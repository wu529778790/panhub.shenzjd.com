import { getTopicVisual } from "./topicVisuals";
import type { SeoKeywordGroup, SeoPage } from "./seoContent";

interface PlatformIntentProfile {
  slug: string;
  name: string;
  pagePath: string;
  strengths: string;
  searchTip: string;
  accessNote: string;
  contentSlugs: string[];
}

interface ContentIntentProfile {
  slug: string;
  name: string;
  query: string;
  categoryPath: string;
  topicPath: string;
  visualSlug: string;
  summary: string;
  searchAdvice: string;
  qualityCheck: string;
  exampleA: string;
  exampleB: string;
}

const UPDATED_AT = "2026-07-25";
export const INTENT_LONG_TAIL_KEYWORD_TARGET = 5000;

const longTailSubjects: Record<string, string[]> = {
  movie: [
    "4K电影",
    "高清电影",
    "蓝光电影",
    "REMUX电影",
    "经典电影",
    "高分电影",
    "华语电影",
    "欧美电影",
    "韩国电影",
    "日本电影",
    "动画电影",
    "中文字幕电影",
    "电影合集",
  ],
  tv: [
    "国产电视剧",
    "美剧",
    "英剧",
    "韩国电视剧",
    "日剧",
    "热门电视剧",
    "悬疑电视剧",
    "古装电视剧",
    "完结电视剧",
    "电视剧全集",
    "高清电视剧",
    "中文字幕电视剧",
    "电视剧合集",
  ],
  "short-drama": [
    "热门短剧",
    "古装短剧",
    "都市短剧",
    "悬疑短剧",
    "甜宠短剧",
    "逆袭短剧",
    "重生短剧",
    "短剧全集",
    "完结短剧",
    "竖屏短剧",
    "高清短剧",
    "短剧合集",
    "短剧完整版",
  ],
  documentary: [
    "BBC纪录片",
    "NHK纪录片",
    "历史纪录片",
    "自然纪录片",
    "人文纪录片",
    "科学纪录片",
    "社会纪录片",
    "旅行纪录片",
    "纪录片全集",
    "纪录片合集",
    "4K纪录片",
    "中文字幕纪录片",
    "经典纪录片",
  ],
  education: [
    "Python课程",
    "AI课程",
    "编程课程",
    "英语课程",
    "日语课程",
    "办公软件课程",
    "设计课程",
    "摄影课程",
    "数据分析课程",
    "职业技能课程",
    "公开课",
    "视频教程",
    "课程配套资料",
  ],
  exam: [
    "公务员考试资料",
    "考研资料",
    "教师资格证资料",
    "法考资料",
    "建造师资料",
    "会计考试资料",
    "四六级资料",
    "雅思资料",
    "托福资料",
    "事业编资料",
    "专升本资料",
    "高考资料",
    "考试真题",
  ],
  ebooks: [
    "EPUB电子书",
    "PDF电子书",
    "MOBI电子书",
    "Kindle电子书",
    "文学电子书",
    "历史电子书",
    "经管电子书",
    "计算机电子书",
    "外语电子书",
    "漫画电子书",
    "有声书",
    "电子书合集",
    "扫描版图书",
  ],
  software: [
    "Windows软件",
    "macOS软件",
    "Android软件",
    "办公软件",
    "设计软件",
    "开发工具",
    "视频剪辑软件",
    "音频软件",
    "系统工具",
    "开源软件",
    "绿色软件",
    "软件安装包",
    "软件教程",
  ],
  music: [
    "FLAC无损音乐",
    "APE无损音乐",
    "WAV无损音乐",
    "Hi-Res音乐",
    "华语音乐",
    "欧美音乐",
    "日韩音乐",
    "古典音乐",
    "影视原声",
    "音乐专辑",
    "演唱会音频",
    "无损音乐合集",
    "音乐现场",
  ],
  animation: [
    "日本动漫",
    "国产动漫",
    "欧美动画",
    "动漫剧场版",
    "动漫全集",
    "完结动漫",
    "高清动漫",
    "4K动漫",
    "中文字幕动漫",
    "双语动漫",
    "动漫合集",
    "经典动漫",
    "新番动漫",
  ],
  design: [
    "PSD素材",
    "AI矢量素材",
    "Figma素材",
    "Sketch素材",
    "AE模板",
    "PR模板",
    "PPT模板",
    "字体素材",
    "图标素材",
    "UI设计素材",
    "海报素材",
    "电商素材",
    "视频素材",
  ],
};

const longTailPatterns = [
  {
    label: "直接搜索",
    description: "平台名称放在前面，适合已经确定网盘和内容类型时直接搜索。",
    build: (platform: string, subject: string) => `${platform}${subject}搜索`,
  },
  {
    label: "资源写法",
    description: "先写具体内容，再补网盘平台，用于强调文件和资源类型。",
    build: (platform: string, subject: string) => `${subject}${platform}资源`,
  },
  {
    label: "分享线索",
    description: "适合查找公开分享线索，打开后仍要核对目录、版本和链接状态。",
    build: (platform: string, subject: string) => `${platform}${subject}分享`,
  },
  {
    label: "查找问题",
    description: "用自然问题表达需求，适合不确定关键词顺序时参考。",
    build: (platform: string, subject: string) => `${platform}${subject}怎么找`,
  },
  {
    label: "搜索入口",
    description: "内容名称放在前面，适合从搜索入口继续按平台筛选结果。",
    build: (platform: string, subject: string) => `${subject}${platform}资源搜索`,
  },
] as const;

const platformProfiles: PlatformIntentProfile[] = [
  {
    slug: "quark",
    name: "夸克网盘",
    pagePath: "/pan/quark",
    strengths: "夸克公开分享更新较快，影视、短剧、课程和电子书的结果通常比较集中，适合先看近期来源。",
    searchTip: "搜索时先保留作品或资料的准确名称，结果太多再加年份、季数、讲师或文件格式。",
    accessNote: "夸克分享可能要求登录客户端。出现登录提示不等于链接失效，仍需进入文件列表确认目录和权限。",
    contentSlugs: [
      "movie",
      "tv",
      "short-drama",
      "documentary",
      "education",
      "exam",
      "ebooks",
      "software",
      "music",
      "animation",
      "design",
    ],
  },
  {
    slug: "aliyun",
    name: "阿里云盘",
    pagePath: "/pan/aliyun",
    strengths: "阿里云盘常见体积较大的高清影视、纪录片和整套资料，文件名里的清晰度、编码和目录信息较有参考价值。",
    searchTip: "先写核心名称，再按需要补充年份、版本、出版社、软件版本或画质，不要一次堆入多个近义词。",
    accessNote: "阿里云盘链接可能因发布者调整权限或目录而变化。打开后应以当前文件列表为准，不只看索引标题。",
    contentSlugs: [
      "movie",
      "tv",
      "documentary",
      "education",
      "exam",
      "ebooks",
      "software",
      "music",
      "animation",
      "design",
    ],
  },
  {
    slug: "baidu",
    name: "百度网盘",
    pagePath: "/pan/baidu",
    strengths: "百度网盘公开索引时间跨度较大，旧影视、教材、考试资料、电子书和软件教程往往能找到多个年份的版本。",
    searchTip: "年份、地区、作者、出版社和版本号很重要。带提取码的结果要把链接与提取信息一起保留。",
    accessNote: "年代较早的分享更容易出现取消、改名或提取码缺失。优先比较发布时间较新且目录描述完整的结果。",
    contentSlugs: [
      "movie",
      "tv",
      "short-drama",
      "documentary",
      "education",
      "exam",
      "ebooks",
      "software",
      "music",
      "animation",
      "design",
    ],
  },
  {
    slug: "115",
    name: "115 网盘",
    pagePath: "/pan/115",
    strengths: "115 公开线索比较分散，但完整剧集、电影原盘、年代收藏、无损音乐和动画合集里经常能补到不同版本。",
    searchTip: "作品名应尽量完整，影视加年份或季数，音乐加歌手、专辑与格式，避免只搜索宽泛的平台词。",
    accessNote: "部分 115 分享需要客户端继续访问。登录提示、客户端提示和分享取消是不同状态，不应直接混为失效。",
    contentSlugs: [
      "movie",
      "tv",
      "documentary",
      "ebooks",
      "music",
      "animation",
    ],
  },
  {
    slug: "xunlei",
    name: "迅雷云盘",
    pagePath: "/pan/xunlei",
    strengths: "迅雷云盘较常出现近期影视、连载动画、短剧和软件资料，标题中常带集数、画质或文件版本。",
    searchTip: "片名较短时补充年份、主演或季数，软件补充准确版本和系统，先保证核心名称没有写错。",
    accessNote: "有些链接只能在迅雷客户端里查看完整状态。应核对分享页提示和文件目录，再判断是否可用。",
    contentSlugs: [
      "movie",
      "tv",
      "short-drama",
      "documentary",
      "software",
      "music",
      "animation",
    ],
  },
  {
    slug: "uc",
    name: "UC 网盘",
    pagePath: "/pan/uc",
    strengths: "UC 网盘的公开分享偏向移动端传播，短剧、热播剧、动画和日常学习资料较常见。",
    searchTip: "短剧可加主演或完结状态，课程和资料加年份、科目，结果少时先去掉平台名称再搜索内容。",
    accessNote: "UC 分享经常跳到移动端或登录页。先确认地址属于官方服务，再核对目录，不在第三方页面填写账号信息。",
    contentSlugs: [
      "movie",
      "tv",
      "short-drama",
      "education",
      "exam",
      "ebooks",
      "animation",
    ],
  },
  {
    slug: "123",
    name: "123 网盘",
    pagePath: "/pan/123",
    strengths: "123 网盘常用于软件、设计素材、文档模板、电子书和体积适中的学习资料包。",
    searchTip: "软件写清版本、系统和架构，模板写明用途与格式，考试资料写年份和科目，减少无关结果。",
    accessNote: "涉及安装包、脚本和压缩文件时，要回到官方来源核对版本，并使用系统安全工具检查文件。",
    contentSlugs: [
      "education",
      "exam",
      "ebooks",
      "software",
      "music",
      "design",
    ],
  },
  {
    slug: "tianyi",
    name: "天翼云盘",
    pagePath: "/pan/tianyi",
    strengths: "天翼云盘公开分享中常见纪录片、课程、行业资料、电子书和长期保存的影音合集。",
    searchTip: "纪录片写系列名和出品机构，课程写讲师或年份，资料写科目与格式，再从结果中筛选平台。",
    accessNote: "天翼分享可能要求登录或客户端打开。页面能访问但需要身份确认时，不应直接判定文件已经消失。",
    contentSlugs: [
      "movie",
      "tv",
      "documentary",
      "education",
      "exam",
      "ebooks",
      "music",
    ],
  },
  {
    slug: "mobile",
    name: "移动云盘",
    pagePath: "/pan/mobile",
    strengths: "移动云盘公开索引主要覆盖学习资料、考试文件、电子文档、软件资料和日常整理包。",
    searchTip: "使用资料准确名称并补充年份、地区、科目或文件格式，平台名称放在最后作为筛选条件。",
    accessNote: "部分分享会进入移动端登录流程。打开前先核对官方域名，不在来源不明的页面输入验证码。",
    contentSlugs: [
      "education",
      "exam",
      "ebooks",
      "software",
      "design",
    ],
  },
  {
    slug: "pikpak",
    name: "PikPak",
    pagePath: "/pan/pikpak",
    strengths: "PikPak 分享常见影视、动画、电子书和磁力转存内容，文件标题可能使用英文名、罗马音或原始文件名。",
    searchTip: "中文译名没有结果时，可分别尝试英文原名、常见别名和年份，避免把多个名称塞进同一次搜索。",
    accessNote: "PikPak 链接可能要求客户端打开。涉及磁力转存时还要核对文件大小、格式和目录，不执行陌生脚本。",
    contentSlugs: [
      "movie",
      "tv",
      "documentary",
      "ebooks",
      "music",
      "animation",
    ],
  },
  {
    slug: "lanzou",
    name: "蓝奏云",
    pagePath: "/pan/lanzou",
    strengths: "蓝奏云更适合软件、插件、小型素材、电子书和压缩资料，文件体积通常不大，但版本变化较快。",
    searchTip: "优先写软件、插件或资料的准确名称，再加版本号、系统、架构或文件格式，不用宽泛宣传词。",
    accessNote: "蓝奏云常见压缩包和可执行文件。下载前应核对发布来源、文件名和版本，并进行安全检查。",
    contentSlugs: [
      "education",
      "ebooks",
      "software",
      "music",
      "design",
    ],
  },
];

const contentProfiles: ContentIntentProfile[] = [
  {
    slug: "movie",
    name: "电影资源",
    query: "电影资源",
    categoryPath: "/category/movie",
    topicPath: "/topic/4k-movie",
    visualSlug: "4k-movie",
    summary: "电影搜索需要区分同名作品、上映年份、清晰度、字幕、音轨和压制版本。",
    searchAdvice: "先用片名和上映年份建立精确范围，同名作品再补导演或主演，需要高清版本时再加 4K、HDR、REMUX 或 2160P。",
    qualityCheck: "打开结果后核对片长、画面规格、音轨、字幕、文件大小和目录，标题里的“高清”不能代替实际版本信息。",
    exampleA: "4K电影资源",
    exampleB: "电影字幕资源",
  },
  {
    slug: "tv",
    name: "电视剧资源",
    query: "电视剧资源",
    categoryPath: "/category/tv",
    topicPath: "/topic/korean-drama",
    visualSlug: "korean-drama",
    summary: "电视剧搜索要写清剧名、年份、季数、集数和完结状态，连载内容还要看目录更新时间。",
    searchAdvice: "国产剧可补播出年份，海外剧补英文名和季数，系列作品写明具体一季，避免把不同版本混到一起。",
    qualityCheck: "打开后查看最新集数、单集时长、字幕或配音、文件命名和目录更新时间，不能只根据“全集”判断完整度。",
    exampleA: "电视剧全集",
    exampleB: "电视剧完结资源",
  },
  {
    slug: "short-drama",
    name: "短剧资源",
    query: "短剧资源",
    categoryPath: "/category/tv",
    topicPath: "/topic/short-drama",
    visualSlug: "short-drama",
    summary: "短剧同名和改名情况较多，剧名之外还要结合主演、集数、完结状态与发布时间。",
    searchAdvice: "先写完整剧名，结果混杂时补主演、总集数或完结状态。只有标题片段时，可去掉宣传词再搜索核心名称。",
    qualityCheck: "打开结果后核对竖屏或横屏版本、实际集数、单集时长、画质和目录更新时间，避免把片段合集当作全集。",
    exampleA: "短剧全集",
    exampleB: "短剧完结资源",
  },
  {
    slug: "documentary",
    name: "纪录片资源",
    query: "纪录片资源",
    categoryPath: "/category/documentary",
    topicPath: "/topic/documentary-series",
    visualSlug: "documentary-series",
    summary: "纪录片常有电视版、加长版、不同旁白和字幕，系列名称与出品机构比宽泛主题更重要。",
    searchAdvice: "搜索完整片名、系列名和年份，可加入 BBC、NHK、PBS 等出品机构，中文译名没有结果再试英文原名。",
    qualityCheck: "打开后核对总集数、单集标题、旁白语言、字幕、音轨和清晰度，系列合集尤其要检查是否缺集。",
    exampleA: "纪录片合集",
    exampleB: "纪录片中文字幕",
  },
  {
    slug: "education",
    name: "学习课程",
    query: "学习课程",
    categoryPath: "/category/education",
    topicPath: "/topic/ai-course",
    visualSlug: "ai-course",
    summary: "学习课程需要结合科目、讲师、机构、年份和软件版本，越新的主题越要检查时效。",
    searchAdvice: "使用课程名或技能名作为核心词，再加讲师、机构、年份或技术版本。结果少时先去掉“全套、精品”等宣传词。",
    qualityCheck: "打开后核对课程目录、课时、配套资料、发布日期和适用版本，课程标题相同不代表内容与年份一致。",
    exampleA: "课程视频资料",
    exampleB: "课程配套资料",
  },
  {
    slug: "exam",
    name: "考试资料",
    query: "考试资料",
    categoryPath: "/category/education",
    topicPath: "/topic/kaogong",
    visualSlug: "kaogong",
    summary: "考试资料对年份、地区、科目和考试大纲很敏感，旧资料不能直接替代当前要求。",
    searchAdvice: "写明考试名称、年份、地区和科目，需要真题时再加年份范围，需要教材时补版次或出版社。",
    qualityCheck: "打开后核对适用年份、考试地区、科目目录、答案来源和教材版次，重要信息仍应以官方公告为准。",
    exampleA: "考试真题资料",
    exampleB: "考试教材电子版",
  },
  {
    slug: "ebooks",
    name: "电子书资源",
    query: "电子书资源",
    categoryPath: "/category/ebooks",
    topicPath: "/topic/ebooks",
    visualSlug: "ebooks",
    summary: "电子书搜索要区分作者、译者、出版社、版次和文件格式，同名书籍不能只看标题。",
    searchAdvice: "使用书名加作者作为起点，译著补译者，专业书补版次或出版社，需要阅读器格式时再加 EPUB、PDF 或 MOBI。",
    qualityCheck: "打开后核对目录、页数、扫描或文字版、排版、语言和文件格式，压缩包还要确认是否包含缺失卷册。",
    exampleA: "EPUB电子书",
    exampleB: "PDF电子书",
  },
  {
    slug: "software",
    name: "软件资源",
    query: "软件资源",
    categoryPath: "/category/software",
    topicPath: "/topic/programming-course",
    visualSlug: "programming-course",
    summary: "软件搜索必须写清名称、版本、系统和芯片架构，来源安全比结果数量更重要。",
    searchAdvice: "使用软件准确名称并补充版本、Windows、macOS、Android、x64 或 ARM64。能从官网获取时优先选择官方渠道。",
    qualityCheck: "打开后核对文件名、版本、系统、架构、数字签名和发布说明，不运行来源不明的脚本或可执行文件。",
    exampleA: "Windows软件",
    exampleB: "macOS软件",
  },
  {
    slug: "music",
    name: "音乐资源",
    query: "音乐资源",
    categoryPath: "/category/music",
    topicPath: "/topic/lossless-music",
    visualSlug: "lossless-music",
    summary: "音乐搜索要结合歌手、专辑、发行年份、版本和音频格式，单独搜索歌名容易混入翻唱与现场版。",
    searchAdvice: "专辑使用歌手加专辑名，单曲补发行年份，需要无损版本时加入 FLAC、APE、WAV 或 Hi-Res。",
    qualityCheck: "打开后核对曲目数量、发行版本、采样率、位深、封面和文件格式，不能仅凭文件扩展名判断音质。",
    exampleA: "无损音乐FLAC",
    exampleB: "音乐专辑合集",
  },
  {
    slug: "animation",
    name: "动漫资源",
    query: "动漫资源",
    categoryPath: "/category/animation",
    topicPath: "/topic/anime",
    visualSlug: "anime",
    summary: "动漫搜索需要区分季度、集数、剧场版、字幕组和配音版本，中文名与日文名都可能影响命中。",
    searchAdvice: "使用作品名加季度或年份，结果少时分别尝试中文译名、日文名、罗马音或英文名，再补字幕组。",
    qualityCheck: "打开后核对集数、是否包含特别篇、字幕语言、分辨率、音轨和文件命名，合集要检查季度是否齐全。",
    exampleA: "动漫全集",
    exampleB: "动漫中文字幕",
  },
  {
    slug: "design",
    name: "设计素材",
    query: "设计素材",
    categoryPath: "/category/design",
    topicPath: "/topic/design-assets",
    visualSlug: "design-assets",
    summary: "设计素材搜索要写清使用场景、软件和文件格式，预览图相似不代表源文件可以编辑。",
    searchAdvice: "根据用途加入海报、界面、电商或品牌等场景，再补 PSD、AI、Figma、Sketch、AE 或图片格式。",
    qualityCheck: "打开后核对源文件格式、图层、字体、链接素材、软件版本和授权说明，重要项目不要使用来源不明的商业素材。",
    exampleA: "PSD设计素材",
    exampleB: "Figma设计素材",
  },
];

const contentBySlug = new Map(
  contentProfiles.map((content) => [content.slug, content])
);

function buildKeywordGroups(
  platform: PlatformIntentProfile,
  content: ContentIntentProfile,
  keywordCount: number
): SeoKeywordGroup[] {
  const subjects = longTailSubjects[content.slug];
  if (!subjects) {
    throw new Error(`Missing long-tail subjects for SEO intent content: ${content.slug}`);
  }

  const candidates = subjects.flatMap((subject) =>
    longTailPatterns.map((pattern) => ({
      label: pattern.label,
      keyword: pattern.build(platform.name, subject),
    }))
  );
  const selected = candidates.slice(0, keywordCount);
  if (selected.length !== keywordCount) {
    throw new Error(`Not enough long-tail keywords for ${platform.slug}-${content.slug}`);
  }

  return longTailPatterns.map((pattern) => ({
    label: pattern.label,
    description: pattern.description,
    keywords: selected
      .filter((item) => item.label === pattern.label)
      .map((item) => item.keyword),
  }));
}

function buildIntentPage(
  platform: PlatformIntentProfile,
  content: ContentIntentProfile,
  keywordCount: number
): SeoPage {
  const hero = getTopicVisual(content.visualSlug);
  const keyword = `${content.query} ${platform.name}`;

  return {
    kind: "intent",
    slug: `${platform.slug}-${content.slug}`,
    path: `/search/${platform.slug}-${content.slug}`,
    heroImage: hero
      ? {
          ...hero,
          alt: `${platform.name}${content.name}搜索相关的${hero.alt}`,
        }
      : undefined,
    eyebrow: `${platform.name}内容搜索`,
    title: `${platform.name}${content.name}怎么搜`,
    seoTitle: `${platform.name}${content.name}搜索方法与关键词 - 好搜库`,
    description: `查找${platform.name}${content.name}时，按名称、年份、版本和格式缩小结果，并核对文件目录、更新时间与分享状态。`,
    summary: `${content.summary}${platform.name}结果还要结合该平台的访问方式与目录信息判断。`,
    searchKeyword: keyword,
    searchExamples: [
      `${platform.name}${content.name}搜索`,
      `${content.query}${platform.name}`,
      `${platform.name}${content.exampleA}`,
      `${platform.name}${content.exampleB}`,
      `${content.name}${platform.name}怎么找`,
    ],
    keywordGroups: buildKeywordGroups(platform, content, keywordCount),
    updatedAt: UPDATED_AT,
    indexable: true,
    facts: [
      { label: "网盘平台", value: platform.name },
      { label: "内容类型", value: content.name },
      { label: "推荐写法", value: `准确名称 + ${platform.name}` },
      { label: "重点核对", value: "版本、目录、更新时间" },
    ],
    sections: [
      {
        title: `先确定${content.name}的核心名称`,
        paragraphs: [
          `${content.searchAdvice}${platform.searchTip}`,
          `直接输入“${keyword}”可以查看带有平台线索的结果。如果数量过少，先删除“${platform.name}”，只搜索内容名称，再从平台筛选中查看对应分享。`,
        ],
      },
      {
        title: `怎样筛选${platform.name}结果`,
        paragraphs: [
          platform.strengths,
          `${content.summary}排序时应优先查看标题完整、更新时间较新、目录描述清楚且链接状态已有验证的结果。`,
        ],
        points: [
          `先看名称是否完整，再看${content.name}特有的年份、版本或格式信息。`,
          "同一个真实分享地址只保留一条，标题不同但地址相同的结果会合并。",
          "结果很多时继续增加一个有效条件，不要同时加入多个含义相近的宣传词。",
        ],
      },
      {
        title: "打开分享后检查什么",
        paragraphs: [
          content.qualityCheck,
          platform.accessNote,
          "已经明确取消、文件不存在或目录为空的链接可以提交失效反馈。短暂网络错误、登录要求或客户端提示不应直接标记为失效。",
        ],
      },
    ],
    related: [
      platform.pagePath,
      content.categoryPath,
      content.topicPath,
      "/guide/platform-filter",
    ],
  };
}

const intentCombinations = platformProfiles.flatMap((platform) =>
  platform.contentSlugs.map((slug) => {
    const content = contentBySlug.get(slug);
    if (!content) {
      throw new Error(`Unknown SEO intent content: ${slug}`);
    }
    return { platform, content };
  })
);

const keywordsPerIntentPage = Math.floor(
  INTENT_LONG_TAIL_KEYWORD_TARGET / intentCombinations.length
);
const pagesWithOneExtraKeyword =
  INTENT_LONG_TAIL_KEYWORD_TARGET % intentCombinations.length;

export const intentPages: SeoPage[] = intentCombinations.map(
  ({ platform, content }, index) =>
    buildIntentPage(
      platform,
      content,
      keywordsPerIntentPage + (index < pagesWithOneExtraKeyword ? 1 : 0)
    )
);

export function getIntentLongTailKeywords(): string[] {
  return intentPages.flatMap((page) =>
    (page.keywordGroups || []).flatMap((group) => group.keywords)
  );
}

export const intentPlatformNames = Object.freeze(
  Object.fromEntries(
    platformProfiles.map((platform) => [platform.slug, platform.name])
  )
);
