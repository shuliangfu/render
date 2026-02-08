/**
 * 布局工具函数（客户端版本）
 *
 * 仅包含浏览器端渲染所需的布局处理功能
 */

import type { LayoutComponent } from "../types.ts";

/**
 * 检查组件是否应该跳过布局继承
 *
 * 支持以下几种写法：
 * 1. 对象组件：{ inheritLayout: false }
 * 2. 函数组件：const Page = () => {}; Page.inheritLayout = false;
 * 3. ES 模块：{ default: { inheritLayout: false } }
 * 4. 页面文件导出：export const inheritLayout = false;
 *
 * @param component 组件
 * @returns 是否跳过布局
 */
export function shouldSkipLayouts(component: unknown): boolean {
  // null、undefined 或非对象/函数类型返回 false
  if (component === null || component === undefined) {
    return false;
  }

  // 只处理对象和函数类型
  if (typeof component !== "object" && typeof component !== "function") {
    return false;
  }

  // 检查组件的 inheritLayout 属性（支持对象和函数组件）
  const comp = component as Record<string, unknown>;

  // 检查直接的 inheritLayout 属性
  if ("inheritLayout" in comp && comp.inheritLayout === false) {
    return true;
  }

  // 检查 default export 的对象是否有 inheritLayout 属性
  if (
    "default" in comp && typeof comp.default === "object" &&
    comp.default !== null
  ) {
    const defaultComp = comp.default as Record<string, unknown>;
    if ("inheritLayout" in defaultComp && defaultComp.inheritLayout === false) {
      return true;
    }
  }

  return false;
}

/**
 * 组合布局和组件配置
 *
 * @param engine 引擎类型
 * @param component 页面组件
 * @param props 组件属性
 * @param layouts 布局列表
 * @param skipLayouts 是否跳过布局
 * @returns 组合后的配置
 */
export function composeLayouts(
  _engine: string,
  component: unknown,
  props: Record<string, unknown>,
  layouts: LayoutComponent[],
  skipLayouts: boolean,
): { component: unknown; props: Record<string, unknown> } {
  if (skipLayouts || !layouts || layouts.length === 0) {
    return { component, props };
  }

  // 从内到外包装组件，过滤掉 component 为 undefined 的布局（避免 "undefined is not a function"）
  // 允许：function（组件）、object（如 forwardRef）、string（组件标识符，如 "OuterLayout"）
  const validLayouts = layouts.filter(
    (l) =>
      l.component != null &&
      (typeof l.component === "function" ||
        typeof l.component === "object" ||
        typeof l.component === "string"),
  );

  let wrapped: { component: unknown; props: Record<string, unknown> } = {
    component,
    props,
  };

  // 从最内层布局开始包装
  for (let i = validLayouts.length - 1; i >= 0; i--) {
    const layout = validLayouts[i];
    wrapped = {
      component: layout.component,
      props: {
        ...layout.props,
        children: wrapped,
      },
    };
  }

  return wrapped;
}

/**
 * 创建组件树
 *
 * @param createElement 创建元素函数
 * @param config 组件配置
 * @returns 元素树
 */
export function createComponentTree(
  createElement: (
    type: unknown,
    props: unknown,
    ...children: unknown[]
  ) => unknown,
  config: { component: unknown; props: Record<string, unknown> },
): unknown {
  const { component, props } = config;

  // 防御：component 为 undefined 时 Preact/React 会报 "(void 0) is not a function"
  // 允许：function（组件）、object（如 forwardRef）、string（原生元素如 "div"）
  if (
    component == null ||
    (typeof component !== "function" && typeof component !== "object" && typeof component !== "string")
  ) {
    const actual = component === undefined ? "undefined" : typeof component;
    throw new Error(
      `createComponentTree: invalid component (expected function, object or string, actual: ${actual})`,
    );
  }

  // 处理嵌套的 children
  if (props.children && typeof props.children === "object") {
    const childConfig = props.children as {
      component: unknown;
      props: Record<string, unknown>;
    };
    if (childConfig.component) {
      const childElement = createComponentTree(createElement, childConfig);
      return createElement(component, { ...props, children: childElement });
    }
    // 当 childConfig 存在但 component 为 falsy 时，不将 childConfig 传给 createElement
    // 否则 Preact 会尝试渲染 children，导致 "(void 0) is not a function"（常见于 Windows 下路径匹配失败）
    return createElement(component, { ...props, children: undefined });
  }

  return createElement(component, props);
}
