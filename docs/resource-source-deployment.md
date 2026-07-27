# 搜索资料库部署

静态资料源由 `haosouku-resource-sync` 定时同步到主站共用的 D1。主站搜索只读取 D1；实时来源由独立插件并行补充，不阻塞已经返回的结果。

首次部署按以下顺序执行：

```bash
pnpm migrate:cf
pnpm exec wrangler secret put GITHUB_TOKEN --config cloudflare/resource-sync/wrangler.jsonc
pnpm exec wrangler secret put SYNC_TOKEN --config cloudflare/resource-sync/wrangler.jsonc
pnpm deploy:cf:sources
pnpm deploy:cf
```

`GITHUB_TOKEN` 只需要公开仓库只读权限，用于保证定时同步不受匿名 API 配额影响。`SYNC_TOKEN` 保护手动同步入口。部署后可向同步 Worker 的 `/sync` 发起带 `Authorization: Bearer <SYNC_TOKEN>` 的 POST 请求完成首次全量导入；之后 Cron 每 6 小时检查一次版本，仅在来源变化时更新。

主站和同步 Worker 必须绑定同一个 `haosouku-data` D1。来源名称在搜索结果中只显示为“影视资料库”“学习资料库”等站内名称。

## 质量监控与链接巡检

- 增量资料每 10 分钟同步，完整资料每 6 小时检查一次。
- 链接巡检每 15 分钟处理一批，优先检查用户点击、反馈和长期未检查的链接。
- 自动检测连续两次确认失效后才隔离；隔离链接会定期复检，恢复后重新进入搜索结果。
- `/api/ops/quality?days=7` 返回零结果率、P50/P95 搜索耗时、来源评分、链接有效率、巡检积压和目录增长。搜索词明细只有配置 `NUXT_OPS_TOKEN` 并传入 `x-ops-token` 时才返回。

容量回归使用本地 D1，不会写入生产数据：

```bash
pnpm benchmark:d1
```

默认验证 10 万、50 万和 100 万行的 FTS 查询、状态过滤、索引一致性与更新触发器。
