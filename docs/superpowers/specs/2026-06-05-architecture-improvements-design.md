# PanHub 架构改进设计规格

日期：2026-06-05
范围：全项目架构治理，按 P0/P1/P2 分阶段实施

---

## 一、P0 生产安全

### 1.1 API 限流中间件

**目标**：防止接口被滥用，保护上游 TG 站点和插件站的 IP。

**方案**：在 `server/middleware/` 新建 `rateLimiter.ts`，基于内存滑动窗口。

```
限流规则：
- /api/search：10 次/分钟/IP
- /api/hot-searches POST：5 次/分钟/IP
- /api/hot-searches GET：30 次/分钟/IP
- 其他 API：60 次/分钟/IP
```

**实现细节**：
- 使用 `Map<string, { count: number; resetTime: number }>` 存储
- 每次请求检查当前时间窗口内的计数
- 超限返回 `429 Too Many Requests`，响应头带 `Retry-After`
- 每 5 分钟清理过期条目，防止内存泄漏
- Serverless 环境下每个 isolate 独立计数（可接受的降级）

**文件变更**：
- 新建 `server/middleware/rateLimiter.ts`

### 1.2 热搜输入校验

**目标**：防止恶意内容注入热搜数据。

**方案**：在热搜 POST 路由中加输入校验。

```
校验规则：
- term 必填，类型 string
- 去除首尾空格后长度 1-50 字符
- 只允许：中文、英文、数字、空格
- 空字符串返回 400
```

**文件变更**：
- 修改 `server/api/hot-searches.post.ts`

### 1.3 Serverless 缓存行为文档

**目标**：明确告知用户不同部署方式下的缓存行为差异。

**方案**：在 README 和 CLAUDE.md 中补充说明。

```
补充内容：
- Docker/Node：进程内缓存，重启丢失
- CF Workers/Vercel：每个 isolate 独立缓存，跨请求不共享
- 热搜数据：Docker 有 JSON 持久化，Serverless 仅有内存
```

**文件变更**：
- 修改 `README.md`（环境变量表格下方补充部署差异说明）

---

## 二、P1 架构治理

### 2.1 类型目录提取（前后端解耦）

**目标**：消除 client 对 server 目录的直接依赖。

**方案**：在项目根目录 `types/` 下创建共享类型文件。

**新建文件**：`types/search.ts`
```typescript
// Client 和 Server 共享的搜索类型
// Client: composables/useSearch.ts, utils/*.ts
// Server: server/core/services/searchService.ts (引用)
export interface MergedLink { ... }
export interface MergedLinks { ... }
export interface GenericResponse<T> { ... }
export interface SearchResponse { ... }
// ... 从 server/core/types/models.ts 提取 client 需要的类型
```

**文件变更**：
- 新建 `types/search.ts`
- 修改 `composables/useSearch.ts`：import 路径改为 `~/types/search`
- 修改 `utils/extractMergedFromResponse.ts`：同上
- 修改 `utils/mergeMergedByType.ts`：同上
- `server/core/types/models.ts` 保留，server 内部继续引用

### 2.2 useSettings 改用 useState

**目标**：修复 SSR 下设置串用户的风险。

**方案**：使用 Nuxt 的 `useState` 管理状态。

**改动要点**：
- 删除模块级 `settingsSingleton` 变量
- 用 `useState('settings', () => DEFAULT_USER_SETTINGS)` 替代
- `onMounted` 时从 `localStorage` 加载并合并
- `saveSettings` 同时写 `useState` 和 `localStorage`
- 其他 API（`onSelectAll` 等）保持不变

**文件变更**：
- 修改 `composables/useSettings.ts`

### 2.3 app.vue 全局 CSS 拆分

**目标**：减小 app.vue 体积，分离关注点。

**方案**：
1. 将 `<style>` 块中的全局 CSS（`:root` 变量、重置、动画）提取到 `assets/css/global.css`
2. 在 `app.vue` 中用 `@import '~/assets/css/global.css'` 引入
3. Toast 逻辑提取为 `composables/useToast.ts`

**新建文件**：
- `assets/css/global.css`（从 app.vue 提取）
- `composables/useToast.ts`

**文件变更**：
- 修改 `app.vue`：删除全局 CSS 和 toast 逻辑，引入 composable 和 CSS
- 注意：`@layer base` 保留在 app.vue 的 `<style>` 中，因为 dark-mode.css 的优先级依赖它

---

## 三、P1 代码质量

### 3.1 Vue 错误边界组件

**目标**：防止非关键组件崩溃导致全站白屏。

**方案**：创建 `components/ErrorBoundary.vue`。

```
实现：
- 使用 Vue 3 的 onErrorCaptured 生命周期钩子
- 捕获子组件渲染错误
- 显示降级 UI（"内容加载失败"提示 + 重试按钮）
- Props：可自定义 fallback UI
```

**使用位置**：
- `pages/index/index.vue` 中的 `<DoubanHotSection />`
- `pages/index/index.vue` 中的 `<HotSearchSection />`

**文件变更**：
- 新建 `components/ErrorBoundary.vue`
- 修改 `pages/index/index.vue`

### 3.2 插件注册清理

**目标**：消除重复注册，代码更清晰。

**方案**：删除每个插件文件末尾的 `registerGlobalPlugin(new XPlugin())` 调用。

**涉及文件**（每个文件删除最后 1-2 行）：
- `server/core/plugins/pansearch.ts`
- `server/core/plugins/qupansou.ts`
- `server/core/plugins/panta.ts`
- `server/core/plugins/hunhepan.ts`
- `server/core/plugins/jikepan.ts`
- `server/core/plugins/labi.ts`
- `server/core/plugins/thepiratebay.ts`
- `server/core/plugins/duoduo.ts`
- `server/core/plugins/xuexizhinan.ts`
- `server/core/plugins/nyaa.ts`

### 3.3 热搜 API 错误状态码

**目标**：统一 API 错误响应格式。

**方案**：将热搜接口的错误处理改为使用 `sendError`。

**文件变更**：
- 修改 `server/api/hot-searches.get.ts`
- 修改 `server/api/hot-searches.post.ts`

---

## 四、P2 测试补齐

### 4.1 auth 流程单元测试

**目标**：验证密码校验、token 生成/验证、cookie 逻辑。

**新建文件**：`test/unit/auth.test.ts`

```
测试用例：
- createSearchToken 生成有效 token
- verifySearchToken 验证有效 token
- verifySearchToken 拒绝过期 token
- verifySearchToken 拒绝篡改 token
- timingSafeEqual 防止时序攻击
```

### 4.2 vitest 路径修复

**目标**：消除硬编码绝对路径。

**文件变更**：修改 `vitest.config.ts`
```typescript
// 改前
alias: { "#internal": "/Users/mac/github/panhub.shenzjd.com/.nuxt" }
// 改后
alias: { "#internal": path.resolve(__dirname, ".nuxt") }
```

### 4.3 搜索 API 集成测试扩展

**目标**：覆盖核心搜索路径。

**文件变更**：扩展 `test/api.test.mjs`
```
新增用例：
- 缺少 kw 参数返回 400
- 无效 ext JSON 返回 400
- 锁定状态下返回 401
- 正常搜索返回结果
```

---

## 实施顺序

建议按以下顺序执行，每个阶段完成后可独立测试和提交：

1. **P0 安全**：输入校验 → 限流中间件 → 文档补充
2. **P1 质量**：插件注册清理 → 错误状态码修复 → ErrorBoundary
3. **P1 架构**：类型提取 → useSettings 改造 → app.vue 拆分
4. **P2 测试**：vitest 路径 → auth 测试 → 搜索 API 测试

每个阶段完成后运行 `pnpm test` 确保无回归。
