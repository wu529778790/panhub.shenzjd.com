import { getTopicVisual, type TopicVisual } from "./topicVisuals";
import { intentPages } from "./seoIntentContent";

export type SeoPageKind =
  | "pan"
  | "category"
  | "topic"
  | "intent"
  | "guide"
  | "legal";

export interface SeoFact {
  label: string;
  value: string;
}

export interface SeoSection {
  title: string;
  paragraphs: string[];
  points?: string[];
}

export interface SeoKeywordGroup {
  label: string;
  description: string;
  keywords: string[];
}

export interface SeoFaqItem {
  question: string;
  answer: string;
}

export interface SeoReference {
  id?: string;
  title: string;
  url?: string;
}

export interface SeoPage {
  kind: SeoPageKind;
  slug: string;
  path: string;
  visualStyle?: "cinema";
  heroImage?: TopicVisual;
  eyebrow: string;
  title: string;
  seoTitle: string;
  description: string;
  summary: string;
  answer?: string;
  searchKeyword?: string;
  searchExamples?: string[];
  keywordGroups?: SeoKeywordGroup[];
  faq?: SeoFaqItem[];
  references?: SeoReference[];
  generated?: boolean;
  publishedAt?: string;
  updatedAt: string;
  indexable: boolean;
  facts: SeoFact[];
  sections: SeoSection[];
  related: string[];
}

export interface SeoHub {
  kind: Exclude<SeoPageKind, "legal">;
  path: string;
  label: string;
  title: string;
  seoTitle: string;
  description: string;
  summary: string;
  updatedAt: string;
}

const UPDATED_AT = "2026-07-22";
const CINEMA_TOPIC_SLUGS = new Set([
  "4k-movie",
  "classic-movie",
  "movie-subtitles",
]);

interface PanDefinition {
  slug: string;
  name: string;
  query: string;
  summary: string;
  bestFor: string;
  searchTips: string;
  note: string;
  searchExamples: string[];
  related: string[];
}

const panDefinitions: PanDefinition[] = [
  {
    slug: "quark",
    name: "夸克网盘",
    query: "夸克网盘",
    summary: "夸克分享更新较快，常见影视、短剧、课程和电子书，适合先用作品名或资料名直接查找。",
    bestFor: "夸克网盘的公开分享以影视、短剧、学习课程和电子书居多，移动端打开也比较方便。同一份内容经常被不同来源重复收录，好搜库会按分享地址合并结果，标题、发布时间和提取信息仍会保留。",
    searchTips: "先搜片名、课程名或书名。结果太多时，再加年份、季数、讲师、出版社或清晰度。只有明确需要夸克链接时才加平台名称，否则先搜索内容，再从结果里筛选夸克网盘。",
    note: "夸克分享可能要求登录客户端，也可能在发布者改动权限后失效。打开链接后先核对文件目录和更新时间，确认分享已取消时再提交失效反馈。",
    searchExamples: ["夸克网盘搜索引擎", "夸克网盘资源搜索", "夸克短剧资源搜索", "夸克网盘学习资料", "夸克电子书资源"],
    related: ["/category/tv", "/topic/short-drama", "/guide/search-tips"],
  },
  {
    slug: "aliyun",
    name: "阿里云盘",
    query: "阿里云盘",
    summary: "阿里云盘常见高清影视、纪录片和体积较大的资料合集，搜索时应把年份和版本写清楚。",
    bestFor: "阿里云盘的公开分享里，高清电影、纪录片、技术课程和整套资料比较常见。同名影视往往同时有原盘、REMUX、流媒体和压制版本，文件名里的编码、音轨与字幕信息比“高清”两个字更有参考价值。",
    searchTips: "影视可以用“片名 + 年份 + 4K”起步，课程则加入技术名称、版本或机构。遇到中文译名不同的作品，分开尝试中文名、英文原名和导演，不要把多个名称全塞进一次搜索。",
    note: "旧分享可能已经转存、改名或关闭。好搜库只整理公开索引，不保存文件，也不会改变阿里云盘原有的访问规则。打开后发现目录不符或分享取消，可以反馈状态。",
    searchExamples: ["阿里云盘搜索引擎", "阿里云盘资源搜索", "阿里云盘4K电影", "阿里云盘纪录片资源", "阿里云盘课程资料"],
    related: ["/category/movie", "/topic/4k-movie", "/guide/file-version"],
  },
  {
    slug: "baidu",
    name: "百度网盘",
    query: "百度网盘",
    summary: "百度网盘的公开索引年代跨度大，考试资料、电子书、教程和行业文档通常比新平台更齐。",
    bestFor: "需要找旧教材、历年真题、软件教程或长期整理的资料时，百度网盘往往更容易出现结果。由于索引时间跨度大，同一个标题可能对应不同年份和版本，先比较发布时间与目录，再决定打开哪一条。",
    searchTips: "考试资料写上考试名称、年份、地区和科目；软件写上系统与版本号；图书写上作者或出版社。百度分享经常带四位提取码，复制链接时要把提取信息一起保存。",
    note: "越早的索引越容易遇到分享取消、提取码缺失或文件被替换。系统会隐藏已经确认失效的地址，但其余结果仍要根据标题完整度、来源时间和分享页提示判断。",
    searchExamples: ["百度网盘搜索引擎", "百度网盘资源搜索", "百度网盘学习资料", "百度网盘电子书资源", "百度网盘提取码搜索"],
    related: ["/category/education", "/category/ebooks", "/guide/extract-code"],
  },
  {
    slug: "115",
    name: "115 网盘",
    query: "115网盘",
    summary: "115 网盘的公开线索较分散，但系列影视、原盘、音乐专辑和长期收藏里经常能找到不同版本。",
    bestFor: "找完整剧集、原盘整理、无损音乐或年代较久的收藏时，可以单独看看 115 结果。此类分享常被转录到不同索引，好搜库按真实地址去重，不会因为标题略有差异就重复列出同一链接。",
    searchTips: "完整作品名通常比“115 + 电影”更有用。剧集加季数和年份，原盘加 REMUX、蓝光或编码，音乐加歌手、专辑、发行年份和格式。结果少时先去掉“115 网盘”，再用平台筛选。",
    note: "115 分享可能改为客户端访问，也可能因为发布者迁移文件而失效。系统至少收到两次独立失败反馈后才会隐藏链接，避免一次网络故障造成误判。",
    searchExamples: ["115网盘搜索引擎", "115网盘资源搜索", "115网盘电影搜索", "115无损音乐资源", "115网盘搜索技巧"],
    related: ["/category/movie", "/topic/lossless-music", "/guide/dead-links"],
  },
  {
    slug: "xunlei",
    name: "迅雷云盘",
    query: "迅雷云盘",
    summary: "迅雷云盘里常见影视、动画和近期整理的合集，适合按片名、季数或清晰度直接搜索。",
    bestFor: "新上映影视、连载动画和近期课程比较容易出现迅雷分享。部分来源只写了简短标题，同名内容多时应重点看年份、集数、字幕和文件大小，不要只根据排序选择第一条。",
    searchTips: "片名较短时加上映年份、主演或季数；动画加季度、集数和字幕组；软件加准确版本。先保留能识别内容的核心词，结果过多再补条件，通常比一开始写很长更稳定。",
    note: "有些迅雷链接只能在对应客户端里确认状态，要求登录并不等于失效。只有分享取消、文件不存在等明确情况才适合反馈为不可用。",
    searchExamples: ["迅雷云盘搜索引擎", "迅雷云盘资源搜索", "迅雷云盘电影资源", "迅雷云盘动漫搜索", "迅雷云盘课程资源"],
    related: ["/category/tv", "/category/animation", "/guide/platform-filter"],
  },
  {
    slug: "uc",
    name: "UC 网盘",
    query: "UC网盘",
    summary: "UC 网盘的公开分享偏向移动端，短剧、影视合集和日常资料出现得比较多。",
    bestFor: "短剧、热播剧和移动端转发的资料包里，经常能看到 UC 链接。不同来源可能给同一份内容换了标题，好搜库会先按地址合并，再保留可用于判断集数和版本的文字。",
    searchTips: "短剧加剧名、主演或完结状态，连续剧加季数和集数，资料类内容加年份、地区或文件格式。结果少时删掉平台词，只搜内容名称，再切到 UC 筛选。",
    note: "UC 与夸克的部分内容标题很接近，但目录和清晰度未必相同。打开后先看文件列表，确认无法访问再反馈，避免把登录提示当成失效。",
    searchExamples: ["UC网盘搜索引擎", "UC网盘资源搜索", "UC网盘短剧资源", "UC网盘电影搜索", "UC网盘怎么搜索资源"],
    related: ["/topic/short-drama", "/category/tv", "/guide/search-tips"],
  },
  {
    slug: "123",
    name: "123 网盘",
    query: "123网盘",
    summary: "123 网盘常用来分享软件、设计素材、文档模板和体积适中的资料包。",
    bestFor: "找安装包、插件、模板、字体或小型资料合集时，可以留意 123 网盘。此类内容版本变化快，标题里是否写清系统、架构、格式和更新时间，比结果数量更重要。",
    searchTips: "软件使用“名称 + 版本 + 系统”，设计素材加入 PSD、AI、Figma 等格式，模板则写明行业和用途。先搜具体名称，不要把“免费、全套、最新版”等宣传词当作必要条件。",
    note: "安装包和压缩文件需要额外谨慎。优先找官方或开源发布渠道，网盘只作为公开镜像线索；下载后核对签名、哈希或使用安全工具检查。",
    searchExamples: ["123网盘搜索引擎", "123网盘资源搜索", "123网盘软件资源", "123网盘设计素材", "123网盘搜索技巧"],
    related: ["/category/software", "/category/design", "/guide/safe-use"],
  },
  {
    slug: "tianyi",
    name: "天翼云盘",
    query: "天翼云盘",
    summary: "天翼云盘分享常见纪录片、课程和长期保存的资料合集，可按作品名或科目查找。",
    bestFor: "纪录片、公开课、行业文档和个人整理的资料中，天翼云盘链接并不少见。它在部分索引里数量不算最多，但有时能补上其他平台已经失效的同名内容。",
    searchTips: "纪录片写完整系列名和出品机构，课程写科目、讲师或年份，文档加行业与文件格式。先搜索内容名称，再用平台筛选查看天翼结果，通常比直接加平台词更容易命中。",
    note: "天翼分享可能要求登录或在客户端继续访问。页面能打开但需要身份确认时，不应直接标记为失效；目录为空、分享取消或地址不存在才属于明确失败。",
    searchExamples: ["天翼云盘搜索引擎", "天翼云盘资源搜索", "天翼云盘纪录片", "天翼云盘学习资料", "天翼云盘分享搜索"],
    related: ["/category/documentary", "/category/education", "/guide/platform-filter"],
  },
  {
    slug: "mobile",
    name: "移动云盘",
    query: "移动云盘",
    summary: "移动云盘公开分享多见学习资料、文档和日常文件合集，适合用准确名称与年份查找。",
    bestFor: "中国移动云盘常用于分享培训资料、考试文件、电子文档和日常整理包。公开索引比较分散，搜索时不必预设一定有结果，把它作为其他平台之外的补充来源更合适。",
    searchTips: "资料类内容加年份、地区和科目，文档加格式，课程加机构或讲师。搜索结果少时先去掉“中国移动云盘”，只保留资料的准确名称，再从平台列表里筛选。",
    note: "部分链接会跳转到登录页或移动端页面，出现登录提示不代表文件消失。打开前确认域名属于官方服务，不在第三方页面输入验证码或账号密码。",
    searchExamples: ["移动云盘搜索引擎", "中国移动云盘资源", "移动云盘学习资料", "移动云盘分享搜索", "移动云盘文件搜索"],
    related: ["/category/education", "/guide/safe-use", "/guide/search-tips"],
  },
  {
    slug: "pikpak",
    name: "PikPak",
    query: "PikPak",
    summary: "PikPak 分享与磁力转存内容较常见，查找影视或动画时应把版本、字幕和年份写清楚。",
    bestFor: "PikPak 常被用于保存影视、动画和磁力转存内容。公开分享的标题有时只有英文名或文件名，搜索中文译名没有结果时，可以改用英文原名、罗马音或常见别名。",
    searchTips: "影视用“片名 + 年份 + 清晰度”，动画补充季度、字幕组或集数。若只想查看 PikPak 分享，先搜索完整内容名，再在结果中筛选平台，避免平台词占掉有限的关键词信息。",
    note: "分享页可能要求在 PikPak 客户端中打开。涉及磁力内容时还要核对文件列表、大小和格式，不执行来路不明的脚本或安装包。",
    searchExamples: ["PikPak资源搜索", "PikPak分享搜索", "PikPak电影资源", "PikPak动漫资源", "PikPak磁力资源"],
    related: ["/topic/magnet-search", "/category/animation", "/guide/magnet-basics"],
  },
  {
    slug: "lanzou",
    name: "蓝奏云",
    query: "蓝奏云",
    summary: "蓝奏云链接多用于软件、插件和小型文件，搜索时版本号、系统和文件名最重要。",
    bestFor: "体积较小的软件工具、浏览器插件、字体和补丁常通过蓝奏云分享。内容更新后旧地址可能继续存在，因此同名结果中要优先核对版本、发布日期与官方来源。",
    searchTips: "写上软件或插件的准确名称，再补版本号、Windows、macOS、Android 或架构。不要只搜“蓝奏云软件”，这种宽泛写法很难区分真正需要的文件。",
    note: "蓝奏云常见压缩包和可执行文件。网盘结果只能作为查找线索，安装前应优先回到官网或开源项目核对版本，并使用系统安全工具检查文件。",
    searchExamples: ["蓝奏云搜索引擎", "蓝奏云资源搜索", "蓝奏云软件资源", "蓝奏云插件下载", "蓝奏云分享搜索"],
    related: ["/category/software", "/guide/safe-use", "/guide/file-version"],
  },
];

interface CategoryDefinition {
  slug: string;
  name: string;
  query: string;
  summary: string;
  scope: string;
  tips: string;
  quality: string;
  searchExamples: string[];
  related: string[];
  updatedAt?: string;
}

const categoryDefinitions: CategoryDefinition[] = [
  {
    slug: "movie",
    name: "电影资源",
    query: "热门电影",
    summary: "找电影先写片名和年份，再根据清晰度、字幕或版本缩小范围。",
    scope: "这里收录华语片、外语片、动画电影、纪录电影和经典修复版本的公开分享线索。同一部电影可能同时有原盘、REMUX、流媒体和重新编码版本，系统只合并相同地址，不会把不同文件强行归成一条。",
    tips: "先用“片名 + 年份”，同名结果多时再加导演、4K、HDR、国语或字幕。系列电影要写清具体部数；作品有多种译名时，中文名和英文原名分开搜索会更稳。",
    quality: "标题写得完整、来源时间较新、目录信息清楚的结果更容易判断。容量和清晰度不明时，先打开分享页核对文件名、音轨、字幕与大小，不要只看“高清”字样。",
    searchExamples: ["电影资源搜索引擎", "电影资源搜索", "电影百度网盘资源", "夸克网盘电影资源", "4K电影网盘资源"],
    related: ["/topic/4k-movie", "/topic/classic-movie", "/guide/file-version"],
    updatedAt: "2026-07-24",
  },
  {
    slug: "tv",
    name: "电视剧资源",
    query: "国产剧",
    summary: "电视剧、网剧和短剧按剧名、季数、年份与完结状态查找，连载内容要特别看更新时间。",
    scope: "电视剧结果可能是单集、阶段合集、单季或全系列，不同字幕和配音版本也会同时出现。连载期间目录经常变化，标题中的集数只是线索，真正是否完整仍要以分享页为准。",
    tips: "国产剧加播出年份，海外剧补充英文名和季数，短剧可以加主演或完结状态。关键词太长时先保留剧名与季数，结果出现后再按平台和更新时间筛选。",
    quality: "连载资源不能只看首次发布时间。打开后核对最新集数、字幕、单集时长和目录更新时间；如果标题写着“全集”但目录明显不全，应换一条来源。",
    searchExamples: ["电视剧资源搜索网站", "电视剧资源搜索引擎", "电视剧网盘资源搜索", "短剧全集网盘搜索", "电视剧完结资源"],
    related: ["/topic/short-drama", "/topic/korean-drama", "/guide/search-tips"],
    updatedAt: "2026-07-23",
  },
  {
    slug: "documentary",
    name: "纪录片资源",
    query: "纪录片",
    summary: "自然、历史、社会和科学纪录片适合按片名、出品机构、年份或系列名查找。",
    scope: "纪录片经常有电视版、加长版、不同旁白和字幕版本。自然、历史、旅行、人文与科学只是大方向，准确片名、出品机构和年份通常比单独搜索“纪录片”更容易找到完整合集。",
    tips: "可以搜索“片名 + BBC”“主题 + 年份”或“系列名 + 集数”。BBC、NHK、PBS 等缩写建议保留；中文译名没结果时，再试英文原名、主持人或单集标题。",
    quality: "合集最常见的问题是少集、混入不同系列或字幕不全。打开后先核对集数、单集名称、音轨和清晰度，标题没有列明版本时不要默认它是完整版。",
    searchExamples: ["纪录片网盘资源", "BBC纪录片百度网盘", "纪录片合集夸克网盘", "历史纪录片资源搜索", "自然纪录片4K资源"],
    related: ["/topic/documentary-series", "/pan/tianyi", "/guide/file-version"],
  },
  {
    slug: "education",
    name: "学习资料",
    query: "学习资料",
    summary: "考试、语言、职业技能和公开课程资料要把年份、科目与版本写清楚。",
    scope: "学习资料包括备考讲义、真题、语言课程、职业技能、公开课和配套文档。此类内容对时间很敏感，旧版资料可以参考，但不能代替当前考试大纲、教材版本或官方通知。",
    tips: "考试资料用“考试名称 + 年份 + 地区 + 科目”，技术课程补充语言或框架版本，教材加入作者、出版社和版次。少用“必过、内部、最全”等无法验证的词。",
    quality: "先看目录、发布日期、适用范围和来源说明。真题与答案应回到官方渠道核对，课程内容要确认软件或制度版本，缺少年份的合集不适合直接当作最新资料。",
    searchExamples: ["学习资料网盘搜索", "考试资料百度网盘", "课程资料夸克网盘", "职业资格考试资料", "英语学习资料网盘"],
    related: ["/topic/kaogong", "/topic/kaoyan", "/guide/search-tips"],
  },
  {
    slug: "software",
    name: "软件工具",
    query: "软件工具",
    summary: "软件、插件和工具应按名称、版本、操作系统与芯片架构搜索，来源安全比数量更重要。",
    scope: "这里的结果包括桌面软件、移动应用、开源工具发行包、插件和使用教程。同一版本可能区分 Windows、macOS、Android、x64、ARM64 等平台，文件名不完整时很难判断能否安装。",
    tips: "使用“软件名 + 版本 + 系统 + 架构”，例如补充 macOS、Windows、ARM64 或 x64。能从官网、应用商店或开源项目获取时优先使用官方渠道，网盘结果只作为镜像线索。",
    quality: "可执行文件、脚本和破解程序风险较高。下载后核对数字签名、哈希或发布说明，并使用安全工具检查；不要为了安装来源不明的程序关闭系统保护。",
    searchExamples: ["软件资源搜索", "Windows软件网盘", "macOS软件资源", "开源工具网盘镜像", "软件安装包百度网盘"],
    related: ["/pan/lanzou", "/topic/programming-course", "/guide/safe-use"],
  },
  {
    slug: "music",
    name: "音乐资源",
    query: "无损音乐",
    summary: "音乐按歌手、专辑、发行年份和格式查找，版本信息比“无损”标签更可靠。",
    scope: "音乐结果包括专辑、现场录音、原声带、古典作品和无损音频合集。同一张专辑可能有不同地区版、再版年份、母带和采样率，文件格式相同也不代表音源一致。",
    tips: "先搜“歌手 + 专辑名”，需要特定版本再加年份、厂牌、FLAC、Hi-Res 或 SACD。古典音乐补充作曲家、演奏者和指挥，电影原声则加英文片名或发行年份。",
    quality: "FLAC 或 WAV 只说明封装格式，不能证明音质。查看频率、位深、来源说明和发行信息，并通过合法渠道支持音乐人；好搜库不保存或重新分发文件。",
    searchExamples: ["无损音乐网盘", "FLAC音乐百度网盘", "Hi-Res音乐资源", "电影原声带网盘", "古典音乐无损资源"],
    related: ["/topic/lossless-music", "/topic/audiobook", "/pan/115"],
  },
  {
    slug: "animation",
    name: "动漫资源",
    query: "动漫资源",
    summary: "动画和动漫按片名、季度、集数、字幕与画质查找，中文名和原名最好分开尝试。",
    scope: "动漫结果可能包括电视动画、剧场版、OVA、特典和音乐合集。季度命名、罗马音、中文译名与字幕组写法差异很大，同一标题下也可能混有不同季度。",
    tips: "使用“作品名 + 第几季 + 年份”，需要特定字幕时再加字幕组或简繁语言。中文译名没结果时试日文罗马音或英文名，剧场版要加具体副标题。",
    quality: "先核对集数、单集时长、字幕语言和视频编码。把电视版、剧场版与特典混在一起的合集不一定有问题，但目录应写清楚，避免下载后才发现版本不符。",
    searchExamples: ["动漫资源搜索", "动漫夸克网盘", "动画百度网盘资源", "日漫全集网盘", "动漫磁力资源搜索"],
    related: ["/topic/anime", "/topic/kids-animation", "/pan/pikpak"],
  },
  {
    slug: "ebooks",
    name: "电子书资源",
    query: "电子书",
    summary: "电子书要按书名、作者、出版社、译者或格式区分版本。",
    scope: "常见电子书格式包括 EPUB、MOBI、AZW3、PDF 和扫描版。同一本书可能有多个译本、版次和出版社，单独搜索书名容易把不同版本混在一起。",
    tips: "先用“书名 + 作者”，指定版本时加入译者、出版社、版次或 EPUB 等格式。教材和工具书还应补充出版年份，系列图书要写清卷数或册数。",
    quality: "目录、版权页和出版信息比文件名更可信。扫描版要关注页面是否完整、文字是否清晰；需要长期阅读时，也要确认格式与自己的阅读设备兼容。",
    searchExamples: ["电子书网盘搜索", "EPUB电子书资源", "百度网盘电子书", "夸克网盘电子书", "PDF书籍资源搜索"],
    related: ["/topic/ebooks", "/pan/baidu", "/guide/file-version"],
  },
  {
    slug: "design",
    name: "设计素材",
    query: "设计素材",
    summary: "字体、模板、样机和工程源文件应按格式、软件版本、风格与授权范围查找。",
    scope: "设计素材包括字体、图标、图片、样机、PPT 模板、Figma 组件和 PSD、AI 等工程文件。能否编辑、缺不缺字体、软件是否兼容，往往比素材数量更重要。",
    tips: "使用“用途 + 格式 + 风格”，例如“餐饮 PPT 模板”“Figma 移动端组件”或“PSD 包装样机”。工程文件再补软件版本，字体和图片则要确认授权范围。",
    quality: "下载后检查文件结构、预览图、字体依赖和许可说明。商用项目不要把来源不明的素材当作可自由使用，也不要用第三方整理包冒充官方品牌资产。",
    searchExamples: ["设计素材网盘", "PPT模板百度网盘", "Figma组件资源", "PSD样机素材", "字体素材网盘搜索"],
    related: ["/topic/design-assets", "/topic/ppt-template", "/guide/safe-use"],
  },
];

interface TopicDefinition {
  slug: string;
  title: string;
  query: string;
  category: string;
  summary: string;
  overview: string;
  tips: string;
  check: string;
  searchExamples: string[];
  updatedAt?: string;
}

const coreTopicDefinitions: TopicDefinition[] = [
  {
    slug: "kaogong",
    title: "考公资料搜索",
    query: "考公资料",
    category: "/category/education",
    summary: "国考、省考和事业单位资料要写明年份、地区与科目，避免把旧版讲义当作当前内容。",
    overview: "考公资料通常包括行测、申论、真题、课程讲义和时政整理。国考、省考与事业单位的范围并不相同，年份变化也会影响政策与题型，标题里缺少考试类型的合集很难直接判断用途。",
    tips: "组合考试类型、年份、地区和科目，例如“2027 国考行测”或“广东省考申论”。找课程时再补讲师或机构，找真题时优先保留年份与地区，不需要同时加很多宣传词。",
    check: "真题和答案应回到官方渠道核对，课程资料则看讲师、目录与更新时间。所谓“内部押题”“包过资料”无法验证，也不应作为选择依据。",
    searchExamples: ["2027考公资料网盘", "国考行测资料", "省考申论百度网盘", "公务员考试真题资源", "事业单位考试资料"],
  },
  {
    slug: "kaoyan",
    title: "考研资料搜索",
    query: "考研资料",
    category: "/category/education",
    summary: "考研公共课、专业课和院校真题按年份、科目、院校与专业查找。",
    overview: "考研资料可分为政治、英语、数学等公共课，以及院校专业课、历年真题和复试内容。专业课差异最大，同名科目在不同学校可能使用完全不同的参考书和考试范围。",
    tips: "公共课用“年份 + 科目 + 讲师”，专业课用“院校 + 专业代码 + 科目”，真题再加年份。准备下一届考试时也要分别搜索当前年份和上一届资料，方便判断更新内容。",
    check: "课程讲义应与视频年份一致，专业课资料要核对招生目录、参考书和考试代码。复试经验帖可以参考，但不能替代学校发布的最新通知。",
    searchExamples: ["2027考研资料网盘", "考研英语资料百度网盘", "考研数学课程资源", "考研专业课真题", "考研复试资料搜索"],
  },
  {
    slug: "teacher-cert",
    title: "教师资格证资料搜索",
    query: "教师资格证资料",
    category: "/category/education",
    summary: "教资笔试、面试和学段资料按考试年份、科目与幼儿园、小学、中学分类查找。",
    overview: "教师资格证资料分为笔试、面试和普通话等内容，不同学段的科目与要求不一样。小学、中学和幼儿园资料如果混在同一目录中，需要先确认自己报考的类别。",
    tips: "使用“年份 + 学段 + 科目”，例如“2026 小学教资综合素质”。面试资料补充学科和试讲，笔记类内容可以加“知识点”或“真题”，但不要用“押题”代替准确科目。",
    check: "考试时间、报名条件和大纲以官方公告为准。整理笔记可能省时间，但要核对年份；面试模板也不能替代实际试讲与结构化练习。",
    searchExamples: ["教师资格证资料小学", "中学教资笔试资料", "教资面试试讲资源", "教师资格证真题网盘", "幼儿园教资学习资料"],
  },
  {
    slug: "python",
    title: "Python 学习资源搜索",
    query: "Python 教程",
    category: "/category/education",
    summary: "Python 入门、数据分析、自动化和 Web 课程应写明方向与版本。",
    overview: "Python 教程从语法入门到数据分析、自动化、机器学习和 Web 开发跨度很大。课程使用的 Python 版本、依赖库和开发工具会直接影响示例能否运行，只有“全套教程”的标题通常不够判断。",
    tips: "加入学习方向和版本，例如“Python 3 数据分析”“FastAPI 入门”或“Pandas 实战”。有明确目标时直接写框架或项目类型，比单独搜索 Python 更容易找到合适内容。",
    check: "优先选择带源码、依赖文件、练习和环境说明的课程。旧教程仍可学习基础，但涉及框架和第三方库时，应结合官方文档检查已经变化的 API。",
    searchExamples: ["Python教程百度网盘", "Python入门课程资源", "Python数据分析教程", "FastAPI课程网盘", "Python自动化实战资料"],
  },
  {
    slug: "programming-course",
    title: "编程课程资源搜索",
    query: "编程课程",
    category: "/category/education",
    summary: "编程课程按语言、框架、版本和项目方向搜索，先确定要解决的问题。",
    overview: "编程课程可能面向入门语法、前端、后端、移动开发、数据分析或算法。课程数量多不等于适合自己，语言版本、框架版本、项目源码和练习方式决定了学习成本。",
    tips: "使用“技术名 + 版本 + 方向”，例如“Vue 3 项目实战”“Java 21 入门”或“数据结构 C++”。如果已经有项目目标，把商城、博客、爬虫或接口开发写进关键词。",
    check: "完整课程应能看出章节、源码和运行环境。遇到旧版本课程，先确认核心知识是否仍适用，再通过官方文档补齐变化，不要照搬已经废弃的配置。",
    searchExamples: ["编程课程网盘资源", "程序员学习资料", "编程入门视频课程", "项目实战课程网盘", "计算机课程百度网盘"],
  },
  {
    slug: "java",
    title: "Java 学习资源搜索",
    query: "Java 教程",
    category: "/category/education",
    summary: "Java 基础、Spring、微服务和项目课程按 JDK 与框架版本查找。",
    overview: "Java 课程通常包含语法、集合、并发、JVM、Spring 与项目实战。JDK 8、17、21 之间已有明显差异，Spring Boot 2 和 3 的依赖与配置也不完全相同。",
    tips: "写上 JDK、框架和学习阶段，例如“Java 21 入门”“Spring Boot 3 项目”或“JVM 调优”。面试资料与系统课程分开搜索，避免得到只讲题目不讲原理的合集。",
    check: "先看项目能否构建、依赖是否写明、源码是否完整。涉及数据库和中间件的课程还要核对版本，旧项目可以参考思路，但不应直接照搬到生产环境。",
    searchExamples: ["Java教程百度网盘", "Java项目实战课程", "Spring Boot 3教程", "JVM学习资料", "Java面试资料网盘"],
  },
  {
    slug: "frontend",
    title: "前端开发课程搜索",
    query: "前端开发教程",
    category: "/category/education",
    summary: "HTML、CSS、JavaScript、Vue 和 React 课程按技术栈与版本查找。",
    overview: "前端课程变化快，基础知识相对稳定，构建工具和框架版本却经常更新。Vue 2 与 Vue 3、React 不同版本以及 Webpack 与 Vite 的课程不能只看标题是否相同。",
    tips: "先写具体技术和版本，例如“Vue 3 TypeScript”“React 19 入门”或“CSS Grid 实战”。想做项目时加入后台管理、移动端或组件库等场景。",
    check: "核对课程发布日期、包管理器、Node.js 版本和源码。能运行的示例比只有视频更有价值，遇到依赖安装失败时先查看项目说明，不要随意关闭安全检查。",
    searchExamples: ["前端开发教程网盘", "Vue 3课程资源", "React教程百度网盘", "JavaScript项目实战", "TypeScript学习资料"],
  },
  {
    slug: "office",
    title: "Office 教程搜索",
    query: "Office 教程",
    category: "/category/education",
    summary: "Word、Excel、PowerPoint 和办公自动化教程按软件、版本与具体任务查找。",
    overview: "Office 教程既有基础操作，也有 Excel 函数、数据透视表、演示设计和 VBA 自动化。不同 Office 版本的界面和功能并不完全一样，先说清软件与任务比搜索“办公教程大全”更有效。",
    tips: "把目标写进关键词，例如“Excel Power Query”“Word 长文档排版”或“PowerPoint 母版”。需要模板时再补行业和用途，课程则优先找带练习文件的版本。",
    check: "确认教程对应 Windows、macOS 还是网页版，并核对 Office 年份。宏和脚本文件需要谨慎打开，不执行来路不明的代码，也不为了启用宏关闭安全提示。",
    searchExamples: ["Office教程百度网盘", "Excel函数课程资源", "Word排版教程", "PowerPoint设计课程", "Office办公软件教程"],
  },
  {
    slug: "excel",
    title: "Excel 学习资料搜索",
    query: "Excel 教程",
    category: "/category/education",
    summary: "Excel 函数、透视表、Power Query 和 VBA 资料按任务难度查找。",
    overview: "Excel 内容从基础公式到数据清洗、透视分析、Power Query 和 VBA 自动化差别很大。先确定要解决的工作问题，能减少大量只讲界面操作的初级结果。",
    tips: "使用“Excel + 具体任务”，例如“Excel XLOOKUP”“Power Query 合并文件”或“VBA 批量处理”。想系统学习时再加“入门、进阶、案例”等层级词。",
    check: "教程最好附带练习表格和完成效果。函数要确认 Office 版本是否支持，宏文件打开前先检查来源，工作数据中包含隐私时不要上传到不可信工具。",
    searchExamples: ["Excel教程网盘", "Excel函数学习资料", "Power Query课程", "Excel VBA视频教程", "数据透视表案例"],
  },
  {
    slug: "design-assets",
    title: "设计素材搜索",
    query: "设计素材",
    category: "/category/design",
    summary: "设计素材按格式、风格、软件和应用场景查找，先确认是否可编辑与可商用。",
    overview: "设计素材包括字体、图标、样机、演示模板和工程源文件。预览图好看不代表源文件完整，格式、字体依赖、软件版本和授权范围都会影响实际使用。",
    tips: "加入格式与用途，例如“Figma 移动端组件”“PSD 包装样机”或“AI 餐饮图标”。需要商用时把“授权说明”作为检查项，而不是只在关键词里写“可商用”。",
    check: "下载后查看图层、链接资源、缺失字体和许可文件。品牌项目不要把第三方整理包当作官方资产，也不要在没有授权证明时直接用于商业发布。",
    searchExamples: ["设计素材网盘资源", "Figma组件百度网盘", "PSD样机资源", "AI矢量素材网盘", "可商用字体资源"],
  },
  {
    slug: "ppt-template",
    title: "PPT 模板资源搜索",
    query: "PPT模板",
    category: "/category/design",
    summary: "PPT 模板按行业、用途、比例和软件版本查找，避免只看封面图。",
    overview: "PPT 模板常用于汇报、答辩、教学、路演和活动展示。不同用途对版式、图表和字体的要求不同，只有“高端模板”一类描述很难判断是否适合。",
    tips: "使用“场景 + 风格 + 比例”，例如“毕业答辩简洁模板”“年度汇报 16:9”或“教育课件 PPT”。使用 Keynote 或 WPS 时也应写明软件。",
    check: "打开后检查母版、字体、图表是否可编辑，以及图片是否有授权说明。模板包含宏或外部链接时谨慎启用，商用前替换没有明确许可的图片和字体。",
    searchExamples: ["PPT模板百度网盘", "工作汇报PPT模板", "毕业答辩PPT资源", "教学课件模板网盘", "Keynote模板资源"],
  },
  {
    slug: "kids-animation",
    title: "儿童动画搜索",
    query: "儿童动画",
    category: "/category/animation",
    summary: "儿童动画按年龄、语言、片名和季数查找，家长应先检查具体内容。",
    overview: "儿童动画需要同时考虑年龄适配、语言版本、字幕和集数完整性。同名系列可能包含电影版、剧集版和不同配音，标题里的“启蒙”或“益智”也不能代替实际内容判断。",
    tips: "加入年龄段、国语、英语启蒙、季数或片名。例如“4-6 岁英语动画”比“儿童必看动画”更具体。已经知道作品时，直接搜索片名和季数。",
    check: "播放前抽查几集，确认语言、画面、广告和内容是否适合孩子。目录应写清集数与单集时长，家长控制和观看时间仍需在设备端设置。",
    searchExamples: ["儿童动画百度网盘", "英语启蒙动画资源", "国语儿童动画全集", "幼儿动画夸克网盘", "儿童科普动画资源"],
  },
  {
    slug: "anime",
    title: "日漫资源搜索",
    query: "日漫资源",
    category: "/category/animation",
    summary: "日漫按作品原名、季度、年份和字幕信息搜索，剧场版要写清副标题。",
    overview: "日漫标题可能同时使用中文译名、日文罗马音和英文名，季度与剧场版的命名也不统一。合集里还可能包含 OVA、特典和音乐文件，先确认目录结构更省时间。",
    tips: "使用“作品名 + 第几季 + 年份”，需要特定版本再加字幕组、简繁或 1080P。中文名搜不到时，分开尝试罗马音和英文名，不要一次输入三个名称。",
    check: "核对集数、字幕、视频编码和音轨。季度顺序不清或文件名只有编号时，先在分享页查看目录，避免把剧场版或总集篇当成正篇。",
    searchExamples: ["日漫全集网盘", "动漫夸克网盘资源", "日漫磁力搜索", "动漫剧场版资源", "番剧百度网盘"],
  },
  {
    slug: "short-drama",
    title: "短剧资源搜索",
    query: "短剧资源",
    category: "/category/tv",
    summary: "短剧按剧名、主演、集数和完结状态查找，重点核对目录是否完整。",
    overview: "短剧更新快，同名或近似剧名很多，单条分享可能只有前几十集，也可能把多个系列混在一个目录。搜索时把准确剧名和主演写清楚，比只搜“热门短剧”更有效。",
    tips: "优先使用“剧名 + 主演 + 完结”，不知道完整剧名时可用主演和剧情关键词。结果太少时去掉“全集”或平台名称，再从返回结果里筛选。",
    check: "打开分享页后核对总集数、单集时长和最后更新时间。标题写“全集”但目录缺集时应换来源，不要根据封面或夸张标题判断完整度。",
    searchExamples: ["短剧全集网盘搜索", "夸克短剧资源", "UC网盘短剧全集", "短剧完结资源", "短剧资源搜索引擎"],
  },
  {
    slug: "korean-drama",
    title: "韩剧资源搜索",
    query: "韩剧资源",
    category: "/category/tv",
    summary: "韩剧按中文名、原名、播出年份、集数与字幕版本查找。",
    overview: "韩剧常有大陆、港台和英文译名，同名作品也可能跨年份翻拍。连载期间分享目录会持续更新，搜索结果里的集数和日期需要结合播出进度判断。",
    tips: "使用“剧名 + 年份 + 完结”或加入主演。中文译名没有结果时，再尝试英文名或韩文罗马音；需要特定字幕时把字幕组或简繁语言写清楚。",
    check: "确认总集数、字幕、单集时长和更新时间。连载内容优先看目录最近修改日期，完结后再寻找完整整理版，能减少反复转存。",
    searchExamples: ["韩剧百度网盘资源", "韩剧夸克网盘", "韩剧全集资源搜索", "韩剧中字网盘", "最新韩剧资源"],
  },
  {
    slug: "documentary-series",
    title: "纪录片合集搜索",
    query: "纪录片合集",
    category: "/category/documentary",
    summary: "系列纪录片按片名、出品机构、年份、集数和旁白版本查找。",
    overview: "系列纪录片经常有电视剪辑版、国际版和加长版，也可能使用不同旁白和字幕。按主题搜索可以发现作品，确定片名后应改用完整标题继续找版本。",
    tips: "搜索“系列名 + 出品机构 + 年份”，例如保留 BBC、NHK 或 PBS 缩写。需要单集时加入集名，需要完整系列时补充季数或总集数。",
    check: "核对单集名称、数量、音轨和字幕。目录把多个系列混在一起并非一定不可用，但必须看得出每部分来源，避免漏集或版本重复。",
    searchExamples: ["BBC纪录片合集", "NHK纪录片百度网盘", "自然纪录片4K", "历史纪录片全集", "纪录片夸克网盘"],
  },
  {
    slug: "classic-movie",
    title: "经典电影资源搜索",
    query: "经典电影",
    category: "/category/movie",
    summary: "老电影按原名、上映年份、导演和修复版本查找，译名差异尤其常见。",
    overview: "经典电影可能有多个中文译名，也常见修复版、蓝光版和不同地区发行版本。只搜一个中文片名容易漏掉结果，原名、年份和导演能帮助区分同名作品。",
    tips: "先用“片名 + 年份 + 导演”，需要修复版再加“4K 修复、蓝光或 CC”。中文译名差异大时，英文原名和港台译名分开尝试。",
    check: "修复版要看发行说明、画面比例、音轨和字幕，不要只根据文件名里的 4K 判断。老片也可能有删减或不同剪辑版，打开目录后先核对片长。",
    searchExamples: ["经典电影百度网盘", "老电影夸克网盘", "4K修复电影资源", "经典电影合集", "蓝光老电影资源"],
  },
  {
    slug: "lossless-music",
    title: "无损音乐搜索",
    query: "无损音乐",
    category: "/category/music",
    summary: "无损音乐按歌手、专辑、发行年份、厂牌和音频格式查找。",
    overview: "FLAC、ALAC、APE 和 WAV 都可能被标注为无损，但格式名称不能证明音源质量。发行地区、再版年份、母带和采样率都会造成差异，同一专辑常有多条结果。",
    tips: "使用“歌手 + 专辑 + 年份”，需要特定音源再加厂牌、24bit、Hi-Res 或 SACD。整套歌手合集看起来方便，但查找单张专辑时准确标题更容易判断版本。",
    check: "查看文件信息、发行说明和曲目数量，不把高采样率标签直接当作高质量保证。请通过合法渠道支持音乐人，并确认分享内容的版权与使用范围。",
    searchExamples: ["无损音乐搜索引擎", "无损音乐百度网盘", "FLAC专辑资源", "Hi-Res音乐网盘", "歌手无损专辑合集"],
    updatedAt: "2026-07-23",
  },
  {
    slug: "audiobook",
    title: "有声书资源搜索",
    query: "有声书",
    category: "/category/music",
    summary: "有声书按书名、作者、演播者、集数和音频格式查找。",
    overview: "同一本书可能有不同演播版本，也可能分为单人播讲、多人剧和广播剧。标题没有演播者与集数时，很难判断内容是否完整或是否符合自己的收听习惯。",
    tips: "使用“书名 + 演播者”，需要完整版本再加集数或“完结”。系列作品要写明第几部，广播剧和普通有声书应分开搜索。",
    check: "核对总集数、单集时长、文件顺序和音质。缺少开头或结尾的合集听到中途才会发现问题，先查看最后几集的文件名更容易判断是否完结。",
    searchExamples: ["有声书百度网盘", "有声小说全集", "有声书夸克网盘", "广播剧资源搜索", "有声书完结资源"],
  },
  {
    slug: "4k-movie",
    title: "4K 电影资源搜索",
    query: "4K 电影",
    category: "/category/movie",
    summary: "4K 电影按片名、年份、片源、HDR、音轨和字幕查找。",
    overview: "4K 结果可能是 UHD 原盘、REMUX、流媒体版本或重新编码文件。容量、HDR 类型、音轨和播放设备兼容性都会影响体验，分辨率相同不代表质量相同。",
    tips: "以片名和年份为基础，再加 REMUX、HDR10、杜比视界、国语或字幕需求。设备不支持某些音轨或 HDR 格式时，也可以把兼容格式写进关键词。",
    check: "打开分享页后查看媒体信息和文件大小，确认是真实 2160P，而不是简单放大版本。原盘体积大，转存前也要考虑网盘空间与播放设备。",
    searchExamples: ["4K电影百度网盘", "4K电影夸克网盘", "REMUX电影资源", "杜比视界电影网盘", "UHD原盘资源搜索"],
  },
  {
    slug: "ebooks",
    title: "电子书资源搜索",
    query: "电子书",
    category: "/category/ebooks",
    summary: "电子书按书名、作者、译者、出版社、版次和文件格式查找。",
    overview: "电子书可能是 EPUB、MOBI、AZW3、PDF 或扫描版，同一本书还可能有不同译者、版次与出版社。完整书名和作者能先定位作品，出版信息用于确认具体版本。",
    tips: "从“书名 + 作者”开始，需要指定版本时加入译者、出版社、版次或格式。教材与工具书最好补出版年份，套装书则写清册数。",
    check: "优先看目录、版权页和文件是否完整。扫描 PDF 要检查清晰度与缺页，EPUB 等流式格式要确认中文字体与目录显示是否正常，并通过正规渠道支持作者。",
    searchExamples: ["电子书资源搜索引擎", "电子书百度网盘", "EPUB电子书资源", "AZW3书籍网盘", "PDF电子书搜索"],
    updatedAt: "2026-07-23",
  },
  {
    slug: "magnet-search",
    title: "磁力资源搜索",
    query: "磁力资源",
    category: "/category/movie",
    summary: "磁力结果按名称、年份、文件格式和版本查找，与网盘结果分区查看。",
    overview: "磁力链接本身只包含内容标识与少量参数，是否能获取文件取决于网络中的可用节点。好搜库把磁力结果与网盘分享分区展示，避免两种访问方式混在一起。",
    tips: "使用准确作品名、年份或文件版本，不必反复加入“磁力下载”。影视可以补清晰度和字幕，软件与文档则要写明版本与格式。",
    check: "打开前核对磁力名称、文件列表和大小，警惕伪装成媒体或文档的可执行文件。请遵守所在地法律和内容授权范围，不下载或传播无权使用的内容。",
    searchExamples: ["磁力搜索引擎", "磁力资源搜索", "电影磁力搜索", "动漫磁力资源", "磁力链接怎么用"],
  },
];

const materialTopicDefinitions: TopicDefinition[] = [
  {
    slug: "video-material",
    title: "视频素材搜索",
    query: "视频素材",
    category: "/category/design",
    summary: "视频素材按题材、分辨率、画幅、帧率和使用场景查找，先区分成片与可剪辑源文件。",
    overview: "视频素材常见实拍空镜、城市航拍、自然风景、人物动作、粒子背景和转场片段。竖屏、横屏、透明通道与普通画面用途不同，只有“高清视频”很难说明是否适合当前项目。",
    tips: "把画面内容和技术条件写清楚，例如“城市夜景 4K 空镜”“竖屏美食视频”或“透明通道粒子素材”。需要特定剪辑软件时，再补充 PR、AE 或达芬奇。",
    check: "先看分辨率、帧率、时长、编码和水印，再确认授权范围。预览文件与原素材可能不同，商用项目需要保留许可说明，不能把“无水印”直接理解为可以任意使用。",
    searchExamples: ["视频素材库", "视频素材网盘资源", "4K视频素材搜索", "城市空镜视频素材", "竖屏短视频素材"],
    updatedAt: "2026-07-23",
  },
  {
    slug: "sound-effects",
    title: "音效素材搜索",
    query: "音效素材",
    category: "/category/design",
    summary: "音效素材按动作、环境、情绪、时长和音频格式查找，背景音乐与短音效应分开搜索。",
    overview: "音效素材包括按钮反馈、转场、脚步、自然环境、机械声、影视氛围和拟音。相同名称可能对应完全不同的录音距离与空间感，搜索时要说明使用场景。",
    tips: "使用“动作或环境 + 音效”，例如“雨夜环境音”“科技按钮音效”或“电影转场音效”。需要无损文件时补充 WAV，做游戏时可以加入循环、立体声或采样率。",
    check: "试听是否有底噪、爆音、截断和过度混响，并核对格式、采样率与授权。素材包数量很多时先看目录命名，避免下载后才发现大部分声音无法检索。",
    searchExamples: ["音效素材库", "音效素材百度网盘", "影视音效素材库", "游戏音效资源搜索", "WAV环境音素材"],
    updatedAt: "2026-07-23",
  },
  {
    slug: "font-assets",
    title: "字体素材搜索",
    query: "字体素材",
    category: "/category/design",
    summary: "字体按语言、字重、风格、文件格式和授权范围查找，名称相近不代表来自同一字库。",
    overview: "字体素材可能包含中文字体、西文字体、可变字体、图标字体和手写字形。简繁覆盖、缺字、字重数量与软件兼容性都会影响排版，压缩包里的预览图不能代替实际字符检查。",
    tips: "写明语言和用途，例如“中文黑体 商务排版”“英文复古字体”或“可变字体 WOFF2”。知道字体名称时直接搜索完整名称，不要只用“高级感字体”这类主观描述。",
    check: "安装前查看字体名称、版本、字符覆盖和许可文件。个人免费不等于商用免费，品牌、广告、应用嵌入和网页使用可能需要不同授权。",
    searchExamples: ["字体素材包", "字体素材网盘资源", "中文字体合集搜索", "商用字体授权说明", "可变字体资源"],
    updatedAt: "2026-07-23",
  },
  {
    slug: "icon-assets",
    title: "图标素材搜索",
    query: "图标素材",
    category: "/category/design",
    summary: "图标素材按行业、风格、尺寸、格式与交互状态查找，整套风格统一比单个图标数量更重要。",
    overview: "图标素材包括 SVG、AI、PNG、字体图标和设计软件组件。同一套图标需要统一线宽、圆角、视觉尺寸和填充方式，混用多个素材包很容易造成界面不协调。",
    tips: "加入行业、风格与格式，例如“金融线性 SVG 图标”“医疗双色图标”或“Figma 界面图标组件”。需要交互状态时补充选中、禁用或悬停。",
    check: "确认图标是否为真正矢量、描边能否编辑、画板尺寸是否统一，并查看授权范围。不要把品牌官方图标和第三方仿制图标混为一套。",
    searchExamples: ["图标素材库", "SVG图标素材网盘", "Figma图标组件资源", "线性图标素材库", "AI矢量图标资源"],
    updatedAt: "2026-07-23",
  },
  {
    slug: "figma-ui-kit",
    title: "Figma UI 素材搜索",
    query: "Figma UI 素材",
    category: "/category/design",
    summary: "Figma UI 素材按产品类型、组件体系、设备和设计版本查找，重点检查自动布局与组件状态。",
    overview: "Figma 素材可能是单页界面、完整 UI Kit、设计系统或交互原型。只有截图而没有组件、变量和自动布局的文件，后续修改成本通常很高。",
    tips: "使用“产品类型 + Figma + 组件”，例如“电商 App UI Kit”“后台管理设计系统”或“移动端表单组件”。需要特定设备时补充 iOS、Android 或 Web。",
    check: "打开后查看组件变体、Auto Layout、颜色与字体变量、图层命名和页面结构。社区文件的字体、图片和图标可能另有授权，交付前需要逐项确认。",
    searchExamples: ["Figma UI Kit网盘", "Figma组件库资源", "移动端UI素材搜索", "后台管理Figma模板", "Figma设计系统资源"],
  },
  {
    slug: "psd-mockup",
    title: "PSD 样机素材搜索",
    query: "PSD 样机",
    category: "/category/design",
    summary: "PSD 样机按产品、视角、光线、尺寸和智能对象结构查找，先确认图层是否完整可编辑。",
    overview: "样机常用于包装、海报、书籍、屏幕、服装和品牌展示。不同样机对 Photoshop 版本、智能对象和置换贴图有要求，只有平面预览图的文件不能完成真实替换。",
    tips: "写明物品和视角，例如“咖啡包装 PSD 样机”“手机屏幕正面样机”或“书籍封面透视样机”。需要批量展示时可以加入多角度或场景组合。",
    check: "检查智能对象、阴影、高光、背景和置换文件是否齐全，并确认图片尺寸。样机中的照片、字体和品牌标识不一定包含商业授权，使用前应替换。",
    searchExamples: ["PSD样机网盘资源", "包装样机PSD素材", "手机样机模板搜索", "书籍封面样机资源", "品牌展示样机素材"],
  },
  {
    slug: "ae-template",
    title: "AE 模板素材搜索",
    query: "AE模板",
    category: "/category/design",
    summary: "AE 模板按用途、时长、画幅、插件和软件版本查找，工程能否正常打开比预览效果更重要。",
    overview: "AE 模板覆盖片头、字幕、转场、信息图、相册和产品展示。工程可能依赖第三方插件、指定字体或外部素材，不同 After Effects 版本也会影响表达式和渲染。",
    tips: "使用“场景 + AE 模板 + 画幅”，例如“科技片头 AE 模板”“竖屏字幕包装”或“产品发布信息图”。不想安装插件时加入“无插件”。",
    check: "确认 AE 版本、插件清单、字体、素材目录和渲染设置。表达式报错时先核对版本与语言环境，不要随意运行模板附带的安装脚本。",
    searchExamples: ["AE模板网站", "AE模板百度网盘", "AE片头模板资源", "无插件AE模板", "竖屏AE字幕模板"],
    updatedAt: "2026-07-23",
  },
  {
    slug: "premiere-template",
    title: "PR 模板素材搜索",
    query: "PR模板",
    category: "/category/design",
    summary: "Premiere 模板按字幕、转场、片头、画幅与软件版本查找，并区分工程模板和 MOGRT 文件。",
    overview: "PR 模板可能是完整 Premiere 工程、MOGRT 动态图形、预设或素材包。不同类型的安装和修改方式不同，搜索前说明用途能减少大量不兼容结果。",
    tips: "使用“用途 + PR 模板”，例如“访谈字幕 MOGRT”“旅游转场 PR 模板”或“竖屏片头工程”。需要中文版兼容时仍应以具体版本和文件类型判断。",
    check: "核对 Premiere 版本、字体、媒体文件、插件和序列设置。项目打开后出现离线媒体时，先检查素材目录，不执行来源不明的所谓一键修复工具。",
    searchExamples: ["PR模板网", "PR模板网盘资源", "Premiere字幕模板", "MOGRT素材搜索", "PR转场模板下载"],
    updatedAt: "2026-07-23",
  },
  {
    slug: "lut-presets",
    title: "LUT 调色预设搜索",
    query: "LUT调色预设",
    category: "/category/design",
    summary: "LUT 预设按相机、色彩空间、场景和目标风格查找，技术转换与创意调色不能混用。",
    overview: "LUT 文件既可以把 Log 素材转换到标准色彩空间，也可以提供风格化效果。相机曲线、曝光和白平衡不匹配时，直接套用预设容易出现偏色或高光断层。",
    tips: "写明相机与曲线，例如“S-Log3 转 Rec.709 LUT”“夜景电影感调色”或“达芬奇婚礼预设”。技术转换词应比风格词更靠前。",
    check: "先确认输入色彩空间、输出空间和适用软件，再在示波器中检查高光、阴影与肤色。预设只能作为起点，不能代替针对具体镜头的校正。",
    searchExamples: ["LUT调色预设网盘", "达芬奇LUT资源", "S-Log3转709预设", "电影感LUT素材", "Premiere调色预设"],
  },
  {
    slug: "lightroom-presets",
    title: "Lightroom 预设搜索",
    query: "Lightroom预设",
    category: "/category/design",
    summary: "Lightroom 预设按拍摄题材、光线、相机和桌面或移动版本查找，先看它修改了哪些参数。",
    overview: "Lightroom 预设常用于人像、婚礼、旅行、胶片和室内照片。不同相机配置文件、曝光与白平衡会改变套用效果，预览图不能保证在自己的照片上得到相同结果。",
    tips: "使用“题材 + Lightroom 预设”，例如“室内人像暖色预设”“阴天旅行胶片风”或“手机 Lightroom 预设”。知道格式时可补 XMP 或 DNG。",
    check: "导入前确认桌面版或移动版、文件格式和适用版本。套用后检查曝光、肤色、降噪与镜头配置，不把预设作者的示例照片当作可复用素材。",
    searchExamples: ["Lightroom预设网盘", "LR人像预设资源", "XMP调色预设搜索", "手机LR预设下载", "胶片风Lightroom预设"],
  },
  {
    slug: "cad-drawings",
    title: "CAD 图纸素材搜索",
    query: "CAD图纸",
    category: "/category/design",
    summary: "CAD 图纸按专业、项目类型、比例、图层和软件版本查找，参考图不能直接代替正式设计文件。",
    overview: "CAD 资料可能涉及建筑、室内、景观、机械和电气图纸。不同专业的制图规范、单位、图层和外部参照不同，文件名相似也不能直接拼进同一项目。",
    tips: "写明专业与对象，例如“住宅平面 CAD 图纸”“机械零件 DWG”或“景观节点详图”。需要特定版本时加入 AutoCAD 年份和单位。",
    check: "打开后核对单位、比例、图层、字体、线型和外部参照。公开图纸只能用于学习和参考，实际工程必须由具备资质的人员复核。",
    searchExamples: ["CAD图纸网盘资源", "室内设计DWG图纸", "建筑CAD素材搜索", "机械零件CAD图", "景观节点图纸资源"],
  },
  {
    slug: "3d-models",
    title: "3D 模型素材搜索",
    query: "3D模型素材",
    category: "/category/design",
    summary: "3D 模型按软件、格式、面数、贴图和渲染器查找，模型文件与材质贴图需要配套。",
    overview: "3D 素材包括建筑、家具、人物、产品、车辆和场景模型。OBJ、FBX、C4D、MAX、BLEND 等格式用途不同，模型面数与贴图尺寸也会影响编辑和渲染性能。",
    tips: "使用“对象 + 软件或格式”，例如“现代沙发 3ds Max 模型”“低模人物 FBX”或“Blender 室内场景”。需要特定渲染器时补 V-Ray、Corona 或 Cycles。",
    check: "检查模型比例、拓扑、UV、材质、贴图路径和渲染器版本。模型能打开不代表材质完整，商用前还要确认原作者授权和可再分发范围。",
    searchExamples: ["3D模型素材网站", "3D模型网盘资源", "Blender模型素材", "3ds Max模型下载", "FBX低模资源搜索"],
    updatedAt: "2026-07-23",
  },
  {
    slug: "resume-template",
    title: "简历模板资源搜索",
    query: "简历模板",
    category: "/category/design",
    summary: "简历模板按岗位、工作年限、语言和文件格式查找，内容清晰比复杂装饰更重要。",
    overview: "简历模板常见 Word、PPT、Canva、Figma 和 PSD 格式。应届生、技术岗位、设计岗位和管理岗位的信息重点不同，套用通用模板前需要先确定内容层级。",
    tips: "使用“岗位 + 格式 + 语言”，例如“产品经理 Word 简历”“英文留学简历模板”或“设计师作品集简历”。需要机器筛选时加入 ATS 友好。",
    check: "确认文字、间距和颜色是否可编辑，导出 PDF 后检查字体与分页。不要在来历不明的在线模板中上传身份证、住址等无关敏感信息。",
    searchExamples: ["简历模板百度网盘", "Word简历模板资源", "应届生简历模板", "ATS英文简历模板", "设计师简历素材"],
  },
  {
    slug: "excel-template",
    title: "Excel 表格模板搜索",
    query: "Excel表格模板",
    category: "/category/education",
    summary: "Excel 模板按业务场景、字段、函数和版本查找，先确认公式、数据验证与打印设置。",
    overview: "Excel 模板常用于预算、排期、库存、考勤、报价和项目管理。同一用途可能只是简单表格，也可能包含公式、图表、Power Query 或宏，复杂度差别很大。",
    tips: "把业务任务写清楚，例如“项目进度甘特图 Excel”“小店库存表格”或“家庭预算模板”。不需要宏时可以明确加入“无 VBA”。",
    check: "逐项检查公式引用、日期格式、数据验证、保护区域和打印范围。含宏文件必须确认来源并查看代码，不要在模板中保留示例客户或员工信息。",
    searchExamples: ["Excel表格模板大全", "Excel表格模板网盘", "项目管理Excel模板", "库存表格资源搜索", "无宏Excel模板"],
    updatedAt: "2026-07-23",
  },
  {
    slug: "contract-template",
    title: "合同模板资料搜索",
    query: "合同模板",
    category: "/category/education",
    summary: "合同模板按交易类型、适用地区、主体和履行方式查找，通用范本不能替代法律审查。",
    overview: "合同资料可能涉及劳动、租赁、采购、服务、保密和知识产权等场景。条款需要结合主体身份、交付方式、付款节点与争议解决地，旧范本不一定符合现行规则。",
    tips: "使用“业务类型 + 地区 + 主体”，例如“软件开发服务合同”“公司房屋租赁合同”或“设计项目保密协议”。需要附件时补验收单、报价单或清单。",
    check: "核对法律依据、违约责任、付款、验收、知识产权和争议解决条款。模板只能提供结构参考，重要交易应由专业人士结合实际情况审核。",
    searchExamples: ["合同模板Word资源", "劳动合同范本搜索", "租赁合同模板网盘", "服务合同模板下载", "保密协议资料搜索"],
  },
  {
    slug: "lesson-plan",
    title: "教案课件素材搜索",
    query: "教案课件",
    category: "/category/education",
    summary: "教案课件按学段、学科、教材版本、课时和教学目标查找，先核对目录与当前课程要求。",
    overview: "教案、学案、课件和试题承担的用途不同。小学、初中、高中以及不同教材版本的章节顺序可能变化，只有科目名称无法判断资料能否直接使用。",
    tips: "写明“学段 + 学科 + 教材版本 + 章节”，例如“初中数学人教版一次函数教案”。需要展示文件时补 PPT，需要练习时补学案或同步试题。",
    check: "核对教材年份、章节、课时、教学目标与答案。现成课件应根据学生情况调整，图片、字体和题目也要确认授权与来源。",
    searchExamples: ["教案课件资源网", "教案课件百度网盘", "小学语文PPT课件", "初中数学教案资源", "人教版课件素材"],
    updatedAt: "2026-07-23",
  },
  {
    slug: "ecommerce-assets",
    title: "电商设计素材搜索",
    query: "电商设计素材",
    category: "/category/design",
    summary: "电商素材按平台、品类、活动、页面位置和源文件格式查找，避免直接套用带品牌信息的成品。",
    overview: "电商素材包括主图、详情页、促销标签、直播背景、店铺装修和产品场景。不同平台的尺寸、文字规范和营销规则不同，旧活动模板可能已经不符合当前要求。",
    tips: "使用“平台 + 品类 + 位置”，例如“家居详情页 PSD”“直播间竖屏背景”或“电商促销标签 AI”。需要源文件时写明 PSD、AI 或 Figma。",
    check: "检查图层、字体、链接图片、尺寸和色彩模式，并删除原品牌、价格与活动日期。使用商品图、人物图和字体前分别确认许可。",
    searchExamples: ["电商设计素材网站", "电商设计素材网盘", "详情页PSD模板", "直播间背景素材", "促销标签AI素材"],
    updatedAt: "2026-07-23",
  },
  {
    slug: "presentation-assets",
    title: "演示图表素材搜索",
    query: "演示图表素材",
    category: "/category/design",
    summary: "演示图表按数据关系、行业、风格和编辑软件查找，图形必须服从真实数据结构。",
    overview: "演示图表素材包括流程、时间线、组织架构、地图、对比和数据图形。装饰复杂不代表信息清楚，选择前要先判断内容属于趋势、构成、分布还是关系。",
    tips: "使用“关系类型 + 软件”，例如“PowerPoint 时间线图表”“Keynote 组织架构”或“Figma 数据可视化组件”。需要特定比例时再补 16:9 或竖版。",
    check: "确认颜色、文字、图形和数据能否编辑，并核对图表是否会误导比例。地图、品牌图标和插图也可能有独立授权要求。",
    searchExamples: ["演示图表素材网盘", "PPT信息图模板", "时间线图表资源", "可编辑数据图表素材", "Keynote图表模板"],
  },
].map((item) => ({ ...item, updatedAt: "2026-07-23" }));

const extendedTopicDefinitions: TopicDefinition[] = [
  {
    slug: "comic",
    title: "漫画资源搜索",
    query: "漫画资源",
    category: "/category/ebooks",
    summary: "漫画按作品名、作者、卷数、地区与文件格式查找，连载版和单行本要分开判断。",
    overview: "漫画资源可能是单话、单卷、完结合集、彩色版或不同出版社版本。中文译名、日文原名和作者名经常并存，只有“全集”字样不能说明卷数完整，也不能确认图像清晰度。",
    tips: "先用“作品名 + 作者”，再补完结、卷数、日文原名、港版或台版。需要便于阅读的文件时加入 EPUB、PDF、MOBI 或图片包格式，不要把多个译名一次写进同一条搜索。",
    check: "打开目录后核对起止卷数、缺页情况、阅读顺序、分辨率和文件大小。同人作品、杂志连载与正式单行本要区分，使用和传播时也要留意作品授权。",
    searchExamples: ["漫画资源搜索引擎", "漫画资源搜索网站", "完结漫画百度网盘", "日漫漫画夸克网盘", "漫画PDF资源"],
  },
  {
    slug: "concert",
    title: "演唱会资源搜索",
    query: "演唱会资源",
    category: "/category/music",
    summary: "演唱会按歌手、城市、年份、场次和音视频版本查找，先分清现场录像与专辑音轨。",
    overview: "同一轮巡演可能包含多个城市、日期和发行版本，资源也可能是电视转播、官方影碟、观众录像或纯音频。标题只写歌手和“演唱会”时，很难判断具体场次与完整度。",
    tips: "使用“歌手 + 巡演名 + 城市或年份”，需要画面时再加 Blu-ray、1080P 或 4K，需要音轨时加入 FLAC、现场专辑或发行年份。中文名和英文巡演名可以分开尝试。",
    check: "先核对日期、曲目表、时长、画幅、音轨和字幕。剪辑片段不等于完整场次，来源不明的超大文件也要检查格式；公开演出录像仍受版权规则约束。",
    searchExamples: ["演唱会资源网站", "演唱会资源在哪找", "演唱会百度网盘资源", "4K演唱会夸克网盘", "演唱会无损音轨"],
  },
  {
    slug: "movie-subtitles",
    title: "电影字幕资源搜索",
    query: "电影字幕资源",
    category: "/category/movie",
    summary: "字幕按片名、年份、片源版本、语言和帧率查找，名称相同也可能无法直接匹配。",
    overview: "字幕文件常见 SRT、ASS、SSA 和 SUP，不同片源的片头长度、剪辑版、帧率与时间轴可能不同。简体、繁体、双语和特效字幕用途也不一样，需要和手中的视频版本对应。",
    tips: "使用“片名 + 年份 + 片源组或版本 + 字幕语言”，例如补充 WEB-DL、BluRay、REMUX、简英双语。若已知视频文件名，可以保留其中的发行组和分辨率信息。",
    check: "导入前查看文件扩展名、编码、帧率和时间轴说明，播放开头、中段与结尾抽查同步情况。压缩包内若混有可执行文件或安装脚本，不要运行。",
    searchExamples: ["电影字幕资源网站", "电影中文字幕资源", "蓝光电影字幕网盘", "ASS双语字幕搜索", "电影字幕文件搜索"],
  },
  {
    slug: "radio-drama",
    title: "广播剧资源搜索",
    query: "广播剧资源",
    category: "/category/ebooks",
    summary: "广播剧按作品、配音阵容、季数、集数与完结状态查找，并区分正剧、花絮和原声。",
    overview: "广播剧目录里常同时出现正剧、预告、花絮、主题曲和访谈，同名作品还可能有不同制作团队。只看总文件数无法判断正剧是否完整，季播内容也需要确认更新时间。",
    tips: "写明作品名、制作组、季数和完结状态，例如“作品名 第二季 完结”。同名小说改编较多时加入主要配音演员；只找音频时可补 MP3、M4A 或 FLAC。",
    check: "核对正剧集数、每集时长、章节顺序、音质和文件命名。缺少番外不一定代表正剧不完整，但标题宣称完结时应能对应官方发布目录。",
    searchExamples: ["广播剧资源百度网盘", "广播剧资源网盘", "广播剧资源网站", "广播剧全集夸克网盘", "完结广播剧资源"],
  },
  {
    slug: "texture-assets",
    title: "纹理素材搜索",
    query: "纹理素材",
    category: "/category/design",
    summary: "纹理按材质、风格、分辨率、是否无缝和文件格式查找，预览图不能代替原始贴图。",
    overview: "纹理素材可用于平面设计、3D 材质、游戏场景和摄影合成，常见纸张、金属、木材、布料、颗粒与磨损效果。普通背景图、无缝纹理和 PBR 贴图的结构并不相同。",
    tips: "使用“材质 + 用途 + 格式”，例如“无缝纸张纹理 PNG”“木材 PBR 4K”或“复古颗粒叠加素材”。3D 项目需要时补充法线、粗糙度和置换贴图。",
    check: "检查实际像素、接缝、色彩空间、通道数量和贴图命名，确认压缩包内不是只有预览小图。用于商业作品前还要核对许可范围和署名要求。",
    searchExamples: ["纹理素材网站", "纹理素材图片", "纹理素材PNG", "无缝纹理网盘资源", "PBR纹理素材"],
  },
  {
    slug: "background-assets",
    title: "背景素材搜索",
    query: "背景素材",
    category: "/category/design",
    summary: "背景素材按画面用途、比例、分辨率、静态或视频格式查找，先确定最终使用场景。",
    overview: "背景素材覆盖海报、演示、电商、直播、舞台和短视频。静态图片、循环视频、透明叠加层和可编辑源文件差别很大，同一画面还可能提供横版、竖版和超宽比例。",
    tips: "使用“场景 + 比例 + 格式”，例如“直播间竖屏背景 MP4”“简洁汇报背景 16:9”或“科技背景 PSD”。需要循环播放时加入无缝循环和时长。",
    check: "核对像素、帧率、循环点、图层、字体和可编辑范围，确认预览水印与源文件是否一致。含人物、品牌或受保护图案的素材需要单独确认授权。",
    searchExamples: ["背景素材库", "背景素材视频", "背景素材图片", "直播背景素材网盘", "竖屏视频背景资源"],
  },
  {
    slug: "photoshop-brushes",
    title: "Photoshop 笔刷素材搜索",
    query: "Photoshop笔刷",
    category: "/category/design",
    summary: "Photoshop 笔刷按效果、ABR 格式、软件版本和使用场景查找，笔刷与纹理素材要配套检查。",
    overview: "Photoshop 笔刷可用于水彩、毛发、烟雾、颗粒、云层和修图等效果。部分笔刷只有 ABR 文件，另一些还需要配套纹理、图案、动作或使用说明，预览效果未必由单个笔刷完成。",
    tips: "写明效果和用途，例如“水彩 Photoshop ABR”“商业修图皮肤笔刷”或“烟雾特效笔刷”。已知软件版本时补充年份，避免旧格式在新版本中表现不同。",
    check: "导入后检查笔尖、动态参数、纹理依赖和画笔大小，确认压缩包没有可执行安装器。笔刷可以用于创作不等于可以重新分发，商用前应查看许可。",
    searchExamples: ["Photoshop笔刷素材网站", "Photoshop笔刷导入", "PS水彩笔刷网盘", "ABR笔刷素材搜索", "PS修图笔刷资源"],
  },
  {
    slug: "procreate-brushes",
    title: "Procreate 笔刷素材搜索",
    query: "Procreate笔刷",
    category: "/category/design",
    summary: "Procreate 笔刷按绘画效果、brushset 格式、软件版本和配套色卡查找。",
    overview: "Procreate 笔刷常用于线稿、水彩、油画、书法、颗粒和装饰纹样，文件可能是单个 brush，也可能是整套 brushset。部分效果依赖特定画布、纹理或压感设置。",
    tips: "使用“风格 + Procreate 笔刷”，例如“国风水墨 brushset”“铅笔线稿笔刷”或“颗粒阴影笔刷”。需要整套资源时也要写清是否包含色卡、纸张纹理和示例。",
    check: "导入前核对文件扩展名、Procreate 版本和设备空间，导入后用不同压感测试笔刷。不要安装第三方描述文件，也不要把展示作品误当成可复用素材。",
    searchExamples: ["Procreate笔刷资源", "Procreate笔刷怎么导入", "Procreate笔刷格式", "Procreate水彩笔刷网盘", "Procreate线稿笔刷"],
  },
  {
    slug: "music-production-assets",
    title: "音乐制作素材搜索",
    query: "音乐制作素材",
    category: "/category/music",
    summary: "音乐制作素材按乐器、速度、调性、采样率和授权范围查找，Loop、采样与工程文件要分开。",
    overview: "音乐制作资料包括鼓组、Loop、One-shot、MIDI、Kontakt 音色、预设和分轨工程。不同 DAW、插件版本与采样率会影响能否直接使用，文件量大也不代表内容适合当前项目。",
    tips: "写明风格、BPM、调性和文件类型，例如“Lo-fi 鼓组 WAV”“电影配乐弦乐 MIDI”或“Ableton 工程文件”。需要特定插件时加入插件名与版本。",
    check: "核对采样率、位深、节拍、调性、插件依赖和缺失音频，试听是否有削波或噪声。采样包的商用、改编和再分发权限可能不同，发布前应保存许可说明。",
    searchExamples: ["音乐制作素材网站", "音乐制作素材网盘", "WAV鼓组采样包", "MIDI编曲素材搜索", "Ableton工程资源"],
  },
  {
    slug: "notion-template",
    title: "Notion 模板资源搜索",
    query: "Notion模板",
    category: "/category/education",
    summary: "Notion 模板按项目管理、学习、知识库和个人计划查找，先看数据库结构与导入方式。",
    overview: "Notion 模板可能是一页清单、关联数据库、团队知识库或整套工作流。公开分享页能复制不代表字段设计适合自己，复杂模板还可能依赖公式、关联和外部自动化。",
    tips: "使用“用途 + Notion 模板”，例如“内容日历数据库”“学生课程计划”或“产品需求知识库”。需要中文版时补充语言，但应优先看字段和视图而不是装饰风格。",
    check: "复制前查看数据库关系、公式、筛选器、权限和示例数据，导入后删除作者留下的个人信息。外部小组件和自动化需要单独核对服务权限与隐私规则。",
    searchExamples: ["Notion模板库", "Notion模板分享", "Notion模板怎么导入", "Notion项目管理模板", "Notion学习计划模板"],
  },
  {
    slug: "word-template",
    title: "Word 模板资源搜索",
    query: "Word模板",
    category: "/category/education",
    summary: "Word 模板按文档用途、纸张、版式、语言和软件版本查找，先检查样式与分页设置。",
    overview: "Word 模板可用于报告、通知、方案、手册、信函和表单。DOCX 文档与 DOTX 模板用途不同，复杂版式还会依赖字体、页眉页脚、分节符和域代码。",
    tips: "写明场景和格式，例如“公司通知 Word 模板”“A4 项目报告 DOTX”或“中英文简历 DOCX”。只需要结构时不要把“精美”当作主要条件。",
    check: "打开后检查样式层级、字体替换、页码、目录、分节、打印边距和兼容模式。含宏的 DOCM 文件应先确认来源，不在模板里保留示例个人信息。",
    searchExamples: ["Word模板资源", "Word模板文件", "Word报告模板网盘", "DOCX文档模板搜索", "Word公文模板"],
  },
  {
    slug: "mindmap-template",
    title: "思维导图模板搜索",
    query: "思维导图模板",
    category: "/category/education",
    summary: "思维导图模板按主题、结构、编辑软件和导出格式查找，图片版与可编辑源文件要分清。",
    overview: "思维导图可用于读书笔记、课程复习、项目拆解和会议整理。PNG 预览、PDF 成品与 XMind、MindManager、FreeMind 源文件的可编辑程度不同。",
    tips: "使用“主题 + 软件或格式”，例如“项目复盘 XMind 模板”“初中历史思维导图”或“空白树状图 Word”。需要继续修改时明确加入可编辑。",
    check: "核对节点是否完整、层级是否清楚、源文件能否打开以及字体是否缺失。现成知识导图可能有事实或版本错误，学习资料仍要对照教材和可靠来源。",
    searchExamples: ["思维导图模板", "思维导图模板可编辑", "XMind模板网盘", "Word思维导图模板", "空白思维导图框架"],
  },
  {
    slug: "thesis-template",
    title: "论文模板资料搜索",
    query: "论文模板",
    category: "/category/education",
    summary: "论文模板按学校、院系、学位、年份和编辑软件查找，格式要求以当前官方文件为准。",
    overview: "论文模板常包含封面、摘要、目录、标题样式、引用格式和附录，不同学校、院系与学位层次可能有完全不同的规范。网上旧模板不能代表当前提交要求。",
    tips: "使用“学校 + 学位 + 年份 + 格式”，例如“某大学硕士论文 Word 模板”。只查某一部分时加入参考文献、目录、封面或 LaTeX，减少无关范文。",
    check: "逐项核对学校最新通知、页边距、字体、编号、图表题注和参考文献格式。模板只解决排版，不应复制示例正文、数据或未经授权的研究内容。",
    searchExamples: ["论文模板格式", "论文模板Word电子版", "毕业论文Word模板", "LaTeX论文模板资源", "硕士论文格式模板"],
  },
  {
    slug: "industry-report",
    title: "行业报告资料搜索",
    query: "行业报告资料",
    category: "/category/education",
    summary: "行业报告按行业、地区、时间、发布机构与统计口径查找，发布日期比文件数量更重要。",
    overview: "行业报告可能来自政府、协会、企业、券商或研究机构，覆盖市场规模、竞争格局、用户行为和趋势判断。相同标题的摘要版、宣传版与完整报告不能混为一谈。",
    tips: "使用“行业 + 地区 + 年份 + 发布机构”，例如“新能源汽车 2026 行业报告”。需要底层数据时补统计口径或数据表，不要只搜“最新报告大全”。",
    check: "查看发布日期、作者、样本、方法、指标定义和引用来源，区分事实数据与机构预测。做商业决策前应回到发布机构确认版本和使用许可。",
    searchExamples: ["行业报告资料搜索", "行业研究报告网盘", "2026行业报告PDF", "市场研究报告资料", "行业报告数据来源"],
  },
  {
    slug: "standards-manuals",
    title: "标准规范与技术手册搜索",
    query: "标准规范资料",
    category: "/category/education",
    summary: "标准、规范和手册按编号、发布机构、年份与适用范围查找，废止版本不能直接用于当前项目。",
    overview: "标准规范可能有国家、行业、地方、团体与企业版本，技术手册也会随产品型号和固件更新。编号相近或文件名相同并不代表适用范围一致。",
    tips: "优先使用“完整编号 + 年份”，产品手册再加入品牌、型号与固件版本。只知道主题时先查发布机构和现行编号，再用准确名称搜索文件。",
    check: "核对封面、发布与实施日期、替代关系、勘误和适用条款。工程、医疗、安全等关键用途必须以官方现行文本为准，公开索引只能用于查找线索。",
    searchExamples: ["标准规范资料分享", "国家标准PDF搜索", "行业规范网盘资料", "技术手册PDF资源", "产品说明书文件搜索"],
  },
  {
    slug: "ielts",
    title: "雅思学习资料搜索",
    query: "雅思资料",
    category: "/category/education",
    summary: "雅思听说读写资料按考试类型、目标分数、年份和题型查找，机考与纸笔内容要区分。",
    overview: "雅思资料包括官方真题、词汇、听力、阅读、写作和口语练习，Academic 与 General Training 的阅读和写作并不相同。预测题和回忆材料不能替代官方样题。",
    tips: "写明 A 类或 G 类、目标分数与科目，例如“雅思 A 类写作 7 分”或“机考听力练习”。真题搜索加入册数，课程加入讲师和年份。",
    check: "音频、题册和答案应能对应，口语题库要查看适用季节，评分标准以官方说明为准。过旧技巧可以参考，但不能忽略题型和机考界面的变化。",
    searchExamples: ["雅思资料网盘", "雅思资料百度网盘", "雅思真题音频资源", "雅思写作学习资料", "雅思机考资料"],
  },
  {
    slug: "toefl",
    title: "托福学习资料搜索",
    query: "托福资料",
    category: "/category/education",
    summary: "托福资料按考试版本、目标分数、科目和年份查找，旧题型课程需要单独识别。",
    overview: "托福资料覆盖阅读、听力、口语、写作、词汇和模拟考试，考试时长与题型调整后，旧课程中的时间分配和题量可能不再适用。",
    tips: "使用“托福 + 科目 + 年份或目标分”，例如“托福口语 2026”“托福 100 分听力”。需要模考时写明 TPO、音频、答案和解析。",
    check: "核对课程发布日期、考试版本、音频完整度、答案与解析是否对应。报名、题型和评分信息应以考试主办方当前说明为准。",
    searchExamples: ["托福资料百度网盘", "托福资料推荐", "托福TPO音频资源", "托福口语学习资料", "托福模考资料"],
  },
  {
    slug: "cet",
    title: "四六级学习资料搜索",
    query: "四六级资料",
    category: "/category/education",
    summary: "英语四级和六级资料按考试级别、年份、题型与真题套数查找，听力文件要和试卷对应。",
    overview: "四六级资料通常包含历年真题、听力音频、词汇、翻译、写作和模拟题。四级与六级难度和题目不同，年份不清楚的合集也可能混入旧题型。",
    tips: "写明 CET-4 或 CET-6、年份和科目，例如“2025 六级听力真题”。需要解析时加入答案详解，需要词汇时说明乱序、词根或高频词。",
    check: "核对试卷、音频、答案和年份是否一一对应，真题内容可对照正规出版物。考试时间、报名和成绩规则以学校及官方通知为准。",
    searchExamples: ["四六级资料百度网盘", "四六级资料电子版", "英语四级真题音频", "英语六级学习资料", "CET6写作资料"],
  },
  {
    slug: "accounting-exam",
    title: "会计考试资料搜索",
    query: "会计考试资料",
    category: "/category/education",
    summary: "初级、中级、注会和税务师资料按考试、科目与年份查找，会计与税法内容对时效要求很高。",
    overview: "会计考试资料可能涉及初级会计、中级会计、注册会计师和税务师，不同考试的科目、难度与报名规则并不相同。法规和教材每年都可能调整。",
    tips: "使用“考试名称 + 年份 + 科目”，例如“2026 注会会计讲义”或“中级财务管理真题”。课程可补讲师，题库可补章节或历年真题。",
    check: "核对教材版本、课程年份、法规变化、题目答案和勘误。报名条件、考试大纲和政策应以财政部门或考试机构的正式通知为准。",
    searchExamples: ["会计考试资料", "初级会计资料网盘", "注册会计师课程资源", "中级会计真题资料", "税务师学习资料"],
  },
  {
    slug: "legal-exam",
    title: "法考学习资料搜索",
    query: "法考资料",
    category: "/category/education",
    summary: "法考客观题、主观题和各科资料按考试年份、阶段与法条版本查找。",
    overview: "法律职业资格考试资料包括理论法、民法、刑法、诉讼法、商经知和行政法等科目，客观题与主观题的训练方式不同。法律修订会直接影响旧讲义和题目答案。",
    tips: "使用“年份 + 阶段 + 科目 + 讲师”，例如“2026 法考客观题民法”。找法条时写明版本，找真题时补年份和解析。",
    check: "确认课程年份、法条更新、讲义与视频是否配套，争议题要查看权威解析。报名政策、考试范围和法律文本以官方发布的当前版本为准。",
    searchExamples: ["法考资料百度网盘", "法考资料2026", "法考资料电子版", "法考主观题课程资源", "法考真题解析"],
  },
  {
    slug: "construction-exam",
    title: "建造师考试资料搜索",
    query: "建造师资料",
    category: "/category/education",
    summary: "一级、二级建造师资料按年份、专业、科目和地区查找，法规与实务内容需核对版本。",
    overview: "建造师考试分一级和二级，并包含建筑、机电、市政、公路、水利等专业。公共科目与专业实务资料不能混用，地方报名要求也可能不同。",
    tips: "使用“级别 + 年份 + 专业 + 科目”，例如“2026 二建市政实务”或“一建项目管理真题”。需要精讲课程时再补讲师或机构。",
    check: "核对教材、法规、课程和题库年份，确认实务案例属于对应专业。报名、资格审核和考试安排应以当地人事考试机构通知为准。",
    searchExamples: ["建造师资料百度网盘", "二级建造师资料", "一建市政课程资源", "二建实务真题资料", "建造师法规讲义"],
  },
  {
    slug: "medical-exam",
    title: "医学考试资料搜索",
    query: "医学考试资料",
    category: "/category/education",
    summary: "医学考试资料按考试名称、专业、科目和年份查找，学习资料不能替代临床指南与专业判断。",
    overview: "医学考试覆盖执业医师、执业药师、护士资格和卫生专业技术资格等多种类别，报考条件、科目和教材差异很大。旧知识点还可能与现行指南不一致。",
    tips: "写明完整考试名称、年份与科目，例如“2026 临床执业医师实践技能”。题库加入章节或历年真题，课程加入基础、冲刺或技能阶段。",
    check: "核对考试大纲、教材、指南和课程年份，题目答案应查看勘误。涉及诊疗与用药的信息只能用于学习，实际问题应遵循现行规范并咨询专业人员。",
    searchExamples: ["医学考试资料网", "执业医师资料网盘", "执业药师课程资源", "护士资格真题资料", "医学考试题库"],
  },
  {
    slug: "data-analysis",
    title: "数据分析课程搜索",
    query: "数据分析课程",
    category: "/category/education",
    summary: "数据分析课程按 Excel、SQL、Python、统计和可视化方向查找，先确定工具与项目目标。",
    overview: "数据分析课程可能侧重表格处理、SQL 查询、Python、统计方法、商业分析或可视化。只有软件操作而没有数据口径和业务问题的课程，很难形成完整分析能力。",
    tips: "使用“工具 + 场景 + 难度”，例如“SQL 用户留存分析”“Python Pandas 入门”或“Power BI 销售看板”。项目课程应补行业和数据规模。",
    check: "确认课程有练习数据、源码、环境说明和结果校验，查看软件与库版本。示例数据可以练习，但真实业务数据要注意隐私、权限与统计口径。",
    searchExamples: ["数据分析课程百度网盘", "数据分析课程视频", "SQL数据分析课程", "Python数据分析项目", "Power BI课程资源"],
  },
  {
    slug: "ai-course",
    title: "人工智能课程搜索",
    query: "人工智能课程",
    category: "/category/education",
    summary: "人工智能课程按数学基础、机器学习、深度学习、生成式 AI 和工程实践查找。",
    overview: "人工智能课程跨度很大，从线性代数、概率统计到机器学习、神经网络、自然语言处理和模型部署都有不同前置要求。课程标题里的“从零到精通”不能说明实际难度。",
    tips: "写明方向、框架和学习目标，例如“PyTorch 深度学习入门”“机器学习项目实战”或“LLM 应用开发”。涉及 API 和框架时补课程年份。",
    check: "核对数学前置、代码、数据集、依赖版本、算力要求和许可证。模型能力与接口变化较快，旧课程应结合当前官方文档验证。",
    searchExamples: ["人工智能课程资源", "人工智能课程教材", "机器学习课程网盘", "深度学习项目课程", "大模型应用开发资料"],
  },
  {
    slug: "primary-school",
    title: "小学学习资料搜索",
    query: "小学学习资料",
    category: "/category/education",
    summary: "小学资料按年级、学科、教材版本、学期和地区查找，家长应先核对课程进度。",
    overview: "小学学习资料包括课本配套练习、知识点、阅读、口算、英语听力和复习卷。不同地区、教材版本与学期进度可能不一致，过量练习也不等于更适合孩子。",
    tips: "使用“年级 + 学科 + 教材版本 + 学期”，例如“三年级数学人教版下册”。需要复习时补单元或期末，需要听力时写明音频与课本版本。",
    check: "核对教材、章节、答案、难度与发布日期，先抽查题目是否超纲或有错。学习安排应结合孩子实际情况，学校通知和正式教材优先。",
    searchExamples: ["小学学习资料网站", "小学复习资料网盘", "小学语文电子资料", "小学数学同步练习", "小学英语听力资源"],
  },
  {
    slug: "middle-school",
    title: "初中学习资料搜索",
    query: "初中学习资料",
    category: "/category/education",
    summary: "初中资料按年级、学科、教材版本、地区和考试阶段查找，尤其要区分中考范围。",
    overview: "初中资料包含同步课程、知识点、实验、真题和中考复习。不同地区的教材、考试科目与命题方式可能不同，旧中考资料也可能不符合当前范围。",
    tips: "写明年级、学科、版本和地区，例如“八年级物理人教版上册”或“上海中考数学 2025”。专题复习再补函数、古诗文或实验等具体内容。",
    check: "核对教材目录、考试年份、地区、答案和解析，理化实验内容要符合学校安全要求。招生与考试政策以当地教育部门信息为准。",
    searchExamples: ["初中学习资料电子版", "初中学习资料网盘", "中考真题资料搜索", "初中物理课程资源", "初中英语听力资料"],
  },
  {
    slug: "high-school",
    title: "高中学习资料搜索",
    query: "高中学习资料",
    category: "/category/education",
    summary: "高中资料按选科、教材版本、地区、年级与高考年份查找，旧题型和旧政策要单独识别。",
    overview: "高中学习资料包括同步课程、专题训练、实验、学业水平考试和高考复习。新旧教材、选科组合和地区卷不同，只有“高中全套”很难判断适用范围。",
    tips: "使用“年级 + 科目 + 版本或地区 + 阶段”，例如“高二数学选择性必修”或“2026 新高考物理”。真题应补全国卷或省份。",
    check: "核对教材版本、命题地区、考试年份、答案和解析，确认课程是否覆盖当前选科要求。高考政策与考试说明应以当地官方发布为准。",
    searchExamples: ["高中学习资料网站", "高中资料电子版", "高考真题网盘资源", "高中数学课程资料", "新高考物理资料"],
  },
].map((item) => ({ ...item, updatedAt: "2026-07-23" }));

const topicDefinitions: TopicDefinition[] = [
  ...coreTopicDefinitions,
  ...materialTopicDefinitions,
  ...extendedTopicDefinitions,
];

function firstSentence(text: string): string {
  const sentence = text.split("。")[0]?.trim() || text.trim();
  return sentence.endsWith("。") ? sentence : `${sentence}。`;
}

function topicGuideLinks(item: TopicDefinition): [string, string] {
  if (item.slug === "magnet-search") return ["/guide/magnet-basics", "/guide/safe-use"];
  if (item.category === "/category/software" || item.category === "/category/design") {
    return ["/guide/safe-use", "/guide/file-version"];
  }
  if (item.category === "/category/education") {
    return ["/guide/search-tips", "/guide/file-version"];
  }
  return ["/guide/file-version", "/guide/dead-links"];
}

function buildPanPages(): SeoPage[] {
  return panDefinitions.map((item) => ({
    kind: "pan",
    slug: item.slug,
    path: `/pan/${item.slug}`,
    eyebrow: "网盘平台",
    title: `${item.name}资源搜索`,
    seoTitle: `${item.name}资源搜索 - 好搜库`,
    description: `${item.summary}${firstSentence(item.searchTips)}`,
    summary: item.summary,
    searchKeyword: item.query,
    searchExamples: item.searchExamples,
    updatedAt: UPDATED_AT,
    indexable: true,
    facts: [
      { label: "检索范围", value: "公开分享索引" },
      { label: "结果处理", value: "多来源去重" },
      { label: "失效处理", value: "确认后隐藏" },
    ],
    sections: [
      { title: `哪些内容适合用${item.name}查找`, paragraphs: [item.bestFor] },
      { title: "怎样写出更准确的关键词", paragraphs: [item.searchTips] },
      { title: "访问结果前需要注意", paragraphs: [item.note] },
    ],
    related: item.related,
  }));
}

function buildCategoryPages(): SeoPage[] {
  return categoryDefinitions.map((item) => ({
    kind: "category",
    slug: item.slug,
    path: `/category/${item.slug}`,
    visualStyle: item.slug === "movie" ? "cinema" : undefined,
    eyebrow: "资源分类",
    title: item.name,
    seoTitle: `${item.name}网盘搜索 - 好搜库`,
    description: `${item.summary}${firstSentence(item.tips)}`,
    summary: item.summary,
    searchKeyword: item.query,
    searchExamples: item.searchExamples,
    updatedAt: item.updatedAt || UPDATED_AT,
    indexable: true,
    facts: item.slug === "movie"
      ? [
          { label: "推荐写法", value: "片名 + 年份" },
          { label: "版本条件", value: "片源、编码、字幕" },
          { label: "结果处理", value: "多来源去重" },
        ]
      : [
          { label: "覆盖平台", value: "多个公开来源" },
          { label: "展示方式", value: "边搜边展示" },
          { label: "链接质量", value: "去重并过滤失效" },
        ],
    sections: [
      { title: `${item.name}包含什么`, paragraphs: [item.scope] },
      { title: "更有效的搜索方式", paragraphs: [item.tips] },
      { title: "如何判断结果质量", paragraphs: [item.quality] },
    ],
    related: item.related,
  }));
}

function topicFacts(item: TopicDefinition): SeoFact[] {
  if (item.slug === "4k-movie") {
    return [
      { label: "推荐写法", value: "片名 + 年份 + 2160P" },
      { label: "版本条件", value: "REMUX、HDR、音轨" },
      { label: "打开后核对", value: "片源、容量、兼容性" },
    ];
  }

  if (item.slug === "classic-movie") {
    return [
      { label: "推荐写法", value: "片名 + 年份 + 导演" },
      { label: "版本条件", value: "修复版、片长、画幅" },
      { label: "译名处理", value: "中文名与原名分开搜" },
    ];
  }

  if (item.slug === "movie-subtitles") {
    return [
      { label: "推荐写法", value: "片名 + 年份 + 片源" },
      { label: "匹配条件", value: "帧率、时间轴、语言" },
      { label: "常见格式", value: "SRT、ASS、SUP" },
    ];
  }

  if (item.category === "/category/education") {
    return [
      { label: "检索重点", value: "年份、科目、版本" },
      { label: "结果处理", value: "多来源并行" },
      { label: "打开后核对", value: "目录、时效、适用范围" },
    ];
  }

  if (item.category === "/category/design") {
    return [
      { label: "检索重点", value: "用途、格式、软件" },
      { label: "结果处理", value: "多来源去重" },
      { label: "打开后核对", value: "源文件、依赖、授权" },
    ];
  }

  if (item.category === "/category/music") {
    return [
      { label: "检索重点", value: "作品、版本、格式" },
      { label: "结果处理", value: "多来源去重" },
      { label: "打开后核对", value: "曲目、音质、发行信息" },
    ];
  }

  return [
    { label: "检索重点", value: "名称、年份、版本" },
    { label: "结果处理", value: "多来源去重" },
    { label: "打开后核对", value: "目录、格式、更新时间" },
  ];
}

function buildTopicPages(): SeoPage[] {
  return topicDefinitions.map((item) => ({
    kind: "topic",
    slug: item.slug,
    path: `/topic/${item.slug}`,
    visualStyle: CINEMA_TOPIC_SLUGS.has(item.slug) ? "cinema" : undefined,
    heroImage: getTopicVisual(item.slug),
    eyebrow: "精选专题",
    title: item.title,
    seoTitle: `${item.title} - 好搜库`,
    description: `${item.summary}${firstSentence(item.tips)}`,
    summary: item.summary,
    searchKeyword: item.query,
    searchExamples: item.searchExamples,
    updatedAt: item.updatedAt || UPDATED_AT,
    indexable: true,
    facts: topicFacts(item),
    sections: [
      { title: "专题范围", paragraphs: [item.overview] },
      { title: "关键词建议", paragraphs: [item.tips] },
      { title: "打开结果后先看什么", paragraphs: [item.check] },
    ],
    related: [item.category, ...topicGuideLinks(item)],
  }));
}

export const guidePages: SeoPage[] = [
  {
    kind: "guide",
    slug: "search-tips",
    path: "/guide/search-tips",
    eyebrow: "使用指南",
    title: "怎样更快找到准确结果",
    seoTitle: "网盘搜索技巧 - 好搜库使用指南",
    description: "网盘搜索先保留核心名称，再用年份、版本、作者或格式缩小范围；需要指定网盘时，搜索完成后再筛选平台。",
    summary: "从核心名称开始，再逐步加入年份、版本、作者或格式，比堆叠宽泛词更有效。",
    searchKeyword: "Python 教程",
    searchExamples: ["网盘搜索技巧", "网盘资源怎么搜索", "网盘搜索关键词", "如何找到网盘资源"],
    updatedAt: UPDATED_AT,
    indexable: true,
    facts: [
      { label: "适用范围", value: "全部搜索来源" },
      { label: "核心方法", value: "先宽后窄" },
      { label: "推荐长度", value: "2-4 个关键信息" },
    ],
    sections: [
      {
        title: "先保留能识别内容的核心名称",
        paragraphs: [
          "第一次搜索只输入作品名、书名、课程名或软件名，不必同时加入“免费”“下载”“网盘”等来源页面经常重复的词。结果太多时，再补充年份、作者、季数、版本号或文件格式。",
        ],
      },
      {
        title: "用版本信息排除同名内容",
        paragraphs: [
          "影视可以加入上映年份、清晰度和字幕，软件可以加入系统与版本，考试资料可以加入地区、年份和科目。多个译名并存时，分别尝试中文名、英文名和常用别名，比把所有名称塞进一次搜索更可靠。",
        ],
      },
      {
        title: "把平台筛选放在搜索之后",
        paragraphs: [
          "先让多个来源返回结果，再通过页面上的平台筛选查看夸克、115 或其他网盘。只有明确需要某个平台时才在设置中关闭其他来源，以免过早缩小范围而漏掉可用分享。",
        ],
      },
    ],
    related: ["/guide/dead-links", "/pan/115", "/category/education"],
  },
  {
    kind: "guide",
    slug: "dead-links",
    path: "/guide/dead-links",
    eyebrow: "使用指南",
    title: "失效链接如何识别和处理",
    seoTitle: "网盘链接失效处理 - 好搜库使用指南",
    description: "好搜库按独立用户反馈记录链接状态，避免一次误报就删除结果，并在后续搜索中隐藏已经确认失效的地址。",
    summary: "一条链接需要至少两次独立失败反馈，并且失败数高于成功数，才会被确认为失效。",
    searchExamples: ["网盘链接失效怎么办", "百度网盘链接失效", "夸克网盘分享失效", "怎么判断网盘链接失效"],
    updatedAt: UPDATED_AT,
    indexable: true,
    facts: [
      { label: "确认门槛", value: "至少 2 次独立反馈" },
      { label: "记录周期", value: "30 天" },
      { label: "搜索影响", value: "自动隐藏确认失效项" },
    ],
    sections: [
      {
        title: "为什么不能一次反馈就删除",
        paragraphs: [
          "网盘访问失败可能来自临时网络、客户端限制、地区差异或提取信息错误。好搜库不会根据一次反馈直接删除结果，而是按匿名反馈者区分记录，降低误报和恶意标记造成的影响。",
        ],
      },
      {
        title: "系统怎样确认失效",
        paragraphs: [
          "只有至少两位独立用户报告失败，并且失败反馈多于成功反馈时，链接才会进入 dead 状态。后续搜索会批量查询健康记录并在返回前删除这些链接，不需要对每条结果进行耗时的实时探测。",
        ],
      },
      {
        title: "遇到错误状态怎么办",
        paragraphs: [
          "如果链接恢复访问，可以提交可用反馈，健康状态会根据最近 30 天的独立报告重新计算。需要提取码的链接会单独标记，不会因为密码提示而被当作失效。",
        ],
      },
    ],
    related: ["/guide/search-tips", "/about", "/category/movie"],
  },
  {
    kind: "guide",
    slug: "extract-code",
    path: "/guide/extract-code",
    eyebrow: "使用指南",
    title: "提取码和访问提示怎么看",
    seoTitle: "网盘提取码使用说明 - 好搜库",
    description: "百度网盘等分享可能带有提取码；复制结果时要保留完整信息，并区分登录提示、密码错误和链接失效。",
    summary: "复制需要提取码的结果时，应同时保存链接和页面展示的提取信息。",
    searchExamples: ["百度网盘提取码", "网盘链接没有提取码", "提取码怎么使用", "网盘访问提示怎么看"],
    updatedAt: UPDATED_AT,
    indexable: true,
    facts: [
      { label: "常见形式", value: "4 位提取码" },
      { label: "展示位置", value: "搜索结果备注" },
      { label: "安全原则", value: "不提交网盘账号密码" },
    ],
    sections: [
      {
        title: "提取码不是账号密码",
        paragraphs: [
          "部分公开分享使用短提取码限制直接访问。提取码通常与链接一起发布，只用于打开对应分享页面。任何要求提交网盘账号密码、短信验证码或支付信息的第三方页面都不应继续操作。",
        ],
      },
      {
        title: "复制时保留完整信息",
        paragraphs: [
          "百度网盘等结果可能把提取码显示在独立字段或标题备注中。复制链接后应同时记录该字段，避免跳转后再次返回查找；如果来源没有提供提取码，好搜库也无法自动恢复。",
        ],
      },
      {
        title: "访问提示不等于链接失效",
        paragraphs: [
          "需要客户端打开、要求输入正确提取码或提示登录，通常不能直接判断为失效。只有分享被取消、文件不存在等明确失败情况，才适合提交失效反馈。",
        ],
      },
    ],
    related: ["/guide/dead-links", "/pan/baidu", "/guide/safe-use"],
  },
  {
    kind: "guide",
    slug: "safe-use",
    path: "/guide/safe-use",
    eyebrow: "使用指南",
    title: "安全使用公开分享链接",
    seoTitle: "网盘资源安全使用指南 - 好搜库",
    description: "打开公开网盘分享前，学习识别可疑跳转、核对文件来源、检查软件安装包并保护个人账号信息。",
    summary: "好搜库提供公开索引，不托管文件；下载和打开内容前仍需核对来源与文件类型。",
    searchExamples: ["网盘资源安全吗", "网盘链接安全检查", "软件安装包怎么检查", "网盘分享真假判断"],
    updatedAt: UPDATED_AT,
    indexable: true,
    facts: [
      { label: "首要原则", value: "核对真实域名" },
      { label: "可执行文件", value: "检查签名与哈希" },
      { label: "账号信息", value: "不交给第三方页面" },
    ],
    sections: [
      {
        title: "确认跳转到了网盘官方域名",
        paragraphs: [
          "打开链接后先检查浏览器地址栏，确认域名属于对应网盘。遇到模仿登录页、额外下载器、强制关注或要求支付才能获取提取码的页面，应直接关闭。",
        ],
      },
      {
        title: "谨慎处理软件和压缩包",
        paragraphs: [
          "文档、图片和媒体文件也需要保持警惕，可执行程序和脚本风险更高。优先使用官方或开源项目发布渠道，必要时核对数字签名、文件哈希并使用安全工具扫描。",
        ],
      },
      {
        title: "不要泄露账号和验证信息",
        paragraphs: [
          "提取公开分享不需要把网盘账号密码交给第三方。不要发送短信验证码、恢复码或付款信息，也不要为了运行来源不明的软件而关闭系统安全功能。",
        ],
      },
    ],
    related: ["/guide/extract-code", "/terms", "/copyright"],
  },
  {
    kind: "guide",
    slug: "platform-filter",
    path: "/guide/platform-filter",
    eyebrow: "使用指南",
    title: "怎样按网盘平台筛选结果",
    seoTitle: "网盘平台筛选方法 - 好搜库使用指南",
    description: "搜索完成后按夸克、百度、阿里、115、迅雷等平台筛选结果，减少平台词占用关键词并保留更多可用分享。",
    summary: "先搜索内容，再筛选平台，通常比一开始把平台名写进关键词更容易找到结果。",
    searchExamples: ["只搜索夸克网盘", "115网盘资源怎么搜", "百度网盘筛选", "网盘平台怎么选择"],
    updatedAt: UPDATED_AT,
    indexable: true,
    facts: [
      { label: "推荐顺序", value: "先搜索再筛选" },
      { label: "适用情况", value: "明确需要某个平台" },
      { label: "结果不足", value: "恢复全部平台" },
    ],
    sections: [
      {
        title: "平台名称不一定要写进关键词",
        paragraphs: [
          "搜索引擎首先需要识别你要找的内容。片名、书名、课程名和版本号比“夸克网盘”或“百度云”更有区分度。先让多个来源返回结果，再按平台查看，可以避免因为索引标题没有写平台名而漏掉分享。",
        ],
      },
      {
        title: "什么时候适合只看一个平台",
        paragraphs: [
          "已经有对应账号、设备空间或客户端时，可以筛选固定平台。115 适合继续找长期收藏，夸克和 UC 在移动端较方便，百度网盘更常见旧资料；这些只是常见情况，不代表每次搜索都一样。",
        ],
      },
      {
        title: "结果太少时恢复全部来源",
        paragraphs: [
          "某个平台没有结果，不代表内容不存在。先去掉平台限制，比较其他网盘或磁力区是否有同名内容。找到准确标题后，也可以用标题里的年份、作者或版本重新搜索。",
        ],
      },
    ],
    related: ["/pan/quark", "/guide/search-tips", "/guide/no-results"],
  },
  {
    kind: "guide",
    slug: "no-results",
    path: "/guide/no-results",
    eyebrow: "使用指南",
    title: "搜索不到资源时怎么调整",
    seoTitle: "网盘资源搜索不到怎么办 - 好搜库",
    description: "网盘搜索没有结果时，尝试缩短关键词、切换译名、调整年份和版本，并恢复全部平台来源后再次查找。",
    summary: "先删掉平台词和宣传词，再尝试原名、别名或更短的核心名称。",
    searchExamples: ["网盘搜索不到资源", "夸克网盘搜不到", "百度网盘没有搜索结果", "资源搜索无结果怎么办"],
    updatedAt: UPDATED_AT,
    indexable: true,
    facts: [
      { label: "先做什么", value: "缩短关键词" },
      { label: "再尝试", value: "原名与常用别名" },
      { label: "平台范围", value: "恢复全部来源" },
    ],
    sections: [
      {
        title: "删掉不会帮助识别内容的词",
        paragraphs: [
          "“免费、下载、全集、网盘、最新版”等词经常出现在来源页面，却不一定写在真实标题里。搜索不到时先只保留作品名、书名、课程名或软件名，再逐步加年份和版本。",
        ],
      },
      {
        title: "分别尝试原名、译名和别名",
        paragraphs: [
          "影视、图书和海外课程常有多个中文译名。一次只搜一个名称，中文名没有结果再换英文原名、港台译名、作者或导演。把所有名称放在一起，反而可能没有任何来源完全匹配。",
        ],
      },
      {
        title: "检查平台和搜索范围",
        paragraphs: [
          "确认没有只启用单个平台，也可以在网盘区和磁力区之间切换。仍然没有结果时，换用更短的名称过一段时间再试，公开索引的内容和可用状态会持续变化。",
        ],
      },
    ],
    related: ["/guide/search-tips", "/guide/platform-filter", "/topic/kaogong"],
  },
  {
    kind: "guide",
    slug: "file-version",
    path: "/guide/file-version",
    eyebrow: "使用指南",
    title: "怎样用版本信息缩小结果",
    seoTitle: "网盘资源版本筛选方法 - 好搜库",
    description: "用年份、季数、清晰度、格式、系统和版次区分同名影视、软件、课程与电子书，减少打开错误结果。",
    summary: "不同内容有不同的版本线索，年份并不是唯一条件。",
    searchExamples: ["网盘资源版本筛选", "同名电影怎么搜索", "软件版本怎么搜索", "电子书版次怎么找"],
    updatedAt: UPDATED_AT,
    indexable: true,
    facts: [
      { label: "影视", value: "年份、季数、画质" },
      { label: "软件", value: "系统、版本、架构" },
      { label: "图书", value: "作者、译者、版次" },
    ],
    sections: [
      {
        title: "影视看年份、片源和字幕",
        paragraphs: [
          "同名电影先加上映年份，剧集补季数和完结状态，需要特定画质再加 4K、REMUX、HDR 或字幕语言。导演和主演也能帮助区分翻拍作品。",
        ],
      },
      {
        title: "软件看系统、架构和版本",
        paragraphs: [
          "Windows、macOS、Android 与 Linux 的安装包不能混用，x64 和 ARM64 也需要区分。技术课程要同时留意软件或框架版本，否则视频步骤可能与当前界面不一致。",
        ],
      },
      {
        title: "图书和资料看出版信息",
        paragraphs: [
          "电子书可以加入作者、译者、出版社、版次和格式，考试资料则加入年份、地区与科目。打开结果后仍要核对目录和版权页，标题里的版本可能写错。",
        ],
      },
    ],
    related: ["/guide/search-tips", "/category/movie", "/category/ebooks"],
  },
  {
    kind: "guide",
    slug: "magnet-basics",
    path: "/guide/magnet-basics",
    eyebrow: "使用指南",
    title: "磁力链接是什么，使用前看什么",
    seoTitle: "磁力链接搜索与安全说明 - 好搜库",
    description: "了解磁力链接、BTIH 标识和可用节点的关系，搜索磁力资源时核对名称、文件列表、大小与授权范围。",
    summary: "磁力链接不是文件本身，能否获取内容取决于网络中是否还有可用节点。",
    searchKeyword: "磁力资源",
    searchExamples: ["磁力链接是什么", "磁力链接怎么用", "磁力搜索没有速度", "磁力资源安全吗"],
    updatedAt: UPDATED_AT,
    indexable: true,
    facts: [
      { label: "核心标识", value: "BTIH 哈希" },
      { label: "是否可用", value: "取决于可用节点" },
      { label: "安全检查", value: "先看文件列表" },
    ],
    sections: [
      {
        title: "磁力链接只负责标识内容",
        paragraphs: [
          "常见磁力链接以 magnet:?xt=urn:btih: 开头，其中的哈希用于识别内容。链接本身不存放文件，也不能保证网络中仍有用户提供数据，所以搜索到链接不等于一定能完成获取。",
        ],
      },
      {
        title: "为什么有链接却没有速度",
        paragraphs: [
          "没有可用节点、网络限制、客户端设置或内容过旧都可能造成长时间无响应。好搜库只能整理公开索引，无法改变节点数量，也不会承诺每条磁力链接都可用。",
        ],
      },
      {
        title: "添加任务前先检查文件列表",
        paragraphs: [
          "核对名称、文件类型、大小和数量，警惕伪装成视频、文档或压缩包的可执行程序。使用磁力资源时应遵守所在地法律和内容授权，不下载或传播无权使用的内容。",
        ],
      },
    ],
    related: ["/topic/magnet-search", "/guide/safe-use", "/guide/no-results"],
  },
  {
    kind: "guide",
    slug: "search-modes",
    path: "/guide/search-modes",
    eyebrow: "使用指南",
    title: "精确搜索和模糊搜索怎么选",
    seoTitle: "网盘精确搜索与模糊搜索使用方法 - 好搜库",
    description: "了解精确搜索和模糊搜索的区别，根据片名、课程名、文件版本与别名选择合适模式，并在结果过少时逐步放宽条件。",
    summary: "名称和版本已经明确时先用精确搜索，只有别名、简称或零散线索时再用模糊搜索。",
    searchKeyword: "网盘精确搜索",
    searchExamples: ["网盘精确搜索在哪里", "百度网盘模糊搜索", "网盘精确搜索方法", "网盘搜索模式怎么选"],
    updatedAt: "2026-07-23",
    indexable: true,
    facts: [
      { label: "精确搜索", value: "优先匹配完整词组" },
      { label: "模糊搜索", value: "允许别名与相近写法" },
      { label: "切换原则", value: "先准后宽" },
    ],
    sections: [
      {
        title: "什么情况适合精确搜索",
        paragraphs: [
          "已经知道完整片名、书名、课程名、软件版本或文件编号时，精确搜索能减少标题中只碰巧出现部分词语的结果。短词和常见词不要单独使用，例如只搜“人生”很容易混入无关内容，应补作者、年份或完整作品名。",
        ],
      },
      {
        title: "什么情况适合模糊搜索",
        paragraphs: [
          "只记得简称、译名、主演、讲师或文件名的一部分时，可以使用模糊搜索。系统会尝试常见别名和相近写法，但范围更宽，结果中也更可能出现同名内容，需要继续用平台、年份和类型筛选。",
        ],
      },
      {
        title: "结果太少时怎样放宽",
        paragraphs: [
          "先删除“免费、全集、高清”等没有识别作用的词，再去掉平台名称或次要版本条件；完整名称仍无结果时，改用英文原名、作者或核心名词并切换到模糊模式。一次只改一个条件，才能知道是哪部分限制了结果。",
        ],
      },
    ],
    related: ["/guide/search-tips", "/guide/no-results", "/guide/file-version"],
  },
  {
    kind: "guide",
    slug: "filename-search",
    path: "/guide/filename-search",
    eyebrow: "使用指南",
    title: "怎样用文件名找到更准确的资源",
    seoTitle: "网盘文件名搜索方法 - 好搜库",
    description: "从影视发行名、课程目录、软件安装包和电子书文件名中保留有效字段，用文件名搜索更准确地定位版本与格式。",
    summary: "文件名里的年份、版本、格式和发行信息，通常比“高清”“全套”一类描述更有判断价值。",
    searchKeyword: "网盘文件名搜索",
    searchExamples: ["百度网盘搜索文件名", "网盘文件名搜索方法", "用文件名找电影资源", "安装包文件名怎么搜索"],
    updatedAt: "2026-07-23",
    indexable: true,
    facts: [
      { label: "优先保留", value: "名称、年份、版本" },
      { label: "影视字段", value: "片源、编码、发行组" },
      { label: "软件字段", value: "系统、架构、版本号" },
    ],
    sections: [
      {
        title: "先识别文件名里的有效字段",
        paragraphs: [
          "影视文件名通常包含作品名、年份、分辨率、片源、编码、音轨和发行组；软件安装包常写版本、系统与架构；电子书可能带作者、出版社和格式。保留能区分版本的字段，删除随机序号、复制次数和无意义括号。",
        ],
      },
      {
        title: "不要整段照抄过长文件名",
        paragraphs: [
          "完整文件名里可能有来源站标记、校验串和不同索引无法识别的分隔符。建议先搜索“核心名称 + 年份或版本 + 一个关键格式”，没有结果再增加发行组或文件扩展名；同一字段不要同时写多种等价形式。",
        ],
      },
      {
        title: "命中后仍需核对目录",
        paragraphs: [
          "搜索结果标题可能沿用旧文件名，分享目录却已经改动。打开后要再次比较文件大小、集数、版本、扩展名和更新时间，软件还应优先去官网核对签名或哈希。",
        ],
      },
    ],
    related: ["/guide/file-version", "/guide/search-modes", "/guide/safe-use"],
  },
  {
    kind: "guide",
    slug: "format-search",
    path: "/guide/format-search",
    eyebrow: "使用指南",
    title: "按文件格式搜索时写什么",
    seoTitle: "按文件格式搜索网盘资源的方法 - 好搜库",
    description: "按 PDF、EPUB、FLAC、PSD、Figma、DWG、MP4 等文件格式查找资源，理解扩展名、容器、编码和工程文件的区别。",
    summary: "格式词适合解决兼容性问题，但必须和内容名称、用途或软件版本一起使用。",
    searchKeyword: "文件格式搜索",
    searchExamples: ["网盘文件格式搜索", "PDF资料怎么搜索", "EPUB电子书资源搜索", "PSD源文件网盘搜索"],
    updatedAt: "2026-07-23",
    indexable: true,
    facts: [
      { label: "文档格式", value: "PDF、DOCX、EPUB" },
      { label: "媒体格式", value: "MP4、MKV、FLAC" },
      { label: "工程格式", value: "PSD、FIG、DWG" },
    ],
    sections: [
      {
        title: "扩展名只能说明文件类型",
        paragraphs: [
          "PDF 可能是可复制文字、扫描图片或加密文档，MKV 和 MP4 是媒体容器，真正的画面与音频还由编码决定。PSD、FIG、DWG 等工程文件能否编辑，则取决于图层、链接资源和软件版本。",
        ],
      },
      {
        title: "格式要和具体内容一起写",
        paragraphs: [
          "单独搜索 EPUB、FLAC 或 PSD 范围太宽，应组合书名、歌手、项目类型或素材用途，例如“书名 EPUB”“歌手 专辑 FLAC”或“包装样机 PSD”。需要兼容特定软件时再补版本。",
        ],
      },
      {
        title: "打开后检查真实格式",
        paragraphs: [
          "标题里的格式可能来自发布者描述，不一定与压缩包内文件一致。下载前先看目录和扩展名，获取后再用可信软件查看元数据；不要通过双击来判断伪装成文档或视频的可执行文件。",
        ],
      },
    ],
    related: ["/guide/filename-search", "/guide/file-version", "/guide/safe-use"],
  },
];

export const legalPages: SeoPage[] = [
  {
    kind: "legal",
    slug: "about",
    path: "/about",
    eyebrow: "关于好搜库",
    title: "让分散的公开索引更容易使用",
    seoTitle: "关于好搜库 - 网盘公开索引工具",
    description: "好搜库搜索公开索引并整理网盘分享信息，重复地址会被合并，确认失效的结果会被隐藏，本站不存储第三方文件。",
    summary: "好搜库聚合公开可访问的索引信息，不存储或上传第三方网盘文件。",
    updatedAt: UPDATED_AT,
    indexable: true,
    facts: [
      { label: "产品类型", value: "网盘公开索引工具" },
      { label: "文件存储", value: "不存储第三方文件" },
      { label: "核心能力", value: "聚合、去重、健康反馈" },
    ],
    sections: [
      {
        title: "好搜库做什么",
        paragraphs: [
          "好搜库把多个公开搜索来源中的网盘分享信息集中到一个界面，统一整理标题、链接、平台与提取信息。搜索结果会逐步返回并按地址去重，减少用户在多个站点之间重复检索。",
        ],
      },
      {
        title: "好搜库不做什么",
        paragraphs: [
          "本站不上传、不保存、不修改第三方网盘文件，也不会绕过分享权限或访问限制。链接内容、有效期和访问规则由原发布者及对应网盘平台决定。",
        ],
      },
      {
        title: "怎样持续改善结果",
        paragraphs: [
          "搜索系统会合并重复内容，并根据独立用户反馈记录链接健康状态。确认失效的结果会在后续搜索中自动隐藏，来源故障则以部分成功方式返回，不阻断其他可用来源。",
        ],
      },
    ],
    related: ["/guide/search-tips", "/guide/dead-links", "/copyright"],
  },
  {
    kind: "legal",
    slug: "copyright",
    path: "/copyright",
    eyebrow: "版权与下架",
    title: "尊重权利人的合法权益",
    seoTitle: "版权投诉与内容下架 - 好搜库",
    description: "好搜库版权投诉、索引移除和权利证明提交说明。本站不存储第三方网盘文件。",
    summary: "权利人可以提交明确的作品、结果链接和权利证明，我们会核实并处理相关索引。",
    updatedAt: UPDATED_AT,
    indexable: true,
    facts: [
      { label: "处理对象", value: "搜索索引记录" },
      { label: "必要信息", value: "作品、链接、权利证明" },
      { label: "文件位置", value: "由第三方平台管理" },
    ],
    sections: [
      {
        title: "投诉需要包含哪些信息",
        paragraphs: [
          "请提供权利人或授权代理人的身份说明、涉及作品的准确名称、好搜库中出现的具体分享链接、权利归属证明以及可以接收处理结果的联系方式。信息不完整会影响核实速度。",
        ],
      },
      {
        title: "我们可以处理什么",
        paragraphs: [
          "好搜库可以移除自身索引中的相关记录，并阻止相同地址再次出现在搜索结果。由于本站不托管网盘文件，删除源文件或关闭分享需要同时联系对应网盘平台。",
        ],
      },
      {
        title: "避免滥用投诉机制",
        paragraphs: [
          "提交者应保证材料真实、准确，并对错误或恶意通知承担相应责任。对所有权存在争议、无法确认具体链接或不属于本站索引的请求，我们会说明无法直接处理的原因。",
        ],
      },
    ],
    related: ["/terms", "/privacy", "/about"],
  },
  {
    kind: "legal",
    slug: "privacy",
    path: "/privacy",
    eyebrow: "隐私说明",
    title: "只收集运行服务所需的信息",
    seoTitle: "隐私政策 - 好搜库",
    description: "好搜库在搜索、收藏同步、链接反馈和基础访问分析过程中，只处理提供功能与防止滥用所需的数据。",
    summary: "搜索词、匿名反馈标识和必要的服务日志用于提供功能、限制滥用和改善结果。",
    updatedAt: "2026-07-24",
    indexable: true,
    facts: [
      { label: "本地数据", value: "设置与未同步收藏" },
      { label: "服务数据", value: "搜索与匿名反馈记录" },
      { label: "用途", value: "运行、风控、质量改进" },
    ],
    sections: [
      {
        title: "浏览器本地保存的信息",
        paragraphs: [
          "主题偏好、搜索设置、未开启同步的收藏和匿名访问标识主要保存在浏览器本地。匿名标识用于计算访客和会话，不包含姓名、手机号或账号信息。清除站点数据会移除这些信息，本站不会要求用户为了基础搜索创建账号。",
        ],
      },
      {
        title: "服务端处理的信息",
        paragraphs: [
          "为完成搜索和改善热门推荐，服务会处理用户提交的关键词。访问分析记录匿名访客与会话、页面、来源类型、推广活动、国家或地区代码、设备类别、浏览器类别、性能指标和脱敏后的客户端错误。本站不保存 IP、完整来源地址、完整 User-Agent 或错误调用堆栈，也不会把匿名访问标识与真实身份关联。链接健康反馈使用不可逆标识区分独立报告者，收藏同步仅保存完成该功能所需的加密或结构化数据。",
        ],
      },
      {
        title: "安全和保留期限",
        paragraphs: [
          "必要日志用于故障排查、速率限制和防止滥用，并按运行需要限制保留范围。链接健康报告按 30 天窗口重新计算，过期记录不会继续影响当前判断。",
        ],
      },
    ],
    related: ["/terms", "/about", "/guide/safe-use"],
  },
  {
    kind: "legal",
    slug: "terms",
    path: "/terms",
    eyebrow: "使用条款",
    title: "合理使用搜索与公开索引",
    seoTitle: "使用条款 - 好搜库",
    description: "阅读好搜库的服务范围、用户责任、禁止行为、第三方链接和结果可用性说明，了解使用公开索引时需要遵守的基本规则。",
    summary: "使用者应遵守所在地法律、第三方平台规则和内容授权范围，不得滥用搜索服务。",
    updatedAt: UPDATED_AT,
    indexable: true,
    facts: [
      { label: "服务性质", value: "信息检索与链接聚合" },
      { label: "第三方内容", value: "由原平台与发布者负责" },
      { label: "禁止行为", value: "攻击、滥用、违法使用" },
    ],
    sections: [
      {
        title: "服务范围",
        paragraphs: [
          "好搜库提供公开索引的检索、聚合、去重和链接健康反馈。本站不控制第三方分享内容，不保证每条链接永久有效，也不承诺所有来源在任何时间都可以访问。",
        ],
      },
      {
        title: "用户责任",
        paragraphs: [
          "用户应自行判断内容的合法性、准确性和安全性，并遵守对应网盘平台的服务规则。不得利用本站侵犯知识产权、传播违法内容、收集个人隐私或实施其他违法行为。",
        ],
      },
      {
        title: "服务保护",
        paragraphs: [
          "禁止自动化攻击、绕过速率限制、批量滥用接口、提交虚假健康反馈或干扰正常用户。为保障服务稳定，好搜库可以限制异常请求并调整来源、缓存和展示策略。",
        ],
      },
    ],
    related: ["/privacy", "/copyright", "/about"],
  },
];

export const panPages = buildPanPages();
export const categoryPages = buildCategoryPages();
export const topicPages = buildTopicPages();
export { intentPages };
export const seoHubs: SeoHub[] = [
  {
    kind: "pan",
    path: "/pan",
    label: "网盘平台",
    title: "按网盘平台查找",
    seoTitle: "网盘平台搜索入口与使用方法 - 好搜库",
    description: "查看夸克、阿里、百度、115、迅雷、UC、123、天翼、移动云盘、PikPak 和蓝奏云的资源搜索入口与关键词写法。",
    summary: "不同平台常见的内容和访问方式不一样，先看平台特点，再决定是否单独筛选。",
    updatedAt: UPDATED_AT,
  },
  {
    kind: "category",
    path: "/category",
    label: "资源分类",
    title: "按内容类型查找",
    seoTitle: "网盘资源分类与搜索方法 - 好搜库",
    description: "按电影、电视剧、纪录片、学习资料、软件、音乐、动漫、电子书和设计素材浏览网盘搜索方法。",
    summary: "影视看年份和版本，资料看科目和时效，软件看系统与架构。先选类型，再写关键词。",
    updatedAt: UPDATED_AT,
  },
  {
    kind: "topic",
    path: "/topic",
    label: "精选专题",
    title: "常用搜索专题",
    seoTitle: "常用网盘资源搜索专题 - 好搜库",
    description: "浏览考试、语言学习、编程、影视、音乐、漫画、办公文档、设计素材、模板、预设和 3D 模型等具体搜索专题。",
    summary: "每个专题对应一个具体需求，写清搜索条件、文件格式和打开结果后需要核对的信息。",
    updatedAt: "2026-07-23",
  },
  {
    kind: "intent",
    path: "/search",
    label: "组合搜索",
    title: "按平台和内容一起查找",
    seoTitle: "网盘平台与资源类型组合搜索 - 好搜库",
    description: "浏览 5000 个按夸克、百度、阿里、115、迅雷、UC、123、天翼等网盘与电影、电视剧、课程、电子书、软件、音乐和素材整理的长尾关键词。",
    summary: "已经知道想用哪个网盘、要找哪类内容时，可以从组合入口查看具体关键词、搜索方法和结果核对方式。",
    updatedAt: "2026-07-25",
  },
  {
    kind: "guide",
    path: "/guide",
    label: "使用指南",
    title: "把搜索用得更顺手",
    seoTitle: "网盘搜索使用指南 - 好搜库",
    description: "阅读精确与模糊搜索、文件名和格式搜索、平台筛选、无结果处理、版本判断、失效链接与磁力安全说明。",
    summary: "遇到搜不到、版本太多、格式不对或链接打不开等情况，可以从这里找到具体处理方法。",
    updatedAt: "2026-07-23",
  },
];
export const allSeoPages: SeoPage[] = [
  ...panPages,
  ...categoryPages,
  ...topicPages,
  ...intentPages,
  ...guidePages,
  ...legalPages,
];

const pagesByPath = new Map(allSeoPages.map((page) => [page.path, page]));

export function getSeoPage(path: string): SeoPage | undefined {
  return pagesByPath.get(path);
}

export function getSeoPageByKind(
  kind: SeoPageKind,
  slug: string
): SeoPage | undefined {
  return allSeoPages.find((page) => page.kind === kind && page.slug === slug);
}

export function getSeoPageTextLength(page: SeoPage): number {
  return [
    page.title,
    page.description,
    page.summary,
    ...(page.searchExamples || []),
    ...(page.keywordGroups || []).flatMap((group) => [
      group.label,
      group.description,
      ...group.keywords,
    ]),
    ...page.sections.flatMap((section) => [
      section.title,
      ...section.paragraphs,
      ...(section.points || []),
    ]),
  ].join("").replace(/\s+/g, "").length;
}

export function isSeoPageIndexable(page: SeoPage): boolean {
  const hasUsefulSearchExamples =
    page.kind === "legal" ||
    Boolean(
      page.searchExamples &&
      page.searchExamples.length >= 4 &&
      page.searchExamples.length <= 5 &&
      new Set(page.searchExamples).size === page.searchExamples.length
    );

  return Boolean(
    page.indexable &&
      hasUsefulSearchExamples &&
      page.path.startsWith("/") &&
      page.seoTitle.length >= 8 &&
      page.seoTitle.length <= 65 &&
      page.description.length >= 35 &&
      page.description.length <= 170 &&
      page.sections.length >= 2 &&
      getSeoPageTextLength(page) >= 220
  );
}

export function getIndexableSeoPages(): SeoPage[] {
  const seenTitles = new Set<string>();
  const seenPaths = new Set<string>();
  return allSeoPages.filter((page) => {
    if (!isSeoPageIndexable(page)) return false;
    if (seenTitles.has(page.seoTitle) || seenPaths.has(page.path)) return false;
    seenTitles.add(page.seoTitle);
    seenPaths.add(page.path);
    return true;
  });
}
