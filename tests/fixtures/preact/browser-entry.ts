/**
 * Preact 引擎浏览器测试入口：暴露 RenderClient 与 PreactH，供实际 CSR / Hybrid 渲染用例在 evaluate 内构造 Preact 组件
 * 使用命名导入并显式挂到 globalThis，确保 IIFE 打包后浏览器端 RenderClient 各方法可用
 */

import {
  createPerformanceMonitor,
  handleRenderError,
  hydrate,
  recordPerformanceMetrics,
  renderCSR,
  renderErrorFallback,
} from "../../../src/client/mod.ts";
import { PerformanceMonitor } from "../../../src/client/utils/performance.ts";
import { h } from "npm:preact@10.28.3";

/** 挂到 globalName，供测试内通过 RenderClient 调用 renderCSR / hydrate；PreactH 用于构造 Preact 组件 */
const RenderClient = {
  renderCSR,
  hydrate,
  handleRenderError,
  renderErrorFallback,
  createPerformanceMonitor,
  recordPerformanceMetrics,
  PerformanceMonitor,
  PreactH: h,
};

(globalThis as typeof globalThis & { RenderClient: typeof RenderClient })
  .RenderClient = RenderClient;
export { RenderClient };
