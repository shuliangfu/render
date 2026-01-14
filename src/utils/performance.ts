/**
 * 性能监控工具函数
 *
 * 用于监控渲染性能
 */

import type { Engine, PerformanceMetrics, PerformanceOptions } from "../types.ts";

/**
 * 获取高精度时间戳（兼容 Deno 和 Bun）
 */
function getNow(): number {
  // 优先使用 performance.now()（浏览器和 Node.js）
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }
  // 降级到 Date.now()
  return Date.now();
}

/**
 * 性能监控器
 */
export class PerformanceMonitor {
  private startTime: number = 0;
  private metrics: Partial<PerformanceMetrics> = {};

  /**
   * 开始监控
   */
  start(engine: Engine, phase: "ssr" | "csr" | "hydrate"): void {
    this.startTime = getNow();
    this.metrics = {
      engine,
      phase,
      startTime: this.startTime,
    };
  }

  /**
   * 结束监控
   */
  end(): PerformanceMetrics {
    const endTime = getNow();
    const duration = endTime - this.startTime;

    const metrics: PerformanceMetrics = {
      ...this.metrics,
      endTime,
      duration,
    } as PerformanceMetrics;

    this.metrics = {};
    return metrics;
  }

  /**
   * 添加自定义指标
   */
  addMetric(key: string, value: unknown): void {
    this.metrics[key] = value;
  }
}

/**
 * 创建性能监控器
 *
 * @param options 性能监控选项
 * @returns 性能监控器实例，如果未启用则返回 null
 */
export function createPerformanceMonitor(
  options?: PerformanceOptions,
): PerformanceMonitor | null {
  if (!options?.enabled) {
    return null;
  }

  return new PerformanceMonitor();
}

/**
 * 记录性能指标
 *
 * @param metrics 性能指标
 * @param options 性能监控选项
 */
export function recordPerformanceMetrics(
  metrics: PerformanceMetrics,
  options?: PerformanceOptions,
): void {
  if (options?.onMetrics) {
    try {
      options.onMetrics(metrics);
    } catch (error) {
      console.error("性能指标回调执行失败:", error);
    }
  }
}
