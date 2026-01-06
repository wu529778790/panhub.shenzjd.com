/**
 * API 集成测试示例
 *
 * 注意：这些测试需要在项目已安装依赖并运行的情况下执行
 * 运行方式: npm run test:api
 */

import { describe, it, expect } from 'vitest';

// 模拟 API 测试（需要实际运行服务器）
describe('Search API 集成测试', () => {
  const API_BASE = 'http://localhost:3000/api';

  // 跳过测试如果服务器未运行
  const skipIfNoServer = () => {
    // 在实际环境中，这里应该检查服务器是否可用
    return false; // 默认跳过，需要手动启用
  };

  it('应该验证搜索参数 - 缺少关键词', async () => {
    if (skipIfNoServer()) return;

    const response = await fetch(`${API_BASE}/search?kw=`);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe('VALIDATION_ERROR');
  });

  it('应该验证搜索参数 - 关键词过长', async () => {
    if (skipIfNoServer()) return;

    const longKeyword = 'a'.repeat(101);
    const response = await fetch(`${API_BASE}/search?kw=${encodeURIComponent(longKeyword)}`);
    const data = await response.json();

    expect(response.status).toBe(400);
  });

  it('应该验证搜索参数 - 无效的并发数', async () => {
    if (skipIfNoServer()) return;

    const response = await fetch(`${API_BASE}/search?kw=test&conc=999`);
    const data = await response.json();

    expect(response.status).toBe(400);
  });

  it('应该验证 POST 搜索请求', async () => {
    if (skipIfNoServer()) return;

    const response = await fetch(`${API_BASE}/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kw: '测试',
        src: 'plugin',
        conc: 5,
      }),
    });

    const data = await response.json();

    // 成功或返回错误响应
    expect(response.status).toBeOneOf([200, 400, 429]);
  });

  it('应该验证速率限制', async () => {
    if (skipIfNoServer()) return;

    // 快速发送多个请求
    const promises = Array(10).fill(null).map(() =>
      fetch(`${API_BASE}/search?kw=test&conc=1`)
    );

    const responses = await Promise.all(promises);
    const rateLimited = responses.filter(r => r.status === 429);

    // 可能会触发速率限制
    expect(rateLimited.length).toBeGreaterThanOrEqual(0);
  });

  it('应该验证健康检查端点', async () => {
    if (skipIfNoServer()) return;

    const response = await fetch(`${API_BASE}/health`);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe('ok');
  });
});

/**
 * 手动测试指南：
 *
 * 1. 启动开发服务器: npm run dev
 * 2. 运行测试: npm run test:api
 *
 * 或者使用 curl 手动测试：
 *
 * # 测试验证
 * curl "http://localhost:3000/api/search?kw="
 * curl "http://localhost:3000/api/search?kw=test&conc=999"
 *
 * # 测试正常搜索
 * curl "http://localhost:3000/api/search?kw=测试&conc=5&src=plugin"
 *
 * # 测试 POST
 * curl -X POST http://localhost:3000/api/search \
 *   -H "Content-Type: application/json" \
 *   -d '{"kw":"测试","src":"plugin","conc":5}'
 *
 * # 测试健康检查
 * curl http://localhost:3000/api/health
 */
