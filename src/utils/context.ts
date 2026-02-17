/**
 * Context API utilities: merge context metadata and server data.
 *
 * @packageDocumentation
 */

import type { ContextData, Metadata, ServerData } from "../types.ts";

/**
 * Merge context metadata into base metadata (context wins).
 *
 * @param metadata - Base metadata
 * @param contextData - Context data
 * @returns Merged metadata
 */
export function mergeContextMetadata(
  metadata: Metadata,
  contextData?: ContextData,
): Metadata {
  if (!contextData?.metadata) {
    return metadata;
  }

  return deepMerge(
    metadata as Record<string, unknown>,
    contextData.metadata as Record<string, unknown>,
  ) as Metadata;
}

/**
 * Merge context server data into base server data (context wins).
 *
 * @param serverData - Base server data
 * @param contextData - Context data
 * @returns Merged server data
 */
export function mergeContextServerData(
  serverData: ServerData,
  contextData?: ContextData,
): ServerData {
  if (!contextData?.serverData) {
    return serverData;
  }

  return deepMerge(
    serverData as Record<string, unknown>,
    contextData.serverData as Record<string, unknown>,
  ) as ServerData;
}

/**
 * Deep merge target with source (source wins on conflicts).
 *
 * @param target - Base object
 * @param source - Overrides
 * @returns Merged object
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
      result[key] = deepMerge(
        result[key] as Record<string, unknown>,
        value as Record<string, unknown>,
      );
    } else {
      result[key] = value;
    }
  }

  return result as T;
}

/**
 * Create Context Provider (placeholder; actual implementation in adapter).
 *
 * @param _contextData - Context data
 * @returns Placeholder (null); adapter provides real provider
 */
export function createContextProvider(_contextData?: ContextData): unknown {
  return null;
}
