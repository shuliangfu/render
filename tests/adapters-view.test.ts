/**
 * View 适配器独立测试
 *
 * 测试 View 适配器的 SSR 功能（CSR 和 Hydrate 需要浏览器环境，不在此测试）
 * 使用 @dreamer/view 的 jsx 构建 VNode，与适配器内部 createComponentTree 行为一致
 */

import { assertRejects, describe, expect, it } from "@dreamer/test";
import { jsx } from "@dreamer/view/jsx-runtime";
import * as viewAdapter from "../src/adapters/view.ts";

describe("View 适配器", () => {
  describe("renderSSR", () => {
    it("应该能够渲染简单组件", async () => {
      const Component = () => jsx("div", { children: "Hello View" }, undefined);

      const result = await viewAdapter.renderSSR({
        engine: "view",
        component: Component,
      });

      expect(result.html).toContain("Hello View");
      expect(result.renderInfo?.engine).toBe("view");
    });

    it("应该能够渲染带属性的组件", async () => {
      const Component = (props: { name?: string }) =>
        jsx(
          "div",
          { children: `Hello, ${(props as { name?: string }).name ?? ""}` },
          undefined,
        );

      const result = await viewAdapter.renderSSR({
        engine: "view",
        component: Component,
        props: { name: "World" },
      });

      expect(result.html).toContain("Hello, World");
    });

    it("应该支持模板包装", async () => {
      const Component = () => jsx("div", { children: "Content" }, undefined);

      const result = await viewAdapter.renderSSR({
        engine: "view",
        component: Component,
        template: "<html><body><!--ssr-outlet--></body></html>",
      });

      expect(result.html).toContain("<html>");
      expect(result.html).toContain("Content");
      expect(result.html).toContain("</body>");
    });

    it("应该支持流式渲染", async () => {
      const Component = () => jsx("div", { children: "Streaming" }, undefined);

      const result = await viewAdapter.renderSSR({
        engine: "view",
        component: Component,
        stream: true,
      });

      expect(result.html).toContain("Streaming");
      expect(result.renderInfo?.stream).toBe(true);
    });

    it("应该支持布局系统", async () => {
      const Layout = (props: { children?: unknown }) =>
        jsx("div", { class: "layout", children: props.children }, undefined);
      const Page = () => jsx("div", { children: "Page" }, undefined);

      const result = await viewAdapter.renderSSR({
        engine: "view",
        component: Page,
        layouts: [{ component: Layout }],
      });

      expect(result.html).toContain("Page");
      expect(result.html).toContain("layout");
    });

    it("应该支持多层嵌套布局", async () => {
      const OuterLayout = (props: { children?: unknown }) =>
        jsx(
          "div",
          { class: "outer", children: ["Outer: ", props.children] },
          undefined,
        );
      const InnerLayout = (props: { children?: unknown }) =>
        jsx(
          "div",
          { class: "inner", children: ["Inner: ", props.children] },
          undefined,
        );
      const Page = () => jsx("div", { children: "Page" }, undefined);

      const result = await viewAdapter.renderSSR({
        engine: "view",
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
      const Layout = (props: { children?: unknown }) =>
        jsx("div", { children: ["Layout: ", props.children] }, undefined);
      const Page = () => jsx("div", { children: "Page" }, undefined);
      (Page as { inheritLayout?: boolean }).inheritLayout = false;

      const result = await viewAdapter.renderSSR({
        engine: "view",
        component: Page,
        layouts: [{ component: Layout }],
      });

      expect(result.html).toContain("Page");
      expect(result.html).not.toContain("Layout:");
    });

    it("应该支持复杂组件树", async () => {
      const Header = () => jsx("header", { children: "Header" }, undefined);
      const Main = (props: { children?: unknown }) =>
        jsx("main", { children: props.children }, undefined);
      const Footer = () => jsx("footer", { children: "Footer" }, undefined);
      const App = () =>
        jsx(
          "div",
          {
            children: [
              jsx(Header, {}, undefined),
              jsx(Main, { children: "Content" }, undefined),
              jsx(Footer, {}, undefined),
            ],
          },
          undefined,
        );

      const result = await viewAdapter.renderSSR({
        engine: "view",
        component: App,
      });

      expect(result.html).toContain("Header");
      expect(result.html).toContain("Content");
      expect(result.html).toContain("Footer");
    });

    it("应该正确处理空组件", async () => {
      const Component = () => null;

      const result = await viewAdapter.renderSSR({
        engine: "view",
        component: Component,
      });

      expect(result.html).toBeDefined();
      expect(result.renderInfo?.engine).toBe("view");
    });

    it("应该正确处理组件错误", async () => {
      const Component = () => {
        throw new Error("Test error");
      };

      await assertRejects(
        async () => {
          await viewAdapter.renderSSR({
            engine: "view",
            component: Component,
          });
        },
        Error,
        "Test error",
      );
    });

    it("应该支持性能监控", async () => {
      const Component = () => jsx("div", { children: "Content" }, undefined);
      let metrics: Record<string, unknown> | null = null;

      const result = await viewAdapter.renderSSR({
        engine: "view",
        component: Component,
        performance: {
          enabled: true,
          onMetrics: (m: Record<string, unknown>) => {
            metrics = m;
          },
        },
      });

      expect(result.html).toContain("Content");
      expect(metrics).toBeDefined();
      expect(Number(metrics?.["duration"]) ?? 0).toBeGreaterThanOrEqual(0);
      expect(metrics?.["engine"]).toBe("view");
      expect(metrics?.["phase"]).toBe("ssr");
    });
  });
});
