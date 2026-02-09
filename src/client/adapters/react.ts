/**
 * React 客户端渲染适配器
 *
 * 仅包含浏览器端渲染功能（CSR、Hydration）
 * 支持错误处理、性能监控、布局组合
 *
 * 使用具名导入 createElement，避免 default 互操作导致的 "_.default.createElement is not a function"
 */

import { createElement, type ReactNode } from "react";
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
 * 若错误为 "(void 0) is not a function"，包装为带诊断提示的新错误
 * 常见于：路由/layout 组件的 react/jsx-runtime 导入失败，或组件为 undefined
 */
function enhanceVoidError(error: unknown, phase: string): Error {
  const err = error instanceof Error ? error : new Error(String(error));
  if (!/void 0.*is not a function/i.test(err.message)) return err;
  return new Error(
    `${err.message} [${phase}] ` +
      `Hint: route/layout chunk may have failed to import react/jsx-runtime, or component is undefined.`,
    { cause: err },
  );
}

/**
 * 容器到 React Root 的缓存映射
 * 使用 WeakMap 避免内存泄漏（当容器被移除时，缓存自动清理）
 */
/**
 * 容器到 React Root 的缓存映射
 * 使用 WeakMap 避免内存泄漏（当容器被移除时，缓存自动清理）
 */
const rootCache = new WeakMap<HTMLElement, Root>();

/**
 * 清理容器中缓存的 React Root
 * 如果容器已有缓存的 root，先卸载避免内存泄漏
 *
 * @param container 容器元素
 */
function cleanupCachedRoot(container: HTMLElement): void {
  const cachedRoot = rootCache.get(container);
  if (cachedRoot) {
    try {
      cachedRoot.unmount();
    } catch {
      // 忽略卸载错误
    }
    rootCache.delete(container);
  }
}

/**
 * 获取或创建容器的 React Root
 * 如果容器已有缓存的 root，先卸载再创建新的
 *
 * @param container 容器元素
 * @returns React Root 实例
 */
function getOrCreateRoot(container: HTMLElement): Root {
  // 先清理旧的 root
  cleanupCachedRoot(container);

  // 创建新的 root
  const newRoot = createRoot(container);
  rootCache.set(container, newRoot);
  return newRoot;
}

/**
 * 缓存 React Root
 *
 * @param container 容器元素
 * @param root React Root 实例
 */
function cacheRoot(container: HTMLElement, root: Root): void {
  rootCache.set(container, root);
}

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
    perfMonitor.start("react", "csr");
  }

  // 获取容器元素
  const containerElement = typeof container === "string"
    ? document.querySelector(container) as HTMLElement
    : container;

  if (!containerElement) {
    throw new Error(`Container element not found: ${container}`);
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

    // 创建 React 元素树（使用具名导入 createElement，避免 default 互操作问题）
    const element = createComponentTree(
      (comp: unknown, props: unknown, ...children: unknown[]) =>
        createElement(comp as any, props as any, ...(children as any[])),
      componentConfig as { component: unknown; props: Record<string, unknown> },
    ) as ReactNode;

    // 使用缓存的 root 或创建新的（会自动清理旧 root）
    root = getOrCreateRoot(containerElement);
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
        // 从缓存中移除
        rootCache.delete(containerElement);
      },
      update: (newProps: Record<string, unknown>) => {
        const newElement = createElement(component as any, newProps);
        root.render(newElement);
      },
      instance: root,
      performance: performanceMetrics,
    };
  } catch (error) {
    // 处理错误（增强 "(void 0) is not a function" 的诊断信息）
    const enhanced = enhanceVoidError(error, "csr");
    handleRenderError(
      enhanced,
      { engine: "react", component, phase: "csr" },
      errorHandler,
    ).then((shouldUseFallback) => {
      if (shouldUseFallback && errorHandler?.fallbackComponent) {
        // 使用降级组件
        try {
          const fallbackRoot = getOrCreateRoot(containerElement);
          const fallbackElement = createElement(
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
        // 正确清理缓存的 root，避免内存泄漏
        cleanupCachedRoot(containerElement);
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

  // 组件有效性检查（避免 undefined 传入导致 "(void 0) is not a function"，常见于 Windows 路径匹配失败）
  if (
    component == null ||
    typeof component !== "function" && typeof component !== "object"
  ) {
    throw new Error(
      `Invalid hydration component: expected function or object, got ${
        component === undefined ? "undefined" : typeof component
      }`,
    );
  }

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
    throw new Error(`Container element not found: ${container}`);
  }

  // 创建 React Root
  let root: Root;

  try {
    // 清理旧的 root（如果有），避免内存泄漏
    cleanupCachedRoot(containerElement);

    // 检查组件是否导出了 inheritLayout = false
    const shouldSkip = skipLayouts || shouldSkipLayouts(component);

    // 组合布局和组件
    const componentConfig = layouts && layouts.length > 0 && !shouldSkip
      ? composeLayouts("react", component, props, layouts, shouldSkip)
      : { component, props };

    // 创建 React 元素树（使用具名导入 createElement，避免 default 互操作问题）
    const element = createComponentTree(
      (comp: unknown, props: unknown, ...children: unknown[]) =>
        createElement(comp as any, props as any, ...(children as any[])),
      componentConfig as { component: unknown; props: Record<string, unknown> },
    ) as ReactNode;

    // 使用 React 18 的 hydrateRoot API
    root = hydrateRoot(containerElement, element);

    // 缓存 root
    cacheRoot(containerElement, root);

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
        // 从缓存中移除
        rootCache.delete(containerElement);
      },
      update: (newProps: Record<string, unknown>) => {
        const newElement = createElement(component as any, newProps);
        root.render(newElement);
      },
      instance: root,
      performance: performanceMetrics,
    };
  } catch (error) {
    // 处理错误（增强 "(void 0) is not a function" 的诊断信息）
    const enhanced = enhanceVoidError(error, "hydrate");
    handleRenderError(
      enhanced,
      { engine: "react", component, phase: "hydrate" },
      errorHandler,
    ).then((shouldUseFallback) => {
      if (shouldUseFallback && errorHandler?.fallbackComponent) {
        // 使用降级组件
        try {
          // 使用缓存机制创建 fallback root
          const fallbackRoot = getOrCreateRoot(containerElement);
          const fallbackElement = createElement(
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
        // 正确清理缓存的 root，避免内存泄漏
        cleanupCachedRoot(containerElement);
      },
      instance: containerElement,
    };
  }
}
