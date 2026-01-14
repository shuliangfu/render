/**
 * 客户端渲染（CSR）核心函数
 */

import * as preactAdapter from "./adapters/preact.ts";
import * as reactAdapter from "./adapters/react.ts";
import * as vue3Adapter from "./adapters/vue3.ts";
import type { CSROptions, CSRRenderResult } from "./types.ts";
import { mergeContextMetadata } from "./utils/context.ts";
import { handleRenderError } from "./utils/error-handler.ts";
import { applyMetadata } from "./utils/metadata-dom.ts";
import {
  extractMetadata,
  mergeMetadata,
  resolveMetadata,
} from "./utils/metadata.ts";
import {
  createPerformanceMonitor,
  recordPerformanceMetrics,
} from "./utils/performance.ts";

/**
 * 客户端渲染函数
 *
 * 根据指定的模板引擎类型，调用对应的适配器进行客户端渲染
 * 注意：此函数只能在浏览器环境中运行
 *
 * @param options CSR 选项
 * @returns 渲染结果，包含卸载函数和更新函数
 * @throws 如果模板引擎不支持、渲染失败或不在浏览器环境
 *
 * @example
 * ```typescript
 * const result = renderCSR({
 *   engine: "react",
 *   component: MyComponent,
 *   props: { name: "World" },
 *   container: "#app"
 * });
 *
 * // 后续可以卸载
 * result.unmount();
 *
 * // 或者更新属性（如果支持）
 * result.update?.({ name: "New World" });
 * ```
 */
export async function renderCSR(options: CSROptions): Promise<CSRRenderResult> {
  const { engine, loadContext } = options;

  // 检查是否在浏览器环境
  if (typeof globalThis.document === "undefined") {
    throw new Error("CSR 渲染只能在浏览器环境中运行");
  }

  // 性能监控
  const perfMonitor = createPerformanceMonitor(options.performance);
  if (perfMonitor) {
    perfMonitor.start(engine, "csr");
  }

  // 准备 LoadContext（如果没有提供，使用默认值）
  const context = loadContext || {
    url: globalThis.location?.href || "/",
    params: {},
  };

  // 收集元数据（类似 SSR）
  const layoutMetadataList: import("./types.ts").Metadata[] = [];

  // 遍历布局组件（从外到内）
  if (options.layouts && options.layouts.length > 0) {
    for (const layout of options.layouts) {
      const metadataValue = extractMetadata(layout.component);
      if (metadataValue) {
        const resolvedMetadata = await resolveMetadata(metadataValue, context);
        if (resolvedMetadata) {
          layoutMetadataList.push(resolvedMetadata);
        }
      }
    }
  }

  // 收集页面组件的元数据
  let pageMetadata: import("./types.ts").Metadata | null = null;
  const pageMetadataValue = extractMetadata(options.component);
  if (pageMetadataValue) {
    pageMetadata = await resolveMetadata(pageMetadataValue, context);
  }

  // 合并元数据（页面覆盖布局）
  let mergedMetadata = mergeMetadata(layoutMetadataList, pageMetadata);

  // 合并 Context 数据（如果提供）
  if (options.contextData) {
    mergedMetadata = mergeContextMetadata(mergedMetadata, options.contextData);
  }

  // 应用元数据到 DOM（集中更新 meta 标签）
  if (mergedMetadata && Object.keys(mergedMetadata).length > 0) {
    applyMetadata(mergedMetadata);
  }

  try {
    let result: CSRRenderResult;

    switch (engine) {
      case "react": {
        result = reactAdapter.renderCSR(options);
        break;
      }
      case "preact": {
        result = preactAdapter.renderCSR(options);
        break;
      }
      case "vue3": {
        result = vue3Adapter.renderCSR(options);
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

    return result;
  } catch (error) {
    // 处理错误
    handleRenderError(
      error,
      { engine, component: options.component, phase: "csr" },
      options.errorHandler,
    );

    throw new Error(
      `CSR 渲染失败 (${engine}): ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}
