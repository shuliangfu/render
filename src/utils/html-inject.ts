/**
 * HTML 注入工具函数
 *
 * 用于自动将内容注入到 HTML 模板的合适位置，无需手动添加插入点标签
 * 支持集中注入：相同类型的内容会集中在一起
 */

/**
 * 注入类型
 */
export type InjectType = "meta" | "script" | "data-script" | "component";

/**
 * 注入选项
 */
export interface InjectOptions {
  /** 注入类型（用于集中相同类型的内容） */
  type?: InjectType;
  /** 是否在 head 中注入（默认 false，在 body 中注入） */
  inHead?: boolean;
  /** 自定义插入位置（如果提供，将在此位置插入） */
  customPosition?: string;
}

/**
 * 查找最后一个指定标签的位置
 *
 * @param html HTML 内容
 * @param tagName 标签名（如 "meta", "script"）
 * @param inHead 是否在 head 中查找
 * @returns 最后一个标签的结束位置，如果没找到返回 -1
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

  // 使用正则表达式查找所有匹配的标签
  const regex = new RegExp(`<${tagName}[^>]*>`, "gi");
  let lastIndex = -1;
  let match;

  while ((match = regex.exec(searchArea)) !== null) {
    lastIndex = match.index + match[0].length;
  }

  return lastIndex;
}

/**
 * 自动注入内容到 HTML
 *
 * 根据内容类型和选项，自动将内容注入到 HTML 的合适位置：
 * - meta 标签：注入到 head 中，如果有其他 meta 标签，会在最后一个 meta 标签后追加
 * - 数据脚本：注入到 head 中，如果有其他数据脚本，会在最后一个数据脚本后追加
 * - 脚本标签：注入到 body 中，如果有其他 script 标签，会在最后一个 script 标签后追加
 * - 组件 HTML：如果有模板，替换 <!--ssr-outlet-->，否则直接返回
 *
 * @param html 原始 HTML
 * @param content 要注入的内容
 * @param options 注入选项
 * @returns 注入后的 HTML
 *
 * @example
 * ```typescript
 * // 注入 meta 标签到 head（会集中在一起）
 * const html = injectHtml(
 *   "<html><head><meta charset='utf-8'></head><body></body></html>",
 *   "<meta name='description' content='...' />",
 *   { type: "meta", inHead: true }
 * );
 *
 * // 注入脚本到 body（会集中在一起）
 * const html = injectHtml(
 *   "<html><body><script src='/app.js'></script></body></html>",
 *   "<script src='/other.js'></script>",
 *   { type: "script" }
 * );
 * ```
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

  // 如果指定了自定义位置，直接替换
  if (customPosition && html.includes(customPosition)) {
    return html.replace(customPosition, content);
  }

  // 根据类型决定注入策略
  if (type === "meta" && inHead) {
    // meta 标签：在 head 中查找最后一个 meta 标签，在其后追加
    const lastMetaPos = findLastTagPosition(html, "meta", true);
    if (lastMetaPos !== -1) {
      // 找到最后一个 meta 标签，在其后追加
      const beforeMeta = html.slice(0, lastMetaPos);
      const afterMeta = html.slice(lastMetaPos);
      // 查找换行符，保持格式
      const newlineMatch = afterMeta.match(/^\s*\n/);
      const indent = newlineMatch ? newlineMatch[0] : "\n  ";
      return `${beforeMeta}${indent}${content}${afterMeta}`;
    }
    // 没找到 meta 标签，在 </head> 之前注入
    const headEndIndex = html.indexOf("</head>");
    if (headEndIndex !== -1) {
      const beforeHead = html.slice(0, headEndIndex);
      const afterHead = html.slice(headEndIndex);
      return `${beforeHead}\n  ${content}\n${afterHead}`;
    }
    // 如果没有 </head> 标签，尝试在 <head> 之后注入
    const headStartIndex = html.indexOf("<head>");
    if (headStartIndex !== -1) {
      const beforeHead = html.slice(0, headStartIndex + 6);
      const afterHead = html.slice(headStartIndex + 6);
      return `${beforeHead}\n  ${content}\n${afterHead}`;
    }
    // 如果连 <head> 都没有，在开头注入
    return `${content}\n${html}`;
  } else if (type === "data-script" && inHead) {
    // 数据脚本：在 head 中查找最后一个 script 标签（数据脚本），在其后追加
    // 数据脚本通常是 <script>window.__DATA__ = ...</script> 格式
    const lastScriptPos = findLastTagPosition(html, "script", true);
    if (lastScriptPos !== -1) {
      // 找到最后一个 script 标签，在其后追加
      const after = html.slice(lastScriptPos);
      // 查找 script 标签的结束位置
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
    // 没找到 script 标签，在 </head> 之前注入
    const headEndIndex = html.indexOf("</head>");
    if (headEndIndex !== -1) {
      const beforeHead = html.slice(0, headEndIndex);
      const afterHead = html.slice(headEndIndex);
      return `${beforeHead}\n  ${content}\n${afterHead}`;
    }
    // 如果没有 </head> 标签，尝试在 <head> 之后注入
    const headStartIndex = html.indexOf("<head>");
    if (headStartIndex !== -1) {
      const beforeHead = html.slice(0, headStartIndex + 6);
      const afterHead = html.slice(headStartIndex + 6);
      return `${beforeHead}\n  ${content}\n${afterHead}`;
    }
    // 如果连 <head> 都没有，在开头注入
    return `${content}\n${html}`;
  } else if (type === "script" && !inHead) {
    // script 标签：在 body 中查找最后一个 script 标签，在其后追加
    const lastScriptPos = findLastTagPosition(html, "script", false);
    if (lastScriptPos !== -1) {
      // 找到最后一个 script 标签，在其后追加
      const after = html.slice(lastScriptPos);
      // 查找 script 标签的结束位置
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
    // 没找到 script 标签，在 </body> 之前注入
    const bodyEndIndex = html.indexOf("</body>");
    if (bodyEndIndex !== -1) {
      const beforeBody = html.slice(0, bodyEndIndex);
      const afterBody = html.slice(bodyEndIndex);
      return `${beforeBody}\n  ${content}\n${afterBody}`;
    }
    // 如果没有 </body> 标签，在末尾注入
    return `${html}\n${content}`;
  } else {
    // 其他情况：按照原来的逻辑注入
    if (inHead) {
      // 注入到 </head> 之前
      const headEndIndex = html.indexOf("</head>");
      if (headEndIndex !== -1) {
        const beforeHead = html.slice(0, headEndIndex);
        const afterHead = html.slice(headEndIndex);
        return `${beforeHead}\n  ${content}\n${afterHead}`;
      } else {
        // 如果没有 </head> 标签，尝试在 <head> 之后注入
        const headStartIndex = html.indexOf("<head>");
        if (headStartIndex !== -1) {
          const beforeHead = html.slice(0, headStartIndex + 6);
          const afterHead = html.slice(headStartIndex + 6);
          return `${beforeHead}\n  ${content}\n${afterHead}`;
        } else {
          // 如果连 <head> 都没有，在开头注入
          return `${content}\n${html}`;
        }
      }
    } else {
      // 注入到 </body> 之前
      const bodyEndIndex = html.indexOf("</body>");
      if (bodyEndIndex !== -1) {
        const beforeBody = html.slice(0, bodyEndIndex);
        const afterBody = html.slice(bodyEndIndex);
        return `${beforeBody}\n  ${content}\n${afterBody}`;
      } else {
        // 如果没有 </body> 标签，在末尾注入
        return `${html}\n${content}`;
      }
    }
  }
}

/**
 * 注入组件 HTML 到模板
 *
 * 如果提供了模板，会自动将组件 HTML 注入到模板中。
 * 优先查找 <!--ssr-outlet--> 标签，如果没有则尝试智能注入。
 *
 * @param template HTML 模板
 * @param componentHtml 组件渲染的 HTML
 * @returns 注入后的 HTML
 *
 * @example
 * ```typescript
 * // 有模板的情况
 * const html = injectComponentHtml(
 *   "<html><body><!--ssr-outlet--></body></html>",
 *   "<div>Hello</div>"
 * );
 * // => "<html><body><div>Hello</div></body></html>"
 *
 * // 没有模板的情况
 * const html = injectComponentHtml(
 *   undefined,
 *   "<div>Hello</div>"
 * );
 * // => "<div>Hello</div>"
 * ```
 */
export function injectComponentHtml(
  template: string | undefined,
  componentHtml: string,
): string {
  if (!template) {
    return componentHtml;
  }

  // 优先查找 <!--ssr-outlet--> 标签
  if (template.includes("<!--ssr-outlet-->")) {
    return template.replace("<!--ssr-outlet-->", componentHtml);
  }

  // 如果没有插入点，尝试智能注入到 body 中
  const bodyStartIndex = template.indexOf("<body>");
  const bodyEndIndex = template.indexOf("</body>");

  if (bodyStartIndex !== -1 && bodyEndIndex !== -1) {
    // 在 <body> 和 </body> 之间注入
    const beforeBody = template.slice(0, bodyStartIndex + 6); // 6 = "<body>".length
    const afterBody = template.slice(bodyEndIndex);
    return `${beforeBody}\n  ${componentHtml}\n${afterBody}`;
  } else if (bodyEndIndex !== -1) {
    // 只有 </body>，在之前注入
    const beforeBody = template.slice(0, bodyEndIndex);
    const afterBody = template.slice(bodyEndIndex);
    return `${beforeBody}\n  ${componentHtml}\n${afterBody}`;
  } else {
    // 没有 body 标签，直接替换整个模板（不推荐，但兼容）
    return componentHtml;
  }
}

/**
 * 批量注入多个内容到 HTML
 *
 * 按照顺序将多个内容注入到 HTML 的合适位置。
 * 相同类型的内容会集中在一起。
 *
 * @param html 原始 HTML
 * @param injections 注入项列表，每个项包含内容和选项
 * @returns 注入后的 HTML
 *
 * @example
 * ```typescript
 * const html = injectMultiple(originalHtml, [
 *   { content: "<meta name='description' />", options: { type: "meta", inHead: true } },
 *   { content: "<script src='/app.js'></script>", options: { type: "script" } },
 * ]);
 * ```
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
