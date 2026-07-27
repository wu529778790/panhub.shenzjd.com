# PanHub Mini Program Research

> 本文档记录将 PanHub 的 Web 前端重写为微信小程序的所有前端决策、框架选型结论和后续步骤。

---

## 1. 项目现状

| 项 | 值 |
|----|-----|
| 后端入口 | `panhub.shenzjd.com` |
| 后端框架 | Nuxt 4 + Nitro |
| 后端部署 | Cloudflare Workers / Vercel / Docker |
| Web 前端技术栈 | Vue 3 (Nuxt 4) + Vite |
| 小程序目标端 | **原生微信小程序**（不含 uni-app、Taro） |
| 小程序目录 | `./miniprogram/` |

---

## 2. 后端兼容（不需要改造）

| 条件 | 状态 |
|------|------|
| 域名备案 + HTTPS | ✅ 现有部署已满足 |
| HTTPS 证书链 | ✅ Cloudflare 自动 |
| Web 和小程序共用同一组 `/api` 路由 | ✅ 路径不变 |

**结论**：后端接口零改动即可给小程序调用。

---

## 3. 后端接口访问

搜索 API 为公开接口，Web 与小程序直接复用 `/api/search`，无需 Cookie、登录或访问令牌。
服务端保留常规请求限流和输入校验，客户端只需处理正常结果与 429 重试提示。

---

## 4. UI 框架选型

### 候选对比

| 项 | Vant Weapp (有赞) | TDesign MP (腾讯) | WeUI (腾讯) |
|----|-------------------|-------------------|-------------|
| 适用端 | 移动端 H5 + MP | Web (Vue/React/Angular) + MP | 仅样式规范，无组件 |
| 桌面 Web 可用性 | ❌ 不适用 | ✅ 适用 | ❌ |
| 跨端统一路径 | 无 | 有 | 无 |
| 组件数 | 60+ | ~65 | 0（仅样式） |
| 中文文档 | 非常全 | 齐全 | 一般 |
| 社区坑资源 | 最多 | 次多 | 少 |
| 包体积（按需引入） | ~100kb | ~90kb | 极小 |
| 视觉范式 | 电商风（偏重） | 工具风（简洁克制） | 微信原生风格 |

### 为什么没选别的

| 没选 | 理由 |
|------|------|
| uni-app / Taro | 用户明确拒绝，uni-app 坑多、构建产物偶尔不稳定；原生稳 |
| Vant | 全家族偏移动端桌面不可用，未来 Web 重构（可能 React）无法和 MP 统一 |
| Ant Design MP | 2021 停更 |
| Semi / NutUI / Naive UI | 要么仅 React 要么仅 Vue，缺 MP 端 |
| WeUI | 只是规范不是组件库，实际工作量大 |

### 最终选：`TDesign MP`

官方文档：https://tdesign.tencent.com/miniprogram/overview

决策理由：
1. **一整套**：`tdesign-vue-next` (Web Vue) / `tdesign-react` (Web React) / `tdesign-miniprogram` (MP) 同 Design Token
2. 未来 Web 端若想从 Vue 切 React，UI 设计系统不需要重做
3. 视觉风格默认更贴近 PanHub 现有"极简克制"观感
4. 腾讯自家，MP 兼容性/修复优先级最高
5. 支持 TypeScript 定义

---

## 5. TDesign 全端矩阵（供未来 Web 重构参考）

| 端 | 包名 | 状态 |
|----|------|------|
| React Web | `tdesign-react` | ✅ GA |
| Vue 3 Web | `tdesign-vue-next` | ✅ GA |
| Vue 2 Web | `tdesign-vue` | ✅ GA |
| 微信小程序 | `tdesign-miniprogram` | ✅ GA |
| Angular Web | `tdesign-angular` | ✅ GA |

**跨端统一路径**：

```
现在
├── Web 端：Nuxt + Vue（现成）
└── 小程序：原生微信小程序 + tdesign-miniprogram

未来重构 Web
├── Web 端：React + tdesign-react
└── 小程序：相同 Design Token，tdesign-miniprogram
```

---

## 6. 组件需求清单（PanHub 所需）

| 功能点 | TDesign 组件 | Vant 对照 | 备注 |
|--------|-------------|-----------|------|
| 搜索框 | `Search` | `Search` | 带历史记录交互 |
| 结果列表 | `Cell`、`CellGroup` | `Card`、`Cell` | MP 端 Cell 更符合"列表感" |
| 频道筛选 | `Tab`、`Sidebar` | `Tab`、`Sidebar` | 同上 |
| 平台色标 | `Tag` | `Tag` | 都够 |
| 设置列表 | `CellGroup`、`Switch`、`Slider` | 同上 | 都够 |
| 抽屉设置 | `Popup`、`Picker` | 同上 | 都够 |
| 密码输入 | 无（原生 `input password`） | 无 | 不需要 |
| 弹窗对话框 | `Dialog` | `Dialog` | 都够 |
| 轻提示 | `Message` | `Toast` | TDesign 的 Message 更轻便 |
| 加载态 | `Loading` | `Loading` | 都够 |
| 空态 | `Empty` | `Empty` | 都够 |
| 头像/icon | 自己画 | 同上 | platform-icon 是字体/文字 |

**结论**：MP 端组件 100% 够用，无需自己造轮子。

---

## 7. 共享代码策略

### 原则

>
> 抽出来的必须是"纯函数 / 无框架绑定 / 无 TS 语法 / 无外部依赖"。
> 形态：plain JS with JSDoc。

### 共享项

| 迁移源 | 共享形式 | 说明 |
|--------|---------|------|
| `app/utils/mergeMergedByType.ts` | `shared/merge.js` | 结果分组去重 |
| `app/utils/extractMergedFromResponse.ts` | `shared/extract.js` | 从后端响应提取链接 |
| `server/core/types/models.ts` | `shared/types.d.ts` | 类型契约（MP 端可忽略 .d.ts） |

### 不迁移源

| 目录 | 原因 |
|------|------|
| `app/composables/useSearch.ts` | Vue 响应式（ref/reactive）绑定，MP 无法复用 |
| `app/composables/useSettings.ts` | 同上 |
| `config/channels.json` | 后端权威配置，MP 端 config 是"展示视图"不同物 |

### 目录结构（含 shared）

```
project/
├── shared/                       ← 前后端共用的纯函数
│   ├── merge.js                  ← 与 mergeMergedByType.ts 同语义
│   ├── extract.js                ← 与 extractMergedFromResponse.ts 同语义
│   └── types.d.ts                ← 类型注解（仅 Web 端用）
├── app/                          ← Web 前端（Nuxt）
│   └── utils/
│       ├── mergeMergedByType.ts  ← 可 wrap shared/merge.js
│       └── extractMergedFromResponse.ts
├── server/                       ← 后端 Nitro + API 路由
│   └── api/、core/
└── miniprogram/                  ← 原生微信小程序
    └── utils/
        ├── api.js                ← 封装 wx.request
        ├── auth.js               ← wx.setStorageSync + Authorization header
        ├── merge.js              ← require ../../../shared/merge.js
        └── extract.js            ← require ../../../shared/extract.js
```

### 共享代码的风格公约

- 用 `module.exports = {...}`（CommonJS）
- 不用 `import / export`（MP 原生不支持 ESM）
- 不用 TS 语法（MP 内无 TS 编译）
- 用 JSDoc 注解替代 TS 类型（MP 开发时也能看注释提示）

---

## 8. 下一步要做的事

| # | 事项 | 状态 |
|---|------|------|
| 1 | 把插件使用日志下载回来，分析空响应率 / 失败率 | ⏳ 待用户提供 |
| 2 | 确定"建议丢弃 / 建议保活 / 待观察"插件清单 | ⏳ 依赖 #1 |
| 3 | 初始化 miniprogram 骨架（app.json、tabBar、pages 结构） | ⏳ |
| 4 | 引入 TDesign MP（npm + 构建 npm + 主题覆盖） | ⏳ |
| 5 | 搭建 `shared/merge.js` 和 `shared/extract.js`，对齐现有语义 | ⏳ |
| 6 | 实现 mp `utils/api.js`（wx.request 封装） | ⏳ |
| 7 | 落地 auth 改造：unlock 接口返回 token + 校验中间件兼容 header | ⏳ |
| 8 | 实现搜索首页（index）页 | ⏳ |
| 9 | 实现结果列表（result）页 | ⏳ |

---

## 9. 待决策项

| 问题 | 选项 | 倾向 |
|------|------|------|
| 公共代码抽离时机 | 现在 vs 做到再抽 | **现在**抽 merge + extract，其余按需 |
| UI 主题色 | 保留 PanHub 蓝 vs 用 TDesign 默认 | 保留 PanHub 蓝，override CSS 变量 |
| 搜索历史存储位置 | 后端 vs `wx.setStorageSync` | 两者都保留（后端持久 + 本地极速） |
| 设置是否同步后端 | 是 vs 否 | **否**，MP 端仅本地存储 |

---

## 10. 关键链接

| 资源 | URL |
|------|-----|
| TDesign MP 文档 | https://tdesign.tencent.com/miniprogram/overview |
| TDesign MP GitHub | https://github.com/Tdesign-VueNext/tdesign-miniprogram |
| tdesign-react 文档 | https://tdesign.tencent.com/react/overview |
| tdesign-vue-next 文档 | https://tdesign.tencent.com/vue-next/overview |
| 小程序开发文档 | https://developers.weixin.qq.com/miniprogram/dev/framework/ |
| 小程序后台（域名白名单） | https://mp.weixin.qq.com/ |
