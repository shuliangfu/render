/**
 * Layout composition utilities: combine layouts and page component into a single tree.
 *
 * @packageDocumentation
 */

import type { LayoutComponent } from "../types.ts";

/**
 * Whether the component exports inheritLayout = false (skip layout inheritance).
 *
 * @param component - Component (function or object with default)
 * @returns true if inheritLayout === false
 */
export function shouldSkipLayouts(component: unknown): boolean {
  if (component === null || component === undefined) {
    return false;
  }

  const comp = component as Record<string, unknown>;

  if ("inheritLayout" in comp && comp.inheritLayout === false) {
    return true;
  }

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
 * Filter out layouts with skip === true.
 *
 * @param layouts - Layout list
 * @returns Filtered layouts
 */
export function filterLayouts(layouts?: LayoutComponent[]): LayoutComponent[] {
  if (!layouts || layouts.length === 0) {
    return [];
  }
  return layouts.filter((layout) => !layout.skip);
}

/**
 * Compose layouts and page component (React/Preact/View).
 *
 * @param _engine - Engine type
 * @param component - Page component
 * @param props - Page props
 * @param layouts - Layouts outer to inner
 * @param skipLayouts - Skip all layouts
 * @returns Composed { component, props }
 */
export function composeLayouts(
  _engine: "react" | "preact" | "view",
  component: unknown,
  props: Record<string, unknown> = {},
  layouts?: LayoutComponent[],
  skipLayouts = false,
): unknown {
  if (skipLayouts || !layouts || layouts.length === 0) {
    return { component, props };
  }

  const filteredLayouts = filterLayouts(layouts);
  if (filteredLayouts.length === 0) {
    return { component, props };
  }

  let currentComponent = component;
  let currentProps = props;

  for (let i = filteredLayouts.length - 1; i >= 0; i--) {
    const layout = filteredLayouts[i];
    const childComponent = currentComponent;
    const childProps = currentProps;
    currentComponent = layout.component;
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
 * Recursively build React/Preact/View component tree.
 *
 * @param createElement - createElement(component, props, ...children)
 * @param componentConfig - { component, props } (children may be in props.children)
 * @returns Built element/VNode
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

  // Guard: undefined component causes "(void 0) is not a function"; allow function, object (e.g. forwardRef), string (e.g. "div")
  if (
    component == null ||
    (typeof component !== "function" && typeof component !== "object" &&
      typeof component !== "string")
  ) {
    const actual = component === undefined ? "undefined" : typeof component;
    throw new Error(
      `createComponentTree: invalid component (expected function, object or string, actual: ${actual})`,
    );
  }

  const { children: childrenConfig, ...restProps } = props;

  // If children is layout config { component, props }, recurse; skip when component is falsy to avoid "(void 0) is not a function"
  if (
    childrenConfig && typeof childrenConfig === "object" &&
    "component" in childrenConfig && "props" in childrenConfig
  ) {
    const childConfig = childrenConfig as {
      component: unknown;
      props: Record<string, unknown>;
    };
    if (childConfig.component) {
      const childElement = createComponentTree(
        createElement,
        childConfig,
      );
      return createElement(component, restProps, childElement);
    }
    return createElement(component, restProps, undefined);
  }

  if (Array.isArray(childrenConfig)) {
    const childElements = childrenConfig.map((child: unknown) => {
      if (typeof child === "object" && child !== null && "component" in child) {
        const cfg = child as {
          component: unknown;
          props: Record<string, unknown>;
        };
        if (cfg.component) {
          return createComponentTree(createElement, cfg);
        }
        // Skip falsy component to avoid "(void 0) is not a function"
        return null;
      }
      return child;
    });
    return createElement(component, restProps, ...childElements);
  }

  return createElement(component, restProps);
}
