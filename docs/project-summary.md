# PanHub - 项目介绍（面试用）

## 一句话介绍

PanHub 是一个**网盘资源聚合搜索引擎**，从 Telegram 频道和 23 个第三方搜索插件并发检索，覆盖阿里云盘、夸克、百度网盘、115、迅雷等主流网盘平台，支持优先级批量调度、LRU 缓存、插件健康检查，可一键部署到 Cloudflare Workers / Vercel / Docker。

---

## 项目背景

网盘分享资源散落在各种渠道（Telegram 频道、第三方搜索站），用户需要在多个平台分别搜索、人工对比。PanHub 将这些分散的数据源统一聚合，用户搜索一次即可获得全网结果，按网盘类型自动分组展示。

---

## 技术栈

| 层面 | 技术 |
|------|------|
| 前端框架 | **Nuxt 4** (Vue 3) SSR/SPA |
| 服务端 | **Nitro** (Nuxt Server Engine) |
| 并发控制 | **p-limit** (Promise 并发池) |
| HTML 解析 | **Cheerio** (Telegram 频道页面爬取) |
| HTTP 请求 | **ofetch** (带重试和超时) |
| 缓存 | 自研 **LRU MemoryCache** + 命名空间封装 |
| 单元测试 | **Vitest** + V8 Coverage (13 个测试文件) |
| 部署 | Cloudflare Workers (默认) / Vercel / Docker |
| CI/CD | GitHub Actions (Docker 多架构构建 + 上游同步) |

---

## 核心架构

### 搜索流程（两层设计）

```
用户输入关键词
    │
    ├── 快速搜索（Fast Search）
    │   优先级 TG 频道 + 全部健康插件并发请求
    │   结果立即返回
    │
    └── 深度搜索（Deep Search）
        剩余频道继续加载，分批执行
        关键词自动变体扩展（模糊匹配）
```

### 服务端核心（server/core/）

```
server/core/
├── services/
│   ├── searchService.ts      # 搜索编排器（核心入口）
│   ├── tg.ts                 # Telegram 频道爬取 + Cheerio 解析
│   ├── hotSearchService.ts   # 热搜服务
│   └── doubanHotService.ts   # 豆瓣热门推荐
├── cache/
│   ├── unifiedCache.ts       # 命名空间缓存（TG / Plugin / HotSearch）
│   └── memoryCache.ts        # LRU 缓存，TTL 过期 + 内存监控
├── plugins/                  # 23 个搜索插件（插件化架构）
│   ├── manager.ts            # 插件注册表 + 生命周期管理
│   ├── pluginHealth.ts       # 插件健康检查（失败率追踪）
│   ├── pansearch.ts          # 具体插件实现...
│   └── ...                   # 共 23 个插件
├── utils/
│   ├── fetch.ts              # 网络请求（重试/超时）
│   ├── searchKeyword.ts      # 关键词变体构建
│   └── errors.ts             # 错误分类 + ErrorCollector
└── types/
    └── models.ts             # 核心接口定义
```

### 客户端（Vue 3 Composition API）

```
composables/
├── useSearch.ts     # 搜索状态机（loading → deepLoading → done），支持暂停/恢复
├── useSettings.ts   # 用户设置（插件开关、并发数、超时）
└── useDarkMode.ts   # 深色模式状态

components/
├── SearchBox.vue          # 搜索输入框
├── ResultGroup.vue        # 搜索结果分组展示
├── HotSearchSection.vue   # 热搜排行榜
├── DoubanHotSection.vue   # 豆瓣热门推荐
└── SettingsDrawer.vue     # 设置面板（插件/频道/参数）
```

---

## 项目亮点（面试重点讲）

### 1. 插件化架构
- 23 个搜索插件统一实现 `AsyncSearchPlugin` 接口，基于 `BaseAsyncPlugin` 基类
- 插件运行时注册到全局 PluginManager，支持动态启停
- **插件健康检查器**：追踪每个插件的失败率和响应时间，自动跳过不健康的插件，避免拖慢整体搜索

### 2. 并发调度与性能优化
- 使用 `p-limit` 实现可配置的并发池，避免同时发出过多请求
- TG 频道和插件搜索并行执行（`Promise.all`）
- 快速搜索返回首批结果后，深度搜索在后台继续加载
- 关键词自动变体扩展（模糊匹配），提高召回率

### 3. 多级缓存策略
- **LRU 缓存**：自研实现，支持 TTL 过期和内存监控
- **命名空间隔离**：TG 搜索、插件搜索、热搜各自独立缓存空间
- 缓存命中时跳过网络请求，直接返回结果
- 支持 `forceRefresh` 强制刷新

### 4. 多平台一键部署
- 同一套代码通过 Nitro preset 适配三种部署环境：
  - **Cloudflare Workers**（边缘计算，全球 CDN）
  - **Vercel**（Serverless Functions）
  - **Docker**（Node.js 服务器，支持 JSON 文件持久化）
- CI 自动构建多架构 Docker 镜像（amd64 + arm64），推送 GHCR 和 Docker Hub

### 5. 容错与错误处理
- 网络请求自带超时和重试机制
- `ErrorCollector` 统一收集和分类错误
- 单个插件/TG 频道失败不影响整体结果
- 结果去重（基于 unique_id / message_id / URL）

---

## 数据规模

| 指标 | 数据 |
|------|------|
| 搜索插件数量 | 23 个 |
| 支持网盘平台 | 10+（阿里、夸克、百度、115、迅雷、UC、天翼、123、移动等） |
| 服务端代码 | ~6,800 行 TypeScript |
| 客户端代码 | ~4,300 行 Vue/TS |
| Git 提交数 | 298 |
| 单元测试 | 13 个测试文件 |

---

## 项目流程（面试口述参考）

> 这个项目是一个网盘资源聚合搜索引擎。用户输入关键词后，服务端会同时去 Telegram 频道和 23 个第三方搜索站点并发检索，把结果聚合后按网盘类型分组返回。为了提升性能，我设计了多级缓存——自研了 LRU 缓存带命名空间隔离，命中缓存时直接返回不走网络。并发控制用了 p-limit 做请求池，TG 频道和插件搜索是并行的。另外我还做了插件健康检查，追踪每个插件的失败率，自动跳过挂掉的插件。部署方面一套代码支持 Cloudflare Workers、Vercel 和 Docker 三种方式，CI 自动构建多架构镜像。整个服务端大概 6800 行 TypeScript，测试覆盖了核心模块。

---

## 可能的面试追问

**Q: 为什么用 LRU 而不是 Redis？**
A: 项目部署在 Cloudflare Workers 等 Serverless 环境，没有持久化存储。自研内存 LRU 缓存足够满足需求，避免了外部依赖。

**Q: 插件健康检查怎么实现的？**
A: 每次插件请求结束后记录成功/失败次数和响应时间，计算失败率。超过阈值自动标记为不健康，后续搜索跳过该插件。提供 reset 接口手动恢复。

**Q: 如何保证搜索速度？**
A: 三层策略——缓存命中直接返回；未命中时快速搜索（优先级频道+健康插件）立即返回首批结果；深度搜索后台继续。并发池控制同时请求数避免阻塞。

**Q: 多平台部署怎么做适配？**
A: Nuxt 的 Nitro 引擎支持 preset 机制，一套代码编译到不同目标。热搜持久化用适配器模式——Docker 环境用 JSON 文件，Serverless 环境用内存存储。
