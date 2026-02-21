/**
 * View 客户端适配器单元测试（view、view-csr、view-hybrid）
 *
 * 测试 buildViewTree、导出完整性；CSR/hydrate 需浏览器环境，见 client-browser.test.ts
 */

import { describe, expect, it } from "@dreamer/test";
import { jsx } from "@dreamer/view/jsx-runtime";
import * as viewFull from "../src/client/adapters/view.ts";
import * as viewCsr from "../src/client/adapters/view-csr.ts";
import * as viewHybrid from "../src/client/adapters/view-hybrid.ts";

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

  it("buildViewTree 应返回根 VNode（无 layout）", () => {
    const vnode = viewFull.buildViewTree(PageComponent, {}, undefined, false);
    expect(vnode).toBeDefined();
    expect(typeof vnode).toBe("object");
    expect(vnode).toHaveProperty("type");
    expect(vnode).toHaveProperty("props");
    expect(vnode.type).toBe(PageComponent);
    expect(vnode.props).toBeDefined();
  });

  it("buildViewTree 应支持单层 layout", () => {
    const vnode = viewFull.buildViewTree(
      PageComponent,
      {},
      [{ component: LayoutComponent }],
      false,
    );
    expect(vnode).toBeDefined();
    expect(vnode).toHaveProperty("type");
    expect(vnode).toHaveProperty("props");
    expect(vnode.type).toBe(LayoutComponent);
    expect((vnode.props as Record<string, unknown>).children).toBeDefined();
  });

  it("buildViewTree 应支持 skipLayouts", () => {
    const vnode = viewFull.buildViewTree(
      PageComponent,
      {},
      [{ component: LayoutComponent }],
      true,
    );
    expect(vnode).toBeDefined();
    expect(vnode.type).toBe(PageComponent);
  });
});

describe("view-csr 客户端适配器", () => {
  it("应仅导出 renderCSR、buildViewTree（无 hydrate）", () => {
    expect(typeof viewCsr.renderCSR).toBe("function");
    expect(typeof viewCsr.buildViewTree).toBe("function");
    expect(viewCsr).not.toHaveProperty("hydrate");
    expect(viewCsr).not.toHaveProperty("createReactiveRootHydrate");
  });

  it("buildViewTree 应返回根 VNode", () => {
    const vnode = viewCsr.buildViewTree(PageComponent, {}, undefined, false);
    expect(vnode).toBeDefined();
    expect(vnode).toHaveProperty("type");
    expect(vnode).toHaveProperty("props");
    expect(vnode.type).toBe(PageComponent);
  });

  it("buildViewTree 应支持 layouts", () => {
    const vnode = viewCsr.buildViewTree(
      PageComponent,
      { id: "1" },
      [{ component: LayoutComponent }],
      false,
    );
    expect(vnode).toBeDefined();
    expect(vnode.type).toBe(LayoutComponent);
    expect((vnode.props as Record<string, unknown>).children).toBeDefined();
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

  it("buildViewTree 应返回根 VNode", () => {
    const vnode = viewHybrid.buildViewTree(PageComponent, {}, undefined, false);
    expect(vnode).toBeDefined();
    expect(vnode).toHaveProperty("type");
    expect(vnode).toHaveProperty("props");
    expect(vnode.type).toBe(PageComponent);
  });

  it("buildViewTree 应支持多层 layouts", () => {
    const Outer = (p: { children?: unknown }) =>
      jsx("div", { class: "outer", children: p.children }, undefined);
    const vnode = viewHybrid.buildViewTree(
      PageComponent,
      {},
      [
        { component: Outer },
        { component: LayoutComponent },
      ],
      false,
    );
    expect(vnode).toBeDefined();
    expect(vnode.type).toBe(Outer);
    expect((vnode.props as Record<string, unknown>).children).toBeDefined();
  });
});
