/**
 * 错误处理工具函数
 *
 * 用于统一处理渲染过程中的错误
 */

import type { Engine, ErrorHandler } from "../types.ts";

/**
 * 处理渲染错误
 *
 * @param error 错误对象
 * @param context 错误上下文
 * @param errorHandler 错误处理选项
 * @returns 是否应该继续渲染（如果提供了 fallbackComponent，返回 true）
 */
export async function handleRenderError(
  error: unknown,
  context: {
    engine: Engine;
    component: unknown;
    phase: "ssr";
  },
  errorHandler?: ErrorHandler,
): Promise<boolean> {
  const err = error instanceof Error ? error : new Error(String(error));

  // 记录错误（如果启用）
  if (errorHandler?.logError !== false) {
    console.error(
      `[${context.engine}] ${context.phase.toUpperCase()} 渲染错误:`,
      err,
    );
  }

  // 调用错误处理函数
  if (errorHandler?.onError) {
    try {
      await errorHandler.onError(err, context);
    } catch (handlerError) {
      console.error("错误处理函数执行失败:", handlerError);
    }
  }

  // 如果有降级组件，返回 true 表示应该继续渲染
  return errorHandler?.fallbackComponent !== undefined;
}

/**
 * 生成错误降级 HTML
 *
 * @param error 错误对象
 * @param fallbackComponent 降级组件（可选）
 * @returns 错误 HTML 字符串
 */
export function generateErrorHTML(
  error: Error,
  fallbackComponent?: unknown,
): string {
  if (fallbackComponent) {
    // 如果有降级组件，返回占位符（实际渲染由适配器处理）
    return "<!--error-boundary-fallback-->";
  }

  // 默认错误页面
  return `
    <div style="padding: 20px; font-family: sans-serif;">
      <h1>渲染错误</h1>
      <p>${error.message}</p>
      <pre style="background: #f5f5f5; padding: 10px; overflow: auto;">${
    error.stack || ""
  }</pre>
    </div>
  `;
}
