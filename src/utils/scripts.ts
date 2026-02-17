/**
 * Script extraction and injection: get script definitions from components and generate script tags.
 *
 * @packageDocumentation
 */

import type { ScriptDefinition } from "../types.ts";

/**
 * Extract script definitions from component (direct or default.scripts).
 *
 * @param component - Component (function or object with default)
 * @returns List of script definitions
 */
export function extractScripts(component: unknown): ScriptDefinition[] {
  const scripts: ScriptDefinition[] = [];

  if (component === null || component === undefined) {
    return scripts;
  }

  const comp = component as Record<string, unknown>;

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
 * Merge script lists (dedupe by src/content, sort by priority).
 *
 * @param scriptLists - One or more script arrays
 * @returns Merged, deduplicated, sorted list
 */
export function mergeScripts(
  ...scriptLists: ScriptDefinition[][]
): ScriptDefinition[] {
  const scriptMap = new Map<string, ScriptDefinition>();

  for (const scripts of scriptLists) {
    for (const script of scripts) {
      const key = script.src || script.content || JSON.stringify(script);
      if (!scriptMap.has(key)) {
        scriptMap.set(key, script);
      }
    }
  }

  const merged = Array.from(scriptMap.values());
  merged.sort((a, b) => {
    const priorityA = a.priority ?? 100;
    const priorityB = b.priority ?? 100;
    return priorityA - priorityB;
  });

  return merged;
}

/**
 * Generate <script> tag HTML from script definitions.
 *
 * @param scripts - Script definitions
 * @returns HTML string of script tags
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
      return `<script ${attrs.join(" ")}>${script.content}</script>`;
    } else {
      return `<script ${attrs.join(" ")}></script>`;
    }
  }).join("\n  ");
}

/**
 * Generate async script loader code (IIFE that runs inline or loads external scripts).
 *
 * @param scripts - Script definitions
 * @returns JavaScript code string for async loading
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
      return `(function() { ${script.content} })();`;
    } else if (script.src) {
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
