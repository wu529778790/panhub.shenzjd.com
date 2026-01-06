import { z } from 'zod';

/**
 * 获取热搜列表请求验证 Schema
 */
export const GetHotSearchesSchema = z.object({
  limit: z.number()
    .int()
    .min(1, 'limit至少为1')
    .max(100, 'limit不能超过100')
    .default(30)
    .optional(),
});

export type GetHotSearchesRequest = z.infer<typeof GetHotSearchesSchema>;
