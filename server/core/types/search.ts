import { z } from 'zod';

/**
 * 搜索请求参数验证 Schema
 * 防止恶意输入，确保参数合法性
 */
export const SearchRequestSchema = z.object({
  // 搜索关键词
  kw: z.string()
    .trim()
    .min(1, '搜索词不能为空')
    .max(100, '搜索词过长（最大100字符）')
    .regex(/^[a-zA-Z0-9\u4e00-\u9fa5\s]+$/, '搜索词包含非法字符（仅支持中文、英文、数字、空格）'),

  // 并发数
  conc: z.number()
    .int()
    .min(1, '并发数至少为1')
    .max(20, '并发数不能超过20')
    .optional(),

  // 频道列表（逗号分隔）
  channels: z.string()
    .optional()
    .transform((val) => val ? val.split(',').filter(Boolean) : undefined)
    .refine(
      (val) => !val || val.length <= 50,
      '最多选择50个频道'
    ),

  // 是否强制刷新（支持字符串和布尔值）
  refresh: z.union([z.enum(['true', 'false']), z.boolean()])
    .optional()
    .transform((val) => {
      if (typeof val === 'boolean') return val;
      return val === 'true';
    }),

  // 返回结果类型
  res: z.enum(['merged_by_type', 'results', 'all'])
    .default('merged_by_type'),

  // 数据来源
  src: z.enum(['all', 'tg', 'plugin'])
    .default('all'),

  // 指定插件（逗号分隔）
  plugins: z.string()
    .optional()
    .transform((val) => val ? val.split(',').filter(Boolean) : undefined)
    .refine(
      (val) => !val || val.length <= 20,
      '最多指定20个插件'
    ),

  // 云盘类型过滤（逗号分隔）
  cloud_types: z.string()
    .optional()
    .transform((val) => val ? val.split(',').filter(Boolean) : undefined)
    .refine(
      (val) => !val || val.length <= 10,
      '最多指定10种云盘类型'
    ),

  // 扩展参数（JSON字符串）
  ext: z.string()
    .optional()
    .refine(
      (val) => {
        if (!val) return true;
        try {
          JSON.parse(val);
          return true;
        } catch {
          return false;
        }
      },
      'ext 必须是有效的 JSON 字符串'
    )
    .transform((val) => val ? JSON.parse(val) : undefined),
});

// 从 Schema 推导出的 TypeScript 类型
export type SearchRequest = z.infer<typeof SearchRequestSchema>;

/**
 * 热搜记录请求验证 Schema
 */
export const HotSearchRecordSchema = z.object({
  term: z.string()
    .trim()
    .min(1, '搜索词不能为空')
    .max(100, '搜索词过长（最大100字符）')
    .regex(/^[a-zA-Z0-9\u4e00-\u9fa5\s]+$/, '搜索词包含非法字符'),
});

export type HotSearchRecord = z.infer<typeof HotSearchRecordSchema>;

/**
 * 搜索结果类型定义
 */
export interface SearchResult {
  message_id: string;
  unique_id: string;
  channel: string;
  datetime: string;
  title: string;
  content: string;
  links: Array<{
    type: string;
    url: string;
    password: string;
  }>;
}

/**
 * 合并后的链接结果
 */
export interface MergedLinks {
  baidu: Array<{ url: string; password: string; title: string }>;
  aliyun: Array<{ url: string; password: string; title: string }>;
  quark: Array<{ url: string; password: string; title: string }>;
  tianyi: Array<{ url: string; password: string; title: string }>;
  xunlei: Array<{ url: string; password: string; title: string }>;
  mobile: Array<{ url: string; password: string; title: string }>;
  '115': Array<{ url: string; password: string; title: string }>;
  '123': Array<{ url: string; password: string; title: string }>;
  uc: Array<{ url: string; password: string; title: string }>;
  pikpak: Array<{ url: string; password: string; title: string }>;
  lanzou: Array<{ url: string; password: string; title: string }>;
  magnet: Array<{ url: string; password: string; title: string }>;
  ed2k: Array<{ url: string; password: string; title: string }>;
  others: Array<{ url: string; password: string; title: string }>;
}

/**
 * 搜索响应类型
 */
export interface SearchResponse {
  total: number;
  results?: SearchResult[];
  merged_by_type?: MergedLinks;
}

/**
 * 热搜项类型
 */
export interface HotSearchItem {
  term: string;
  score: number;
  last_searched: string;
  created_at: string;
}
