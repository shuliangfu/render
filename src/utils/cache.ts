/**
 * 缓存工具函数
 *
 * 用于缓存元数据和其他渲染结果
 */

import type { CacheOptions, LoadContext, Metadata } from "../types.ts";

/** 默认最大缓存条目数，防止无界增长导致内存泄漏 */
const DEFAULT_MAX_CACHE_SIZE = 1000;

/**
 * 默认缓存存储（内存缓存）
 *
 * 限制：超过 maxSize 时移除最旧条目；get 时 lazy 删除过期项
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

    // 超过上限时移除最旧条目，防止内存泄漏
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
 * 生成缓存键
 *
 * @param context Load 上下文
 * @param prefix 键前缀
 * @returns 缓存键
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
 * 获取缓存值
 *
 * @param key 缓存键
 * @param options 缓存选项
 * @returns 缓存值，如果不存在或已过期则返回 null
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
 * 设置缓存值
 *
 * @param key 缓存键
 * @param value 缓存值
 * @param options 缓存选项
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
 * 删除缓存值
 *
 * @param key 缓存键
 * @param options 缓存选项
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
 * 缓存元数据
 *
 * @param context Load 上下文
 * @param metadata 元数据
 * @param options 缓存选项
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
 * 获取缓存的元数据
 *
 * @param context Load 上下文
 * @param options 缓存选项
 * @returns 缓存的元数据，如果不存在则返回 null
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
