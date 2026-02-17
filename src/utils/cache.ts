/**
 * Cache utilities for metadata and render results.
 *
 * @packageDocumentation
 */

import type { CacheOptions, LoadContext, Metadata } from "../types.ts";

/** Default max cache entries to avoid unbounded growth. */
const DEFAULT_MAX_CACHE_SIZE = 1000;

/**
 * Default in-memory cache storage.
 * Evicts oldest when over maxSize; lazy-deletes expired on get.
 */
class MemoryCache {
  private cache = new Map<string, { value: unknown; expires: number }>();
  private readonly maxSize: number;

  constructor(maxSize = DEFAULT_MAX_CACHE_SIZE) {
    this.maxSize = maxSize;
  }

  get(key: string): unknown | null {
    const item = this.cache.get(key);
    if (!item) {
      return null;
    }

    if (item.expires > 0 && Date.now() > item.expires) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  set(key: string, value: unknown, ttl?: number): void {
    const expires = ttl ? Date.now() + ttl : 0;
    this.cache.set(key, { value, expires });

    // Evict oldest when over limit
    if (this.cache.size > this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) this.cache.delete(firstKey);
    }
  }

  delete(key: string): void {
    this.cache.delete(key);
  }
}

/**
 * Generate cache key from Load context.
 *
 * @param context - Load context (url, params, etc.)
 * @param prefix - Key prefix (default "render")
 * @returns Cache key string
 */
export function generateCacheKey(
  context: LoadContext,
  prefix: string = "render",
): string {
  const url = context.url || "/";
  const params = context.params || {};
  const paramsStr = Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("&");

  return `${prefix}:${url}${paramsStr ? `?${paramsStr}` : ""}`;
}

/**
 * Get cached value by key and options.
 *
 * @param key - Cache key
 * @param options - Optional cache options (enabled, storage, ttl, getCacheKey)
 * @returns Cached value, or null if disabled/miss/expired
 */
export async function getCache(
  key: string,
  options?: CacheOptions,
): Promise<unknown | null> {
  if (!options?.enabled) {
    return null;
  }

  const storage = options.storage || new MemoryCache();

  if (typeof storage.get === "function") {
    const result = storage.get(key);
    return result instanceof Promise ? await result : result;
  }

  return null;
}

/**
 * Set value in cache.
 *
 * @param key - Cache key
 * @param value - Value to cache
 * @param options - Optional cache options
 */
export async function setCache(
  key: string,
  value: unknown,
  options?: CacheOptions,
): Promise<void> {
  if (!options?.enabled) {
    return;
  }

  const storage = options.storage || new MemoryCache();

  if (typeof storage.set === "function") {
    const result = storage.set(key, value, options.ttl);
    if (result instanceof Promise) {
      await result;
    }
  }
}

/**
 * Delete cache entry by key.
 *
 * @param key - Cache key
 * @param options - Optional cache options
 */
export async function deleteCache(
  key: string,
  options?: CacheOptions,
): Promise<void> {
  if (!options?.enabled) {
    return;
  }

  const storage = options.storage || new MemoryCache();

  if (typeof storage.delete === "function") {
    const result = storage.delete(key);
    if (result instanceof Promise) {
      await result;
    }
  }
}

/**
 * Cache metadata by context.
 *
 * @param context - Load context (for cache key)
 * @param metadata - Metadata to cache
 * @param options - Optional cache options
 */
export async function cacheMetadata(
  context: LoadContext,
  metadata: Metadata,
  options?: CacheOptions,
): Promise<void> {
  if (!options?.enabled) {
    return;
  }

  const key = options.getCacheKey
    ? options.getCacheKey(context)
    : generateCacheKey(context, "metadata");

  await setCache(key, metadata, options);
}

/**
 * Get cached metadata by Load context and cache options.
 *
 * @param context - Load context (for cache key)
 * @param options - Optional cache options
 * @returns Cached metadata, or null if disabled or miss
 */
export async function getCachedMetadata(
  context: LoadContext,
  options?: CacheOptions,
): Promise<Metadata | null> {
  if (!options?.enabled) {
    return null;
  }

  const key = options.getCacheKey
    ? options.getCacheKey(context)
    : generateCacheKey(context, "metadata");

  const cached = await getCache(key, options);
  return cached as Metadata | null;
}
