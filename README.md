# @dreamer/render

> A rendering library for SSR, CSR, Hydration, and SSG, supporting React,
> Preact, and View

English | [中文 (Chinese)](./docs/zh-CN/README.md)

[![JSR](https://jsr.io/badges/@dreamer/render)](https://jsr.io/@dreamer/render)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](./LICENSE)
[![Tests](https://img.shields.io/badge/tests-252%20passed-brightgreen)](./docs/en-US/TEST_REPORT.md)

---

## 🎯 Features

Rendering library with a unified abstraction layer, supporting multiple template
engines for SSR, CSR, Hydration, and SSG.

---

## 📦 Installation

### Deno

```bash
deno add jsr:@dreamer/render
```

### Bun

```bash
bunx jsr add @dreamer/render
```

---

## 🌍 Environment Compatibility

| Environment      | Version          | Status                                          |
| ---------------- | ---------------- | ----------------------------------------------- |
| **Deno**         | 2.5+             | ✅ Full support                                 |
| **Bun**          | 1.0+             | ✅ Full support                                 |
| **Browser**      | Modern (ES2020+) | ✅ CSR, Hydration                               |
| **React**        | 18+              | ✅ Full support                                 |
| **Preact**       | 10+              | ✅ Full support                                 |
| **View**         | 1.0+             | ✅ Full support (SSR, CSR, Hydration)           |
| **Dependencies** | -                | 📦 Requires template engine (React/Preact/View) |

---

## ✨ Characteristics

- **Multi-engine**:
  - React 18+
  - Preact 10+
  - View 1.0+ (@dreamer/view)
  - Unified render API
- **SSR**:
  - Render components to HTML on server
  - Streaming (React, Preact, View)
  - HTML template wrapping
  - Metadata, server data injection, layout system
  - Script extraction and injection
- **CSR**:
  - Render to DOM in browser
  - Unmount and update functions
  - Performance monitoring, error handling, layouts
- **Hydration**:
  - Connect SSR HTML with client JS
  - Restore interactivity
  - React strict mode, performance, error handling
- **SSG**:
  - Pre-render routes to static HTML at build time
  - Multi-route, dynamic route expansion
  - Auto sitemap.xml, robots.txt
- **Advanced**:
  - Metadata (static, sync, async)
  - Data injection via `load`
  - Layout system (nested, `inheritLayout = false`)
  - Script management, error handling, performance monitoring
  - Metadata cache, compression, lazy-loading
  - Context API

**Design**:

- **Main package (@dreamer/render)**: Server (Deno/Bun)
- **Client subpath (@dreamer/render/client)**: Browser

---

## 🎯 Use Cases

- **SSR**: SEO, first-screen performance
- **CSR**: Interactive SPAs
- **Hydration**: SSR + CSR hybrid
- **SSG**: Blogs, docs, marketing pages
- **Multi-engine**: Choose React, Preact, or View
- **Metadata**: SEO, OG, Twitter Card
- **Data injection**: Server → client
- **Layout system**: Unified page layouts

---

## 🚀 Quick Start

### Server-Side Rendering (SSR)

```typescript
import { renderSSR } from "jsr:@dreamer/render";
import React from "react";

// Define component
function App({ name }: { name: string }) {
  return React.createElement("div", null, `Hello, ${name}!`);
}

// Render to HTML (auto-injected, no manual insertion points)
const result = await renderSSR({
  engine: "react",
  component: App,
  props: { name: "World" },
  template: "<html><body></body></html>",
});

console.log(result.html);
```

### Client-Side Rendering (CSR)

```typescript
// Client code uses /client subpath
import { renderCSR } from "jsr:@dreamer/render/client";
import React from "react";

// Define component
function App({ name }: { name: string }) {
  return React.createElement("div", null, `Hello, ${name}!`);
}

// Render in browser (must run in browser)
const result = renderCSR({
  engine: "react",
  component: App,
  props: { name: "World" },
  container: "#app",
  // Optional: error handling
  errorHandler: {
    onError: (error, context) => {
      console.error(`Render error [${context.phase}]:`, error);
    },
    logError: true,
  },
  // Optional: performance monitoring
  performance: {
    enabled: true,
    onMetrics: (metrics) => {
      console.log(`Render duration: ${metrics.duration}ms`);
    },
    slowThreshold: 100, // Mark as slow if > 100ms
  },
});

// Can update or unmount later
// result.update({ name: "Deno" });
// result.unmount();
```

### Hydration

```typescript
// Client code uses /client subpath
import { hydrate } from "jsr:@dreamer/render/client";
import React from "react";

// Define component (must match SSR component)
function App({ name }: { name: string }) {
  return React.createElement("div", null, `Hello, ${name}!`);
}

// Hydrate SSR HTML (must run in browser)
const result = hydrate({
  engine: "react",
  component: App,
  props: { name: "World" },
  container: "#app",
  strictMode: true, // React only
  // Optional: error handling and performance (same as CSR)
  errorHandler: {
    onError: (error, context) => {
      console.error(`Hydration error:`, error);
    },
  },
  performance: {
    enabled: true,
    onMetrics: (metrics) => {
      console.log(`Hydration duration: ${metrics.duration}ms`);
    },
  },
});

// Can update or unmount later
// result.update({ name: "Deno" });
// result.unmount();
```

### Static Site Generation (SSG)

```typescript
import { renderSSG } from "jsr:@dreamer/render";
import React from "react";

// Define app component
function App() {
  return React.createElement("div", null, "Hello, SSG!");
}

// Generate static HTML files
const files = await renderSSG({
  engine: "react",
  routes: ["/", "/about"],
  outputDir: "./dist",
  loadRouteComponent: async (route) => {
    // Dynamically load route component
    if (route === "/") {
      return App;
    }
    // ... other routes
    return App;
  },
  generateSitemap: true,
  generateRobots: true,
});

console.log(`Generated ${files.length} files`);
```

### View engine (SSR)

Use `@dreamer/view` with `engine: "view"` for SSR, CSR, and Hydration.
Components are built with `jsx` from `@dreamer/view/jsx-runtime`.

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

Client: use `@dreamer/render/client` with `engine: "view"` for `renderCSR` and
`hydrate`; the View client adapter is included.

---

## 🎨 Examples

### Metadata Management

```typescript
import { renderSSR } from "jsr:@dreamer/render";
import React from "react";
import type { LoadContext, Metadata } from "jsr:@dreamer/render";

function Page() {
  return React.createElement("div", null, "Content");
}

// Static metadata
(Page as any).metadata = {
  title: "Page Title",
  description: "Page description",
  og: {
    title: "OG Title",
    image: "https://example.com/image.jpg",
  },
} as Metadata;

// Or use function (sync or async)
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
  // Metadata, data script, script tags auto-injected
});
```

### Server Data Injection

```typescript
import { renderSSR } from "jsr:@dreamer/render";
import React from "react";
import type { LoadContext, ServerData } from "jsr:@dreamer/render";

function Page({ user }: { user: { name: string } }) {
  return React.createElement("div", null, `Hello, ${user.name}!`);
}

// Define load method
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
  // Data auto-injected before </head>
});

// Data auto-injected to window.__DATA__.page
```

### Layout System

```typescript
import { renderSSR } from "jsr:@dreamer/render";
import React from "react";
import type { LayoutComponent } from "jsr:@dreamer/render";

// Define layout components
function OuterLayout({ children }: { children: React.ReactNode }) {
  return React.createElement("div", { className: "outer" }, children);
}

function InnerLayout({ children }: { children: React.ReactNode }) {
  return React.createElement("div", { className: "inner" }, children);
}

// Define layouts (outer to inner)
const layouts: LayoutComponent[] = [
  { component: OuterLayout, props: {} },
  { component: InnerLayout, props: {} },
];

// Use layouts
const result = await renderSSR({
  engine: "react",
  component: Page,
  layouts,
});

// Skip layout: export inheritLayout = false on component
(Page as any).inheritLayout = false;
```

### Script Extraction and Injection

```typescript
import { renderSSR } from "jsr:@dreamer/render";
import React from "react";
import type { ScriptDefinition } from "jsr:@dreamer/render";

function Page() {
  return React.createElement("div", null, "Content");
}

// Define scripts
(Page as any).scripts = [
  {
    src: "/js/main.js",
    async: true,
    priority: 1,
  },
  {
    content: "console.log('inline script');",
    priority: 2,
  },
] as ScriptDefinition[];

const result = await renderSSR({
  engine: "react",
  component: Page,
  template: "<html><body></body></html>",
  // Scripts auto-injected before </body>
});
```

---

## 📚 API Reference

### Core Functions

#### `renderSSR(options: SSROptions): Promise<RenderResult>`

Server-side render function. Uses the adapter for the specified engine.

**Options**:

| Param           | Type                      | Required | Description                            |
| --------------- | ------------------------- | -------- | -------------------------------------- |
| `engine`        | `Engine`                  | ✅       | Engine ("react" \| "preact" \| "view") |
| `component`     | `unknown`                 | ✅       | Component                              |
| `props`         | `Record<string, unknown>` | ❌       | Component props                        |
| `layouts`       | `LayoutComponent[]`       | ❌       | Layouts (outer to inner)               |
| `template`      | `string`                  | ❌       | HTML template                          |
| `stream`        | `boolean`                 | ❌       | Enable streaming (React, Preact, View) |
| `loadContext`   | `LoadContext`             | ❌       | Context for load and metadata          |
| `errorHandler`  | `ErrorHandler`            | ❌       | Error handling                         |
| `performance`   | `PerformanceOptions`      | ❌       | Performance monitoring                 |
| `metadataCache` | `CacheOptions`            | ❌       | Metadata cache                         |
| `compression`   | `CompressionOptions`      | ❌       | Data compression                       |
| `contextData`   | `ContextData`             | ❌       | Context API data                       |
| `lazyData`      | `boolean`                 | ❌       | Enable lazy data loading               |

**Returns**: Render result (HTML, metadata, data)

#### `renderCSR(options: CSROptions): CSRRenderResult`

> **Import**: `@dreamer/render/client`

Client-side render function.

**Options**:

| Param          | Type                      | Required | Description              |
| -------------- | ------------------------- | -------- | ------------------------ |
| `engine`       | `Engine`                  | ✅       | Engine type              |
| `component`    | `unknown`                 | ✅       | Component                |
| `props`        | `Record<string, unknown>` | ❌       | Props                    |
| `container`    | `string \| HTMLElement`   | ✅       | Mount container          |
| `layouts`      | `unknown[]`               | ❌       | Layouts (outer to inner) |
| `errorHandler` | `ErrorHandler`            | ❌       | Error handling           |
| `performance`  | `PerformanceOptions`      | ❌       | Performance monitoring   |

**Returns**: `CSRRenderResult`

- `unmount(): void`: Unmount component
- `update(props): void`: Update props
- `metrics?: PerformanceMetrics`: Metrics (if enabled)

**Note**: Browser only.

#### `hydrate(options: HydrationOptions): HydrationResult`

> **Import**: `@dreamer/render/client`

Hydrate SSR HTML with client JS.

**Options**:

| Param          | Type                      | Required | Description                |
| -------------- | ------------------------- | -------- | -------------------------- |
| `engine`       | `Engine`                  | ✅       | Engine type                |
| `component`    | `unknown`                 | ✅       | Component (must match SSR) |
| `props`        | `Record<string, unknown>` | ❌       | Props                      |
| `container`    | `string \| HTMLElement`   | ✅       | Mount container            |
| `layouts`      | `unknown[]`               | ❌       | Layouts                    |
| `strictMode`   | `boolean`                 | ❌       | Strict mode (React only)   |
| `errorHandler` | `ErrorHandler`            | ❌       | Error handling             |
| `performance`  | `PerformanceOptions`      | ❌       | Performance monitoring     |

**Returns**: `HydrationResult` (unmount, update, metrics)

**Note**: Browser only.

#### `renderSSG(options: SSGOptions): Promise<string[]>`

Static site generation. Pre-render routes to static HTML.

**Options**:

| Param                | Type                                          | Required | Description            |
| -------------------- | --------------------------------------------- | -------- | ---------------------- |
| `engine`             | `Engine`                                      | ✅       | Engine type            |
| `routes`             | `string[]`                                    | ✅       | Route list             |
| `outputDir`          | `string`                                      | ✅       | Output directory       |
| `loadRouteComponent` | `(route) => Promise<unknown>`                 | ✅       | Route component loader |
| `loadRouteData`      | `(route) => Promise<Record<string, unknown>>` | ❌       | Route data loader      |
| `template`           | `string`                                      | ❌       | HTML template          |
| `generateSitemap`    | `boolean`                                     | ❌       | Generate sitemap.xml   |
| `generateRobots`     | `boolean`                                     | ❌       | Generate robots.txt    |

**Returns**: Generated file paths

### Helper Functions

#### `generateSitemap(routes: string[], baseUrl?: string): string`

Generate sitemap.xml content.

#### `generateRobots(allowAll?: boolean, disallowPaths?: string[]): string`

Generate robots.txt content.

#### `expandDynamicRoute(route: string, params: string[]): string[]`

Expand dynamic routes.

```typescript
const routes = expandDynamicRoute("/user/[id]", ["1", "2", "3"]);
// => ["/user/1", "/user/2", "/user/3"]
```

### Type Definitions

#### `Engine`

Supported engines:

```typescript
type Engine = "react" | "preact" | "view";
```

#### `Metadata`

Metadata definition:

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

Context for load method:

```typescript
interface LoadContext {
  url: string;
  params: Record<string, string>;
  request?: Request;
  [key: string]: unknown;
}
```

#### `LayoutComponent`

Layout component:

```typescript
interface LayoutComponent {
  component: unknown;
  props?: Record<string, unknown>;
  skip?: boolean;
}
```

#### `ScriptDefinition`

Script definition:

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

### Client Type Definitions

> **Import**: `@dreamer/render/client`

#### `ErrorHandler` (client)

Client error handling:

```typescript
interface ErrorHandler {
  // Error callback
  onError?: (
    error: Error,
    context: {
      engine: Engine;
      component: unknown;
      phase: "csr" | "hydrate";
    },
  ) => void | Promise<void>;
  // Fallback component
  fallbackComponent?: unknown;
  // Log error to console (default true)
  logError?: boolean;
}
```

#### `PerformanceOptions` (client)

Client performance options:

```typescript
interface PerformanceOptions {
  // Enable performance monitoring
  enabled?: boolean;
  // Metrics callback
  onMetrics?: (metrics: PerformanceMetrics) => void;
  // Slow render threshold in ms (default 100)
  slowThreshold?: number;
}
```

#### `PerformanceMetrics` (client)

Client performance metrics:

```typescript
interface PerformanceMetrics {
  // Render start time
  startTime: number;
  // Render end time
  endTime: number;
  // Duration in ms
  duration: number;
  // Engine used
  engine: Engine;
  // Phase
  phase: "csr" | "hydrate";
  // Is slow render
  isSlow?: boolean;
}
```

---

## ⚡ Performance

- **Streaming**: React, Preact, and View support streaming for faster first
  paint
- **Metadata cache**: Optional cache to reduce repeated computation
- **Data compression**: Reduce HTML size
- **Lazy data loading**: Optimize first-screen performance
- **Script priority**: Scripts sorted by priority
- **Performance monitoring**: Built-in render timing
- **Error handling**: Error capture and fallback

---

## 📊 Test Report

| Metric      | Value                 |
| ----------- | --------------------- |
| Test date   | 2026-02-17            |
| Total tests | 252                   |
| Passed      | 252 ✅                |
| Failed      | 0                     |
| Pass rate   | 100%                  |
| Duration    | ~46s (`deno test -A`) |

| Runtime | Version | Result        |
| ------- | ------- | ------------- |
| Deno    | 2.x+    | ✅ 252 passed |
| Bun     | 1.x+    | ✅ 252 passed |

See [TEST_REPORT.md](./docs/en-US/TEST_REPORT.md) for details.

---

## 📋 Changelog

**v1.1.2** (2026-03-21): **Changed** **@dreamer/view ^1.3.1**; View **mount fn +
`insert`** for SSR/CSR/hydrate (view v1.3). **Refactored** SSR via
**`@dreamer/view/ssr`**, hydrate via **`@dreamer/view/compiler`**. **Fixed**
local **`createReactiveRoot*`**, hydrate tests / **unmount** semantics.
**Note:** View **`SSROptions.options`** not forwarded. Full history:
[CHANGELOG.md](./docs/en-US/CHANGELOG.md).

---

## 📝 Notes

- **Server/client separation**: Use `/client` subpath for client code
- **Unified API**: Same API for server and client
- **Multi-engine**: React, Preact, or View
- **Type safety**: Full TypeScript support
- **Component exports**: `metadata`, `load`, `scripts`, `inheritLayout`
- **Metadata merge**: Deep merge; page metadata overrides layout
- **Data injection**: Auto-injected to `window.__DATA__`; access via
  `globalThis.__DATA__`
- **Layout system**: Single or nested layouts; `inheritLayout = false` to skip

---

## 🤝 Contributing

Issues and Pull Requests are welcome!

---

## 📄 License

Apache License 2.0 - see [LICENSE](./LICENSE)

---

<div align="center">

**Made with ❤️ by Dreamer Team**

</div>
