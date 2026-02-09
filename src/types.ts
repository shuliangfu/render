/**
 * 渲染库类型定义
 */

/**
 * 支持的模板引擎类型
 */
export type Engine = "react" | "preact";

/**
 * 元数据
 */
export interface Metadata {
  /** 页面标题 */
  title?: string;
  /** 页面描述 */
  description?: string;
  /** 关键词 */
  keywords?: string;
  /** 作者 */
  author?: string;
  /** Open Graph 元数据 */
  og?: {
    title?: string;
    description?: string;
    image?: string;
    url?: string;
    type?: string;
  };
  /** Twitter Card 元数据 */
  twitter?: {
    card?: string;
    title?: string;
    description?: string;
    image?: string;
  };
  /** 自定义 meta 标签 */
  custom?: Record<string, string>;
}

/**
 * Load 方法的上下文
 */
export interface LoadContext {
  /** 请求 URL */
  url: string;
  /** 路由参数 */
  params: Record<string, string>;
  /** 原始请求对象（可选） */
  request?: Request;
  /** 其他上下文信息 */
  [key: string]: unknown;
}

/**
 * 服务端数据
 */
export interface ServerData {
  [key: string]: unknown;
}

/**
 * Load 方法函数签名
 */
export type LoadFunction = (
  context: LoadContext,
) => Promise<ServerData> | ServerData;

/**
 * Metadata 值类型（可以是静态对象、同步函数或异步函数）
 */
export type MetadataValue =
  | Metadata
  | ((context: LoadContext) => Metadata)
  | ((context: LoadContext) => Promise<Metadata>);

/**
 * 布局组件定义
 */
export interface LayoutComponent {
  /** 布局组件 */
  component: unknown;
  /** 布局组件属性 */
  props?: Record<string, unknown>;
  /** 是否跳过此布局（如果为 true，此布局不会被应用） */
  skip?: boolean;
}

/**
 * 脚本定义
 */
export interface ScriptDefinition {
  /** 脚本路径或内联脚本 */
  src?: string;
  /** 内联脚本内容 */
  content?: string;
  /** 是否异步加载 */
  async?: boolean;
  /** 是否延迟加载 */
  defer?: boolean;
  /** 脚本优先级（数字越小优先级越高） */
  priority?: number;
  /** 脚本类型 */
  type?: string;
  /** 其他属性 */
  [key: string]: unknown;
}

/**
 * 错误处理选项
 */
export interface ErrorHandler {
  /** 错误处理函数 */
  onError?: (error: Error, context: {
    engine: Engine;
    component: unknown;
    phase: "ssr";
  }) => void | Promise<void>;
  /** 错误降级组件（用于 SSR 错误时显示） */
  fallbackComponent?: unknown;
  /** 是否在控制台输出错误 */
  logError?: boolean;
}

/**
 * 性能监控选项
 */
export interface PerformanceOptions {
  /** 是否启用性能监控 */
  enabled?: boolean;
  /** 性能指标回调 */
  onMetrics?: (metrics: PerformanceMetrics) => void;
}

/**
 * 性能指标
 */
export interface PerformanceMetrics {
  /** 渲染开始时间 */
  startTime: number;
  /** 渲染结束时间 */
  endTime: number;
  /** 总渲染时间（毫秒） */
  duration: number;
  /** 引擎类型 */
  engine: Engine;
  /** 渲染阶段 */
  phase: "ssr";
  /** 其他指标 */
  [key: string]: unknown;
}

/**
 * 缓存选项
 */
export interface CacheOptions {
  /** 是否启用缓存 */
  enabled?: boolean;
  /** 缓存键生成函数 */
  getCacheKey?: (context: LoadContext) => string;
  /** 缓存存储接口 */
  storage?: {
    get: (key: string) => Promise<unknown> | unknown;
    set: (key: string, value: unknown) => Promise<void> | void;
    delete: (key: string) => Promise<void> | void;
  };
  /** 缓存过期时间（毫秒） */
  ttl?: number;
}

/**
 * 数据压缩选项
 */
export interface CompressionOptions {
  /** 是否启用压缩 */
  enabled?: boolean;
  /** 压缩阈值（数据大小超过此值才压缩，字节） */
  threshold?: number;
  /** 压缩算法 */
  algorithm?: "gzip" | "deflate" | "brotli";
}

/**
 * Context API 数据
 */
export interface ContextData {
  /** 元数据 */
  metadata?: Metadata;
  /** 服务端数据 */
  serverData?: ServerData;
}

/**
 * 服务端渲染选项
 */
export interface SSROptions {
  /** 模板引擎类型 */
  engine: Engine;
  /** 组件（React/Preact 组件） */
  component: unknown;
  /** 组件属性 */
  props?: Record<string, unknown>;
  /** 布局组件列表（从外到内，支持多层嵌套） */
  layouts?: LayoutComponent[];
  /** 是否跳过所有布局（如果组件导出了 inheritLayout = false） */
  skipLayouts?: boolean;
  /** HTML 模板（可选，用于包装渲染结果） */
  template?: string;
  /** 是否启用流式渲染（仅 React） */
  stream?: boolean;
  /** Load Context（用于传递给组件的 load 方法和 metadata 函数） */
  loadContext?: LoadContext;
  /** 客户端脚本（用于水合或 CSR，可以是脚本路径或内联脚本） */
  clientScripts?: string[];
  /** 脚本定义列表（更高级的脚本注入，支持优先级、异步等） */
  scripts?: ScriptDefinition[];
  /** 错误处理选项 */
  errorHandler?: ErrorHandler;
  /** 性能监控选项 */
  performance?: PerformanceOptions;
  /** 元数据缓存选项 */
  metadataCache?: CacheOptions;
  /** 数据压缩选项 */
  compression?: CompressionOptions;
  /** Context API 数据（动态设置元数据和数据） */
  contextData?: ContextData;
  /** 是否启用数据懒加载 */
  lazyData?: boolean;
  /**
   * 是否跳过数据注入
   * @internal 内部使用，SSG 会自动设置，用户不应直接使用此选项
   */
  skipDataInjection?: boolean;
  /** 是否启用详细调试日志（默认：false） */
  debug?: boolean;
  /** 自定义渲染选项（模板引擎特定） */
  options?: Record<string, unknown>;
}

// 注意：CSROptions、HydrationOptions、CSRRenderResult 已移至 @dreamer/render/client

/**
 * 静态站点生成选项
 */
export interface SSGOptions {
  /** 模板引擎类型 */
  engine: Engine;
  /** 路由列表 */
  routes: string[];
  /** 输出目录 */
  outputDir: string;
  /** 路由组件加载函数 */
  loadRouteComponent: (route: string) => Promise<unknown>;
  /** 路由布局加载函数（可选，用于加载 _app、_layout 等，从外到内） */
  loadRouteLayouts?: (
    route: string,
  ) => Promise<Array<{ component: unknown; props?: Record<string, unknown> }>>;
  /** 路由数据加载函数（可选，用于预取数据） */
  loadRouteData?: (route: string) => Promise<Record<string, unknown>>;
  /** HTML 模板（不传则直接使用 _app 等布局的输出） */
  template?: string;
  /** 注入到 </head> 前的内容（如 link 标签），用于在 _app 输出的 head 中插入 */
  headInject?: string;
  /** 是否生成纯静态 HTML（无 JavaScript） */
  pureHTML?: boolean;
  /** 是否注入数据到 HTML（用于 Hydration，默认 false） */
  enableDataInjection?: boolean;
  /** 是否生成 sitemap.xml */
  generateSitemap?: boolean;
  /** 是否生成 robots.txt */
  generateRobots?: boolean;
  /** 每生成一个文件时回调（用于构建时实时输出进度，避免大量路由时长时间无输出） */
  onFileGenerated?: (filePath: string) => void;
  /** 是否启用详细调试日志（默认：false） */
  debug?: boolean;
  /** 自定义选项 */
  options?: Record<string, unknown>;
}

/**
 * 渲染结果
 */
export interface RenderResult {
  /** 渲染的 HTML 字符串 */
  html: string;
  /** 提取的样式（如果有） */
  styles?: string[];
  /** 提取的脚本（如果有） */
  scripts?: string[];
  /** 渲染信息（模板引擎特定，如使用的引擎、是否流式渲染等） */
  renderInfo?: Record<string, unknown>;
  /** 合并后的元数据（用于生成 HTML meta 标签） */
  metadata?: Metadata;
  /** 布局的 load 方法返回的数据 */
  layoutData?: ServerData;
  /** 页面的 load 方法返回的数据 */
  pageData?: ServerData;
  /** 性能指标（如果启用了性能监控） */
  performance?: PerformanceMetrics;
  /** 是否使用了缓存 */
  fromCache?: boolean;
  /** 压缩后的数据大小（如果启用了压缩） */
  compressedSize?: number;
  /** 原始数据大小（如果启用了压缩） */
  originalSize?: number;
}

// 注意：CSRRenderResult 已移至 @dreamer/render/client
