/**
 * SSG 静态站点生成测试
 */

import { join, readTextFile, remove } from "@dreamer/runtime-adapter";
import { describe, expect, it } from "@dreamer/test";
import {
  expandDynamicRoute,
  generateRobots,
  generateSitemap,
  renderSSG,
} from "../src/ssg.ts";

describe("renderSSG", () => {
  const testOutputDir = "./tests/data/test-ssg-output";
  const reactOutputDir = "./tests/data/test-ssg-react-output";
  const preactOutputDir = "./tests/data/test-ssg-preact-output";

  // 清理测试输出目录（测试前清理，测试后保留输出文件供查看）
  const cleanup = async (dir?: string) => {
    const dirs = dir ? [dir] : [testOutputDir, reactOutputDir, preactOutputDir];
    for (const d of dirs) {
      try {
        await remove(d, { recursive: true });
      } catch {
        // 忽略错误
      }
    }
  };

  // 测试结束后不自动清理，保留输出文件供查看
  // 如需清理，可以手动删除 tests/data/test-ssg-*-output 目录

  describe("React SSG", () => {
    it("应该能够生成静态 HTML 文件", async () => {
      await cleanup(reactOutputDir);

      const React = await import("react");
      const Component = () => {
        return React.createElement("div", null, "Hello, React SSG!");
      };

      const files = await renderSSG({
        engine: "react",
        routes: ["/", "/about"],
        outputDir: reactOutputDir,
        loadRouteComponent: async (route) => {
          return Component;
        },
      });

      expect(files.length).toBeGreaterThan(0);
      expect(files.some((f) => f.includes("index.html"))).toBe(true);
      expect(files.some((f) => f.includes("about.html"))).toBe(true);

      // 验证文件内容
      const indexContent = await readTextFile(
        join(reactOutputDir, "index.html"),
      );
      expect(indexContent).toContain("Hello, React SSG!");

      // 测试结束后保留输出文件供查看，不清理
    });
  });

  describe("Preact SSG", () => {
    it("应该能够生成静态 HTML 文件", async () => {
      await cleanup(preactOutputDir);

      const { h } = await import("preact");
      const Component = () => h("div", null, "Hello, Preact SSG!");

      const files = await renderSSG({
        engine: "preact",
        routes: ["/", "/about"],
        outputDir: preactOutputDir,
        loadRouteComponent: async (route) => {
          return Component;
        },
      });

      expect(files.length).toBeGreaterThan(0);
      expect(files.some((f) => f.includes("index.html"))).toBe(true);
      expect(files.some((f) => f.includes("about.html"))).toBe(true);

      // 验证文件内容
      const indexContent = await readTextFile(
        join(preactOutputDir, "index.html"),
      );
      expect(indexContent).toContain("Hello, Preact SSG!");

      // 测试结束后保留输出文件供查看，不清理
    });
  });

  describe("Sitemap 和 Robots", () => {
    it("React 应该能够生成 sitemap.xml", async () => {
      await cleanup(reactOutputDir);

      const React = await import("react");
      const Component = () => {
        return React.createElement("div", null, "Content");
      };

      const files = await renderSSG({
        engine: "react",
        routes: ["/", "/about"],
        outputDir: reactOutputDir,
        loadRouteComponent: async () => Component,
        generateSitemap: true,
      });

      expect(files.some((f) => f.includes("sitemap.xml"))).toBe(true);

      const sitemapContent = await readTextFile(
        join(reactOutputDir, "sitemap.xml"),
      );
      expect(sitemapContent).toContain("<?xml");
      expect(sitemapContent).toContain("<urlset");

      // 测试结束后保留输出文件供查看，不清理
    });

    it("Preact 应该能够生成 sitemap.xml", async () => {
      await cleanup(preactOutputDir);

      const { h } = await import("preact");
      const Component = () => h("div", null, "Content");

      const files = await renderSSG({
        engine: "preact",
        routes: ["/", "/about"],
        outputDir: preactOutputDir,
        loadRouteComponent: async () => Component,
        generateSitemap: true,
      });

      expect(files.some((f) => f.includes("sitemap.xml"))).toBe(true);

      const sitemapContent = await readTextFile(
        join(preactOutputDir, "sitemap.xml"),
      );
      expect(sitemapContent).toContain("<?xml");
      expect(sitemapContent).toContain("<urlset");

      // 测试结束后保留输出文件供查看，不清理
    });

    it("React 应该能够生成 robots.txt", async () => {
      await cleanup(reactOutputDir);

      const React = await import("react");
      const Component = () => {
        return React.createElement("div", null, "Content");
      };

      const files = await renderSSG({
        engine: "react",
        routes: ["/"],
        outputDir: reactOutputDir,
        loadRouteComponent: async () => Component,
        generateRobots: true,
      });

      expect(files.some((f) => f.includes("robots.txt"))).toBe(true);

      const robotsContent = await readTextFile(
        join(reactOutputDir, "robots.txt"),
      );
      expect(robotsContent).toContain("User-agent");

      // 测试结束后保留输出文件供查看，不清理
    });

    it("Preact 应该能够生成 robots.txt", async () => {
      await cleanup(preactOutputDir);

      const { h } = await import("preact");
      const Component = () => h("div", null, "Content");

      const files = await renderSSG({
        engine: "preact",
        routes: ["/"],
        outputDir: preactOutputDir,
        loadRouteComponent: async () => Component,
        generateRobots: true,
      });

      expect(files.some((f) => f.includes("robots.txt"))).toBe(true);

      const robotsContent = await readTextFile(
        join(preactOutputDir, "robots.txt"),
      );
      expect(robotsContent).toContain("User-agent");

      // 测试结束后保留输出文件供查看，不清理
    });
  });

  describe("路由数据", () => {
    it("React 应该能够处理路由数据", async () => {
      await cleanup(reactOutputDir);

      const React = await import("react");
      const Component = ({ data }: { data?: { title: string } }) => {
        return React.createElement(
          "div",
          null,
          `Title: ${data?.title || "Default"}`,
        );
      };

      const files = await renderSSG({
        engine: "react",
        routes: ["/"],
        outputDir: reactOutputDir,
        loadRouteComponent: async () => Component,
        loadRouteData: async (route) => {
          return { data: { title: "Test Title" } };
        },
      });

      const content = await readTextFile(join(reactOutputDir, "index.html"));
      expect(content).toContain("Test Title");

      // 测试结束后保留输出文件供查看，不清理
    });

    it("Preact 应该能够处理路由数据", async () => {
      await cleanup(preactOutputDir);

      const { h } = await import("preact");
      const Component = ({ data }: { data?: { title: string } }) =>
        h("div", null, `Title: ${data?.title || "Default"}`);

      const files = await renderSSG({
        engine: "preact",
        routes: ["/"],
        outputDir: preactOutputDir,
        loadRouteComponent: async () => Component,
        loadRouteData: async (route) => {
          return { data: { title: "Preact Title" } };
        },
      });

      const content = await readTextFile(join(preactOutputDir, "index.html"));
      expect(content).toContain("Preact Title");

      // 测试结束后保留输出文件供查看，不清理
    });
  });
});

describe("generateSitemap", () => {
  it("应该生成有效的 sitemap.xml", () => {
    const routes = ["/", "/about", "/contact"];
    const sitemap = generateSitemap(routes);

    expect(sitemap).toContain("<?xml");
    expect(sitemap).toContain("<urlset");
    expect(sitemap).toContain("/about");
    expect(sitemap).toContain("/contact");
  });

  it("应该支持基础 URL", () => {
    const routes = ["/", "/about"];
    const sitemap = generateSitemap(routes, "https://example.com");

    expect(sitemap).toContain("https://example.com/");
    expect(sitemap).toContain("https://example.com/about");
  });
});

describe("generateRobots", () => {
  it("应该生成默认的 robots.txt", () => {
    const robots = generateRobots();

    expect(robots).toContain("User-agent");
    expect(robots).toContain("Allow");
  });

  it("应该支持禁止路径", () => {
    const robots = generateRobots(false, ["/admin", "/private"]);

    expect(robots).toContain("Disallow: /admin");
    expect(robots).toContain("Disallow: /private");
  });
});

describe("expandDynamicRoute", () => {
  it("应该展开动态路由", () => {
    const routes = expandDynamicRoute("/user/[id]", ["1", "2", "3"]);

    expect(routes).toEqual(["/user/1", "/user/2", "/user/3"]);
  });

  it("应该处理静态路由", () => {
    const routes = expandDynamicRoute("/about", []);

    expect(routes).toEqual(["/about"]);
  });

  it("应该处理多个参数", () => {
    const routes = expandDynamicRoute("/user/[id]/post/[postId]", [
      "1-100",
      "2-200",
    ]);

    expect(routes.length).toBe(2);
    expect(routes[0]).toContain("1-100");
  });
});
