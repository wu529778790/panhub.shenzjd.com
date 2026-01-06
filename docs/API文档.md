# API 文档

本文档描述 PanHub 的所有 API 端点，包括请求格式、参数验证和响应结构。

## 基础信息

- **Base URL**: `http://localhost:3000` (开发环境) 或 `https://panhub.shenzjd.com` (生产环境)
- **所有响应**均采用统一的 JSON 格式
- **错误处理**：使用标准 HTTP 状态码 + 统一错误响应格式

---

## 搜索 API

### `GET /api/search` / `POST /api/search`

搜索网盘资源，支持 GET 查询参数和 POST JSON 请求体。

#### 请求参数

| 参数名 | 类型 | 必填 | 默认值 | 说明 | 验证规则 |
|--------|------|------|--------|------|----------|
| `kw` | string | ✅ | - | 搜索关键词 | 1-100字符，仅支持中文、英文、数字、空格 |
| `src` | enum | ❌ | `all` | 数据来源 | `all` / `plugin` / `tg` |
| `conc` | number | ❌ | 10 | 并发数 | 1-20 |
| `refresh` | boolean/string | ❌ | `false` | 强制刷新 | `true` / `false` (字符串或布尔值) |
| `res` | enum | ❌ | `merged_by_type` | 返回结果类型 | `merged_by_type` / `results` / `all` |
| `channels` | string | ❌ | - | TG 频道列表 (逗号分隔) | 最多50个频道 |
| `plugins` | string | ❌ | - | 指定插件 (逗号分隔) | 最多20个插件 |
| `cloud_types` | string | ❌ | - | 云盘类型过滤 (逗号分隔) | 最多10种类型 |
| `ext` | string | ❌ | - | 扩展参数 (JSON字符串) | 必须是有效 JSON |

#### 使用示例

**GET 请求**
```bash
curl "https://panhub.shenzjd.com/api/search?kw=测试&src=plugin&conc=5&refresh=true"
```

**POST 请求**
```bash
curl -X POST https://panhub.shenzjd.com/api/search \
  -H "Content-Type: application/json" \
  -d '{
    "kw": "测试",
    "src": "plugin",
    "conc": 5,
    "refresh": true
  }'
```

#### 响应格式

**成功响应 (200)**
```json
{
  "code": 0,
  "message": "成功",
  "data": {
    "total": 15,
    "merged_by_type": {
      "baidu": [
        {
          "url": "https://pan.baidu.com/xxx",
          "password": "abcd",
          "title": "测试资源 1080p"
        }
      ],
      "aliyun": [...]
    }
  }
}
```

**错误响应 (400)**
```json
{
  "code": "VALIDATION_ERROR",
  "message": "参数验证失败",
  "data": null,
  "error": {
    "statusCode": 400,
    "details": [
      {
        "field": "kw",
        "message": "搜索词不能为空"
      }
    ]
  }
}
```

#### 返回结果类型说明

1. **`merged_by_type`** (默认)
   - 按云盘类型合并结果
   - 适合前端展示分类列表
   - 结构：`{ baidu: [...], aliyun: [...] }`

2. **`results`**
   - 原始结果数组
   - 包含完整元数据
   - 结构：`[ { message_id, title, content, links, ... } ]`

3. **`all`**
   - 同时返回 `results` 和 `merged_by_type`

#### 互斥逻辑

- `src = "tg"` 时，自动忽略 `plugins` 参数
- `src = "plugin"` 时，自动忽略 `channels` 参数

---

## 热搜 API

### `GET /api/hot-searches`

获取热门搜索词列表，用于首页标签云展示。

#### 请求参数

| 参数名 | 类型 | 必填 | 默认值 | 说明 | 验证规则 |
|--------|------|------|--------|------|----------|
| `limit` | number | ❌ | 30 | 返回数量 | 1-100 |

#### 使用示例

```bash
# 获取前 10 个热搜词
curl "https://panhub.shenzjd.com/api/hot-searches?limit=10"

# 获取默认 30 个
curl "https://panhub.shenzjd.com/api/hot-searches"
```

#### 响应格式

**成功响应 (200)**
```json
{
  "code": 0,
  "message": "成功",
  "data": {
    "hotSearches": [
      {
        "term": "测试电影",
        "score": 15,
        "last_searched": "2026-01-06T18:00:00.000Z",
        "created_at": "2026-01-01T10:00:00.000Z"
      },
      {
        "term": "学习资料",
        "score": 8,
        "last_searched": "2026-01-06T17:30:00.000Z",
        "created_at": "2026-01-02T14:20:00.000Z"
      }
    ]
  }
}
```

**错误响应 (400)**
```json
{
  "code": "VALIDATION_ERROR",
  "message": "参数验证失败",
  "data": null,
  "error": {
    "statusCode": 400,
    "details": [
      {
        "field": "limit",
        "message": "必须小于等于 100"
      }
    ]
  }
}
```

#### 热搜记录规则

1. **记录时机**：搜索请求**开始时**立即记录（不管是否有结果）
2. **计分规则**：每次搜索 +1 分
3. **保留策略**：保留最近 30 天的记录，按分数排序
4. **自动清理**：超过 30 天未搜索的词自动删除

---

## 热搜统计 API

### `GET /api/hot-search-stats`

获取热搜系统的统计信息（用于调试和监控）。

#### 使用示例

```bash
curl "https://panhub.shenzjd.com/api/hot-search-stats"
```

#### 响应格式

**成功响应 (200)**
```json
{
  "code": 0,
  "message": "成功",
  "data": {
    "mode": "sqlite",
    "total_terms": 42,
    "total_searches": 156,
    "top_terms": [
      { "term": "测试", "score": 15 },
      { "term": "电影", "score": 12 }
    ]
  }
}
```

**模式说明**
- `sqlite`: SQLite 数据库模式，数据持久化
- `memory`: 内存模式，重启丢失数据

---

## 健康检查 API

### `GET /api/health`

服务健康状态检查，用于监控和部署验证。

#### 使用示例

```bash
curl "https://panhub.shenzjd.com/api/health"
```

#### 响应格式

**健康状态 (200)**
```json
{
  "status": "ok",
  "plugin_count": 10,
  "plugins": [
    "hunhepan",
    "labi",
    "panta",
    "jikepan",
    "qupansou",
    "thepiratebay",
    "duoduo",
    "xuexizhinan",
    "pansearch",
    "nyaa"
  ]
}
```

---

## 统一响应格式

### 成功响应

```json
{
  "code": 0,
  "message": "成功",
  "data": { ... }  // 具体数据
}
```

### 错误响应

```json
{
  "code": "ERROR_CODE",
  "message": "错误描述",
  "data": null,
  "error": {
    "statusCode": 400,
    "details": { ... }  // 可选的详细信息
  }
}
```

### 错误代码列表

| 错误码 | HTTP 状态码 | 说明 |
|--------|-------------|------|
| `VALIDATION_ERROR` | 400 | 参数验证失败 |
| `BAD_REQUEST` | 400 | 请求格式错误 |
| `NOT_FOUND` | 404 | 资源不存在 |
| `INTERNAL_ERROR` | 500 | 服务器内部错误 |
| `SERVICE_UNAVAILABLE` | 503 | 服务不可用 |

---

## 请求限制

### 速率限制

- **限制**：每 IP 每分钟最多 60 次请求
- **响应头**：
  - `X-RateLimit-Limit`: 总限额
  - `X-RateLimit-Remaining`: 剩余可用
  - `X-RateLimit-Reset`: 重置时间戳（秒）

**超限响应 (429)**
```json
{
  "code": "RATE_LIMIT_EXCEEDED",
  "message": "请求过于频繁，请稍后再试",
  "data": null,
  "error": {
    "statusCode": 429,
    "retryAfter": 60
  }
}
```

---

## 错误处理示例

### 1. 缺少必填参数

**请求**
```bash
curl "https://panhub.shenzjd.com/api/search"
```

**响应 (400)**
```json
{
  "code": "VALIDATION_ERROR",
  "message": "参数验证失败",
  "data": null,
  "error": {
    "statusCode": 400,
    "details": [
      {
        "field": "kw",
        "message": "搜索词不能为空"
      }
    ]
  }
}
```

### 2. 参数格式错误

**请求**
```bash
curl "https://panhub.shenzjd.com/api/search?kw=测试&conc=abc"
```

**响应 (400)**
```json
{
  "code": "VALIDATION_ERROR",
  "message": "参数验证失败",
  "data": null,
  "error": {
    "statusCode": 400,
    "details": [
      {
        "field": "conc",
        "message": "Expected number, received string"
      }
    ]
  }
}
```

### 3. 搜索服务错误

**请求**
```bash
curl "https://panhub.shenzjd.com/api/search?kw=测试&src=plugin"
```

**响应 (500)**
```json
{
  "code": "INTERNAL_ERROR",
  "message": "搜索服务内部错误",
  "data": null,
  "error": {
    "statusCode": 500,
    "details": null
  }
}
```

---

## 测试工具

### 使用 curl 测试

```bash
# 基本搜索
curl "http://localhost:3000/api/search?kw=测试&src=plugin&conc=1"

# POST 请求
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{"kw":"测试","src":"plugin","conc":1,"refresh":true}'

# 热搜列表
curl "http://localhost:3000/api/hot-searches?limit=10"

# 健康检查
curl "http://localhost:3000/api/health"
```

### 使用 Postman

1. 导入集合：创建新请求
2. 设置 URL：`http://localhost:3000/api/search`
3. 方法：GET 或 POST
4. 参数/Body：按上文格式填写
5. 发送并查看响应

---

## 开发注意事项

### 1. CORS 配置

生产环境可能需要配置 CORS，允许前端域名访问：
```typescript
// server/api/search.get.ts
export default defineEventHandler(async (event) => {
  // 设置 CORS 头
  setResponseHeader(event, 'Access-Control-Allow-Origin', '*')
  setResponseHeader(event, 'Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  // ...
})
```

### 2. 测试环境

测试环境使用 mock 配置，无需真实 Nuxt 上下文：
```typescript
// server/api/search.get.ts
try {
  config = useRuntimeConfig();
} catch {
  // 测试环境使用默认配置
  config = {
    priorityChannels: [],
    defaultChannels: [],
    defaultConcurrency: 10,
    pluginTimeoutMs: 15000,
    cacheEnabled: true,
    cacheTtlMinutes: 30,
  };
}
```

### 3. 错误日志

所有错误都会自动记录到日志系统，格式为：
```
[ERROR] [error-handler] 错误描述
{ 详细错误信息 }
```

---

## 性能建议

### 1. 并发控制

- 默认并发：10
- 建议范围：5-15
- 过高会导致 IP 被封禁

### 2. 缓存策略

- 默认 TTL：30 分钟
- 强制刷新：`refresh=true`
- 缓存键：`search:{kw}:{src}:{channels}:{plugins}`

### 3. 超时设置

- 默认超时：15 秒
- 建议范围：10-30 秒
- 通过 `ext` 参数可自定义单个插件超时

---

## 附录

### 数据类型定义

**SearchResult**
```typescript
interface SearchResult {
  message_id: string;      // 消息 ID
  unique_id: string;       // 唯一 ID
  channel: string;         // 频道/插件名
  datetime: string;        // ISO 时间戳
  title: string;           // 标题
  content: string;         // 内容摘要
  links: Array<{           // 链接列表
    type: string;          // 云盘类型
    url: string;           // 链接地址
    password: string;      // 提取码
  }>;
}
```

**MergedLinks**
```typescript
interface MergedLinks {
  baidu: Array<{ url: string; password: string; title: string }>;
  aliyun: Array<{ url: string; password: string; title: string }>;
  quark: Array<{ url: string; password: string; title: string }>;
  tianyi: Array<{ url: string; password: string; title: string }>;
  xunlei: Array<{ url: string; password: string; title: string }>;
  mobile: Array<{ url: string; password: string; title: string }>;
  '115': Array<{ url: string; password: string; title: string }>;
  '123': Array<{ url: string; password: string; title: string }>;
  uc: Array<{ url: string; password: string; title: string }>;
  pikpak: Array<{ url: string; password: string; title: string }>;
  lanzou: Array<{ url: string; password: string; title: string }>;
  magnet: Array<{ url: string; password: string; title: string }>;
  ed2k: Array<{ url: string; password: string; title: string }>;
  others: Array<{ url: string; password: string; title: string }>;
}
```

---

**文档版本**: v1.0
**最后更新**: 2026-01-07
**维护者**: PanHub Team
