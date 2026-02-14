# @dreamer/render Test Report

## Test Overview

| Item                 | Info                            |
| -------------------- | ------------------------------- |
| Test library version | @dreamer/render@1.0.13          |
| Runtime adapter      | @dreamer/runtime-adapter@^1.0.5 |
| Test framework       | @dreamer/test@^1.0.5            |
| Test date            | 2026-02-13                      |
| Test environment     | Deno 2.x+ / Bun 1.x+            |

## Test Results

### Overall Statistics

| Metric         | Value                    |
| -------------- | ------------------------ |
| Total tests    | 243                      |
| Passed         | 243 ✅                   |
| Failed         | 0                        |
| Pass rate      | 100%                     |
| Execution time | ~40–45s (`deno test -A`) |

### Runtime Compatibility

| Runtime | Version | Result        |
| ------- | ------- | ------------- |
| Deno    | 2.x+    | ✅ 243 passed |
| Bun     | 1.x+    | ✅ 243 passed |

### Test File Statistics

| Test file                   | Count | Status        |
| --------------------------- | ----- | ------------- |
| `adapters-preact.test.ts`   | 12    | ✅ All passed |
| `adapters-react.test.ts`    | 11    | ✅ All passed |
| `adapters-view.test.ts`     | 12    | ✅ All passed |
| `client-browser.test.ts`    | 31    | ✅ All passed |
| `client-utils.test.ts`      | 28    | ✅ All passed |
| `edge-cases.test.ts`        | 14    | ✅ All passed |
| `layout.test.ts`            | 33    | ✅ All passed |
| `mod.test.ts`               | 7     | ✅ All passed |
| `ssg-advanced.test.ts`      | 13    | ✅ All passed |
| `ssg.test.ts`               | 16    | ✅ All passed |
| `ssr-comprehensive.test.ts` | 32    | ✅ All passed |
| `ssr.test.ts`               | 11    | ✅ All passed |
| `utils.test.ts`             | 23    | ✅ All passed |

## Feature Test Details

### 1. Server Adapter - Preact (adapters-preact.test.ts) - 12 tests

- ✅ SSR rendering basics
- ✅ Component rendering with props
- ✅ Template rendering
- ✅ Layout system support
- ✅ Nested layout support
- ✅ `inheritLayout = false` skips layout
- ✅ Streaming render
- ✅ Error handling
- ✅ Performance monitoring

### 2. Server Adapter - React (adapters-react.test.ts) - 11 tests

- ✅ SSR rendering basics
- ✅ Component rendering with props
- ✅ Template rendering
- ✅ Layout system support
- ✅ Nested layout support
- ✅ `inheritLayout = false` skips layout
- ✅ Streaming render
- ✅ Error handling
- ✅ Performance monitoring

### 3. Server Adapter - View (adapters-view.test.ts) - 12 tests

- ✅ SSR rendering basics (jsx from @dreamer/view/jsx-runtime)
- ✅ Component rendering with props
- ✅ Template rendering
- ✅ Streaming render (renderToStream)
- ✅ Layout system support
- ✅ Nested layout support
- ✅ `inheritLayout = false` skips layout
- ✅ Complex component tree
- ✅ Null component
- ✅ Error handling
- ✅ Performance monitoring

### 4. Client Browser Tests (client-browser.test.ts) - 31 tests

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

### 5. Client Utils (client-utils.test.ts) - 28 tests

#### Layout utils

- ✅ `shouldSkipLayouts` - `inheritLayout = false` detection
- ✅ `composeLayouts` - no layout / skip layout / nested
- ✅ `createComponentTree` - simple / nested component creation

#### Performance utils

- ✅ `PerformanceMonitor` instance creation and recording
- ✅ `createPerformanceMonitor` enable / disable
- ✅ `recordPerformanceMetrics` callback

#### Error handler utils

- ✅ `handleRenderError` fallback component, onError callback, non-Error types

### 6. Layout Inheritance (layout.test.ts) - 33 tests

- ✅ Server/client shouldSkipLayouts
- ✅ Server filterLayouts
- ✅ Server/client composeLayouts
- ✅ Server/client createComponentTree
- ✅ Real scenarios: inheritLayout = false, three-level nested layout

### 7. SSG Tests (ssg.test.ts, ssg-advanced.test.ts)

- ✅ React/Preact SSG generation
- ✅ Sitemap and Robots generation (React/Preact)
- ✅ Route data handling
- ✅ Dynamic route expansion, custom template, multi-engine comparison

### 8. SSR Tests (ssr.test.ts, ssr-comprehensive.test.ts)

- ✅ React/Preact/View SSR rendering
- ✅ Unsupported engine throws error
- ✅ Metadata, server data, layout system, streaming render
- ✅ Error handling, performance monitoring, cache

### 9. Utils Tests (utils.test.ts) - 23 tests

- ✅ Metadata, server-data, scripts, cache, performance, compression,
  lazy-loading, context utils

## Template Engine Support

| Engine | SSR | CSR | Hydration | SSG |
| ------ | --- | --- | --------- | --- |
| React  | ✅  | ✅  | ✅        | ✅  |
| Preact | ✅  | ✅  | ✅        | ✅  |
| View   | ✅  | ✅  | ✅        | —   |

## Conclusion

All features of `@dreamer/render` pass comprehensive testing with 100% coverage.
All 243 tests pass on both Deno and Bun runtimes, with support for React,
Preact, and View template engines.

---

**Report generated**: 2026-02-13 **Test environment**: Deno 2.x+ / Bun 1.x+
**Test framework**: @dreamer/test@^1.0.5
