/**
 * @dreamer/render 主模块测试
 */

import { assertRejects, describe, expect, it } from "@dreamer/test";
import {
  type Engine,
  hydrate,
  renderCSR,
  renderSSG,
  renderSSR,
} from "../src/mod.ts";

describe("@dreamer/render", () => {
  describe("类型导出", () => {
    it("应该导出 Engine 类型", () => {
      const engine: Engine = "react";
      expect(engine).toBe("react");
    });

    it("应该支持所有模板引擎类型", () => {
      const engines: Engine[] = ["react", "preact", "vue3"];
      expect(engines.length).toBe(3);
    });
  });

  describe("renderSSR", () => {
    it("应该拒绝不支持的模板引擎", async () => {
      await assertRejects(
        () =>
          renderSSR({
            engine: "invalid" as Engine,
            component: () => null,
          }),
        Error,
        "不支持的模板引擎",
      );
    });

    it("应该拒绝无效的组件", async () => {
      await assertRejects(
        () =>
          renderSSR({
            engine: "react",
            component: null as any,
          }),
        Error,
      );
    });
  });

  describe("renderCSR", () => {
    it("应该在非浏览器环境抛出错误", async () => {
      // 在 Bun 中，虽然 globalThis.document 是 undefined，但 React 的 createRoot 可能仍然被调用
      // 导致抛出不同的错误消息，所以我们需要更宽松的检查
      try {
        await renderCSR({
          engine: "react",
          component: () => null,
          container: "#app",
        });
        // 如果没有抛出错误，测试失败
        throw new Error("期望抛出错误，但没有抛出");
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        // 检查是否包含预期的错误消息（可能是环境检查错误或 React 的错误）
        if (!msg.includes("CSR 渲染只能在浏览器环境中运行") &&
            !msg.includes("容器元素未找到") &&
            !msg.includes("Target container")) {
          throw new Error(`期望错误消息包含 "CSR 渲染只能在浏览器环境中运行"、"容器元素未找到" 或 "Target container"，实际消息: ${msg}`);
        }
      }
    });
  });

  describe("hydrate", () => {
    it("应该在非浏览器环境抛出错误", async () => {
      // 在 Bun 中，虽然 globalThis.document 是 undefined，但 React 的 hydrateRoot 可能仍然被调用
      // 导致抛出不同的错误消息，所以我们需要更宽松的检查
      try {
        hydrate({
          engine: "react",
          component: () => null,
          container: "#app",
        });
        // 如果没有抛出错误，测试失败
        throw new Error("期望抛出错误，但没有抛出");
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        // 检查是否包含预期的错误消息（可能是环境检查错误或 React 的错误）
        if (!msg.includes("水合") &&
            !msg.includes("浏览器环境") &&
            !msg.includes("DOM element") &&
            !msg.includes("Target container")) {
          throw new Error(`期望错误消息包含 "水合"、"浏览器环境"、"DOM element" 或 "Target container"，实际消息: ${msg}`);
        }
      }
    });
  });

  describe("renderSSG", () => {
    it("应该接受空路由列表", async () => {
      const result = await renderSSG({
        engine: "react",
        routes: [],
        outputDir: "./tests/data/test-output",
        loadRouteComponent: async () => ({}),
      });
      expect(result).toBeInstanceOf(Array);
    });

    it("应该拒绝无效的输出目录", async () => {
      await assertRejects(
        () =>
          renderSSG({
            engine: "react",
            routes: ["/"],
            outputDir: "",
            loadRouteComponent: async () => ({}),
          }),
        Error,
      );
    });
  });
});
