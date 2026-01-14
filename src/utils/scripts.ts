/**
 * 脚本提取和注入工具函数
 *
 * 用于从组件中提取脚本定义，并生成脚本标签 HTML
 */

import type { ScriptDefinition } from "../types.ts";

/**
 * 从组件中提取脚本定义
 *
 * @param component 组件对象
 * @returns 脚本定义列表
 */
export function extractScripts(component: unknown): ScriptDefinition[] {
  const scripts: ScriptDefinition[] = [];

  // 支持函数组件和对象组件
  if (component === null || component === undefined) {
    return scripts;
  }

  const comp = component as Record<string, unknown>;

  // 方式 1：直接导出 scripts（数组）
  if ("scripts" in comp && Array.isArray(comp.scripts)) {
    const compScripts = comp.scripts as unknown[];
    for (const script of compScripts) {
      if (typeof script === "string") {
        scripts.push({ src: script });
      } else if (typeof script === "object" && script !== null) {
        scripts.push(script as ScriptDefinition);
      }
    }
  }

  // 方式 2：default export 的对象中有 scripts
  if (
    "default" in comp && typeof comp.default === "object" &&
    comp.default !== null
  ) {
    const defaultComp = comp.default as Record<string, unknown>;
    if ("scripts" in defaultComp && Array.isArray(defaultComp.scripts)) {
      const compScripts = defaultComp.scripts as unknown[];
      for (const script of compScripts) {
        if (typeof script === "string") {
          scripts.push({ src: script });
        } else if (typeof script === "object" && script !== null) {
          scripts.push(script as ScriptDefinition);
        }
      }
    }
  }

  return scripts;
}

/**
 * 合并脚本列表（去重、排序）
 *
 * @param scriptLists 多个脚本列表
 * @returns 合并后的脚本列表
 */
export function mergeScripts(
  ...scriptLists: ScriptDefinition[][]
): ScriptDefinition[] {
  const scriptMap = new Map<string, ScriptDefinition>();

  // 收集所有脚本
  for (const scripts of scriptLists) {
    for (const script of scripts) {
      // 生成唯一键（基于 src 或 content）
      const key = script.src || script.content || JSON.stringify(script);
      if (!scriptMap.has(key)) {
        scriptMap.set(key, script);
      }
    }
  }

  // 转换为数组并按优先级排序
  const merged = Array.from(scriptMap.values());
  merged.sort((a, b) => {
    const priorityA = a.priority ?? 100;
    const priorityB = b.priority ?? 100;
    return priorityA - priorityB;
  });

  return merged;
}

/**
 * 生成脚本标签 HTML
 *
 * @param scripts 脚本定义列表
 * @returns 脚本标签 HTML 字符串
 */
export function generateScriptTags(scripts: ScriptDefinition[]): string {
  return scripts.map((script) => {
    const attrs: string[] = [];

    if (script.src) {
      attrs.push(`src="${script.src}"`);
    }

    if (script.type) {
      attrs.push(`type="${script.type}"`);
    } else if (script.content) {
      attrs.push('type="text/javascript"');
    }

    if (script.async) {
      attrs.push("async");
    }

    if (script.defer) {
      attrs.push("defer");
    }

    // 添加其他属性
    for (const [key, value] of Object.entries(script)) {
      if (
        !["src", "content", "type", "async", "defer", "priority"].includes(
          key,
        )
      ) {
        if (typeof value === "boolean" && value) {
          attrs.push(key);
        } else if (typeof value === "string") {
          attrs.push(`${key}="${value}"`);
        }
      }
    }

    if (script.content) {
      // 内联脚本
      return `<script ${attrs.join(" ")}>${script.content}</script>`;
    } else {
      // 外部脚本
      return `<script ${attrs.join(" ")}></script>`;
    }
  }).join("\n  ");
}

/**
 * 生成异步脚本加载代码
 *
 * @param scripts 脚本定义列表
 * @returns 异步加载脚本的 JavaScript 代码
 */
export function generateAsyncScriptLoader(scripts: ScriptDefinition[]): string {
  const asyncScripts = scripts.filter((s) =>
    s.async || s.priority !== undefined
  );
  if (asyncScripts.length === 0) {
    return "";
  }

  const scriptLoaders = asyncScripts.map((script) => {
    if (script.content) {
      // 内联脚本，直接执行
      return `(function() { ${script.content} })();`;
    } else if (script.src) {
      // 外部脚本，动态加载
      return `(function() {
        const script = document.createElement('script');
        script.src = ${JSON.stringify(script.src)};
        ${script.async ? "script.async = true;" : ""}
        ${script.defer ? "script.defer = true;" : ""}
        ${script.type ? `script.type = ${JSON.stringify(script.type)};` : ""}
        document.head.appendChild(script);
      })();`;
    }
    return "";
  }).filter(Boolean);

  if (scriptLoaders.length === 0) {
    return "";
  }

  return `<script>
  (function() {
    ${scriptLoaders.join("\n    ")}
  })();
</script>`;
}
