/**
 * React client adapter: CSR and Hydration.
 *
 * @module @dreamer/render/client/react
 * @packageDocumentation
 *
 * Browser-only render; supports error handling, performance, layouts. **Exports:** renderCSR, hydrate.
 * Uses named createElement to avoid "_.default.createElement is not a function" interop issues.
 */

import { createElement, type ReactNode } from "react";
import { createRoot, hydrateRoot, type Root } from "react-dom/client";
import { flushSync } from "react-dom";

/** 对外导出，供测试 fixture 等与 root 使用同一 React 实例，避免双 React 导致 DOM 不更新 */
export { createElement };
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
 * Wrap "(void 0) is not a function" with a hint (e.g. react/jsx-runtime import failed or component undefined).
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
 * 调试日志：仅当 debug 为 true 时输出
 */
function debugLog(
  debug: boolean | undefined,
  prefix: string,
  ...args: unknown[]
): void {
  if (debug) {
    console.log(`[@dreamer/render:${prefix}]`, ...args);
  }
}

/**
 * Render component to container in browser with React (CSR).
 *
 * @param options - CSR options: component, props, container, layouts, skipLayouts, errorHandler, performance, debug
 * @returns Result with unmount, update, instance, performance; on error returns object with unmount, instance
 * @throws If component invalid or container not found
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
    debug,
  } = options;

  debugLog(debug, "CSR", "react", {
    container: typeof container === "string" ? container : "HTMLElement",
    layoutsCount: layouts?.length ?? 0,
    skipLayouts,
    componentType: component == null ? "null" : typeof component,
  });

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

    debugLog(debug, "CSR", "before render", {
      shouldSkip,
      hasLayouts: !!(layouts?.length),
      configKeys: Object.keys(componentConfig as object),
    });

    // 创建 React 元素树（使用具名导入 createElement，避免 default 互操作问题）
    const element = createComponentTree(
      (comp: unknown, props: unknown, ...children: unknown[]) =>
        createElement(comp as any, props as any, ...(children as any[])),
      componentConfig as { component: unknown; props: Record<string, unknown> },
    ) as ReactNode;

    // 使用缓存的 root 或创建新的（会自动清理旧 root）
    root = getOrCreateRoot(containerElement);
    // 使用 flushSync 确保本次渲染同步提交，便于测试与调用方在返回后立即读取 DOM
    flushSync(() => {
      root.render(element);
    });

    debugLog(debug, "CSR", "react render complete");

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
 * Hydrate server-rendered HTML with React.
 *
 * @param options - Hydration options: component, props, container, layouts, skipLayouts, errorHandler, performance, debug
 * @returns Result with unmount, update, instance, performance; on error returns object with unmount, instance
 * @throws If component invalid or container not found
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
    debug,
  } = options;

  debugLog(debug, "hydrate", "react", {
    container: typeof container === "string" ? container : "HTMLElement",
    layoutsCount: layouts?.length ?? 0,
    skipLayouts,
    componentType: component == null ? "null" : typeof component,
  });

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

    debugLog(debug, "hydrate", "before hydrateRoot", {
      shouldSkip,
      hasLayouts: !!(layouts?.length),
    });

    // 创建 React 元素树（使用具名导入 createElement，避免 default 互操作问题）
    const element = createComponentTree(
      (comp: unknown, props: unknown, ...children: unknown[]) =>
        createElement(comp as any, props as any, ...(children as any[])),
      componentConfig as { component: unknown; props: Record<string, unknown> },
    ) as ReactNode;

    // 使用 React 18 的 hydrateRoot API
    root = hydrateRoot(containerElement, element);

    debugLog(debug, "hydrate", "react hydrate complete");

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
