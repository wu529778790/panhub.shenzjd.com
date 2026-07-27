export interface PlatformSearchIntent {
  keyword: string;
  platform?: string;
}

const PLATFORM_ALIASES: Array<{
  platform: string;
  pattern: RegExp;
}> = [
  { platform: "aliyun", pattern: /阿里(?:云盘|网盘)/gi },
  { platform: "quark", pattern: /夸克网盘/gi },
  { platform: "baidu", pattern: /百度网盘/gi },
  { platform: "115", pattern: /115\s*网盘/gi },
  { platform: "xunlei", pattern: /迅雷(?:云盘|网盘)/gi },
  { platform: "uc", pattern: /UC\s*网盘/gi },
  { platform: "123", pattern: /123\s*网盘/gi },
  { platform: "tianyi", pattern: /天翼云盘/gi },
  { platform: "mobile", pattern: /(?:移动云盘|和彩云)/gi },
  { platform: "pikpak", pattern: /PikPak(?:网盘)?/gi },
  { platform: "lanzou", pattern: /蓝奏(?:云|网盘)/gi },
];

function normalizeKeyword(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .replace(/^[\s,，、|｜/]+|[\s,，、|｜/]+$/g, "")
    .trim();
}

/**
 * 把“片名 + 网盘名称”识别为平台搜索意图，避免把“115网盘”等
 * 导航词原样交给内容索引而造成零结果。
 */
export function parsePlatformSearchIntent(value: string): PlatformSearchIntent {
  const original = normalizeKeyword(value);
  let keyword = original;
  const matchedPlatforms = new Set<string>();

  for (const alias of PLATFORM_ALIASES) {
    const next = keyword.replace(alias.pattern, " ");
    if (next !== keyword) matchedPlatforms.add(alias.platform);
    keyword = next;
  }

  keyword = normalizeKeyword(keyword);
  if (!keyword) return { keyword: original };

  return {
    keyword,
    platform:
      matchedPlatforms.size === 1
        ? [...matchedPlatforms][0]
        : undefined,
  };
}
