/**
 * React 适配器独立测试
 *
 * 测试 React 适配器的 SSR 功能（CSR 和 Hydrate 需要浏览器环境，不在此测试）
 */

import { assertRejects, describe, expect, it } from "@dreamer/test";
import React from "react";
import * as reactAdapter from "../src/adapters/react.ts";

describe("React 适配器", () => {
  describe("renderSSR", () => {
    it("应该能够渲染简单组件", async () => {
      const Component = () => React.createElement("div", null, "Hello React");

      const result = await reactAdapter.renderSSR({
        engine: "react",
        component: Component,
      });

      expect(result.html).toContain("Hello React");
      expect(result.renderInfo?.engine).toBe("react");
    });

    it("应该能够渲染带属性的组件", async () => {
      const Component = ({ name }: { name: string }) =>
        React.createElement("div", null, `Hello, ${name}`);

      const result = await reactAdapter.renderSSR({
        engine: "react",
        component: Component,
        props: { name: "World" },
      });

      expect(result.html).toContain("Hello, World");
    });

    it("应该支持模板包装", async () => {
      const Component = () => React.createElement("div", null, "Content");

      const result = await reactAdapter.renderSSR({
        engine: "react",
        component: Component,
        template: "<html><body><!--ssr-outlet--></body></html>",
      });

      expect(result.html).toContain("<html>");
      expect(result.html).toContain("Content");
      expect(result.html).toContain("</body>");
    });

    it("应该支持流式渲染", async () => {
      const Component = () => React.createElement("div", null, "Streaming");

      const result = await reactAdapter.renderSSR({
        engine: "react",
        component: Component,
        stream: true,
      });

      expect(result.html).toContain("Streaming");
      expect(result.renderInfo?.stream).toBe(true);
    });

    it("应该支持布局系统", async () => {
      const Layout = ({ children }: any) =>
        React.createElement("div", { className: "layout" }, children);
      const Page = () => React.createElement("div", null, "Page");

      const result = await reactAdapter.renderSSR({
        engine: "react",
        component: Page,
        layouts: [{ component: Layout }],
      });

      expect(result.html).toContain("Page");
      expect(result.html).toContain("layout");
    });

    it("应该支持多层嵌套布局", async () => {
      const OuterLayout = ({ children }: any) =>
        React.createElement("div", { className: "outer" }, "Outer: ", children);
      const InnerLayout = ({ children }: any) =>
        React.createElement("div", { className: "inner" }, "Inner: ", children);
      const Page = () => React.createElement("div", null, "Page");

      const result = await reactAdapter.renderSSR({
        engine: "react",
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
        React.createElement("div", null, "Layout: ", children);
      const Page = () => React.createElement("div", null, "Page");
      Page.inheritLayout = false;

      const result = await reactAdapter.renderSSR({
        engine: "react",
        component: Page,
        layouts: [{ component: Layout }],
      });

      expect(result.html).toContain("Page");
      expect(result.html).not.toContain("Layout:");
    });

    it("应该支持复杂组件树", async () => {
      const Header = () => React.createElement("header", null, "Header");
      const Main = ({ children }: any) =>
        React.createElement("main", null, children);
      const Footer = () => React.createElement("footer", null, "Footer");
      const App = () =>
        React.createElement(
          React.Fragment,
          null,
          React.createElement(Header),
          React.createElement(Main, null, "Content"),
          React.createElement(Footer),
        );

      const result = await reactAdapter.renderSSR({
        engine: "react",
        component: App,
      });

      expect(result.html).toContain("Header");
      expect(result.html).toContain("Content");
      expect(result.html).toContain("Footer");
    });

    it("应该正确处理空组件", async () => {
      const Component = () => null;

      const result = await reactAdapter.renderSSR({
        engine: "react",
        component: Component,
      });

      expect(result.html).toBeDefined();
      expect(result.renderInfo?.engine).toBe("react");
    });

    it("应该正确处理组件错误", async () => {
      const Component = () => {
        throw new Error("Test error");
      };

      await assertRejects(
        async () => {
          await reactAdapter.renderSSR({
            engine: "react",
            component: Component,
          });
        },
        Error,
        "Test error",
      );
    });
  });
});
