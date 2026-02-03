/**
 * 客户端工具函数测试
 *
 * 测试不需要浏览器环境的工具函数
 */

import { describe, expect, it } from "@dreamer/test";

// 布局工具函数
import {
  composeLayouts,
  createComponentTree,
  shouldSkipLayouts,
} from "../src/client/utils/layout.ts";

// 性能监控工具
import {
  createPerformanceMonitor,
  PerformanceMonitor,
  recordPerformanceMetrics,
} from "../src/client/utils/performance.ts";

// 错误处理工具
import { handleRenderError } from "../src/client/utils/error-handler.ts";

// 类型
import type { PerformanceMetrics } from "../src/client/types.ts";

describe("客户端工具函数测试", () => {
  describe("layout 工具", () => {
    describe("shouldSkipLayouts", () => {
      it("应该在组件有 inheritLayout=false 时返回 true", () => {
        const component = { inheritLayout: false };
        expect(shouldSkipLayouts(component)).toBe(true);
      });

      it("应该在组件没有 inheritLayout 属性时返回 false", () => {
        const component = {};
        expect(shouldSkipLayouts(component)).toBe(false);
      });

      it("应该在组件 inheritLayout=true 时返回 false", () => {
        const component = { inheritLayout: true };
        expect(shouldSkipLayouts(component)).toBe(false);
      });

      it("应该在非对象时返回 false", () => {
        expect(shouldSkipLayouts(null)).toBe(false);
        expect(shouldSkipLayouts(undefined)).toBe(false);
        expect(shouldSkipLayouts("string")).toBe(false);
        expect(shouldSkipLayouts(123)).toBe(false);
      });
    });

    describe("composeLayouts", () => {
      it("应该在没有布局时返回原组件配置", () => {
        const component = { name: "TestComponent" };
        const props = { title: "Hello" };

        const result = composeLayouts("preact", component, props, [], false);

        expect(result.component).toBe(component);
        expect(result.props).toEqual(props);
      });

      it("应该在跳过布局时返回原组件配置", () => {
        const component = { name: "TestComponent" };
        const props = { title: "Hello" };
        const layouts = [{ component: { name: "Layout" } }];

        const result = composeLayouts(
          "preact",
          component,
          props,
          layouts,
          true,
        );

        expect(result.component).toBe(component);
        expect(result.props).toEqual(props);
      });

      it("应该正确组合单个布局", () => {
        const pageComponent = { name: "Page" };
        const pageProps = { title: "Page Title" };
        const layoutComponent = { name: "MainLayout" };
        const layoutProps = { theme: "dark" };
        const layouts = [{ component: layoutComponent, props: layoutProps }];

        const result = composeLayouts(
          "preact",
          pageComponent,
          pageProps,
          layouts,
          false,
        );

        // 最外层应该是布局组件
        expect(result.component).toBe(layoutComponent);
        expect(result.props.theme).toBe("dark");
        // children 应该是页面组件配置
        expect((result.props.children as any).component).toBe(pageComponent);
        expect((result.props.children as any).props).toEqual(pageProps);
      });

      it("应该正确组合多个布局（从外到内）", () => {
        const pageComponent = { name: "Page" };
        const pageProps = { title: "Page" };
        const outerLayout = { name: "OuterLayout" };
        const innerLayout = { name: "InnerLayout" };
        const layouts = [
          { component: outerLayout },
          { component: innerLayout },
        ];

        const result = composeLayouts(
          "preact",
          pageComponent,
          pageProps,
          layouts,
          false,
        );

        // 最外层是 outerLayout
        expect(result.component).toBe(outerLayout);
        // 第二层是 innerLayout
        const secondLevel = result.props.children as any;
        expect(secondLevel.component).toBe(innerLayout);
        // 最内层是页面组件
        const thirdLevel = secondLevel.props.children as any;
        expect(thirdLevel.component).toBe(pageComponent);
      });
    });

    describe("createComponentTree", () => {
      it("应该创建简单的组件树", () => {
        const mockCreateElement = (
          type: unknown,
          props: unknown,
          ..._children: unknown[]
        ) => ({
          type,
          props,
        });

        const config = {
          component: "div",
          props: { className: "test" },
        };

        const result = createComponentTree(mockCreateElement, config) as any;

        expect(result.type).toBe("div");
        expect(result.props.className).toBe("test");
      });

      it("应该递归创建嵌套的组件树", () => {
        const mockCreateElement = (
          type: unknown,
          props: unknown,
          ..._children: unknown[]
        ) => ({
          type,
          props,
        });

        const config = {
          component: "div",
          props: {
            className: "outer",
            children: {
              component: "span",
              props: { className: "inner" },
            },
          },
        };

        const result = createComponentTree(mockCreateElement, config) as any;

        expect(result.type).toBe("div");
        expect(result.props.className).toBe("outer");
        // children 应该是嵌套元素
        expect(result.props.children.type).toBe("span");
        expect(result.props.children.props.className).toBe("inner");
      });
    });
  });

  describe("performance 工具", () => {
    describe("PerformanceMonitor", () => {
      it("应该创建性能监控实例", () => {
        const monitor = new PerformanceMonitor({ enabled: true });
        expect(monitor).toBeDefined();
      });

      it("应该记录渲染时间", async () => {
        const monitor = new PerformanceMonitor({
          enabled: true,
          slowThreshold: 100,
        });

        monitor.start("preact", "csr");

        // 模拟渲染耗时
        await new Promise((resolve) => setTimeout(resolve, 10));

        const metrics = monitor.end();

        expect(metrics.engine).toBe("preact");
        expect(metrics.phase).toBe("csr");
        expect(metrics.duration).toBeGreaterThan(0);
        expect(metrics.startTime).toBeLessThan(metrics.endTime);
      });

      it("应该正确标记慢渲染", async () => {
        const monitor = new PerformanceMonitor({
          enabled: true,
          slowThreshold: 5, // 很低的阈值
        });

        monitor.start("react", "hydrate");

        // 模拟超过阈值的渲染
        await new Promise((resolve) => setTimeout(resolve, 10));

        const metrics = monitor.end();

        expect(metrics.isSlow).toBe(true);
      });

      it("应该正确标记快速渲染", () => {
        const monitor = new PerformanceMonitor({
          enabled: true,
          slowThreshold: 1000, // 很高的阈值
        });

        monitor.start("preact", "csr");
        const metrics = monitor.end();

        expect(metrics.isSlow).toBe(false);
      });
    });

    describe("createPerformanceMonitor", () => {
      it("应该在启用时返回监控实例", () => {
        const monitor = createPerformanceMonitor({ enabled: true });
        expect(monitor).toBeInstanceOf(PerformanceMonitor);
      });

      it("应该在未启用时返回 null", () => {
        const monitor = createPerformanceMonitor({ enabled: false });
        expect(monitor).toBeNull();
      });

      it("应该在没有选项时返回 null", () => {
        const monitor = createPerformanceMonitor(undefined);
        expect(monitor).toBeNull();
      });
    });

    describe("recordPerformanceMetrics", () => {
      it("应该调用回调函数", () => {
        let calledMetrics: PerformanceMetrics | null = null;

        const metrics: PerformanceMetrics = {
          startTime: 100,
          endTime: 150,
          duration: 50,
          engine: "preact",
          phase: "csr",
          isSlow: false,
        };

        recordPerformanceMetrics(metrics, {
          enabled: true,
          onMetrics: (m) => {
            calledMetrics = m;
          },
        });

        expect(calledMetrics).toEqual(metrics);
      });

      it("应该处理回调函数错误", () => {
        const metrics: PerformanceMetrics = {
          startTime: 100,
          endTime: 150,
          duration: 50,
          engine: "preact",
          phase: "csr",
          isSlow: false,
        };

        // 应该不抛出错误
        expect(() => {
          recordPerformanceMetrics(metrics, {
            enabled: true,
            onMetrics: () => {
              throw new Error("Test error");
            },
          });
        }).not.toThrow();
      });
    });
  });

  describe("error-handler 工具", () => {
    describe("handleRenderError", () => {
      it("应该返回 false 当没有降级组件时", async () => {
        const result = await handleRenderError(
          new Error("Test error"),
          { engine: "preact", component: {}, phase: "csr" },
          undefined,
        );

        expect(result).toBe(false);
      });

      it("应该返回 true 当有降级组件时", async () => {
        const result = await handleRenderError(
          new Error("Test error"),
          { engine: "react", component: {}, phase: "hydrate" },
          { fallbackComponent: () => null },
        );

        expect(result).toBe(true);
      });

      it("应该调用 onError 回调", async () => {
        const captured: { error: Error | null; context: any } = {
          error: null,
          context: null,
        };

        await handleRenderError(
          new Error("Test error message"),
          { engine: "react", component: {}, phase: "csr" },
          {
            onError: (err, ctx) => {
              captured.error = err;
              captured.context = ctx;
            },
            logError: false, // 禁用控制台输出
          },
        );

        expect(captured.error).not.toBeNull();
        expect(captured.error?.message).toBe("Test error message");
        expect(captured.context.engine).toBe("react");
        expect(captured.context.phase).toBe("csr");
      });

      it("应该处理非 Error 类型的错误", async () => {
        const captured: { error: Error | null } = { error: null };

        await handleRenderError(
          "String error",
          { engine: "preact", component: {}, phase: "csr" },
          {
            onError: (err) => {
              captured.error = err;
            },
            logError: false,
          },
        );

        expect(captured.error).toBeInstanceOf(Error);
        expect(captured.error?.message).toBe("String error");
      });

      it("应该处理 onError 回调抛出的错误", async () => {
        // 不应该抛出错误
        const result = await handleRenderError(
          new Error("Test error"),
          { engine: "preact", component: {}, phase: "csr" },
          {
            onError: () => {
              throw new Error("Callback error");
            },
            logError: false,
          },
        );

        // 应该正常返回
        expect(result).toBe(false);
      });

      it("应该支持异步 onError 回调", async () => {
        let asyncCalled = false;

        await handleRenderError(
          new Error("Test error"),
          { engine: "react", component: {}, phase: "hydrate" },
          {
            onError: async () => {
              await new Promise((resolve) => setTimeout(resolve, 10));
              asyncCalled = true;
            },
            logError: false,
          },
        );

        expect(asyncCalled).toBe(true);
      });

      it("应该根据 logError 选项控制日志输出", async () => {
        // 默认应该输出日志（logError 不设置时为 true）
        // 这里只验证不抛出错误
        await handleRenderError(
          new Error("Test error"),
          { engine: "preact", component: {}, phase: "csr" },
          { logError: true },
        );

        // 禁用日志时也不应该抛出错误
        await handleRenderError(
          new Error("Test error"),
          { engine: "preact", component: {}, phase: "csr" },
          { logError: false },
        );
      });
    });
  });
});
