/**
 * View 客户端适配器 — Hybrid（含 hydrate、createReactiveRootHydrate）。
 * 从 @dreamer/view/hybrid 导入，用于首屏水合与后续 patch。
 *
 * @module @dreamer/render/client/view-hybrid
 * @packageDocumentation
 *
 * **导出：** hydrate、buildViewTree、createReactiveRoot、createReactiveRootHydrate
 */

import {
  createReactiveRoot,
  createReactiveRootHydrate,
  createRoot,
  hydrate as viewHydrate,
  type VNode,
} from "@dreamer/view/hybrid";
import { jsx } from "@dreamer/view/jsx-runtime";
import type { CSRRenderResult, HydrationOptions } from "../types.ts";
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

/** View createElement 等价：用 jsx(type, props, key) 构建 VNode。createComponentTree 传入 (component, props)；children 来自 props.children。 */
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
 * 根据页面组件、props 与可选 layouts 构建 View 根 VNode。
 * 供 createReactiveRoot / createReactiveRootHydrate 的 buildTree 使用。
 *
 * @param component - 页面组件（函数或对象）
 * @param props - 组件 props
 * @param layouts - 可选布局（外到内）
 * @param skipLayouts - 是否跳过布局
 * @returns 供 createRoot / createReactiveRoot 使用的根 VNode
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

export { createReactiveRoot, createReactiveRootHydrate };

/**
 * 用 View 引擎对服务端渲染的 HTML 做水合。
 *
 * @param options - 水合选项：component、props、container、layouts、skipLayouts、errorHandler、performance、debug
 * @returns 含 unmount、update、instance、performance 的结果；出错时返回含 unmount、instance 的对象
 * @throws 组件非法或容器未找到时抛出
 */
export function hydrate(options: HydrationOptions): CSRRenderResult {
  console.log("[@dreamer/render] view hydrate() called");
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
