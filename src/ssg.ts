/**
 * 静态站点生成（SSG）核心函数
 */

import { dirname, join, mkdir, writeTextFile } from "@dreamer/runtime-adapter";
import { renderSSR } from "./ssr.ts";
import type { SSGOptions } from "./types.ts";

/**
 * 生成 sitemap.xml
 *
 * @param routes 路由列表
 * @param baseUrl 基础 URL（可选）
 * @returns sitemap.xml 内容
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
 * 生成 robots.txt
 *
 * @param allowAll 是否允许所有爬虫
 * @param disallowPaths 禁止访问的路径列表
 * @returns robots.txt 内容
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
 * 处理动态路由
 *
 * @param route 路由路径（可能包含 [param]）
 * @param params 参数值列表
 * @returns 生成的实际路由列表
 */
function expandDynamicRoute(route: string, params: string[]): string[] {
  if (!route.includes("[") || !route.includes("]")) {
    return [route];
  }

  return params.map((param) => {
    let expanded = route;
    // 替换 [param] 为实际值
    expanded = expanded.replace(/\[([^\]]+)\]/g, param);
    return expanded;
  });
}

/**
 * 静态站点生成函数
 *
 * 预渲染所有路由为静态 HTML 文件
 *
 * @param options SSG 选项
 * @returns 生成的文件列表
 * @throws 如果生成失败
 *
 * @example
 * ```typescript
 * const files = await renderSSG({
 *   engine: "react",
 *   routes: ["/", "/about"],
 *   outputDir: "./dist",
 *   loadRouteComponent: async (route) => {
 *     // 动态加载路由组件
 *     return await import(`./pages${route}.tsx`);
 *   },
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

  // 确保输出目录存在
  await mkdir(outputDir, { recursive: true });

  const generatedFiles: string[] = [];

  // 处理每个路由
  for (const route of routes) {
    try {
      // 加载路由组件
      const routeComponent = await loadRouteComponent(route);

      // 加载布局组件（如果有，从外到内：_app -> _layout）
      const layouts = loadRouteLayouts ? await loadRouteLayouts(route) : [];

      // 加载路由数据（如果有）
      const routeData = loadRouteData ? await loadRouteData(route) : {};

      // 使用 SSR 渲染（支持 layouts 选项，布局组合在 renderSSR 中处理）
      // 如果 enableDataInjection 为 true，则注入数据（用于 Hydration）
      // 否则跳过数据注入（纯静态页面）
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
        skipDataInjection: !options.enableDataInjection, // 根据配置决定是否注入数据
        loadContext: {
          url: route,
          params: {},
        },
      };

      const result = await renderSSR(ssrOptions);

      // 构建输出文件路径
      // 将路由路径转换为文件路径
      let filePath = route === "/" ? "/index.html" : `${route}.html`;
      // 确保路径以 / 开头
      if (!filePath.startsWith("/")) {
        filePath = "/" + filePath;
      }
      // 移除开头的 /
      filePath = filePath.substring(1);
      const fullPath = join(outputDir, filePath);

      // 确保目录存在（使用 dirname 确保 Windows 兼容）
      const dirPath = dirname(fullPath);
      if (dirPath && dirPath !== ".") {
        await mkdir(dirPath, { recursive: true });
      }

      // 写入 HTML 文件
      // 确保 html 是字符串类型
      // 直接从 result.html 获取，确保类型正确
      if (!result || typeof result !== "object" || !("html" in result)) {
        throw new Error(
          `SSG 错误: result 对象无效，类型: ${typeof result}`,
        );
      }

      const resultHtml = result.html;
      let html: string;

      if (typeof resultHtml === "string") {
        html = resultHtml;
      } else {
        // 如果 result.html 不是字符串，记录错误并尝试转换
        console.error(
          `SSG 错误: result.html 不是字符串类型，类型: ${typeof resultHtml}，值:`,
          resultHtml,
        );
        // 尝试转换为字符串
        html = String(resultHtml);
        // 如果转换后是 "[object Object]"，说明转换失败，抛出错误
        if (html === "[object Object]") {
          throw new Error(
            `SSG 错误: 无法将 result.html 转换为字符串，类型: ${typeof resultHtml}，值: ${
              JSON.stringify(resultHtml)
            }`,
          );
        }
      }

      // 若提供 headInject，在 </head> 前注入（用于在 _app 输出的 head 中插入 link 等）
      if (headInject && html.includes("</head>")) {
        html = html.replace(/<\/head>/i, `${headInject}\n</head>`);
      }

      // 如果是纯静态 HTML，移除所有脚本标签
      if (pureHTML) {
        html = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
      }

      // 确保 html 是字符串类型（在写入前再次检查）
      if (typeof html !== "string") {
        throw new Error(
          `SSG 错误: 写入前 html 不是字符串类型，类型: ${typeof html}，值: ${
            JSON.stringify(html)
          }`,
        );
      }

      await writeTextFile(fullPath, html);
      generatedFiles.push(fullPath);
      onFileGenerated?.(fullPath);
    } catch (error) {
      throw new Error(
        `SSG 生成失败 (路由: ${route}): ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  // 生成 sitemap.xml
  if (shouldGenerateSitemap) {
    const sitemapPath = join(outputDir, "sitemap.xml");
    const sitemap = generateSitemap(routes);
    await writeTextFile(sitemapPath, sitemap);
    generatedFiles.push(sitemapPath);
  }

  // 生成 robots.txt
  if (shouldGenerateRobots) {
    const robotsPath = join(outputDir, "robots.txt");
    const robots = generateRobots();
    await writeTextFile(robotsPath, robots);
    generatedFiles.push(robotsPath);
  }

  return generatedFiles;
}

// 导出辅助函数（供外部使用）
export { expandDynamicRoute, generateRobots, generateSitemap };
