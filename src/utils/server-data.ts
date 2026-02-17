/**
 * Server data utilities: extract load function, call it, generate data script.
 *
 * @packageDocumentation
 */

import type {
  LoadContext,
  LoadFunction,
  Metadata,
  ServerData,
} from "../types.ts";

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
    console.error("Load function failed:", error);
    return null;
  }
}

/**
 * Generate data script that assigns window.__DATA__ with metadata, layout, page, route, etc.
 *
 * @param options - metadata, layoutData, pageData, route, url, params, etc.
 * @returns Script HTML string
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
  const data: Record<string, unknown> = {
    metadata: options.metadata,
    layout: options.layoutData,
    page: options.pageData,
  };

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

  const json = JSON.stringify(data);
  return `<script>window.__DATA__ = ${json};</script>`;
}
