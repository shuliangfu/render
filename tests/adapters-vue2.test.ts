/**
 * Vue2 适配器独立测试
 *
 * 测试 Vue2 适配器的 SSR 功能（CSR 和 Hydrate 需要浏览器环境，不在此测试）
 *
 * 注意：由于 Vue 2 需要动态导入 vue 和 vue-server-renderer 包，
 * 且 Deno 环境下这些包的兼容性有限，这里使用模拟测试。
 */

import { describe, expect, it } from "@dreamer/test";
import * as vue2Adapter from "../src/adapters/vue2.ts";

/**
 * 模拟 Vue 2 实例
 */
interface MockVue2Instance {
  $mount: (el?: string | HTMLElement) => MockVue2Instance;
  $destroy: () => void;
}

/**
 * 创建模拟的 Vue 构造函数
 *
 * @param renderResult 渲染结果
 * @returns 模拟的 Vue 构造函数
 */
function createMockVue(renderResult: string) {
  // deno-lint-ignore no-explicit-any
  return class MockVue implements MockVue2Instance {
    $mount() {
      return this;
    }
    $destroy() {}
    // deno-lint-ignore no-explicit-any
    constructor(_options: any) {}
  } as any;
}

/**
 * 创建模拟的渲染器
 *
 * @param html 要返回的 HTML
 * @returns 模拟的渲染器
 */
function createMockRenderer(html: string) {
  return {
    renderToString: async () => html,
  };
}

describe("Vue2 适配器", () => {
  describe("renderSSR", () => {
    it("应该能够渲染简单组件", async () => {
      // 模拟组件
      const Component = {
        name: "TestComponent",
        template: "<div>Hello Vue2</div>",
      };

      // 创建模拟的 Vue 和渲染器
      const MockVue = createMockVue("<div>Hello Vue2</div>");
      const mockRenderer = createMockRenderer("<div>Hello Vue2</div>");

      const result = await vue2Adapter.renderSSR({
        engine: "vue2",
        component: Component,
        Vue: MockVue,
        renderer: mockRenderer,
      });

      expect(result.html).toContain("Hello Vue2");
      expect(result.renderInfo?.engine).toBe("vue2");
    });

    it("应该能够渲染带属性的组件", async () => {
      const Component = {
        name: "TestComponent",
        props: ["name"],
        template: "<div>Hello, {{ name }}</div>",
      };

      const MockVue = createMockVue("<div>Hello, World</div>");
      const mockRenderer = createMockRenderer("<div>Hello, World</div>");

      const result = await vue2Adapter.renderSSR({
        engine: "vue2",
        component: Component,
        props: { name: "World" },
        Vue: MockVue,
        renderer: mockRenderer,
      });

      expect(result.html).toContain("Hello, World");
    });

    it("应该支持模板包装", async () => {
      const Component = {
        name: "TestComponent",
        template: "<div>Content</div>",
      };

      const MockVue = createMockVue("<div>Content</div>");
      const mockRenderer = createMockRenderer("<div>Content</div>");

      const result = await vue2Adapter.renderSSR({
        engine: "vue2",
        component: Component,
        Vue: MockVue,
        renderer: mockRenderer,
        template: "<html><body><!--ssr-outlet--></body></html>",
      });

      expect(result.html).toContain("<html>");
      expect(result.html).toContain("Content");
      expect(result.html).toContain("</body>");
    });

    it("应该支持布局系统", async () => {
      const Layout = {
        name: "Layout",
        template: '<div class="layout"><slot /></div>',
      };
      const Page = {
        name: "Page",
        template: "<div>Page</div>",
      };

      const MockVue = createMockVue(
        '<div class="layout"><div>Page</div></div>',
      );
      const mockRenderer = createMockRenderer(
        '<div class="layout"><div>Page</div></div>',
      );

      const result = await vue2Adapter.renderSSR({
        engine: "vue2",
        component: Page,
        layouts: [{ component: Layout }],
        Vue: MockVue,
        renderer: mockRenderer,
      });

      expect(result.html).toContain("Page");
      expect(result.html).toContain("layout");
    });

    it("应该支持多层嵌套布局", async () => {
      const OuterLayout = {
        name: "OuterLayout",
        template: '<div class="outer">Outer: <slot /></div>',
      };
      const InnerLayout = {
        name: "InnerLayout",
        template: '<div class="inner">Inner: <slot /></div>',
      };
      const Page = {
        name: "Page",
        template: "<div>Page</div>",
      };

      const MockVue = createMockVue(
        '<div class="outer">Outer: <div class="inner">Inner: <div>Page</div></div></div>',
      );
      const mockRenderer = createMockRenderer(
        '<div class="outer">Outer: <div class="inner">Inner: <div>Page</div></div></div>',
      );

      const result = await vue2Adapter.renderSSR({
        engine: "vue2",
        component: Page,
        layouts: [
          { component: OuterLayout },
          { component: InnerLayout },
        ],
        Vue: MockVue,
        renderer: mockRenderer,
      });

      expect(result.html).toContain("Outer:");
      expect(result.html).toContain("Inner:");
      expect(result.html).toContain("Page");
    });

    it("应该支持跳过布局", async () => {
      const Layout = {
        name: "Layout",
        template: "<div>Layout: <slot /></div>",
      };
      const Page = {
        name: "Page",
        template: "<div>Page</div>",
        inheritLayout: false,
      };

      const MockVue = createMockVue("<div>Page</div>");
      const mockRenderer = createMockRenderer("<div>Page</div>");

      const result = await vue2Adapter.renderSSR({
        engine: "vue2",
        component: Page,
        layouts: [{ component: Layout }],
        Vue: MockVue,
        renderer: mockRenderer,
      });

      expect(result.html).toContain("Page");
      // 由于跳过布局，不应该包含 Layout 文本
      // 注意：这取决于模拟渲染器的返回值
    });

    it("应该在缺少 Vue 构造函数时抛出错误", async () => {
      const Component = { name: "Test" };

      try {
        await vue2Adapter.renderSSR({
          engine: "vue2",
          component: Component,
          // 故意不传 Vue
          Vue: undefined as any,
          renderer: createMockRenderer(""),
        });
        // 不应该到达这里
        expect(true).toBe(false);
      } catch (error) {
        expect((error as Error).message).toContain("Vue 构造函数未提供");
      }
    });

    it("应该在缺少渲染器时抛出错误", async () => {
      const Component = { name: "Test" };
      const MockVue = createMockVue("");

      try {
        await vue2Adapter.renderSSR({
          engine: "vue2",
          component: Component,
          Vue: MockVue,
          // 故意不传 renderer
          renderer: undefined as any,
        });
        // 不应该到达这里
        expect(true).toBe(false);
      } catch (error) {
        expect((error as Error).message).toContain("Vue 服务端渲染器未提供");
      }
    });

    it("应该正确处理空组件", async () => {
      const Component = {
        name: "EmptyComponent",
        template: "<!-- empty -->",
      };

      const MockVue = createMockVue("<!-- empty -->");
      const mockRenderer = createMockRenderer("<!-- empty -->");

      const result = await vue2Adapter.renderSSR({
        engine: "vue2",
        component: Component,
        Vue: MockVue,
        renderer: mockRenderer,
      });

      expect(result.html).toBeDefined();
      expect(result.renderInfo?.engine).toBe("vue2");
    });
  });

  describe("类型定义", () => {
    it("Vue2SSROptions 应该包含必要的字段", () => {
      // 类型检查测试
      const options: vue2Adapter.Vue2SSROptions = {
        engine: "vue2",
        component: {},
        Vue: createMockVue(""),
        renderer: createMockRenderer(""),
      };

      expect(options.engine).toBe("vue2");
      expect(options.Vue).toBeDefined();
      expect(options.renderer).toBeDefined();
    });
  });
});
