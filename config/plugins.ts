// 插件名称常量
// 警告：此名单同时用于 Web 前端（设置面板勾选）、后端（默认启用列表）、小程序（默认启用列表）
// 修改时请同时检查：
//   - server/core/services/index.ts 中的插件注册
//   - server/core/plugins/ 下的插件实现
export const ALL_PLUGIN_NAMES = [
  "精选资料库",
  "好搜聚合",
  "影视速搜",
  "影视直达",
  "资源补充",
  "开放资源索引",
  "网络资源索引",
  "磁力索引",
  "全网索引",
  "pansearch",
  "nyaa",
  "solidtorrents",
] as const;

// 平台信息配置 — icon 为官方 favicon 图片路径
export const PLATFORM_INFO: Record<
  string,
  { name: string; color: string; icon: string }
> = {
  aliyun: { name: "阿里云盘", color: "#7c3aed", icon: "/icons/aliyun.png" },
  quark: { name: "夸克网盘", color: "#6366f1", icon: "/icons/quark.png" },
  baidu: { name: "百度网盘", color: "#2563eb", icon: "/icons/baidu.png" },
  "115": { name: "115网盘", color: "#f59e0b", icon: "/icons/115.png" },
  xunlei: { name: "迅雷云盘", color: "#fbbf24", icon: "/icons/xunlei.png" },
  uc: { name: "UC网盘", color: "#ef4444", icon: "/icons/uc.png" },
  tianyi: { name: "天翼云盘", color: "#ec4899", icon: "/icons/tianyi.png" },
  "123": { name: "123网盘", color: "#10b981", icon: "/icons/123.png" },
  mobile: { name: "移动云盘", color: "#0ea5e9", icon: "/icons/mobile.png" },
  pikpak: { name: "PikPak", color: "#5b6ee1", icon: "/icons/others.png" },
  lanzou: { name: "蓝奏云", color: "#2296f3", icon: "/icons/others.png" },
  others: { name: "其他网盘", color: "#6b7280", icon: "/icons/others.png" },
};

// 默认用户设置
export const DEFAULT_USER_SETTINGS = {
  enabledPlugins: [...ALL_PLUGIN_NAMES],
  concurrency: 6,
  pluginTimeoutMs: 4000,
  filterAdultContent: false,
} as const;

// 本地存储键名
export const STORAGE_KEYS = {
  settings: "panhub.settings",
  sourceVersion: "haosouku.sources.version",
  searchMode: "searchMode",
} as const;
