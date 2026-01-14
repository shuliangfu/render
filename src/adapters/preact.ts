/**
 * Preact 渲染适配器
 *
 * 提供 Preact 模板引擎的 SSR、CSR 和 Hydration 功能
 * 支持流式渲染、错误处理、性能监控等所有功能
 */

import { createElement, render } from "preact";
import { renderToString } from "preact-render-to-string";
import type {
  CSROptions,
  CSRRenderResult,
  HydrationOptions,
  RenderResult,
  SSROptions,
} from "../types.ts";
import { handleRenderError } from "../utils/error-handler.ts";
import {
  composeLayouts,
  createComponentTree,
  shouldSkipLayouts,
} from "../utils/layout.ts";
import { injectComponentHtml } from "../utils/html-inject.ts";
import {
  createPerformanceMonitor,
  recordPerformanceMetrics,
} from "../utils/performance.ts";

/**
 * Preact 流式渲染器
 *
 * 将组件渲染为 ReadableStream，支持流式输出
 */
async function renderToStream(element: any): Promise<string> {
  // Preact 没有官方的流式渲染 API，我们实现一个简单的流式渲染器
  // 通过分块渲染来模拟流式输出

  // 先渲染整个组件
  const fullHtml = renderToString(element);

  // 创建一个 ReadableStream 来模拟流式输出
  const stream = new ReadableStream({
    start(controller) {
      // 将 HTML 分成多个块（每 1024 字符一块）
      const chunkSize = 1024;
      let offset = 0;

      const pushChunk = () => {
        if (offset < fullHtml.length) {
          const chunk = fullHtml.slice(offset, offset + chunkSize);
          controller.enqueue(new TextEncoder().encode(chunk));
          offset += chunkSize;
          // 使用微任务来异步推送下一个块
          Promise.resolve().then(pushChunk);
        } else {
          controller.close();
        }
      };

      pushChunk();
    },
  });

  // 读取整个流并转换为字符串
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }

  // 将流转换为字符串
  const decoder = new TextDecoder();
  return chunks.map((chunk) => decoder.decode(chunk)).join("");
}

/**
 * Preact 服务端渲染
 *
 * @param options SSR 选项
 * @returns 渲染结果
 */
export async function renderSSR(options: SSROptions): Promise<RenderResult> {
  const {
    component,
    props = {},
    layouts,
    skipLayouts,
    template,
    stream = false,
    errorHandler,
    performance: perfOptions,
  } = options;

  // 性能监控
  const perfMonitor = createPerformanceMonitor(perfOptions);
  if (perfMonitor) {
    perfMonitor.start("preact", "ssr");
  }

  try {
    // 检查组件是否导出了 layout = false
    const shouldSkip = skipLayouts || shouldSkipLayouts(component);

    // 组合布局和组件
    const componentConfig = layouts && layouts.length > 0 && !shouldSkip
      ? composeLayouts("preact", component, props, layouts, shouldSkip)
      : { component, props };

    // 创建 Preact 元素树
    const element = createComponentTree(
      (comp: unknown, props: unknown, ...children: unknown[]) =>
        createElement(comp as any, props as any, ...(children as any[])),
      componentConfig as { component: unknown; props: Record<string, unknown> },
    ) as any;

    // 渲染为字符串（支持流式渲染）
    let html: string;
    if (stream) {
      html = await renderToStream(element);
    } else {
      html = renderToString(element);
    }

    // 如果有模板，自动注入组件 HTML
    let finalHtml = html;
    if (template) {
      finalHtml = injectComponentHtml(template, html);
    }

    // 结束性能监控
    let performanceMetrics;
    if (perfMonitor) {
      performanceMetrics = perfMonitor.end();
      recordPerformanceMetrics(performanceMetrics, perfOptions);
    }

    return {
      html: finalHtml,
      styles: [],
      scripts: [],
      renderInfo: {
        engine: "preact",
        stream,
      },
      performance: performanceMetrics,
    };
  } catch (error) {
    // 处理错误
    const shouldContinue = await handleRenderError(
      error,
      { engine: "preact", component, phase: "ssr" },
      errorHandler,
    );

    if (shouldContinue && errorHandler?.fallbackComponent) {
      // 使用降级组件重新渲染
      try {
        const fallbackOptions = {
          ...options,
          component: errorHandler.fallbackComponent,
        };
        return await renderSSR(fallbackOptions);
      } catch (_fallbackError) {
        // 降级渲染也失败，抛出错误
        throw new Error(
          `Preact SSR 渲染失败（包括降级组件）: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    throw error;
  }
}

/**
 * Preact 客户端渲染
 *
 * @param options CSR 选项
 * @returns 渲染结果，包含卸载函数
 */
export function renderCSR(options: CSROptions): CSRRenderResult {
  const {
    component,
    props = {},
    layouts,
    skipLayouts,
    container,
    errorHandler,
    performance: perfOptions,
  } = options;

  // 性能监控
  const perfMonitor = createPerformanceMonitor(perfOptions);
  if (perfMonitor) {
    perfMonitor.start("preact", "csr");
  }

  try {
    // 获取容器元素
    const containerElement = typeof container === "string"
      ? document.querySelector(container) as HTMLElement
      : container;

    if (!containerElement) {
      throw new Error(`容器元素未找到: ${container}`);
    }

    // 清空容器（如果已有内容）
    containerElement.innerHTML = "";

    // 检查组件是否导出了 layout = false
    const shouldSkip = skipLayouts || shouldSkipLayouts(component);

    // 组合布局和组件
    const componentConfig = layouts && layouts.length > 0 && !shouldSkip
      ? composeLayouts("preact", component, props, layouts, shouldSkip)
      : { component, props };

    // 创建 Preact 元素树
    const element = createComponentTree(
      (comp: unknown, props: unknown, ...children: unknown[]) =>
        createElement(comp as any, props as any, ...(children as any[])),
      componentConfig as { component: unknown; props: Record<string, unknown> },
    ) as any;

    render(element, containerElement);

    // 结束性能监控
    if (perfMonitor) {
      const metrics = perfMonitor.end();
      recordPerformanceMetrics(metrics, perfOptions);
    }

    // 返回卸载函数和更新函数
    return {
      unmount: () => {
        render(null, containerElement);
      },
      update: (newProps: Record<string, unknown>) => {
        const newElement = createElement(component as any, newProps);
        render(newElement, containerElement);
      },
      instance: containerElement,
    };
  } catch (error) {
    // 处理错误
    handleRenderError(
      error,
      { engine: "preact", component, phase: "csr" },
      errorHandler,
    );

    throw new Error(
      `Preact CSR 渲染失败: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

/**
 * Preact 水合
 *
 * @param options 水合选项
 */
export function hydrate(options: HydrationOptions): void {
  const {
    component,
    props = {},
    layouts,
    skipLayouts,
    container,
    errorHandler,
    performance: perfOptions,
  } = options;

  // 性能监控
  const perfMonitor = createPerformanceMonitor(perfOptions);
  if (perfMonitor) {
    perfMonitor.start("preact", "hydrate");
  }

  try {
    // 获取容器元素
    const containerElement = typeof container === "string"
      ? document.querySelector(container) as HTMLElement
      : container;

    if (!containerElement) {
      throw new Error(`容器元素未找到: ${container}`);
    }

    // 检查组件是否导出了 layout = false
    const shouldSkip = skipLayouts || shouldSkipLayouts(component);

    // 组合布局和组件
    const componentConfig = layouts && layouts.length > 0 && !shouldSkip
      ? composeLayouts("preact", component, props, layouts, shouldSkip)
      : { component, props };

    // 创建 Preact 元素树
    const element = createComponentTree(
      (comp: unknown, props: unknown, ...children: unknown[]) =>
        createElement(comp as any, props as any, ...(children as any[])),
      componentConfig as { component: unknown; props: Record<string, unknown> },
    ) as any;

    // Preact 的水合使用 render，它会自动检测是否需要水合
    render(element, containerElement);

    // 结束性能监控
    if (perfMonitor) {
      const metrics = perfMonitor.end();
      recordPerformanceMetrics(metrics, perfOptions);
    }
  } catch (error) {
    // 处理错误
    handleRenderError(
      error,
      { engine: "preact", component, phase: "hydrate" },
      errorHandler,
    );

    throw new Error(
      `Preact 水合失败: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}
