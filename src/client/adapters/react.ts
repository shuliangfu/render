/**
 * React 客户端渲染适配器
 *
 * 仅包含浏览器端渲染功能（CSR、Hydration）
 * 支持错误处理、性能监控、布局组合
 */

import React from "react";
import { createRoot, hydrateRoot, type Root } from "react-dom/client";
import type {
  CSROptions,
  CSRRenderResult,
  HydrationOptions,
} from "../types.ts";
import {
  handleRenderError,
  renderErrorFallback,
} from "../utils/error-handler.ts";
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
 * React 客户端渲染
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
    perfMonitor.start("react", "csr");
  }

  // 获取容器元素
  const containerElement = typeof container === "string"
    ? document.querySelector(container) as HTMLElement
    : container;

  if (!containerElement) {
    throw new Error(`容器元素未找到: ${container}`);
  }

  // 创建 React Root
  let root: Root;

  try {
    // 清空容器（如果已有内容）
    containerElement.innerHTML = "";

    // 检查组件是否导出了 inheritLayout = false
    const shouldSkip = skipLayouts || shouldSkipLayouts(component);

    // 组合布局和组件
    const componentConfig = layouts && layouts.length > 0 && !shouldSkip
      ? composeLayouts("react", component, props, layouts, shouldSkip)
      : { component, props };

    // 创建 React 元素树
    const element = createComponentTree(
      (comp: unknown, props: unknown, ...children: unknown[]) =>
        React.createElement(comp as any, props as any, ...(children as any[])),
      componentConfig as { component: unknown; props: Record<string, unknown> },
    ) as React.ReactNode;

    // 使用 React 18 的 createRoot API
    root = createRoot(containerElement);
    root.render(element);

    // 结束性能监控
    let performanceMetrics;
    if (perfMonitor) {
      performanceMetrics = perfMonitor.end();
      recordPerformanceMetrics(performanceMetrics, perfOptions);
    }

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
      performance: performanceMetrics,
    };
  } catch (error) {
    // 处理错误
    handleRenderError(
      error,
      { engine: "react", component, phase: "csr" },
      errorHandler,
    ).then((shouldUseFallback) => {
      if (shouldUseFallback && errorHandler?.fallbackComponent) {
        // 使用降级组件
        try {
          containerElement.innerHTML = "";
          const fallbackRoot = createRoot(containerElement);
          const fallbackElement = React.createElement(
            errorHandler.fallbackComponent as any,
            { error },
          );
          fallbackRoot.render(fallbackElement);
        } catch {
          // 降级组件也失败，显示默认错误 UI
          renderErrorFallback(
            containerElement,
            error instanceof Error ? error : new Error(String(error)),
            "csr",
          );
        }
      } else {
        // 显示默认错误 UI
        renderErrorFallback(
          containerElement,
          error instanceof Error ? error : new Error(String(error)),
          "csr",
        );
      }
    });

    // 返回空的结果
    return {
      unmount: () => {
        containerElement.innerHTML = "";
      },
      instance: containerElement,
    };
  }
}

/**
 * React Hydration
 *
 * @param options Hydration 选项
 * @returns Hydration 结果
 */
export function hydrate(options: HydrationOptions): CSRRenderResult {
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
    perfMonitor.start("react", "hydrate");
  }

  // 获取容器元素
  const containerElement = typeof container === "string"
    ? document.querySelector(container) as HTMLElement
    : container;

  if (!containerElement) {
    throw new Error(`容器元素未找到: ${container}`);
  }

  // 创建 React Root
  let root: Root;

  try {
    // 检查组件是否导出了 inheritLayout = false
    const shouldSkip = skipLayouts || shouldSkipLayouts(component);

    // 组合布局和组件
    const componentConfig = layouts && layouts.length > 0 && !shouldSkip
      ? composeLayouts("react", component, props, layouts, shouldSkip)
      : { component, props };

    // 创建 React 元素树
    const element = createComponentTree(
      (comp: unknown, props: unknown, ...children: unknown[]) =>
        React.createElement(comp as any, props as any, ...(children as any[])),
      componentConfig as { component: unknown; props: Record<string, unknown> },
    ) as React.ReactNode;

    // 使用 React 18 的 hydrateRoot API
    root = hydrateRoot(containerElement, element);

    // 结束性能监控
    let performanceMetrics;
    if (perfMonitor) {
      performanceMetrics = perfMonitor.end();
      recordPerformanceMetrics(performanceMetrics, perfOptions);
    }

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
      performance: performanceMetrics,
    };
  } catch (error) {
    // 处理错误
    handleRenderError(
      error,
      { engine: "react", component, phase: "hydrate" },
      errorHandler,
    ).then((shouldUseFallback) => {
      if (shouldUseFallback && errorHandler?.fallbackComponent) {
        // 使用降级组件
        try {
          containerElement.innerHTML = "";
          const fallbackRoot = createRoot(containerElement);
          const fallbackElement = React.createElement(
            errorHandler.fallbackComponent as any,
            { error },
          );
          fallbackRoot.render(fallbackElement);
        } catch {
          // 降级组件也失败，显示默认错误 UI
          renderErrorFallback(
            containerElement,
            error instanceof Error ? error : new Error(String(error)),
            "hydrate",
          );
        }
      } else {
        // 显示默认错误 UI
        renderErrorFallback(
          containerElement,
          error instanceof Error ? error : new Error(String(error)),
          "hydrate",
        );
      }
    });

    // 返回空的结果
    return {
      unmount: () => {
        containerElement.innerHTML = "";
      },
      instance: containerElement,
    };
  }
}
