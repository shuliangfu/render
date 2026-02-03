/**
 * 布局组合工具函数
 *
 * 用于将多层布局组件和页面组件组合成完整的组件树
 */

import type { LayoutComponent } from "../types.ts";

/**
 * 检查组件是否导出了 inheritLayout = false
 *
 * 用于跳过布局继承，页面组件可以导出：
 * ```typescript
 * export const inheritLayout = false;
 * ```
 *
 * @param component 组件
 * @returns 如果组件导出了 inheritLayout = false，返回 true
 */
export function shouldSkipLayouts(component: unknown): boolean {
  // 支持函数组件和对象组件
  if (component === null || component === undefined) {
    return false;
  }

  const comp = component as Record<string, unknown>;

  // 检查是否有 inheritLayout 导出（支持函数组件和对象组件）
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
 * 过滤布局列表，移除 skip 为 true 的布局
 *
 * @param layouts 布局列表
 * @returns 过滤后的布局列表
 */
export function filterLayouts(layouts?: LayoutComponent[]): LayoutComponent[] {
  if (!layouts || layouts.length === 0) {
    return [];
  }
  return layouts.filter((layout) => !layout.skip);
}

/**
 * 组合布局和组件（React/Preact）
 *
 * @param engine 模板引擎类型
 * @param component 页面组件
 * @param props 页面组件属性
 * @param layouts 布局组件列表（从外到内）
 * @param skipLayouts 是否跳过所有布局
 * @returns 组合后的组件元素
 */
export function composeLayouts(
  _engine: "react" | "preact",
  component: unknown,
  props: Record<string, unknown> = {},
  layouts?: LayoutComponent[],
  skipLayouts = false,
): unknown {
  // 如果跳过布局或没有布局，直接返回组件
  if (skipLayouts || !layouts || layouts.length === 0) {
    return { component, props };
  }

  // 过滤掉 skip 为 true 的布局
  const filteredLayouts = filterLayouts(layouts);
  if (filteredLayouts.length === 0) {
    return { component, props };
  }

  // 从内到外组合布局（最内层是页面组件）
  let currentComponent = component;
  let currentProps = props;

  // 反向遍历布局数组（从内到外）
  for (let i = filteredLayouts.length - 1; i >= 0; i--) {
    const layout = filteredLayouts[i];
    // 保存当前组件（将被作为 children 传递）
    const childComponent = currentComponent;
    const childProps = currentProps;
    // 将布局组件作为新的当前组件
    currentComponent = layout.component;
    // 将之前的组件作为 children 传递给布局组件
    currentProps = {
      ...layout.props,
      children: {
        component: childComponent,
        props: childProps,
      },
    };
  }

  return { component: currentComponent, props: currentProps };
}

/**
 * 递归创建 React/Preact 组件树
 *
 * @param createElement 创建元素的函数（React.createElement 或 preact.createElement）
 * @param componentConfig 组件配置 { component, props }
 * @returns 创建的元素
 */
export function createComponentTree(
  createElement: (
    component: unknown,
    props: unknown,
    ...children: unknown[]
  ) => unknown,
  componentConfig: { component: unknown; props: Record<string, unknown> },
): unknown {
  const { component, props } = componentConfig;

  // 提取 children（如果存在）
  const { children: childrenConfig, ...restProps } = props;

  // 如果 props 中有 children 配置，递归处理
  if (
    childrenConfig && typeof childrenConfig === "object" &&
    "component" in childrenConfig
  ) {
    const childElement = createComponentTree(
      createElement,
      childrenConfig as { component: unknown; props: Record<string, unknown> },
    );
    // children 应该作为第三个参数传递，而不是 props 的一部分
    return createElement(component, restProps, childElement);
  }

  // 如果有 children 数组，递归处理每个子组件
  if (Array.isArray(childrenConfig)) {
    const childElements = childrenConfig.map((child: unknown) => {
      if (typeof child === "object" && child !== null && "component" in child) {
        return createComponentTree(
          createElement,
          child as { component: unknown; props: Record<string, unknown> },
        );
      }
      return child;
    });
    // children 应该作为第三个参数传递
    return createElement(component, restProps, ...childElements);
  }

  // 普通组件，直接创建（没有 children）
  return createElement(component, restProps);
}
