# @dreamer/render 测试报告

## 测试概览

| 项目         | 说明                            |
| ------------ | ------------------------------- |
| 被测库版本   | @dreamer/render@1.0.26          |
| 运行时适配器 | @dreamer/runtime-adapter@^1.0.5 |
| 测试框架     | @dreamer/test@^1.0.6            |
| 测试日期     | 2026-02-17                      |
| 测试环境     | Deno 2.x+ / Bun 1.x+            |

## 测试结果

### 总体统计

| 指标     | 数值                   |
| -------- | ---------------------- |
| 总测试数 | 252                    |
| 通过     | 252 ✅                 |
| 失败     | 0                      |
| 通过率   | 100%                   |
| 执行时间 | ~46s（`deno test -A`） |

### 运行兼容性

| 运行时 | 版本 | 结果        |
| ------ | ---- | ----------- |
| Deno   | 2.x+ | ✅ 252 通过 |
| Bun    | 1.x+ | ✅ 252 通过 |

### 测试文件统计

| 测试文件                    | 数量 | 状态        |
| --------------------------- | ---- | ----------- |
| `adapters-preact.test.ts`   | 12   | ✅ 全部通过 |
| `adapters-react.test.ts`    | 11   | ✅ 全部通过 |
| `adapters-view.test.ts`     | 12   | ✅ 全部通过 |
| `client-browser.test.ts`    | 31   | ✅ 全部通过 |
| `client-utils.test.ts`      | 28   | ✅ 全部通过 |
| `edge-cases.test.ts`        | 14   | ✅ 全部通过 |
| `layout.test.ts`            | 33   | ✅ 全部通过 |
| `mod.test.ts`               | 7    | ✅ 全部通过 |
| `ssg-advanced.test.ts`      | 13   | ✅ 全部通过 |
| `ssg.test.ts`               | 25   | ✅ 全部通过 |
| `ssr-comprehensive.test.ts` | 32   | ✅ 全部通过 |
| `ssr.test.ts`               | 11   | ✅ 全部通过 |
| `utils.test.ts`             | 23   | ✅ 全部通过 |

## 功能测试详情

### 1. 服务端适配器 - Preact（adapters-preact.test.ts）- 12 项

- ✅ SSR 基础渲染
- ✅ 带 props 的组件渲染
- ✅ 模板渲染
- ✅ 布局系统支持
- ✅ 嵌套布局支持
- ✅ `inheritLayout = false` 时跳过布局
- ✅ 流式渲染
- ✅ 错误处理
- ✅ 性能监控

### 2. 服务端适配器 - React（adapters-react.test.ts）- 11 项

- ✅ SSR 基础渲染
- ✅ 带 props 的组件渲染
- ✅ 模板渲染
- ✅ 布局系统支持
- ✅ 嵌套布局支持
- ✅ `inheritLayout = false` 时跳过布局
- ✅ 流式渲染
- ✅ 错误处理
- ✅ 性能监控

### 3. 服务端适配器 - View（adapters-view.test.ts）- 12 项

- ✅ SSR 基础渲染（jsx 来自 @dreamer/view/jsx-runtime）
- ✅ 带 props 的组件渲染
- ✅ 模板渲染
- ✅ 流式渲染（renderToStream）
- ✅ 布局系统支持
- ✅ 嵌套布局支持
- ✅ `inheritLayout = false` 时跳过布局
- ✅ 复杂组件树
- ✅ 空组件处理
- ✅ 错误处理
- ✅ 性能监控

### 4. 客户端浏览器测试（client-browser.test.ts）- 31 项

三个入口 fixture（View / Preact / React），`browserMode: true`；各自覆盖通用 API
与对应引擎的实际 CSR/Hydration。

#### View 入口（通用 + View 引擎）

- ✅ 导出所有必要函数
- ✅ 创建性能监控实例
- ✅ 未启用时返回 null
- ✅ 错误降级 UI 显示
- ✅ 容器不存在时抛出错误（renderCSR）
- ✅ 非浏览器环境检测
- ✅ 所有引擎：Hydration 错误降级 UI
- ✅ handleRenderError 错误处理
- ✅ View：实际 CSR 渲染并断言 DOM
- ✅ View：实际 Hybrid hydrate 并断言内容仍在
- ✅ View：Hybrid 流程（hydrate → unmount → CSR）主体区正确显示

#### Preact 入口

- ✅ 容器不存在时抛出错误
- ✅ 卸载组件
- ✅ update 函数
- ✅ CSR 返回性能指标
- ✅ HTMLElement 作为容器
- ✅ Preact：实际 CSR 渲染并断言 DOM
- ✅ Preact：实际 Hybrid hydrate 并断言内容仍在

#### React 入口

- ✅ 容器不存在时抛出错误（CSR）
- ✅ Hydration 容器不存在时抛出错误
- ✅ 性能监控
- ✅ 卸载组件
- ✅ update 函数
- ✅ CSR 返回性能指标
- ✅ React：实际 CSR 渲染并断言 DOM
- ✅ React：实际 Hybrid hydrate 并断言内容仍在

### 5. 客户端工具（client-utils.test.ts）- 28 项

#### 布局工具

- ✅ `shouldSkipLayouts`：检测 `inheritLayout = false`
- ✅ `composeLayouts`：无布局 / 跳过布局 / 嵌套布局
- ✅ `createComponentTree`：简单与嵌套组件树创建

#### 性能工具

- ✅ `PerformanceMonitor` 实例创建与记录
- ✅ `createPerformanceMonitor` 启用 / 禁用
- ✅ `recordPerformanceMetrics` 回调

#### 错误处理工具

- ✅ `handleRenderError` 降级组件、onError 回调、非 Error 类型处理

### 6. 布局继承（layout.test.ts）- 33 项

- ✅ 服务端/客户端 shouldSkipLayouts
- ✅ 服务端 filterLayouts
- ✅ 服务端/客户端 composeLayouts
- ✅ 服务端/客户端 createComponentTree
- ✅ 实际场景：inheritLayout = false、三层嵌套布局

### 7. SSG 测试（ssg.test.ts、ssg-advanced.test.ts）

- ✅ React/Preact SSG 生成
- ✅ Sitemap 与 Robots 生成（React/Preact）
- ✅ 路由数据处理
- ✅ 动态路由展开（路径段 `/user/[id]` 与 query 形式 `/user?id=[id]`）
- ✅ `routeToFilePath`：route → 相对文件路径（含 query 的
  `path/__q_key_value.html`）
- ✅ `filePathToRoute`：文件路径 → route（与 `routeToFilePath` 互为逆运算）
- ✅ 自定义模板、多引擎对比

### 8. SSR 测试（ssr.test.ts、ssr-comprehensive.test.ts）

- ✅ React/Preact/View SSR 渲染
- ✅ 不支持的引擎抛出错误
- ✅ 元数据、服务端数据、布局系统、流式渲染
- ✅ 错误处理、性能监控、缓存

### 9. 工具函数测试（utils.test.ts）- 23 项

- ✅ 元数据、server-data、脚本、缓存、性能、压缩、懒加载、context 等工具

## 模板引擎支持

| 引擎   | SSR | CSR | 水合（Hydration） | SSG |
| ------ | --- | --- | ----------------- | --- |
| React  | ✅  | ✅  | ✅                | ✅  |
| Preact | ✅  | ✅  | ✅                | ✅  |
| View   | ✅  | ✅  | ✅                | —   |

## 结论

`@dreamer/render` 各项功能均通过测试，覆盖完整。252 个测试在 Deno 与 Bun
下全部通过，支持 React、Preact、View 三种模板引擎。

---

**报告生成时间**：2026-02-17 **测试环境**：Deno 2.x+ / Bun 1.x+
**测试框架**：@dreamer/test@^1.0.6
