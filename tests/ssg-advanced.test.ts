/**
 * SSG 高级功能测试
 *
 * 测试 SSG 的高级功能：动态路由参数、多引擎对比、模板处理、自定义选项
 */

import { describe, expect, it } from "@dreamer/test";
import React from "react";
import { h } from "preact";
import { expandDynamicRoute, renderSSG } from "../src/ssg.ts";
import {
  join,
  mkdir,
  readTextFile,
  remove,
  writeTextFile,
} from "@dreamer/runtime-adapter";

describe("SSG 高级功能", () => {
  const testOutputDir = "./tests/data/test-ssg-advanced-output";

  const cleanup = async () => {
    try {
      await remove(testOutputDir, { recursive: true });
    } catch {
      // 忽略错误
    }
  };

  describe("动态路由参数", () => {
    it("应该能够展开单个动态参数", () => {
      const routes = expandDynamicRoute("/user/[id]", ["1", "2", "3"]);

      expect(routes).toEqual(["/user/1", "/user/2", "/user/3"]);
    });

    it("应该能够展开多个动态参数", () => {
      const routes = expandDynamicRoute("/user/[id]/post/[postId]", [
        "1-100",
        "2-200",
      ]);

      expect(routes.length).toBe(2);
      expect(routes[0]).toContain("1");
      expect(routes[0]).toContain("100");
      expect(routes[1]).toContain("2");
      expect(routes[1]).toContain("200");
    });

    it("应该能够处理复杂的动态路由", () => {
      const routes = expandDynamicRoute("/blog/[year]/[month]/[slug]", [
        "2024-01-hello",
        "2024-02-world",
      ]);

      expect(routes.length).toBe(2);
      expect(routes[0]).toContain("2024");
      expect(routes[0]).toContain("01");
      expect(routes[0]).toContain("hello");
    });

    it("应该能够处理混合静态和动态路由", async () => {
      await cleanup();

      const Component = () => React.createElement("div", null, "Content");

      const files = await renderSSG({
        engine: "react",
        routes: [
          "/",
          "/about",
          ...expandDynamicRoute("/user/[id]", ["1", "2"]),
        ],
        outputDir: testOutputDir,
        loadRouteComponent: async () => Component,
      });

      expect(files.some((f) => f.includes("index.html"))).toBe(true);
      expect(files.some((f) => f.includes("about.html"))).toBe(true);
      expect(files.some((f) => f.includes("user/1.html"))).toBe(true);
      expect(files.some((f) => f.includes("user/2.html"))).toBe(true);

      await cleanup();
    });
  });

  describe("多引擎对比", () => {
    it("应该支持 React 引擎生成 SSG", async () => {
      await cleanup();

      const Component = () => React.createElement("div", null, "React SSG");

      const files = await renderSSG({
        engine: "react",
        routes: ["/"],
        outputDir: testOutputDir,
        loadRouteComponent: async () => Component,
      });

      expect(files.length).toBeGreaterThan(0);
      const content = await readTextFile(join(testOutputDir, "index.html"));
      expect(content).toContain("React SSG");

      await cleanup();
    });

    it("应该支持 Preact 引擎生成 SSG", async () => {
      await cleanup();

      const Component = () => h("div", null, "Preact SSG");

      const files = await renderSSG({
        engine: "preact",
        routes: ["/"],
        outputDir: testOutputDir,
        loadRouteComponent: async () => Component,
      });

      expect(files.length).toBeGreaterThan(0);
      const content = await readTextFile(join(testOutputDir, "index.html"));
      expect(content).toContain("Preact SSG");

      await cleanup();
    });
  });

  describe("模板处理", () => {
    it("应该支持自定义模板", async () => {
      await cleanup();

      const Component = () => React.createElement("div", null, "Content");
      const customTemplate = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>自定义模板</title>
</head>
<body>
  <!--ssr-outlet-->
</body>
</html>`;

      const files = await renderSSG({
        engine: "react",
        routes: ["/"],
        outputDir: testOutputDir,
        loadRouteComponent: async () => Component,
        template: customTemplate,
      });

      const content = await readTextFile(join(testOutputDir, "index.html"));
      expect(content).toContain("<!DOCTYPE html>");
      expect(content).toContain("自定义模板");
      expect(content).toContain("Content");

      await cleanup();
    });

    it("应该支持模板中的多个占位符", async () => {
      await cleanup();

      const Component = () => React.createElement("div", null, "Content");
      const template =
        "<html><head><!--ssr-outlet--></head><body><!--ssr-outlet--></body></html>";

      const files = await renderSSG({
        engine: "react",
        routes: ["/"],
        outputDir: testOutputDir,
        loadRouteComponent: async () => Component,
        template,
      });

      const content = await readTextFile(join(testOutputDir, "index.html"));
      expect(content).toContain("Content");

      await cleanup();
    });

    it("应该支持纯 HTML 模式", async () => {
      await cleanup();

      const Component = () => React.createElement("div", null, "Pure HTML");

      const files = await renderSSG({
        engine: "react",
        routes: ["/"],
        outputDir: testOutputDir,
        loadRouteComponent: async () => Component,
        pureHTML: true,
      });

      const content = await readTextFile(join(testOutputDir, "index.html"));
      expect(content).toContain("Pure HTML");

      await cleanup();
    });

    it("应该支持 headInject 在 </head> 前注入内容", async () => {
      await cleanup();

      const Component = () => React.createElement("div", null, "Content");
      const template =
        "<html><head><title>Test</title></head><body><!--ssr-outlet--></body></html>";
      const headInject =
        '<link rel="stylesheet" href="/style.css">\n<link rel="preload" href="/font.woff2">';

      const files = await renderSSG({
        engine: "react",
        routes: ["/"],
        outputDir: testOutputDir,
        loadRouteComponent: async () => Component,
        template,
        headInject,
      });

      const content = await readTextFile(join(testOutputDir, "index.html"));
      expect(content).toContain("Content");
      // headInject 应出现在 </head> 前
      expect(content).toContain('<link rel="stylesheet" href="/style.css">');
      expect(content).toContain('<link rel="preload" href="/font.woff2">');
      // 验证顺序：headInject 在 </head> 之前
      const headCloseIndex = content.indexOf("</head>");
      const linkIndex = content.indexOf('<link rel="stylesheet"');
      expect(linkIndex).toBeLessThan(headCloseIndex);

      await cleanup();
    });
  });

  describe("自定义选项", () => {
    it("应该支持自定义 SSR 选项", async () => {
      await cleanup();

      const Component = () => React.createElement("div", null, "Content");
      Component.metadata = {
        title: "自定义标题",
        description: "自定义描述",
      } as any;

      const files = await renderSSG({
        engine: "react",
        routes: ["/"],
        outputDir: testOutputDir,
        loadRouteComponent: async () => Component,
        options: {
          performance: {
            enabled: true,
          },
        },
      });

      const content = await readTextFile(join(testOutputDir, "index.html"));
      expect(content).toContain("Content");

      await cleanup();
    });

    it("应该支持路由特定的数据加载", async () => {
      await cleanup();

      const Component = ({ data }: { data?: { title: string } }) =>
        React.createElement("div", null, `Title: ${data?.title || "Default"}`);

      const files = await renderSSG({
        engine: "react",
        routes: ["/", "/about"],
        outputDir: testOutputDir,
        loadRouteComponent: async () => Component,
        loadRouteData: async (route) => {
          if (route === "/") {
            return { data: { title: "Home" } };
          }
          if (route === "/about") {
            return { data: { title: "About" } };
          }
          return {};
        },
      });

      const homeContent = await readTextFile(join(testOutputDir, "index.html"));
      expect(homeContent).toContain("Home");

      const aboutContent = await readTextFile(
        join(testOutputDir, "about.html"),
      );
      expect(aboutContent).toContain("About");

      await cleanup();
    });
  });
});
