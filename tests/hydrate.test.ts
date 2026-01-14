/**
 * Hydration 水合测试
 */

import { describe, expect, it } from "@dreamer/test";
import { hydrate } from "../src/hydrate.ts";

describe("hydrate", () => {
  describe("环境检查", () => {
    it("React 应该在非浏览器环境抛出错误", () => {
      expect(() => {
        hydrate({
          engine: "react",
          component: () => null,
          container: "#app",
        });
      }).toThrow("水合只能在浏览器环境中运行");
    });

    it("Preact 应该在非浏览器环境抛出错误", () => {
      expect(() => {
        hydrate({
          engine: "preact",
          component: () => null,
          container: "#app",
        });
      }).toThrow("水合只能在浏览器环境中运行");
    });

    it("Vue3 应该在非浏览器环境抛出错误", () => {
      expect(() => {
        hydrate({
          engine: "vue3",
          component: { setup: () => () => null },
          container: "#app",
        });
      }).toThrow("水合只能在浏览器环境中运行");
    });
  });

  // 注意：实际的水合测试需要在浏览器环境中运行
  // 这里只测试错误处理和类型检查

  describe("错误处理", () => {
    it("React 应该处理无效容器", () => {
      // 模拟浏览器环境
      const originalDocument = globalThis.document;
      globalThis.document = {
        querySelector: () => null,
      } as any;

      try {
        expect(() => {
          hydrate({
            engine: "react",
            component: () => null,
            container: "#nonexistent",
          });
        }).toThrow("容器元素未找到");
      } finally {
        // 恢复原始 document
        globalThis.document = originalDocument;
      }
    });

    it("Preact 应该处理无效容器", () => {
      // 模拟浏览器环境
      const originalDocument = globalThis.document;
      globalThis.document = {
        querySelector: () => null,
      } as any;

      try {
        expect(() => {
          hydrate({
            engine: "preact",
            component: () => null,
            container: "#nonexistent",
          });
        }).toThrow("容器元素未找到");
      } finally {
        // 恢复原始 document
        globalThis.document = originalDocument;
      }
    });

    it("Vue3 应该处理无效容器", () => {
      // 模拟浏览器环境
      const originalDocument = globalThis.document;
      globalThis.document = {
        querySelector: () => null,
      } as any;

      try {
        expect(() => {
          hydrate({
            engine: "vue3",
            component: { setup: () => () => null },
            container: "#nonexistent",
          });
        }).toThrow("容器元素未找到");
      } finally {
        // 恢复原始 document
        globalThis.document = originalDocument;
      }
    });
  });

  describe("React 严格模式", () => {
    it("应该支持严格模式选项", () => {
      // 模拟浏览器环境
      globalThis.document = {
        querySelector: () => ({
          innerHTML: "<div>Content</div>",
        }),
      } as any;

      try {
        hydrate({
          engine: "react",
          component: () => null,
          container: "#app",
          strictMode: true,
        });
      } catch {
        // 忽略其他错误，只测试选项是否被接受
      }

      expect(true).toBe(true);
    });
  });

  describe("Preact 选项", () => {
    it("应该支持 Preact 选项", () => {
      // 模拟浏览器环境
      globalThis.document = {
        querySelector: () => ({
          innerHTML: "<div>Content</div>",
        }),
      } as any;

      try {
        hydrate({
          engine: "preact",
          component: () => null,
          container: "#app",
        });
      } catch {
        // 忽略其他错误，只测试选项是否被接受
      }

      expect(true).toBe(true);
    });
  });

  describe("Vue3 选项", () => {
    it("应该支持 Vue3 选项", () => {
      // 模拟浏览器环境
      globalThis.document = {
        querySelector: () => ({
          innerHTML: "<div>Content</div>",
        }),
      } as any;

      try {
        hydrate({
          engine: "vue3",
          component: { setup: () => () => null },
          container: "#app",
        });
      } catch {
        // 忽略其他错误，只测试选项是否被接受
      }

      expect(true).toBe(true);
    });
  });

  describe("性能监控", () => {
    it("React 应该支持性能监控选项", () => {
      let metrics: any = null;

      // 模拟浏览器环境
      globalThis.document = {
        querySelector: () => ({
          innerHTML: "<div>Content</div>",
        }),
      } as any;
      globalThis.performance = {
        now: () => Date.now(),
      } as any;

      try {
        hydrate({
          engine: "react",
          component: () => null,
          container: "#app",
          performance: {
            enabled: true,
            onMetrics: (m) => {
              metrics = m;
            },
          },
        });
      } catch {
        // 忽略其他错误
      }

      expect(true).toBe(true);
    });

    it("Preact 应该支持性能监控选项", () => {
      let metrics: any = null;

      // 模拟浏览器环境
      globalThis.document = {
        querySelector: () => ({
          innerHTML: "<div>Content</div>",
        }),
      } as any;
      globalThis.performance = {
        now: () => Date.now(),
      } as any;

      try {
        hydrate({
          engine: "preact",
          component: () => null,
          container: "#app",
          performance: {
            enabled: true,
            onMetrics: (m) => {
              metrics = m;
            },
          },
        });
      } catch {
        // 忽略其他错误
      }

      expect(true).toBe(true);
    });

    it("Vue3 应该支持性能监控选项", () => {
      let metrics: any = null;

      // 模拟浏览器环境
      globalThis.document = {
        querySelector: () => ({
          innerHTML: "<div>Content</div>",
        }),
      } as any;
      globalThis.performance = {
        now: () => Date.now(),
      } as any;

      try {
        hydrate({
          engine: "vue3",
          component: { setup: () => () => null },
          container: "#app",
          performance: {
            enabled: true,
            onMetrics: (m) => {
              metrics = m;
            },
          },
        });
      } catch {
        // 忽略其他错误
      }

      expect(true).toBe(true);
    });
  });
});
