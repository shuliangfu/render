/**
 * Context API 工具函数
 *
 * 用于支持通过 Context API 动态设置元数据和数据
 */

import type { ContextData, Metadata, ServerData } from "../types.ts";

/**
 * 合并 Context 数据到元数据
 *
 * @param metadata 原始元数据
 * @param contextData Context 数据
 * @returns 合并后的元数据
 */
export function mergeContextMetadata(
  metadata: Metadata,
  contextData?: ContextData,
): Metadata {
  if (!contextData?.metadata) {
    return metadata;
  }

  // 深度合并（Context 数据优先级更高）
  // 将 Metadata 转换为 Record<string, unknown> 以兼容 deepMerge
  return deepMerge(
    metadata as Record<string, unknown>,
    contextData.metadata as Record<string, unknown>,
  ) as Metadata;
}

/**
 * 合并 Context 数据到服务端数据
 *
 * @param serverData 原始服务端数据
 * @param contextData Context 数据
 * @returns 合并后的服务端数据
 */
export function mergeContextServerData(
  serverData: ServerData,
  contextData?: ContextData,
): ServerData {
  if (!contextData?.serverData) {
    return serverData;
  }

  // 深度合并（Context 数据优先级更高）
  return deepMerge(
    serverData as Record<string, unknown>,
    contextData.serverData as Record<string, unknown>,
  ) as ServerData;
}

/**
 * 深度合并对象
 *
 * @param target 目标对象
 * @param source 源对象
 * @returns 合并后的对象
 */
function deepMerge<T extends Record<string, unknown>>(
  target: T,
  source: Partial<T>,
): T {
  const result: Record<string, unknown> = { ...target };

  for (const [key, value] of Object.entries(source)) {
    if (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      typeof result[key] === "object" &&
      result[key] !== null &&
      !Array.isArray(result[key])
    ) {
      // 递归合并对象
      result[key] = deepMerge(
        result[key] as Record<string, unknown>,
        value as Record<string, unknown>,
      );
    } else {
      // 直接覆盖
      result[key] = value;
    }
  }

  return result as T;
}

/**
 * 创建 Context Provider（React）
 *
 * @param _contextData Context 数据
 * @returns Context Provider 组件（占位，实际实现由适配器处理）
 */
export function createContextProvider(_contextData?: ContextData): unknown {
  // 这是一个占位函数，实际的 Context Provider 应该在适配器中实现
  return null;
}
