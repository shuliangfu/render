/**
 * Client render types (CSR, Hydration, shared).
 *
 * @packageDocumentation
 */

/**
 * Template engine: react, preact, view.
 */
export type Engine = "react" | "preact" | "view";

/**
 * Layout component config.
 */
export interface LayoutComponent {
  /** Layout component */
  component: unknown;
  /** Layout props */
  props?: Record<string, unknown>;
}

/**
 * Error handling options.
 */
export interface ErrorHandler {
  /** Error callback */
  onError?: (error: Error, context: {
    engine: Engine;
    component: unknown;
    phase: "csr" | "hydrate";
  }) => void | Promise<void>;
  /** Fallback component when render errors */
  fallbackComponent?: unknown;
  /** Log errors to console (default true) */
  logError?: boolean;
}

/**
 * Performance monitoring options.
 */
export interface PerformanceOptions {
  /** Enable performance monitoring (default false) */
  enabled?: boolean;
  /** Metrics callback */
  onMetrics?: (metrics: PerformanceMetrics) => void;
  /** Slow render threshold in ms (default 100) */
  slowThreshold?: number;
}

/**
 * Performance metrics.
 */
export interface PerformanceMetrics {
  /** Render start time */
  startTime: number;
  /** Render end time */
  endTime: number;
  /** Total duration in ms */
  duration: number;
  /** Engine type */
  engine: Engine;
  /** Phase (csr | hydrate) */
  phase: "csr" | "hydrate";
  /** Whether render was slow */
  isSlow?: boolean;
}

/**
 * CSR render options.
 */
export interface CSROptions {
  /** Template engine */
  engine: Engine;
  /** Page component */
  component: unknown;
  /** Component props */
  props?: Record<string, unknown>;
  /** Layouts (outer to inner) */
  layouts?: LayoutComponent[];
  /** Skip layouts */
  skipLayouts?: boolean;
  /** Container selector or element */
  container: string | HTMLElement;
  /** Error handling */
  errorHandler?: ErrorHandler;
  /** Performance options */
  performance?: PerformanceOptions;
  /** Enable debug logging (default false) */
  debug?: boolean;
}

/**
 * CSR render result (unmount, update, instance, performance).
 */
export interface CSRRenderResult {
  /** Unmount the rendered tree */
  unmount: () => void;
  /** Update component props */
  update?: (props: Record<string, unknown>) => void;
  /** Component instance (optional) */
  instance?: unknown;
  /** Performance metrics if enabled */
  performance?: PerformanceMetrics;
}

/**
 * Hydration options.
 */
export interface HydrationOptions {
  /** Template engine */
  engine: Engine;
  /** Page component */
  component: unknown;
  /** Component props */
  props?: Record<string, unknown>;
  /** Layouts (outer to inner) */
  layouts?: LayoutComponent[];
  /** Skip layouts */
  skipLayouts?: boolean;
  /** Container selector or element */
  container: string | HTMLElement;
  /** Error handling */
  errorHandler?: ErrorHandler;
  /** Performance options */
  performance?: PerformanceOptions;
  /** Debug logging (default false) */
  debug?: boolean;
}
