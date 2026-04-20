/**
 * Metadata utilities: extract, resolve, merge, and generate meta tags.
 *
 * @packageDocumentation
 */

import type { LoadContext, Metadata, MetadataValue } from "../types.ts";

/**
 * 标记由 {@link generateMetaTags} 注入的路由级 `<title>` / `<meta>`。
 * Hybrid 客户端导航时应先移除带该属性的节点再插入新路由的 meta HTML，避免 og/twitter 与多条 description 残留。
 */
export const DWEB_ROUTE_META_ATTR = 'data-dweb-route-meta="1"';

/**
 * 生成带路由 meta 标记的 `<title>`（content 须已 HTML 转义）。
 *
 * @param escapedInner - 已转义的标题文本
 */
function metaTitleTagged(escapedInner: string): string {
  return `<title ${DWEB_ROUTE_META_ATTR}>${escapedInner}</title>`;
}

/**
 * 生成带路由 meta 标记的自闭合 `<meta ... />`（属性片段须已正确转义）。
 *
 * @param metaInner - name/property/content 等属性字符串（不含外层尖括号）
 */
function metaSelfClosingTagged(metaInner: string): string {
  return `<meta ${metaInner} ${DWEB_ROUTE_META_ATTR} />`;
}

/**
 * Extract metadata from component (static object, sync function, or async function).
 *
 * @param component - Component (function or object with default)
 * @returns Metadata value or null
 */
export function extractMetadata(component: unknown): MetadataValue | null {
  if (component === null || component === undefined) {
    return null;
  }

  const comp = component as Record<string, unknown>;

  if ("metadata" in comp) {
    const metadata = comp.metadata;
    if (typeof metadata === "object" && metadata !== null) {
      return metadata as Metadata;
    }
    if (typeof metadata === "function") {
      return metadata as
        | ((context: LoadContext) => Metadata)
        | ((context: LoadContext) => Promise<Metadata>);
    }
  }

  if (
    "default" in comp && typeof comp.default === "object" &&
    comp.default !== null
  ) {
    const defaultComp = comp.default as Record<string, unknown>;
    if ("metadata" in defaultComp) {
      const metadata = defaultComp.metadata;
      if (typeof metadata === "object" && metadata !== null) {
        return metadata as Metadata;
      }
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
 * Resolve metadata: call if function, return if object.
 *
 * @param metadata - Metadata value or null
 * @param context - Load context
 * @returns Resolved metadata or null
 */
export async function resolveMetadata(
  metadata: MetadataValue | null,
  context: LoadContext,
): Promise<Metadata | null> {
  if (!metadata) {
    return null;
  }

  if (typeof metadata === "function") {
    return await metadata(context);
  }

  return metadata;
}

/** Escape HTML special characters. */
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
 * Merge metadata: layouts outer-to-inner, then page (page wins); deep merge.
 *
 * @param layoutMetadataList - Layout metadata (outer to inner)
 * @param pageMetadata - Page metadata
 * @returns Merged metadata
 */
export function mergeMetadata(
  layoutMetadataList: Metadata[],
  pageMetadata: Metadata | null,
): Metadata {
  let merged: Metadata = {};
  for (const layoutMeta of layoutMetadataList) {
    merged = deepMerge(merged, layoutMeta);
  }

  if (pageMetadata) {
    merged = deepMerge(merged, pageMetadata);
  }

  return merged;
}

/**
 * Deep merge two metadata objects (source wins).
 *
 * @param target - Base metadata
 * @param source - Overrides
 * @returns Merged metadata
 */
function deepMerge(target: Metadata, source: Metadata): Metadata {
  const result = { ...target };

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
 * 仅生成路由级 `<meta>`（不含 `<title>`），供 SSR 与客户端分两步注入，保证 DOM 中 `<title>` 永远紧跟整组 meta 之后。
 *
 * @param metadata - Page metadata
 */
export function generateRouteMetaTagsWithoutTitle(metadata: Metadata): string {
  const tags: string[] = [];
  appendMetadataMetaTagsOnly(tags, metadata);
  return tags.join("\n  ");
}

/**
 * 仅生成带标记的 `<title>...</title>`；无 title 时返回空串。
 *
 * @param metadata - Page metadata
 */
export function generateRouteTitleTag(metadata: Metadata): string {
  if (!metadata.title) return "";
  return metaTitleTagged(escapeHtml(metadata.title));
}

/**
 * 向 `tags` 追加除 `<title>` 外的全部路由级 `<meta>`（og/twitter/description 等）。
 *
 * @param tags - 输出数组
 * @param metadata - Page metadata
 */
function appendMetadataMetaTagsOnly(
  tags: string[],
  metadata: Metadata,
): void {
  if (metadata.title) {
    if (!metadata.og?.title) {
      tags.push(
        metaSelfClosingTagged(
          `property="og:title" content="${escapeHtml(metadata.title)}"`,
        ),
      );
    }
    if (!metadata.twitter?.title) {
      tags.push(
        metaSelfClosingTagged(
          `name="twitter:title" content="${escapeHtml(metadata.title)}"`,
        ),
      );
    }
  }

  if (metadata.description) {
    tags.push(
      metaSelfClosingTagged(
        `name="description" content="${escapeHtml(metadata.description)}"`,
      ),
    );
    if (!metadata.og?.description) {
      tags.push(
        metaSelfClosingTagged(
          `property="og:description" content="${
            escapeHtml(metadata.description)
          }"`,
        ),
      );
    }
    if (!metadata.twitter?.description) {
      tags.push(
        metaSelfClosingTagged(
          `name="twitter:description" content="${
            escapeHtml(metadata.description)
          }"`,
        ),
      );
    }
  }

  if (metadata.keywords) {
    tags.push(
      metaSelfClosingTagged(
        `name="keywords" content="${escapeHtml(metadata.keywords)}"`,
      ),
    );
  }

  if (metadata.author) {
    tags.push(
      metaSelfClosingTagged(
        `name="author" content="${escapeHtml(metadata.author)}"`,
      ),
    );
  }

  if (metadata.og) {
    if (metadata.og.title) {
      tags.push(
        metaSelfClosingTagged(
          `property="og:title" content="${escapeHtml(metadata.og.title)}"`,
        ),
      );
    }
    if (metadata.og.description) {
      tags.push(
        metaSelfClosingTagged(
          `property="og:description" content="${
            escapeHtml(metadata.og.description)
          }"`,
        ),
      );
    }
    if (metadata.og.image) {
      tags.push(
        metaSelfClosingTagged(
          `property="og:image" content="${escapeHtml(metadata.og.image)}"`,
        ),
      );
    }
    if (metadata.og.url) {
      tags.push(
        metaSelfClosingTagged(
          `property="og:url" content="${escapeHtml(metadata.og.url)}"`,
        ),
      );
    }
    if (metadata.og.type) {
      tags.push(
        metaSelfClosingTagged(
          `property="og:type" content="${escapeHtml(metadata.og.type)}"`,
        ),
      );
    }
  }

  if (metadata.twitter) {
    if (metadata.twitter.card) {
      tags.push(
        metaSelfClosingTagged(
          `name="twitter:card" content="${escapeHtml(metadata.twitter.card)}"`,
        ),
      );
    }
    if (metadata.twitter.title) {
      tags.push(
        metaSelfClosingTagged(
          `name="twitter:title" content="${
            escapeHtml(metadata.twitter.title)
          }"`,
        ),
      );
    }
    if (metadata.twitter.description) {
      tags.push(
        metaSelfClosingTagged(
          `name="twitter:description" content="${
            escapeHtml(metadata.twitter.description)
          }"`,
        ),
      );
    }
    if (metadata.twitter.image) {
      tags.push(
        metaSelfClosingTagged(
          `name="twitter:image" content="${
            escapeHtml(metadata.twitter.image)
          }"`,
        ),
      );
    }
  }

  if (metadata.custom) {
    for (const [key, value] of Object.entries(metadata.custom)) {
      tags.push(
        metaSelfClosingTagged(
          `name="${escapeHtml(key)}" content="${escapeHtml(value)}"`,
        ),
      );
    }
  }
}

/**
 * Generate meta tag HTML from metadata（`<meta>` 连续块 + 末尾 `<title>`，与 {@link generateRouteMetaTagsWithoutTitle} + {@link generateRouteTitleTag} 拼接结果一致）。
 *
 * @param metadata - Page metadata
 * @returns HTML string of meta tags
 */
export function generateMetaTags(metadata: Metadata): string {
  const meta = generateRouteMetaTagsWithoutTitle(metadata);
  const tit = generateRouteTitleTag(metadata);
  return [meta, tit].filter(Boolean).join("\n  ");
}
