/**
 * 服务端数据注入工具函数
 *
 * 用于提取、调用和生成数据注入脚本
 */

import type {
  LoadContext,
  LoadFunction,
  Metadata,
  ServerData,
} from "../types.ts";

/**
 * 从组件中提取 load 方法
 *
 * @param component 组件对象
 * @returns load 函数，如果不存在则返回 null
 */
export function extractLoadFunction(component: unknown): LoadFunction | null {
  // 支持函数组件和对象组件
  if (component === null || component === undefined) {
    return null;
  }

  const comp = component as Record<string, unknown>;

  // 方式 1：直接导出 load 函数
  if ("load" in comp && typeof comp.load === "function") {
    return comp.load as LoadFunction;
  }

  // 方式 2：default export 的对象中有 load 函数
  if (
    "default" in comp && typeof comp.default === "object" &&
    comp.default !== null
  ) {
    const defaultComp = comp.default as Record<string, unknown>;
    if ("load" in defaultComp && typeof defaultComp.load === "function") {
      return defaultComp.load as LoadFunction;
    }
  }

  return null;
}

/**
 * 调用 load 方法获取服务端数据
 *
 * @param loadFn load 函数
 * @param context Load 上下文
 * @returns 服务端数据，如果 loadFn 为 null 则返回 null
 */
export async function loadServerData(
  loadFn: LoadFunction | null,
  context: LoadContext,
): Promise<ServerData | null> {
  if (!loadFn) {
    return null;
  }

  try {
    const result = await loadFn(context);
    return result || null;
  } catch (error) {
    // 如果 load 方法出错，记录错误但不抛出（避免影响渲染）
    console.error("Load 方法执行失败:", error);
    return null;
  }
}

/**
 * 生成统一的数据注入脚本
 *
 * @param options 数据注入选项
 * @returns 数据注入脚本 HTML 字符串
 */
export function generateDataScript(options: {
  metadata: Metadata;
  layoutData: ServerData;
  pageData: ServerData;
  route?: string;
  url?: string;
  params?: Record<string, string>;
  layoutRoutes?: string[];
  pageRoute?: string;
  [key: string]: unknown;
}): string {
  // 构建统一的数据对象
  const data: Record<string, unknown> = {
    metadata: options.metadata,
    layout: options.layoutData,
    page: options.pageData,
  };

  // 添加路由和上下文信息
  if (options.route !== undefined) {
    data.route = options.route;
  }
  if (options.url !== undefined) {
    data.url = options.url;
  }
  if (options.params !== undefined) {
    data.params = options.params;
  }
  if (options.layoutRoutes !== undefined) {
    data.layoutRoutes = options.layoutRoutes;
  }
  if (options.pageRoute !== undefined) {
    data.pageRoute = options.pageRoute;
  }

  // 添加其他上下文信息（排除已处理的字段）
  const excludedKeys = [
    "metadata",
    "layoutData",
    "pageData",
    "route",
    "url",
    "params",
    "layoutRoutes",
    "pageRoute",
  ];
  for (const [key, value] of Object.entries(options)) {
    if (!excludedKeys.includes(key)) {
      data[key] = value;
    }
  }

  // 将数据序列化为 JSON（使用 JSON.stringify，浏览器会自动处理 XSS）
  const json = JSON.stringify(data);

  // 生成脚本标签
  return `<script>window.__DATA__ = ${json};</script>`;
}
