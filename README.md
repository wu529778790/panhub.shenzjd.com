# PanHub · 全网最全的网盘搜索

用一个搜索框，搜遍阿里云盘、夸克、百度网盘、115、迅雷等热门网盘资源。即搜即得、聚合去重、免费开源、零广告、轻量部署。

**在线体验**：<https://panhub.shenzjd.com>

> 免责声明：本项目仅用于技术学习与搜索聚合演示，不存储、不传播任何受版权保护的内容。

---

## 🚀 快速部署

### Vercel 一键部署
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fwu529778790%2Fpanhub.shenzjd.com&project-name=panhub&repository-name=panhub.shenzjd.com)

### Cloudflare Workers 一键部署
[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/wu529778790/panhub.shenzjd.com)

### Docker 部署
```bash
# 快速启动
docker run --name panhub -p 3000:3000 -d ghcr.io/wu529778790/panhub.shenzjd.com:latest

# 数据持久化（推荐）
mkdir -p /root/panhub/data
docker run -d --name panhub -p 3000:3000 \
  -v /root/panhub/data:/app/data \
  ghcr.io/wu529778790/panhub.shenzjd.com:latest
```

### 本地开发
```bash
pnpm install
pnpm dev          # 开发服务器
pnpm test         # 运行测试
pnpm build        # 构建生产版
```

---

## ✨ 核心功能

### 智能搜索
- **优先级频道**：高优先级频道优先处理，响应速度提升 50%+
- **批量并发**：独立配置优先/普通频道并发数
- **智能缓存**：LRU 淘汰 + 内存监控 + 过期清理
- **暂停/继续**：搜索过程可随时暂停，找到结果立即停止

### 用户体验
- **实时热搜**：展示其他用户搜索词，点击即可搜索
- **SQLite 持久化**：热搜数据本地存储（支持内存降级）
- **深色模式**：完整支持深色主题

### 稳定性
- **自动重试**：网络请求失败自动重试（指数退避）
- **超时控制**：可配置超时，避免无限等待
- **优雅降级**：单个插件失败不影响整体

---

## 📖 使用说明

### 搜索流程
1. **输入关键词并回车**开始搜索
2. **快速结果**：优先频道先返回（~50ms）
3. **深度结果**：剩余频道继续加载
4. **自动合并**：结果去重、按时间排序、分类型展示

### 操作按钮
- **暂停/继续**：随时控制搜索过程
- **重置**：取消所有请求，清空结果和输入框
- **热搜词**：点击直接搜索

### 设置配置
右上角设置面板可配置：
- 插件管理（启用/禁用）
- TG 频道列表（优先/普通）
- 性能参数（并发数、超时时间、缓存）

---

## 🔧 技术架构

### 核心模块
```
server/core/
├── cache/memoryCache.ts      # LRU 缓存系统
├── services/searchService.ts # 搜索服务（优先级批处理）
├── services/hotSearchSQLite.ts # SQLite 热搜持久化
├── services/tg.ts            # TG 频道抓取
├── plugins/manager.ts        # 插件管理器
└── utils/fetch.ts            # 网络请求（重试+超时）
```

### 热搜系统
```
用户搜索 → useSearch.ts → 记录到 SQLite → GET /api/hot-searches → 标签云展示
```

**特点**：不分类，所有搜索词统一展示为智能标签云，按频次决定视觉权重。

---

## 🧪 测试

```bash
pnpm test                    # 所有测试 (146个)
pnpm test:unit              # 单元测试 (112个)
pnpm test:integration       # 集成测试 (34个)
pnpm test:coverage           # 测试覆盖率
```

**测试覆盖**：
- ✅ 单元测试：112/112 通过
- ✅ 集成测试：34/34 通过
- ✅ 核心逻辑覆盖率：>90%

---

## 📚 文档

完整的项目文档位于 `docs/` 目录：

| 文档 | 说明 |
|------|------|
| [docs/README.md](docs/README.md) | 文档中心（导航） |
| [docs/快速参考.md](docs/快速参考.md) | 常用命令、快速调用 |
| [docs/API文档.md](docs/API文档.md) | 完整 API 参考 |
| [docs/部署指南.md](docs/部署指南.md) | Docker、Vercel、Cloudflare |
| [docs/架构设计.md](docs/架构设计.md) | 系统架构、核心模块 |
| [docs/单元测试指南.md](docs/单元测试指南.md) | 测试策略与规范 |
| [docs/集成测试指南.md](docs/集成测试指南.md) | API 与 E2E 测试 |
| [docs/未来优化点.md](docs/未来优化点.md) | 16 项优化计划 |

**快速开始**：
```bash
# 1. 查看快速参考
cat docs/快速参考.md

# 2. 阅读 API 文档
cat docs/API文档.md

# 3. 部署项目
cat docs/部署指南.md
```

---

## ⚙️ 环境变量

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `LOG_LEVEL` | `info` | 日志级别 |
| `NITRO_PRESET` | auto-detect | 部署预设 |
| `PORT` | `3000` | 服务端口 |

---

## 🔍 常见问题

### 1. Docker 数据不持久化？
检查是否挂载数据目录并使用 SQLite 模式：
```bash
curl http://localhost:3000/api/hot-search-stats
# 应返回 "mode": "sqlite"
```

### 2. 如何查看热搜数据？
```bash
# 查看热搜
curl http://localhost:3000/api/hot-searches?limit=30
```

### 3. 内存模式 vs SQLite 模式？
- **内存模式**：重启丢失数据，无需安装，适合开发/测试
- **SQLite 模式**：永久保存，需要编译环境，适合生产
- **Cloudflare Workers**：仅支持内存模式

### 4. 热搜记录规则？
- 搜索**开始时**立即记录（不管是否有结果）
- 自动刷新显示
- 保留最近 30 条高频搜索
- 自动过滤敏感词

---

## 🛡️ 版权与合规

- PanHub 不存储任何内容，所有链接来自公开网络
- 请遵守当地法律法规与平台使用条款
- 侵权问题请联系源站处理

---

## 📄 许可证

MIT License

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

**开发规范**：
- TypeScript 编写
- 核心功能必须包含单元测试
- 提交前运行 `pnpm test`
- 使用 Conventional Commits
