/**
 * 元数据工具函数
 *
 * 用于提取、解析、合并和生成元数据
 */

import type { LoadContext, Metadata, MetadataValue } from "../types.ts";

/**
 * 从组件中提取 metadata（可能是静态对象、同步函数或异步函数）
 *
 * @param component 组件对象
 * @returns metadata 值（可能是对象或函数），如果不存在则返回 null
 */
export function extractMetadata(component: unknown): MetadataValue | null {
  // 支持函数组件和对象组件
  if (component === null || component === undefined) {
    return null;
  }

  // 将组件转换为可访问属性的对象
  const comp = component as Record<string, unknown>;

  // 方式 1：直接导出（可能是对象、同步函数或异步函数）
  if ("metadata" in comp) {
    const metadata = comp.metadata;
    // 静态对象
    if (typeof metadata === "object" && metadata !== null) {
      return metadata as Metadata;
    }
    // 同步函数或异步函数
    if (typeof metadata === "function") {
      return metadata as
        | ((context: LoadContext) => Metadata)
        | ((context: LoadContext) => Promise<Metadata>);
    }
  }

  // 方式 2：default export 的对象中有 metadata
  if (
    "default" in comp && typeof comp.default === "object" &&
    comp.default !== null
  ) {
    const defaultComp = comp.default as Record<string, unknown>;
    if ("metadata" in defaultComp) {
      const metadata = defaultComp.metadata;
      // 静态对象
      if (typeof metadata === "object" && metadata !== null) {
        return metadata as Metadata;
      }
      // 同步函数或异步函数
      if (typeof metadata === "function") {
        return metadata as
          | ((context: LoadContext) => Metadata)
          | ((context: LoadContext) => Promise<Metadata>);
      }
    }
  }

  return null;
}

/**
 * 解析 metadata（如果是函数则调用，如果是对象则直接返回）
 *
 * @param metadata metadata 值（可能是对象或函数）
 * @param context Load 上下文
 * @returns 解析后的元数据，如果不存在则返回 null
 */
export async function resolveMetadata(
  metadata: MetadataValue | null,
  context: LoadContext,
): Promise<Metadata | null> {
  if (!metadata) {
    return null;
  }

  // 如果是函数，调用函数获取元数据
  if (typeof metadata === "function") {
    return await metadata(context);
  }

  // 如果是对象，直接返回
  return metadata;
}

/**
 * HTML 转义函数
 *
 * @param text 要转义的文本
 * @returns 转义后的文本
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * 合并元数据（页面覆盖布局，深度合并）
 *
 * @param layoutMetadataList 布局元数据列表（从外到内）
 * @param pageMetadata 页面元数据
 * @returns 合并后的元数据
 */
export function mergeMetadata(
  layoutMetadataList: Metadata[],
  pageMetadata: Metadata | null,
): Metadata {
  // 从外到内合并布局元数据
  let merged: Metadata = {};
  for (const layoutMeta of layoutMetadataList) {
    merged = deepMerge(merged, layoutMeta);
  }

  // 页面元数据覆盖布局元数据
  if (pageMetadata) {
    merged = deepMerge(merged, pageMetadata);
  }

  return merged;
}

/**
 * 深度合并两个对象（用于合并元数据）
 *
 * @param target 目标对象
 * @param source 源对象
 * @returns 合并后的对象
 */
function deepMerge(target: Metadata, source: Metadata): Metadata {
  const result = { ...target };

  // 浅层字段：直接覆盖
  if (source.title !== undefined) {
    result.title = source.title;
  }
  if (source.description !== undefined) {
    result.description = source.description;
  }
  if (source.keywords !== undefined) {
    result.keywords = source.keywords;
  }
  if (source.author !== undefined) {
    result.author = source.author;
  }

  // 深层对象：深度合并
  if (source.og) {
    result.og = {
      ...target.og,
      ...source.og,
    };
  } else if (target.og) {
    result.og = { ...target.og };
  }

  if (source.twitter) {
    result.twitter = {
      ...target.twitter,
      ...source.twitter,
    };
  } else if (target.twitter) {
    result.twitter = { ...target.twitter };
  }

  // 自定义标签：合并
  if (source.custom) {
    result.custom = {
      ...target.custom,
      ...source.custom,
    };
  } else if (target.custom) {
    result.custom = { ...target.custom };
  }

  return result;
}

/**
 * 生成 meta 标签 HTML
 *
 * @param metadata 页面元数据
 * @returns meta 标签 HTML 字符串
 */
export function generateMetaTags(metadata: Metadata): string {
  const tags: string[] = [];

  // 标题
  if (metadata.title) {
    tags.push(`<title>${escapeHtml(metadata.title)}</title>`);
    // Open Graph 标题（如果没有单独设置）
    if (!metadata.og?.title) {
      tags.push(
        `<meta property="og:title" content="${escapeHtml(metadata.title)}" />`,
      );
    }
    // Twitter Card 标题（如果没有单独设置）
    if (!metadata.twitter?.title) {
      tags.push(
        `<meta name="twitter:title" content="${escapeHtml(metadata.title)}" />`,
      );
    }
  }

  // 描述
  if (metadata.description) {
    tags.push(
      `<meta name="description" content="${
        escapeHtml(metadata.description)
      }" />`,
    );
    // Open Graph 描述（如果没有单独设置）
    if (!metadata.og?.description) {
      tags.push(
        `<meta property="og:description" content="${
          escapeHtml(metadata.description)
        }" />`,
      );
    }
    // Twitter Card 描述（如果没有单独设置）
    if (!metadata.twitter?.description) {
      tags.push(
        `<meta name="twitter:description" content="${
          escapeHtml(metadata.description)
        }" />`,
      );
    }
  }

  // 关键词
  if (metadata.keywords) {
    tags.push(
      `<meta name="keywords" content="${escapeHtml(metadata.keywords)}" />`,
    );
  }

  // 作者
  if (metadata.author) {
    tags.push(
      `<meta name="author" content="${escapeHtml(metadata.author)}" />`,
    );
  }

  // Open Graph 元数据
  if (metadata.og) {
    if (metadata.og.title) {
      tags.push(
        `<meta property="og:title" content="${
          escapeHtml(metadata.og.title)
        }" />`,
      );
    }
    if (metadata.og.description) {
      tags.push(
        `<meta property="og:description" content="${
          escapeHtml(metadata.og.description)
        }" />`,
      );
    }
    if (metadata.og.image) {
      tags.push(
        `<meta property="og:image" content="${
          escapeHtml(metadata.og.image)
        }" />`,
      );
    }
    if (metadata.og.url) {
      tags.push(
        `<meta property="og:url" content="${escapeHtml(metadata.og.url)}" />`,
      );
    }
    if (metadata.og.type) {
      tags.push(
        `<meta property="og:type" content="${escapeHtml(metadata.og.type)}" />`,
      );
    }
  }

  // Twitter Card 元数据
  if (metadata.twitter) {
    if (metadata.twitter.card) {
      tags.push(
        `<meta name="twitter:card" content="${
          escapeHtml(metadata.twitter.card)
        }" />`,
      );
    }
    if (metadata.twitter.title) {
      tags.push(
        `<meta name="twitter:title" content="${
          escapeHtml(metadata.twitter.title)
        }" />`,
      );
    }
    if (metadata.twitter.description) {
      tags.push(
        `<meta name="twitter:description" content="${
          escapeHtml(metadata.twitter.description)
        }" />`,
      );
    }
    if (metadata.twitter.image) {
      tags.push(
        `<meta name="twitter:image" content="${
          escapeHtml(metadata.twitter.image)
        }" />`,
      );
    }
  }

  // 自定义 meta 标签
  if (metadata.custom) {
    for (const [key, value] of Object.entries(metadata.custom)) {
      tags.push(
        `<meta name="${escapeHtml(key)}" content="${escapeHtml(value)}" />`,
      );
    }
  }

  return tags.join("\n  ");
}
