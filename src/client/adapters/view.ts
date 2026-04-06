/**
 * View client adapter: CSR, Hydration, buildViewTree, createReactiveRoot.
 *
 * @module @dreamer/render/client/view
 * @packageDocumentation
 *
 * 与当前 @dreamer/view 对齐：`mount` / `hydrate` 接收 `(fn, container[, bindings])`，
 * 返回根 `dispose`；`createRoot` 仅接受 `(dispose) => T`，配合 `insert(container, getter)` 做响应式根。
 */

import {
  createRoot,
  hydrate as viewHydrate,
  insert,
  internalHydrate,
  type JSXElementType,
  mount,
  stopHydration,
  type VNode,
} from "@dreamer/view";
import { jsx } from "@dreamer/view/jsx-runtime";
import type {
  CSROptions,
  CSRRenderResult,
  HydrationOptions,
  LayoutComponent,
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

/** mount / hydrate 返回的根清理函数（与 owner.createRoot 内部约定一致） */
type ViewRootDispose = () => void;

/** View createElement equivalent: build VNode with jsx(type, props, key). createComponentTree passes (component, props); children from props.children. */
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
    component as JSXElementType,
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
 * Build View root VNode from page component, props, and optional layouts.
 *
 * Used by createReactiveRoot buildTree: state changes trigger patch only, no full unmount.
 *
 * @param component - Page component (function or object)
 * @param props - Component props
 * @param layouts - Optional layouts (outer to inner)
 * @param skipLayouts - Skip layouts
 * @returns Root VNode for createRoot/createReactiveRoot
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

/**
 * 状态驱动 CSR 根：`insert(container, getter)` 在 getState 变更时细粒度更新。
 */
export function createReactiveRoot<T>(
  container: Element,
  getState: () => T,
  buildTree: (state: T) => VNode,
): { unmount: () => void; container: Element } {
  const unmount = createRoot((dispose) => {
    insert(container, () => buildTree(getState()));
    return dispose;
  }) as ViewRootDispose;
  return { unmount, container };
}

/**
 * 先对已有 SSR DOM 做 internalHydrate，再 `insert(container, getter)` 绑定响应式树。
 */
export function createReactiveRootHydrate<T>(
  container: Element,
  getState: () => T,
  buildTree: (state: T) => VNode,
): { unmount: () => void; container: Element } {
  const unmount = createRoot((dispose) => {
    stopHydration();
    internalHydrate(container, []);
    insert(container, () => buildTree(getState()));
    return dispose;
  }) as ViewRootDispose;
  return { unmount, container };
}

/**
 * Render component to container in browser with View engine (CSR).
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

    /** 当前 view：`mount(fn, container)` 清空容器后插入，返回根 dispose */
    let currentDispose = mount(
      () => rootVNode,
      containerElement,
    ) as ViewRootDispose;

    debugLog(debug, "CSR", "view render complete");

    let performanceMetrics;
    if (perfMonitor) {
      performanceMetrics = perfMonitor.end();
      recordPerformanceMetrics(performanceMetrics, perfOptions);
    }

    return {
      unmount: () => {
        currentDispose();
      },
      update: (newProps: Record<string, unknown>) => {
        currentDispose();
        const newVNode = createComponentTree(
          viewCreateElement,
          { component, props: newProps },
        ) as VNode;
        currentDispose = mount(
          () => newVNode,
          containerElement,
        ) as ViewRootDispose;
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
          mount(() => fallbackVNode, containerElement);
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
 * Hydrate server-rendered HTML with View engine.
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

    /** `hydrate(() => vnode, container)`：不先清空 SSR 节点，与 browser.hydrate 一致 */
    let currentDispose = viewHydrate(
      () => rootVNode,
      containerElement,
      [],
    ) as ViewRootDispose;

    debugLog(debug, "hydrate", "view hydrate complete");

    let performanceMetrics;
    if (perfMonitor) {
      performanceMetrics = perfMonitor.end();
      recordPerformanceMetrics(performanceMetrics, perfOptions);
    }

    return {
      unmount: () => {
        currentDispose();
      },
      update: (newProps: Record<string, unknown>) => {
        currentDispose();
        const newVNode = createComponentTree(
          viewCreateElement,
          { component, props: newProps },
        ) as VNode;
        currentDispose = mount(
          () => newVNode,
          containerElement,
        ) as ViewRootDispose;
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
          mount(() => fallbackVNode, containerElement);
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
