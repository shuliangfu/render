/**
 * Performance monitoring utilities for render (SSR/CSR).
 *
 * @packageDocumentation
 */

import type {
  Engine,
  PerformanceMetrics,
  PerformanceOptions,
} from "../types.ts";

/** High-resolution timestamp (performance.now() or Date.now()). */
function getNow(): number {
  if (
    typeof performance !== "undefined" && typeof performance.now === "function"
  ) {
    return performance.now();
  }
  return Date.now();
}

/** Tracks start/end and custom metrics for a render phase. */
export class PerformanceMonitor {
  private startTime: number = 0;
  private metrics: Partial<PerformanceMetrics> = {};

  /** Start monitoring. */
  start(engine: Engine, phase: "ssr"): void {
    this.startTime = getNow();
    this.metrics = {
      engine,
      phase,
      startTime: this.startTime,
    };
  }

  /** End monitoring and return metrics. */
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

  /** Add custom metric. */
  addMetric(key: string, value: unknown): void {
    this.metrics[key] = value;
  }
}

/**
 * Create performance monitor when options.enabled is true.
 *
 * @param options - Performance options
 * @returns Monitor instance or null if disabled
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
 * Record metrics via options.onMetrics if provided.
 *
 * @param metrics - Measured metrics
 * @param options - Performance options
 */
export function recordPerformanceMetrics(
  metrics: PerformanceMetrics,
  options?: PerformanceOptions,
): void {
  if (options?.onMetrics) {
    try {
      options.onMetrics(metrics);
    } catch (error) {
      console.error("Performance metrics callback failed:", error);
    }
  }
}
