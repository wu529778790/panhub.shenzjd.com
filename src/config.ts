/**
 * 接口地址（硬编码，指向 PanHub 官方服务）
 *
 * 本工程是 PanHub 开源的**纯静态前台**，只做两件事：
 *   1. 调 API 搜索
 *   2. 调 API「获取」（转存归因）
 *
 * 微信认证已移除。
 */
export const API_BASE = "https://panhub.shenzjd.com/api";

export const SITE_NAME = "PanHub";

/** 每轮搜索的累计结果上限（与后端默认一致：达到后出现「继续」） */
export const MAX_RESULTS_PER_ROUND = 90;
