/**
 * Static site generation (SSG) entry: renderSSG, expandDynamicRoute, generateRobots, generateSitemap.
 */

import { dirname, join, mkdir, writeTextFile } from "@dreamer/runtime-adapter";
import { $t, type Locale } from "./i18n.ts";
import { renderSSR } from "./ssr.ts";
import type { SSGOptions } from "./types.ts";

/**
 * Generate sitemap.xml string from route list.
 *
 * @param routes - Route paths (e.g. `["/", "/about"]`)
 * @param baseUrl - Base URL prepended to each loc (default `""`)
 * @returns sitemaps.org XML string
 */
function generateSitemap(routes: string[], baseUrl = ""): string {
  const urls = routes.map((route) => {
    const url = baseUrl + (route === "/" ? "" : route);
    return `  <url>\n    <loc>${url}</loc>\n  </url>`;
  }).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
}

/**
 * Generate robots.txt string.
 *
 * @param allowAll - Allow all crawlers (default true); if true and disallowPaths empty returns "User-agent: *\nAllow: /"
 * @param disallowPaths - Paths to disallow (default [])
 * @returns robots.txt content
 */
function generateRobots(allowAll = true, disallowPaths: string[] = []): string {
  if (allowAll && disallowPaths.length === 0) {
    return "User-agent: *\nAllow: /";
  }

  const disallowRules = disallowPaths.map((path) => `Disallow: ${path}`).join(
    "\n",
  );
  return `User-agent: *\n${disallowRules}`;
}

/**
 * Expand a dynamic route with placeholders into concrete paths.
 * Supports path segments (e.g. `"/user/[id]"`) and query (e.g. `"/user?id=[id]"`).
 *
 * @param route - Route with `[param]` placeholders (e.g. `"/post/[id]"` or `"/user?id=[id]"`)
 * @param params - Values to substitute for each placeholder
 * @returns Expanded path list; if no `[`/`]` returns single-element array with route
 */
function expandDynamicRoute(route: string, params: string[]): string[] {
  if (!route.includes("[") || !route.includes("]")) {
    return [route];
  }

  return params.map((param) => {
    let expanded = route;
    // Replace [param] with actual value (works in path and in query)
    expanded = expanded.replace(/\[([^\]]+)\]/g, param);
    return expanded;
  });
}

const SSG_QUERY_PREFIX = "__q_";

/**
 * Convert a route string (pathname or pathname?search) to the relative file path under SSG output.
 * Query routes (e.g. `/user?id=1`) are stored as `path/__q_key_value.html` so they are unique and reversible.
 *
 * @param route - Full route (e.g. `"/"`, `"/about"`, `"/user/1"`, `"/user?id=1"`)
 * @returns Relative file path (e.g. `"index.html"`, `"about.html"`, `"user/1.html"`, `"user/__q_id_1.html"`)
 */
export function routeToFilePath(route: string): string {
  const qIndex = route.indexOf("?");
  const pathname = qIndex >= 0 ? route.slice(0, qIndex) : route;
  const search = qIndex >= 0 ? route.slice(qIndex) : "";

  const pathPart = pathname === "/" || !pathname
    ? "index"
    : pathname.replace(/^\//, "").replace(/\/$/, "") || "index";

  if (!search) {
    return `${pathPart}.html`;
  }

  const params = new URLSearchParams(search.slice(1));
  const sortedKeys = Array.from(params.keys()).sort();
  const queryPart = sortedKeys
    .map((k) => `${k}_${params.get(k) ?? ""}`)
    .join("__");
  return `${pathPart}/${SSG_QUERY_PREFIX}${queryPart}.html`;
}

/**
 * Convert a relative SSG file path back to the route string (pathname + optional search).
 * Inverse of routeToFilePath.
 *
 * @param filePath - Relative path (e.g. `"user/__q_id_1.html"`)
 * @returns Route string (e.g. `"/user?id=1"`)
 */
export function filePathToRoute(filePath: string): string {
  const normalized = filePath.replace(/^\.\//, "").replace(/\/$/, "");
  const base = normalized.replace(/\.html$/i, "").trim();
  if (!base || base === "index") {
    return "/";
  }

  const querySegment = `/${SSG_QUERY_PREFIX}`;
  const qIdx = base.indexOf(querySegment);
  if (qIdx < 0) {
    return "/" + base;
  }

  const pathPart = base.slice(0, qIdx) || "index";
  const queryPart = base.slice(qIdx + querySegment.length);
  const pairs = queryPart.split("__");
  const params = new URLSearchParams();
  for (const p of pairs) {
    const sep = p.indexOf("_");
    if (sep >= 0) {
      params.set(p.slice(0, sep), p.slice(sep + 1));
    }
  }
  const search = params.toString();
  return (pathPart === "index" ? "/" : "/" + pathPart) +
    (search ? "?" + search : "");
}

/**
 * Pre-render all routes to static HTML files (SSG).
 *
 * @param options - SSG options (engine, routes, outputDir, loadRouteComponent, etc.)
 * @returns List of generated file paths
 * @throws If generation fails for a route
 *
 * @example
 * ```typescript
 * const files = await renderSSG({
 *   engine: "react",
 *   routes: ["/", "/about"],
 *   outputDir: "./dist",
 *   loadRouteComponent: async (route) => import(`./pages${route}.tsx`),
 *   template: "<html><body></body></html>",
 *   generateSitemap: true,
 *   generateRobots: true
 * });
 * ```
 */
export async function renderSSG(options: SSGOptions): Promise<string[]> {
  const {
    engine,
    routes,
    outputDir,
    loadRouteComponent,
    loadRouteLayouts,
    loadRouteData,
    template,
    headInject,
    pureHTML = false,
    generateSitemap: shouldGenerateSitemap = false,
    generateRobots: shouldGenerateRobots = false,
    onFileGenerated,
    lang,
    options: customOptions = {},
  } = options;

  const locale = lang as Locale | undefined;

  await mkdir(outputDir, { recursive: true });

  const generatedFiles: string[] = [];

  for (const route of routes) {
    try {
      const routeComponent = await loadRouteComponent(route);

      const layouts = loadRouteLayouts ? await loadRouteLayouts(route) : [];

      const routeData = loadRouteData ? await loadRouteData(route) : {};

      // deno-lint-ignore no-explicit-any
      const ssrOptions: any = {
        engine,
        component: routeComponent,
        props: {
          route,
          ...routeData,
          ...customOptions,
        },
        layouts: layouts.length > 0 ? layouts : undefined,
        template,
        skipDataInjection: !options.enableDataInjection,
        loadContext: {
          url: route,
          params: {},
        },
        lang,
      };

      const result = await renderSSR(ssrOptions);

      const filePath = routeToFilePath(route);
      const fullPath = join(outputDir, filePath);

      const dirPath = dirname(fullPath);
      if (dirPath && dirPath !== ".") {
        await mkdir(dirPath, { recursive: true });
      }

      if (!result || typeof result !== "object" || !("html" in result)) {
        throw new Error(
          $t("error.ssgInvalidResult", { type: typeof result }, locale),
        );
      }

      const resultHtml = result.html;
      let html: string;

      if (typeof resultHtml === "string") {
        html = resultHtml;
      } else {
        const type = typeof resultHtml;
        console.error(
          $t("error.ssgResultNotString", { type }, locale),
          resultHtml,
        );
        html = String(resultHtml);
        if (html === "[object Object]") {
          throw new Error(
            $t("error.ssgCannotStringify", { type }, locale),
          );
        }
      }

      if (headInject && html.includes("</head>")) {
        html = html.replace(/<\/head>/i, `${headInject}\n</head>`);
      }

      if (pureHTML) {
        html = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
      }

      if (typeof html !== "string") {
        throw new Error(
          $t("error.ssgHtmlNotString", { type: typeof html }, locale),
        );
      }

      await writeTextFile(fullPath, html);
      generatedFiles.push(fullPath);
      onFileGenerated?.(fullPath);
    } catch (error) {
      throw new Error(
        `SSG failed (route: ${route}): ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  if (shouldGenerateSitemap) {
    const sitemapPath = join(outputDir, "sitemap.xml");
    const sitemap = generateSitemap(routes);
    await writeTextFile(sitemapPath, sitemap);
    generatedFiles.push(sitemapPath);
  }

  if (shouldGenerateRobots) {
    const robotsPath = join(outputDir, "robots.txt");
    const robots = generateRobots();
    await writeTextFile(robotsPath, robots);
    generatedFiles.push(robotsPath);
  }

  return generatedFiles;
}

export { expandDynamicRoute, generateRobots, generateSitemap };
