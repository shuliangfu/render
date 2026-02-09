/**
 * SSR 渲染测试
 */

import { assertRejects, describe, expect, it } from "@dreamer/test";
import { renderSSR } from "../src/ssr.ts";
import type { SSROptions } from "../src/types.ts";

describe("renderSSR", () => {
  describe("React SSR", () => {
    it("应该能够渲染简单的 React 组件", async () => {
      // 简单的 React 组件
      const Component = () => {
        return "Hello, React!";
      };

      const result = await renderSSR({
        engine: "react",
        component: Component,
      });

      expect(result.html).toContain("Hello, React!");
      expect(result.renderInfo?.engine).toBe("react");
    });

    it("应该能够渲染带属性的 React 组件", async () => {
      const Component = ({ name }: { name: string }) => {
        return `Hello, ${name}!`;
      };

      const result = await renderSSR({
        engine: "react",
        component: Component,
        props: { name: "World" },
      });

      expect(result.html).toContain("Hello, World!");
    });

    it("应该支持 HTML 模板", async () => {
      const Component = () => {
        return "Content";
      };

      const template = "<html><body><!--ssr-outlet--></body></html>";

      const result = await renderSSR({
        engine: "react",
        component: Component,
        template,
      });

      expect(result.html).toContain("<html>");
      expect(result.html).toContain("<body>");
      expect(result.html).toContain("Content");
    });
  });

  describe("Preact SSR", () => {
    it("应该能够渲染简单的 Preact 组件", async () => {
      const Component = () => {
        return "Hello, Preact!";
      };

      const result = await renderSSR({
        engine: "preact",
        component: Component,
      });

      expect(result.html).toContain("Hello, Preact!");
      expect(result.renderInfo?.engine).toBe("preact");
    });

    it("应该能够渲染带属性的 Preact 组件", async () => {
      const Component = ({ name }: { name: string }) => {
        return `Hello, ${name}!`;
      };

      const result = await renderSSR({
        engine: "preact",
        component: Component,
        props: { name: "World" },
      });

      expect(result.html).toContain("Hello, World!");
    });
  });

  describe("错误处理", () => {
    it("应该拒绝不支持的模板引擎", async () => {
      await assertRejects(
        () =>
          renderSSR({
            engine: "invalid" as any,
            component: () => null,
          }),
        Error,
        "不支持的模板引擎",
      );
    });

    it("应该处理渲染错误", async () => {
      // 创建一个会抛出错误的组件
      const Component = () => {
        throw new Error("渲染错误");
      };

      await assertRejects(
        () =>
          renderSSR({
            engine: "react",
            component: Component,
          }),
        Error,
      );
    });
  });
});
