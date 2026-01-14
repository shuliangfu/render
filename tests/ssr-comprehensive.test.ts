/**
 * SSR 全面测试
 * 覆盖所有 SSR 功能：元数据、数据注入、脚本、错误处理、性能监控、缓存、压缩等
 */

import { assertRejects, describe, expect, it } from "@dreamer/test";
import React from "react";
import { renderSSR } from "../src/ssr.ts";
import type { LoadContext, Metadata } from "../src/types.ts";

describe("SSR 全面测试", () => {
  describe("元数据管理", () => {
    it("应该支持静态元数据", async () => {
      const Component = () => "Content";
      Component.metadata = {
        title: "测试页面",
        description: "这是一个测试页面",
      } as Metadata;

      const result = await renderSSR({
        engine: "react",
        component: Component,
        template: "<html><head></head><body><!--ssr-outlet--></body></html>",
      });

      expect(result.metadata?.title).toBe("测试页面");
      expect(result.metadata?.description).toBe("这是一个测试页面");
      expect(result.html).toContain("<title>测试页面</title>");
      expect(result.html).toContain('name="description"');
    });

    it("应该支持同步函数元数据", async () => {
      const Component = () => "Content";
      Component.metadata = (context: LoadContext) =>
        ({
          title: `页面 - ${context.url}`,
        }) as Metadata;

      const result = await renderSSR({
        engine: "react",
        component: Component,
        loadContext: { url: "/test", params: {} },
      });

      expect(result.metadata?.title).toBe("页面 - /test");
    });

    it("应该支持异步函数元数据", async () => {
      const Component = () => "Content";
      Component.metadata = async (context: LoadContext) => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return {
          title: `异步页面 - ${context.url}`,
        } as Metadata;
      };

      const result = await renderSSR({
        engine: "react",
        component: Component,
        loadContext: { url: "/async", params: {} },
      });

      expect(result.metadata?.title).toBe("异步页面 - /async");
    });

    it("应该合并布局和页面元数据", async () => {
      const Layout = () => "Layout";
      Layout.metadata = {
        title: "默认标题",
        description: "默认描述",
      } as Metadata;

      const Page = () => "Page";
      Page.metadata = {
        title: "页面标题",
      } as Metadata;

      const result = await renderSSR({
        engine: "react",
        component: Page,
        layouts: [{ component: Layout }],
      });

      // 页面元数据应该覆盖布局元数据
      expect(result.metadata?.title).toBe("页面标题");
      expect(result.metadata?.description).toBe("默认描述");
    });

    it("应该生成完整的 meta 标签", async () => {
      const Component = () => "Content";
      Component.metadata = {
        title: "测试",
        description: "描述",
        keywords: "关键词1, 关键词2",
        og: {
          title: "OG 标题",
          description: "OG 描述",
          image: "https://example.com/image.jpg",
        },
        twitter: {
          card: "summary",
          title: "Twitter 标题",
        },
      } as Metadata;

      const result = await renderSSR({
        engine: "react",
        component: Component,
        template:
          "<html><head><!--meta-tags-outlet--></head><body></body></html>",
      });

      expect(result.html).toContain("<title>测试</title>");
      expect(result.html).toContain('property="og:title"');
      expect(result.html).toContain('name="twitter:card"');
    });
  });

  describe("数据注入", () => {
    it("应该支持页面 load 方法", async () => {
      const Component = () => "Content";
      Component.load = async (context: LoadContext) => ({
        pageData: "页面数据",
        url: context.url,
      });

      const result = await renderSSR({
        engine: "react",
        component: Component,
        loadContext: { url: "/test", params: {} },
      });

      expect(result.pageData).toEqual({
        pageData: "页面数据",
        url: "/test",
      });
      expect(result.html).toContain("window.__DATA__");
    });

    it("应该支持布局 load 方法", async () => {
      const Layout = () => "Layout";
      Layout.load = async () => ({
        layoutData: "布局数据",
      });

      const Page = () => "Page";
      Page.load = async () => ({
        pageData: "页面数据",
      });

      const result = await renderSSR({
        engine: "react",
        component: Page,
        layouts: [{ component: Layout }],
        loadContext: { url: "/", params: {} },
      });

      expect(result.layoutData).toEqual({ layoutData: "布局数据" });
      expect(result.pageData).toEqual({ pageData: "页面数据" });
      expect(result.html).toContain("window.__DATA__");
    });

    it("应该注入完整的数据对象", async () => {
      const Component = () => "Content";
      Component.load = async () => ({ data: "test" });

      const result = await renderSSR({
        engine: "react",
        component: Component,
        loadContext: { url: "/test?foo=bar", params: { id: "123" } },
      });

      expect(result.html).toContain("window.__DATA__");
      expect(result.html).toContain('"route":"/test"');
      expect(result.html).toContain('"url":"/test?foo=bar"');
      expect(result.html).toContain('"params":{"id":"123"}');
    });
  });

  describe("脚本提取和注入", () => {
    it("应该从组件中提取脚本", async () => {
      const Component = () => "Content";
      Component.scripts = [
        { src: "/script.js", async: true },
        { src: "/another.js", defer: true, priority: 1 },
      ];

      const result = await renderSSR({
        engine: "react",
        component: Component,
        template:
          "<html><head></head><body><!--scripts-outlet--></body></html>",
      });

      expect(result.html).toContain('src="/script.js"');
      expect(result.html).toContain("async");
      expect(result.html).toContain('src="/another.js"');
      expect(result.html).toContain("defer");
    });

    it("应该合并多个脚本并排序", async () => {
      const Layout = () => "Layout";
      Layout.scripts = [{ src: "/layout.js", priority: 10 }];

      const Page = () => "Page";
      Page.scripts = [{ src: "/page.js", priority: 1 }];

      const result = await renderSSR({
        engine: "react",
        component: Page,
        layouts: [{ component: Layout }],
        template:
          "<html><head></head><body><!--scripts-outlet--></body></html>",
      });

      const pageIndex = result.html.indexOf("/page.js");
      const layoutIndex = result.html.indexOf("/layout.js");
      // 优先级低的应该先出现
      expect(pageIndex).toBeLessThan(layoutIndex);
    });

    it("应该支持内联脚本", async () => {
      const Component = () => "Content";
      Component.scripts = [
        { content: "console.log('test');", type: "text/javascript" },
      ];

      const result = await renderSSR({
        engine: "react",
        component: Component,
        template:
          "<html><head></head><body><!--scripts-outlet--></body></html>",
      });

      expect(result.html).toContain("<script");
      expect(result.html).toContain("console.log('test');");
    });

    it("应该支持客户端脚本选项", async () => {
      const result = await renderSSR({
        engine: "react",
        component: () => "Content",
        clientScripts: ["/app.js", "<script>console.log('inline');</script>"],
        template:
          "<html><head></head><body><!--client-scripts-outlet--></body></html>",
      });

      expect(result.html).toContain('src="/app.js"');
      expect(result.html).toContain("console.log('inline');");
    });
  });

  describe("错误处理", () => {
    it("应该捕获渲染错误", async () => {
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

    it("应该支持错误处理回调", async () => {
      let errorCaught = false;
      const Component = () => {
        throw new Error("测试错误");
      };

      await assertRejects(
        () =>
          renderSSR({
            engine: "react",
            component: Component,
            errorHandler: {
              onError: (error) => {
                errorCaught = true;
                expect(error.message).toBe("测试错误");
              },
            },
          }),
        Error,
      );

      expect(errorCaught).toBe(true);
    });

    it("应该支持降级组件", async () => {
      const Component = () => {
        throw new Error("渲染错误");
      };

      const Fallback = () => "降级内容";

      const result = await renderSSR({
        engine: "react",
        component: Component,
        errorHandler: {
          fallbackComponent: Fallback,
        },
      });

      expect(result.html).toContain("降级内容");
    });
  });

  describe("性能监控", () => {
    it("应该记录渲染时间", async () => {
      let metrics: any = null;

      const result = await renderSSR({
        engine: "react",
        component: () => "Content",
        performance: {
          enabled: true,
          onMetrics: (m) => {
            metrics = m;
          },
        },
      });

      expect(result.performance).toBeDefined();
      expect(result.performance?.duration).toBeGreaterThanOrEqual(0);
      expect(result.performance?.engine).toBe("react");
      expect(result.performance?.phase).toBe("ssr");
      expect(metrics).toBeDefined();
      expect(metrics.duration).toBeGreaterThanOrEqual(0);
    });

    it("应该在不启用时不记录性能", async () => {
      const result = await renderSSR({
        engine: "react",
        component: () => "Content",
        performance: {
          enabled: false,
        },
      });

      expect(result.performance).toBeUndefined();
    });
  });

  describe("元数据缓存", () => {
    it("应该缓存元数据", async () => {
      const cache = new Map<string, any>();
      let cacheGetCount = 0;
      let cacheSetCount = 0;

      const Component = () => "Content";
      Component.metadata = {
        title: "缓存测试",
      } as Metadata;

      const cacheOptions = {
        enabled: true,
        storage: {
          get: (key: string) => {
            cacheGetCount++;
            return cache.get(key) || null;
          },
          set: (key: string, value: any) => {
            cacheSetCount++;
            cache.set(key, value);
          },
          delete: (key: string) => {
            cache.delete(key);
          },
        },
      };

      // 第一次渲染，应该设置缓存
      const result1 = await renderSSR({
        engine: "react",
        component: Component,
        loadContext: { url: "/test", params: {} },
        metadataCache: cacheOptions,
      });

      expect(cacheSetCount).toBe(1);
      expect(result1.fromCache).toBe(false);

      // 第二次渲染，应该从缓存读取
      const result2 = await renderSSR({
        engine: "react",
        component: Component,
        loadContext: { url: "/test", params: {} },
        metadataCache: cacheOptions,
      });

      expect(cacheGetCount).toBeGreaterThan(0);
      expect(result2.fromCache).toBe(true);
      expect(result2.metadata?.title).toBe("缓存测试");
    });
  });

  describe("数据压缩", () => {
    it("应该压缩大数据", async () => {
      const Component = () => "Content";
      Component.load = async () => {
        // 生成大于阈值的数据
        return {
          largeData: "x".repeat(20000), // 20KB
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

      expect(result.compressedSize).toBeDefined();
      expect(result.originalSize).toBeDefined();
      expect(result.compressedSize!).toBeLessThan(result.originalSize!);
      expect(result.html).toContain("decompressData");
    });

    it("应该在小数据时不压缩", async () => {
      const Component = () => "Content";
      Component.load = async () => ({
        smallData: "test",
      });

      const result = await renderSSR({
        engine: "react",
        component: Component,
        loadContext: { url: "/", params: {} },
        compression: {
          enabled: true,
          threshold: 10240,
        },
      });

      expect(result.compressedSize).toBeUndefined();
      expect(result.originalSize).toBeUndefined();
    });
  });

  describe("数据懒加载", () => {
    it("应该对大数据启用懒加载", async () => {
      const Component = () => "Content";
      Component.load = async () => ({
        largeData: "x".repeat(20000),
      });

      const result = await renderSSR({
        engine: "react",
        component: Component,
        loadContext: { url: "/", params: {} },
        lazyData: true,
      });

      expect(result.html).toContain("__DATA_LOADED__");
      expect(result.html).toContain("DOMContentLoaded");
    });
  });

  describe("Context API", () => {
    it("应该合并 Context 元数据", async () => {
      const Component = () => "Content";
      Component.metadata = {
        title: "原始标题",
        description: "原始描述",
      } as Metadata;

      const result = await renderSSR({
        engine: "react",
        component: Component,
        contextData: {
          metadata: {
            title: "Context 标题",
          },
        },
      });

      // Context 数据应该覆盖原始数据
      expect(result.metadata?.title).toBe("Context 标题");
      expect(result.metadata?.description).toBe("原始描述");
    });

    it("应该合并 Context 服务端数据", async () => {
      const Component = () => "Content";
      Component.load = async () => ({
        original: "原始数据",
      });

      const result = await renderSSR({
        engine: "react",
        component: Component,
        loadContext: { url: "/", params: {} },
        contextData: {
          serverData: {
            context: "Context 数据",
          },
        },
      });

      // 使用直接属性访问（兼容 Bun 测试环境，toHaveProperty 可能不可用）
      expect(result.pageData).toBeDefined();
      expect(result.pageData?.original).toBe("原始数据");
      expect(result.pageData?.context).toBe("Context 数据");
    });
  });

  describe("流式渲染", () => {
    it("应该支持 React 流式渲染", async () => {
      const Component = () => "流式内容";

      const result = await renderSSR({
        engine: "react",
        component: Component,
        stream: true,
      });

      expect(result.html).toContain("流式内容");
      expect(result.renderInfo?.stream).toBe(true);
    });

    it("应该支持 Preact 流式渲染", async () => {
      const Component = () => "Preact 流式内容";

      const result = await renderSSR({
        engine: "preact",
        component: Component,
        stream: true,
      });

      expect(result.html).toContain("Preact 流式内容");
      expect(result.renderInfo?.stream).toBe(true);
    });
  });

  describe("布局系统", () => {
    it("应该支持多层嵌套布局", async () => {
      // 使用 React.createElement 来正确渲染 children
      const OuterLayout = ({ children }: any) =>
        React.createElement("div", null, "Outer: ", children);
      const InnerLayout = ({ children }: any) =>
        React.createElement("div", null, "Inner: ", children);
      const Page = () => React.createElement("div", null, "Page");

      const result = await renderSSR({
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
      const Layout = ({ children }: any) => `Layout: ${children}`;
      const Page = () => "Page";
      Page.layout = false;

      const result = await renderSSR({
        engine: "react",
        component: Page,
        layouts: [{ component: Layout }],
      });

      expect(result.html).not.toContain("Layout:");
      expect(result.html).toContain("Page");
    });

    it("应该支持布局 skip 属性", async () => {
      const Layout = ({ children }: any) => `Layout: ${children}`;
      const Page = () => "Page";

      const result = await renderSSR({
        engine: "react",
        component: Page,
        layouts: [{ component: Layout, skip: true }],
      });

      expect(result.html).not.toContain("Layout:");
    });
  });

  describe("所有模板引擎", () => {
    it("应该支持 React", async () => {
      const result = await renderSSR({
        engine: "react",
        component: () => "React",
      });

      expect(result.html).toContain("React");
      expect(result.renderInfo?.engine).toBe("react");
    });

    it("应该支持 Preact", async () => {
      const result = await renderSSR({
        engine: "preact",
        component: () => "Preact",
      });

      expect(result.html).toContain("Preact");
      expect(result.renderInfo?.engine).toBe("preact");
    });

    it("应该支持 Vue3", async () => {
      const result = await renderSSR({
        engine: "vue3",
        component: {
          template: "<div>Vue3</div>",
        },
      });

      expect(result.html).toContain("Vue3");
      expect(result.renderInfo?.engine).toBe("vue3");
    });
  });
});
