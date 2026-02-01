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
 * - 多引擎支持：React、Preact、Vue3
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

// 导入适配器
import * as preactAdapter from "./adapters/preact.ts";
import * as reactAdapter from "./adapters/react.ts";
import * as vue3Adapter from "./adapters/vue3.ts";

import type { CSROptions, CSRRenderResult, HydrationOptions } from "./types.ts";

/**
 * 客户端渲染函数
 *
 * 根据指定的模板引擎类型，调用对应的适配器进行客户端渲染。
 * 注意：此函数只能在浏览器环境中运行。
 *
 * @param options CSR 选项
 * @returns 渲染结果，包含卸载函数和更新函数
 * @throws 如果模板引擎不支持或不在浏览器环境
 *
 * @example
 * ```typescript
 * const result = renderCSR({
 *   engine: "preact",
 *   component: MyComponent,
 *   props: { name: "World" },
 *   container: "#app",
 * });
 *
 * // 卸载
 * result.unmount();
 *
 * // 更新属性
 * result.update?.({ name: "New World" });
 * ```
 */
export function renderCSR(options: CSROptions): CSRRenderResult {
  const { engine } = options;

  // 检查是否在浏览器环境
  if (typeof globalThis.document === "undefined") {
    throw new Error("CSR 渲染只能在浏览器环境中运行");
  }

  switch (engine) {
    case "preact": {
      return preactAdapter.renderCSR(options);
    }
    case "react": {
      return reactAdapter.renderCSR(options);
    }
    case "vue3": {
      return vue3Adapter.renderCSR(options);
    }
    default: {
      const _exhaustive: never = engine;
      throw new Error(`不支持的模板引擎: ${engine}`);
    }
  }
}

/**
 * Hydration 函数
 *
 * 激活服务端渲染的 HTML，使其成为可交互的客户端应用。
 * 注意：此函数只能在浏览器环境中运行。
 *
 * @param options Hydration 选项
 * @returns 渲染结果，包含卸载函数和更新函数
 * @throws 如果模板引擎不支持或不在浏览器环境
 *
 * @example
 * ```typescript
 * const result = hydrate({
 *   engine: "preact",
 *   component: MyComponent,
 *   props: serverData,
 *   container: "#app",
 * });
 * ```
 */
export function hydrate(options: HydrationOptions): CSRRenderResult {
  const { engine } = options;

  // 检查是否在浏览器环境
  if (typeof globalThis.document === "undefined") {
    throw new Error("Hydration 只能在浏览器环境中运行");
  }

  switch (engine) {
    case "preact": {
      return preactAdapter.hydrate(options);
    }
    case "react": {
      return reactAdapter.hydrate(options);
    }
    case "vue3": {
      return vue3Adapter.hydrate(options);
    }
    default: {
      const _exhaustive: never = engine;
      throw new Error(`不支持的模板引擎: ${engine}`);
    }
  }
}
