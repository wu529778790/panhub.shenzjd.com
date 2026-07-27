import type { Ref } from "vue";
import {
  ALL_PLUGIN_NAMES,
  DEFAULT_USER_SETTINGS,
  STORAGE_KEYS,
} from "~/config/plugins";
import channelsConfig from "~/config/channels.json";

export interface UserSettings {
  enabledTgChannels: string[];
  enabledPlugins: string[];
  concurrency: number;
  pluginTimeoutMs: number;
  filterAdultContent: boolean;
}

export interface UseSettingsReturn {
  settings: Ref<UserSettings>;
  loadSettings: () => void;
  saveSettings: () => void;
  resetToDefault: () => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  onSelectAllTg: () => void;
  onClearAllTg: () => void;
}

// 模块级守卫：useSettings() 在多个组件中调用，loadSettings() 只需执行一次
let _settingsInitialized = false;
const CURRENT_SOURCE_VERSION = "15";
const PREVIOUS_DEFAULT_CONCURRENCY = 4;
const PREVIOUS_DEFAULT_TIMEOUT_MS = 5000;
const NEW_SEARCH_PLUGINS = [
  "全网索引",
  "精选资料库",
  "影视速搜",
  "影视直达",
  "资源补充",
  "磁力索引",
  "好搜聚合",
  "开放资源索引",
  "网络资源索引",
  "solidtorrents",
];
const NEW_SEARCH_CHANNELS = [
  "kuyupan",
  "WPpindao",
  "phzvip",
  "vip4kMovies",
  "dmhy_org",
  "solidsexydoll",
  "xiangnikanj",
  "pan123cloud",
  "Baidu_Netdisk",
  "bdyunpan",
  "djya5",
  "a123fxme",
  "x123panfxme",
  "xuexizil",
  "quark_ziyuan",
  "quarkF",
  "QuarkFree",
  "ydypzyfx",
  "movielover8888_film3",
  "ciliziyuanku",
  "FLMdongtianfudi",
  "jxwpzy",
  "kuake_yppan",
  "yoyokuakeduanju",
  "Netdisk_Movies",
  "WFYSFX03",
  "yeqingjie_GJG666",
  "ucshare",
  "yp123pan",
  "D_wusun",
  "MCPH03",
  "kduanju",
  "jzmm_123pan",
  "guoman4K",
  "kuakedongman",
  "SharePanFilms",
  "xxzlzn",
  "dzsgx",
  "douerpan",
  "baidu_yppan",
  "CBduanju",
  "dianying4k",
  "kkdj001",
  "qixingzhenren",
  "wp123zy",
  "yunpanNB",
  "yunpanquark",
  "zdqxm",
];

function getDefaultSettings(defaultTgChannels: string[]): UserSettings {
  return {
    enabledTgChannels: [...defaultTgChannels],
    enabledPlugins: [...DEFAULT_USER_SETTINGS.enabledPlugins],
    concurrency: DEFAULT_USER_SETTINGS.concurrency,
    pluginTimeoutMs: DEFAULT_USER_SETTINGS.pluginTimeoutMs,
    filterAdultContent: DEFAULT_USER_SETTINGS.filterAdultContent,
  };
}

export function useSettings(): UseSettingsReturn {
  const config = useRuntimeConfig();

  const defaultTgChannels = computed(() => {
    const configChannels = (config.public as any)?.tgDefaultChannels;
    if (Array.isArray(configChannels) && configChannels.length > 0) {
      return configChannels;
    }
    return channelsConfig.defaultChannels;
  });

  // 使用 Nuxt useState 替代模块级单例，SSR 安全
  const settings = useState<UserSettings>("user-settings", () =>
    getDefaultSettings(defaultTgChannels.value)
  );

  function loadSettings(): void {
    if (typeof window === "undefined") return;

    try {
      const raw = localStorage.getItem(STORAGE_KEYS.settings);
      if (!raw) return;

      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return;

      const validated: UserSettings = {
        enabledTgChannels: Array.isArray(parsed.enabledTgChannels)
          ? parsed.enabledTgChannels.filter((x: unknown) => typeof x === "string")
          : [...(defaultTgChannels.value?.length ? defaultTgChannels.value : channelsConfig.defaultChannels)],
        enabledPlugins: Array.isArray(parsed.enabledPlugins)
          ? parsed.enabledPlugins.filter((x: unknown) => typeof x === "string")
          : [...DEFAULT_USER_SETTINGS.enabledPlugins],
        concurrency:
          typeof parsed.concurrency === "number" && parsed.concurrency > 0
            ? Math.min(16, Math.max(1, parsed.concurrency))
            : DEFAULT_USER_SETTINGS.concurrency,
        pluginTimeoutMs:
          typeof parsed.pluginTimeoutMs === "number" && parsed.pluginTimeoutMs > 0
            ? parsed.pluginTimeoutMs
            : DEFAULT_USER_SETTINGS.pluginTimeoutMs,
        filterAdultContent:
          typeof parsed.filterAdultContent === "boolean"
            ? parsed.filterAdultContent
            : DEFAULT_USER_SETTINGS.filterAdultContent,
      };

      validated.enabledPlugins = validated.enabledPlugins.filter((name) =>
        ALL_PLUGIN_NAMES.includes(name as any)
      );
      const availableTgChannels = new Set(channelsConfig.defaultChannels);
      validated.enabledTgChannels = validated.enabledTgChannels.filter((name) =>
        availableTgChannels.has(name)
      );

      if (localStorage.getItem(STORAGE_KEYS.sourceVersion) !== CURRENT_SOURCE_VERSION) {
        // 只迁移旧默认值，保留用户手动调整过的并发和超时设置。
        if (validated.concurrency === PREVIOUS_DEFAULT_CONCURRENCY) {
          validated.concurrency = DEFAULT_USER_SETTINGS.concurrency;
        }
        if (validated.pluginTimeoutMs === PREVIOUS_DEFAULT_TIMEOUT_MS) {
          validated.pluginTimeoutMs = DEFAULT_USER_SETTINGS.pluginTimeoutMs;
        }
        for (const plugin of [...NEW_SEARCH_PLUGINS].reverse()) {
          if (!validated.enabledPlugins.includes(plugin)) {
            validated.enabledPlugins.unshift(plugin);
          }
        }
        for (const channel of [...NEW_SEARCH_CHANNELS].reverse()) {
          if (!validated.enabledTgChannels.includes(channel)) {
            validated.enabledTgChannels.unshift(channel);
          }
        }
        // 成人资源默认展示并单独归类；用户可在结果页主动隐藏。
        validated.filterAdultContent = false;
        localStorage.setItem(STORAGE_KEYS.sourceVersion, CURRENT_SOURCE_VERSION);
        localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(validated));
      }

      if (
        validated.enabledPlugins.length === 0 &&
        validated.enabledTgChannels.length === 0
      ) {
        validated.enabledPlugins = [...DEFAULT_USER_SETTINGS.enabledPlugins];
      }

      settings.value = validated;
    } catch (_error) {
      // Silent failure
    }
  }

  function saveSettings(): void {
    if (typeof window === "undefined") return;

    try {
      localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings.value));
    } catch (_error) {
      // Silent failure
    }
  }

  function resetToDefault(): void {
    if (typeof window === "undefined") return;

    try {
      localStorage.removeItem(STORAGE_KEYS.settings);
    } catch (_error) {
      // Silent failure
    }

    settings.value = getDefaultSettings(
      defaultTgChannels.value?.length ? defaultTgChannels.value : channelsConfig.defaultChannels
    );

    if (typeof window !== "undefined") {
      window.location.reload();
    }
  }

  function onSelectAll(): void {
    settings.value.enabledPlugins = [...ALL_PLUGIN_NAMES];
    saveSettings();
  }

  function onClearAll(): void {
    settings.value.enabledPlugins = [];
    saveSettings();
  }

  function onSelectAllTg(): void {
    settings.value.enabledTgChannels = [
      ...(defaultTgChannels.value?.length ? defaultTgChannels.value : channelsConfig.defaultChannels),
    ];
    saveSettings();
  }

  function onClearAllTg(): void {
    settings.value.enabledTgChannels = [];
    saveSettings();
  }

  if (typeof window !== "undefined" && !_settingsInitialized) {
    _settingsInitialized = true;
    loadSettings();
  }

  return {
    settings,
    loadSettings,
    saveSettings,
    resetToDefault,
    onSelectAll,
    onClearAll,
    onSelectAllTg,
    onClearAllTg,
  };
}
