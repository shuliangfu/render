/**
 * Preact 服务端渲染适配器
 *
 * 仅提供 Preact 模板引擎的 SSR 功能
 * 支持流式渲染、错误处理、性能监控等所有功能
 *
 * 注意：客户端渲染（CSR）和 Hydration 已移至 @dreamer/render/client
 */

import { createElement } from "preact";
import { renderToString } from "preact-render-to-string";
import type { RenderResult, SSROptions } from "../types.ts";
import { $tr, type Locale } from "../i18n.ts";
import { handleRenderError } from "../utils/error-handler.ts";
import { injectComponentHtml } from "../utils/html-inject.ts";
import {
  composeLayouts,
  createComponentTree,
  shouldSkipLayouts,
} from "../utils/layout.ts";
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
 * 调试日志：仅当 debug 为 true 时输出
 */
function debugLog(
  debug: boolean | undefined,
  prefix: string,
  ...args: unknown[]
): void {
  if (debug) {
    console.log(`[@dreamer/render:SSR:${prefix}]`, ...args);
  }
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
    debug,
    lang,
  } = options;

  const locale = lang as Locale | undefined;

  debugLog(debug, "preact", "start", {
    stream,
    layoutsCount: layouts?.length ?? 0,
    skipLayouts,
    hasTemplate: !!template,
    componentType: component == null ? "null" : typeof component,
  });

  // 性能监控
  const perfMonitor = createPerformanceMonitor(perfOptions);
  if (perfMonitor) {
    perfMonitor.start("preact", "ssr");
  }

  try {
    // 检查组件是否导出了 inheritLayout = false
    const shouldSkip = skipLayouts || shouldSkipLayouts(component);

    // 组合布局和组件
    const componentConfig = layouts && layouts.length > 0 && !shouldSkip
      ? composeLayouts("preact", component, props, layouts, shouldSkip)
      : { component, props };

    debugLog(debug, "preact", "after composeLayouts", {
      rootComponentName:
        typeof (componentConfig as any).component === "function"
          ? (componentConfig as any).component.name || "anonymous"
          : String((componentConfig as any).component),
      hasChildren: !!(componentConfig as any).props?.children,
      layoutsCount: layouts?.length ?? 0,
    });

    debugLog(debug, "preact", "before renderToString", {
      shouldSkip,
      hasLayouts: !!(layouts?.length),
    });

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

    debugLog(debug, "preact", "renderToString complete", {
      htmlLength: html?.length ?? 0,
    });

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
    const shouldContinue = await handleRenderError(
      error,
      { engine: "preact", component, phase: "ssr" },
      errorHandler,
      locale,
    );

    if (shouldContinue && errorHandler?.fallbackComponent) {
      try {
        const fallbackOptions = {
          ...options,
          component: errorHandler.fallbackComponent,
        };
        return await renderSSR(fallbackOptions);
      } catch (_fallbackError) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error($tr("error.preactSsrFailed", { message }, locale));
      }
    }

    throw error;
  }
}
