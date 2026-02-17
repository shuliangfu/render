/**
 * Render library type definitions (server SSR/SSG and shared types).
 *
 * @packageDocumentation
 */

/**
 * Supported template engines: react, preact, view.
 */
export type Engine = "react" | "preact" | "view";

/**
 * Page metadata (title, description, og, etc.).
 */
export interface Metadata {
  /** Page title */
  title?: string;
  /** Page description */
  description?: string;
  /** Keywords */
  keywords?: string;
  /** Author */
  author?: string;
  /** Open Graph metadata */
  og?: {
    title?: string;
    description?: string;
    image?: string;
    url?: string;
    type?: string;
  };
  /** Twitter Card metadata */
  twitter?: {
    card?: string;
    title?: string;
    description?: string;
    image?: string;
  };
  /** Custom meta tags */
  custom?: Record<string, string>;
}

/**
 * Context passed to Load and metadata functions.
 */
export interface LoadContext {
  /** Request URL */
  url: string;
  /** Route params */
  params: Record<string, string>;
  /** Raw request (optional) */
  request?: Request;
  /** Other context */
  [key: string]: unknown;
}

/**
 * Server data (load result).
 */
export interface ServerData {
  [key: string]: unknown;
}

/**
 * Load function signature.
 */
export type LoadFunction = (
  context: LoadContext,
) => Promise<ServerData> | ServerData;

/**
 * Metadata value: static object, or sync/async function.
 */
export type MetadataValue =
  | Metadata
  | ((context: LoadContext) => Metadata)
  | ((context: LoadContext) => Promise<Metadata>);

/**
 * Layout component definition.
 */
export interface LayoutComponent {
  /** Layout component */
  component: unknown;
  /** Layout props */
  props?: Record<string, unknown>;
  /** If true, this layout is not applied */
  skip?: boolean;
}

/**
 * Script definition (src, content, async, defer, priority, etc.).
 */
export interface ScriptDefinition {
  /** Script URL or inline */
  src?: string;
  /** Inline script content */
  content?: string;
  /** Async load */
  async?: boolean;
  /** Defer load */
  defer?: boolean;
  /** Priority (lower = higher priority) */
  priority?: number;
  /** Script type */
  type?: string;
  /** Other attributes */
  [key: string]: unknown;
}

/**
 * Error handling options.
 */
export interface ErrorHandler {
  /** Error callback */
  onError?: (error: Error, context: {
    engine: Engine;
    component: unknown;
    phase: "ssr";
  }) => void | Promise<void>;
  /** Fallback component when SSR errors */
  fallbackComponent?: unknown;
  /** Whether to log errors to console */
  logError?: boolean;
}

/**
 * Performance monitoring options.
 */
export interface PerformanceOptions {
  /** Enable performance monitoring */
  enabled?: boolean;
  /** Metrics callback */
  onMetrics?: (metrics: PerformanceMetrics) => void;
}

/**
 * Performance metrics (startTime, endTime, duration, engine, phase).
 */
export interface PerformanceMetrics {
  /** Render start time */
  startTime: number;
  /** Render end time */
  endTime: number;
  /** Total duration (ms) */
  duration: number;
  /** Engine type */
  engine: Engine;
  /** Phase (e.g. ssr) */
  phase: "ssr";
  /** Other metrics */
  [key: string]: unknown;
}

/**
 * Cache options (enabled, getCacheKey, storage, ttl).
 */
export interface CacheOptions {
  /** Enable cache */
  enabled?: boolean;
  /** Cache key generator */
  getCacheKey?: (context: LoadContext) => string;
  /** Storage (get/set/delete) */
  storage?: {
    get: (key: string) => Promise<unknown> | unknown;
    set: (key: string, value: unknown) => Promise<void> | void;
    delete: (key: string) => Promise<void> | void;
  };
  /** TTL in ms */
  ttl?: number;
}

/**
 * Compression options (enabled, threshold, algorithm).
 */
export interface CompressionOptions {
  /** Enable compression */
  enabled?: boolean;
  /** Min size in bytes to compress */
  threshold?: number;
  /** Algorithm: gzip, deflate, brotli */
  algorithm?: "gzip" | "deflate" | "brotli";
}

/**
 * Context API data (metadata + serverData).
 */
export interface ContextData {
  /** Metadata */
  metadata?: Metadata;
  /** Server data */
  serverData?: ServerData;
}

/**
 * Server-side rendering options.
 */
export interface SSROptions {
  /** Template engine */
  engine: Engine;
  /** Root component */
  component: unknown;
  /** Component props */
  props?: Record<string, unknown>;
  /** Layouts (outer to inner) */
  layouts?: LayoutComponent[];
  /** Skip all layouts (e.g. when component has inheritLayout = false) */
  skipLayouts?: boolean;
  /** HTML template wrapping the result */
  template?: string;
  /** Enable streaming (React native; Preact simulated chunks) */
  stream?: boolean;
  /** Load context for load() and metadata */
  loadContext?: LoadContext;
  /** Client script URLs or inline for hydration/CSR */
  clientScripts?: string[];
  /** Script definitions (priority, async, etc.) */
  scripts?: ScriptDefinition[];
  /** Error handling */
  errorHandler?: ErrorHandler;
  /** Performance options */
  performance?: PerformanceOptions;
  /** Metadata cache */
  metadataCache?: CacheOptions;
  /** Compression options */
  compression?: CompressionOptions;
  /** Context API data */
  contextData?: ContextData;
  /** Enable lazy data loading */
  lazyData?: boolean;
  /** @internal Skip data injection (used by SSG) */
  skipDataInjection?: boolean;
  /** Enable debug logging */
  debug?: boolean;
  /**
   * Optional locale for server-side i18n (e.g. "en-US", "zh-CN").
   * When omitted, locale is auto-detected from env (LANGUAGE/LC_ALL/LANG).
   */
  lang?: string;
  /** Engine-specific options */
  options?: Record<string, unknown>;
}

/** CSROptions, HydrationOptions, CSRRenderResult are in @dreamer/render/client */

/**
 * Static site generation options.
 */
export interface SSGOptions {
  /** Template engine */
  engine: Engine;
  /** Route list */
  routes: string[];
  /** Output directory */
  outputDir: string;
  /** Load route component */
  loadRouteComponent: (route: string) => Promise<unknown>;
  /** Load route layouts (_app, _layout, etc., outer to inner) */
  loadRouteLayouts?: (
    route: string,
  ) => Promise<Array<{ component: unknown; props?: Record<string, unknown> }>>;
  /** Load route data (prefetch) */
  loadRouteData?: (route: string) => Promise<Record<string, unknown>>;
  /** HTML template (optional) */
  template?: string;
  /** HTML to inject before </head> */
  headInject?: string;
  /** Pure static HTML (no scripts) */
  pureHTML?: boolean;
  /** Inject data into HTML for hydration */
  enableDataInjection?: boolean;
  /** Generate sitemap.xml */
  generateSitemap?: boolean;
  /** Generate robots.txt */
  generateRobots?: boolean;
  /** Callback per generated file (progress) */
  onFileGenerated?: (filePath: string) => void;
  /** Debug logging */
  debug?: boolean;
  /**
   * Optional locale for server-side i18n (e.g. "en-US", "zh-CN").
   * When omitted, locale is auto-detected from env.
   */
  lang?: string;
  /** Custom options */
  options?: Record<string, unknown>;
}

/**
 * SSR render result (html, styles, scripts, metadata, performance, etc.).
 */
export interface RenderResult {
  /** Rendered HTML */
  html: string;
  /** Extracted styles */
  styles?: string[];
  /** Extracted scripts */
  scripts?: string[];
  /** Engine-specific render info */
  renderInfo?: Record<string, unknown>;
  /** Merged metadata */
  metadata?: Metadata;
  /** Layout load data */
  layoutData?: ServerData;
  /** Page load data */
  pageData?: ServerData;
  /** Performance metrics if enabled */
  performance?: PerformanceMetrics;
  /** Whether result was from cache */
  fromCache?: boolean;
  /** Compressed size (if compression used) */
  compressedSize?: number;
  /** Original size (if compression used) */
  originalSize?: number;
}

/** CSRRenderResult is in @dreamer/render/client */
