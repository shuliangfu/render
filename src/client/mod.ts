/**
 * Client render entry: CSR and Hydration for React, Preact, View.
 *
 * @module @dreamer/render/client
 * @packageDocumentation
 *
 * Browser-only; no server deps. **Exports:** renderCSR, hydrate; types CSROptions, CSRRenderResult, HydrationOptions, Engine, ErrorHandler, LayoutComponent, PerformanceMetrics, PerformanceOptions.
 *
 * @example
 * ```typescript
 * import { renderCSR, hydrate } from "@dreamer/render/client";
 * const result = await renderCSR({ engine: "preact", component: MyComponent, props: { name: "World" }, container: "#app" });
 * result.unmount();
 * result.update?.({ name: "New World" });
 * ```
 */

// Type exports
export type {
  CSROptions,
  CSRRenderResult,
  Engine,
  ErrorHandler,
  HydrationOptions,
  LayoutComponent,
  PerformanceMetrics,
  PerformanceOptions,
} from "./types.ts";

// Utils (advanced)
export {
  handleRenderError,
  renderErrorFallback,
} from "./utils/error-handler.ts";
export {
  createPerformanceMonitor,
  PerformanceMonitor,
  recordPerformanceMetrics,
} from "./utils/performance.ts";

import type { CSROptions, CSRRenderResult, HydrationOptions } from "./types.ts";

/** Load client adapter by engine */
async function loadClientAdapter(engine: "react" | "preact" | "view") {
  switch (engine) {
    case "react":
      return await import("./adapters/react.ts");
    case "preact":
      return await import("./adapters/preact.ts");
    case "view":
      return await import("./adapters/view.ts");
    default: {
      const _: never = engine;
      throw new Error(`Unsupported template engine: ${engine}`);
    }
  }
}

/**
 * Render component to a container in the browser (CSR).
 *
 * Loads adapter by options.engine; supports layouts, error handling, performance.
 *
 * @param options - CSR options: engine, component, props, container, layouts, errorHandler, performance, debug
 * @returns Promise of result with unmount, update, instance, performance
 * @throws If not in browser (no document) or engine unsupported
 */
export async function renderCSR(options: CSROptions): Promise<CSRRenderResult> {
  const { engine } = options;

  if (typeof globalThis.document === "undefined") {
    throw new Error("CSR render must run in browser environment");
  }

  const adapter = await loadClientAdapter(engine);
  return adapter.renderCSR(options);
}

/**
 * Hydrate server-rendered HTML in the browser.
 *
 * Loads adapter by options.engine and runs hydrate on the container.
 *
 * @param options - Hydration options: engine, component, props, container, layouts, errorHandler, performance, debug
 * @returns Promise of result with unmount, update, instance, performance
 * @throws If not in browser or engine unsupported
 */
export async function hydrate(
  options: HydrationOptions,
): Promise<CSRRenderResult> {
  const { engine } = options;

  if (typeof globalThis.document === "undefined") {
    throw new Error("Hydration must run in browser environment");
  }

  const adapter = await loadClientAdapter(engine);
  return adapter.hydrate(options);
}
