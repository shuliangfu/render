/**
 * HTML injection utilities: inject content into template at appropriate positions.
 * Same-type content is grouped (e.g. all meta tags together).
 *
 * @packageDocumentation
 */

/** Injection type for grouping. */
export type InjectType = "meta" | "script" | "data-script" | "component";

/** Options for injection. */
export interface InjectOptions {
  /** Type for grouping same-type content */
  type?: InjectType;
  /** Inject in head (default false = body) */
  inHead?: boolean;
  /** Custom placeholder to replace; if present, inject at this position */
  customPosition?: string;
}

/**
 * Find end index of the last tag with given name in head or body.
 *
 * @param html - Full HTML
 * @param tagName - e.g. "meta", "script"
 * @param inHead - Search in head (true) or body (false)
 * @returns End index of last tag, or -1
 */
function findLastTagPosition(
  html: string,
  tagName: string,
  inHead: boolean,
): number {
  const searchArea = inHead
    ? html.substring(
      0,
      html.indexOf("</head>") !== -1 ? html.indexOf("</head>") : html.length,
    )
    : html.substring(
      0,
      html.indexOf("</body>") !== -1 ? html.indexOf("</body>") : html.length,
    );

  const regex = new RegExp(`<${tagName}[^>]*>`, "gi");
  let lastIndex = -1;
  let match;

  while ((match = regex.exec(searchArea)) !== null) {
    lastIndex = match.index + match[0].length;
  }

  return lastIndex;
}

/**
 * Inject content into HTML at type-appropriate position.
 *
 * - meta: append after last meta in head
 * - data-script: append after last script in head
 * - script: append after last script in body
 * - component: replace <!--ssr-outlet--> if present
 *
 * @param html - Original HTML
 * @param content - Content to inject
 * @param options - Type, inHead, customPosition
 * @returns Modified HTML
 */
export function injectHtml(
  html: string,
  content: string,
  options: InjectOptions = {},
): string {
  if (!content) {
    return html;
  }

  const { type, inHead = false, customPosition } = options;

  if (customPosition && html.includes(customPosition)) {
    return html.replace(customPosition, content);
  }

  if (type === "meta" && inHead) {
    const lastMetaPos = findLastTagPosition(html, "meta", true);
    if (lastMetaPos !== -1) {
      const beforeMeta = html.slice(0, lastMetaPos);
      const afterMeta = html.slice(lastMetaPos);
      const newlineMatch = afterMeta.match(/^\s*\n/);
      const indent = newlineMatch ? newlineMatch[0] : "\n  ";
      return `${beforeMeta}${indent}${content}${afterMeta}`;
    }
    const headEndIndex = html.indexOf("</head>");
    if (headEndIndex !== -1) {
      const beforeHead = html.slice(0, headEndIndex);
      const afterHead = html.slice(headEndIndex);
      return `${beforeHead}\n  ${content}\n${afterHead}`;
    }
    const headStartIndex = html.indexOf("<head>");
    if (headStartIndex !== -1) {
      const beforeHead = html.slice(0, headStartIndex + 6);
      const afterHead = html.slice(headStartIndex + 6);
      return `${beforeHead}\n  ${content}\n${afterHead}`;
    }
    return `${content}\n${html}`;
  } else if (type === "data-script" && inHead) {
    const lastScriptPos = findLastTagPosition(html, "script", true);
    if (lastScriptPos !== -1) {
      const after = html.slice(lastScriptPos);
      const scriptEndMatch = after.match(/<\/script>/);
      if (scriptEndMatch) {
        const scriptEndPos = scriptEndMatch.index! + scriptEndMatch[0].length;
        const beforeScript = html.slice(0, lastScriptPos + scriptEndPos);
        const afterScript = html.slice(lastScriptPos + scriptEndPos);
        const newlineMatch = afterScript.match(/^\s*\n/);
        const indent = newlineMatch ? newlineMatch[0] : "\n  ";
        return `${beforeScript}${indent}${content}${afterScript}`;
      }
    }
    const headEndIndex = html.indexOf("</head>");
    if (headEndIndex !== -1) {
      const beforeHead = html.slice(0, headEndIndex);
      const afterHead = html.slice(headEndIndex);
      return `${beforeHead}\n  ${content}\n${afterHead}`;
    }
    const headStartIndex = html.indexOf("<head>");
    if (headStartIndex !== -1) {
      const beforeHead = html.slice(0, headStartIndex + 6);
      const afterHead = html.slice(headStartIndex + 6);
      return `${beforeHead}\n  ${content}\n${afterHead}`;
    }
    return `${content}\n${html}`;
  } else if (type === "script" && !inHead) {
    const lastScriptPos = findLastTagPosition(html, "script", false);
    if (lastScriptPos !== -1) {
      const after = html.slice(lastScriptPos);
      const scriptEndMatch = after.match(/<\/script>/);
      if (scriptEndMatch) {
        const scriptEndPos = scriptEndMatch.index! + scriptEndMatch[0].length;
        const beforeScript = html.slice(0, lastScriptPos + scriptEndPos);
        const afterScript = html.slice(lastScriptPos + scriptEndPos);
        const newlineMatch = afterScript.match(/^\s*\n/);
        const indent = newlineMatch ? newlineMatch[0] : "\n  ";
        return `${beforeScript}${indent}${content}${afterScript}`;
      }
    }
    const bodyEndIndex = html.indexOf("</body>");
    if (bodyEndIndex !== -1) {
      const beforeBody = html.slice(0, bodyEndIndex);
      const afterBody = html.slice(bodyEndIndex);
      return `${beforeBody}\n  ${content}\n${afterBody}`;
    }
    return `${html}\n${content}`;
  } else {
    if (inHead) {
      const headEndIndex = html.indexOf("</head>");
      if (headEndIndex !== -1) {
        const beforeHead = html.slice(0, headEndIndex);
        const afterHead = html.slice(headEndIndex);
        return `${beforeHead}\n  ${content}\n${afterHead}`;
      } else {
        const headStartIndex = html.indexOf("<head>");
        if (headStartIndex !== -1) {
          const beforeHead = html.slice(0, headStartIndex + 6);
          const afterHead = html.slice(headStartIndex + 6);
          return `${beforeHead}\n  ${content}\n${afterHead}`;
        } else {
          return `${content}\n${html}`;
        }
      }
    } else {
      const bodyEndIndex = html.indexOf("</body>");
      if (bodyEndIndex !== -1) {
        const beforeBody = html.slice(0, bodyEndIndex);
        const afterBody = html.slice(bodyEndIndex);
        return `${beforeBody}\n  ${content}\n${afterBody}`;
      } else {
        return `${html}\n${content}`;
      }
    }
  }
}

/**
 * Inject component HTML into template.
 * Prefer <!--ssr-outlet-->; otherwise inject into body.
 *
 * @param template - HTML template (optional)
 * @param componentHtml - Rendered component HTML
 * @returns Final HTML
 */
export function injectComponentHtml(
  template: string | undefined,
  componentHtml: string,
): string {
  if (!template) {
    return componentHtml;
  }

  if (template.includes("<!--ssr-outlet-->")) {
    return template.replace("<!--ssr-outlet-->", componentHtml);
  }

  const bodyStartIndex = template.indexOf("<body>");
  const bodyEndIndex = template.indexOf("</body>");

  if (bodyStartIndex !== -1 && bodyEndIndex !== -1) {
    const beforeBody = template.slice(0, bodyStartIndex + 6);
    const afterBody = template.slice(bodyEndIndex);
    return `${beforeBody}\n  ${componentHtml}\n${afterBody}`;
  } else if (bodyEndIndex !== -1) {
    const beforeBody = template.slice(0, bodyEndIndex);
    const afterBody = template.slice(bodyEndIndex);
    return `${beforeBody}\n  ${componentHtml}\n${afterBody}`;
  } else {
    return componentHtml;
  }
}

/**
 * Apply multiple injections in order; same-type content is grouped.
 *
 * @param html - Original HTML
 * @param injections - List of { content, options }
 * @returns Modified HTML
 */
export function injectMultiple(
  html: string,
  injections: Array<{ content: string; options?: InjectOptions }>,
): string {
  let result = html;
  for (const injection of injections) {
    if (injection.content) {
      result = injectHtml(result, injection.content, injection.options);
    }
  }
  return result;
}
