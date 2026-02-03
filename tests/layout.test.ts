/**
 * 布局继承测试
 *
 * 测试服务端和客户端的布局继承功能
 * 包括：
 * - inheritLayout = false 跳过布局继承
 * - 多层嵌套布局
 * - 布局过滤（skip 属性）
 */

import { describe, expect, it } from "@dreamer/test";

// 服务端布局工具
import {
  composeLayouts as serverComposeLayouts,
  createComponentTree as serverCreateComponentTree,
  filterLayouts,
  shouldSkipLayouts as serverShouldSkipLayouts,
} from "../src/utils/layout.ts";

// 客户端布局工具
import {
  composeLayouts as clientComposeLayouts,
  createComponentTree as clientCreateComponentTree,
  shouldSkipLayouts as clientShouldSkipLayouts,
} from "../src/client/utils/layout.ts";

describe("布局继承测试", () => {
  // ==================== 服务端 shouldSkipLayouts 测试 ====================

  describe("服务端 shouldSkipLayouts", () => {
    it("组件直接导出 inheritLayout = false 应该返回 true", () => {
      const component = { inheritLayout: false };
      expect(serverShouldSkipLayouts(component)).toBe(true);
    });

    it("组件 default export 有 inheritLayout = false 应该返回 true", () => {
      // 模拟 ES 模块：export default { inheritLayout: false }
      const module = {
        default: { inheritLayout: false },
      };
      expect(serverShouldSkipLayouts(module)).toBe(true);
    });

    it("函数组件带 inheritLayout = false 属性应该返回 true", () => {
      // 模拟：const Page = () => {}; Page.inheritLayout = false; export default Page;
      const Page = () => null;
      (Page as any).inheritLayout = false;
      expect(serverShouldSkipLayouts(Page)).toBe(true);
    });

    it("组件没有 inheritLayout 属性应该返回 false", () => {
      const component = {};
      expect(serverShouldSkipLayouts(component)).toBe(false);
    });

    it("组件 inheritLayout = true 应该返回 false", () => {
      const component = { inheritLayout: true };
      expect(serverShouldSkipLayouts(component)).toBe(false);
    });

    it("null 和 undefined 应该返回 false", () => {
      expect(serverShouldSkipLayouts(null)).toBe(false);
      expect(serverShouldSkipLayouts(undefined)).toBe(false);
    });

    it("default export 没有 inheritLayout 属性应该返回 false", () => {
      const module = {
        default: { name: "Page" },
      };
      expect(serverShouldSkipLayouts(module)).toBe(false);
    });
  });

  // ==================== 客户端 shouldSkipLayouts 测试 ====================

  describe("客户端 shouldSkipLayouts", () => {
    it("组件有 inheritLayout = false 应该返回 true", () => {
      const component = { inheritLayout: false };
      expect(clientShouldSkipLayouts(component)).toBe(true);
    });

    it("函数组件带 inheritLayout = false 属性应该返回 true", () => {
      const Page = () => null;
      (Page as any).inheritLayout = false;
      expect(clientShouldSkipLayouts(Page)).toBe(true);
    });

    it("组件没有 inheritLayout 属性应该返回 false", () => {
      expect(clientShouldSkipLayouts({})).toBe(false);
    });

    it("组件 inheritLayout = true 应该返回 false", () => {
      expect(clientShouldSkipLayouts({ inheritLayout: true })).toBe(false);
    });

    it("非对象应该返回 false", () => {
      expect(clientShouldSkipLayouts(null)).toBe(false);
      expect(clientShouldSkipLayouts(undefined)).toBe(false);
      expect(clientShouldSkipLayouts("string")).toBe(false);
      expect(clientShouldSkipLayouts(123)).toBe(false);
    });
  });

  // ==================== 服务端 filterLayouts 测试 ====================

  describe("服务端 filterLayouts", () => {
    it("应该过滤掉 skip = true 的布局", () => {
      const layouts = [
        { component: "Layout1" },
        { component: "Layout2", skip: true },
        { component: "Layout3" },
      ];
      const result = filterLayouts(layouts);
      expect(result.length).toBe(2);
      expect(result[0].component).toBe("Layout1");
      expect(result[1].component).toBe("Layout3");
    });

    it("空数组应该返回空数组", () => {
      expect(filterLayouts([])).toEqual([]);
    });

    it("undefined 应该返回空数组", () => {
      expect(filterLayouts(undefined)).toEqual([]);
    });

    it("所有布局都 skip = true 应该返回空数组", () => {
      const layouts = [
        { component: "Layout1", skip: true },
        { component: "Layout2", skip: true },
      ];
      expect(filterLayouts(layouts)).toEqual([]);
    });
  });

  // ==================== 服务端 composeLayouts 测试 ====================

  describe("服务端 composeLayouts", () => {
    it("无布局时应该返回原组件", () => {
      const component = "Page";
      const props = { title: "Hello" };

      const result = serverComposeLayouts("preact", component, props, []);

      expect((result as any).component).toBe(component);
      expect((result as any).props).toEqual(props);
    });

    it("skipLayouts = true 时应该跳过所有布局", () => {
      const component = "Page";
      const props = { title: "Hello" };
      const layouts = [{ component: "Layout" }];

      const result = serverComposeLayouts(
        "preact",
        component,
        props,
        layouts,
        true,
      );

      expect((result as any).component).toBe(component);
      expect((result as any).props).toEqual(props);
    });

    it("单层布局应该正确包装", () => {
      const component = "Page";
      const props = { title: "Page Title" };
      const layouts = [{ component: "MainLayout", props: { theme: "dark" } }];

      const result = serverComposeLayouts("preact", component, props, layouts);

      // 外层是布局组件
      expect((result as any).component).toBe("MainLayout");
      expect((result as any).props.theme).toBe("dark");
      // children 是页面组件
      expect((result as any).props.children.component).toBe("Page");
      expect((result as any).props.children.props.title).toBe("Page Title");
    });

    it("多层嵌套布局应该正确组合（从外到内）", () => {
      const component = "Page";
      const props = { title: "Page" };
      const layouts = [
        { component: "RootLayout", props: { root: true } },
        { component: "MainLayout", props: { main: true } },
        { component: "SidebarLayout", props: { sidebar: true } },
      ];

      const result = serverComposeLayouts(
        "react",
        component,
        props,
        layouts,
      );

      // 第一层：RootLayout
      expect((result as any).component).toBe("RootLayout");
      expect((result as any).props.root).toBe(true);

      // 第二层：MainLayout
      const level2 = (result as any).props.children;
      expect(level2.component).toBe("MainLayout");
      expect(level2.props.main).toBe(true);

      // 第三层：SidebarLayout
      const level3 = level2.props.children;
      expect(level3.component).toBe("SidebarLayout");
      expect(level3.props.sidebar).toBe(true);

      // 第四层（最内层）：Page
      const level4 = level3.props.children;
      expect(level4.component).toBe("Page");
      expect(level4.props.title).toBe("Page");
    });

    it("应该过滤掉 skip = true 的布局", () => {
      const component = "Page";
      const props = {};
      const layouts = [
        { component: "Layout1" },
        { component: "Layout2", skip: true },
        { component: "Layout3" },
      ];

      const result = serverComposeLayouts("preact", component, props, layouts);

      // 第一层：Layout1
      expect((result as any).component).toBe("Layout1");
      // 第二层：Layout3（跳过了 Layout2）
      expect((result as any).props.children.component).toBe("Layout3");
      // 第三层：Page
      expect((result as any).props.children.props.children.component).toBe(
        "Page",
      );
    });
  });

  // ==================== 客户端 composeLayouts 测试 ====================

  describe("客户端 composeLayouts", () => {
    it("无布局时应该返回原组件", () => {
      const component = "Page";
      const props = { title: "Hello" };

      const result = clientComposeLayouts("preact", component, props, [], false);

      expect(result.component).toBe(component);
      expect(result.props).toEqual(props);
    });

    it("skipLayouts = true 时应该跳过所有布局", () => {
      const component = "Page";
      const props = { title: "Hello" };
      const layouts = [{ component: "Layout" }];

      const result = clientComposeLayouts(
        "preact",
        component,
        props,
        layouts,
        true,
      );

      expect(result.component).toBe(component);
      expect(result.props).toEqual(props);
    });

    it("多层嵌套布局应该正确组合", () => {
      const component = "Page";
      const props = { title: "Page" };
      const layouts = [
        { component: "OuterLayout", props: { outer: true } },
        { component: "InnerLayout", props: { inner: true } },
      ];

      const result = clientComposeLayouts(
        "react",
        component,
        props,
        layouts,
        false,
      );

      // 第一层：OuterLayout
      expect(result.component).toBe("OuterLayout");
      expect(result.props.outer).toBe(true);

      // 第二层：InnerLayout
      const level2 = result.props.children as any;
      expect(level2.component).toBe("InnerLayout");
      expect(level2.props.inner).toBe(true);

      // 第三层：Page
      const level3 = level2.props.children as any;
      expect(level3.component).toBe("Page");
      expect(level3.props.title).toBe("Page");
    });
  });

  // ==================== 服务端 createComponentTree 测试 ====================

  describe("服务端 createComponentTree", () => {
    // Mock createElement
    const mockCreateElement = (
      component: unknown,
      props: unknown,
      ...children: unknown[]
    ) => ({
      type: component,
      props: props,
      children: children.length === 1 ? children[0] : children,
    });

    it("应该创建简单组件", () => {
      const config = {
        component: "div",
        props: { className: "test" },
      };

      const result = serverCreateComponentTree(
        mockCreateElement,
        config,
      ) as any;

      expect(result.type).toBe("div");
      expect(result.props.className).toBe("test");
    });

    it("应该递归创建嵌套组件", () => {
      const config = {
        component: "Layout",
        props: {
          theme: "dark",
          children: {
            component: "Page",
            props: { title: "Hello" },
          },
        },
      };

      const result = serverCreateComponentTree(
        mockCreateElement,
        config,
      ) as any;

      expect(result.type).toBe("Layout");
      expect(result.props.theme).toBe("dark");
      // children 应该是渲染后的子组件
      expect(result.children.type).toBe("Page");
      expect(result.children.props.title).toBe("Hello");
    });

    it("应该处理多层嵌套", () => {
      const config = {
        component: "RootLayout",
        props: {
          children: {
            component: "MainLayout",
            props: {
              children: {
                component: "Page",
                props: { content: "Hello World" },
              },
            },
          },
        },
      };

      const result = serverCreateComponentTree(
        mockCreateElement,
        config,
      ) as any;

      expect(result.type).toBe("RootLayout");
      expect(result.children.type).toBe("MainLayout");
      expect(result.children.children.type).toBe("Page");
      expect(result.children.children.props.content).toBe("Hello World");
    });

    it("应该处理 children 数组", () => {
      const config = {
        component: "Layout",
        props: {
          children: [
            { component: "Header", props: {} },
            { component: "Content", props: {} },
            { component: "Footer", props: {} },
          ],
        },
      };

      const result = serverCreateComponentTree(
        mockCreateElement,
        config,
      ) as any;

      expect(result.type).toBe("Layout");
      expect(Array.isArray(result.children)).toBe(true);
      expect(result.children.length).toBe(3);
      expect(result.children[0].type).toBe("Header");
      expect(result.children[1].type).toBe("Content");
      expect(result.children[2].type).toBe("Footer");
    });
  });

  // ==================== 客户端 createComponentTree 测试 ====================

  describe("客户端 createComponentTree", () => {
    const mockCreateElement = (
      component: unknown,
      props: unknown,
      ...children: unknown[]
    ) => ({
      type: component,
      props: props,
      children: children.length === 1 ? children[0] : children,
    });

    it("应该创建简单组件", () => {
      const config = {
        component: "div",
        props: { className: "test" },
      };

      const result = clientCreateComponentTree(
        mockCreateElement,
        config,
      ) as any;

      expect(result.type).toBe("div");
      expect(result.props.className).toBe("test");
    });

    it("应该递归创建嵌套组件", () => {
      const config = {
        component: "Layout",
        props: {
          theme: "dark",
          children: {
            component: "Page",
            props: { title: "Hello" },
          },
        },
      };

      const result = clientCreateComponentTree(
        mockCreateElement,
        config,
      ) as any;

      expect(result.type).toBe("Layout");
      expect(result.props.children.type).toBe("Page");
    });
  });

  // ==================== 实际场景测试 ====================

  describe("实际场景测试", () => {
    it("页面组件 inheritLayout = false 应该完全跳过布局", () => {
      // 模拟页面组件：export const inheritLayout = false; export default Page;
      const PageComponent = () => null;
      (PageComponent as any).inheritLayout = false;

      // 检查服务端
      expect(serverShouldSkipLayouts(PageComponent)).toBe(true);
      // 检查客户端
      expect(clientShouldSkipLayouts(PageComponent)).toBe(true);

      // 即使有布局定义，也应该被跳过
      const layouts = [
        { component: "RootLayout" },
        { component: "MainLayout" },
      ];

      // 服务端
      const serverResult = serverComposeLayouts(
        "preact",
        PageComponent,
        { id: 1 },
        layouts,
        true, // skipLayouts 由 shouldSkipLayouts 的结果决定
      );
      expect((serverResult as any).component).toBe(PageComponent);

      // 客户端
      const clientResult = clientComposeLayouts(
        "preact",
        PageComponent,
        { id: 1 },
        layouts,
        true,
      );
      expect(clientResult.component).toBe(PageComponent);
    });

    it("三层嵌套布局应该正确渲染", () => {
      // 模拟实际的布局结构
      const RootLayout = { name: "RootLayout" };
      const MainLayout = { name: "MainLayout" };
      const PageLayout = { name: "PageLayout" };
      const Page = { name: "Page" };

      const layouts = [
        { component: RootLayout, props: { lang: "zh-CN" } },
        { component: MainLayout, props: { sidebar: true } },
        { component: PageLayout, props: { padding: true } },
      ];

      const result = serverComposeLayouts("react", Page, { id: 1 }, layouts);

      // 验证嵌套结构
      const r = result as any;
      expect(r.component).toBe(RootLayout);
      expect(r.props.lang).toBe("zh-CN");

      expect(r.props.children.component).toBe(MainLayout);
      expect(r.props.children.props.sidebar).toBe(true);

      expect(r.props.children.props.children.component).toBe(PageLayout);
      expect(r.props.children.props.children.props.padding).toBe(true);

      expect(r.props.children.props.children.props.children.component).toBe(
        Page,
      );
      expect(r.props.children.props.children.props.children.props.id).toBe(1);
    });
  });
});
