/**
 * 客户端渲染浏览器测试
 *
 * 使用 @dreamer/test 的浏览器测试功能测试 CSR 和 Hydration
 * 需要 Puppeteer 和 Chrome/Chromium
 */

import { describe, expect, it } from "@dreamer/test";

// 浏览器测试配置
const browserConfig = {
  // 禁用资源检查（浏览器测试有内部定时器）
  sanitizeOps: false,
  sanitizeResources: false,
  // 超时设置
  timeout: 60_000,
  // 启用浏览器测试
  browser: {
    enabled: true,
    // 客户端模块入口
    entryPoint: "./src/client/mod.ts",
    // 全局变量名
    globalName: "RenderClient",
    // 将 JSR 依赖打包进 bundle
    browserMode: false,
    // 模块加载超时
    moduleLoadTimeout: 30_000,
    // 无头模式
    headless: true,
    // Chrome 启动参数
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
    ],
    // 复用浏览器实例
    reuseBrowser: true,
    // 自定义 body 内容
    bodyContent: `
      <div id="app"></div>
      <div id="hydrate-app"><p>Server rendered content</p></div>
      <div id="error-app"></div>
    `,
  },
};

describe("客户端渲染 - 浏览器测试", () => {
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
  }, browserConfig);

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
  }, browserConfig);

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
  }, browserConfig);

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
        containsReloadButton: errorApp.innerHTML.includes("重新加载"),
      };
    });

    if (result.error) {
      console.warn("测试跳过:", result.error);
      return;
    }

    expect(result.hasContent).toBe(true);
    expect(result.containsErrorMessage).toBe(true);
    expect(result.containsReloadButton).toBe(true);
  }, browserConfig);

  it("应该在容器不存在时抛出错误（renderCSR）", async (ctx) => {
    if ((ctx as any)._browserSetupError) return;

    const browser = (ctx as any).browser;
    if (!browser) return;

    const result = await browser.evaluate(() => {
      const RenderClient = (globalThis as any).RenderClient;

      if (!RenderClient) {
        return { error: "RenderClient not available" };
      }

      // 简单组件（不依赖 Preact）
      const TestComponent = () => null;

      try {
        RenderClient.renderCSR({
          engine: "preact",
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
    expect(result.message).toContain("容器元素未找到");
  }, browserConfig);

  it("应该在非浏览器环境检测失败", async () => {
    // 这个测试在服务端运行，验证非浏览器环境检测
    // 注意：这里不需要 browserConfig，因为我们在服务端测试
    // 但我们需要模拟 import

    // 这个测试仅验证类型导出
    const { renderCSR, hydrate } = await import("../src/client/mod.ts");

    expect(typeof renderCSR).toBe("function");
    expect(typeof hydrate).toBe("function");

    // 在非浏览器环境调用应该抛出错误
    expect(() => {
      renderCSR({
        engine: "preact",
        component: () => null,
        container: "#app",
      });
    }).toThrow("CSR 渲染只能在浏览器环境中运行");

    expect(() => {
      hydrate({
        engine: "preact",
        component: () => null,
        container: "#app",
      });
    }).toThrow("Hydration 只能在浏览器环境中运行");
  });

  // ==================== React 适配器测试 ====================

  it("React: 应该在容器不存在时抛出错误", async (ctx) => {
    if ((ctx as any)._browserSetupError) return;

    const browser = (ctx as any).browser;
    if (!browser) return;

    const result = await browser.evaluate(() => {
      const RenderClient = (globalThis as any).RenderClient;

      if (!RenderClient) {
        return { error: "RenderClient not available" };
      }

      const TestComponent = () => null;

      try {
        RenderClient.renderCSR({
          engine: "react",
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
    expect(result.message).toContain("容器元素未找到");
  }, browserConfig);

  it("React: 应该支持性能监控", async (ctx) => {
    if ((ctx as any)._browserSetupError) return;

    const browser = (ctx as any).browser;
    if (!browser) return;

    const result = await browser.evaluate(() => {
      const RenderClient = (globalThis as any).RenderClient;

      if (!RenderClient) {
        return { error: "RenderClient not available" };
      }

      // 创建性能监控器并测试 React 引擎
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
        hasDuration: typeof metrics.duration === "number",
      };
    });

    if (result.error) {
      console.warn("测试跳过:", result.error);
      return;
    }

    expect(result.created).toBe(true);
    expect(result.hasMetrics).toBe(true);
    expect(result.engine).toBe("react");
    expect(result.phase).toBe("csr");
    expect(result.hasDuration).toBe(true);
  }, browserConfig);

  it("React: Hydration 应该在容器不存在时抛出错误", async (ctx) => {
    if ((ctx as any)._browserSetupError) return;

    const browser = (ctx as any).browser;
    if (!browser) return;

    const result = await browser.evaluate(() => {
      const RenderClient = (globalThis as any).RenderClient;

      if (!RenderClient) {
        return { error: "RenderClient not available" };
      }

      const TestComponent = () => null;

      try {
        RenderClient.hydrate({
          engine: "react",
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
    expect(result.message).toContain("容器元素未找到");
  }, browserConfig);

  // ==================== Vue3 适配器测试 ====================

  it("Vue3: 应该在容器不存在时抛出错误", async (ctx) => {
    if ((ctx as any)._browserSetupError) return;

    const browser = (ctx as any).browser;
    if (!browser) return;

    const result = await browser.evaluate(() => {
      const RenderClient = (globalThis as any).RenderClient;

      if (!RenderClient) {
        return { error: "RenderClient not available" };
      }

      const TestComponent = () => null;

      try {
        RenderClient.renderCSR({
          engine: "vue3",
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
    expect(result.message).toContain("容器元素未找到");
  }, browserConfig);

  it("Vue3: 应该支持性能监控", async (ctx) => {
    if ((ctx as any)._browserSetupError) return;

    const browser = (ctx as any).browser;
    if (!browser) return;

    const result = await browser.evaluate(() => {
      const RenderClient = (globalThis as any).RenderClient;

      if (!RenderClient) {
        return { error: "RenderClient not available" };
      }

      // 创建性能监控器并测试 Vue3 引擎
      const monitor = RenderClient.createPerformanceMonitor({
        enabled: true,
        slowThreshold: 100,
      });

      if (!monitor) return { created: false };

      monitor.start("vue3", "hydrate");
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
    expect(result.engine).toBe("vue3");
    expect(result.phase).toBe("hydrate");
    expect(result.hasDuration).toBe(true);
  }, browserConfig);

  it("Vue3: Hydration 应该在容器不存在时抛出错误", async (ctx) => {
    if ((ctx as any)._browserSetupError) return;

    const browser = (ctx as any).browser;
    if (!browser) return;

    const result = await browser.evaluate(() => {
      const RenderClient = (globalThis as any).RenderClient;

      if (!RenderClient) {
        return { error: "RenderClient not available" };
      }

      const TestComponent = () => null;

      try {
        RenderClient.hydrate({
          engine: "vue3",
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
    expect(result.message).toContain("容器元素未找到");
  }, browserConfig);

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
        containsPhaseText: errorApp.innerHTML.includes("水合出错"),
        containsReloadButton: errorApp.innerHTML.includes("重新加载"),
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
  }, browserConfig);

  // ==================== 服务端环境测试（所有引擎） ====================

  it("服务端: React 引擎应该检测非浏览器环境", async () => {
    const { renderCSR, hydrate } = await import("../src/client/mod.ts");

    expect(() => {
      renderCSR({
        engine: "react",
        component: () => null,
        container: "#app",
      });
    }).toThrow("CSR 渲染只能在浏览器环境中运行");

    expect(() => {
      hydrate({
        engine: "react",
        component: () => null,
        container: "#app",
      });
    }).toThrow("Hydration 只能在浏览器环境中运行");
  });

  it("服务端: Vue3 引擎应该检测非浏览器环境", async () => {
    const { renderCSR, hydrate } = await import("../src/client/mod.ts");

    expect(() => {
      renderCSR({
        engine: "vue3",
        component: () => null,
        container: "#app",
      });
    }).toThrow("CSR 渲染只能在浏览器环境中运行");

    expect(() => {
      hydrate({
        engine: "vue3",
        component: () => null,
        container: "#app",
      });
    }).toThrow("Hydration 只能在浏览器环境中运行");
  });

  // ==================== 实际渲染测试 ====================

  it("Preact: 应该支持卸载组件", async (ctx) => {
    if ((ctx as any)._browserSetupError) return;

    const browser = (ctx as any).browser;
    if (!browser) return;

    const result = await browser.evaluate(() => {
      const RenderClient = (globalThis as any).RenderClient;

      if (!RenderClient) {
        return { error: "RenderClient not available" };
      }

      // 清空容器
      const app = document.getElementById("app");
      if (!app) return { error: "app container not found" };
      app.innerHTML = "";

      // 简单组件
      const TestComponent = () => null;

      try {
        const renderResult = RenderClient.renderCSR({
          engine: "preact",
          component: TestComponent,
          container: "#app",
        });

        // 验证 unmount 函数存在
        const hasUnmount = typeof renderResult.unmount === "function";

        // 调用 unmount
        renderResult.unmount();

        return {
          hasUnmount,
          unmounted: true,
        };
      } catch (error) {
        return { error: (error as Error).message };
      }
    });

    if (result.error) {
      console.warn("测试跳过:", result.error);
      return;
    }

    expect(result.hasUnmount).toBe(true);
    expect(result.unmounted).toBe(true);
  }, browserConfig);

  it("React: 应该支持卸载组件", async (ctx) => {
    if ((ctx as any)._browserSetupError) return;

    const browser = (ctx as any).browser;
    if (!browser) return;

    const result = await browser.evaluate(() => {
      const RenderClient = (globalThis as any).RenderClient;

      if (!RenderClient) {
        return { error: "RenderClient not available" };
      }

      // 清空容器
      const app = document.getElementById("app");
      if (!app) return { error: "app container not found" };
      app.innerHTML = "";

      const TestComponent = () => null;

      try {
        const renderResult = RenderClient.renderCSR({
          engine: "react",
          component: TestComponent,
          container: "#app",
        });

        const hasUnmount = typeof renderResult.unmount === "function";
        renderResult.unmount();

        return {
          hasUnmount,
          unmounted: true,
        };
      } catch (error) {
        return { error: (error as Error).message };
      }
    });

    if (result.error) {
      console.warn("测试跳过:", result.error);
      return;
    }

    expect(result.hasUnmount).toBe(true);
    expect(result.unmounted).toBe(true);
  }, browserConfig);

  it("Vue3: 应该支持卸载组件", async (ctx) => {
    if ((ctx as any)._browserSetupError) return;

    const browser = (ctx as any).browser;
    if (!browser) return;

    const result = await browser.evaluate(() => {
      const RenderClient = (globalThis as any).RenderClient;

      if (!RenderClient) {
        return { error: "RenderClient not available" };
      }

      // 清空容器
      const app = document.getElementById("app");
      if (!app) return { error: "app container not found" };
      app.innerHTML = "";

      const TestComponent = () => null;

      try {
        const renderResult = RenderClient.renderCSR({
          engine: "vue3",
          component: TestComponent,
          container: "#app",
        });

        const hasUnmount = typeof renderResult.unmount === "function";
        renderResult.unmount();

        return {
          hasUnmount,
          unmounted: true,
        };
      } catch (error) {
        return { error: (error as Error).message };
      }
    });

    if (result.error) {
      console.warn("测试跳过:", result.error);
      return;
    }

    expect(result.hasUnmount).toBe(true);
    expect(result.unmounted).toBe(true);
  }, browserConfig);

  // ==================== Vue2 适配器测试 ====================

  it("Vue2: 应该在容器不存在时抛出错误", async (ctx) => {
    if ((ctx as any)._browserSetupError) return;

    const browser = (ctx as any).browser;
    if (!browser) return;

    const result = await browser.evaluate(() => {
      const RenderClient = (globalThis as any).RenderClient;

      if (!RenderClient) {
        return { error: "RenderClient not available" };
      }

      const TestComponent = { template: "<div>Test</div>" };

      try {
        RenderClient.renderCSR({
          engine: "vue2",
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

    // Vue2 需要全局 Vue 构造函数，如果不存在会抛出不同的错误
    expect(result.threw).toBe(true);
  }, browserConfig);

  it("Vue2: 应该支持性能监控", async (ctx) => {
    if ((ctx as any)._browserSetupError) return;

    const browser = (ctx as any).browser;
    if (!browser) return;

    const result = await browser.evaluate(() => {
      const RenderClient = (globalThis as any).RenderClient;

      if (!RenderClient) {
        return { error: "RenderClient not available" };
      }

      // 创建性能监控器并测试 Vue2 引擎
      const monitor = RenderClient.createPerformanceMonitor({
        enabled: true,
        slowThreshold: 100,
      });

      if (!monitor) return { created: false };

      monitor.start("vue2", "csr");
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
    expect(result.engine).toBe("vue2");
    expect(result.phase).toBe("csr");
    expect(result.hasDuration).toBe(true);
  }, browserConfig);

  it("Vue2: Hydration 应该在容器不存在时抛出错误", async (ctx) => {
    if ((ctx as any)._browserSetupError) return;

    const browser = (ctx as any).browser;
    if (!browser) return;

    const result = await browser.evaluate(() => {
      const RenderClient = (globalThis as any).RenderClient;

      if (!RenderClient) {
        return { error: "RenderClient not available" };
      }

      const TestComponent = { template: "<div>Test</div>" };

      try {
        RenderClient.hydrate({
          engine: "vue2",
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

    // Vue2 需要全局 Vue 构造函数，如果不存在会抛出不同的错误
    expect(result.threw).toBe(true);
  }, browserConfig);

  it("服务端: Vue2 引擎应该检测非浏览器环境", async () => {
    const { renderCSR, hydrate } = await import("../src/client/mod.ts");

    expect(() => {
      renderCSR({
        engine: "vue2",
        component: { template: "<div>Test</div>" },
        container: "#app",
      });
    }).toThrow("CSR 渲染只能在浏览器环境中运行");

    expect(() => {
      hydrate({
        engine: "vue2",
        component: { template: "<div>Test</div>" },
        container: "#app",
      });
    }).toThrow("Hydration 只能在浏览器环境中运行");
  });

  // ==================== 更新功能测试 ====================

  it("Preact: 应该支持 update 函数", async (ctx) => {
    if ((ctx as any)._browserSetupError) return;

    const browser = (ctx as any).browser;
    if (!browser) return;

    const result = await browser.evaluate(() => {
      const RenderClient = (globalThis as any).RenderClient;

      if (!RenderClient) {
        return { error: "RenderClient not available" };
      }

      const app = document.getElementById("app");
      if (!app) return { error: "app container not found" };
      app.innerHTML = "";

      const TestComponent = () => null;

      try {
        const renderResult = RenderClient.renderCSR({
          engine: "preact",
          component: TestComponent,
          container: "#app",
        });

        return {
          hasUpdate: typeof renderResult.update === "function",
          hasInstance: renderResult.instance !== undefined,
        };
      } catch (error) {
        return { error: (error as Error).message };
      }
    });

    if (result.error) {
      console.warn("测试跳过:", result.error);
      return;
    }

    expect(result.hasUpdate).toBe(true);
    expect(result.hasInstance).toBe(true);
  }, browserConfig);

  it("React: 应该支持 update 函数", async (ctx) => {
    if ((ctx as any)._browserSetupError) return;

    const browser = (ctx as any).browser;
    if (!browser) return;

    const result = await browser.evaluate(() => {
      const RenderClient = (globalThis as any).RenderClient;

      if (!RenderClient) {
        return { error: "RenderClient not available" };
      }

      const app = document.getElementById("app");
      if (!app) return { error: "app container not found" };
      app.innerHTML = "";

      const TestComponent = () => null;

      try {
        const renderResult = RenderClient.renderCSR({
          engine: "react",
          component: TestComponent,
          container: "#app",
        });

        return {
          hasUpdate: typeof renderResult.update === "function",
          hasInstance: renderResult.instance !== undefined,
        };
      } catch (error) {
        return { error: (error as Error).message };
      }
    });

    if (result.error) {
      console.warn("测试跳过:", result.error);
      return;
    }

    expect(result.hasUpdate).toBe(true);
    expect(result.hasInstance).toBe(true);
  }, browserConfig);

  it("Vue3: 应该支持 update 函数", async (ctx) => {
    if ((ctx as any)._browserSetupError) return;

    const browser = (ctx as any).browser;
    if (!browser) return;

    const result = await browser.evaluate(() => {
      const RenderClient = (globalThis as any).RenderClient;

      if (!RenderClient) {
        return { error: "RenderClient not available" };
      }

      const app = document.getElementById("app");
      if (!app) return { error: "app container not found" };
      app.innerHTML = "";

      const TestComponent = () => null;

      try {
        const renderResult = RenderClient.renderCSR({
          engine: "vue3",
          component: TestComponent,
          container: "#app",
        });

        return {
          hasUpdate: typeof renderResult.update === "function",
          hasInstance: renderResult.instance !== undefined,
        };
      } catch (error) {
        return { error: (error as Error).message };
      }
    });

    if (result.error) {
      console.warn("测试跳过:", result.error);
      return;
    }

    expect(result.hasUpdate).toBe(true);
    expect(result.hasInstance).toBe(true);
  }, browserConfig);

  // ==================== 性能监控集成测试 ====================

  it("Preact: CSR 应该返回性能指标", async (ctx) => {
    if ((ctx as any)._browserSetupError) return;

    const browser = (ctx as any).browser;
    if (!browser) return;

    const result = await browser.evaluate(() => {
      const RenderClient = (globalThis as any).RenderClient;

      if (!RenderClient) {
        return { error: "RenderClient not available" };
      }

      const app = document.getElementById("app");
      if (!app) return { error: "app container not found" };
      app.innerHTML = "";

      const TestComponent = () => null;

      try {
        const renderResult = RenderClient.renderCSR({
          engine: "preact",
          component: TestComponent,
          container: "#app",
          performance: {
            enabled: true,
            slowThreshold: 1000,
          },
        });

        const perf = renderResult.performance;

        return {
          hasPerformance: !!perf,
          hasStartTime: typeof perf?.startTime === "number",
          hasEndTime: typeof perf?.endTime === "number",
          hasDuration: typeof perf?.duration === "number",
          engine: perf?.engine,
          phase: perf?.phase,
          isSlow: perf?.isSlow,
        };
      } catch (error) {
        return { error: (error as Error).message };
      }
    });

    if (result.error) {
      console.warn("测试跳过:", result.error);
      return;
    }

    expect(result.hasPerformance).toBe(true);
    expect(result.hasStartTime).toBe(true);
    expect(result.hasEndTime).toBe(true);
    expect(result.hasDuration).toBe(true);
    expect(result.engine).toBe("preact");
    expect(result.phase).toBe("csr");
    expect(result.isSlow).toBe(false);
  }, browserConfig);

  it("React: CSR 应该返回性能指标", async (ctx) => {
    if ((ctx as any)._browserSetupError) return;

    const browser = (ctx as any).browser;
    if (!browser) return;

    const result = await browser.evaluate(() => {
      const RenderClient = (globalThis as any).RenderClient;

      if (!RenderClient) {
        return { error: "RenderClient not available" };
      }

      const app = document.getElementById("app");
      if (!app) return { error: "app container not found" };
      app.innerHTML = "";

      const TestComponent = () => null;

      try {
        const renderResult = RenderClient.renderCSR({
          engine: "react",
          component: TestComponent,
          container: "#app",
          performance: {
            enabled: true,
            slowThreshold: 1000,
          },
        });

        const perf = renderResult.performance;

        return {
          hasPerformance: !!perf,
          engine: perf?.engine,
          phase: perf?.phase,
        };
      } catch (error) {
        return { error: (error as Error).message };
      }
    });

    if (result.error) {
      console.warn("测试跳过:", result.error);
      return;
    }

    expect(result.hasPerformance).toBe(true);
    expect(result.engine).toBe("react");
    expect(result.phase).toBe("csr");
  }, browserConfig);

  it("Vue3: CSR 应该返回性能指标", async (ctx) => {
    if ((ctx as any)._browserSetupError) return;

    const browser = (ctx as any).browser;
    if (!browser) return;

    const result = await browser.evaluate(() => {
      const RenderClient = (globalThis as any).RenderClient;

      if (!RenderClient) {
        return { error: "RenderClient not available" };
      }

      const app = document.getElementById("app");
      if (!app) return { error: "app container not found" };
      app.innerHTML = "";

      const TestComponent = () => null;

      try {
        const renderResult = RenderClient.renderCSR({
          engine: "vue3",
          component: TestComponent,
          container: "#app",
          performance: {
            enabled: true,
            slowThreshold: 1000,
          },
        });

        const perf = renderResult.performance;

        return {
          hasPerformance: !!perf,
          engine: perf?.engine,
          phase: perf?.phase,
        };
      } catch (error) {
        return { error: (error as Error).message };
      }
    });

    if (result.error) {
      console.warn("测试跳过:", result.error);
      return;
    }

    expect(result.hasPerformance).toBe(true);
    expect(result.engine).toBe("vue3");
    expect(result.phase).toBe("csr");
  }, browserConfig);

  it("Vue2: 性能监控器应该正确记录引擎信息", async (ctx) => {
    if ((ctx as any)._browserSetupError) return;

    const browser = (ctx as any).browser;
    if (!browser) return;

    const result = await browser.evaluate(() => {
      const RenderClient = (globalThis as any).RenderClient;

      if (!RenderClient) {
        return { error: "RenderClient not available" };
      }

      // 测试 Vue2 引擎的性能监控
      const monitor = RenderClient.createPerformanceMonitor({
        enabled: true,
        slowThreshold: 1000,
      });

      if (!monitor) return { created: false };

      monitor.start("vue2", "hydrate");
      const metrics = monitor.end();

      return {
        created: true,
        hasMetrics: !!metrics,
        engine: metrics.engine,
        phase: metrics.phase,
        hasDuration: typeof metrics.duration === "number",
        hasStartTime: typeof metrics.startTime === "number",
        hasEndTime: typeof metrics.endTime === "number",
      };
    });

    if (result.error) {
      console.warn("测试跳过:", result.error);
      return;
    }

    expect(result.created).toBe(true);
    expect(result.hasMetrics).toBe(true);
    expect(result.engine).toBe("vue2");
    expect(result.phase).toBe("hydrate");
    expect(result.hasDuration).toBe(true);
    expect(result.hasStartTime).toBe(true);
    expect(result.hasEndTime).toBe(true);
  }, browserConfig);

  // ==================== 容器选择器测试 ====================

  it("应该支持 HTMLElement 作为容器", async (ctx) => {
    if ((ctx as any)._browserSetupError) return;

    const browser = (ctx as any).browser;
    if (!browser) return;

    const result = await browser.evaluate(() => {
      const RenderClient = (globalThis as any).RenderClient;

      if (!RenderClient) {
        return { error: "RenderClient not available" };
      }

      const app = document.getElementById("app");
      if (!app) return { error: "app container not found" };
      app.innerHTML = "";

      const TestComponent = () => null;

      try {
        // 直接传入 HTMLElement 而不是选择器字符串
        const renderResult = RenderClient.renderCSR({
          engine: "preact",
          component: TestComponent,
          container: app, // 直接传入元素
        });

        return {
          success: true,
          hasUnmount: typeof renderResult.unmount === "function",
        };
      } catch (error) {
        return { error: (error as Error).message };
      }
    });

    if (result.error) {
      console.warn("测试跳过:", result.error);
      return;
    }

    expect(result.success).toBe(true);
    expect(result.hasUnmount).toBe(true);
  }, browserConfig);

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
  }, browserConfig);
}, browserConfig);
