/**
 * Vue3 客户端渲染适配器
 *
 * 仅包含浏览器端渲染功能（CSR、Hydration）
 * 支持错误处理、性能监控、布局组合
 */

import { type App, type Component, createApp, createSSRApp, h } from "vue";
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
 * 容器到 Vue App 的缓存映射
 * 使用 WeakMap 避免内存泄漏（当容器被移除时，缓存自动清理）
 */
const appCache = new WeakMap<HTMLElement, App>();

/**
 * 清理容器中缓存的 Vue App
 * 如果容器已有缓存的 app，先卸载避免内存泄漏
 *
 * @param container 容器元素
 */
function cleanupCachedApp(container: HTMLElement): void {
  const cachedApp = appCache.get(container);
  if (cachedApp) {
    try {
      cachedApp.unmount();
    } catch {
      // 忽略卸载错误
    }
    appCache.delete(container);
  }
}

/**
 * 缓存 Vue App 实例
 *
 * @param container 容器元素
 * @param app Vue App 实例
 */
function cacheApp(container: HTMLElement, app: App): void {
  appCache.set(container, app);
}

/**
 * Vue3 客户端渲染
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

  // 性能监控
  const perfMonitor = createPerformanceMonitor(perfOptions);
  if (perfMonitor) {
    perfMonitor.start("vue3", "csr");
  }

  // 获取容器元素
  const containerElement = typeof container === "string"
    ? document.querySelector(container) as HTMLElement
    : container;

  if (!containerElement) {
    throw new Error(`容器元素未找到: ${container}`);
  }

  // 创建 Vue 应用
  let app: App;

  try {
    // 清理旧的 Vue App（如果有），避免内存泄漏
    cleanupCachedApp(containerElement);

    // 检查组件是否导出了 inheritLayout = false
    const shouldSkip = skipLayouts || shouldSkipLayouts(component);

    // 创建包装组件（处理布局）
    const wrapperComponent = createWrapperComponent(
      component as Component,
      props,
      layouts,
      shouldSkip,
    );

    // 创建 Vue 应用
    app = createApp(wrapperComponent);

    // 配置全局错误处理
    app.config.errorHandler = (err: unknown) => {
      handleRenderError(
        err,
        { engine: "vue3", component, phase: "csr" },
        errorHandler,
      );
    };

    // 挂载到容器
    app.mount(containerElement);

    // 缓存 app 实例
    cacheApp(containerElement, app);

    // 结束性能监控
    let performanceMetrics;
    if (perfMonitor) {
      performanceMetrics = perfMonitor.end();
      recordPerformanceMetrics(performanceMetrics, perfOptions);
    }

    // 返回卸载函数和更新函数
    return {
      unmount: () => {
        app.unmount();
        // 从缓存中移除
        appCache.delete(containerElement);
      },
      update: (newProps: Record<string, unknown>) => {
        // Vue 3 不支持直接更新根组件 props
        // 需要卸载并重新挂载
        app.unmount();
        const newWrapper = createWrapperComponent(
          component as Component,
          newProps,
          layouts,
          shouldSkip,
        );
        const newApp = createApp(newWrapper);
        newApp.mount(containerElement);
        // 更新缓存
        cacheApp(containerElement, newApp);
      },
      instance: app,
      performance: performanceMetrics,
    };
  } catch (error) {
    // 处理错误
    handleRenderError(
      error,
      { engine: "vue3", component, phase: "csr" },
      errorHandler,
    ).then((shouldUseFallback) => {
      if (shouldUseFallback && errorHandler?.fallbackComponent) {
        // 使用降级组件
        try {
          cleanupCachedApp(containerElement);
          const fallbackApp = createApp(
            errorHandler.fallbackComponent as Component,
            { error },
          );
          fallbackApp.mount(containerElement);
          cacheApp(containerElement, fallbackApp);
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
        // 正确清理缓存的 app，避免内存泄漏
        cleanupCachedApp(containerElement);
      },
      instance: containerElement,
    };
  }
}

/**
 * Vue3 Hydration
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

  // 性能监控
  const perfMonitor = createPerformanceMonitor(perfOptions);
  if (perfMonitor) {
    perfMonitor.start("vue3", "hydrate");
  }

  // 获取容器元素
  const containerElement = typeof container === "string"
    ? document.querySelector(container) as HTMLElement
    : container;

  if (!containerElement) {
    throw new Error(`容器元素未找到: ${container}`);
  }

  // 创建 Vue 应用
  let app: App;

  try {
    // 清理旧的 Vue App（如果有），避免内存泄漏
    cleanupCachedApp(containerElement);

    // 检查组件是否导出了 inheritLayout = false
    const shouldSkip = skipLayouts || shouldSkipLayouts(component);

    // 创建包装组件（处理布局）
    const wrapperComponent = createWrapperComponent(
      component as Component,
      props,
      layouts,
      shouldSkip,
    );

    // 使用 createSSRApp 进行 hydration
    app = createSSRApp(wrapperComponent);

    // 配置全局错误处理
    app.config.errorHandler = (err: unknown) => {
      handleRenderError(
        err,
        { engine: "vue3", component, phase: "hydrate" },
        errorHandler,
      );
    };

    // 挂载到容器（Vue 会自动进行 hydration）
    app.mount(containerElement);

    // 缓存 app 实例
    cacheApp(containerElement, app);

    // 结束性能监控
    let performanceMetrics;
    if (perfMonitor) {
      performanceMetrics = perfMonitor.end();
      recordPerformanceMetrics(performanceMetrics, perfOptions);
    }

    // 返回卸载函数和更新函数
    return {
      unmount: () => {
        app.unmount();
        // 从缓存中移除
        appCache.delete(containerElement);
      },
      update: (newProps: Record<string, unknown>) => {
        // Vue 3 不支持直接更新根组件 props
        // 需要卸载并重新挂载
        app.unmount();
        const newWrapper = createWrapperComponent(
          component as Component,
          newProps,
          layouts,
          shouldSkip,
        );
        const newApp = createSSRApp(newWrapper);
        newApp.mount(containerElement);
        // 更新缓存
        cacheApp(containerElement, newApp);
      },
      instance: app,
      performance: performanceMetrics,
    };
  } catch (error) {
    // 处理错误
    handleRenderError(
      error,
      { engine: "vue3", component, phase: "hydrate" },
      errorHandler,
    ).then((shouldUseFallback) => {
      if (shouldUseFallback && errorHandler?.fallbackComponent) {
        // 使用降级组件
        try {
          cleanupCachedApp(containerElement);
          const fallbackApp = createSSRApp(
            errorHandler.fallbackComponent as Component,
            { error },
          );
          fallbackApp.mount(containerElement);
          cacheApp(containerElement, fallbackApp);
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
        cleanupCachedApp(containerElement);
      },
      instance: containerElement,
    };
  }
}

/**
 * 创建包装组件
 *
 * 将页面组件和布局组件组合成一个包装组件
 *
 * @param component 页面组件
 * @param props 页面属性
 * @param layouts 布局组件列表
 * @param skipLayouts 是否跳过布局
 * @returns 包装组件
 */
function createWrapperComponent(
  component: Component,
  props: Record<string, unknown>,
  layouts:
    | Array<{ component: unknown; props?: Record<string, unknown> }>
    | undefined,
  skipLayouts: boolean,
): Component {
  // 如果没有布局或跳过布局，直接返回页面组件
  if (skipLayouts || !layouts || layouts.length === 0) {
    return {
      name: "PageWrapper",
      render() {
        return h(component, props);
      },
    };
  }

  // 创建嵌套布局
  return {
    name: "LayoutWrapper",
    render() {
      // 从内到外构建组件树
      // 最内层是页面组件
      let currentElement = h(component, props);

      // 从最内层布局开始包装
      for (let i = layouts.length - 1; i >= 0; i--) {
        const layout = layouts[i];
        const layoutComponent = layout.component as Component;
        const layoutProps = layout.props || {};

        currentElement = h(
          layoutComponent,
          layoutProps,
          { default: () => currentElement },
        );
      }

      return currentElement;
    },
  };
}
