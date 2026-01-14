/**
 * @dreamer/render 主入口
 *
 * 提供 SSR、CSR、Hydration 和 SSG 功能
 * 支持 React、Preact 和 Vue3 三个模板引擎
 */

// 导出类型定义
export type {
  CacheOptions,
  CompressionOptions,
  ContextData,
  CSROptions,
  CSRRenderResult,
  Engine,
  ErrorHandler,
  HydrationOptions,
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

// 导出核心渲染函数
export { renderCSR } from "./csr.ts";
export { hydrate } from "./hydrate.ts";
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
  composeLayouts,
  createComponentTree,
  filterLayouts,
  shouldSkipLayouts,
} from "./utils/layout.ts";
export {
  extractMetadata,
  generateMetaTags,
  mergeMetadata,
  resolveMetadata,
} from "./utils/metadata.ts";
export {
  extractLoadFunction,
  generateDataScript,
  loadServerData,
} from "./utils/server-data.ts";
export {
  cacheMetadata,
  deleteCache,
  generateCacheKey,
  getCache,
  getCachedMetadata,
  setCache,
} from "./utils/cache.ts";
export {
  createPerformanceMonitor,
  PerformanceMonitor,
  recordPerformanceMetrics,
} from "./utils/performance.ts";
export {
  createErrorBoundary,
  generateErrorHTML,
  handleRenderError,
} from "./utils/error-handler.ts";
export {
  extractScripts,
  generateAsyncScriptLoader,
  generateScriptTags,
  mergeScripts,
} from "./utils/scripts.ts";
export {
  injectComponentHtml,
  injectHtml,
  injectMultiple,
} from "./utils/html-inject.ts";
export type { InjectOptions } from "./utils/html-inject.ts";
export {
  compressData,
  decompressData,
  generateCompressedDataScript,
} from "./utils/compression.ts";
export {
  generateLazyDataScript,
  shouldLazyLoad,
} from "./utils/lazy-loading.ts";
export {
  createContextProvider,
  mergeContextMetadata,
  mergeContextServerData,
} from "./utils/context.ts";
export {
  applyMetadata,
  removeMetaTag,
  updateMetaTag,
  updateTitle,
} from "./utils/metadata-dom.ts";
