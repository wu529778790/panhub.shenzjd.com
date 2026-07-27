import { normalizeSearchKeyword } from "./searchKeyword";

const ALIAS_GROUPS = [
  ["肖申克的救赎", "the shawshank redemption"],
  ["霸王别姬", "farewell my concubine"],
  ["阿甘正传", "forrest gump"],
  ["这个杀手不太冷", "léon the professional", "leon the professional"],
  ["千与千寻", "spirited away"],
  ["星际穿越", "interstellar"],
  ["盗梦空间", "inception"],
  ["教父", "the godfather"],
  ["蝙蝠侠黑暗骑士", "the dark knight"],
  ["低俗小说", "pulp fiction"],
  ["搏击俱乐部", "fight club"],
  ["黑客帝国", "the matrix"],
  ["泰坦尼克号", "titanic"],
  ["寄生虫", "parasite"],
  ["奥本海默", "oppenheimer"],
  ["无间道", "infernal affairs"],
  ["让子弹飞", "let the bullets fly"],
  ["卧虎藏龙", "crouching tiger hidden dragon"],
  ["功夫", "kung fu hustle"],
  ["叶问", "ip man"],
  ["阿凡达", "avatar"],
  ["权力的游戏", "冰与火之歌", "game of thrones", "got"],
  ["绝命毒师", "breaking bad"],
  ["风骚律师", "better call saul"],
  ["怪奇物语", "stranger things"],
  ["龙之家族", "house of the dragon"],
  ["行尸走肉", "the walking dead"],
  ["黑镜", "black mirror"],
  ["西部世界", "westworld"],
  ["曼达洛人", "the mandalorian"],
  ["最后生还者", "the last of us"],
  ["三体", "three body", "three-body problem"],
  ["沙丘", "dune"],
  ["复仇者联盟", "avengers"],
  ["蜘蛛侠", "spider-man", "spiderman"],
  ["流浪地球", "the wandering earth"],
  ["哪吒", "nezha", "ne zha"],
  ["哈利波特", "harry potter", "hp"],
  ["指环王", "魔戒", "the lord of the rings", "lotr"],
  ["生活大爆炸", "the big bang theory", "tbbt"],
  ["老友记", "friends"],
  ["进击的巨人", "attack on titan", "shingeki no kyojin"],
  ["鬼灭之刃", "demon slayer", "kimetsu no yaiba"],
  ["海贼王", "one piece"],
  ["火影忍者", "naruto"],
  ["死神", "bleach"],
  ["咒术回战", "jujutsu kaisen"],
  ["间谍过家家", "spy x family"],
  ["葬送的芙莉莲", "frieren beyond journey's end", "sousou no frieren"],
  ["死亡笔记", "death note"],
  ["钢之炼金术师", "fullmetal alchemist"],
  ["龙珠", "dragon ball"],
] as const;

const TRADITIONAL_TO_SIMPLIFIED: Record<string, string> = {
  臺: "台", 灣: "湾", 國: "国", 門: "门", 風: "风", 雲: "云",
  電: "电", 視: "视", 劇: "剧", 畫: "画", 動: "动", 漫: "漫",
  學: "学", 習: "习", 書: "书", 軟: "软", 體: "体", 遊: "游",
  戲: "戏", 寶: "宝", 龍: "龙", 馬: "马", 鬥: "斗", 華: "华",
  後: "后", 裡: "里", 發: "发", 復: "复", 聯: "联", 盟: "盟",
  權: "权", 與: "与", 萬: "万", 無: "无", 間: "间", 長: "长",
  開: "开", 關: "关", 絕: "绝", 命: "命", 護: "护", 檔: "档",
  資: "资", 源: "源", 網: "网", 盤: "盘", 線: "线", 頻: "频",
  輯: "辑", 錄: "录", 綜: "综", 藝: "艺", 兒: "儿", 歷: "历",
  史: "史", 戰: "战", 記: "记", 探: "探", 險: "险", 俠: "侠",
};

const SIMPLIFIED_TO_TRADITIONAL = Object.fromEntries(
  Object.entries(TRADITIONAL_TO_SIMPLIFIED).map(([traditional, simplified]) => [
    simplified,
    traditional,
  ])
);

function convertCharacters(value: string, map: Record<string, string>): string {
  return Array.from(value, (character) => map[character] || character).join("");
}

export function searchTitleCore(value: string): string {
  return String(value || "")
    .normalize("NFKC")
    .replace(/[（(]?(?:19|20)\d{2}[)）]?/gi, " ")
    .replace(/\bS(?:eason)?\s*0?\d{1,2}(?:E\d{1,3})?\b/gi, " ")
    .replace(/第\s*[一二三四五六七八九十\d]{1,3}\s*季(?:\s*第\s*\d{1,3}\s*集)?/g, " ")
    .replace(
      /\b(?:8k|4k|2160p|1080p|1080i|720p|uhd|fhd|hdr10\+?|hdr|dovi|dolby\s*vision|remux|blu[ ._-]?ray|web[ ._-]?(?:dl|rip)|hdtv|x26[45]|h26[45]|hevc|av1)\b/gi,
      " "
    )
    .replace(/\s+/g, " ")
    .trim();
}

function seasonAlias(value: string): string {
  const western = value.match(/\bS(?:eason)?\s*0?(\d{1,2})\b/i);
  if (western) return value.replace(western[0], `第${Number(western[1])}季`);
  const chinese = value.match(/第\s*([一二三四五六七八九十\d]{1,3})\s*季/);
  if (!chinese) return "";
  const numerals: Record<string, number> = {
    一: 1, 二: 2, 三: 3, 四: 4, 五: 5,
    六: 6, 七: 7, 八: 8, 九: 9, 十: 10,
  };
  const raw = chinese[1] || "";
  const number = Number(raw) || numerals[raw] || 0;
  return number ? value.replace(chinese[0], `S${String(number).padStart(2, "0")}`) : "";
}

export function buildSearchAliasVariants(keyword: string, limit = 2): string[] {
  const raw = String(keyword || "").normalize("NFKC").trim();
  if (!raw) return [];
  const normalized = normalizeSearchKeyword(raw);
  const core = searchTitleCore(raw);
  const normalizedCore = normalizeSearchKeyword(core);
  const aliases: string[] = [];
  const push = (value: string) => {
    const candidate = value.trim();
    if (!candidate || normalizeSearchKeyword(candidate) === normalized) return;
    if (aliases.some((item) => normalizeSearchKeyword(item) === normalizeSearchKeyword(candidate))) return;
    aliases.push(candidate);
  };

  const withoutYear = raw.replace(/(?:^|\s)[(（]?(?:19|20)\d{2}[)）]?(?:\s|$)/, " ").trim();
  push(seasonAlias(raw));
  if (withoutYear !== raw) push(withoutYear);
  if (core && normalizeSearchKeyword(core) !== normalized) push(core);

  const group = ALIAS_GROUPS.find((values) =>
    values.some((value) => {
      const candidate = normalizeSearchKeyword(value);
      return candidate === normalized || candidate === normalizedCore;
    })
  );
  for (const value of group || []) push(value);

  const simplified = convertCharacters(raw, TRADITIONAL_TO_SIMPLIFIED);
  const traditional = convertCharacters(raw, SIMPLIFIED_TO_TRADITIONAL);
  if (simplified !== raw) push(simplified);
  else if (traditional !== raw) push(traditional);

  return aliases.slice(0, Math.max(0, Math.min(3, limit)));
}
