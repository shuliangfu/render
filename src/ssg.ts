/**
 * Static site generation (SSG) entry: renderSSG, expandDynamicRoute, generateRobots, generateSitemap.
 */

import { dirname, join, mkdir, writeTextFile } from "@dreamer/runtime-adapter";
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
 *
 * @param route - Route path with `[param]` placeholders (e.g. `"/post/[id]"`)
 * @param params - Values to substitute for each placeholder
 * @returns Expanded path list; if no `[`/`]` returns single-element array with route
 */
function expandDynamicRoute(route: string, params: string[]): string[] {
  if (!route.includes("[") || !route.includes("]")) {
    return [route];
  }

  return params.map((param) => {
    let expanded = route;
    // Replace [param] with actual value
    expanded = expanded.replace(/\[([^\]]+)\]/g, param);
    return expanded;
  });
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
    options: customOptions = {},
  } = options;

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
      };

      const result = await renderSSR(ssrOptions);

      let filePath = route === "/" ? "/index.html" : `${route}.html`;
      if (!filePath.startsWith("/")) {
        filePath = "/" + filePath;
      }
      filePath = filePath.substring(1);
      const fullPath = join(outputDir, filePath);

      const dirPath = dirname(fullPath);
      if (dirPath && dirPath !== ".") {
        await mkdir(dirPath, { recursive: true });
      }

      if (!result || typeof result !== "object" || !("html" in result)) {
        throw new Error(`SSG: invalid result, type: ${typeof result}`);
      }

      const resultHtml = result.html;
      let html: string;

      if (typeof resultHtml === "string") {
        html = resultHtml;
      } else {
        console.error(
          `SSG: result.html not string, type: ${typeof resultHtml}`,
          resultHtml,
        );
        html = String(resultHtml);
        if (html === "[object Object]") {
          throw new Error(
            `SSG: cannot stringify result.html, type: ${typeof resultHtml}`,
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
          `SSG: html not string before write, type: ${typeof html}`,
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
