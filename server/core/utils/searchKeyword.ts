const CJK_PATTERN = /[\u3400-\u9fff]/;
// ASCII \u566a\u97f3\u8bcd\u7528 \b \u8fb9\u754c\uff08\u5bf9 ASCII \u751f\u6548\uff09
const NOISE_PATTERN_ASCII =
  /\b(4k|8k|720p|1080p|2160p|hdr|h265|x265|web-dl|webdl|bluray)\b/gi;
// CJK \u566a\u97f3\u8bcd\u4e0d\u80fd\u7528 \b\uff1aJavaScript \u7684 \b \u57fa\u4e8e \w\uff0cCJK \u4e0d\u5c5e\u4e8e \w\uff0c
// \u7528 \b \u4f1a\u5bfc\u81f4 "\u84dd\u5149\u7535\u5f71" \u4e2d\u7684 "\u84dd\u5149" \u6c38\u8fdc\u5339\u914d\u4e0d\u5230\u3002\u76f4\u63a5\u65e0\u8fb9\u754c\u5339\u914d\u3002
const NOISE_PATTERN_CJK = /(\u84dd\u5149|\u675c\u6bd4|\u56fd\u8bed|\u4e2d\u5b57|\u53cc\u5b57|\u5168\u96c6|\u5b8c\u7ed3)/g;
const BRACKET_PATTERN =
  /[\u3010\u3011\u300a\u300b\[\]()\uff08\uff09]/g;
const SPLIT_PATTERN = /[\s/|,，、·:：;；!?？！+]+/g;
const CJK_CONNECTOR_PATTERN = /[\u7684\u4e4b\u4e0e\u548c\u53ca]/g;

export function normalizeSearchKeyword(input: string): string {
  return (input || "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
}

export function buildSearchKeywordVariants(keyword: string): string[] {
  const raw = (keyword || "").trim();
  if (!raw) return [];

  const variants: string[] = [];
  const push = (value: string) => {
    const normalized = normalizeSearchKeyword(value);
    if (normalized.length < 2) return;
    if (variants.some((item) => normalizeSearchKeyword(item) === normalized)) return;
    variants.push(value.trim());
  };

  push(raw);

  const cleaned = raw
    .replace(BRACKET_PATTERN, " ")
    .replace(NOISE_PATTERN_ASCII, " ")
    .replace(NOISE_PATTERN_CJK, " ");
  push(cleaned);

  const compact = cleaned.replace(SPLIT_PATTERN, " ");
  push(compact);

  if (CJK_PATTERN.test(raw)) {
    const cjkParts = cleaned
      .replace(CJK_CONNECTOR_PATTERN, " ")
      .split(SPLIT_PATTERN)
      .map((part) => part.trim())
      .filter(Boolean);

    if (cjkParts.length > 1) {
      push(cjkParts.join(" "));
    }

    for (const part of cjkParts) {
      // 两个汉字的派生片段通常过宽（例如“救赎”），保留完整短查询，
      // 但不再把长片名拆成这类弱相关请求。
      if (CJK_PATTERN.test(part) && Array.from(normalizeSearchKeyword(part)).length < 3) {
        continue;
      }
      push(part);
    }
  }

  return variants.slice(0, 6);
}

export function matchesExactSearchKeyword(
  text: string,
  keyword: string
): boolean {
  const normalizedKeyword = normalizeSearchKeyword(keyword);
  if (!normalizedKeyword) return true;

  return normalizeSearchKeyword(text).includes(normalizedKeyword);
}

export function matchesSearchKeyword(text: string, keyword: string): boolean {
  const source = (text || "").trim();
  if (!keyword.trim()) return true;
  if (!source) return false;

  const normalizedSource = normalizeSearchKeyword(source);
  if (!normalizedSource) return false;

  return buildSearchKeywordVariants(keyword).some((variant) =>
    normalizedSource.includes(normalizeSearchKeyword(variant))
  );
}
