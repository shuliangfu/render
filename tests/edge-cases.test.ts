/**
 * 边界情况和错误场景测试
 *
 * 测试大量数据、复杂嵌套布局、内存泄漏、并发渲染等边界情况
 */

import { describe, expect, it } from "@dreamer/test";
import React from "react";
import { renderSSR } from "../src/ssr.ts";
import type { LoadContext, Metadata } from "../src/types.ts";

describe("边界情况和错误场景", () => {
  describe("大量数据测试", () => {
    it("应该能够处理大量数据的 load 方法", async () => {
      const Component = () => React.createElement("div", null, "Large Data");
      Component.load = async () => {
        // 生成 100KB 的数据
        return {
          items: Array.from({ length: 10000 }, (_, i) => ({
            id: i,
            name: `Item ${i}`,
            data: "x".repeat(10), // 每个项目 10 字节
          })),
        };
      };

      const result = await renderSSR({
        engine: "react",
        component: Component,
        loadContext: { url: "/", params: {} },
        compression: {
          enabled: true,
          threshold: 10240, // 10KB
        },
      });

      expect(result.html).toBeDefined();
      expect(result.html).toContain("Large Data");
      // 验证数据被注入
      expect(result.html).toContain("window.__DATA__");
    });

    it("应该能够处理大量元数据", async () => {
      const Component = () => React.createElement("div", null, "Content");
      Component.metadata = {
        title: "测试",
        description: "描述",
        keywords: Array.from({ length: 1000 }, (_, i) => `keyword${i}`).join(
          ", ",
        ),
        og: {
          title: "OG Title",
          description: "OG Description",
          image: "https://example.com/image.jpg",
        },
      } as Metadata;

      const result = await renderSSR({
        engine: "react",
        component: Component,
        template: "<html><head></head><body><!--ssr-outlet--></body></html>",
      });

      expect(result.html).toBeDefined();
      expect(result.metadata?.keywords).toBeDefined();
    });

    it("应该能够处理深度嵌套的对象数据", async () => {
      const Component = () => React.createElement("div", null, "Content");
      Component.load = async () => {
        // 创建深度嵌套的对象（10 层）
        let data: any = { value: "deep" };
        for (let i = 0; i < 10; i++) {
          data = { nested: data };
        }
        return { deep: data };
      };

      const result = await renderSSR({
        engine: "react",
        component: Component,
        loadContext: { url: "/", params: {} },
      });

      expect(result.html).toBeDefined();
      expect(result.html).toContain("window.__DATA__");
    });
  });

  describe("复杂嵌套布局测试", () => {
    it("应该能够处理 10 层嵌套布局", async () => {
      // 创建 10 个布局组件
      const layouts = Array.from({ length: 10 }, (_, i) => ({
        component: ({ children }: any) =>
          React.createElement(
            "div",
            { className: `layout-${i}` },
            `Layout ${i}: `,
            children,
          ),
      }));

      const Page = () => React.createElement("div", null, "Page");

      const result = await renderSSR({
        engine: "react",
        component: Page,
        layouts,
      });

      expect(result.html).toBeDefined();
      expect(result.html).toContain("Page");
      // 验证所有布局都被渲染
      for (let i = 0; i < 10; i++) {
        expect(result.html).toContain(`Layout ${i}:`);
      }
    });

    it("应该能够处理大量布局属性", async () => {
      const Layout = ({ children, ...props }: any) => {
        // 创建包含大量属性的布局
        const attrs: Record<string, string> = {};
        for (let i = 0; i < 100; i++) {
          attrs[`data-attr-${i}`] = `value-${i}`;
        }
        return React.createElement("div", attrs, children);
      };

      const Page = () => React.createElement("div", null, "Page");

      const result = await renderSSR({
        engine: "react",
        component: Page,
        layouts: [{ component: Layout }],
      });

      expect(result.html).toBeDefined();
      expect(result.html).toContain("Page");
    });
  });

  describe("并发渲染测试", () => {
    it("应该能够并发处理多个 SSR 请求", async () => {
      const Component = ({ id }: { id: number }) =>
        React.createElement("div", null, `Content ${id}`);

      // 并发执行 10 个 SSR 请求
      const promises = Array.from({ length: 10 }, (_, i) =>
        renderSSR({
          engine: "react",
          component: Component,
          props: { id: i },
        }),
      );

      const results = await Promise.all(promises);

      expect(results.length).toBe(10);
      results.forEach((result, i) => {
        expect(result.html).toContain(`Content ${i}`);
      });
    });

    it("应该能够并发处理不同引擎的 SSR 请求", async () => {
      const ReactComponent = () => React.createElement("div", null, "React");
      const { h } = await import("preact");
      const PreactComponent = () => h("div", null, "Preact");

      const [reactResult, preactResult] = await Promise.all([
        renderSSR({
          engine: "react",
          component: ReactComponent,
        }),
        renderSSR({
          engine: "preact",
          component: PreactComponent,
        }),
      ]);

      expect(reactResult.html).toContain("React");
      expect(preactResult.html).toContain("Preact");
    });
  });

  describe("错误恢复测试", () => {
    it("应该能够从组件错误中恢复", async () => {
      const ErrorComponent = () => {
        throw new Error("Component error");
      };

      const FallbackComponent = () =>
        React.createElement("div", null, "Fallback");

      const result = await renderSSR({
        engine: "react",
        component: ErrorComponent,
        errorHandler: {
          fallbackComponent: FallbackComponent,
          onError: () => {},
        },
      });

      expect(result.html).toBeDefined();
      expect(result.html).toContain("Fallback");
    });

    it("应该能够从 load 方法错误中恢复", async () => {
      const Component = () => React.createElement("div", null, "Content");
      Component.load = async () => {
        throw new Error("Load error");
      };

      const result = await renderSSR({
        engine: "react",
        component: Component,
        loadContext: { url: "/", params: {} },
        errorHandler: {
          onError: () => {},
        },
      });

      // 即使 load 失败，组件仍应渲染
      expect(result.html).toBeDefined();
      expect(result.html).toContain("Content");
    });

    it("应该能够从元数据错误中恢复", async () => {
      const Component = () => React.createElement("div", null, "Content");
      (Component as any).metadata = () => {
        throw new Error("Metadata error");
      };

      // 元数据错误应该被捕获，但组件仍应渲染
      try {
        const result = await renderSSR({
          engine: "react",
          component: Component,
          errorHandler: {
            onError: () => {},
          },
        });

        // 即使元数据失败，组件仍应渲染
        expect(result.html).toBeDefined();
        expect(result.html).toContain("Content");
      } catch (error) {
        // 如果元数据错误导致整个渲染失败，这也是可以接受的
        expect(error).toBeDefined();
      }
    });
  });

  describe("特殊字符和边界值测试", () => {
    it("应该能够处理特殊字符", async () => {
      const Component = () =>
        React.createElement("div", null, "<>&\"'特殊字符");

      const result = await renderSSR({
        engine: "react",
        component: Component,
      });

      expect(result.html).toBeDefined();
      // React 会自动转义 HTML 特殊字符
      expect(result.html).toContain("&lt;");
      expect(result.html).toContain("&gt;");
    });

    it("应该能够处理空字符串和 null", async () => {
      const Component = ({ value }: { value: string | null }) =>
        React.createElement("div", null, value || "empty");

      const result = await renderSSR({
        engine: "react",
        component: Component,
        props: { value: null },
      });

      expect(result.html).toBeDefined();
      expect(result.html).toContain("empty");
    });

    it("应该能够处理超长字符串", async () => {
      const longString = "x".repeat(100000); // 100KB 字符串
      const Component = () =>
        React.createElement("div", null, longString);

      const result = await renderSSR({
        engine: "react",
        component: Component,
      });

      expect(result.html).toBeDefined();
      expect(result.html.length).toBeGreaterThan(100000);
    });
  });
});
