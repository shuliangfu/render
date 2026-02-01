/**
 * 客户端性能监控工具
 *
 * 提供渲染性能监控和指标收集
 */

import type {
  Engine,
  PerformanceMetrics,
  PerformanceOptions,
} from "../types.ts";

/**
 * 性能监控器类
 *
 * 用于监控渲染性能
 */
export class PerformanceMonitor {
  private startTime = 0;
  private engine: Engine = "preact";
  private phase: "csr" | "hydrate" = "csr";
  private options: PerformanceOptions;

  /**
   * 创建性能监控器实例
   *
   * @param options 性能监控选项
   */
  constructor(options: PerformanceOptions) {
    this.options = options;
  }

  /**
   * 开始计时
   *
   * @param engine 引擎类型
   * @param phase 渲染阶段
   */
  start(engine: Engine, phase: "csr" | "hydrate"): void {
    this.engine = engine;
    this.phase = phase;
    // 使用高精度时间（如果可用）
    this.startTime = typeof performance !== "undefined"
      ? performance.now()
      : Date.now();
  }

  /**
   * 结束计时并返回性能指标
   *
   * @returns 性能指标
   */
  end(): PerformanceMetrics {
    const endTime = typeof performance !== "undefined"
      ? performance.now()
      : Date.now();
    const duration = endTime - this.startTime;
    const slowThreshold = this.options.slowThreshold ?? 100;
    const isSlow = duration > slowThreshold;

    const metrics: PerformanceMetrics = {
      startTime: this.startTime,
      endTime,
      duration,
      engine: this.engine,
      phase: this.phase,
      isSlow,
    };

    return metrics;
  }
}

/**
 * 创建性能监控器
 *
 * 如果启用了性能监控，返回监控器实例；否则返回 null
 *
 * @param options 性能监控选项
 * @returns 性能监控器实例或 null
 */
export function createPerformanceMonitor(
  options?: PerformanceOptions,
): PerformanceMonitor | null {
  if (!options?.enabled) {
    return null;
  }
  return new PerformanceMonitor(options);
}

/**
 * 记录性能指标
 *
 * 调用回调函数并在控制台输出慢渲染警告
 *
 * @param metrics 性能指标
 * @param options 性能监控选项
 */
export function recordPerformanceMetrics(
  metrics: PerformanceMetrics,
  options?: PerformanceOptions,
): void {
  // 调用回调函数
  if (options?.onMetrics) {
    try {
      options.onMetrics(metrics);
    } catch (error) {
      console.error("[Performance] 指标回调执行失败:", error);
    }
  }

  // 慢渲染警告
  if (metrics.isSlow) {
    const phaseText = metrics.phase === "csr" ? "CSR 渲染" : "Hydration";
    console.warn(
      `[Performance] ${phaseText}较慢: ${metrics.duration.toFixed(2)}ms ` +
        `(阈值: ${options?.slowThreshold ?? 100}ms, 引擎: ${metrics.engine})`,
    );
  }
}
