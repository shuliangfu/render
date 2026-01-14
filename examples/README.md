# @dreamer/render 使用示例

本目录包含了 `@dreamer/render` 库的各种使用示例，涵盖了从基础到高级的所有功能。

## 📁 示例结构

```
examples/
├── README.md                    # 本文件
├── ssr-basic/                   # SSR 基础示例
│   ├── react.ts                # React SSR 示例
│   ├── preact.ts               # Preact SSR 示例
│   └── vue3.ts                 # Vue3 SSR 示例
├── ssr-advanced/                # SSR 高级功能示例
│   ├── metadata-and-data.ts    # 元数据管理和数据注入
│   ├── layouts.ts              # 布局系统
│   ├── scripts.ts              # 脚本注入
│   └── performance.ts         # 性能监控
├── csr-basic/                   # CSR 基础示例
│   └── react.ts                # React CSR 示例
├── hydrate-basic/              # Hydration 基础示例
│   └── react.ts                # React Hydration 示例
├── ssg-basic/                   # SSG 基础示例
│   └── simple.ts               # 简单 SSG 示例
├── ssg-advanced/               # SSG 高级功能示例
│   └── dynamic-routes.ts       # 动态路由处理
└── full-stack-app/             # 完整全栈应用示例
    ├── server.ts               # 服务端代码
    └── client.ts               # 客户端代码
```

## 🚀 快速开始

### 运行 SSR 示例

```bash
# React SSR
deno run -A examples/ssr-basic/react.ts

# Preact SSR
deno run -A examples/ssr-basic/preact.ts

# Vue3 SSR
deno run -A examples/ssr-basic/vue3.ts
```

### 运行 SSG 示例

```bash
# 简单 SSG
deno run -A examples/ssg-basic/simple.ts

# 动态路由 SSG
deno run -A examples/ssg-advanced/dynamic-routes.ts
```

### 运行高级功能示例

```bash
# 元数据管理和数据注入
deno run -A examples/ssr-advanced/metadata-and-data.ts

# 布局系统
deno run -A examples/ssr-advanced/layouts.ts

# 脚本注入
deno run -A examples/ssr-advanced/scripts.ts

# 性能监控
deno run -A examples/ssr-advanced/performance.ts
```

## 📚 示例说明

### 基础示例

#### SSR 基础示例 (`ssr-basic/`)

演示如何使用 `renderSSR` 进行服务端渲染，包含 React、Preact 和 Vue3 三个版本的示例。

**关键特性**：
- 基础组件渲染
- HTML 模板使用
- 组件属性传递

#### CSR 基础示例 (`csr-basic/`)

演示如何在浏览器中使用 `renderCSR` 进行客户端渲染。

**注意**：此示例需要在浏览器环境中运行，在 Node.js/Deno/Bun 环境中会抛出错误。

#### Hydration 基础示例 (`hydrate-basic/`)

演示如何使用 `hydrate` 进行水合，将 SSR 生成的 HTML 与客户端 JS 连接。

**注意**：此示例需要在浏览器环境中运行，通常与 SSR 配合使用。

#### SSG 基础示例 (`ssg-basic/`)

演示如何使用 `renderSSG` 生成静态 HTML 文件。

**关键特性**：
- 多路由生成
- Sitemap 生成
- Robots.txt 生成

### 高级示例

#### 元数据管理和数据注入 (`ssr-advanced/metadata-and-data.ts`)

演示如何使用 `metadata` 和 `load` 方法：
- 定义静态或动态元数据
- 使用 `load` 方法加载服务端数据
- 数据自动注入到 `window.__DATA__`

**关键代码**：
```typescript
// 定义元数据
(Page as any).metadata = {
  title: "用户页面",
  description: "这是一个用户信息页面",
};

// 定义 load 方法
(Page as any).load = async (context: LoadContext) => {
  return {
    title: "用户信息",
    user: { name: "John", email: "john@example.com" },
  };
};
```

#### 布局系统 (`ssr-advanced/layouts.ts`)

演示如何使用多层嵌套布局：
- 定义多个布局组件
- 从外到内的布局嵌套
- 布局属性传递

**关键代码**：
```typescript
const layouts: LayoutComponent[] = [
  { component: OuterLayout, props: {} },
  { component: InnerLayout, props: {} },
];
```

#### 脚本注入 (`ssr-advanced/scripts.ts`)

演示如何提取和注入客户端脚本：
- 从组件中提取脚本
- 通过选项注入脚本
- 脚本优先级和异步加载

**关键代码**：
```typescript
// 组件脚本
(Page as any).scripts = [
  { src: "/js/main.js", async: true, priority: 1 },
  { content: "console.log('内联脚本');", priority: 2 },
];
```

#### 性能监控 (`ssr-advanced/performance.ts`)

演示如何使用性能监控功能：
- 启用性能监控
- 获取渲染时间指标
- 性能回调函数

**关键代码**：
```typescript
performance: {
  enabled: true,
  onMetrics: (metrics) => {
    console.log(`渲染耗时: ${metrics.duration}ms`);
  },
}
```

### SSG 高级示例

#### 动态路由 (`ssg-advanced/dynamic-routes.ts`)

演示如何处理动态路由：
- 使用 `expandDynamicRoute` 展开动态路由
- 路由参数处理
- 路由特定数据加载

**关键代码**：
```typescript
const routes = expandDynamicRoute("/user/[id]", ["1", "2", "3"]);
// => ["/user/1", "/user/2", "/user/3"]
```

### 完整应用示例

#### 全栈应用 (`full-stack-app/`)

演示如何结合 SSR 和 Hydration 构建完整的全栈应用：
- 服务端使用 SSR 渲染
- 客户端使用 Hydration 恢复交互性
- 数据从服务端注入到客户端

## ⚠️ 注意事项

1. **运行环境**：
   - SSR 和 SSG 示例可以在 Deno/Bun 环境中运行
   - CSR 和 Hydration 示例需要在浏览器环境中运行

2. **路径问题**：
   - 所有示例使用相对路径导入（`../../src/mod.ts`）
   - 确保在项目根目录运行示例

3. **类型安全**：
   - 某些示例使用 `as any` 来添加动态属性（如 `metadata`、`load`）
   - 这是为了演示目的，实际项目中可以使用类型声明

4. **依赖安装**：
   - 确保已安装所有必要的依赖（React、Preact、Vue3 等）
   - 这些依赖在 `deno.json` 中已配置

## 🔗 相关文档

- [README.md](../README.md) - 库的主要文档
- [TEST_REPORT.md](../TEST_REPORT.md) - 测试报告
- [docs/](../docs/) - 详细功能文档

## 💡 更多示例

如果你需要更多示例或有问题，请查看：
- 测试文件 (`tests/`) - 包含大量实际使用场景
- 源代码 (`src/`) - 包含详细的 JSDoc 注释
