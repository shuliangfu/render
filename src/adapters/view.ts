/**
 * View 服务端渲染适配器
 *
 * 提供 @dreamer/view 模板引擎的 SSR 功能，支持布局组合、流式渲染（renderToStream）、
 * 错误处理与性能监控。与 React/Preact 适配器共用同一套 SSROptions。
 *
 * 注意：客户端 CSR 和 Hydration 在 @dreamer/render/client 的 view 适配器中。
 */

import { insert, type VNode } from "@dreamer/view";
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
    component as VNode["type"],
    { ...rest, children: child },
    undefined,
  );
}

/**
 * View 流式渲染：使用 renderToStream 生成器，读完后拼接为字符串
 * （与 Preact 适配器行为一致，便于 injectMultiple 等后续处理）。
 */
async function viewStreamToHtml(fn: () => VNode): Promise<string> {
  /** renderToStream 的 container 与 insert 父节点在运行时为同一 SSR 文档模型；断言避免 JSR 与 node 双份类型冲突 */
  type InsertParent = Parameters<typeof insert>[0];
  const gen = renderToStream(
    (container) => insert(container as InsertParent, fn),
    {},
  );
  const chunks: string[] = [];
  for await (const chunk of gen) {
    chunks.push(chunk);
  }
  return chunks.join("");
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

    const rootFn = () => rootVNode;
    /** renderToString 要求 (container: SSRElement)=>void；与 insert 父节点一致，断言消除双解析路径下的类型不兼容 */
    type InsertParent = Parameters<typeof insert>[0];
    const mountFn = (container: InsertParent) => insert(container, rootFn);

    let html: string;
    if (stream) {
      html = await viewStreamToHtml(rootFn);
    } else {
      html = renderToString(
        mountFn as Parameters<typeof renderToString>[0],
        {},
      );
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
