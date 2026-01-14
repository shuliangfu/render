/**
 * React 渲染适配器
 *
 * 提供 React 模板引擎的 SSR、CSR 和 Hydration 功能
 */

import React from "react";
import * as ReactDOMClient from "react-dom/client";
import * as ReactDOMServer from "react-dom/server";
import type {
  CSROptions,
  CSRRenderResult,
  HydrationOptions,
  RenderResult,
  SSROptions,
} from "../types.ts";
import {
  composeLayouts,
  createComponentTree,
  shouldSkipLayouts,
} from "../utils/layout.ts";
import { injectComponentHtml } from "../utils/html-inject.ts";

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
  } = options;

  // 检查组件是否导出了 layout = false
  const shouldSkip = skipLayouts || shouldSkipLayouts(component);

  // 组合布局和组件
  const componentConfig = layouts && layouts.length > 0 && !shouldSkip
    ? composeLayouts("react", component, props, layouts, shouldSkip)
    : { component, props };

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
      const readableStream = await ReactDOMServer.renderToReadableStream(element);
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
    } catch (error) {
      // 如果流式渲染失败，降级为字符串渲染
      html = ReactDOMServer.renderToString(element);
    }
  } else {
    // 字符串渲染
    html = ReactDOMServer.renderToString(element);
  }

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

/**
 * React 客户端渲染
 *
 * @param options CSR 选项
 * @returns 渲染结果，包含卸载函数
 */
export function renderCSR(options: CSROptions): CSRRenderResult {
  const { component, props = {}, layouts, skipLayouts, container } = options;

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
    ? composeLayouts("react", component, props, layouts, shouldSkip)
    : { component, props };

  // 创建 React 元素树
  const element = createComponentTree(
    React.createElement,
    componentConfig as { component: unknown; props: Record<string, unknown> },
  );

  // 创建根并渲染
  const root = ReactDOMClient.createRoot(containerElement);
  root.render(element);

  // 返回卸载函数和更新函数
  return {
    unmount: () => {
      root.unmount();
    },
    update: (newProps: Record<string, unknown>) => {
      const newElement = React.createElement(component as any, newProps);
      root.render(newElement);
    },
    instance: root,
  };
}

/**
 * React 水合
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
    strictMode = false,
  } = options;

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
    ? composeLayouts("react", component, props, layouts, shouldSkip)
    : { component, props };

  // 创建 React 元素树
  let element = createComponentTree(
    React.createElement,
    componentConfig as { component: unknown; props: Record<string, unknown> },
  );

  // 如果启用严格模式，包装在 StrictMode 中
  if (strictMode) {
    const StrictMode = React.StrictMode;
    element = React.createElement(StrictMode, null, element);
  }

  // 水合
  ReactDOMClient.hydrateRoot(containerElement, element);
}
