/**
 * View 服务端渲染适配器
 *
 * 提供 @dreamer/view 模板引擎的 SSR 功能，支持布局组合、流式渲染（renderToStream）、
 * 错误处理与性能监控。与 React/Preact 适配器共用同一套 SSROptions。
 *
 * 注意：当前 view 的 `renderToString` / `renderToStream` 接收 `() => VNode`，不再传入 container；
 * 客户端 CSR 和 Hydration 在 @dreamer/render/client 的 view 适配器中。
 */

import type { JSXElementType, VNode } from "@dreamer/view";
import { renderToStream, renderToString } from "@dreamer/view/ssr";
import { jsx } from "@dreamer/view/jsx-runtime";
import type { RenderResult, SSROptions } from "../types.ts";
import { $tr, type Locale, setRenderLocale } from "../i18n.ts";
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
 * View 的“createElement”等价：用 jsx(type, props, key) 构建 VNode 树，
 * 供 createComponentTree 递归使用，与 React/Preact 的 createElement 签名一致。
 */
function viewCreateElement(
  component: unknown,
  props: unknown,
  ...children: unknown[]
): VNode {
  const rest = (props as Record<string, unknown>) ?? {};
  const child = children.length === 1
    ? children[0]
    : children.length > 1
    ? children
    : undefined;
  return jsx(
    component as JSXElementType,
    { ...rest, children: child },
    undefined,
  );
}

/**
 * 将 `renderToStream` 产出的 ReadableStream 解码为完整 HTML 字符串，
 * 便于与 `injectMultiple` 等非流式后续处理对齐。
 */
async function viewStreamToHtml(rootFn: () => VNode): Promise<string> {
  const stream = renderToStream(rootFn);
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let out = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) out += decoder.decode(value, { stream: true });
    }
    out += decoder.decode();
  } finally {
    reader.releaseLock();
  }
  return out;
}

function encodeTextStream(text: string): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      if (text.length > 0) controller.enqueue(encoder.encode(text));
      controller.close();
    },
  });
}

/** Concatenate ReadableStreams in order. */
function concatUint8Streams(
  streams: ReadableStream<Uint8Array>[],
): ReadableStream<Uint8Array> {
  return new ReadableStream({
    async start(controller) {
      try {
        for (const stream of streams) {
          const reader = stream.getReader();
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              if (value) controller.enqueue(value);
            }
          } finally {
            reader.releaseLock();
          }
        }
        controller.close();
      } catch (e) {
        controller.error(e);
      }
    },
  });
}

/**
 * Wrap component bytes with an HTML template (outlet or body insert).
 */
function wrapStreamWithTemplate(
  componentStream: ReadableStream<Uint8Array>,
  template: string,
): ReadableStream<Uint8Array> {
  if (template.includes("<!--ssr-outlet-->")) {
    const parts = template.split("<!--ssr-outlet-->");
    const prefix = parts[0] ?? "";
    const suffix = parts.slice(1).join("<!--ssr-outlet-->");
    return concatUint8Streams([
      encodeTextStream(prefix),
      componentStream,
      encodeTextStream(suffix),
    ]);
  }

  const bodyStartIndex = template.indexOf("<body>");
  const bodyEndIndex = template.indexOf("</body>");
  if (bodyStartIndex !== -1 && bodyEndIndex !== -1) {
    return concatUint8Streams([
      encodeTextStream(template.slice(0, bodyStartIndex + 6) + "\n  "),
      componentStream,
      encodeTextStream("\n" + template.slice(bodyEndIndex)),
    ]);
  }
  if (bodyEndIndex !== -1) {
    return concatUint8Streams([
      encodeTextStream(template.slice(0, bodyEndIndex) + "\n  "),
      componentStream,
      encodeTextStream("\n" + template.slice(bodyEndIndex)),
    ]);
  }
  return componentStream;
}

/** Undrained stream result from the view adapter. */
export interface ViewStreamRenderResult {
  body: ReadableStream<Uint8Array>;
  styles: string[];
  scripts: string[];
  renderInfo: { engine: "view"; stream: true };
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
 * View 服务端渲染
 *
 * @param options SSR 选项（engine 应为 "view"）
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

  if (locale) setRenderLocale(locale);

  debugLog(debug, "view", "start", {
    stream,
    layoutsCount: layouts == null ? 0 : layouts.length,
    skipLayouts,
    hasTemplate: !!template,
    componentType: component == null ? "null" : typeof component,
  });

  const perfMonitor = createPerformanceMonitor(perfOptions);
  if (perfMonitor) {
    perfMonitor.start("view", "ssr");
  }

  try {
    const shouldSkip = skipLayouts || shouldSkipLayouts(component);

    const componentConfig = layouts && layouts.length > 0 && !shouldSkip
      ? composeLayouts("view", component, props, layouts, shouldSkip)
      : { component, props };

    const configProps = (componentConfig as { props?: Record<string, unknown> })
      .props;
    debugLog(debug, "view", "after composeLayouts", {
      rootComponentName:
        typeof (componentConfig as { component: unknown }).component ===
            "function"
          ? ((componentConfig as { component: unknown }).component as {
            name?: string;
          }).name || "anonymous"
          : String((componentConfig as { component: unknown }).component),
      hasChildren: !!(configProps && configProps.children),
      layoutsCount: layouts == null ? 0 : layouts.length,
    });

    const rootVNode = createComponentTree(
      viewCreateElement,
      componentConfig as { component: unknown; props: Record<string, unknown> },
    ) as VNode;

    /** view SSR：无 container 回调，直接传入返回根 VNode 的函数 */
    const rootFn = () => rootVNode;

    let html: string;
    if (stream) {
      html = await viewStreamToHtml(rootFn);
    } else {
      html = renderToString(rootFn);
    }

    debugLog(debug, "view", "renderToString complete", {
      htmlLength: html?.length ?? 0,
    });

    let finalHtml = html;
    if (template) {
      finalHtml = injectComponentHtml(template, html);
    }

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
        engine: "view",
        stream,
      },
      performance: performanceMetrics,
    };
  } catch (error) {
    const shouldContinue = await handleRenderError(
      error,
      { engine: "view", component, phase: "ssr" },
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
        throw new Error($tr("error.viewSsrFailed", { message }, locale));
      }
    }

    throw error;
  }
}

/**
 * View streaming SSR: return undrained `renderToStream` (optional template wrap).
 *
 * @param options SSR 选项（engine 应为 "view"）
 */
export async function renderSSRToStream(
  options: SSROptions,
): Promise<ViewStreamRenderResult> {
  const {
    component,
    props = {},
    layouts,
    skipLayouts,
    template,
    errorHandler,
    debug,
    lang,
  } = options;

  const locale = lang as Locale | undefined;
  if (locale) setRenderLocale(locale);

  debugLog(debug, "view", "start-stream", {
    layoutsCount: layouts == null ? 0 : layouts.length,
    skipLayouts,
    hasTemplate: !!template,
  });

  try {
    const shouldSkip = skipLayouts || shouldSkipLayouts(component);

    const componentConfig = layouts && layouts.length > 0 && !shouldSkip
      ? composeLayouts("view", component, props, layouts, shouldSkip)
      : { component, props };

    const rootVNode = createComponentTree(
      viewCreateElement,
      componentConfig as { component: unknown; props: Record<string, unknown> },
    ) as VNode;

    const rootFn = () => rootVNode;
    let body = renderToStream(rootFn);
    if (template) {
      body = wrapStreamWithTemplate(body, template);
    }

    return {
      body,
      styles: [],
      scripts: [],
      renderInfo: { engine: "view", stream: true },
    };
  } catch (error) {
    const shouldContinue = await handleRenderError(
      error,
      { engine: "view", component, phase: "ssr" },
      errorHandler,
      locale,
    );

    if (shouldContinue && errorHandler?.fallbackComponent) {
      try {
        return await renderSSRToStream({
          ...options,
          component: errorHandler.fallbackComponent,
        });
      } catch (_fallbackError) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error($tr("error.viewSsrFailed", { message }, locale));
      }
    }

    throw error;
  }
}
