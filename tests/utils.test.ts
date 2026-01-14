/**
 * 工具函数全面测试
 */

import { describe, expect, it } from "@dreamer/test";
import type { LoadContext, Metadata, ScriptDefinition } from "../src/types.ts";
import {
  cacheMetadata,
  generateCacheKey,
  getCachedMetadata,
} from "../src/utils/cache.ts";
import { compressData, decompressData } from "../src/utils/compression.ts";
import {
  mergeContextMetadata,
  mergeContextServerData,
} from "../src/utils/context.ts";
import {
  generateLazyDataScript,
  shouldLazyLoad,
} from "../src/utils/lazy-loading.ts";
import {
  extractMetadata,
  generateMetaTags,
  mergeMetadata,
  resolveMetadata,
} from "../src/utils/metadata.ts";
import {
  createPerformanceMonitor,
  recordPerformanceMetrics,
} from "../src/utils/performance.ts";
import {
  extractScripts,
  generateScriptTags,
  mergeScripts,
} from "../src/utils/scripts.ts";
import {
  extractLoadFunction,
  generateDataScript,
  loadServerData,
} from "../src/utils/server-data.ts";

describe("工具函数测试", () => {
  describe("metadata 工具", () => {
    it("应该提取静态元数据", () => {
      const Component = {
        metadata: { title: "测试" } as Metadata,
      };

      const metadata = extractMetadata(Component);
      expect(metadata).toEqual({ title: "测试" });
    });

    it("应该提取函数元数据", () => {
      const Component = {
        metadata: (context: LoadContext) =>
          ({
            title: context.url,
          }) as Metadata,
      };

      const metadata = extractMetadata(Component);
      expect(typeof metadata).toBe("function");
    });

    it("应该解析同步函数元数据", async () => {
      const metadataFn = (context: LoadContext) =>
        ({
          title: context.url,
        }) as Metadata;

      const result = await resolveMetadata(metadataFn, {
        url: "/test",
        params: {},
      });

      expect(result?.title).toBe("/test");
    });

    it("应该解析异步函数元数据", async () => {
      const metadataFn = async (context: LoadContext) => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return { title: context.url } as Metadata;
      };

      const result = await resolveMetadata(metadataFn, {
        url: "/async",
        params: {},
      });

      expect(result?.title).toBe("/async");
    });

    it("应该合并元数据", () => {
      const layout1: Metadata = { title: "布局1", description: "描述1" };
      const layout2: Metadata = { title: "布局2" };
      const page: Metadata = { title: "页面" };

      const merged = mergeMetadata([layout1, layout2], page);

      expect(merged.title).toBe("页面"); // 页面覆盖布局
      expect(merged.description).toBe("描述1"); // 保留布局的描述
    });

    it("应该生成 meta 标签", () => {
      const metadata: Metadata = {
        title: "测试",
        description: "描述",
        keywords: "关键词",
        og: {
          title: "OG 标题",
          image: "https://example.com/image.jpg",
        },
      };

      const html = generateMetaTags(metadata);

      expect(html).toContain("<title>测试</title>");
      expect(html).toContain('name="description"');
      expect(html).toContain('name="keywords"');
      expect(html).toContain('property="og:title"');
      expect(html).toContain('property="og:image"');
    });
  });

  describe("server-data 工具", () => {
    it("应该提取 load 函数", () => {
      const Component = {
        load: async () => ({ data: "test" }),
      };

      const loadFn = extractLoadFunction(Component);
      expect(loadFn).toBeDefined();
      expect(typeof loadFn).toBe("function");
    });

    it("应该调用 load 函数", async () => {
      const loadFn = async (context: LoadContext) => ({
        url: context.url,
        data: "test",
      });

      const result = await loadServerData(loadFn, {
        url: "/test",
        params: {},
      });

      expect(result).toEqual({
        url: "/test",
        data: "test",
      });
    });

    it("应该生成数据脚本", () => {
      const script = generateDataScript({
        metadata: { title: "测试" },
        layoutData: { layout: "data" },
        pageData: { page: "data" },
        route: "/test",
        url: "/test?foo=bar",
        params: { id: "123" },
      });

      expect(script).toContain("window.__DATA__");
      expect(script).toContain('"title":"测试"');
      expect(script).toContain('"route":"/test"');
    });
  });

  describe("scripts 工具", () => {
    it("应该提取脚本", () => {
      const Component = {
        scripts: [
          { src: "/script.js" },
          { src: "/another.js", async: true },
        ] as ScriptDefinition[],
      };

      const scripts = extractScripts(Component);
      expect(scripts.length).toBe(2);
      expect(scripts[0].src).toBe("/script.js");
      expect(scripts[1].async).toBe(true);
    });

    it("应该合并脚本并排序", () => {
      const scripts1: ScriptDefinition[] = [
        { src: "/a.js", priority: 10 },
        { src: "/b.js", priority: 5 },
      ];
      const scripts2: ScriptDefinition[] = [
        { src: "/c.js", priority: 1 },
      ];

      const merged = mergeScripts(scripts1, scripts2);

      expect(merged.length).toBe(3);
      // 应该按优先级排序
      expect(merged[0].src).toBe("/c.js");
      expect(merged[1].src).toBe("/b.js");
      expect(merged[2].src).toBe("/a.js");
    });

    it("应该生成脚本标签", () => {
      const scripts: ScriptDefinition[] = [
        { src: "/script.js", async: true },
        { content: "console.log('test');", type: "text/javascript" },
      ];

      const html = generateScriptTags(scripts);

      expect(html).toContain('src="/script.js"');
      expect(html).toContain("async");
      expect(html).toContain("console.log('test');");
    });
  });

  describe("cache 工具", () => {
    it("应该生成缓存键", () => {
      const key = generateCacheKey({
        url: "/test?foo=bar",
        params: { id: "123" },
      });

      expect(key).toContain("/test");
      expect(key).toContain("foo=bar");
    });

    it("应该缓存和获取元数据", async () => {
      const cache = new Map<string, any>();
      const metadata: Metadata = { title: "测试" };

      await cacheMetadata(
        { url: "/test", params: {} },
        metadata,
        {
          enabled: true,
          storage: {
            get: (key) => cache.get(key) || null,
            set: (key, value) => {
              cache.set(key, value);
            },
            delete: (key) => {
              cache.delete(key);
            },
          },
        },
      );

      const cached = await getCachedMetadata(
        { url: "/test", params: {} },
        {
          enabled: true,
          storage: {
            get: (key) => cache.get(key) || null,
            set: () => {},
            delete: () => {},
          },
        },
      );

      expect(cached?.title).toBe("测试");
    });
  });

  describe("performance 工具", () => {
    it("应该创建性能监控器", () => {
      const monitor = createPerformanceMonitor({ enabled: true });
      expect(monitor).toBeDefined();
    });

    it("应该记录性能指标", () => {
      let recordedMetrics: any = null;

      const monitor = createPerformanceMonitor({
        enabled: true,
        onMetrics: (metrics) => {
          recordedMetrics = metrics;
        },
      });

      if (monitor) {
        monitor.start("react", "ssr");
        // 模拟一些工作
        const end = monitor.end();
        recordPerformanceMetrics(end, {
          enabled: true,
          onMetrics: (metrics) => {
            recordedMetrics = metrics;
          },
        });

        expect(recordedMetrics).toBeDefined();
        expect(recordedMetrics.engine).toBe("react");
        expect(recordedMetrics.phase).toBe("ssr");
        expect(recordedMetrics.duration).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe("compression 工具", () => {
    it("应该压缩数据", () => {
      const data = { large: "x".repeat(20000) };
      const result = compressData(data, {
        enabled: true,
        threshold: 10240,
      });

      // 对于重复字符，压缩应该有效
      expect(result).toBeDefined();
      if (result) {
        expect(result.compressedSize).toBeLessThan(result.originalSize);
      }
    });

    it("应该解压数据", () => {
      const data = { test: "value" };
      const compressed = compressData(data, {
        enabled: true,
        threshold: 0,
      });

      if (compressed) {
        const decompressed = decompressData(compressed.compressed);
        expect(decompressed).toEqual(data);
      }
    });
  });

  describe("lazy-loading 工具", () => {
    it("应该判断是否需要懒加载", () => {
      const smallData = { data: "test" };
      const largeData = { data: "x".repeat(20000) };

      expect(shouldLazyLoad(smallData, 10240)).toBe(false);
      expect(shouldLazyLoad(largeData, 10240)).toBe(true);
    });

    it("应该生成懒加载脚本", () => {
      const data = { test: "value" };
      const script = generateLazyDataScript(data);

      expect(script).toContain("__DATA__");
      expect(script).toContain("__DATA_LOADED__");
      expect(script).toContain("DOMContentLoaded");
    });
  });

  describe("context 工具", () => {
    it("应该合并 Context 元数据", () => {
      const metadata: Metadata = {
        title: "原始",
        description: "描述",
      };

      const merged = mergeContextMetadata(metadata, {
        metadata: {
          title: "Context",
        },
      });

      expect(merged.title).toBe("Context");
      expect(merged.description).toBe("描述");
    });

    it("应该合并 Context 服务端数据", () => {
      const serverData = {
        original: "原始",
        nested: { value: "test" },
      };

      const merged = mergeContextServerData(serverData, {
        serverData: {
          context: "Context",
          nested: { newValue: "new" },
        },
      });

      expect(merged.original).toBe("原始");
      expect(merged.context).toBe("Context");
      // 使用直接属性访问（兼容 Bun 测试环境，toHaveProperty 可能不可用）
      expect(merged.nested).toBeDefined();
      // 合并后应该保留原始值，并添加新值
      const nested = merged.nested as { value: string; newValue: string };
      expect(nested.value).toBe("test"); // 原始值保留
      expect(nested.newValue).toBe("new"); // 新值添加
    });
  });
});
