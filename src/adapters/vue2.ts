/**
 * Vue2 服务端渲染适配器
 *
 * 支持 Vue 2.7+ 版本的 SSR 功能
 *
 * 注意：客户端渲染（CSR）和 Hydration 已移至 @dreamer/render/client
 *
 * @module @dreamer/render/adapters/vue2
 */

import type { RenderResult, SSROptions } from "../types.ts";
import { injectComponentHtml } from "../utils/html-inject.ts";
import { filterLayouts, shouldSkipLayouts } from "../utils/layout.ts";

/**
 * Vue 2 组件类型
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
}

/**
 * Vue 2 构造函数类型
 */
interface Vue2Constructor {
  new (options: {
    render: (h: Vue2H) => Vue2VNode;
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
 * Vue 2 服务端渲染器类型
 */
interface Vue2Renderer {
  renderToString: (vm: Vue2Instance) => Promise<string>;
}

/**
 * Vue2 SSR 选项（扩展）
 */
export interface Vue2SSROptions extends SSROptions {
  /**
   * Vue 构造函数
   * 需要从 'vue' 包导入
   */
  Vue: Vue2Constructor;
  /**
   * Vue 服务端渲染器
   * 需要从 'vue-server-renderer' 包导入并调用 createRenderer()
   */
  renderer: Vue2Renderer;
}

/**
 * Vue2 服务端渲染
 *
 * @param options SSR 选项（包含 Vue 构造函数和渲染器）
 * @returns 渲染结果
 *
 * @example
 * ```typescript
 * import Vue from "vue";
 * import { createRenderer } from "vue-server-renderer";
 * import { renderSSR } from "@dreamer/render/adapters/vue2";
 *
 * const renderer = createRenderer();
 *
 * const result = await renderSSR({
 *   Vue,
 *   renderer,
 *   component: MyComponent,
 *   props: { name: "World" },
 * });
 *
 * console.log(result.html);
 * ```
 */
export async function renderSSR(
  options: Vue2SSROptions,
): Promise<RenderResult> {
  const {
    Vue,
    renderer,
    component,
    props = {},
    layouts,
    skipLayouts,
    template,
  } = options;

  if (!Vue) {
    throw new Error(
      "Vue 构造函数未提供。请将 Vue 作为 options.Vue 传入。",
    );
  }

  if (!renderer) {
    throw new Error(
      "Vue 服务端渲染器未提供。请将 renderer 作为 options.renderer 传入。" +
        "渲染器可通过 vue-server-renderer 的 createRenderer() 创建。",
    );
  }

  // 检查组件是否导出了 inheritLayout = false
  const shouldSkip = skipLayouts || shouldSkipLayouts(component);

  // 创建 Vue 实例
  let vm: Vue2Instance;

  if (layouts && layouts.length > 0 && !shouldSkip) {
    // 过滤掉 skip 为 true 的布局
    const filteredLayouts = filterLayouts(layouts);

    if (filteredLayouts.length > 0) {
      // 创建带布局的包装实例
      vm = new Vue({
        render(h: Vue2H) {
          return createWrapperVNode(
            h,
            component as Vue2Component,
            props,
            filteredLayouts,
          );
        },
      });
    } else {
      // 没有有效布局，直接渲染组件
      vm = new Vue({
        render(h: Vue2H) {
          return h(component as Vue2Component, { props });
        },
      });
    }
  } else {
    // 没有布局或跳过布局，直接渲染组件
    vm = new Vue({
      render(h: Vue2H) {
        return h(component as Vue2Component, { props });
      },
    });
  }

  // 渲染为字符串
  let html: string;
  try {
    html = await renderer.renderToString(vm);

    // 验证渲染结果
    if (typeof html !== "string") {
      console.error(
        `Vue2 渲染错误: renderToString 返回的不是字符串，类型: ${typeof html}，值:`,
        html,
      );
      html = String(html);
    }

    if (html === "[object Object]") {
      console.error(
        `Vue2 渲染错误: renderToString 返回的字符串是 "[object Object]"`,
      );
      throw new Error(
        "Vue2 渲染错误: 无法将渲染结果转换为有效的 HTML 字符串",
      );
    }
  } finally {
    // 无论成功还是失败，都要销毁 vm 释放资源，避免内存泄漏
    try {
      vm.$destroy();
    } catch {
      // 忽略销毁错误
    }
  }

  // 如果有模板，自动注入组件 HTML
  if (template) {
    html = injectComponentHtml(template, html);
  }

  return {
    html,
    styles: [],
    scripts: [],
    renderInfo: {
      engine: "vue2",
    },
  };
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
 * @returns 虚拟节点
 */
function createWrapperVNode(
  h: Vue2H,
  component: Vue2Component,
  props: Record<string, unknown>,
  layouts: Array<{ component: unknown; props?: Record<string, unknown> }>,
): Vue2VNode {
  // 从内到外构建组件树
  // 最内层是页面组件
  let currentElement = h(component, { props });

  // 从最内层布局开始包装
  for (let i = layouts.length - 1; i >= 0; i--) {
    const layout = layouts[i];
    const layoutComponent = layout.component as Vue2Component;
    const layoutProps = layout.props || {};

    // Vue 2 的 slot 通过 children 数组传递
    currentElement = h(
      layoutComponent,
      { props: layoutProps },
      [currentElement],
    );
  }

  return currentElement;
}
