/**
 * 服务端渲染（SSR）核心函数
 *
 * 适配器按 engine 动态加载，避免在 Solid/Preact 应用中加载 react-dom 导致版本冲突。
 */

import type { Engine } from "./types.ts";
import type {
  LoadContext,
  Metadata,
  RenderResult,
  SSROptions,
} from "./types.ts";
import { cacheMetadata, getCachedMetadata } from "./utils/cache.ts";
import {
  compressData,
  generateCompressedDataScript,
} from "./utils/compression.ts";
import {
  mergeContextMetadata,
  mergeContextServerData,
} from "./utils/context.ts";
import { generateErrorHTML, handleRenderError } from "./utils/error-handler.ts";
import { injectMultiple } from "./utils/html-inject.ts";
import { filterLayouts } from "./utils/layout.ts";
import {
  generateLazyDataScript,
  shouldLazyLoad,
} from "./utils/lazy-loading.ts";
import {
  extractMetadata,
  generateMetaTags,
  mergeMetadata,
  resolveMetadata,
} from "./utils/metadata.ts";
import {
  createPerformanceMonitor,
  recordPerformanceMetrics,
} from "./utils/performance.ts";
import {
  extractScripts,
  generateAsyncScriptLoader,
  generateScriptTags,
  mergeScripts,
} from "./utils/scripts.ts";
import {
  extractLoadFunction,
  generateDataScript,
  loadServerData,
} from "./utils/server-data.ts";

/** 按 engine 动态加载适配器，仅加载当前使用的引擎，避免引入 react/preact 导致版本冲突 */
async function loadSSRAdapter(engine: Engine): Promise<{ renderSSR: (opts: SSROptions) => Promise<RenderResult> }> {
  switch (engine) {
    case "react":
      return await import("./adapters/react.ts");
    case "preact":
      return await import("./adapters/preact.ts");
    case "solid":
      return await import("./adapters/solid.ts");
    default: {
      const _: never = engine;
      throw new Error(`不支持的模板引擎: ${engine}`);
    }
  }
}

/**
 * 服务端渲染函数
 *
 * 根据指定的模板引擎类型，调用对应的适配器进行服务端渲染
 *
 * @param options SSR 选项
 * @returns 渲染结果
 * @throws 如果模板引擎不支持或渲染失败
 *
 * @example
 * ```typescript
 * const result = await renderSSR({
 *   engine: "react",
 *   component: MyComponent,
 *   props: { name: "World" },
 *   template: "<html><body></body></html>"
 * });
 * ```
 */
export async function renderSSR(options: SSROptions): Promise<RenderResult> {
  const { engine, loadContext } = options;

  // 性能监控
  const perfMonitor = createPerformanceMonitor(options.performance);
  if (perfMonitor) {
    perfMonitor.start(engine, "ssr");
  }

  // 准备 LoadContext（如果没有提供，使用默认值）
  const context: LoadContext = loadContext || {
    url: "/",
    params: {},
  };

  // 尝试从缓存获取元数据
  let cachedMetadata: Metadata | null = null;
  if (options.metadataCache?.enabled) {
    cachedMetadata = await getCachedMetadata(context, options.metadataCache);
  }

  // 收集元数据和数据
  const layoutMetadataList: Metadata[] = [];
  let layoutData: Record<string, unknown> = {};
  const layoutRoutes: string[] = [];
  const layoutScripts: Array<import("./types.ts").ScriptDefinition>[] = [];

  // 遍历布局组件（从外到内）
  if (options.layouts && options.layouts.length > 0) {
    const filteredLayouts = filterLayouts(options.layouts);
    for (const layout of filteredLayouts) {
      // 提取并解析 metadata（如果缓存中没有）
      if (!cachedMetadata) {
        const metadataValue = extractMetadata(layout.component);
        if (metadataValue) {
          const resolvedMetadata = await resolveMetadata(
            metadataValue,
            context,
          );
          if (resolvedMetadata) {
            layoutMetadataList.push(resolvedMetadata);
          }
        }
      }

      // 提取并调用 load 方法
      const loadFn = extractLoadFunction(layout.component);
      if (loadFn) {
        const data = await loadServerData(loadFn, context);
        if (data) {
          // 布局数据合并（从外到内）
          layoutData = { ...layoutData, ...data };
        }
      }

      // 提取脚本
      const scripts = extractScripts(layout.component);
      if (scripts.length > 0) {
        layoutScripts.push(scripts);
      }

      // 收集布局路由信息（如果有）
      if (layout.component && typeof layout.component === "object") {
        const comp = layout.component as Record<string, unknown>;
        if (typeof comp.route === "string") {
          layoutRoutes.push(comp.route);
        }
      }
    }
  }

  // 收集页面组件的元数据和数据
  let pageMetadata: Metadata | null = null;
  let pageData: Record<string, unknown> = {};
  let pageRoute: string | undefined;
  let pageScripts: import("./types.ts").ScriptDefinition[] = [];

  // 提取并解析页面 metadata（如果缓存中没有）
  if (!cachedMetadata) {
    const pageMetadataValue = extractMetadata(options.component);
    if (pageMetadataValue) {
      pageMetadata = await resolveMetadata(pageMetadataValue, context);
    }
  }

  // 提取并调用页面 load 方法
  const pageLoadFn = extractLoadFunction(options.component);
  if (pageLoadFn) {
    const data = await loadServerData(pageLoadFn, context);
    if (data) {
      pageData = data;
    }
  }

  // 提取页面脚本
  pageScripts = extractScripts(options.component);

  // 收集页面路由信息（如果有）
  if (options.component && typeof options.component === "object") {
    const comp = options.component as Record<string, unknown>;
    if (typeof comp.route === "string") {
      pageRoute = comp.route;
    }
  }

  // 合并元数据（页面覆盖布局）
  let mergedMetadata = cachedMetadata ||
    mergeMetadata(layoutMetadataList, pageMetadata);

  // 合并 Context 数据（如果提供）
  if (options.contextData) {
    mergedMetadata = mergeContextMetadata(mergedMetadata, options.contextData);
    layoutData = mergeContextServerData(layoutData, options.contextData);
    pageData = mergeContextServerData(pageData, options.contextData);
  }

  // 缓存元数据（如果启用）
  if (options.metadataCache?.enabled && !cachedMetadata) {
    await cacheMetadata(context, mergedMetadata, options.metadataCache);
  }

  // 按 engine 动态加载适配器并渲染（仅加载当前引擎，避免引入 react-dom）
  let result: RenderResult;
  try {
    const adapter = await loadSSRAdapter(engine);
    result = await adapter.renderSSR(options);
  } catch (error) {
    // 处理错误
    const shouldContinue = await handleRenderError(
      error,
      { engine, component: options.component, phase: "ssr" },
      options.errorHandler,
    );

    if (shouldContinue && options.errorHandler?.fallbackComponent) {
      // 使用降级组件重新渲染
      try {
        const fallbackOptions = {
          ...options,
          component: options.errorHandler.fallbackComponent,
        };
        const adapter = await loadSSRAdapter(engine);
        result = await adapter.renderSSR(fallbackOptions);
      } catch (_fallbackError) {
        // 降级渲染也失败，生成错误 HTML
        result = {
          html: generateErrorHTML(
            error instanceof Error ? error : new Error(String(error)),
          ),
          renderInfo: { engine, error: true },
        };
      }
    } else {
      throw new Error(
        `SSR 渲染失败 (${engine}): ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  // 生成 meta 标签 HTML
  const metaTagsHtml = generateMetaTags(mergedMetadata);

  // 合并所有脚本（布局脚本 + 页面脚本 + 选项中的脚本）
  const allScripts = mergeScripts(
    ...layoutScripts,
    pageScripts,
    options.scripts || [],
  );

  // 生成脚本标签 HTML
  const scriptTagsHtml = generateScriptTags(allScripts);
  const asyncScriptLoaderHtml = generateAsyncScriptLoader(allScripts);

  // 生成统一的数据注入脚本（如果未跳过）
  let dataScript: string = "";
  let compressedSize: number | undefined;
  let originalSize: number | undefined;

  if (!options.skipDataInjection) {
    const dataToInject = {
      metadata: mergedMetadata,
      layoutData,
      pageData,
      route: context.url.split("?")[0], // 路由路径（不含查询字符串）
      url: context.url, // 完整 URL
      params: context.params,
      layoutRoutes,
      pageRoute,
    };

    // 数据压缩（如果启用）
    if (options.compression?.enabled) {
      const compressed = compressData(dataToInject, options.compression);
      if (compressed) {
        dataScript = generateCompressedDataScript(
          compressed.compressed,
          compressed.originalSize,
          compressed.compressedSize,
        );
        compressedSize = compressed.compressedSize;
        originalSize = compressed.originalSize;
      } else {
        dataScript = generateDataScript(dataToInject);
      }
    } else if (options.lazyData && shouldLazyLoad(dataToInject)) {
      // 数据懒加载
      dataScript = generateLazyDataScript(dataToInject);
    } else {
      dataScript = generateDataScript(dataToInject);
    }
  }

  // 生成客户端脚本标签（兼容旧 API）
  const clientScriptsHtml =
    options.clientScripts && options.clientScripts.length > 0
      ? options.clientScripts.map((script) => {
        // 如果是内联脚本（以 <script 开头），直接使用
        if (script.trim().startsWith("<script")) {
          return script;
        }
        // 否则作为外部脚本路径
        return `<script src="${script}"></script>`;
      }).join("\n  ")
      : "";

  // 处理 HTML，自动注入元数据和数据脚本
  // 确保 result.html 是字符串类型
  if (typeof result.html !== "string") {
    console.error(
      `SSR 错误: result.html 不是字符串类型，类型: ${typeof result.html}，值:`,
      result.html,
    );
    // 尝试转换为字符串
    result.html = String(result.html);
    // 如果转换后是 "[object Object]"，说明转换失败，抛出错误
    if (result.html === "[object Object]") {
      throw new Error(
        `SSR 错误: 无法将 result.html 转换为字符串，类型: ${typeof result
          .html}，值: ${JSON.stringify(result.html)}`,
      );
    }
  }

  // 使用自动注入工具批量注入所有内容（相同类型会集中在一起）
  const injections: Array<
    {
      content: string;
      options?: { type?: "meta" | "script" | "data-script"; inHead?: boolean };
    }
  > = [];

  // 1. 注入 meta 标签到 head（会集中在一起）
  if (metaTagsHtml) {
    injections.push({
      content: metaTagsHtml,
      options: { type: "meta", inHead: true },
    });
  }

  // 2. 注入数据脚本到 head（会集中在一起）
  if (dataScript) {
    injections.push({
      content: dataScript,
      options: { type: "data-script", inHead: true },
    });
  }

  // 3. 注入脚本标签到 body（会集中在一起）
  if (scriptTagsHtml) {
    injections.push({ content: scriptTagsHtml, options: { type: "script" } });
  }

  // 4. 注入异步脚本加载器到 body（会集中在一起）
  if (asyncScriptLoaderHtml) {
    injections.push({
      content: asyncScriptLoaderHtml,
      options: { type: "script" },
    });
  }

  // 5. 注入客户端脚本到 body（会集中在一起，兼容旧 API）
  if (clientScriptsHtml) {
    injections.push({
      content: clientScriptsHtml,
      options: { type: "script" },
    });
  }

  // 批量注入（相同类型会集中在一起）
  const finalHtml = injectMultiple(result.html, injections);

  // 结束性能监控
  let performanceMetrics: import("./types.ts").PerformanceMetrics | undefined;
  if (perfMonitor) {
    performanceMetrics = perfMonitor.end();
    recordPerformanceMetrics(performanceMetrics, options.performance);
  }

  // 返回结果，包含元数据和数据
  return {
    ...result,
    html: finalHtml,
    metadata: mergedMetadata,
    layoutData,
    pageData,
    performance: performanceMetrics,
    fromCache: !!cachedMetadata,
    compressedSize,
    originalSize,
  };
}
