# 集成测试文档

这个目录包含了 PanHub 项目的集成测试套件，用于验证各个组件之间的协作和完整的业务流程。

## 测试文件说明

### 1. `api.test.ts` - API 端点集成测试
测试完整的 API 端点流程，包括：
- 输入验证（Zod Schema）
- 错误处理和响应格式
- 搜索 API（GET/POST）
- 热搜 API
- 健康检查端点

**测试场景：**
- 缺少关键词的请求
- 空关键词
- 过长的关键词
- 无效的并发数
- 无效的 src 参数
- 有效的搜索请求
- POST 请求处理
- 热搜列表获取
- 错误响应格式验证

### 2. `service.test.ts` - 服务层集成测试
测试 SearchService、PluginManager 和 MemoryCache 的集成：
- 插件注册和执行
- 插件优先级排序
- 缓存机制（LRU）
- 超时处理
- 并发控制
- 错误恢复

**测试场景：**
- SearchService 与 PluginManager 集成
- MemoryCache 缓存和淘汰
- 完整搜索流程
- 不同结果类型（results/merged_by_type）
- 云盘类型过滤
- 插件异常处理

### 3. `e2e.test.ts` - 端到端集成测试
模拟真实用户场景的完整流程：
- 用户搜索流程（验证 → 搜索 → 结果合并）
- 缓存命中和刷新
- 错误恢复
- 并发控制
- AppError 集成

**测试场景：**
- 完整用户搜索流程
- 云盘类型过滤
- 缓存机制
- 强制刷新
- 插件异常处理
- 超时处理
- 并发限制

## 运行测试

### 前提条件
确保项目依赖已安装：
```bash
npm install
```

### 运行所有集成测试
```bash
npm run test:integration
```

### 运行特定测试文件
```bash
# 只运行 API 测试
npm run test:integration -- api.test.ts

# 只运行服务层测试
npm run test:integration -- service.test.ts

# 只运行 E2E 测试
npm run test:integration -- e2e.test.ts
```

### 运行并显示详细输出
```bash
npm run test:integration -- --reporter=verbose
```

### 运行特定测试用例
```bash
npm run test:integration -- -t "应该正确注入并使用插件"
```

## 测试覆盖范围

### 已覆盖的组件
- ✅ API 端点（search.get, hot-searches.get）
- ✅ SearchService
- ✅ PluginManager
- ✅ MemoryCache
- ✅ AppError 和错误处理器
- ✅ Zod 输入验证
- ✅ 并发控制（p-limit）
- ✅ 缓存机制

### 测试策略

#### 1. 隔离性
每个测试用例都是独立的，使用 `beforeEach` 重置状态。

#### 2. 模拟依赖
- 使用 Mock 插件避免真实网络请求
- 使用内存缓存避免文件系统依赖
- 使用测试服务器避免外部服务依赖

#### 3. 边界条件
- 空输入
- 超长输入
- 无效参数
- 超时场景
- 并发限制

#### 4. 集成点验证
- API → Service → PluginManager → Plugin
- Service → Cache → 结果合并
- 错误处理链路

## 持续集成

在 CI/CD 流程中，集成测试应该在单元测试之后运行：

```yaml
# .github/workflows/test.yml
- name: Run Unit Tests
  run: npm run test:unit

- name: Run Integration Tests
  run: npm run test:integration
```

## 调试技巧

### 1. 查看详细日志
在测试中添加 `console.log` 或使用 `--reporter=verbose`。

### 2. 单步执行
使用 `it.only` 或 `describe.only` 聚焦特定测试。

### 3. 检查覆盖率
```bash
npm run test:coverage
```

### 4. 性能分析
如果测试慢，检查：
- 插件超时设置
- 并发配置
- 缓存命中率

## 常见问题

### Q: 测试超时
A: 增加 `testTimeout` 在 vitest.config.ts 中，或检查插件超时设置。

### Q: 端口冲突
A: 测试使用随机端口，如果冲突检查是否有其他服务占用。

### Q: 缓存导致测试不稳定
A: 确保每个测试使用独立的缓存实例，或在 `beforeEach` 中清空缓存。

## 维护指南

### 添加新测试
1. 确定测试类型（API/Service/E2E）
2. 创建 Mock 数据或插件
3. 编写测试用例
4. 验证隔离性
5. 更新 README

### 更新现有测试
1. 检查是否影响其他测试
2. 更新 Mock 数据
3. 验证向后兼容
4. 更新文档

### 删除过时测试
1. 确认功能已移除
2. 检查是否有替代测试
3. 更新测试覆盖率报告
