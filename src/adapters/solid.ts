/**
 * Solid 服务端渲染适配器
 *
 * 提供 Solid.js 模板引擎的 SSR 功能。
 * Solid 使用 renderToString(fn) 接口，fn 为返回根组件的函数。
 * 支持流式渲染（模拟分块）、错误处理、性能监控。
 *
 * 服务端使用的路由组件须经 SSR 专用编译（如 dweb 的 solid-ssr-compile，generate: "ssr"），
 * 产出使用 escape/ssrElement 的代码；否则会触发 "Client-only API called on the server side"。
 * 本适配器直接使用 solid-js/web 的 server 构建提供的 renderToString。
 *
 * 客户端渲染（CSR）和 Hydration 在 @dreamer/render/client 的 solid 适配器中实现。
 */

import { type Component, createComponent } from "solid-js";
import type { RenderResult, SSROptions } from "../types.ts";

/** 缓存：动态加载的 solid-js/web（server 构建），避免重复加载 */
let solidWebModule: { renderToString: (fn: () => unknown) => string } | null =
  null;

async function getSolidWeb(): Promise<
  { renderToString: (fn: () => unknown) => string }
> {
  if (solidWebModule) return solidWebModule;
  solidWebModule = await import("solid-js/web");
  return solidWebModule;
}
import { handleRenderError } from "../utils/error-handler.ts";
import { injectComponentHtml } from "../utils/html-inject.ts";
import { composeLayouts, shouldSkipLayouts } from "../utils/layout.ts";
import {
  createPerformanceMonitor,
  recordPerformanceMetrics,
} from "../utils/performance.ts";

/**
 * 从布局 config 递归构建 Solid 组件树
 *
 * 与 React/Preact 的 createComponentTree 语义一致：children 为 { component, props } 时递归构建，
 * Solid 使用 createComponent(Comp, { ...restProps, get children() { return childNode } })。
 *
 * @param componentConfig 组件配置（composeLayouts 产出）
 * @returns Solid 的根节点（可传入 renderToString(() => node)）
 */
function buildSolidTree(componentConfig: {
  component: unknown;
  props: Record<string, unknown>;
}): unknown {
  const { component, props } = componentConfig;

  if (
    component == null ||
    (typeof component !== "function" && typeof component !== "object")
  ) {
    const actual = component === undefined ? "undefined" : typeof component;
    throw new Error(
      `buildSolidTree: invalid component (expected function or object, actual: ${actual})`,
    );
  }

  const { children: childrenConfig, ...restProps } = props;

  if (
    childrenConfig &&
    typeof childrenConfig === "object" &&
    "component" in childrenConfig &&
    "props" in childrenConfig
  ) {
    const childConfig = childrenConfig as {
      component: unknown;
      props: Record<string, unknown>;
    };
    if (childConfig.component) {
      const childNode = buildSolidTree(childConfig);
      return createComponent(component as Component<Record<string, unknown>>, {
        ...restProps,
        get children() {
          return childNode;
        },
      });
    }
  }

  return createComponent(
    component as Component<Record<string, unknown>>,
    restProps,
  );
}

/**
 * Solid 流式渲染（模拟）
 *
 * Solid 的 renderToStringAsync 为异步等待 Suspense，此处用分块输出模拟流式，
 * 与 Preact 适配器行为一致。使用 getSolidWeb() 获取 solid-js/web 的 renderToString。
 */
async function renderToStream(rootFn: () => unknown): Promise<string> {
  const { renderToString } = await getSolidWeb();
  const fullHtml = renderToString(rootFn);
  const stream = new ReadableStream({
    start(controller) {
      const chunkSize = 1024;
      let offset = 0;
      const pushChunk = () => {
        if (offset < fullHtml.length) {
          controller.enqueue(
            new TextEncoder().encode(
              fullHtml.slice(offset, offset + chunkSize),
            ),
          );
          offset += chunkSize;
          Promise.resolve().then(pushChunk);
        } else {
          controller.close();
        }
      };
      pushChunk();
    },
  });
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  return chunks.map((c) => new TextDecoder().decode(c)).join("");
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
 * Solid 服务端渲染
 *
 * @param options SSR 选项（engine 须为 "solid"）
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
  } = options;

  debugLog(debug, "solid", "start", {
    stream,
    layoutsCount: layouts?.length ?? 0,
    skipLayouts,
    hasTemplate: !!template,
    componentType: component == null ? "null" : typeof component,
  });

  const perfMonitor = createPerformanceMonitor(perfOptions);
  if (perfMonitor) {
    perfMonitor.start("solid", "ssr");
  }

  try {
    const shouldSkip = skipLayouts || shouldSkipLayouts(component);

    const componentConfig = layouts && layouts.length > 0 && !shouldSkip
      ? composeLayouts("solid", component, props, layouts, shouldSkip)
      : { component, props };

    debugLog(debug, "solid", "before renderToString", {
      shouldSkip,
      hasLayouts: !!(layouts?.length),
    });

    const config = componentConfig as {
      component: unknown;
      props: Record<string, unknown>;
    };
    const rootFn = () => buildSolidTree(config);

    let html: string;
    if (stream) {
      html = await renderToStream(rootFn);
    } else {
      const { renderToString } = await getSolidWeb();
      html = renderToString(rootFn);
    }

    debugLog(debug, "solid", "renderToString complete", {
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
      renderInfo: { engine: "solid", stream },
      performance: performanceMetrics,
    };
  } catch (error) {
    const shouldContinue = await handleRenderError(
      error,
      { engine: "solid", component, phase: "ssr" },
      errorHandler,
    );

    if (shouldContinue && errorHandler?.fallbackComponent) {
      try {
        const fallbackOptions = {
          ...options,
          component: errorHandler.fallbackComponent,
        };
        return await renderSSR(fallbackOptions);
      } catch (_fallbackError) {
        throw new Error(
          `Solid SSR 渲染失败（包括降级组件）: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    throw error;
  }
}
