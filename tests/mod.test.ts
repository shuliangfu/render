/**
 * @dreamer/render 主模块测试（服务端）
 *
 * 注意：客户端渲染（CSR）和 Hydration 测试已移至 client.test.ts
 */

import { assertRejects, describe, expect, it } from "@dreamer/test";
import { type Engine, renderSSG, renderSSR } from "../src/mod.ts";

describe("@dreamer/render（服务端）", () => {
  describe("类型导出", () => {
    it("应该导出 Engine 类型", () => {
      const engine: Engine = "react";
      expect(engine).toBe("react");
    });

    it("应该支持所有模板引擎类型", () => {
      const engines: Engine[] = ["react", "preact"];
      expect(engines.length).toBe(2);
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
