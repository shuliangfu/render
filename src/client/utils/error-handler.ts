/**
 * 客户端错误处理工具
 *
 * 提供统一的错误处理机制
 */

import type { Engine, ErrorHandler } from "../types.ts";

/**
 * 错误上下文
 */
export interface ErrorContext {
  /** 引擎类型 */
  engine: Engine;
  /** 组件 */
  component: unknown;
  /** 渲染阶段 */
  phase: "csr" | "hydrate";
}

/**
 * 处理渲染错误
 *
 * @param error 错误对象
 * @param context 错误上下文
 * @param handler 错误处理选项
 * @returns 是否应该继续渲染（使用降级组件）
 */
export async function handleRenderError(
  error: unknown,
  context: ErrorContext,
  handler?: ErrorHandler,
): Promise<boolean> {
  const err = error instanceof Error ? error : new Error(String(error));

  // 是否在控制台输出错误（默认：true）
  const shouldLog = handler?.logError !== false;

  if (shouldLog) {
    console.error(
      `[Render Error] ${context.phase.toUpperCase()} 渲染失败 (${context.engine}):`,
      err,
    );
  }

  // 调用自定义错误处理函数
  if (handler?.onError) {
    try {
      await handler.onError(err, context);
    } catch (handlerError) {
      console.error("[Render Error] 错误处理函数执行失败:", handlerError);
    }
  }

  // 是否有降级组件
  return !!handler?.fallbackComponent;
}

/**
 * 渲染错误降级 UI
 *
 * 在容器中显示友好的错误提示
 *
 * @param container 容器元素
 * @param error 错误对象
 * @param phase 渲染阶段
 */
export function renderErrorFallback(
  container: HTMLElement,
  error: Error,
  phase: "csr" | "hydrate",
): void {
  const phaseText = phase === "csr" ? "渲染" : "水合";
  container.innerHTML = `
    <div style="
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      min-height: 200px;
      padding: 24px;
      font-family: system-ui, -apple-system, sans-serif;
      color: #333;
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 8px;
      margin: 16px;
    ">
      <div style="font-size: 24px; margin-bottom: 8px;">⚠️</div>
      <h3 style="margin: 0 0 8px; font-size: 16px; color: #dc2626;">
        ${phaseText}出错
      </h3>
      <p style="margin: 0; font-size: 14px; color: #666; text-align: center; max-width: 400px;">
        ${escapeHtml(error.message)}
      </p>
      <button
        type="button"
        onclick="location.reload()"
        style="
          margin-top: 16px;
          padding: 8px 16px;
          background: #dc2626;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
        "
      >
        重新加载
      </button>
    </div>
  `;
}

/**
 * 转义 HTML 特殊字符
 *
 * @param str 原始字符串
 * @returns 转义后的字符串
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
