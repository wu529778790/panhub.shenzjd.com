/**
 * API 集成测试
 * 测试完整的 API 端点流程，包括验证、错误处理和响应格式
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createApp, toNodeListener, defineEventHandler } from 'h3';
import type { App } from 'h3';
import { ofetch } from 'ofetch';
import http from 'node:http';

// 导入 API 处理器
import searchHandler from '../../server/api/search.get';
import hotSearchHandler from '../../server/api/hot-searches.get';

describe('API 集成测试', () => {
  let app: App;
  let server: http.Server;
  let apiBase: string;

  beforeAll(async () => {
    // 创建 H3 应用
    app = createApp();

    // 注册路由（模拟 Nuxt API 路由）
    app.use('/api/search', searchHandler);
    app.use('/api/hot-searches', hotSearchHandler);
    app.use('/api/health', defineEventHandler(() => ({
      status: 'ok',
      plugin_count: 10,
      plugins: ['hunhepan', 'labi', 'panta', 'jikepan', 'qupansou', 'thepiratebay', 'duoduo', 'xuexizhinan', 'pansearch', 'nyaa'],
    })));

    // 启动测试服务器
    server = http.createServer(toNodeListener(app));
    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const port = (server.address() as any).port;
        apiBase = `http://localhost:${port}/api`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  describe('搜索 API - 输入验证', () => {
    it('应该拒绝缺少关键词的请求', async () => {
      await expect(
        ofetch(`${apiBase}/search`, { retry: 0 })
      ).rejects.toThrow();
    });

    it('应该拒绝空关键词', async () => {
      try {
        await ofetch(`${apiBase}/search?kw=`, { retry: 0 });
        expect.fail('应该抛出错误');
      } catch (error: any) {
        expect(error.response?.status).toBe(400);
        const data = error.data || (error.response ? await error.response.json() : null);
        expect(data.code).toBe('VALIDATION_ERROR');
      }
    });

    it('应该拒绝过长的关键词', async () => {
      const longKeyword = 'a'.repeat(101);
      try {
        await ofetch(`${apiBase}/search?kw=${encodeURIComponent(longKeyword)}`, { retry: 0 });
        expect.fail('应该抛出错误');
      } catch (error: any) {
        expect(error.response?.status).toBe(400);
      }
    });

    it('应该拒绝无效的并发数', async () => {
      try {
        await ofetch(`${apiBase}/search?kw=test&conc=999`, { retry: 0 });
        expect.fail('应该抛出错误');
      } catch (error: any) {
        expect(error.response?.status).toBe(400);
      }
    });

    it('应该拒绝无效的 src 参数', async () => {
      try {
        await ofetch(`${apiBase}/search?kw=test&src=invalid`, { retry: 0 });
        expect.fail('应该抛出错误');
      } catch (error: any) {
        expect(error.response?.status).toBe(400);
      }
    });

    it('应该接受有效的搜索参数', async () => {
      // 这个测试会实际调用搜索，可能需要较长时间
      const result = await ofetch(`${apiBase}/search?kw=test&src=plugin&conc=1&refresh=true`, {
        retry: 0,
        timeout: 30000
      });

      expect(result).toBeDefined();
      expect(result.code).toBe(0);
      expect(result.data).toBeDefined();
    });
  });

  describe('搜索 API - POST 请求', () => {
    it('应该处理有效的 POST 请求', async () => {
      const result = await ofetch(`${apiBase}/search`, {
        method: 'POST',
        body: {
          kw: '测试',
          src: 'plugin',
          conc: 1,
          refresh: true,
        },
        retry: 0,
        timeout: 30000,
      });

      expect(result).toBeDefined();
      expect(result.code).toBe(0);
    });

    it('应该验证 POST 请求的参数', async () => {
      try {
        await ofetch(`${apiBase}/search`, {
          method: 'POST',
          body: { src: 'plugin' }, // 缺少 kw
          retry: 0,
        });
        expect.fail('应该抛出错误');
      } catch (error: any) {
        expect(error.response?.status).toBe(400);
      }
    });
  });

  describe('热搜 API', () => {
    it('应该返回热搜列表', async () => {
      const result = await ofetch(`${apiBase}/hot-searches?limit=5`, { retry: 0 });

      expect(result).toBeDefined();
      expect(result.code).toBe(0);
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data.hotSearches)).toBe(true);
    });

    it('应该验证 limit 参数', async () => {
      try {
        await ofetch(`${apiBase}/hot-searches?limit=1000`, { retry: 0 });
        expect.fail('应该抛出错误');
      } catch (error: any) {
        expect(error.response?.status).toBe(400);
      }
    });
  });

  describe('健康检查', () => {
    it('应该返回健康状态', async () => {
      const result = await ofetch(`${apiBase}/health`, { retry: 0 });

      expect(result.status).toBe('ok');
      expect(typeof result.plugin_count).toBe('number');
      expect(Array.isArray(result.plugins)).toBe(true);
    });
  });

  describe('错误响应格式', () => {
    it('应该返回标准错误格式', async () => {
      try {
        await ofetch(`${apiBase}/search?kw=<>`, { retry: 0 });
        expect.fail('应该抛出错误');
      } catch (error: any) {
        // ofetch 自动解析错误响应体
        const data = error.data || (error.response ? await error.response.json() : null);

        expect(data).toHaveProperty('code');
        expect(data).toHaveProperty('message');
        expect(data).toHaveProperty('data');
        expect(data).toHaveProperty('error');
        expect(data.error).toHaveProperty('statusCode');
      }
    });
  });
});
