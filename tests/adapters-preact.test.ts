/**
 * Preact 适配器独立测试
 *
 * 测试 Preact 适配器的 SSR 功能（CSR 和 Hydrate 需要浏览器环境，不在此测试）
 */

import { assertRejects, describe, expect, it } from "@dreamer/test";
import { h } from "preact";
import * as preactAdapter from "../src/adapters/preact.ts";

describe("Preact 适配器", () => {
  describe("renderSSR", () => {
    it("应该能够渲染简单组件", async () => {
      const Component = () => h("div", null, "Hello Preact");

      const result = await preactAdapter.renderSSR({
        engine: "preact",
        component: Component,
      });

      expect(result.html).toContain("Hello Preact");
      expect(result.renderInfo?.engine).toBe("preact");
    });

    it("应该能够渲染带属性的组件", async () => {
      const Component = ({ name }: { name: string }) =>
        h("div", null, `Hello, ${name}`);

      const result = await preactAdapter.renderSSR({
        engine: "preact",
        component: Component,
        props: { name: "World" },
      });

      expect(result.html).toContain("Hello, World");
    });

    it("应该支持模板包装", async () => {
      const Component = () => h("div", null, "Content");

      const result = await preactAdapter.renderSSR({
        engine: "preact",
        component: Component,
        template: "<html><body><!--ssr-outlet--></body></html>",
      });

      expect(result.html).toContain("<html>");
      expect(result.html).toContain("Content");
      expect(result.html).toContain("</body>");
    });

    it("应该支持流式渲染", async () => {
      const Component = () => h("div", null, "Streaming");

      const result = await preactAdapter.renderSSR({
        engine: "preact",
        component: Component,
        stream: true,
      });

      expect(result.html).toContain("Streaming");
      expect(result.renderInfo?.stream).toBe(true);
    });

    it("应该支持布局系统", async () => {
      const Layout = ({ children }: any) =>
        h("div", { class: "layout" }, children);
      const Page = () => h("div", null, "Page");

      const result = await preactAdapter.renderSSR({
        engine: "preact",
        component: Page,
        layouts: [{ component: Layout }],
      });

      expect(result.html).toContain("Page");
      expect(result.html).toContain("layout");
    });

    it("应该支持多层嵌套布局", async () => {
      const OuterLayout = ({ children }: any) =>
        h("div", { class: "outer" }, "Outer: ", children);
      const InnerLayout = ({ children }: any) =>
        h("div", { class: "inner" }, "Inner: ", children);
      const Page = () => h("div", null, "Page");

      const result = await preactAdapter.renderSSR({
        engine: "preact",
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
      const Layout = ({ children }: any) =>
        h("div", null, "Layout: ", children);
      const Page = () => h("div", null, "Page");
      Page.layout = false;

      const result = await preactAdapter.renderSSR({
        engine: "preact",
        component: Page,
        layouts: [{ component: Layout }],
      });

      expect(result.html).toContain("Page");
      expect(result.html).not.toContain("Layout:");
    });

    it("应该支持复杂组件树", async () => {
      const Header = () => h("header", null, "Header");
      const Main = ({ children }: any) => h("main", null, children);
      const Footer = () => h("footer", null, "Footer");
      const App = () =>
        h(
          "div",
          null,
          h(Header, null),
          h(Main, null, "Content"),
          h(Footer, null),
        );

      const result = await preactAdapter.renderSSR({
        engine: "preact",
        component: App,
      });

      expect(result.html).toContain("Header");
      expect(result.html).toContain("Content");
      expect(result.html).toContain("Footer");
    });

    it("应该正确处理空组件", async () => {
      const Component = () => null;

      const result = await preactAdapter.renderSSR({
        engine: "preact",
        component: Component,
      });

      expect(result.html).toBeDefined();
      expect(result.renderInfo?.engine).toBe("preact");
    });

    it("应该正确处理组件错误", async () => {
      const Component = () => {
        throw new Error("Test error");
      };

      await assertRejects(
        async () => {
          await preactAdapter.renderSSR({
            engine: "preact",
            component: Component,
          });
        },
        Error,
        "Test error",
      );
    });

    it("应该支持性能监控", async () => {
      const Component = () => h("div", null, "Content");
      let metrics: any = null;

      const result = await preactAdapter.renderSSR({
        engine: "preact",
        component: Component,
        performance: {
          enabled: true,
          onMetrics: (m) => {
            metrics = m;
          },
        },
      });

      expect(result.html).toContain("Content");
      expect(metrics).toBeDefined();
      // 性能指标包含 duration 字段（在 Bun 中可能为 0，因为渲染太快）
      expect(metrics?.duration).toBeGreaterThanOrEqual(0);
      // 至少应该有 engine 和 phase 字段
      expect(metrics?.engine).toBe("preact");
      expect(metrics?.phase).toBe("ssr");
    });
  });
});
