/**
 * Solid 客户端渲染适配器
 *
 * 提供浏览器端 CSR 与 Hydration，与 Preact/React 适配器接口一致。
 * Solid 使用 render(fn, container) 与 hydrate(fn, container)，fn 为返回根组件的函数。
 */

import { type Component, createComponent } from "solid-js";
import type { JSX } from "solid-js";
import { hydrate as solidHydrate, render as solidRender } from "solid-js/web";
import type {
  CSROptions,
  CSRRenderResult,
  HydrationOptions,
} from "../types.ts";
import {
  handleRenderError,
  renderErrorFallback,
} from "../utils/error-handler.ts";
import { composeLayouts, shouldSkipLayouts } from "../utils/layout.ts";
import {
  createPerformanceMonitor,
  recordPerformanceMetrics,
} from "../utils/performance.ts";

/**
 * 从布局 config 递归构建 Solid 组件树（与服务端 buildSolidTree 一致）
 * 返回类型为 JSX.Element 以满足 solid-js/web 的 render/hydrate 签名。
 */
function buildSolidTree(componentConfig: {
  component: unknown;
  props: Record<string, unknown>;
}): JSX.Element {
  const { component, props } = componentConfig;

  if (
    component == null ||
    (typeof component !== "function" && typeof component !== "object")
  ) {
    const actual = component === undefined ? "undefined" : typeof component;
    throw new Error(
      `buildSolidTree: invalid component (expected function or object, actual: ${actual})`,
    );
  }

  const { children: childrenConfig, ...restProps } = props;

  if (
    childrenConfig &&
    typeof childrenConfig === "object" &&
    "component" in childrenConfig &&
    "props" in childrenConfig
  ) {
    const childConfig = childrenConfig as {
      component: unknown;
      props: Record<string, unknown>;
    };
    if (childConfig.component) {
      const childNode = buildSolidTree(childConfig);
      return createComponent(component as Component<Record<string, unknown>>, {
        ...restProps,
        get children() {
          return childNode;
        },
      });
    }
  }

  return createComponent(
    component as Component<Record<string, unknown>>,
    restProps,
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
 * Solid 客户端渲染（CSR）
 *
 * @param options CSR 选项（engine 须为 "solid"）
 * @returns 渲染结果，含 unmount、update
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

  debugLog(debug, "CSR", "solid", {
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
      `Invalid component: expected function or object, got ${
        component === undefined ? "undefined" : typeof component
      }`,
    );
  }

  const perfMonitor = createPerformanceMonitor(perfOptions);
  if (perfMonitor) {
    perfMonitor.start("solid", "csr");
  }

  const containerElement = typeof container === "string"
    ? (document.querySelector(container) as HTMLElement)
    : container;

  if (!containerElement) {
    throw new Error(`Container element not found: ${container}`);
  }

  try {
    const shouldSkip = skipLayouts || shouldSkipLayouts(component);

    const componentConfig = layouts && layouts.length > 0 && !shouldSkip
      ? composeLayouts("solid", component, props, layouts, shouldSkip)
      : { component, props };

    const config = componentConfig as {
      component: unknown;
      props: Record<string, unknown>;
    };
    const rootFn = (): JSX.Element => buildSolidTree(config);

    const dispose = solidRender(rootFn, containerElement);

    let performanceMetrics;
    if (perfMonitor) {
      performanceMetrics = perfMonitor.end();
      recordPerformanceMetrics(performanceMetrics, perfOptions);
    }

    return {
      unmount: dispose,
      update: (newProps: Record<string, unknown>) => {
        dispose();
        const newConfig = { component, props: newProps };
        solidRender(
          (): JSX.Element => buildSolidTree(newConfig),
          containerElement,
        );
      },
      instance: containerElement,
      performance: performanceMetrics,
    };
  } catch (error) {
    handleRenderError(
      error,
      { engine: "solid", component, phase: "csr" },
      errorHandler,
    ).then((shouldUseFallback) => {
      if (shouldUseFallback && errorHandler?.fallbackComponent) {
        try {
          const fallbackFn = (): JSX.Element =>
            createComponent(
              errorHandler.fallbackComponent as Component<
                Record<string, unknown>
              >,
              { error },
            );
          solidRender(fallbackFn, containerElement);
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
 * Solid Hydration
 *
 * @param options Hydration 选项（engine 须为 "solid"）
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

  debugLog(debug, "hydrate", "solid", {
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
    perfMonitor.start("solid", "hydrate");
  }

  const containerElement = typeof container === "string"
    ? (document.querySelector(container) as HTMLElement)
    : container;

  if (!containerElement) {
    throw new Error(`Container element not found: ${container}`);
  }

  try {
    const shouldSkip = skipLayouts || shouldSkipLayouts(component);

    const componentConfig = layouts && layouts.length > 0 && !shouldSkip
      ? composeLayouts("solid", component, props, layouts, shouldSkip)
      : { component, props };

    const config = componentConfig as {
      component: unknown;
      props: Record<string, unknown>;
    };
    const rootFn = (): JSX.Element => buildSolidTree(config);

    const dispose = solidHydrate(rootFn, containerElement);

    let performanceMetrics;
    if (perfMonitor) {
      performanceMetrics = perfMonitor.end();
      recordPerformanceMetrics(performanceMetrics, perfOptions);
    }

    return {
      unmount: dispose,
      update: (newProps: Record<string, unknown>) => {
        dispose();
        const newConfig = { component, props: newProps };
        solidRender(
          (): JSX.Element => buildSolidTree(newConfig),
          containerElement,
        );
      },
      instance: containerElement,
      performance: performanceMetrics,
    };
  } catch (error) {
    handleRenderError(
      error,
      { engine: "solid", component, phase: "hydrate" },
      errorHandler,
    ).then((shouldUseFallback) => {
      if (shouldUseFallback && errorHandler?.fallbackComponent) {
        try {
          containerElement.innerHTML = "";
          const fallbackFn = (): JSX.Element =>
            createComponent(
              errorHandler.fallbackComponent as Component<
                Record<string, unknown>
              >,
              { error },
            );
          solidRender(fallbackFn, containerElement);
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
