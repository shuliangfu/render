/**
 * Error handling utilities for render (SSR/CSR).
 *
 * @packageDocumentation
 */

import type { Engine, ErrorHandler } from "../types.ts";

/**
 * Handle render error: log, call onError, return whether to use fallback.
 *
 * @param error - Error
 * @param context - Engine, component, phase
 * @param errorHandler - Optional handler
 * @returns true if fallbackComponent is defined (caller may render fallback)
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

  if (errorHandler?.logError !== false) {
    console.error(
      `[${context.engine}] ${context.phase.toUpperCase()} render error:`,
      err,
    );
  }

  if (errorHandler?.onError) {
    try {
      await errorHandler.onError(err, context);
    } catch (handlerError) {
      console.error("Error handler failed:", handlerError);
    }
  }

  return errorHandler?.fallbackComponent !== undefined;
}

/**
 * Generate error fallback HTML.
 *
 * @param error - Error
 * @param fallbackComponent - If set, returns placeholder; adapter renders fallback
 * @returns Error HTML string
 */
export function generateErrorHTML(
  error: Error,
  fallbackComponent?: unknown,
): string {
  if (fallbackComponent) {
    return "<!--error-boundary-fallback-->";
  }

  return `
    <div style="padding: 20px; font-family: sans-serif;">
      <h1>Render Error</h1>
      <p>${error.message}</p>
      <pre style="background: #f5f5f5; padding: 10px; overflow: auto;">${
    error.stack || ""
  }</pre>
    </div>
  `;
}
