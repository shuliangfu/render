# @dreamer/render

> 一个专注于渲染逻辑的包，提供 SSR、CSR、Hydration 和 SSG 功能，支持
> React、Preact、View 三个模板引擎

[English](../../README.md) | 中文 (Chinese)

[![JSR](https://jsr.io/badges/@dreamer/render)](https://jsr.io/@dreamer/render)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](../../LICENSE)
[![Tests](https://img.shields.io/badge/tests-252%20passed-brightgreen)](./TEST_REPORT.md)

---

## 🎯 功能

渲染包，提供统一的渲染抽象层，支持多种模板引擎，用于服务端渲染、客户端渲染、水合和静态站点生成等场景。

---

## 📦 安装

### Deno

```bash
deno add jsr:@dreamer/render
```

### Bun

```bash
bunx jsr add @dreamer/render
```

---

## 🌍 环境兼容性

| 环境       | 版本要求              | 状态                                           |
| ---------- | --------------------- | ---------------------------------------------- |
| **Deno**   | 2.5+                  | ✅ 完全支持                                    |
| **Bun**    | 1.0+                  | ✅ 完全支持                                    |
| **浏览器** | 现代浏览器（ES2020+） | ✅ 支持（CSR、Hydration）                      |
| **React**  | 18+                   | ✅ 完全支持                                    |
| **Preact** | 10+                   | ✅ 完全支持                                    |
| **View**   | 1.0+                  | ✅ 完全支持（SSR、CSR、Hydration）             |
| **依赖**   | -                     | 📦 需要对应的模板引擎包（React、Preact、View） |

---

## ✨ 特性

- **多模板引擎支持**：
  - React 18+ 支持
  - Preact 10+ 支持
  - View 1.0+ 支持（@dreamer/view）
  - 统一的渲染接口
- **服务端渲染（SSR）**：
  - 在服务端将组件渲染为 HTML 字符串
  - 支持流式渲染（React、Preact、View）
  - 支持 HTML 模板包装
  - 支持元数据管理
  - 支持服务端数据注入
  - 支持布局系统
  - 支持脚本提取和注入
- **客户端渲染（CSR）**：
  - 在浏览器中将组件渲染到 DOM
  - 返回卸载函数和更新函数
  - 支持性能监控
  - 支持错误处理
  - 支持布局系统
- **水合（Hydration）**：
  - 将 SSR 生成的 HTML 与客户端 JS 连接
  - 恢复交互性
  - React 支持严格模式
  - 支持性能监控
  - 支持错误处理
- **静态站点生成（SSG）**：
  - 构建时预渲染所有路由为静态 HTML 文件
  - 支持多路由生成
  - 支持动态路由展开
  - 自动生成 sitemap.xml
  - 自动生成 robots.txt
- **高级功能**：
  - 元数据管理（静态、同步、异步）
  - 数据注入（通过 `load` 方法）
  - 布局系统（单层和多层嵌套，支持 `inheritLayout = false` 跳过）
  - 脚本管理（自动提取和注入）
  - 错误处理（错误捕获和降级）
  - 性能监控（渲染时间统计）
  - 元数据缓存（可选缓存机制）
  - 数据压缩（减少 HTML 体积）
  - 数据懒加载（优化首屏性能）
  - Context API（动态设置元数据和数据）

**设计原则**：

- **主包（@dreamer/render）**：用于服务端（兼容 Deno 和 Bun 运行时）
- **客户端子包（@dreamer/render/client）**：用于客户端（浏览器环境）

---

## 🎯 使用场景

- **服务端渲染（SSR）**：需要 SEO 优化的应用，首屏性能优化
- **客户端渲染（CSR）**：交互性强的单页应用
- **水合（Hydration）**：SSR + CSR 混合应用，提升用户体验
- **静态站点生成（SSG）**：博客、文档站点、营销页面
- **多模板引擎支持**：根据项目需求选择 React、Preact 或 View
- **元数据管理**：SEO 优化，社交分享（OG、Twitter Card）
- **数据注入**：服务端数据传递到客户端
- **布局系统**：统一的页面布局管理

---

## 🚀 快速开始

### 服务端渲染（SSR）

```typescript
import { renderSSR } from "jsr:@dreamer/render";
import React from "react";

// 定义组件
function App({ name }: { name: string }) {
  return React.createElement("div", null, `Hello, ${name}!`);
}

// 渲染为 HTML（自动注入，无需手动添加插入点标签）
const result = await renderSSR({
  engine: "react",
  component: App,
  props: { name: "World" },
  template: "<html><body></body></html>",
});

console.log(result.html);
```

### 客户端渲染（CSR）

```typescript
// 客户端代码使用 /client 子路径
import { renderCSR } from "jsr:@dreamer/render/client";
import React from "react";

// 定义组件
function App({ name }: { name: string }) {
  return React.createElement("div", null, `Hello, ${name}!`);
}

// 在浏览器中渲染（必须在浏览器环境）
const result = renderCSR({
  engine: "react",
  component: App,
  props: { name: "World" },
  container: "#app",
  // 可选：错误处理
  errorHandler: {
    onError: (error, context) => {
      console.error(`渲染错误 [${context.phase}]:`, error);
    },
    logError: true,
  },
  // 可选：性能监控
  performance: {
    enabled: true,
    onMetrics: (metrics) => {
      console.log(`渲染耗时: ${metrics.duration}ms`);
    },
    slowThreshold: 100, // 超过 100ms 标记为慢渲染
  },
});

// 后续可以更新或卸载
// result.update({ name: "Deno" });
// result.unmount();
```

### 水合（Hydration）

```typescript
// 客户端代码使用 /client 子路径
import { hydrate } from "jsr:@dreamer/render/client";
import React from "react";

// 定义组件（必须与 SSR 使用的组件相同）
function App({ name }: { name: string }) {
  return React.createElement("div", null, `Hello, ${name}!`);
}

// 水合 SSR 生成的 HTML（必须在浏览器环境）
const result = hydrate({
  engine: "react",
  component: App,
  props: { name: "World" },
  container: "#app",
  strictMode: true, // 仅 React 支持
  // 可选：错误处理和性能监控（与 CSR 相同）
  errorHandler: {
    onError: (error, context) => {
      console.error(`水合错误:`, error);
    },
  },
  performance: {
    enabled: true,
    onMetrics: (metrics) => {
      console.log(`水合耗时: ${metrics.duration}ms`);
    },
  },
});

// 后续可以更新或卸载
// result.update({ name: "Deno" });
// result.unmount();
```

### 静态站点生成（SSG）

```typescript
import { renderSSG } from "jsr:@dreamer/render";
import React from "react";

// 定义应用组件
function App() {
  return React.createElement("div", null, "Hello, SSG!");
}

// 生成静态 HTML 文件
const files = await renderSSG({
  engine: "react",
  routes: ["/", "/about"],
  outputDir: "./dist",
  loadRouteComponent: async (route) => {
    // 动态加载路由组件
    if (route === "/") {
      return App;
    }
    // ... 其他路由
    return App;
  },
  generateSitemap: true,
  generateRobots: true,
});

console.log(`生成了 ${files.length} 个文件`);
```

### View 引擎（SSR）

使用 `@dreamer/view` 时设置 `engine: "view"`，可进行 SSR、CSR 和
Hydration。组件需通过 `@dreamer/view/jsx-runtime` 的 `jsx` 构建。

```typescript
import { renderSSR } from "jsr:@dreamer/render";
import { jsx } from "jsr:@dreamer/view/jsx-runtime";

const App = (props: { name?: string }) =>
  jsx("div", { children: `Hello, ${props?.name ?? "View"}!` }, undefined);

const result = await renderSSR({
  engine: "view",
  component: App,
  props: { name: "World" },
  template: "<html><body></body></html>",
});

console.log(result.html);
```

客户端：使用 `@dreamer/render/client`，`engine: "view"` 下可调用 `renderCSR` 和
`hydrate`，View 客户端适配器已内置。

---

## 🎨 使用示例

### 元数据管理

```typescript
import { renderSSR } from "jsr:@dreamer/render";
import React from "react";
import type { LoadContext, Metadata } from "jsr:@dreamer/render";

function Page() {
  return React.createElement("div", null, "Content");
}

// 静态元数据
(Page as any).metadata = {
  title: "页面标题",
  description: "页面描述",
  og: {
    title: "OG 标题",
    image: "https://example.com/image.jpg",
  },
} as Metadata;

// 或者使用函数（同步或异步）
(Page as any).metadata = async (context: LoadContext) => {
  const data = await fetchData(context.url);
  return {
    title: data.title,
    description: data.description,
  };
};

const result = await renderSSR({
  engine: "react",
  component: Page,
  template: "<html><head></head><body></body></html>",
  // 元数据、数据脚本、脚本标签会自动注入到合适位置
});
```

### 服务端数据注入

```typescript
import { renderSSR } from "jsr:@dreamer/render";
import React from "react";
import type { LoadContext, ServerData } from "jsr:@dreamer/render";

function Page({ user }: { user: { name: string } }) {
  return React.createElement("div", null, `Hello, ${user.name}!`);
}

// 定义 load 方法
(Page as any).load = async (context: LoadContext): Promise<ServerData> => {
  const userId = context.params.id;
  const user = await fetchUser(userId);
  return { user };
};

const result = await renderSSR({
  engine: "react",
  component: Page,
  loadContext: {
    url: "/user/123",
    params: { id: "123" },
  },
  template: "<html><body></body></html>",
  // 数据会自动注入到 </head> 之前
});

// 数据会自动注入到 window.__DATA__.page
```

### 布局系统

```typescript
import { renderSSR } from "jsr:@dreamer/render";
import React from "react";
import type { LayoutComponent } from "jsr:@dreamer/render";

// 定义布局组件
function OuterLayout({ children }: { children: React.ReactNode }) {
  return React.createElement("div", { className: "outer" }, children);
}

function InnerLayout({ children }: { children: React.ReactNode }) {
  return React.createElement("div", { className: "inner" }, children);
}

// 定义布局配置（从外到内）
const layouts: LayoutComponent[] = [
  { component: OuterLayout, props: {} },
  { component: InnerLayout, props: {} },
];

// 使用布局
const result = await renderSSR({
  engine: "react",
  component: Page,
  layouts,
});

// 跳过布局：在组件上导出 inheritLayout = false
(Page as any).inheritLayout = false;
```

### 脚本提取和注入

```typescript
import { renderSSR } from "jsr:@dreamer/render";
import React from "react";
import type { ScriptDefinition } from "jsr:@dreamer/render";

function Page() {
  return React.createElement("div", null, "Content");
}

// 定义脚本
(Page as any).scripts = [
  {
    src: "/js/main.js",
    async: true,
    priority: 1,
  },
  {
    content: "console.log('内联脚本');",
    priority: 2,
  },
] as ScriptDefinition[];

const result = await renderSSR({
  engine: "react",
  component: Page,
  template: "<html><body></body></html>",
  // 脚本会自动注入到 </body> 之前
});
```

---

## 📚 API 文档

### 核心函数

#### `renderSSR(options: SSROptions): Promise<RenderResult>`

服务端渲染函数，根据指定的模板引擎类型，调用对应的适配器进行服务端渲染。

**选项**：

| 参数            | 类型                      | 必需 | 说明                                             |
| --------------- | ------------------------- | ---- | ------------------------------------------------ |
| `engine`        | `Engine`                  | ✅   | 模板引擎类型（"react" \| "preact" \| "view"）    |
| `component`     | `unknown`                 | ✅   | 组件（React/Preact 组件）                        |
| `props`         | `Record<string, unknown>` | ❌   | 组件属性                                         |
| `layouts`       | `LayoutComponent[]`       | ❌   | 布局组件列表（从外到内）                         |
| `template`      | `string`                  | ❌   | HTML 模板（用于包装渲染结果）                    |
| `stream`        | `boolean`                 | ❌   | 是否启用流式渲染（React、Preact、View）          |
| `loadContext`   | `LoadContext`             | ❌   | Load Context（传递给 load 方法和 metadata 函数） |
| `errorHandler`  | `ErrorHandler`            | ❌   | 错误处理选项                                     |
| `performance`   | `PerformanceOptions`      | ❌   | 性能监控选项                                     |
| `metadataCache` | `CacheOptions`            | ❌   | 元数据缓存选项                                   |
| `compression`   | `CompressionOptions`      | ❌   | 数据压缩选项                                     |
| `contextData`   | `ContextData`             | ❌   | Context API 数据                                 |
| `lazyData`      | `boolean`                 | ❌   | 是否启用数据懒加载                               |

**返回**：渲染结果，包含 HTML、元数据、数据等

#### `renderCSR(options: CSROptions): CSRRenderResult`

> **导入路径**: `@dreamer/render/client`

客户端渲染函数，根据指定的模板引擎类型，调用对应的适配器进行客户端渲染。

**选项**：

| 参数           | 类型                      | 必需 | 说明                         |
| -------------- | ------------------------- | ---- | ---------------------------- |
| `engine`       | `Engine`                  | ✅   | 模板引擎类型                 |
| `component`    | `unknown`                 | ✅   | 组件                         |
| `props`        | `Record<string, unknown>` | ❌   | 组件属性                     |
| `container`    | `string \| HTMLElement`   | ✅   | 挂载容器（DOM 元素或选择器） |
| `layouts`      | `unknown[]`               | ❌   | 布局组件列表（从外到内）     |
| `errorHandler` | `ErrorHandler`            | ❌   | 错误处理选项                 |
| `performance`  | `PerformanceOptions`      | ❌   | 性能监控选项                 |

**返回**：`CSRRenderResult`

- `unmount(): void`: 卸载组件
- `update(props: Record<string, unknown>): void`: 更新组件属性
- `metrics?: PerformanceMetrics`: 性能指标（如果启用性能监控）

**注意**：此函数只能在浏览器环境中运行。

#### `hydrate(options: HydrationOptions): HydrationResult`

> **导入路径**: `@dreamer/render/client`

水合函数，将 SSR 生成的 HTML 与客户端 JS 连接，恢复交互性。

**选项**：

| 参数           | 类型                      | 必需 | 说明                              |
| -------------- | ------------------------- | ---- | --------------------------------- |
| `engine`       | `Engine`                  | ✅   | 模板引擎类型                      |
| `component`    | `unknown`                 | ✅   | 组件（必须与 SSR 使用的组件相同） |
| `props`        | `Record<string, unknown>` | ❌   | 组件属性                          |
| `container`    | `string \| HTMLElement`   | ✅   | 挂载容器                          |
| `layouts`      | `unknown[]`               | ❌   | 布局组件列表                      |
| `strictMode`   | `boolean`                 | ❌   | 是否启用严格模式（仅 React）      |
| `errorHandler` | `ErrorHandler`            | ❌   | 错误处理选项                      |
| `performance`  | `PerformanceOptions`      | ❌   | 性能监控选项                      |

**返回**：`HydrationResult`

- `unmount(): void`: 卸载组件
- `update(props: Record<string, unknown>): void`: 更新组件属性
- `metrics?: PerformanceMetrics`: 性能指标（如果启用性能监控）

**注意**：此函数只能在浏览器环境中运行。

#### `renderSSG(options: SSGOptions): Promise<string[]>`

静态站点生成函数，预渲染所有路由为静态 HTML 文件。

**选项**：

| 参数                 | 类型                                                  | 必需 | 说明                 |
| -------------------- | ----------------------------------------------------- | ---- | -------------------- |
| `engine`             | `Engine`                                              | ✅   | 模板引擎类型         |
| `routes`             | `string[]`                                            | ✅   | 路由列表             |
| `outputDir`          | `string`                                              | ✅   | 输出目录             |
| `loadRouteComponent` | `(route: string) => Promise<unknown>`                 | ✅   | 路由组件加载函数     |
| `loadRouteData`      | `(route: string) => Promise<Record<string, unknown>>` | ❌   | 路由数据加载函数     |
| `template`           | `string`                                              | ❌   | HTML 模板            |
| `generateSitemap`    | `boolean`                                             | ❌   | 是否生成 sitemap.xml |
| `generateRobots`     | `boolean`                                             | ❌   | 是否生成 robots.txt  |

**返回**：生成的文件路径列表

### 辅助函数

#### `generateSitemap(routes: string[], baseUrl?: string): string`

生成 sitemap.xml 内容。

#### `generateRobots(allowAll?: boolean, disallowPaths?: string[]): string`

生成 robots.txt 内容。

#### `expandDynamicRoute(route: string, params: string[]): string[]`

展开动态路由。

```typescript
const routes = expandDynamicRoute("/user/[id]", ["1", "2", "3"]);
// => ["/user/1", "/user/2", "/user/3"]
```

### 类型定义

#### `Engine`

支持的模板引擎类型：

```typescript
type Engine = "react" | "preact" | "view";
```

#### `Metadata`

元数据定义：

```typescript
interface Metadata {
  title?: string;
  description?: string;
  keywords?: string;
  author?: string;
  og?: {
    title?: string;
    description?: string;
    image?: string;
    url?: string;
    type?: string;
  };
  twitter?: {
    card?: string;
    title?: string;
    description?: string;
    image?: string;
  };
  custom?: Record<string, string>;
}
```

#### `LoadContext`

Load 方法的上下文：

```typescript
interface LoadContext {
  url: string;
  params: Record<string, string>;
  request?: Request;
  [key: string]: unknown;
}
```

#### `LayoutComponent`

布局组件定义：

```typescript
interface LayoutComponent {
  component: unknown;
  props?: Record<string, unknown>;
  skip?: boolean;
}
```

#### `ScriptDefinition`

脚本定义：

```typescript
interface ScriptDefinition {
  src?: string;
  content?: string;
  async?: boolean;
  defer?: boolean;
  priority?: number;
  type?: string;
  [key: string]: unknown;
}
```

### 客户端类型定义

> **导入路径**: `@dreamer/render/client`

#### `ErrorHandler`（客户端）

客户端错误处理选项：

```typescript
interface ErrorHandler {
  // 错误回调函数
  onError?: (
    error: Error,
    context: {
      engine: Engine;
      component: unknown;
      phase: "csr" | "hydrate";
    },
  ) => void | Promise<void>;
  // 降级组件
  fallbackComponent?: unknown;
  // 是否记录错误到控制台（默认 true）
  logError?: boolean;
}
```

#### `PerformanceOptions`（客户端）

客户端性能监控选项：

```typescript
interface PerformanceOptions {
  // 是否启用性能监控
  enabled?: boolean;
  // 性能指标回调
  onMetrics?: (metrics: PerformanceMetrics) => void;
  // 慢渲染阈值（毫秒，默认 100）
  slowThreshold?: number;
}
```

#### `PerformanceMetrics`（客户端）

客户端性能指标：

```typescript
interface PerformanceMetrics {
  // 渲染开始时间
  startTime: number;
  // 渲染结束时间
  endTime: number;
  // 渲染耗时（毫秒）
  duration: number;
  // 使用的模板引擎
  engine: Engine;
  // 渲染阶段
  phase: "csr" | "hydrate";
  // 是否为慢渲染
  isSlow?: boolean;
}
```

---

## ⚡ 性能优化

- **流式渲染**：React、Preact、View 支持流式渲染，提高首屏性能
- **元数据缓存**：可选的元数据缓存机制，减少重复计算
- **数据压缩**：支持大数据压缩，减少 HTML 体积
- **数据懒加载**：支持大数据懒加载，优化首屏性能
- **脚本优先级**：支持脚本优先级排序，优化加载顺序
- **性能监控**：内置性能监控，记录渲染时间
- **错误处理**：完善的错误捕获和降级机制

---

## 📊 测试报告

| 指标     | 数值                   |
| -------- | ---------------------- |
| 测试时间 | 2026-02-17             |
| 总测试数 | 252                    |
| 通过     | 252 ✅                 |
| 失败     | 0                      |
| 通过率   | 100%                   |
| 执行时间 | ~46s（`deno test -A`） |

| 运行时 | 版本 | 测试结果      |
| ------ | ---- | ------------- |
| Deno   | 2.x+ | ✅ 252 passed |
| Bun    | 1.x+ | ✅ 252 passed |

详细测试报告请查看 [TEST_REPORT.md](./TEST_REPORT.md)

---

## 📋 变更日志

**v1.0.41**（2026-02-25）：变更 – 更新相关依赖以保持兼容。完整历史见
[CHANGELOG.md](./CHANGELOG.md)。

---

## 📝 注意事项

- **服务端和客户端分离**：通过 `/client` 子路径明确区分服务端和客户端代码
- **统一接口**：服务端和客户端使用相同的 API 接口，降低学习成本
- **多模板引擎支持**：支持 React、Preact、View，根据项目需求选择
- **类型安全**：完整的 TypeScript 类型支持
- **组件导出约定**：组件可以导出 `metadata`、`load`、`scripts`、`inheritLayout`
  等属性
- **元数据合并策略**：采用深度合并策略，页面的元数据会覆盖布局的元数据
- **数据注入**：数据自动注入到 `window.__DATA__` 中，客户端可以通过
  `globalThis.__DATA__` 访问
- **布局系统**：支持单层和多层嵌套布局，可以通过 `inheritLayout = false`
  跳过布局

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

## 📄 许可证

Apache License 2.0 - 详见 [LICENSE](../../LICENSE)

---

<div align="center">

**Made with ❤️ by Dreamer Team**

</div>
