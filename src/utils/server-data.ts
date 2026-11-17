/**
 * Server data utilities: extract load function and call it.
 *
 * @packageDocumentation
 */

import { $tr } from "../i18n.ts";
import type { LoadContext, LoadFunction, ServerData } from "../types.ts";

/**
 * Extract load function from component (direct or default.load).
 *
 * @param component - Component (function or object with default)
 * @returns load function or null
 */
export function extractLoadFunction(component: unknown): LoadFunction | null {
  if (component === null || component === undefined) {
    return null;
  }

  const comp = component as Record<string, unknown>;

  if ("load" in comp && typeof comp.load === "function") {
    return comp.load as LoadFunction;
  }

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
 * Call load function to get server data; on error log and return null.
 *
 * @param loadFn - load function or null
 * @param context - Load context
 * @returns Server data or null
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
    console.error($tr("error.loadFailed"), error);
    return null;
  }
}
