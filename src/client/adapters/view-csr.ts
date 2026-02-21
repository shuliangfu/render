/**
 * View 客户端适配器 — 仅 CSR（createRoot、render、createReactiveRoot）。
 * 从 @dreamer/view/csr 导入，不含 hydrate，bundle 更小。
 *
 * @module @dreamer/render/client/view-csr
 * @packageDocumentation
 *
 * **导出：** renderCSR、buildViewTree（mount/createReactiveRoot 由使用方从 @dreamer/view/csr 直接导入）
 */

import { createRoot, type VNode } from "@dreamer/view/csr";
import { jsx } from "@dreamer/view/jsx-runtime";
import type { CSROptions, CSRRenderResult } from "../types.ts";
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
 * 供 createReactiveRoot 的 buildTree 使用：状态变化时仅 patch，不整树卸载。
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

/**
 * 在浏览器容器内用 View 引擎做 CSR 渲染。
 *
 * @param options - CSR 选项：component、props、container、layouts、skipLayouts、errorHandler、performance、debug
 * @returns 含 unmount、update、instance、performance 的结果；出错时返回含 unmount、instance 的对象
 * @throws 组件非法或容器未找到时抛出
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
