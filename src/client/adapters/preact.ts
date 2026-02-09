/**
 * Preact 客户端渲染适配器
 *
 * 仅包含浏览器端渲染功能（CSR、Hydration）
 * 支持错误处理、性能监控、布局组合
 */

import { createElement, hydrate as preactHydrate, render } from "preact";
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

  // 组件有效性检查（避免 undefined 传入导致 "(void 0) is not a function"）
  if (
    component == null ||
    typeof component !== "function" && typeof component !== "object"
  ) {
    const actual = component === undefined ? "undefined" : typeof component;
    throw new Error(
      `Invalid component: expected function or object, got ${actual}`,
    );
  }

  // 性能监控
  const perfMonitor = createPerformanceMonitor(perfOptions);
  if (perfMonitor) {
    perfMonitor.start("preact", "csr");
  }

  // 获取容器元素
  const containerElement = typeof container === "string"
    ? document.querySelector(container) as HTMLElement
    : container;

  if (!containerElement) {
    throw new Error(`Container element not found: ${container}`);
  }

  try {
    // 注意：不要使用 innerHTML = "" 清空容器，这会破坏 Preact 的内部状态
    // Preact 的 render 函数会自动处理 DOM 更新

    // 检查组件是否导出了 inheritLayout = false
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
    let performanceMetrics;
    if (perfMonitor) {
      performanceMetrics = perfMonitor.end();
      recordPerformanceMetrics(performanceMetrics, perfOptions);
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
      performance: performanceMetrics,
    };
  } catch (error) {
    // 处理错误
    handleRenderError(
      error,
      { engine: "preact", component, phase: "csr" },
      errorHandler,
    ).then((shouldUseFallback) => {
      if (shouldUseFallback && errorHandler?.fallbackComponent) {
        // 使用降级组件
        try {
          const fallbackElement = createElement(
            errorHandler.fallbackComponent as any,
            { error },
          );
          render(fallbackElement, containerElement);
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
        // 使用 Preact 的 render(null) 正确卸载，避免内存泄漏
        render(null, containerElement);
      },
      instance: containerElement,
    };
  }
}

/**
 * Preact Hydration
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

  // 组件有效性检查（避免 undefined 传入导致 "(void 0) is not a function"，常见于 Windows 路径匹配失败）
  if (
    component == null ||
    typeof component !== "function" && typeof component !== "object"
  ) {
    throw new Error(
      `Hydration 组件无效: 期望函数或对象，实际为 ${
        component === undefined ? "undefined" : typeof component
      }`,
    );
  }

  // 性能监控
  const perfMonitor = createPerformanceMonitor(perfOptions);
  if (perfMonitor) {
    perfMonitor.start("preact", "hydrate");
  }

  // 获取容器元素
  const containerElement = typeof container === "string"
    ? document.querySelector(container) as HTMLElement
    : container;

  if (!containerElement) {
    throw new Error(`Container element not found: ${container}`);
  }

  try {
    // 检查组件是否导出了 inheritLayout = false
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

    // 使用 Preact hydrate
    preactHydrate(element, containerElement);

    // 结束性能监控
    let performanceMetrics;
    if (perfMonitor) {
      performanceMetrics = perfMonitor.end();
      recordPerformanceMetrics(performanceMetrics, perfOptions);
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
      performance: performanceMetrics,
    };
  } catch (error) {
    // 处理错误
    handleRenderError(
      error,
      { engine: "preact", component, phase: "hydrate" },
      errorHandler,
    ).then((shouldUseFallback) => {
      if (shouldUseFallback && errorHandler?.fallbackComponent) {
        // 使用降级组件
        try {
          // 先卸载旧内容，再渲染 fallback
          render(null, containerElement);
          const fallbackElement = createElement(
            errorHandler.fallbackComponent as any,
            { error },
          );
          render(fallbackElement, containerElement);
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
        // 使用 Preact 的 render(null) 正确卸载，避免内存泄漏
        render(null, containerElement);
      },
      instance: containerElement,
    };
  }
}
