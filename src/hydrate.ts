/**
 * 水合（Hydration）核心函数
 */

import * as preactAdapter from "./adapters/preact.ts";
import * as reactAdapter from "./adapters/react.ts";
import * as vue3Adapter from "./adapters/vue3.ts";
import { renderCSR } from "./csr.ts";
import type { HydrationOptions } from "./types.ts";
import { handleRenderError } from "./utils/error-handler.ts";
import {
  createPerformanceMonitor,
  recordPerformanceMetrics,
} from "./utils/performance.ts";

/**
 * 水合函数
 *
 * 将 SSR 生成的 HTML 与客户端 JS 连接，恢复交互性
 * 注意：此函数只能在浏览器环境中运行
 *
 * @param options 水合选项
 * @throws 如果模板引擎不支持、水合失败或不在浏览器环境
 *
 * @example
 * ```typescript
 * await hydrate({
 *   engine: "react",
 *   component: MyComponent,
 *   props: { name: "World" },
 *   container: "#app",
 *   strictMode: true
 * });
 * ```
 */
export function hydrate(options: HydrationOptions): void {
  const { engine } = options;

  // 检查是否在浏览器环境
  if (typeof globalThis.document === "undefined") {
    throw new Error("水合只能在浏览器环境中运行");
  }

  // 性能监控
  const perfMonitor = createPerformanceMonitor(options.performance);
  if (perfMonitor) {
    perfMonitor.start(engine, "hydrate");
  }

  try {
    switch (engine) {
      case "react": {
        reactAdapter.hydrate(options);
        break;
      }
      case "preact": {
        preactAdapter.hydrate(options);
        break;
      }
      case "vue3": {
        vue3Adapter.hydrate(options);
        break;
      }
      default: {
        // TypeScript 会确保所有情况都被处理
        const _exhaustive: never = engine;
        throw new Error(`不支持的模板引擎: ${engine}`);
      }
    }

    // 注册 renderCSR 和渲染数据到全局变量（供 HMR 使用）
    // 注意：只在浏览器环境中注册
    if (typeof globalThis !== "undefined") {
      // 注册 renderCSR 函数（如果还没有注册）
      if (typeof (globalThis as any).__RENDER_CSR__ === "undefined") {
        (globalThis as any).__RENDER_CSR__ = renderCSR;
      }

      // 准备 LoadContext（从 window.__DATA__ 获取或使用默认值）
      // 注意：HydrationOptions 没有 loadContext，所以从 window.__DATA__ 获取
      const context = (() => {
        // 尝试从 window.__DATA__ 获取路由信息
        const data = (globalThis as any).__DATA__;
        if (data) {
          return {
            url: data.url || globalThis.location?.href || "/",
            params: data.params || {},
          };
        }
        // 如果没有数据，使用默认值
        return {
          url: globalThis.location?.href || "/",
          params: {},
        };
      })();

      // 注册渲染数据（用于 HMR 重新渲染）
      // 包含渲染所需的配置信息：engine, component, props, layouts, container 等
      (globalThis as any).__RENDER_DATA__ = {
        engine: options.engine,
        component: options.component,
        props: options.props || {},
        layouts: options.layouts || [],
        container: options.container || "#app",
        skipLayouts: options.skipLayouts || false,
        loadContext: context,
      };
    }

    // 结束性能监控
    if (perfMonitor) {
      const metrics = perfMonitor.end();
      recordPerformanceMetrics(metrics, options.performance);
    }
  } catch (error) {
    // 处理错误
    handleRenderError(
      error,
      { engine, component: options.component, phase: "hydrate" },
      options.errorHandler,
    );

    throw new Error(
      `水合失败 (${engine}): ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}
