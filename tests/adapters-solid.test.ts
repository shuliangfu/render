/**
 * Solid 适配器独立测试
 *
 * 测试 Solid 适配器的 SSR 功能（CSR 和 Hydrate 需要浏览器环境，不在此测试）。
 * 使用 solid-js/web 的 Dynamic 在无 JSX 环境下构建组件，保证 SSR 可测。
 */

import { assertRejects, describe, expect, it } from "@dreamer/test";
import { type Component, createComponent } from "solid-js";
import { Dynamic } from "solid-js/web";
import * as solidAdapter from "../src/adapters/solid.ts";

/** 创建仅渲染一段文本的 Solid 组件（用 Dynamic 包装 div） */
function textComponent(text: string): Component<Record<string, unknown>> {
  return () =>
    createComponent(Dynamic, {
      component: "div",
      get children() {
        return text;
      },
    });
}

/** Solid 内部使用定时器，关闭 sanitize 避免泄漏误报 */
const noSanitize = { sanitizeOps: false, sanitizeResources: false };

describe("Solid 适配器", () => {
  describe("renderSSR", () => {
    it("应该能够渲染简单组件", async () => {
      const Component = textComponent("Hello Solid");

      const result = await solidAdapter.renderSSR({
        engine: "solid",
        component: Component,
      });

      expect(result.html).toContain("Hello Solid");
      expect(result.renderInfo?.engine).toBe("solid");
    });

    it("应该能够渲染带属性的组件", async () => {
      const Component: Component<Record<string, unknown>> = (props) =>
        createComponent(Dynamic, {
          component: "div",
          get children() {
            return `Hello, ${props.name ?? ""}`;
          },
        });

      const result = await solidAdapter.renderSSR({
        engine: "solid",
        component: Component,
        props: { name: "World" },
      });

      expect(result.html).toContain("Hello, World");
    });

    it("应该支持模板包装", async () => {
      const Component = textComponent("Content");

      const result = await solidAdapter.renderSSR({
        engine: "solid",
        component: Component,
        template: "<html><body><!--ssr-outlet--></body></html>",
      });

      expect(result.html).toContain("<html>");
      expect(result.html).toContain("Content");
      expect(result.html).toContain("</body>");
    });

    it("应该支持流式渲染", async () => {
      const Component = textComponent("Streaming");

      const result = await solidAdapter.renderSSR({
        engine: "solid",
        component: Component,
        stream: true,
      });

      expect(result.html).toContain("Streaming");
      expect(result.renderInfo?.stream).toBe(true);
    });

    it("应该支持布局系统", async () => {
      const Layout: Component<Record<string, unknown>> = (props) =>
        createComponent(Dynamic, {
          component: "div",
          class: "layout",
          get children() {
            return props.children;
          },
        });
      const Page = textComponent("Page");

      const result = await solidAdapter.renderSSR({
        engine: "solid",
        component: Page,
        layouts: [{ component: Layout }],
      });

      expect(result.html).toContain("Page");
      expect(result.html).toContain("layout");
    });

    it("应该支持多层嵌套布局", async () => {
      const OuterLayout: Component<Record<string, unknown>> = (props) =>
        createComponent(Dynamic, {
          component: "div",
          class: "outer",
          get children() {
            return ["Outer: ", props.children];
          },
        });
      const InnerLayout: Component<Record<string, unknown>> = (props) =>
        createComponent(Dynamic, {
          component: "div",
          class: "inner",
          get children() {
            return ["Inner: ", props.children];
          },
        });
      const Page = textComponent("Page");

      const result = await solidAdapter.renderSSR({
        engine: "solid",
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
      const Layout: Component<Record<string, unknown>> = (props) =>
        createComponent(Dynamic, {
          component: "div",
          get children() {
            return ["Layout: ", props.children];
          },
        });
      const Page = textComponent("Page");
      (Page as unknown as Record<string, unknown>).inheritLayout = false;

      const result = await solidAdapter.renderSSR({
        engine: "solid",
        component: Page,
        layouts: [{ component: Layout }],
      });

      expect(result.html).toContain("Page");
      expect(result.html).not.toContain("Layout:");
    });

    it("应该支持布局带 props", async () => {
      const Layout: Component<Record<string, unknown>> = (props) =>
        createComponent(Dynamic, {
          component: "div",
          class: props.class ?? "default-layout",
          get children() {
            return props.children;
          },
        });
      const Page = textComponent("Page");

      const result = await solidAdapter.renderSSR({
        engine: "solid",
        component: Page,
        layouts: [{ component: Layout, props: { class: "custom-layout" } }],
      });

      expect(result.html).toContain("Page");
      expect(result.html).toContain("custom-layout");
    });

    it("应该支持复杂组件树", async () => {
      const Header = textComponent("Header");
      const Footer = textComponent("Footer");
      const Main: Component<Record<string, unknown>> = (props) =>
        createComponent(Dynamic, {
          component: "main",
          get children() {
            return props.children ?? "Content";
          },
        });
      const App: Component<Record<string, unknown>> = () =>
        createComponent(Dynamic, {
          component: "div",
          get children() {
            return [
              createComponent(Header, {}),
              createComponent(Main, {
                get children() {
                  return "Content";
                },
              }),
              createComponent(Footer, {}),
            ];
          },
        });

      const result = await solidAdapter.renderSSR({
        engine: "solid",
        component: App,
      });

      expect(result.html).toContain("Header");
      expect(result.html).toContain("Content");
      expect(result.html).toContain("Footer");
    });

    it("应该正确处理空组件", async () => {
      const Component: Component<Record<string, unknown>> = () =>
        createComponent(Dynamic, {
          component: "div",
          get children() {
            return null;
          },
        });

      const result = await solidAdapter.renderSSR({
        engine: "solid",
        component: Component,
      });

      expect(result.html).toBeDefined();
      expect(result.renderInfo?.engine).toBe("solid");
    });

    it("应该正确处理组件错误", async () => {
      const Component = () => {
        throw new Error("Test error");
      };

      await assertRejects(
        async () => {
          await solidAdapter.renderSSR({
            engine: "solid",
            component: Component,
          });
        },
        Error,
        "Test error",
      );
    });

    it("应该在错误时使用 fallbackComponent", async () => {
      const BadComponent = () => {
        throw new Error("Bad render");
      };
      const Fallback = textComponent("Fallback content");

      const result = await solidAdapter.renderSSR({
        engine: "solid",
        component: BadComponent,
        errorHandler: {
          fallbackComponent: Fallback,
          onError: () => {},
        },
      });

      expect(result.html).toContain("Fallback content");
    });

    it("应该支持性能监控", async () => {
      const Component = textComponent("Content");
      let metrics: Record<string, unknown> | null = null;

      const result = await solidAdapter.renderSSR({
        engine: "solid",
        component: Component,
        performance: {
          enabled: true,
          onMetrics: (m) => {
            metrics = m as Record<string, unknown>;
          },
        },
      });

      expect(result.html).toContain("Content");
      expect(metrics).toBeDefined();
      const m = metrics as {
        duration?: number;
        engine?: string;
        phase?: string;
      } | null;
      expect((m?.duration ?? 0) >= 0).toBe(true);
      expect(m?.engine).toBe("solid");
      expect(m?.phase).toBe("ssr");
    });

    it("应该支持 debug 选项不报错", async () => {
      const Component = textComponent("Debug");

      const result = await solidAdapter.renderSSR({
        engine: "solid",
        component: Component,
        debug: true,
      });

      expect(result.html).toContain("Debug");
    });

    it("无效 component 应抛出明确错误", async () => {
      await assertRejects(
        async () => {
          await solidAdapter.renderSSR({
            engine: "solid",
            component: undefined as unknown,
            props: {},
          });
        },
        Error,
        "buildSolidTree",
      );
    });
  });
}, noSanitize);
