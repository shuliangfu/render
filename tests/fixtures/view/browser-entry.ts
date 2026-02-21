/**
 * View 引擎浏览器测试入口：暴露 RenderClient 与 ViewJSX，供实际 CSR / Hybrid 渲染用例在 evaluate 内构造 View 组件
 * 使用命名导入并显式挂到 globalThis，确保 IIFE 打包后浏览器端 RenderClient 各方法可用
 * viewCsr / viewHybrid 用于直接测试 view-csr、view-hybrid 子路径适配器
 */

import {
  createPerformanceMonitor,
  handleRenderError,
  hydrate,
  recordPerformanceMetrics,
  renderCSR,
  renderErrorFallback,
} from "../../../src/client/mod.ts";
import * as viewCsrAdapter from "../../../src/client/adapters/view-csr.ts";
import * as viewHybridAdapter from "../../../src/client/adapters/view-hybrid.ts";
import { PerformanceMonitor } from "../../../src/client/utils/performance.ts";
// 使用 imports 映射路径，兼容 Deno(deno.json) 与 Bun(package.json)，避免 Bun 无法解析 jsr: 协议
import { jsx } from "@dreamer/view/jsx-runtime";

/** 挂到 globalName，供测试内通过 RenderClient 调用 renderCSR / hydrate；ViewJSX 用于构造 View 组件；viewCsr/viewHybrid 用于子路径适配器测试 */
const RenderClient = {
  renderCSR,
  hydrate,
  handleRenderError,
  renderErrorFallback,
  createPerformanceMonitor,
  recordPerformanceMetrics,
  PerformanceMonitor,
  ViewJSX: jsx,
  viewCsr: viewCsrAdapter,
  viewHybrid: viewHybridAdapter,
};

(globalThis as typeof globalThis & { RenderClient: typeof RenderClient })
  .RenderClient = RenderClient;
export { RenderClient };
