/**
 * View 客户端适配器单元测试（view、view-csr、view-hybrid）
 *
 * 测试 buildViewTree、导出完整性；CSR/hydrate 需浏览器环境，见 client-browser.test.ts
 *
 * 说明：@dreamer/view 的 VNode 为 `jsx` 返回的 **Thunk**（`() => unknown`），不再有 `{ type, props }` 对象形态；
 * 布局组合结构在 **composeLayouts** 的配置对象上断言，buildViewTree 仅断言产出为 Thunk。
 */

import { describe, expect, it } from "@dreamer/test";
import { jsx } from "@dreamer/view/jsx-runtime";
import * as viewFull from "../src/client/adapters/view.ts";
import * as viewCsr from "../src/client/adapters/view-csr.ts";
import * as viewHybrid from "../src/client/adapters/view-hybrid.ts";
import { composeLayouts } from "../src/client/utils/layout.ts";

/** 简单页面组件，供 buildViewTree 使用 */
function PageComponent(_props: Record<string, unknown>) {
  return jsx("div", { class: "page", children: "Page" }, undefined);
}

/** 布局组件 */
function LayoutComponent(props: { children?: unknown }) {
  return jsx("div", { class: "layout", children: props.children }, undefined);
}

describe("view 客户端适配器（完整）", () => {
  it("应导出 renderCSR、hydrate、buildViewTree、createReactiveRoot、createReactiveRootHydrate", () => {
    expect(typeof viewFull.renderCSR).toBe("function");
    expect(typeof viewFull.hydrate).toBe("function");
    expect(typeof viewFull.buildViewTree).toBe("function");
    expect(typeof viewFull.createReactiveRoot).toBe("function");
    expect(typeof viewFull.createReactiveRootHydrate).toBe("function");
  });

  it("buildViewTree 应返回根 VNode（Thunk，无 layout）", () => {
    const vnode = viewFull.buildViewTree(PageComponent, {}, undefined, false);
    expect(vnode).toBeDefined();
    expect(typeof vnode).toBe("function");
  });

  it("composeLayouts 单层 layout 应外包 Page", () => {
    const cfg = composeLayouts(
      "view",
      PageComponent,
      {},
      [{ component: LayoutComponent }],
      false,
    );
    expect(cfg.component).toBe(LayoutComponent);
    const inner = cfg.props.children as {
      component: typeof PageComponent;
      props: Record<string, unknown>;
    };
    expect(inner.component).toBe(PageComponent);
  });

  it("buildViewTree 应支持 skipLayouts（仍为 Thunk）", () => {
    const vnode = viewFull.buildViewTree(
      PageComponent,
      {},
      [{ component: LayoutComponent }],
      true,
    );
    expect(typeof vnode).toBe("function");
  });

  it("skipLayouts 时 composeLayouts 不外包布局", () => {
    const cfg = composeLayouts(
      "view",
      PageComponent,
      {},
      [{ component: LayoutComponent }],
      true,
    );
    expect(cfg.component).toBe(PageComponent);
  });
});

describe("view-csr 客户端适配器", () => {
  it("应仅导出 renderCSR、buildViewTree（无 hydrate）", () => {
    expect(typeof viewCsr.renderCSR).toBe("function");
    expect(typeof viewCsr.buildViewTree).toBe("function");
    expect(viewCsr).not.toHaveProperty("hydrate");
    expect(viewCsr).not.toHaveProperty("createReactiveRootHydrate");
  });

  it("buildViewTree 应返回根 VNode（Thunk）", () => {
    const vnode = viewCsr.buildViewTree(PageComponent, {}, undefined, false);
    expect(vnode).toBeDefined();
    expect(typeof vnode).toBe("function");
  });

  it("composeLayouts 与 buildViewTree 一致：带 layouts 时外层为 Layout", () => {
    const cfg = composeLayouts(
      "view",
      PageComponent,
      { id: "1" },
      [{ component: LayoutComponent }],
      false,
    );
    expect(cfg.component).toBe(LayoutComponent);
    const inner = cfg.props.children as {
      component: typeof PageComponent;
      props: Record<string, unknown>;
    };
    expect(inner.component).toBe(PageComponent);
    expect(inner.props.id).toBe("1");
  });
});

describe("view-hybrid 客户端适配器", () => {
  it("应导出 hydrate、buildViewTree、createReactiveRoot、createReactiveRootHydrate（无 renderCSR）", () => {
    expect(typeof viewHybrid.hydrate).toBe("function");
    expect(typeof viewHybrid.buildViewTree).toBe("function");
    expect(typeof viewHybrid.createReactiveRoot).toBe("function");
    expect(typeof viewHybrid.createReactiveRootHydrate).toBe("function");
    expect(viewHybrid).not.toHaveProperty("renderCSR");
  });

  it("buildViewTree 应返回根 VNode（Thunk）", () => {
    const vnode = viewHybrid.buildViewTree(PageComponent, {}, undefined, false);
    expect(typeof vnode).toBe("function");
  });

  it("composeLayouts 多层 layouts 应自外向内包裹", () => {
    const Outer = (p: { children?: unknown }) =>
      jsx("div", { class: "outer", children: p.children }, undefined);
    const cfg = composeLayouts(
      "view",
      PageComponent,
      {},
      [
        { component: Outer },
        { component: LayoutComponent },
      ],
      false,
    );
    expect(cfg.component).toBe(Outer);
    const mid = cfg.props.children as {
      component: typeof LayoutComponent;
      props: { children?: { component: typeof PageComponent } };
    };
    expect(mid.component).toBe(LayoutComponent);
    expect(mid.props.children?.component).toBe(PageComponent);
  });
});
