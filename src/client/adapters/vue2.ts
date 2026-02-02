/**
 * Vue2 客户端渲染适配器
 *
 * 支持 Vue 2.7+ 版本（原生支持组合式 API）
 * 仅包含浏览器端渲染功能（CSR、Hydration）
 * 支持错误处理、性能监控、布局组合
 *
 * @module @dreamer/render/client/adapters/vue2
 */

import type {
  CSROptions,
  CSRRenderResult,
  HydrationOptions,
} from "../types.ts";
import {
  handleRenderError,
  renderErrorFallback,
} from "../utils/error-handler.ts";
import { shouldSkipLayouts } from "../utils/layout.ts";
import {
  createPerformanceMonitor,
  recordPerformanceMetrics,
} from "../utils/performance.ts";

/**
 * Vue 2 组件类型
 * Vue 2 的组件定义格式
 */
// deno-lint-ignore no-explicit-any
type Vue2Component = any;

/**
 * Vue 2 实例类型
 */
interface Vue2Instance {
  /** 挂载到指定元素 */
  $mount: (el?: string | HTMLElement) => Vue2Instance;
  /** 销毁实例 */
  $destroy: () => void;
  /** 强制更新 */
  $forceUpdate: () => void;
  /** 根元素 */
  $el: HTMLElement;
  /** 选项 */
  $options: Record<string, unknown>;
}

/**
 * Vue 2 构造函数类型
 */
interface Vue2Constructor {
  new (options: {
    render: (h: Vue2H) => Vue2VNode;
    errorCaptured?: (
      err: Error,
      vm: Vue2Instance,
      info: string,
    ) => boolean | void;
  }): Vue2Instance;
}

/**
 * Vue 2 的 h 函数类型
 */
// deno-lint-ignore no-explicit-any
type Vue2H = (tag: any, data?: any, children?: any) => Vue2VNode;

/**
 * Vue 2 的虚拟节点类型
 */
// deno-lint-ignore no-explicit-any
type Vue2VNode = any;

/**
 * 获取全局 Vue 构造函数
 *
 * @returns Vue 构造函数，如果未找到则返回 null
 */
function getVue(): Vue2Constructor | null {
  // 检查全局 Vue 变量（通过 script 标签引入）
  if (typeof globalThis !== "undefined" && (globalThis as unknown as { Vue?: Vue2Constructor }).Vue) {
    return (globalThis as unknown as { Vue: Vue2Constructor }).Vue;
  }
  return null;
}

/**
 * Vue2 客户端渲染
 *
 * @param options CSR 选项
 * @param Vue 可选的 Vue 构造函数，如果未提供则从全局获取
 * @returns 渲染结果，包含卸载函数
 *
 * @example
 * ```typescript
 * import Vue from "vue";
 * import { renderCSR } from "@dreamer/render/client/adapters/vue2";
 *
 * const result = renderCSR({
 *   component: MyComponent,
 *   container: "#app",
 * }, Vue);
 * ```
 */
export function renderCSR(
  options: CSROptions,
  Vue?: Vue2Constructor,
): CSRRenderResult {
  const {
    component,
    props = {},
    layouts,
    skipLayouts,
    container,
    errorHandler,
    performance: perfOptions,
  } = options;

  // 获取 Vue 构造函数
  const VueConstructor = Vue || getVue();
  if (!VueConstructor) {
    throw new Error(
      "Vue 构造函数未找到。请确保已引入 Vue 2.7+，或将 Vue 作为第二个参数传入。",
    );
  }

  // 性能监控
  const perfMonitor = createPerformanceMonitor(perfOptions);
  if (perfMonitor) {
    perfMonitor.start("vue2", "csr");
  }

  // 获取容器元素
  const containerElement = typeof container === "string"
    ? document.querySelector(container) as HTMLElement
    : container;

  if (!containerElement) {
    throw new Error(`容器元素未找到: ${container}`);
  }

  // 创建 Vue 实例
  let vm: Vue2Instance;

  try {
    // 清空容器（如果已有内容）
    containerElement.innerHTML = "";

    // 检查组件是否导出了 inheritLayout = false
    const shouldSkip = skipLayouts || shouldSkipLayouts(component);

    // 创建 Vue 实例
    vm = new VueConstructor({
      render(h: Vue2H) {
        return createWrapperVNode(
          h,
          component as Vue2Component,
          props,
          layouts,
          shouldSkip,
        );
      },
      // 错误捕获
      errorCaptured(err: Error) {
        handleRenderError(
          err,
          { engine: "vue2", component, phase: "csr" },
          errorHandler,
        );
        return false; // 阻止错误继续向上传播
      },
    });

    // 挂载到容器
    vm.$mount(containerElement);

    // 结束性能监控
    let performanceMetrics;
    if (perfMonitor) {
      performanceMetrics = perfMonitor.end();
      recordPerformanceMetrics(performanceMetrics, perfOptions);
    }

    // 返回卸载函数和更新函数
    return {
      unmount: () => {
        vm.$destroy();
        // 清空 DOM
        if (vm.$el && vm.$el.parentNode) {
          vm.$el.parentNode.removeChild(vm.$el);
        }
      },
      update: (newProps: Record<string, unknown>) => {
        // Vue 2 不支持直接更新根组件 props
        // 需要销毁并重新创建
        vm.$destroy();
        if (vm.$el && vm.$el.parentNode) {
          vm.$el.parentNode.removeChild(vm.$el);
        }

        const newVm = new VueConstructor({
          render(h: Vue2H) {
            return createWrapperVNode(
              h,
              component as Vue2Component,
              newProps,
              layouts,
              shouldSkip,
            );
          },
        });
        newVm.$mount(containerElement);
        vm = newVm;
      },
      instance: vm,
      performance: performanceMetrics,
    };
  } catch (error) {
    // 处理错误
    handleRenderError(
      error,
      { engine: "vue2", component, phase: "csr" },
      errorHandler,
    ).then((shouldUseFallback) => {
      if (shouldUseFallback && errorHandler?.fallbackComponent) {
        // 使用降级组件
        try {
          containerElement.innerHTML = "";
          const fallbackVm = new VueConstructor({
            render(h: Vue2H) {
              return h(errorHandler.fallbackComponent as Vue2Component, {
                props: { error },
              });
            },
          });
          fallbackVm.$mount(containerElement);
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
 * Vue2 Hydration
 *
 * Vue 2 的 hydration 通过在已有 SSR 内容的容器上挂载实现。
 * Vue 2 会自动检测并复用现有 DOM。
 *
 * @param options Hydration 选项
 * @param Vue 可选的 Vue 构造函数，如果未提供则从全局获取
 * @returns Hydration 结果
 *
 * @example
 * ```typescript
 * import Vue from "vue";
 * import { hydrate } from "@dreamer/render/client/adapters/vue2";
 *
 * const result = hydrate({
 *   component: MyComponent,
 *   container: "#app",
 * }, Vue);
 * ```
 */
export function hydrate(
  options: HydrationOptions,
  Vue?: Vue2Constructor,
): CSRRenderResult {
  const {
    component,
    props = {},
    layouts,
    skipLayouts,
    container,
    errorHandler,
    performance: perfOptions,
  } = options;

  // 获取 Vue 构造函数
  const VueConstructor = Vue || getVue();
  if (!VueConstructor) {
    throw new Error(
      "Vue 构造函数未找到。请确保已引入 Vue 2.7+，或将 Vue 作为第二个参数传入。",
    );
  }

  // 性能监控
  const perfMonitor = createPerformanceMonitor(perfOptions);
  if (perfMonitor) {
    perfMonitor.start("vue2", "hydrate");
  }

  // 获取容器元素
  const containerElement = typeof container === "string"
    ? document.querySelector(container) as HTMLElement
    : container;

  if (!containerElement) {
    throw new Error(`容器元素未找到: ${container}`);
  }

  // 创建 Vue 实例
  let vm: Vue2Instance;

  try {
    // 检查组件是否导出了 inheritLayout = false
    const shouldSkip = skipLayouts || shouldSkipLayouts(component);

    // 创建 Vue 实例
    // Vue 2 会自动检测容器中的 SSR 内容并进行 hydration
    vm = new VueConstructor({
      render(h: Vue2H) {
        return createWrapperVNode(
          h,
          component as Vue2Component,
          props,
          layouts,
          shouldSkip,
        );
      },
      // 错误捕获
      errorCaptured(err: Error) {
        handleRenderError(
          err,
          { engine: "vue2", component, phase: "hydrate" },
          errorHandler,
        );
        return false;
      },
    });

    // 挂载到容器（Vue 2 会自动进行 hydration）
    // 注意：Vue 2 需要容器内的第一个元素作为挂载点
    vm.$mount(containerElement);

    // 结束性能监控
    let performanceMetrics;
    if (perfMonitor) {
      performanceMetrics = perfMonitor.end();
      recordPerformanceMetrics(performanceMetrics, perfOptions);
    }

    // 返回卸载函数和更新函数
    return {
      unmount: () => {
        vm.$destroy();
        if (vm.$el && vm.$el.parentNode) {
          vm.$el.parentNode.removeChild(vm.$el);
        }
      },
      update: (newProps: Record<string, unknown>) => {
        // Vue 2 不支持直接更新根组件 props
        // 需要销毁并重新创建
        vm.$destroy();
        if (vm.$el && vm.$el.parentNode) {
          vm.$el.parentNode.removeChild(vm.$el);
        }

        const newVm = new VueConstructor({
          render(h: Vue2H) {
            return createWrapperVNode(
              h,
              component as Vue2Component,
              newProps,
              layouts,
              shouldSkip,
            );
          },
        });
        newVm.$mount(containerElement);
        vm = newVm;
      },
      instance: vm,
      performance: performanceMetrics,
    };
  } catch (error) {
    // 处理错误
    handleRenderError(
      error,
      { engine: "vue2", component, phase: "hydrate" },
      errorHandler,
    ).then((shouldUseFallback) => {
      if (shouldUseFallback && errorHandler?.fallbackComponent) {
        // 使用降级组件
        try {
          containerElement.innerHTML = "";
          const fallbackVm = new VueConstructor({
            render(h: Vue2H) {
              return h(errorHandler.fallbackComponent as Vue2Component, {
                props: { error },
              });
            },
          });
          fallbackVm.$mount(containerElement);
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

/**
 * 创建包装虚拟节点
 *
 * 将页面组件和布局组件组合成一个嵌套的虚拟节点树
 *
 * @param h Vue 的 createElement 函数
 * @param component 页面组件
 * @param props 页面属性
 * @param layouts 布局组件列表
 * @param skipLayouts 是否跳过布局
 * @returns 虚拟节点
 */
function createWrapperVNode(
  h: Vue2H,
  component: Vue2Component,
  props: Record<string, unknown>,
  layouts:
    | Array<{ component: unknown; props?: Record<string, unknown> }>
    | undefined,
  skipLayouts: boolean,
): Vue2VNode {
  // 如果没有布局或跳过布局，直接返回页面组件
  if (skipLayouts || !layouts || layouts.length === 0) {
    return h(component, { props });
  }

  // 从内到外构建组件树
  // 最内层是页面组件
  let currentElement = h(component, { props });

  // 从最内层布局开始包装
  for (let i = layouts.length - 1; i >= 0; i--) {
    const layout = layouts[i];
    const layoutComponent = layout.component as Vue2Component;
    const layoutProps = layout.props || {};

    // Vue 2 的 slot 写法
    currentElement = h(
      layoutComponent,
      { props: layoutProps },
      [currentElement],
    );
  }

  return currentElement;
}
