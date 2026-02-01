/**
 * Vue3 适配器独立测试
 *
 * 测试 Vue3 适配器的 SSR 功能（CSR 和 Hydrate 需要浏览器环境，不在此测试）
 */

import { assertRejects, describe, expect, it } from "@dreamer/test";
import { h } from "vue";
import * as vue3Adapter from "../src/adapters/vue3.ts";

describe("Vue3 适配器", () => {
  describe("renderSSR", () => {
    it("应该能够渲染简单组件", async () => {
      const Component = {
        setup() {
          return () => h("div", null, "Hello Vue3");
        },
      };

      const result = await vue3Adapter.renderSSR({
        engine: "vue3",
        component: Component,
      });

      expect(result.html).toContain("Hello Vue3");
      expect(result.renderInfo?.engine).toBe("vue3");
    });

    it("应该能够渲染带属性的组件", async () => {
      const Component = {
        props: ["name"],
        setup(props: { name: string }) {
          return () => h("div", null, `Hello, ${props.name}`);
        },
      };

      const result = await vue3Adapter.renderSSR({
        engine: "vue3",
        component: Component,
        props: { name: "World" },
      });

      expect(result.html).toContain("Hello, World");
    });

    it("应该支持模板包装", async () => {
      const Component = {
        setup() {
          return () => h("div", null, "Content");
        },
      };

      const result = await vue3Adapter.renderSSR({
        engine: "vue3",
        component: Component,
        template: "<html><body><!--ssr-outlet--></body></html>",
      });

      expect(result.html).toContain("<html>");
      expect(result.html).toContain("Content");
      expect(result.html).toContain("</body>");
    });

    it("应该支持布局系统", async () => {
      const Layout = {
        setup(_props: any, { slots }: any) {
          return () => h("div", { class: "layout" }, slots.default?.());
        },
      };
      const Page = {
        setup() {
          return () => h("div", null, "Page");
        },
      };

      const result = await vue3Adapter.renderSSR({
        engine: "vue3",
        component: Page,
        layouts: [{ component: Layout }],
      });

      expect(result.html).toContain("Page");
      expect(result.html).toContain("layout");
    });

    it("应该支持多层嵌套布局", async () => {
      const OuterLayout = {
        setup(_props: any, { slots }: any) {
          return () =>
            h("div", { class: "outer" }, ["Outer: ", slots.default?.()]);
        },
      };
      const InnerLayout = {
        setup(_props: any, { slots }: any) {
          return () =>
            h("div", { class: "inner" }, ["Inner: ", slots.default?.()]);
        },
      };
      const Page = {
        setup() {
          return () => h("div", null, "Page");
        },
      };

      const result = await vue3Adapter.renderSSR({
        engine: "vue3",
        component: Page,
        layouts: [
          { component: OuterLayout },
          { component: InnerLayout },
        ],
      });

      expect(result.html).toContain("Outer:");
      expect(result.html).toContain("Inner:");
      expect(result.html).toContain("Page");
    });

    it("应该支持跳过布局", async () => {
      const Layout = {
        setup(_props: any, { slots }: any) {
          return () => h("div", null, ["Layout: ", slots.default?.()]);
        },
      };
      const Page = {
        setup() {
          return () => h("div", null, "Page");
        },
      };
      (Page as any).inheritLayout = false;

      const result = await vue3Adapter.renderSSR({
        engine: "vue3",
        component: Page,
        layouts: [{ component: Layout }],
      });

      expect(result.html).toContain("Page");
      expect(result.html).not.toContain("Layout:");
    });

    it("应该支持复杂组件树", async () => {
      const Header = {
        setup() {
          return () => h("header", null, "Header");
        },
      };
      const Main = {
        setup(_props: any, { slots }: any) {
          return () => h("main", null, slots.default?.() || "Content");
        },
      };
      const Footer = {
        setup() {
          return () => h("footer", null, "Footer");
        },
      };
      const App = {
        setup() {
          return () =>
            h("div", null, [
              h(Header),
              h(Main, null, { default: () => "Content" }),
              h(Footer),
            ]);
        },
      };

      const result = await vue3Adapter.renderSSR({
        engine: "vue3",
        component: App,
      });

      expect(result.html).toContain("Header");
      expect(result.html).toContain("Content");
      expect(result.html).toContain("Footer");
    });

    it("应该正确处理空组件", async () => {
      const Component = {
        setup() {
          return () => null;
        },
      };

      const result = await vue3Adapter.renderSSR({
        engine: "vue3",
        component: Component,
      });

      expect(result.html).toBeDefined();
      expect(result.renderInfo?.engine).toBe("vue3");
    });

    it("应该正确处理组件错误", async () => {
      const Component = {
        setup() {
          throw new Error("Test error");
        },
      };

      await assertRejects(
        async () => {
          await vue3Adapter.renderSSR({
            engine: "vue3",
            component: Component,
          });
        },
        Error,
        "Test error",
      );
    });
  });
});
