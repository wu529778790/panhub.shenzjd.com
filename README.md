# PanHub · 全网最全的网盘搜索

> 一个搜索框，搜遍全网网盘资源 —— 即搜即得、聚合去重、免费开源、零广告、轻量部署

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fwu529778790%2Fpanhub.shenzjd.com&project-name=panhub&repository-name=panhub.shenzjd.com)
[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/wu529778790/panhub.shenzjd.com)
[![Docker Hub](https://img.shields.io/badge/docker-ghcr.io-blue?logo=docker)](https://github.com/wu529778790/panhub.shenzjd.com/pkgs/container/panhub)

**在线体验**：<https://panhub.shenzjd.com>

---

## ✨ 核心特性

### 🔍 智能搜索

- **多源聚合**：同时搜索 Telegram 80+ 频道 + 20+ 第三方插件
- **优先级调度**：高优先级频道优先返回，首屏结果提速 50%+
- **批量并发**：独立配置优先/普通频道并发数，充分利用网络带宽
- **暂停/继续**：搜索过程可随时暂停，断点续跑不丢结果
- **插件熔断**：失败插件自动降级 5 分钟，避免拖慢整体搜索
- **请求超时取消**：AbortController 真正取消超时请求，不泄漏连接
- **智能缓存**：LRU 淘汰 + 内存监控 + 过期清理

### 📊 豆瓣影视榜单

- **12 个分类**：Top250、剧情、喜剧、动作、爱情、科幻、动画、悬疑、犯罪、战争、纪录片、电视剧
- **JSON API 驱动**：使用豆瓣内部 API 获取结构化数据，无需解析 HTML（Top250 除外）
- **24 小时缓存**：每个分类一天只请求一次，减少对豆瓣的压力
- **无限滚动**：滚动到底部自动加载更多内容
- **一键搜索**：点击任意影视，自动发起网盘搜索

### 🔗 链接检测助手（油猴脚本）

- **自动检测失效链接**：安装 Tampermonkey 脚本后，搜索结果中的失效链接自动标记删除线
- **零服务器负载**：检测全部在客户端通过 `GM_xmlhttpRequest` 完成
- **平台适配**：夸克、阿里、百度、115、迅雷等各平台分别检测
- **30 分钟缓存**：同一链接不重复检测

### 🔥 热门搜索

- **实时热搜**：展示其他用户搜索词，点击即可搜索
- **数据持久化**：SQLite 存储（Docker/本地）+ 内存降级（Serverless）
- **搜索统计**：实时展示热搜榜使用次数

### 🎨 用户体验

- **深色模式**：完整支持深色主题，自动跟随系统偏好
- **响应式设计**：完美适配桌面、平板、手机
- **优雅降级**：单个插件/频道失败不影响整体

### 🛡️ 安全与稳定性

- **限流防护**：API 路由限流，降低恶意请求对搜索服务的影响
- **SSRF 防护**：图片代理白名单 + URL 严格校验
- **输入校验**：关键词长度限制、并发数范围校验
- **错误处理**：统一的 `createError` 错误响应
- **125+ 测试用例**：核心逻辑全覆盖

---

## 🚀 快速开始

### 方式一：Vercel 一键部署（推荐）

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fwu529778790%2Fpanhub.shenzjd.com&project-name=panhub&repository-name=panhub.shenzjd.com)

### 方式二：Cloudflare Workers 一键部署

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/wu529778790/panhub.shenzjd.com)

### 方式三：Docker 部署

```bash
# 快速启动
docker run --name panhub -p 4000:4000 -d ghcr.io/wu529778790/panhub.shenzjd.com:latest

# 数据持久化（推荐）
mkdir -p /root/panhub/data
docker run -d --name panhub -p 4000:4000 \
  -v /root/panhub/data:/app/data \
  ghcr.io/wu529778790/panhub.shenzjd.com:latest
```

### 方式四：本地开发

```bash
# 安装依赖
npm install

# 开发服务器
npm dev

# 运行测试
npm test

# 构建生产版本
npm build
```

---

## 📖 使用指南

### 搜索流程

1. **输入关键词并回车**开始搜索
2. **快速结果**：优先频道先返回（~50ms）
3. **深度结果**：剩余频道继续加载
4. **自动合并**：结果去重、按时间排序、分类型展示

### 链接检测助手

1. 安装 [Tampermonkey](https://www.tampermonkey.net/) 浏览器扩展
2. 访问 [链接检测助手安装页](https://panhub.shenzjd.com/panhub-link-checker.user.js)
3. 点击安装，刷新 PanHub 页面即可生效

安装后搜索结果中的失效链接会自动标记 ~~删除线~~ + 红色"可能失效"标签。

### 设置面板

右上角设置按钮可配置：

- **插件管理**：启用/禁用第三方搜索插件
- **TG 频道**：配置优先/普通频道列表
- **性能参数**：并发数（1-16）、超时时间（1000-60000ms）

---

## ⚙️ 环境变量

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `LOG_LEVEL` | `info` | 日志级别（debug/info/warn/error），支持白名单校验 |
| `NITRO_PRESET` | auto-detect | 部署预设（vercel/cloudflare/docker） |
| `PORT` | `4000` | 服务端口 |
### 部署差异说明

| 特性 | Docker/Node | CF Workers / Vercel |
|------|-------------|---------------------|
| 进程内缓存 | ✅ 持久 | ❌ 每个 isolate 独立 |
| 热搜数据持久化 | ✅ SQLite | ❌ 仅内存（重启丢失） |
| 插件健康状态 | ✅ 持久 | ❌ 每次冷启动重置 |
| 链接检测助手 | ✅ | ✅（需 Tampermonkey） |

---

## 🏗️ 技术架构

### 前端技术栈

- **框架**：Nuxt 4 + Vue 3
- **样式**：原生 CSS（无框架依赖）
- **状态管理**：Vue Composition API
- **类型安全**：TypeScript

### 后端技术栈

- **运行时**：Nitro（Nuxt 内置）
- **HTML 解析**：Cheerio（TG 频道 + 插件）
- **HTTP 客户端**：ofetch
- **并发控制**：p-limit
- **数据库**：sql.js（SQLite WASM）
- **测试框架**：Vitest

### 核心模块

```
server/core/
├── services/
│   ├── searchService.ts    # 搜索编排器（熔断器 + AbortController + 缓存）
│   ├── tg.ts               # TG 频道抓取
│   ├── doubanHotService.ts # 豆瓣榜单（JSON API + 24h 缓存）
│   ├── hotSearchService.ts # 热搜持久化
│   └── ...
├── cache/
│   └── memoryCache.ts      # LRU 缓存
├── plugins/                # 20+ 搜索插件
│   ├── manager.ts          # 插件注册
│   ├── pluginHealth.ts     # 熔断器
│   └── ...
└── utils/
    ├── fetch.ts            # 网络请求（重试 + 超时）
    ├── errors.ts           # 错误分类
    ├── searchKeyword.ts    # CJK 关键词变体
    └── logger.ts           # 日志

public/
└── panhub-link-checker.user.js  # 链接检测油猴脚本
```

---

## 📦 支持的网盘平台

| 平台 | 图标 | 说明 |
|------|------|------|
| 阿里云盘 | ☁️ | 支持分享链接解析 |
| 夸克网盘 | 🔎 | 支持分享链接解析 |
| 百度网盘 | 🧰 | 支持分享链接解析 |
| 115网盘 | 📦 | 支持分享链接解析 |
| 迅雷云盘 | ⚡ | 支持分享链接解析 |
| UC网盘 | 🧭 | 支持分享链接解析 |
| 天翼云盘 | ☁️ | 支持分享链接解析 |
| 123网盘 | # | 支持分享链接解析 |
| 移动云盘 | 📱 | 支持分享链接解析 |
| 磁力链接 | 🧲 | 支持 magnet 提取 |

---

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

### 开发规范

- 使用 TypeScript 编写
- 核心功能必须包含单元测试（TDD 优先）
- 提交前运行 `npm test`
- 遵循 [Conventional Commits](https://www.conventionalcommits.org/)

### 测试

```bash
# 运行所有测试（125+ 测试用例）
npm test

# 监听模式
npm test:watch

# 生成覆盖率报告
npm test:coverage
```

---

## 🛡️ 免责声明

- 本项目仅用于技术学习与搜索聚合演示
- 不存储、不传播任何受版权保护的内容
- 所有资源链接来自公开网络（Telegram 频道、第三方网站）
- 请遵守当地法律法规与平台使用条款
- 侵权问题请联系源站处理

---

## 📄 许可证

[MIT License](LICENSE)

---

## 🙏 鸣谢

- [Nuxt.js](https://nuxt.com/) - 渐进式 Vue 框架
- [Nitro](https://nitro.unjs.io/) - Web 服务器工具包
- [Cheerio](https://cheerio.js.org/) - HTML 解析器
- [p-limit](https://github.com/sindresorhus/p-limit) - 并发控制
- [sql.js](https://github.com/sql-js/sql.js/) - SQLite WASM
- [Vitest](https://vitest.dev/) - 测试框架

---

**⭐ 如果觉得有用，请给个 Star 支持一下！**

**在线体验**：<https://panhub.shenzjd.com>
