/**
 * 客户端元数据 DOM 操作工具
 *
 * 用于在客户端渲染时动态更新 meta 标签和 title
 */

import type { Metadata } from "../types.ts";

/**
 * 更新页面标题
 *
 * @param title 页面标题
 */
export function updateTitle(title: string): void {
  if (typeof globalThis.document === "undefined") {
    return;
  }
  globalThis.document.title = title;
}

/**
 * 更新或创建 meta 标签
 *
 * @param nameOrProperty meta 标签的 name 或 property 属性
 * @param content meta 标签的 content 值
 * @param isProperty 是否为 property 属性（用于 Open Graph 等）
 */
export function updateMetaTag(
  nameOrProperty: string,
  content: string,
  isProperty = false,
): void {
  if (typeof globalThis.document === "undefined") {
    return;
  }

  const selector = isProperty
    ? `meta[property="${nameOrProperty}"]`
    : `meta[name="${nameOrProperty}"]`;

  let meta = globalThis.document.querySelector(selector) as HTMLMetaElement;

  if (!meta) {
    // 如果不存在，创建新的 meta 标签
    meta = globalThis.document.createElement("meta");
    if (isProperty) {
      meta.setAttribute("property", nameOrProperty);
    } else {
      meta.setAttribute("name", nameOrProperty);
    }
    // 查找最后一个 meta 标签，在其后插入（保持集中）
    const head = globalThis.document.head;
    const existingMetas = head.querySelectorAll("meta");
    if (existingMetas.length > 0) {
      // 在最后一个 meta 标签后插入
      const lastMeta = existingMetas[existingMetas.length - 1];
      head.insertBefore(meta, lastMeta.nextSibling);
    } else {
      // 如果没有 meta 标签，在 head 开头插入
      head.insertBefore(meta, head.firstChild);
    }
  }

  meta.setAttribute("content", content);
}

/**
 * 删除 meta 标签
 *
 * @param nameOrProperty meta 标签的 name 或 property 属性
 * @param isProperty 是否为 property 属性
 */
export function removeMetaTag(
  nameOrProperty: string,
  isProperty = false,
): void {
  if (typeof globalThis.document === "undefined") {
    return;
  }

  const selector = isProperty
    ? `meta[property="${nameOrProperty}"]`
    : `meta[name="${nameOrProperty}"]`;

  const meta = globalThis.document.querySelector(selector);
  if (meta) {
    meta.remove();
  }
}

/**
 * 应用元数据到 DOM
 *
 * 根据元数据对象，更新或创建对应的 meta 标签和 title
 * meta 标签会集中在一起（在最后一个 meta 标签后追加）
 *
 * @param metadata 页面元数据
 */
export function applyMetadata(metadata: Metadata): void {
  if (typeof globalThis.document === "undefined") {
    return;
  }

  // 更新标题
  if (metadata.title) {
    updateTitle(metadata.title);
  }

  // 更新描述
  if (metadata.description) {
    updateMetaTag("description", metadata.description);
    // Open Graph 描述（如果没有单独设置）
    if (!metadata.og?.description) {
      updateMetaTag("og:description", metadata.description, true);
    }
    // Twitter Card 描述（如果没有单独设置）
    if (!metadata.twitter?.description) {
      updateMetaTag("twitter:description", metadata.description);
    }
  }

  // 更新关键词
  if (metadata.keywords) {
    updateMetaTag("keywords", metadata.keywords);
  }

  // 更新作者
  if (metadata.author) {
    updateMetaTag("author", metadata.author);
  }

  // Open Graph 元数据
  if (metadata.og) {
    if (metadata.og.title) {
      updateMetaTag("og:title", metadata.og.title, true);
    }
    if (metadata.og.description) {
      updateMetaTag("og:description", metadata.og.description, true);
    }
    if (metadata.og.image) {
      updateMetaTag("og:image", metadata.og.image, true);
    }
    if (metadata.og.url) {
      updateMetaTag("og:url", metadata.og.url, true);
    }
    if (metadata.og.type) {
      updateMetaTag("og:type", metadata.og.type, true);
    }
  }

  // Twitter Card 元数据
  if (metadata.twitter) {
    if (metadata.twitter.card) {
      updateMetaTag("twitter:card", metadata.twitter.card);
    }
    if (metadata.twitter.title) {
      updateMetaTag("twitter:title", metadata.twitter.title);
    }
    if (metadata.twitter.description) {
      updateMetaTag("twitter:description", metadata.twitter.description);
    }
    if (metadata.twitter.image) {
      updateMetaTag("twitter:image", metadata.twitter.image);
    }
  }

  // 自定义 meta 标签
  if (metadata.custom) {
    for (const [key, value] of Object.entries(metadata.custom)) {
      updateMetaTag(key, value);
    }
  }
}
