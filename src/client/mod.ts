/**
 * @module @dreamer/render/client
 *
 * 客户端渲染库
 *
 * 提供浏览器端的 CSR 和 Hydration 功能。
 * 不依赖任何服务端模块，可安全在浏览器中使用。
 *
 * 功能特性：
 * - 客户端渲染（CSR）：将组件渲染到 DOM
 * - Hydration：激活服务端渲染的 HTML
 * - 布局组合：支持嵌套布局
 * - 多引擎支持：React、Preact
 *
 * @example
 * ```typescript
 * import { renderCSR, hydrate } from "@dreamer/render/client";
 *
 * // 客户端渲染
 * const result = renderCSR({
 *   engine: "preact",
 *   component: MyComponent,
 *   props: { name: "World" },
 *   container: "#app",
 * });
 *
 * // 后续可以卸载
 * result.unmount();
 *
 * // 或者更新属性
 * result.update?.({ name: "New World" });
 * ```
 */

// 导出类型
export type {
  CSROptions,
  CSRRenderResult,
  Engine,
  ErrorHandler,
  HydrationOptions,
  LayoutComponent,
  PerformanceMetrics,
  PerformanceOptions,
} from "./types.ts";

// 导出工具函数（供高级用法）
export {
  handleRenderError,
  renderErrorFallback,
} from "./utils/error-handler.ts";
export {
  createPerformanceMonitor,
  PerformanceMonitor,
  recordPerformanceMetrics,
} from "./utils/performance.ts";

import type { CSROptions, CSRRenderResult, HydrationOptions } from "./types.ts";

/** 按 engine 动态加载客户端适配器 */
async function loadClientAdapter(engine: "react" | "preact" | "view") {
  switch (engine) {
    case "react":
      return await import("./adapters/react.ts");
    case "preact":
      return await import("./adapters/preact.ts");
    case "view":
      return await import("./adapters/view.ts");
    default: {
      const _: never = engine;
      throw new Error(`Unsupported template engine: ${engine}`);
    }
  }
}

/**
 * 客户端渲染函数
 *
 * 根据指定的模板引擎类型，调用对应适配器进行客户端渲染。
 * 注意：此函数只能在浏览器环境中运行。
 *
 * @param options CSR 选项
 * @returns 渲染结果的 Promise，包含卸载函数和更新函数
 * @throws 如果模板引擎不支持或不在浏览器环境
 *
 * @example
 * ```typescript
 * const result = await renderCSR({
 *   engine: "preact",
 *   component: MyComponent,
 *   props: { name: "World" },
 *   container: "#app",
 * });
 * result.unmount();
 * ```
 */
export async function renderCSR(options: CSROptions): Promise<CSRRenderResult> {
  const { engine } = options;

  if (typeof globalThis.document === "undefined") {
    throw new Error("CSR render must run in browser environment");
  }

  const adapter = await loadClientAdapter(engine);
  return adapter.renderCSR(options);
}

/**
 * Hydration 函数
 *
 * 激活服务端渲染的 HTML，使其成为可交互的客户端应用。
 * 注意：此函数只能在浏览器环境中运行。
 *
 * @param options Hydration 选项
 * @returns 渲染结果的 Promise，包含卸载函数和更新函数
 * @throws 如果模板引擎不支持或不在浏览器环境
 *
 * @example
 * ```typescript
 * const result = await hydrate({
 *   engine: "preact",
 *   component: MyComponent,
 *   props: serverData,
 *   container: "#app",
 * });
 * ```
 */
export async function hydrate(
  options: HydrationOptions,
): Promise<CSRRenderResult> {
  const { engine } = options;

  if (typeof globalThis.document === "undefined") {
    throw new Error("Hydration must run in browser environment");
  }

  const adapter = await loadClientAdapter(engine);
  return adapter.hydrate(options);
}
