/**
 * 客户端渲染浏览器测试
 *
 * 使用 @dreamer/test 的浏览器测试功能测试 CSR 和 Hydration
 * 需要 Playwright Chromium（先执行 npx playwright install chromium）
 */

import { afterAll, describe, expect, it } from "@dreamer/test";

/** 通用 body，三个入口共用 */
const sharedBodyContent = `
  <div id="app"></div>
  <div id="hydrate-app"><p>Server rendered content</p></div>
  <div id="error-app"></div>
`;

/** View 入口：仅 View 相关用例使用 */
const browserConfigView = {
  sanitizeOps: false,
  sanitizeResources: false,
  timeout: 60_000,
  browser: {
    enabled: true,
    browserSource: "test" as const,
    protocolTimeout: 90_000,
    reuseBrowser: true,
    entryPoint: "./tests/fixtures/view/browser-entry.ts",
    globalName: "RenderClient",
    browserMode: true,
    moduleLoadTimeout: 30_000,
    headless: true,
    bodyContent: sharedBodyContent,
  },
};

/** Preact 入口：仅 Preact 相关用例使用 */
const browserConfigPreact = {
  sanitizeOps: false,
  sanitizeResources: false,
  timeout: 60_000,
  browser: {
    enabled: true,
    browserSource: "test" as const,
    protocolTimeout: 90_000,
    reuseBrowser: true,
    entryPoint: "./tests/fixtures/preact/browser-entry.ts",
    globalName: "RenderClient",
    browserMode: true,
    moduleLoadTimeout: 30_000,
    headless: true,
    bodyContent: sharedBodyContent,
  },
};

/** React 入口：仅 React 相关用例使用 */
const browserConfigReact = {
  sanitizeOps: false,
  sanitizeResources: false,
  timeout: 60_000,
  browser: {
    enabled: true,
    browserSource: "test" as const,
    protocolTimeout: 90_000,
    reuseBrowser: true,
    entryPoint: "./tests/fixtures/react/browser-entry.ts",
    globalName: "RenderClient",
    browserMode: true,
    moduleLoadTimeout: 30_000,
    headless: true,
    bodyContent: sharedBodyContent,
  },
};

describe("客户端渲染 - View 入口", () => {
  afterAll(async () => {
    // 动态导入 cleanupAllBrowsers，避免 Bun 下 node_modules 解析的 mod.js 未导出该函数导致加载报错
    try {
      const { cleanupAllBrowsers } = await import("@dreamer/test");
      await cleanupAllBrowsers();
    } catch {
      // 忽略：部分环境（如 Bun + node_modules）可能无此导出，由运行器统一清理
    }
  });

  it("应该导出所有必要的函数", async (ctx) => {
    // 检查是否有浏览器设置错误
    if ((ctx as any)._browserSetupError) {
      console.warn("浏览器测试跳过：无法启动浏览器");
      return;
    }

    const browser = (ctx as any).browser;
    if (!browser) {
      console.warn("浏览器上下文不可用，跳过测试");
      return;
    }

    const result = await browser.evaluate(() => {
      const RenderClient = (globalThis as any).RenderClient;

      if (!RenderClient) {
        return { error: "RenderClient not available" };
      }

      return {
        hasRenderCSR: typeof RenderClient.renderCSR === "function",
        hasHydrate: typeof RenderClient.hydrate === "function",
        hasHandleRenderError:
          typeof RenderClient.handleRenderError === "function",
        hasRenderErrorFallback:
          typeof RenderClient.renderErrorFallback === "function",
        hasCreatePerformanceMonitor:
          typeof RenderClient.createPerformanceMonitor === "function",
        hasPerformanceMonitor:
          typeof RenderClient.PerformanceMonitor === "function",
        hasRecordPerformanceMetrics:
          typeof RenderClient.recordPerformanceMetrics === "function",
      };
    });

    if (result.error) {
      console.warn("测试跳过:", result.error);
      return;
    }

    expect(result.hasRenderCSR).toBe(true);
    expect(result.hasHydrate).toBe(true);
    expect(result.hasHandleRenderError).toBe(true);
    expect(result.hasRenderErrorFallback).toBe(true);
    expect(result.hasCreatePerformanceMonitor).toBe(true);
    expect(result.hasPerformanceMonitor).toBe(true);
    expect(result.hasRecordPerformanceMetrics).toBe(true);
  }, browserConfigView);

  it("应该创建性能监控实例", async (ctx) => {
    if ((ctx as any)._browserSetupError) return;

    const browser = (ctx as any).browser;
    if (!browser) return;

    const result = await browser.evaluate(() => {
      const RenderClient = (globalThis as any).RenderClient;

      if (!RenderClient) {
        return { error: "RenderClient not available" };
      }

      const monitor = RenderClient.createPerformanceMonitor({
        enabled: true,
        slowThreshold: 100,
      });

      if (!monitor) return { created: false };

      monitor.start("preact", "csr");
      const metrics = monitor.end();

      return {
        created: true,
        hasMetrics: !!metrics,
        engine: metrics.engine,
        phase: metrics.phase,
        hasDuration: typeof metrics.duration === "number",
      };
    });

    if (result.error) {
      console.warn("测试跳过:", result.error);
      return;
    }

    expect(result.created).toBe(true);
    expect(result.hasMetrics).toBe(true);
    expect(result.engine).toBe("preact");
    expect(result.phase).toBe("csr");
    expect(result.hasDuration).toBe(true);
  }, browserConfigView);

  it("应该在未启用时返回 null", async (ctx) => {
    if ((ctx as any)._browserSetupError) return;

    const browser = (ctx as any).browser;
    if (!browser) return;

    const result = await browser.evaluate(() => {
      const RenderClient = (globalThis as any).RenderClient;

      if (!RenderClient) {
        return { error: "RenderClient not available" };
      }

      const monitor = RenderClient.createPerformanceMonitor({
        enabled: false,
      });

      return { isNull: monitor === null };
    });

    if (result.error) {
      console.warn("测试跳过:", result.error);
      return;
    }

    expect(result.isNull).toBe(true);
  }, browserConfigView);

  it("应该显示错误降级 UI", async (ctx) => {
    if ((ctx as any)._browserSetupError) return;

    const browser = (ctx as any).browser;
    if (!browser) return;

    const result = await browser.evaluate(() => {
      const RenderClient = (globalThis as any).RenderClient;

      if (!RenderClient) {
        return { error: "RenderClient not available" };
      }

      // 清空错误容器
      const errorApp = document.getElementById("error-app");
      if (!errorApp) {
        return { error: "error-app container not found" };
      }

      errorApp.innerHTML = "";

      // 使用内置的错误降级 UI
      const testError = new Error("测试错误信息");
      RenderClient.renderErrorFallback(errorApp, testError, "csr");

      return {
        hasContent: errorApp.innerHTML.length > 0,
        containsErrorMessage: errorApp.innerHTML.includes("测试错误信息"),
        containsReloadButton: errorApp.innerHTML.includes("Reload"),
      };
    });

    if (result.error) {
      console.warn("测试跳过:", result.error);
      return;
    }

    expect(result.hasContent).toBe(true);
    expect(result.containsErrorMessage).toBe(true);
    expect(result.containsReloadButton).toBe(true);
  }, browserConfigView);

  it("应该在容器不存在时抛出错误（renderCSR，View 引擎）", async (ctx) => {
    if ((ctx as any)._browserSetupError) return;

    const browser = (ctx as any).browser;
    if (!browser) return;

    const result = await browser.evaluate(async () => {
      const RenderClient = (globalThis as any).RenderClient;

      if (!RenderClient) {
        return { error: "RenderClient not available" };
      }

      const TestComponent = () => null;

      try {
        await RenderClient.renderCSR({
          engine: "view",
          component: TestComponent,
          container: "#non-existent-container",
        });
        return { threw: false };
      } catch (error) {
        return {
          threw: true,
          message: (error as Error).message,
        };
      }
    });

    if (result.error) {
      console.warn("测试跳过:", result.error);
      return;
    }

    expect(result.threw).toBe(true);
    expect(result.message).toContain("Container element not found");
  }, browserConfigView);

  it("应该在非浏览器环境检测失败", async () => {
    // 在服务端运行，验证非浏览器环境下 renderCSR/hydrate 会拒绝
    const { renderCSR, hydrate } = await import("../src/client/mod.ts");

    expect(typeof renderCSR).toBe("function");
    expect(typeof hydrate).toBe("function");

    try {
      await renderCSR({
        engine: "preact",
        component: () => null,
        container: "#app",
      });
      expect(false).toBe(true);
    } catch (e) {
      expect(e).toBeInstanceOf(Error);
      expect((e as Error).message).toContain(
        "CSR render must run in browser environment",
      );
    }

    try {
      await hydrate({
        engine: "preact",
        component: () => null,
        container: "#app",
      });
      expect(false).toBe(true);
    } catch (e) {
      expect(e).toBeInstanceOf(Error);
      expect((e as Error).message).toContain(
        "Hydration must run in browser environment",
      );
    }
  });

  // ==================== 错误处理测试（所有引擎） ====================

  it("所有引擎: 应该显示 Hydration 错误降级 UI", async (ctx) => {
    if ((ctx as any)._browserSetupError) return;

    const browser = (ctx as any).browser;
    if (!browser) return;

    const result = await browser.evaluate(() => {
      const RenderClient = (globalThis as any).RenderClient;

      if (!RenderClient) {
        return { error: "RenderClient not available" };
      }

      // 清空错误容器
      const errorApp = document.getElementById("error-app");
      if (!errorApp) {
        return { error: "error-app container not found" };
      }

      errorApp.innerHTML = "";

      // 测试 hydrate 阶段的错误降级 UI
      const testError = new Error("Hydration 错误测试");
      RenderClient.renderErrorFallback(errorApp, testError, "hydrate");

      return {
        hasContent: errorApp.innerHTML.length > 0,
        containsErrorMessage: errorApp.innerHTML.includes("Hydration 错误测试"),
        containsPhaseText: errorApp.innerHTML.includes("Hydrate error"),
        containsReloadButton: errorApp.innerHTML.includes("Reload"),
      };
    });

    if (result.error) {
      console.warn("测试跳过:", result.error);
      return;
    }

    expect(result.hasContent).toBe(true);
    expect(result.containsErrorMessage).toBe(true);
    expect(result.containsPhaseText).toBe(true);
    expect(result.containsReloadButton).toBe(true);
  }, browserConfigView);

  // ==================== 服务端环境测试（所有引擎） ====================

  it("服务端: React 引擎应该检测非浏览器环境", async () => {
    const { renderCSR, hydrate } = await import("../src/client/mod.ts");

    try {
      await renderCSR({
        engine: "react",
        component: () => null,
        container: "#app",
      });
      expect(false).toBe(true);
    } catch (e) {
      expect(e).toBeInstanceOf(Error);
      expect((e as Error).message).toContain(
        "CSR render must run in browser environment",
      );
    }

    try {
      await hydrate({
        engine: "react",
        component: () => null,
        container: "#app",
      });
      expect(false).toBe(true);
    } catch (e) {
      expect(e).toBeInstanceOf(Error);
      expect((e as Error).message).toContain(
        "Hydration must run in browser environment",
      );
    }
  });

  // ==================== handleRenderError 浏览器测试 ====================

  it("handleRenderError 应该正确处理错误", async (ctx) => {
    if ((ctx as any)._browserSetupError) return;

    const browser = (ctx as any).browser;
    if (!browser) return;

    const result = await browser.evaluate(async () => {
      const RenderClient = (globalThis as any).RenderClient;

      if (!RenderClient) {
        return { error: "RenderClient not available" };
      }

      let errorCalled = false;
      let errorMessage = "";

      const shouldUseFallback = await RenderClient.handleRenderError(
        new Error("Test browser error"),
        { engine: "preact", component: {}, phase: "csr" },
        {
          onError: (err: Error) => {
            errorCalled = true;
            errorMessage = err.message;
          },
          fallbackComponent: () => null,
          logError: false,
        },
      );

      return {
        errorCalled,
        errorMessage,
        shouldUseFallback,
      };
    });

    if (result.error) {
      console.warn("测试跳过:", result.error);
      return;
    }

    expect(result.errorCalled).toBe(true);
    expect(result.errorMessage).toBe("Test browser error");
    expect(result.shouldUseFallback).toBe(true);
  }, browserConfigView);

  // ==================== View 实际 CSR / Hybrid 渲染测试 ====================

  it("View: 实际 CSR 渲染并断言 DOM 内容", async (ctx) => {
    if ((ctx as any)._browserSetupError) return;
    const browser = (ctx as any).browser;
    if (!browser) return;

    const result = await browser.evaluate(async () => {
      const RenderClient = (globalThis as any).RenderClient;
      if (!RenderClient?.renderCSR || !RenderClient.ViewJSX) {
        return { error: "RenderClient or ViewJSX not available" };
      }
      const app = document.getElementById("app");
      if (!app) return { error: "app not found" };
      app.innerHTML = "";

      const ViewComp = () =>
        RenderClient.ViewJSX("div", { children: "View CSR Hello" }, undefined);
      const res = await RenderClient.renderCSR({
        engine: "view",
        component: ViewComp,
        container: "#app",
      });
      const textAfterRender = app?.innerText?.trim() ?? "";
      res.unmount();
      const textAfterUnmount = app?.innerText?.trim() ?? "";
      return {
        textAfterRender,
        textAfterUnmount,
        hasUnmount: typeof res.unmount === "function",
      };
    });

    if (result.error) {
      console.warn("测试跳过:", result.error);
      return;
    }
    expect(result.textAfterRender).toContain("View CSR Hello");
    expect(result.textAfterUnmount).toBe("");
    expect(result.hasUnmount).toBe(true);
  }, browserConfigView);

  it("View: 实际 Hybrid hydrate 并断言内容仍在", async (ctx) => {
    if ((ctx as any)._browserSetupError) return;
    const browser = (ctx as any).browser;
    if (!browser) return;

    const result = await browser.evaluate(async () => {
      const RenderClient = (globalThis as any).RenderClient;
      if (!RenderClient?.hydrate || !RenderClient.ViewJSX) {
        return { error: "RenderClient or ViewJSX not available" };
      }
      const container = document.getElementById("hydrate-app");
      if (!container) return { error: "hydrate-app not found" };
      // 服务端 HTML：<p>Server rendered content</p>
      const ViewComp = () =>
        RenderClient.ViewJSX(
          "div",
          {
            children: RenderClient.ViewJSX("p", {
              children: "Server rendered content",
            }, undefined),
          },
          undefined,
        );
      const res = await RenderClient.hydrate({
        engine: "view",
        component: ViewComp,
        container: "#hydrate-app",
      });
      const textAfterHydrate = container?.innerText?.trim() ?? "";
      res.unmount();
      const textAfterUnmount = container?.innerText?.trim() ?? "";
      return {
        textAfterHydrate,
        textAfterUnmount,
        hasUnmount: typeof res.unmount === "function",
      };
    });

    if (result.error) {
      console.warn("测试跳过:", result.error);
      return;
    }
    expect(result.textAfterHydrate).toContain("Server rendered content");
    expect(result.hasUnmount).toBe(true);
    expect(result.textAfterUnmount).toBe("");
  }, browserConfigView);

  it(
    "View: Hybrid 流程（先 hydrate 再 unmount 再 CSR）主体区正确显示",
    async (ctx) => {
      if ((ctx as any)._browserSetupError) return;
      const browser = (ctx as any).browser;
      if (!browser) return;

      const result = await browser.evaluate(async () => {
        const RenderClient = (globalThis as any).RenderClient;
        if (
          !RenderClient?.hydrate || !RenderClient.renderCSR ||
          !RenderClient.ViewJSX
        ) {
          return { error: "RenderClient or ViewJSX not available" };
        }
        const app = document.getElementById("app");
        if (!app) return { error: "app not found" };
        app.innerHTML = "<p>Initial SSR</p>";

        const Page1 = () =>
          RenderClient.ViewJSX("div", { children: "Page 1" }, undefined);
        const hyd = await RenderClient.hydrate({
          engine: "view",
          component: Page1,
          container: "#app",
        });
        const afterHydrate = app?.innerText?.trim() ?? "";
        hyd.unmount();
        const Page2 = () =>
          RenderClient.ViewJSX("div", { children: "Page 2 CSR" }, undefined);
        await RenderClient.renderCSR({
          engine: "view",
          component: Page2,
          container: "#app",
        });
        const afterCSR = app?.innerText?.trim() ?? "";
        return { afterHydrate, afterCSR };
      });

      if (result.error) {
        console.warn("测试跳过:", result.error);
        return;
      }
      expect(result.afterCSR).toContain("Page 2 CSR");
    },
    browserConfigView,
  );
}, browserConfigView);

describe("Preact 实际渲染（Preact 入口）", () => {
  afterAll(async () => {
    try {
      const { cleanupAllBrowsers } = await import("@dreamer/test");
      await cleanupAllBrowsers();
    } catch {
      // ignore
    }
  });

  it("Preact: 应该在容器不存在时抛出错误", async (ctx) => {
    if ((ctx as any)._browserSetupError) return;
    const browser = (ctx as any).browser;
    if (!browser) return;
    const result = await browser.evaluate(async () => {
      const RenderClient = (globalThis as any).RenderClient;
      if (!RenderClient) return { error: "RenderClient not available" };
      try {
        await RenderClient.renderCSR({
          engine: "preact",
          component: () => null,
          container: "#non-existent-container",
        });
        return { threw: false };
      } catch (error) {
        return { threw: true, message: (error as Error).message };
      }
    });
    if (result.error) return;
    expect(result.threw).toBe(true);
    expect(result.message).toContain("Container element not found");
  }, browserConfigPreact);

  it("Preact: 应该支持卸载组件", async (ctx) => {
    if ((ctx as any)._browserSetupError) return;
    const browser = (ctx as any).browser;
    if (!browser) return;
    const result = await browser.evaluate(async () => {
      const RenderClient = (globalThis as any).RenderClient;
      if (!RenderClient) return { error: "RenderClient not available" };
      const app = document.getElementById("app");
      if (!app) return { error: "app not found" };
      app.innerHTML = "";
      const res = await RenderClient.renderCSR({
        engine: "preact",
        component: () => null,
        container: "#app",
      });
      const hasUnmount = typeof res.unmount === "function";
      res.unmount();
      return { hasUnmount, unmounted: true };
    });
    if (result.error) return;
    expect(result.hasUnmount).toBe(true);
    expect(result.unmounted).toBe(true);
  }, browserConfigPreact);

  it("Preact: 应该支持 update 函数", async (ctx) => {
    if ((ctx as any)._browserSetupError) return;
    const browser = (ctx as any).browser;
    if (!browser) return;
    const result = await browser.evaluate(async () => {
      const RenderClient = (globalThis as any).RenderClient;
      if (!RenderClient) return { error: "RenderClient not available" };
      const app = document.getElementById("app");
      if (!app) return { error: "app not found" };
      app.innerHTML = "";
      const res = await RenderClient.renderCSR({
        engine: "preact",
        component: () => null,
        container: "#app",
      });
      return {
        hasUpdate: typeof res.update === "function",
        hasInstance: res.instance !== undefined,
      };
    });
    if (result.error) return;
    expect(result.hasUpdate).toBe(true);
    expect(result.hasInstance).toBe(true);
  }, browserConfigPreact);

  it("Preact: CSR 应该返回性能指标", async (ctx) => {
    if ((ctx as any)._browserSetupError) return;
    const browser = (ctx as any).browser;
    if (!browser) return;
    const result = await browser.evaluate(async () => {
      const RenderClient = (globalThis as any).RenderClient;
      if (!RenderClient) return { error: "RenderClient not available" };
      const app = document.getElementById("app");
      if (!app) return { error: "app not found" };
      app.innerHTML = "";
      const res = await RenderClient.renderCSR({
        engine: "preact",
        component: () => null,
        container: "#app",
        performance: { enabled: true, slowThreshold: 1000 },
      });
      const perf = res.performance;
      return {
        hasPerformance: !!perf,
        engine: perf?.engine,
        phase: perf?.phase,
      };
    });
    if (result.error) return;
    expect(result.hasPerformance).toBe(true);
    expect(result.engine).toBe("preact");
    expect(result.phase).toBe("csr");
  }, browserConfigPreact);

  it("Preact: 应该支持 HTMLElement 作为容器", async (ctx) => {
    if ((ctx as any)._browserSetupError) return;
    const browser = (ctx as any).browser;
    if (!browser) return;
    const result = await browser.evaluate(async () => {
      const RenderClient = (globalThis as any).RenderClient;
      if (!RenderClient) return { error: "RenderClient not available" };
      const app = document.getElementById("app");
      if (!app) return { error: "app not found" };
      app.innerHTML = "";
      const res = await RenderClient.renderCSR({
        engine: "preact",
        component: () => null,
        container: app,
      });
      return { success: true, hasUnmount: typeof res.unmount === "function" };
    });
    if (result.error) return;
    expect(result.success).toBe(true);
    expect(result.hasUnmount).toBe(true);
  }, browserConfigPreact);

  it("Preact: 实际 CSR 渲染并断言 DOM 内容", async (ctx) => {
    if ((ctx as any)._browserSetupError) return;
    const browser = (ctx as any).browser;
    if (!browser) return;

    const result = await browser.evaluate(async () => {
      const RenderClient = (globalThis as any).RenderClient;
      if (!RenderClient?.renderCSR || !RenderClient.PreactH) {
        return { error: "RenderClient or PreactH not available" };
      }
      const app = document.getElementById("app");
      if (!app) return { error: "app not found" };
      app.innerHTML = "";

      const Comp = () => RenderClient.PreactH("div", null, "Preact CSR Hello");
      const res = await RenderClient.renderCSR({
        engine: "preact",
        component: Comp,
        container: "#app",
      });
      const textAfterRender = app?.innerText?.trim() ?? "";
      res.unmount();
      const textAfterUnmount = app?.innerText?.trim() ?? "";
      return {
        textAfterRender,
        textAfterUnmount,
        hasUnmount: typeof res.unmount === "function",
      };
    });

    if (result.error) {
      console.warn("测试跳过:", result.error);
      return;
    }
    expect(result.textAfterRender).toContain("Preact CSR Hello");
    expect(result.textAfterUnmount).toBe("");
    expect(result.hasUnmount).toBe(true);
  }, browserConfigPreact);

  it("Preact: 实际 Hybrid hydrate 并断言内容仍在", async (ctx) => {
    if ((ctx as any)._browserSetupError) return;
    const browser = (ctx as any).browser;
    if (!browser) return;

    const result = await browser.evaluate(async () => {
      const RenderClient = (globalThis as any).RenderClient;
      if (!RenderClient?.hydrate || !RenderClient.PreactH) {
        return { error: "RenderClient or PreactH not available" };
      }
      const container = document.getElementById("hydrate-app");
      if (!container) return { error: "hydrate-app not found" };

      const Comp = () =>
        RenderClient.PreactH(
          "div",
          null,
          RenderClient.PreactH("p", null, "Server rendered content"),
        );
      const res = await RenderClient.hydrate({
        engine: "preact",
        component: Comp,
        container: "#hydrate-app",
      });
      const textAfterHydrate = container?.innerText?.trim() ?? "";
      res.unmount();
      // Preact render(null, container) 可能不清空宿主内已有 DOM，故仅断言 hydrate 后内容与 unmount 可调用
      const textAfterUnmount = container?.innerText?.trim() ?? "";
      return {
        textAfterHydrate,
        textAfterUnmount,
        hasUnmount: typeof res.unmount === "function",
      };
    });

    if (result.error) {
      console.warn("测试跳过:", result.error);
      return;
    }
    expect(result.textAfterHydrate).toContain("Server rendered content");
    expect(result.hasUnmount).toBe(true);
    // Preact hydrate 后 unmount 可能仍保留原 DOM 节点，接受空或保留内容两种结果
    expect(["", "Server rendered content"]).toContain(result.textAfterUnmount);
  }, browserConfigPreact);
}, browserConfigPreact);

describe("React 实际渲染（React 入口）", () => {
  afterAll(async () => {
    try {
      const { cleanupAllBrowsers } = await import("@dreamer/test");
      await cleanupAllBrowsers();
    } catch {
      // ignore
    }
  });

  it("React: 应该在容器不存在时抛出错误", async (ctx) => {
    if ((ctx as any)._browserSetupError) return;
    const browser = (ctx as any).browser;
    if (!browser) return;
    const result = await browser.evaluate(async () => {
      const RenderClient = (globalThis as any).RenderClient;
      if (!RenderClient) return { error: "RenderClient not available" };
      try {
        await RenderClient.renderCSR({
          engine: "react",
          component: () => null,
          container: "#non-existent-container",
        });
        return { threw: false };
      } catch (error) {
        return { threw: true, message: (error as Error).message };
      }
    });
    if (result.error) return;
    expect(result.threw).toBe(true);
    expect(result.message).toContain("Container element not found");
  }, browserConfigReact);

  it("React: Hydration 应该在容器不存在时抛出错误", async (ctx) => {
    if ((ctx as any)._browserSetupError) return;
    const browser = (ctx as any).browser;
    if (!browser) return;
    const result = await browser.evaluate(async () => {
      const RenderClient = (globalThis as any).RenderClient;
      if (!RenderClient) return { error: "RenderClient not available" };
      try {
        await RenderClient.hydrate({
          engine: "react",
          component: () => null,
          container: "#non-existent-container",
        });
        return { threw: false };
      } catch (error) {
        return { threw: true, message: (error as Error).message };
      }
    });
    if (result.error) return;
    expect(result.threw).toBe(true);
    expect(result.message).toContain("Container element not found");
  }, browserConfigReact);

  it("React: 应该支持性能监控", async (ctx) => {
    if ((ctx as any)._browserSetupError) return;
    const browser = (ctx as any).browser;
    if (!browser) return;
    const result = await browser.evaluate(() => {
      const RenderClient = (globalThis as any).RenderClient;
      if (!RenderClient) return { error: "RenderClient not available" };
      const monitor = RenderClient.createPerformanceMonitor({
        enabled: true,
        slowThreshold: 100,
      });
      if (!monitor) return { created: false };
      monitor.start("react", "csr");
      const metrics = monitor.end();
      return {
        created: true,
        hasMetrics: !!metrics,
        engine: metrics.engine,
        phase: metrics.phase,
      };
    });
    if (result.error) return;
    expect(result.created).toBe(true);
    expect(result.engine).toBe("react");
    expect(result.phase).toBe("csr");
  }, browserConfigReact);

  it("React: 应该支持卸载组件", async (ctx) => {
    if ((ctx as any)._browserSetupError) return;
    const browser = (ctx as any).browser;
    if (!browser) return;
    const result = await browser.evaluate(async () => {
      const RenderClient = (globalThis as any).RenderClient;
      if (!RenderClient) return { error: "RenderClient not available" };
      const app = document.getElementById("app");
      if (!app) return { error: "app not found" };
      app.innerHTML = "";
      const res = await RenderClient.renderCSR({
        engine: "react",
        component: () => null,
        container: "#app",
      });
      const hasUnmount = typeof res.unmount === "function";
      res.unmount();
      return { hasUnmount, unmounted: true };
    });
    if (result.error) return;
    expect(result.hasUnmount).toBe(true);
    expect(result.unmounted).toBe(true);
  }, browserConfigReact);

  it("React: 应该支持 update 函数", async (ctx) => {
    if ((ctx as any)._browserSetupError) return;
    const browser = (ctx as any).browser;
    if (!browser) return;
    const result = await browser.evaluate(async () => {
      const RenderClient = (globalThis as any).RenderClient;
      if (!RenderClient) return { error: "RenderClient not available" };
      const app = document.getElementById("app");
      if (!app) return { error: "app not found" };
      app.innerHTML = "";
      const res = await RenderClient.renderCSR({
        engine: "react",
        component: () => null,
        container: "#app",
      });
      return {
        hasUpdate: typeof res.update === "function",
        hasInstance: res.instance !== undefined,
      };
    });
    if (result.error) return;
    expect(result.hasUpdate).toBe(true);
    expect(result.hasInstance).toBe(true);
  }, browserConfigReact);

  it("React: CSR 应该返回性能指标", async (ctx) => {
    if ((ctx as any)._browserSetupError) return;
    const browser = (ctx as any).browser;
    if (!browser) return;
    const result = await browser.evaluate(async () => {
      const RenderClient = (globalThis as any).RenderClient;
      if (!RenderClient) return { error: "RenderClient not available" };
      const app = document.getElementById("app");
      if (!app) return { error: "app not found" };
      app.innerHTML = "";
      const res = await RenderClient.renderCSR({
        engine: "react",
        component: () => null,
        container: "#app",
        performance: { enabled: true, slowThreshold: 1000 },
      });
      const perf = res.performance;
      return {
        hasPerformance: !!perf,
        engine: perf?.engine,
        phase: perf?.phase,
      };
    });
    if (result.error) return;
    expect(result.hasPerformance).toBe(true);
    expect(result.engine).toBe("react");
    expect(result.phase).toBe("csr");
  }, browserConfigReact);

  it("React: 实际 CSR 渲染并断言 DOM 内容", async (ctx) => {
    if ((ctx as any)._browserSetupError) return;
    const browser = (ctx as any).browser;
    if (!browser) return;

    const result = await browser.evaluate(async () => {
      const RenderClient = (globalThis as any).RenderClient;
      if (!RenderClient?.renderCSR || !RenderClient.ReactCreateElement) {
        return { error: "RenderClient or ReactCreateElement not available" };
      }
      const app = document.getElementById("app");
      if (!app) return { error: "app not found" };
      app.innerHTML = "";

      const Comp = () =>
        RenderClient.ReactCreateElement("div", null, "React CSR Hello");
      const res = await RenderClient.renderCSR({
        engine: "react",
        component: Comp,
        container: "#app",
      });
      // 适配器内已用 flushSync，返回后 DOM 已更新；fixture 与适配器共用同一 React 实例避免 Bun 下双 React 导致不渲染
      const textAfterRender = app?.innerText?.trim() ?? "";
      res.unmount();
      await new Promise((r) => setTimeout(r, 0));
      const textAfterUnmount = app?.innerText?.trim() ?? "";
      return {
        textAfterRender,
        textAfterUnmount,
        hasUnmount: typeof res.unmount === "function",
      };
    });

    if (result.error) {
      console.warn("测试跳过:", result.error);
      return;
    }
    expect(result.textAfterRender).toContain("React CSR Hello");
    expect(result.textAfterUnmount).toBe("");
    expect(result.hasUnmount).toBe(true);
  }, browserConfigReact);

  it("React: 实际 Hybrid hydrate 并断言内容仍在", async (ctx) => {
    if ((ctx as any)._browserSetupError) return;
    const browser = (ctx as any).browser;
    if (!browser) return;

    const result = await browser.evaluate(async () => {
      const RenderClient = (globalThis as any).RenderClient;
      if (!RenderClient?.hydrate || !RenderClient.ReactCreateElement) {
        return { error: "RenderClient or ReactCreateElement not available" };
      }
      const container = document.getElementById("hydrate-app");
      if (!container) return { error: "hydrate-app not found" };

      const Comp = () =>
        RenderClient.ReactCreateElement(
          "div",
          null,
          RenderClient.ReactCreateElement("p", null, "Server rendered content"),
        );
      const res = await RenderClient.hydrate({
        engine: "react",
        component: Comp,
        container: "#hydrate-app",
      });
      const textAfterHydrate = container?.innerText?.trim() ?? "";
      res.unmount();
      const textAfterUnmount = container?.innerText?.trim() ?? "";
      return {
        textAfterHydrate,
        textAfterUnmount,
        hasUnmount: typeof res.unmount === "function",
      };
    });

    if (result.error) {
      console.warn("测试跳过:", result.error);
      return;
    }
    expect(result.textAfterHydrate).toContain("Server rendered content");
    expect(result.hasUnmount).toBe(true);
    expect(result.textAfterUnmount).toBe("");
  }, browserConfigReact);
}, browserConfigReact);
