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
  const vue3OutputDir = "./tests/data/test-ssg-vue3-output";
  const vue2OutputDir = "./tests/data/test-ssg-vue2-output";

  // 清理测试输出目录（测试前清理，测试后保留输出文件供查看）
  const cleanup = async (dir?: string) => {
    const dirs = dir
      ? [dir]
      : [
        testOutputDir,
        reactOutputDir,
        preactOutputDir,
        vue3OutputDir,
        vue2OutputDir,
      ];
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

  describe("Vue3 SSG", () => {
    it("应该能够生成静态 HTML 文件", async () => {
      await cleanup(vue3OutputDir);

      const { h } = await import("vue");
      const Component = {
        props: ["route"],
        setup(_props: any) {
          return () => h("div", null, "Hello, Vue3 SSG!");
        },
      };

      const files = await renderSSG({
        engine: "vue3",
        routes: ["/", "/about"],
        outputDir: vue3OutputDir,
        loadRouteComponent: async (route) => {
          return Component;
        },
      });

      expect(files.length).toBeGreaterThan(0);
      expect(files.some((f) => f.includes("index.html"))).toBe(true);
      expect(files.some((f) => f.includes("about.html"))).toBe(true);

      // 验证文件内容
      const indexContent = await readTextFile(
        join(vue3OutputDir, "index.html"),
      );
      expect(indexContent).toContain("Hello, Vue3 SSG!");

      // 测试结束后保留输出文件供查看，不清理
    });
  });

  describe("Vue2 SSG", () => {
    /**
     * 创建模拟的 Vue 2 构造函数
     */
    function createMockVue() {
      // deno-lint-ignore no-explicit-any
      return class MockVue {
        $mount() {
          return this;
        }
        $destroy() {}
        // deno-lint-ignore no-explicit-any
        constructor(_options: any) {}
      } as any;
    }

    /**
     * 创建模拟的 Vue 2 渲染器
     */
    function createMockRenderer(html: string) {
      return {
        renderToString: async () => html,
      };
    }

    it("应该能够生成静态 HTML 文件", async () => {
      await cleanup(vue2OutputDir);

      const Component = {
        props: ["route"],
        template: "<div>Hello, Vue2 SSG!</div>",
      };

      const MockVue = createMockVue();
      const mockRenderer = createMockRenderer("<div>Hello, Vue2 SSG!</div>");

      const files = await renderSSG({
        engine: "vue2",
        routes: ["/", "/about"],
        outputDir: vue2OutputDir,
        loadRouteComponent: async (_route) => {
          return Component;
        },
        Vue: MockVue,
        renderer: mockRenderer,
      });

      expect(files.length).toBeGreaterThan(0);
      expect(files.some((f) => f.includes("index.html"))).toBe(true);
      expect(files.some((f) => f.includes("about.html"))).toBe(true);

      // 验证文件内容
      const indexContent = await readTextFile(
        join(vue2OutputDir, "index.html"),
      );
      expect(indexContent).toContain("Hello, Vue2 SSG!");

      // 测试结束后保留输出文件供查看，不清理
    });

    it("应该能够生成 sitemap.xml 和 robots.txt", async () => {
      await cleanup(vue2OutputDir);

      const Component = { template: "<div>Content</div>" };
      const MockVue = createMockVue();
      const mockRenderer = createMockRenderer("<div>Content</div>");

      const files = await renderSSG({
        engine: "vue2",
        routes: ["/", "/about"],
        outputDir: vue2OutputDir,
        loadRouteComponent: async () => Component,
        Vue: MockVue,
        renderer: mockRenderer,
        generateSitemap: true,
        generateRobots: true,
      });

      expect(files.some((f) => f.includes("sitemap.xml"))).toBe(true);
      expect(files.some((f) => f.includes("robots.txt"))).toBe(true);

      const sitemapContent = await readTextFile(
        join(vue2OutputDir, "sitemap.xml"),
      );
      expect(sitemapContent).toContain("<?xml");

      const robotsContent = await readTextFile(
        join(vue2OutputDir, "robots.txt"),
      );
      expect(robotsContent).toContain("User-agent");
    });

    it("应该能够处理路由数据", async () => {
      await cleanup(vue2OutputDir);

      const Component = {
        props: ["route", "data"],
        template: "<div>Title: {{ data?.title || 'Default' }}</div>",
      };
      const MockVue = createMockVue();
      const mockRenderer = createMockRenderer("<div>Title: Vue2 Title</div>");

      const files = await renderSSG({
        engine: "vue2",
        routes: ["/"],
        outputDir: vue2OutputDir,
        loadRouteComponent: async () => Component,
        loadRouteData: async (_route) => {
          return { data: { title: "Vue2 Title" } };
        },
        Vue: MockVue,
        renderer: mockRenderer,
      });

      const content = await readTextFile(join(vue2OutputDir, "index.html"));
      expect(content).toContain("Vue2 Title");
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

    it("Vue3 应该能够生成 sitemap.xml", async () => {
      await cleanup(vue3OutputDir);

      const { h } = await import("vue");
      const Component = {
        props: ["route"],
        setup(_props: any) {
          return () => h("div", null, "Content");
        },
      };

      const files = await renderSSG({
        engine: "vue3",
        routes: ["/", "/about"],
        outputDir: vue3OutputDir,
        loadRouteComponent: async () => Component,
        generateSitemap: true,
      });

      expect(files.some((f) => f.includes("sitemap.xml"))).toBe(true);

      const sitemapContent = await readTextFile(
        join(vue3OutputDir, "sitemap.xml"),
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

    it("Vue3 应该能够生成 robots.txt", async () => {
      await cleanup(vue3OutputDir);

      const { h } = await import("vue");
      const Component = {
        props: ["route"],
        setup(_props: any) {
          return () => h("div", null, "Content");
        },
      };

      const files = await renderSSG({
        engine: "vue3",
        routes: ["/"],
        outputDir: vue3OutputDir,
        loadRouteComponent: async () => Component,
        generateRobots: true,
      });

      expect(files.some((f) => f.includes("robots.txt"))).toBe(true);

      const robotsContent = await readTextFile(
        join(vue3OutputDir, "robots.txt"),
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

    it("Vue3 应该能够处理路由数据", async () => {
      await cleanup(vue3OutputDir);

      const { h } = await import("vue");
      const Component = {
        props: ["route", "data"],
        setup(props: { data?: { title: string } }) {
          return () =>
            h("div", null, `Title: ${props.data?.title || "Default"}`);
        },
      };

      const files = await renderSSG({
        engine: "vue3",
        routes: ["/"],
        outputDir: vue3OutputDir,
        loadRouteComponent: async () => Component,
        loadRouteData: async (route) => {
          return { data: { title: "Vue3 Title" } };
        },
      });

      const content = await readTextFile(join(vue3OutputDir, "index.html"));
      expect(content).toContain("Vue3 Title");

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
