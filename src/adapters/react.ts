/**
 * React 服务端渲染适配器
 *
 * 仅提供 React 模板引擎的 SSR 功能
 *
 * 注意：客户端渲染（CSR）和 Hydration 已移至 @dreamer/render/client
 */

import React from "react";
import * as ReactDOMServer from "react-dom/server";
import type { RenderResult, SSROptions } from "../types.ts";
import { injectComponentHtml } from "../utils/html-inject.ts";
import {
  composeLayouts,
  createComponentTree,
  shouldSkipLayouts,
} from "../utils/layout.ts";
import { type Locale, setRenderLocale } from "../i18n.ts";

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
 * React 服务端渲染
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
    debug,
    lang,
  } = options;

  const locale = lang as Locale | undefined;

  if (locale) setRenderLocale(locale);

  debugLog(debug, "react", "start", {
    stream,
    layoutsCount: layouts?.length ?? 0,
    skipLayouts,
    hasTemplate: !!template,
    componentType: component == null ? "null" : typeof component,
  });

  // 检查组件是否导出了 inheritLayout = false
  const shouldSkip = skipLayouts || shouldSkipLayouts(component);

  // 组合布局和组件
  const componentConfig = layouts && layouts.length > 0 && !shouldSkip
    ? composeLayouts("react", component, props, layouts, shouldSkip)
    : { component, props };

  debugLog(debug, "react", "before renderToString", {
    shouldSkip,
    hasLayouts: !!(layouts?.length),
  });

  // 创建 React 元素树
  const element = createComponentTree(
    React.createElement,
    componentConfig as { component: unknown; props: Record<string, unknown> },
  );

  let html: string;
  const styles: string[] = [];
  const scripts: string[] = [];

  if (stream) {
    // 流式渲染（使用 renderToReadableStream）
    // 注意：renderToReadableStream 可能返回 Promise，需要 await
    try {
      const readableStream = await ReactDOMServer.renderToReadableStream(
        element,
      );
      // 确保 readableStream 有 getReader 方法
      if (readableStream && typeof readableStream.getReader === "function") {
        const reader = readableStream.getReader();
        const chunks: Uint8Array[] = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
        }

        // 将流转换为字符串
        const decoder = new TextDecoder();
        html = chunks.map((chunk) => decoder.decode(chunk)).join("");
      } else {
        // 如果不支持流式渲染，降级为字符串渲染
        html = ReactDOMServer.renderToString(element);
      }
    } catch (_error) {
      // 如果流式渲染失败，降级为字符串渲染
      html = ReactDOMServer.renderToString(element);
    }
  } else {
    // 字符串渲染
    html = ReactDOMServer.renderToString(element);
  }

  debugLog(debug, "react", "renderToString complete", {
    htmlLength: html?.length ?? 0,
  });

  // 如果有模板，自动注入组件 HTML
  if (template) {
    html = injectComponentHtml(template, html);
  }

  return {
    html,
    styles,
    scripts,
    renderInfo: {
      engine: "react",
      stream,
    },
  };
}
