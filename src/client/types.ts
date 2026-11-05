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
 * View hydration binding: DOM child-index path → binding id.
 * Opaque to this package; real tables come from dweb / `@dreamer/view/compiler`.
 */
export type ViewHydrationBinding = [number[], string];

/**
 * View hydration mismatch recovery strategy (aligned with `@dreamer/view`).
 * - `continue`: record only (this adapter's **default** when omitted)
 * - `assert`: throw after hydrate if any mismatch
 * - `remount`: clear container and CSR remount (view production default when omitted there)
 */
export type ViewHydrationMismatchMode = "continue" | "assert" | "remount";

/** Single binding-path resolution failure (view `HydrationMismatch` subset). */
export interface ViewHydrationMismatch {
  id: string;
  path: number[];
  reason: "not_found" | "walk_error";
  error?: unknown;
}

/**
 * Hydration options.
 *
 * View-only fields (`mismatchMode` / `bindings` / `warnMismatch` / `onMismatch`)
 * forward to `@dreamer/view` `HydrateOptions`. Other engines ignore them.
 * **Default `mismatchMode` in view adapters is `"continue"`** (explicit), not view 3.0's
 * DEV-assert / prod-remount when omitted.
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
  /**
   * View only: mismatch strategy. Adapter default when omitted: `"continue"`.
   * Pass `"assert"` / `"remount"` explicitly when the app wants view 3.0-strict behavior.
   */
  mismatchMode?: ViewHydrationMismatchMode;
  /**
   * View only: compiler binding table. `undefined` / omitted → `[]`.
   * This package only forwards; it does not generate bindings.
   */
  bindings?: ViewHydrationBinding[];
  /** View only: `console.warn` on mismatch (view default follows `VIEW_DEV` when omitted). */
  warnMismatch?: boolean;
  /** View only: per-mismatch callback (telemetry). */
  onMismatch?: (info: ViewHydrationMismatch) => void;
}
