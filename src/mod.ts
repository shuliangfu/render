/**
 * @dreamer/render main entry (server): SSR, SSG, and utilities.
 *
 * @module @dreamer/render
 * @packageDocumentation
 *
 * Provides SSR and SSG with React, Preact, and View engines. For CSR and Hydration use `@dreamer/render/client`.
 *
 * **Exports:** renderSSR, renderSSRStream, renderSSG, expandDynamicRoute, generateRobots, generateSitemap;
 * cache, compression, context, error-handler, html-inject, layout, lazy-loading, metadata, performance,
 * scripts, server-data utils; types: SSROptions, RenderResult, StreamRenderResult, Engine, Metadata, etc.
 *
 * @example
 * ```typescript
 * import { renderSSR, renderSSRStream } from "@dreamer/render";
 * const result = await renderSSR({ engine: "preact", component: MyComponent, props: { name: "World" } });
 * console.log(result.html);
 * // View-only true stream (ReadableStream); not Suspense selective streaming
 * const stream = await renderSSRStream({ engine: "view", component: ViewPage });
 * import { renderCSR, hydrate } from "@dreamer/render/client";
 * ```
 */

// Server-related type exports
export type {
  CacheOptions,
  CompressionOptions,
  ContextData,
  Engine,
  ErrorHandler,
  LayoutComponent,
  LoadContext,
  LoadFunction,
  Metadata,
  MetadataValue,
  PerformanceMetrics,
  PerformanceOptions,
  RenderResult,
  ScriptDefinition,
  ServerData,
  SSGOptions,
  SSROptions,
  StreamRenderResult,
} from "./types.ts";

// 导出核心渲染函数（服务端）
export {
  expandDynamicRoute,
  filePathToRoute,
  generateRobots,
  generateSitemap,
  renderSSG,
  routeToFilePath,
} from "./ssg.ts";
export { renderSSR, renderSSRStream } from "./ssr.ts";

// Adapters are not re-exported here to avoid version conflicts; server/client load by engine. Use subpaths for advanced usage.

// Utility exports (advanced usage)
export {
  cacheMetadata,
  deleteCache,
  generateCacheKey,
  getCache,
  getCachedMetadata,
  setCache,
} from "./utils/cache.ts";
export {
  compressData,
  decompressData,
  generateCompressedDataScript,
} from "./utils/compression.ts";
export {
  createContextProvider,
  mergeContextMetadata,
  mergeContextServerData,
} from "./utils/context.ts";
export { generateErrorHTML, handleRenderError } from "./utils/error-handler.ts";
export {
  injectComponentHtml,
  injectHtml,
  injectMultiple,
} from "./utils/html-inject.ts";
export type { InjectOptions } from "./utils/html-inject.ts";
export { createHtmlInjectTransform } from "./utils/html-stream-inject.ts";
export type { StreamInjection } from "./utils/html-stream-inject.ts";
export {
  composeLayouts,
  createComponentTree,
  filterLayouts,
  shouldSkipLayouts,
} from "./utils/layout.ts";
export {
  generateLazyDataScript,
  shouldLazyLoad,
} from "./utils/lazy-loading.ts";
export {
  DWEB_ROUTE_META_ATTR,
  extractMetadata,
  generateMetaTags,
  generateRouteMetaTagsWithoutTitle,
  generateRouteTitleTag,
  mergeMetadata,
  resolveMetadata,
} from "./utils/metadata.ts";
export {
  createPerformanceMonitor,
  PerformanceMonitor,
  recordPerformanceMetrics,
} from "./utils/performance.ts";
export {
  extractScripts,
  generateAsyncScriptLoader,
  generateScriptTags,
  mergeScripts,
} from "./utils/scripts.ts";
export {
  extractLoadFunction,
  generateDataScript,
  loadServerData,
} from "./utils/server-data.ts";

// Client DOM helpers (applyMetadata, updateTitle, etc.) live in @dreamer/render/client
