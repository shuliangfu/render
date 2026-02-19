/**
 * Error handling utilities for render (SSR/CSR).
 *
 * @packageDocumentation
 */

import type { Engine, ErrorHandler } from "../types.ts";
import { $tr, type Locale } from "../i18n.ts";

/**
 * Handle render error: log, call onError, return whether to use fallback.
 *
 * @param error - Error
 * @param context - Engine, component, phase
 * @param errorHandler - Optional handler
 * @param lang - Optional locale for server-side i18n; omitted = auto-detect
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
  lang?: Locale,
): Promise<boolean> {
  const err = error instanceof Error ? error : new Error(String(error));

  if (errorHandler?.logError !== false) {
    console.error(
      $tr("log.renderError", {
        engine: context.engine,
        phase: context.phase.toUpperCase(),
      }, lang),
      err,
    );
  }

  if (errorHandler?.onError) {
    try {
      await errorHandler.onError(err, context);
    } catch (handlerError) {
      console.error($tr("error.handlerFailed", undefined, lang), handlerError);
    }
  }

  return errorHandler?.fallbackComponent !== undefined;
}

/**
 * Generate error fallback HTML.
 *
 * @param error - Error
 * @param fallbackComponent - If set, returns placeholder; adapter renders fallback
 * @param lang - Optional locale for server-side i18n; omitted = auto-detect
 * @returns Error HTML string
 */
export function generateErrorHTML(
  error: Error,
  fallbackComponent?: unknown,
  lang?: Locale,
): string {
  if (fallbackComponent) {
    return "<!--error-boundary-fallback-->";
  }

  const title = $tr("error.renderErrorTitle", undefined, lang);
  return `
    <div style="padding: 20px; font-family: sans-serif;">
      <h1>${title}</h1>
      <p>${error.message}</p>
      <pre style="background: #f5f5f5; padding: 10px; overflow: auto;">${
    error.stack || ""
  }</pre>
    </div>
  `;
}
