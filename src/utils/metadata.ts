/**
 * Metadata utilities: extract, resolve, merge, and generate meta tags.
 *
 * @packageDocumentation
 */

import type { LoadContext, Metadata, MetadataValue } from "../types.ts";

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
 * Generate meta tag HTML from metadata.
 *
 * @param metadata - Page metadata
 * @returns HTML string of meta tags
 */
export function generateMetaTags(metadata: Metadata): string {
  const tags: string[] = [];

  if (metadata.title) {
    tags.push(`<title>${escapeHtml(metadata.title)}</title>`);
    if (!metadata.og?.title) {
      tags.push(
        `<meta property="og:title" content="${escapeHtml(metadata.title)}" />`,
      );
    }
    if (!metadata.twitter?.title) {
      tags.push(
        `<meta name="twitter:title" content="${escapeHtml(metadata.title)}" />`,
      );
    }
  }

  if (metadata.description) {
    tags.push(
      `<meta name="description" content="${
        escapeHtml(metadata.description)
      }" />`,
    );
    if (!metadata.og?.description) {
      tags.push(
        `<meta property="og:description" content="${
          escapeHtml(metadata.description)
        }" />`,
      );
    }
    if (!metadata.twitter?.description) {
      tags.push(
        `<meta name="twitter:description" content="${
          escapeHtml(metadata.description)
        }" />`,
      );
    }
  }

  if (metadata.keywords) {
    tags.push(
      `<meta name="keywords" content="${escapeHtml(metadata.keywords)}" />`,
    );
  }

  if (metadata.author) {
    tags.push(
      `<meta name="author" content="${escapeHtml(metadata.author)}" />`,
    );
  }

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

  if (metadata.custom) {
    for (const [key, value] of Object.entries(metadata.custom)) {
      tags.push(
        `<meta name="${escapeHtml(key)}" content="${escapeHtml(value)}" />`,
      );
    }
  }

  return tags.join("\n  ");
}
