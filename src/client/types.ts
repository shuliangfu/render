/**
 * 客户端渲染类型定义
 *
 * 提供浏览器端渲染所需的完整类型定义
 */

/**
 * 模板引擎类型
 */
export type Engine = "react" | "preact";

/**
 * 布局组件配置
 */
export interface LayoutComponent {
  /** 布局组件 */
  component: unknown;
  /** 布局属性 */
  props?: Record<string, unknown>;
}

/**
 * 错误处理选项
 */
export interface ErrorHandler {
  /**
   * 错误处理函数
   * @param error 错误对象
   * @param context 错误上下文
   */
  onError?: (error: Error, context: {
    engine: Engine;
    component: unknown;
    phase: "csr" | "hydrate";
  }) => void | Promise<void>;
  /** 错误降级组件（用于渲染错误时显示） */
  fallbackComponent?: unknown;
  /** 是否在控制台输出错误（默认：true） */
  logError?: boolean;
}

/**
 * 性能监控选项
 */
export interface PerformanceOptions {
  /** 是否启用性能监控（默认：false） */
  enabled?: boolean;
  /** 性能指标回调函数 */
  onMetrics?: (metrics: PerformanceMetrics) => void;
  /** 慢渲染阈值（毫秒，超过此值会触发警告，默认：100） */
  slowThreshold?: number;
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
  phase: "csr" | "hydrate";
  /** 是否为慢渲染 */
  isSlow?: boolean;
}

/**
 * CSR 渲染选项
 */
export interface CSROptions {
  /** 模板引擎 */
  engine: Engine;
  /** 页面组件 */
  component: unknown;
  /** 组件属性 */
  props?: Record<string, unknown>;
  /** 布局组件列表（从外到内） */
  layouts?: LayoutComponent[];
  /** 是否跳过布局 */
  skipLayouts?: boolean;
  /** 容器选择器或元素 */
  container: string | HTMLElement;
  /** 错误处理选项 */
  errorHandler?: ErrorHandler;
  /** 性能监控选项 */
  performance?: PerformanceOptions;
}

/**
 * CSR 渲染结果
 */
export interface CSRRenderResult {
  /** 卸载组件 */
  unmount: () => void;
  /** 更新组件属性 */
  update?: (props: Record<string, unknown>) => void;
  /** 组件实例（可选） */
  instance?: unknown;
  /** 性能指标（如果启用了性能监控） */
  performance?: PerformanceMetrics;
}

/**
 * Hydration 选项
 */
export interface HydrationOptions {
  /** 模板引擎 */
  engine: Engine;
  /** 页面组件 */
  component: unknown;
  /** 组件属性 */
  props?: Record<string, unknown>;
  /** 布局组件列表（从外到内） */
  layouts?: LayoutComponent[];
  /** 是否跳过布局 */
  skipLayouts?: boolean;
  /** 容器选择器或元素 */
  container: string | HTMLElement;
  /** 错误处理选项 */
  errorHandler?: ErrorHandler;
  /** 性能监控选项 */
  performance?: PerformanceOptions;
}
