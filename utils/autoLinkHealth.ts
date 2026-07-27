export type AutomaticLinkHealthStatus =
  | "unknown"
  | "alive"
  | "dead"
  | "password"
  | "suspect";

export interface AutomaticLinkHealthDecision {
  status: AutomaticLinkHealthStatus;
  reason: string;
  confidence: number;
}

export interface ConfirmedAutomaticLinkHealthDecision {
  decision: AutomaticLinkHealthDecision;
  failureStreak: number;
}

const DEAD_PATTERNS = [
  /分享(?:的)?(?:文件|内容)?(?:已|被)?(?:取消|删除|失效)/i,
  /(?:链接|分享)(?:已)?(?:失效|不存在|被删除|被取消)/i,
  /文件(?:已|被)?(?:删除|取消)|文件不存在/i,
  /来晚了[^。]{0,30}(?:取消|删除|失效)/i,
  /share[^\n]{0,40}(?:not found|expired|removed|deleted)/i,
  /file[^\n]{0,40}(?:not found|removed|deleted)/i,
];

const PASSWORD_PATTERNS = [
  /请输入(?:提取码|访问码|密码)/i,
  /(?:提取码|访问码|密码)(?:错误|不正确)/i,
  /(?:需要|输入).{0,8}(?:提取码|访问码|密码)/i,
  /password required/i,
];

const BLOCKED_PATTERNS = [
  /just a moment|cf-browser-verification|cf-chl-/i,
  /人机验证|安全验证|访问过于频繁|操作频繁|请求频繁/i,
  /captcha|verify you are human/i,
];

const ALIVE_PATTERNS = [
  /分享文件|文件列表|文件名称|文件大小/i,
  /share[_-]?(?:name|title)|file[_-]?(?:name|list)/i,
  /"(?:share|file)(?:Name|Title|List)"\s*:/i,
  /<meta[^>]+property=["']og:title["'][^>]+content=["'][^"']+/i,
];

function matchesAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

function responseMeaningfulText(body: string): string {
  const value = String(body || "").slice(0, 120_000);
  if (/^\s*[\[{]/.test(value)) return value;
  return value
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--([\s\S]*?)-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function classifyQuarkShareTokenResponse(
  httpStatus: number,
  body: string
): AutomaticLinkHealthDecision {
  if (httpStatus === 429) {
    return { status: "suspect", reason: "quark_rate_limited", confidence: 10 };
  }
  if (httpStatus === 401 || httpStatus === 403 || httpStatus >= 500) {
    return { status: "suspect", reason: "quark_api_unavailable", confidence: 10 };
  }
  let payload: Record<string, any> = {};
  try {
    payload = JSON.parse(String(body || "{}"));
  } catch {
    return { status: "unknown", reason: "quark_invalid_response", confidence: 0 };
  }
  const code = Number(payload.code);
  const message = String(payload.message || "");
  if (code === 0 && payload.data?.stoken) {
    return { status: "alive", reason: "quark_token_valid", confidence: 98 };
  }
  if (/提取码|访问码|密码/i.test(message)) {
    return { status: "password", reason: "quark_password_required", confidence: 95 };
  }
  if (
    code === 41006 ||
    Number(payload.status) === 404 ||
    /分享(?:不存在|已失效|已取消|已删除)|文件不存在/i.test(message)
  ) {
    return { status: "dead", reason: "quark_share_missing", confidence: 99 };
  }
  return { status: "unknown", reason: `quark_code_${code || 0}`, confidence: 0 };
}

/**
 * Interpret a public share response conservatively. Access restrictions and
 * upstream failures never become hard-dead results.
 */
export function classifyAutomaticLinkResponse(
  httpStatus: number,
  body: string,
  finalUrl = ""
): AutomaticLinkHealthDecision {
  const rawText = String(body || "").slice(0, 120_000);
  const text = responseMeaningfulText(rawText);

  if (httpStatus === 404 || httpStatus === 410) {
    return { status: "dead", reason: `http_${httpStatus}`, confidence: 98 };
  }
  if (httpStatus === 401 || httpStatus === 403) {
    return { status: "suspect", reason: "access_restricted", confidence: 20 };
  }
  if (httpStatus === 429) {
    return { status: "suspect", reason: "rate_limited", confidence: 10 };
  }
  if (httpStatus >= 500) {
    return { status: "suspect", reason: "upstream_error", confidence: 10 };
  }
  if (httpStatus < 200 || httpStatus >= 400) {
    return { status: "unknown", reason: `http_${httpStatus || 0}`, confidence: 0 };
  }
  if (matchesAny(text, DEAD_PATTERNS)) {
    return { status: "dead", reason: "explicit_invalid_page", confidence: 96 };
  }
  if (matchesAny(rawText, BLOCKED_PATTERNS)) {
    return { status: "suspect", reason: "verification_required", confidence: 10 };
  }
  if (matchesAny(text, PASSWORD_PATTERNS)) {
    return { status: "password", reason: "password_required", confidence: 85 };
  }
  if (/\/login\b|login\.|passport\./i.test(finalUrl)) {
    return { status: "suspect", reason: "login_redirect", confidence: 10 };
  }
  if (matchesAny(rawText, ALIVE_PATTERNS)) {
    return { status: "alive", reason: "share_content_visible", confidence: 80 };
  }
  return { status: "unknown", reason: "unrecognized_response", confidence: 0 };
}

export function nextAutomaticCheckDelayMs(
  status: AutomaticLinkHealthStatus
): number {
  switch (status) {
    case "alive":
      return 7 * 24 * 60 * 60 * 1_000;
    case "password":
      return 3 * 24 * 60 * 60 * 1_000;
    case "dead":
      return 30 * 24 * 60 * 60 * 1_000;
    case "suspect":
      return 12 * 60 * 60 * 1_000;
    default:
      return 24 * 60 * 60 * 1_000;
  }
}

/** A single invalid response is only a warning; two separate checks confirm it. */
export function confirmAutomaticLinkDecision(
  previousFailureStreak: number,
  decision: AutomaticLinkHealthDecision
): ConfirmedAutomaticLinkHealthDecision {
  if (decision.status === "dead") {
    const failureStreak = Math.max(0, previousFailureStreak) + 1;
    if (failureStreak < 2) {
      return {
        failureStreak,
        decision: {
          status: "suspect",
          reason: `awaiting_confirmation:${decision.reason}`,
          confidence: Math.min(60, decision.confidence),
        },
      };
    }
    return { decision, failureStreak };
  }
  if (decision.status === "alive" || decision.status === "password") {
    return { decision, failureStreak: 0 };
  }
  return {
    decision,
    failureStreak: Math.max(0, previousFailureStreak),
  };
}
