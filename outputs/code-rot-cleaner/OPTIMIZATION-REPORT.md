# 好搜库程序整理与性能审计

> 状态：CLEANUP VERIFIED。获批清理、搜索调度和磁力相关性优化均已完成验证并部署到 Cloudflare。

## 结论

当前最值得先做的不是继续增加并发，而是减少一次搜索的请求扇出，并让已经上线的来源质量策略真正生效。

- 默认启用 9 个插件、83 个 Telegram 频道。
- 客户端按“每插件 1 个请求、频道每批 8–16 个”拆分，一次完整搜索约发出 15 个 `/api/search` 请求。
- `/api/search` 当前限额为每分钟 40 次，因此两次完整搜索约用掉 30 次；第三次容易触发 429。
- 每个拆分请求都会重复读取来源质量策略、记录来源指标和登记链接健康任务。
- 线上 7 日窗口当前只有 2 次完整搜索样本，平均完成时间 5,666ms；样本虽少，但来源级指标已经明确暴露低效请求。

## 线上证据

| 来源 | 状态 | 请求数 | 平均耗时 | 空结果率 | 超时率 | 结论 |
|---|---:|---:|---:|---:|---:|---|
| 精选资料库 | active | 14 | 307ms | 7.1% | 0% | 保留为首屏快速源 |
| 全网索引 | warming | 7 | 805ms | 0% | 0% | 高价值快速源 |
| 频道索引 | active | 20 | 2,163ms | 0% | 0% | 结果丰富，分优先/深度两阶段 |
| 好搜聚合 | active | 9 | 3,227ms | 11.1% | 11.1% | 高产出慢源，放第二阶段 |
| solidtorrents | degraded | 8 | 3,053ms | 50% | 50% | 限制变体和预算 |
| nyaa | disabled | 8 | 3,274ms | 75% | 75% | 默认搜索应跳过 |
| 资源补充 | warming | 7 | 661ms | 85.7% | 0% | 低命中，按需补充 |
| pansearch | warming | 7 | 901ms | 85.7% | 0% | 低命中，按需补充 |

## P0：搜索链路优化

### PERF-001 — 把插件请求从 9 个合并为 2 个

涉及文件：

- `composables/useSearch.ts`
- `server/core/services/searchService.ts`
- 对应单元测试

保留 `精选资料库` 为独立快速请求，让首批结果仍可在约 300ms 返回；其余插件合并成一个服务端并发请求。这样浏览器并发槽不会先被 6 个插件占满，Telegram 优先频道可以同时开始。

预计每次完整搜索从约 15 个 Worker 请求降到约 8 个，减少约 47%。

### PERF-002 — 修复质量降级被默认设置绕过

`SearchService.searchPlugins()` 目前只有在没有传 `plugins` 参数时才排除 `disabled` 来源。客户端恰好逐个显式传入所有默认插件，所以 `nyaa` 已被策略标为 `disabled` 后仍持续被调用。

修改为：普通搜索始终排除 `disabled`；只有内部探测标记可以执行 `probe`。`degraded` 来源保留，但使用更短预算和单个关键词变体。

### PERF-003 — Telegram 分成“优先”和“深度”两阶段

先搜索 31 个优先频道并展示结果，再调度其余 52 个频道。用户暂停、改词或离开页面时，深度阶段立即取消。搜索范围不减少，只调整执行顺序。

## P1：维护性整理

### ARCH-001 — 合并 GET/POST 搜索入口的公共逻辑

`server/api/search.get.ts`（183 行）和 `server/api/search.post.ts`（152 行）重复了质量策略读取、服务调用、健康过滤、指标写入和结果包装。应提取一个共享 handler，仅保留 GET 查询串和 POST body 的解析差异。

这项主要降低后续修复只改一边的风险，不作为速度收益宣传。

### ARCH-002 — 清除未注册旧插件

以下 13 个插件文件没有任何入站导入，也不在 `server/core/services/index.ts` 的注册表中；文件内的自注册代码只有在模块被导入时才会执行。合计 1,812 行：

- `server/core/plugins/fox4k.ts`
- `server/core/plugins/hdr4k.ts`
- `server/core/plugins/huban.ts`
- `server/core/plugins/muou.ts`
- `server/core/plugins/ouge.ts`
- `server/core/plugins/pan666.ts`
- `server/core/plugins/panyq.ts`
- `server/core/plugins/shandian.ts`
- `server/core/plugins/susu.ts`
- `server/core/plugins/torrentgalaxy.ts`
- `server/core/plugins/wanou.ts`
- `server/core/plugins/x1337x.ts`
- `server/core/plugins/zhizhen.ts`

对应扫描候选：CRT-104–CRT-110、CRT-113–CRT-118。尚未在临时副本中完成删除证明。

### ARCH-003 — 统一包管理器

仓库规范和部署脚本使用 pnpm，但同时存在：

- `package-lock.json`：12,881 行，449,398 字节，已跟踪且有本地改动。
- `pnpm-lock.yaml`：8,372 行，280,797 字节，当前未跟踪。

应以 `pnpm-lock.yaml` 为唯一锁文件，但删除已有 `package-lock.json` 前必须先在临时副本验证构建和部署命令。

### ARCH-004 — 清理旧品牌/GitHub 元数据

此前要求隐藏 GitHub 信息，但仓库内仍有旧信息：

- `package.json` 的 `author`、`repository`、`bugs`、`homepage`。
- `README.md` 的旧 GitHub 部署按钮、旧域名和镜像地址。
- `wrangler.toml` 的 Worker 名仍为 `panhub-shenzjd-com`。

前两项可以纯文档/元数据清理。Worker 重命名可能新建 Cloudflare Worker 并影响路由，不应和普通代码清理一起做。

## P2：后续拆分，不纳入第一批

- `pages/index/index.vue`：1,641 行。
- `components/DoubanHotSection.vue`：1,104 行。
- `cloudflare/resource-sync/src/index.ts`：1,205 行。

这些文件偏大，但目前没有证据表明“拆文件”本身能改善运行速度。先完成 P0 并验证线上指标，再按职责拆分，避免无收益的大重构。

## 推荐验证顺序

1. 在临时副本运行当前基线：`pnpm test`、`pnpm build`。
2. 在独立临时副本删除旧插件和陈旧脚本，再运行同样命令。
3. 真实工作区应用获批的清理项。
4. 实现 PERF-001/002/003 和 ARCH-001，补充请求数量、禁用来源、GET/POST 一致性测试。
5. 再运行 `pnpm test`、`pnpm build`，随后部署 Cloudflare。
6. 对比部署前后的完整搜索请求数、首个结果时间、平均完成时间、429 比例和来源超时率。

## 执行结果（2026-07-23）

### 清理与请求扇出

- 已删除 13 个未注册旧插件、2 个陈旧测试/脚本和重复的 `package-lock.json`。
- 共减少 14,820 行、约 512KB；保留 `pnpm-lock.yaml` 作为唯一锁文件。
- 默认完整搜索从约 15 个 Worker 请求降为 8 个：2 个插件组、6 个 Telegram 批次。
- 快速资料库独立返回；优先 Telegram 频道先执行，深度频道后执行并支持可靠暂停/恢复。
- Web 搜索开始遵守来源质量策略，质量状态为 `disabled` 的来源不会再被默认启用列表绕过。

### 磁力相关性与安全过滤

- 英文别名采用完整单词、顺序和邻近距离校验，阻止 `three body` 命中只是在远处分别出现 `Three`、`Body` 的标题。
- 磁力结果在聚合层增加二次严格校验；SolidTorrents 也在插件层过滤不相关标题。
- Nyaa 保留 Sukebei 成人索引，Knaben 不隐藏成人分类；相关结果仍参与搜索。
- 成人内容识别词表补齐中英日常见显式词，并统一归入“成人资源”。
- 成人资源默认展示；结果页保留“过滤成人资源”开关，用户可自行选择隐藏。
- 长标题不再派生两个汉字的弱查询片段，完整的两个汉字原始查询仍正常保留。

### 验收

- 定向回归：41/41 通过。
- 排除两个依赖实时 Telegram 页面内容的测试后：237/237 通过。
- 全套：237/239 通过；仅 `tg-fetch.test.ts`、`tg-multipage.test.ts` 因上游当前返回 0 条而失败，与修改前一致。
- `pnpm build` 通过；Cloudflare Worker 启动时间 25ms。
- 部署版本：`728f1332-f273-4d32-8d43-999325a393fc`，域名 `haosouku.com`、`www.haosouku.com`。
- IndexNow：59 个 URL，HTTP 200。
- 生产浏览器烟测：8 个搜索请求（2 个插件、6 个 Telegram），无控制台错误；成人结果默认可见，隐藏/再次显示开关均通过。
- 生产真实搜索“ 三体 ”：59 条磁力结果，成人标记 0、可疑标题 0；此前可复现约 12 条无关成人标题。
- 生产成人番号搜索：11 条结果全部标记为“成人资源”，包括只有番号、没有描述词的标题。
- 首页实测：HTTP 200，约 0.40 秒；`www` 正常 308 跳转到主域名。
