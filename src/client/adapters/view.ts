/**
 * View 客户端渲染适配器
 *
 * 使用 @dreamer/view 的 createRoot、hydrate 实现 CSR 与 Hydration。
 * 并导出 createReactiveRoot 与 buildViewTree，供 dweb 等对接「状态驱动、原地 patch」的 View 根。
 */

import type { VNode } from "@dreamer/view";
import {
  createReactiveRoot,
  createRoot,
  hydrate as viewHydrate,
} from "@dreamer/view";
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
import type { LayoutComponent } from "../types.ts";

/** View 的 createElement 等价：用 jsx(type, props, key) 构建 VNode。注意：createComponentTree 只传 (component, props) 两参，children 在 props.children 中，不能再用第三参覆盖为 undefined。 */
function viewCreateElement(
  component: unknown,
  props: unknown,
  ...children: unknown[]
): VNode {
  const rest = (props as Record<string, unknown>) ?? {};
  const fromArgs = children.length === 1
    ? children[0]
    : children.length > 1
    ? children
    : undefined;
  const resolvedChildren = fromArgs !== undefined ? fromArgs : rest.children;
  return jsx(
    component as VNode["type"],
    { ...rest, children: resolvedChildren },
    undefined,
  );
}

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
 * 根据页面组件、props、布局构建 View 根 VNode。
 * 供 createReactiveRoot 的 buildTree 使用：state 变化时只 patch，不整树卸载。
 */
export function buildViewTree(
  component: unknown,
  props: Record<string, unknown>,
  layouts?: LayoutComponent[],
  skipLayouts?: boolean,
): VNode {
  const shouldSkip = skipLayouts || shouldSkipLayouts(component);
  const componentConfig = layouts && layouts.length > 0 && !shouldSkip
    ? composeLayouts("view", component, props, layouts, shouldSkip)
    : { component, props };
  return createComponentTree(
    viewCreateElement,
    componentConfig as { component: unknown; props: Record<string, unknown> },
  ) as VNode;
}

/** 从 View 复用的 createReactiveRoot，供 dweb 等对接状态驱动根 */
export { createReactiveRoot };

/**
 * View 客户端渲染（CSR）
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

  debugLog(debug, "CSR", "view", {
    container: typeof container === "string" ? container : "HTMLElement",
    layoutsCount: layouts?.length ?? 0,
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
    ? document.querySelector(container) as HTMLElement
    : container;

  if (!containerElement) {
    throw new Error(`Container element not found: ${container}`);
  }

  try {
    const shouldSkip = skipLayouts || shouldSkipLayouts(component);
    const componentConfig = layouts && layouts.length > 0 && !shouldSkip
      ? composeLayouts("view", component, props, layouts, shouldSkip)
      : { component, props };

    const rootVNode = createComponentTree(
      viewCreateElement,
      componentConfig as { component: unknown; props: Record<string, unknown> },
    ) as VNode;

    let currentRoot = createRoot(() => rootVNode, containerElement);

    debugLog(debug, "CSR", "view render complete");

    let performanceMetrics;
    if (perfMonitor) {
      performanceMetrics = perfMonitor.end();
      recordPerformanceMetrics(performanceMetrics, perfOptions);
    }

    return {
      unmount: () => {
        currentRoot.unmount();
      },
      update: (newProps: Record<string, unknown>) => {
        currentRoot.unmount();
        const newVNode = createComponentTree(
          viewCreateElement,
          { component, props: newProps },
        ) as VNode;
        currentRoot = createRoot(() => newVNode, containerElement);
      },
      instance: containerElement,
      performance: performanceMetrics,
    };
  } catch (error) {
    handleRenderError(
      error,
      { engine: "view", component, phase: "csr" },
      errorHandler,
    ).then((shouldUseFallback) => {
      if (shouldUseFallback && errorHandler?.fallbackComponent) {
        try {
          const fallbackVNode = createComponentTree(
            viewCreateElement,
            {
              component: errorHandler.fallbackComponent,
              props: { error },
            },
          ) as VNode;
          createRoot(() => fallbackVNode, containerElement);
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
      unmount: () => {},
      instance: containerElement,
    };
  }
}

/**
 * View Hydration
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

  debugLog(debug, "hydrate", "view", {
    container: typeof container === "string" ? container : "HTMLElement",
    layoutsCount: layouts?.length ?? 0,
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
    ? document.querySelector(container) as HTMLElement
    : container;

  if (!containerElement) {
    throw new Error(`Container element not found: ${container}`);
  }

  try {
    const shouldSkip = skipLayouts || shouldSkipLayouts(component);
    const componentConfig = layouts && layouts.length > 0 && !shouldSkip
      ? composeLayouts("view", component, props, layouts, shouldSkip)
      : { component, props };

    const rootVNode = createComponentTree(
      viewCreateElement,
      componentConfig as { component: unknown; props: Record<string, unknown> },
    ) as VNode;

    let currentRoot = viewHydrate(() => rootVNode, containerElement);

    debugLog(debug, "hydrate", "view hydrate complete");

    let performanceMetrics;
    if (perfMonitor) {
      performanceMetrics = perfMonitor.end();
      recordPerformanceMetrics(performanceMetrics, perfOptions);
    }

    return {
      unmount: () => {
        currentRoot.unmount();
      },
      update: (newProps: Record<string, unknown>) => {
        currentRoot.unmount();
        const newVNode = createComponentTree(
          viewCreateElement,
          { component, props: newProps },
        ) as VNode;
        currentRoot = createRoot(() => newVNode, containerElement);
      },
      instance: containerElement,
      performance: performanceMetrics,
    };
  } catch (error) {
    handleRenderError(
      error,
      { engine: "view", component, phase: "hydrate" },
      errorHandler,
    ).then((shouldUseFallback) => {
      if (shouldUseFallback && errorHandler?.fallbackComponent) {
        try {
          containerElement.textContent = "";
          const fallbackVNode = createComponentTree(
            viewCreateElement,
            {
              component: errorHandler.fallbackComponent,
              props: { error },
            },
          ) as VNode;
          createRoot(() => fallbackVNode, containerElement);
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
      unmount: () => {},
      instance: containerElement,
    };
  }
}
