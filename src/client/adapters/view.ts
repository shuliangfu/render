/**
 * View 客户端渲染适配器
 *
 * 仅包含浏览器端渲染功能（CSR、Hydration）
 * 支持错误处理、性能监控、布局组合
 */

import type { Root, VNode } from "@dreamer/view";
import { hydrate as viewHydrate, render as viewRender } from "@dreamer/view";
import { jsx } from "@dreamer/view/jsx-runtime";
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
 * 常见于：路由/layout 组件的 view/jsx-runtime 导入失败，或组件为 undefined
 */
function enhanceVoidError(error: unknown, phase: string): Error {
  const err = error instanceof Error ? error : new Error(String(error));
  if (!/void 0.*is not a function/i.test(err.message)) return err;
  return new Error(
    `${err.message} [${phase}] ` +
      `Hint: route/layout chunk may have failed to import view/jsx-runtime, or component is undefined.`,
    { cause: err },
  );
}

/**
 * View 的 createElement 等价：用 jsx(type, props, key) 构建 VNode 树，
 * 供 createComponentTree 递归使用
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
 * View 客户端渲染
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
    debug,
  } = options;

  const layoutsCount = layouts == null ? 0 : layouts.length;
  debugLog(debug, "CSR", "view", {
    container: typeof container === "string" ? container : "HTMLElement",
    layoutsCount,
    skipLayouts,
    componentType: component == null ? "null" : typeof component,
  });

  if (
    component == null ||
    (typeof component !== "function" && typeof component !== "object")
  ) {
    const actual = component === undefined ? "undefined" : typeof component;
    throw new Error(
      `Invalid component: expected function or object, got ${actual}`,
    );
  }

  const perfMonitor = createPerformanceMonitor(perfOptions);
  if (perfMonitor) {
    perfMonitor.start("view", "csr");
  }

  const containerElement = typeof container === "string"
    ? (document.querySelector(container) as HTMLElement)
    : container;

  if (!containerElement) {
    throw new Error(`Container element not found: ${container}`);
  }

  try {
    const shouldSkip = skipLayouts || shouldSkipLayouts(component);
    const componentConfig = layouts != null && layouts.length > 0 && !shouldSkip
      ? composeLayouts("view", component, props, layouts, shouldSkip)
      : { component, props };

    debugLog(debug, "CSR", "before render", {
      shouldSkip,
      hasLayouts: layoutsCount > 0,
      configKeys: Object.keys(componentConfig as object),
    });

    const rootVNode = createComponentTree(
      viewCreateElement,
      componentConfig as { component: unknown; props: Record<string, unknown> },
    ) as VNode;

    const root = viewRender(
      () => rootVNode,
      containerElement as Element,
    );

    debugLog(debug, "CSR", "view render complete");

    let performanceMetrics;
    if (perfMonitor) {
      performanceMetrics = perfMonitor.end();
      recordPerformanceMetrics(performanceMetrics, perfOptions);
    }

    return {
      unmount: () => {
        root.unmount();
      },
      update: (newProps: Record<string, unknown>) => {
        root.unmount();
        const newConfig = { component, props: newProps };
        const newVNode = createComponentTree(
          viewCreateElement,
          newConfig,
        ) as VNode;
        viewRender(() => newVNode, containerElement as Element);
      },
      instance: root as unknown,
      performance: performanceMetrics,
    };
  } catch (error) {
    const enhanced = enhanceVoidError(error, "csr");
    handleRenderError(
      enhanced,
      { engine: "view", component, phase: "csr" },
      errorHandler,
    ).then((shouldUseFallback) => {
      if (shouldUseFallback && errorHandler?.fallbackComponent) {
        try {
          const fallbackVNode = createComponentTree(viewCreateElement, {
            component: errorHandler.fallbackComponent,
            props: { error },
          }) as VNode;
          viewRender(() => fallbackVNode, containerElement as Element);
        } catch {
          renderErrorFallback(
            containerElement,
            error instanceof Error ? error : new Error(String(error)),
            "csr",
          );
        }
      } else {
        renderErrorFallback(
          containerElement,
          error instanceof Error ? error : new Error(String(error)),
          "csr",
        );
      }
    });

    return {
      unmount: () => {
        // 容器可能已有部分内容，尝试清空
        if (containerElement.firstChild) {
          containerElement.textContent = "";
        }
      },
      instance: containerElement,
    };
  }
}

/**
 * View Hydration
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
    debug,
  } = options;

  const layoutsCount = layouts == null ? 0 : layouts.length;
  debugLog(debug, "hydrate", "view", {
    container: typeof container === "string" ? container : "HTMLElement",
    layoutsCount,
    skipLayouts,
    componentType: component == null ? "null" : typeof component,
  });

  if (
    component == null ||
    (typeof component !== "function" && typeof component !== "object")
  ) {
    throw new Error(
      `Invalid hydration component: expected function or object, got ${
        component === undefined ? "undefined" : typeof component
      }`,
    );
  }

  const perfMonitor = createPerformanceMonitor(perfOptions);
  if (perfMonitor) {
    perfMonitor.start("view", "hydrate");
  }

  const containerElement = typeof container === "string"
    ? (document.querySelector(container) as HTMLElement)
    : container;

  if (!containerElement) {
    throw new Error(`Container element not found: ${container}`);
  }

  try {
    const shouldSkip = skipLayouts || shouldSkipLayouts(component);
    const componentConfig = layouts != null && layouts.length > 0 && !shouldSkip
      ? composeLayouts("view", component, props, layouts, shouldSkip)
      : { component, props };

    debugLog(debug, "hydrate", "before viewHydrate", {
      shouldSkip,
      hasLayouts: layoutsCount > 0,
    });

    const rootVNode = createComponentTree(
      viewCreateElement,
      componentConfig as { component: unknown; props: Record<string, unknown> },
    ) as VNode;

    const root = viewHydrate(
      () => rootVNode,
      containerElement as Element,
    ) as Root;

    debugLog(debug, "hydrate", "view hydrate complete");

    let performanceMetrics;
    if (perfMonitor) {
      performanceMetrics = perfMonitor.end();
      recordPerformanceMetrics(performanceMetrics, perfOptions);
    }

    return {
      unmount: () => {
        root.unmount();
      },
      update: (newProps: Record<string, unknown>) => {
        root.unmount();
        const newConfig = { component, props: newProps };
        const newVNode = createComponentTree(
          viewCreateElement,
          newConfig,
        ) as VNode;
        viewRender(() => newVNode, containerElement as Element);
      },
      instance: root as unknown,
      performance: performanceMetrics,
    };
  } catch (error) {
    const enhanced = enhanceVoidError(error, "hydrate");
    handleRenderError(
      enhanced,
      { engine: "view", component, phase: "hydrate" },
      errorHandler,
    ).then((shouldUseFallback) => {
      if (shouldUseFallback && errorHandler?.fallbackComponent) {
        try {
          (containerElement as Element).textContent = "";
          const fallbackVNode = createComponentTree(viewCreateElement, {
            component: errorHandler.fallbackComponent,
            props: { error },
          }) as VNode;
          viewRender(() => fallbackVNode, containerElement as Element);
        } catch {
          renderErrorFallback(
            containerElement,
            error instanceof Error ? error : new Error(String(error)),
            "hydrate",
          );
        }
      } else {
        renderErrorFallback(
          containerElement,
          error instanceof Error ? error : new Error(String(error)),
          "hydrate",
        );
      }
    });

    return {
      unmount: () => {
        if (containerElement.firstChild) {
          containerElement.textContent = "";
        }
      },
      instance: containerElement,
    };
  }
}
