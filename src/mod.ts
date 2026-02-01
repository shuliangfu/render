/**
 * @dreamer/render 主入口（服务端）
 *
 * 提供 SSR 和 SSG 功能，支持 React、Preact 和 Vue3 三个模板引擎。
 *
 * 注意：客户端渲染（CSR）和 Hydration 功能请使用 @dreamer/render/client
 *
 * @example
 * ```typescript
 * // 服务端渲染
 * import { renderSSR } from "@dreamer/render";
 *
 * const result = await renderSSR({
 *   engine: "preact",
 *   component: MyComponent,
 *   props: { name: "World" },
 * });
 * console.log(result.html);
 *
 * // 客户端渲染（请使用 client 子模块）
 * import { renderCSR, hydrate } from "@dreamer/render/client";
 * ```
 */

// 导出类型定义（服务端相关）
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
} from "./types.ts";

// 导出核心渲染函数（服务端）
export {
  expandDynamicRoute,
  generateRobots,
  generateSitemap,
  renderSSG,
} from "./ssg.ts";
export { renderSSR } from "./ssr.ts";

// 导出适配器（供高级用法）
export * from "./adapters/mod.ts";

// 导出工具函数（供高级用法）
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
export {
  generateErrorHTML,
  handleRenderError,
} from "./utils/error-handler.ts";
export {
  injectComponentHtml,
  injectHtml,
  injectMultiple,
} from "./utils/html-inject.ts";
export type { InjectOptions } from "./utils/html-inject.ts";
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
  extractMetadata,
  generateMetaTags,
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

// 注意：客户端 DOM 操作（applyMetadata、updateTitle 等）
// 已移至 @dreamer/render/client
