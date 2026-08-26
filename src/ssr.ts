/**
 * Server-side rendering (SSR) entry. Adapters are statically imported for correct resolution in dweb/server bundles.
 */

import * as preactAdapter from "./adapters/preact.ts";
import * as reactAdapter from "./adapters/react.ts";
import * as viewAdapter from "./adapters/view.ts";
import type {
  LoadContext,
  Metadata,
  RenderResult,
  ScriptDefinition,
  SSROptions,
  StreamRenderResult,
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
import {
  createHtmlInjectTransform,
  type StreamInjection,
} from "./utils/html-stream-inject.ts";
import { filterLayouts } from "./utils/layout.ts";
import {
  generateLazyDataScript,
  shouldLazyLoad,
} from "./utils/lazy-loading.ts";
import {
  extractMetadata,
  generateRouteMetaTagsWithoutTitle,
  generateRouteTitleTag,
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
import { $tr, type Locale } from "./i18n.ts";

/** Shared SSR prep: layouts/load/metadata/scripts/injections. */
interface SSRPrepResult {
  mergedMetadata: Metadata | null;
  layoutData: Record<string, unknown>;
  pageData: Record<string, unknown>;
  fromCache: boolean;
  injections: StreamInjection[];
  compressedSize?: number;
  originalSize?: number;
  perfMonitor: ReturnType<typeof createPerformanceMonitor>;
}

async function prepareSSR(options: SSROptions): Promise<SSRPrepResult> {
  const { engine, loadContext } = options;

  const perfMonitor = createPerformanceMonitor(options.performance);
  if (perfMonitor) {
    perfMonitor.start(engine, "ssr");
  }

  const context: LoadContext = loadContext || {
    url: "/",
    params: {},
  };

  let cachedMetadata: Metadata | null = null;
  if (options.metadataCache?.enabled) {
    cachedMetadata = await getCachedMetadata(context, options.metadataCache);
  }

  const layoutMetadataList: Metadata[] = [];
  let layoutData: Record<string, unknown> = {};
  const layoutRoutes: string[] = [];
  const layoutScripts: ScriptDefinition[][] = [];

  if (options.layouts && options.layouts.length > 0) {
    const filteredLayouts = filterLayouts(options.layouts);
    for (const layout of filteredLayouts) {
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

      const loadFn = extractLoadFunction(layout.component);
      if (loadFn) {
        const data = await loadServerData(loadFn, context);
        if (data) {
          layoutData = { ...layoutData, ...data };
        }
      }

      const scripts = extractScripts(layout.component);
      if (scripts.length > 0) {
        layoutScripts.push(scripts);
      }

      if (layout.component && typeof layout.component === "object") {
        const comp = layout.component as Record<string, unknown>;
        if (typeof comp.route === "string") {
          layoutRoutes.push(comp.route);
        }
      }
    }
  }

  let pageMetadata: Metadata | null = null;
  let pageData: Record<string, unknown> = {};
  let pageRoute: string | undefined;
  let pageScripts: ScriptDefinition[] = [];

  if (!cachedMetadata) {
    const pageMetadataValue = extractMetadata(options.component);
    if (pageMetadataValue) {
      pageMetadata = await resolveMetadata(pageMetadataValue, context);
    }
  }

  const pageLoadFn = extractLoadFunction(options.component);
  if (pageLoadFn) {
    const data = await loadServerData(pageLoadFn, context);
    if (data) {
      pageData = data;
    }
  }

  pageScripts = extractScripts(options.component);

  if (options.component && typeof options.component === "object") {
    const comp = options.component as Record<string, unknown>;
    if (typeof comp.route === "string") {
      pageRoute = comp.route;
    }
  }

  let mergedMetadata = cachedMetadata ||
    mergeMetadata(layoutMetadataList, pageMetadata);

  if (options.contextData) {
    mergedMetadata = mergeContextMetadata(mergedMetadata, options.contextData);
    layoutData = mergeContextServerData(layoutData, options.contextData);
    pageData = mergeContextServerData(pageData, options.contextData);
  }

  if (options.metadataCache?.enabled && !cachedMetadata) {
    await cacheMetadata(context, mergedMetadata, options.metadataCache);
  }

  const routeMetaWithoutTitleHtml = generateRouteMetaTagsWithoutTitle(
    mergedMetadata,
  );
  const routeTitleHtml = generateRouteTitleTag(mergedMetadata);

  const allScripts = mergeScripts(
    ...layoutScripts,
    pageScripts,
    options.scripts || [],
  );

  const scriptTagsHtml = generateScriptTags(allScripts);
  const asyncScriptLoaderHtml = generateAsyncScriptLoader(allScripts);

  let dataScript = "";
  let compressedSize: number | undefined;
  let originalSize: number | undefined;

  if (!options.skipDataInjection) {
    const dataToInject = {
      metadata: mergedMetadata,
      layoutData,
      pageData,
      route: context.url.split("?")[0],
      url: context.url,
      params: context.params,
      layoutRoutes,
      pageRoute,
    };

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
      dataScript = generateLazyDataScript(dataToInject);
    } else {
      dataScript = generateDataScript(dataToInject);
    }
  }

  const clientScriptsHtml =
    options.clientScripts && options.clientScripts.length > 0
      ? options.clientScripts.map((script) => {
        if (script.trim().startsWith("<script")) {
          return script;
        }
        return `<script src="${script}"></script>`;
      }).join("\n  ")
      : "";

  const injections: StreamInjection[] = [];

  if (routeMetaWithoutTitleHtml) {
    injections.push({
      content: routeMetaWithoutTitleHtml,
      options: { type: "meta", inHead: true },
    });
  }
  if (routeTitleHtml) {
    injections.push({
      content: routeTitleHtml,
      options: { type: "meta", inHead: true },
    });
  }
  if (dataScript) {
    injections.push({
      content: dataScript,
      options: { type: "data-script", inHead: true },
    });
  }
  if (scriptTagsHtml) {
    injections.push({ content: scriptTagsHtml, options: { type: "script" } });
  }
  if (asyncScriptLoaderHtml) {
    injections.push({
      content: asyncScriptLoaderHtml,
      options: { type: "script" },
    });
  }
  if (clientScriptsHtml) {
    injections.push({
      content: clientScriptsHtml,
      options: { type: "script" },
    });
  }

  return {
    mergedMetadata,
    layoutData,
    pageData,
    fromCache: !!cachedMetadata,
    injections,
    compressedSize,
    originalSize,
    perfMonitor,
  };
}

/**
 * Server-side render: call the adapter for the given engine to produce HTML.
 *
 * @param options - SSR options (engine, component, props, template, loadContext, etc.)
 * @returns Render result (html, styles, scripts, metadata, performance, etc.)
 * @throws If engine is unsupported or render fails
 */
export async function renderSSR(options: SSROptions): Promise<RenderResult> {
  const { engine } = options;
  const lang = options.lang as Locale | undefined;

  const prep = await prepareSSR(options);

  let result: RenderResult;
  try {
    switch (engine) {
      case "react": {
        result = await reactAdapter.renderSSR(options);
        break;
      }
      case "preact": {
        result = await preactAdapter.renderSSR(options);
        break;
      }
      case "view": {
        result = await viewAdapter.renderSSR(options);
        break;
      }
      default: {
        const _exhaustive: never = engine;
        throw new Error($tr("error.unsupportedEngine", { engine }, lang));
      }
    }
  } catch (error) {
    const shouldContinue = await handleRenderError(
      error,
      { engine, component: options.component, phase: "ssr" },
      options.errorHandler,
      lang,
    );

    if (shouldContinue && options.errorHandler?.fallbackComponent) {
      try {
        const fallbackOptions = {
          ...options,
          component: options.errorHandler.fallbackComponent,
        };
        switch (engine) {
          case "react":
            result = await reactAdapter.renderSSR(fallbackOptions);
            break;
          case "preact":
            result = await preactAdapter.renderSSR(fallbackOptions);
            break;
          case "view":
            result = await viewAdapter.renderSSR(fallbackOptions);
            break;
          default:
            throw new Error($tr("error.unsupportedEngine", { engine }, lang));
        }
      } catch (_fallbackError) {
        result = {
          html: generateErrorHTML(
            error instanceof Error ? error : new Error(String(error)),
            undefined,
            lang,
          ),
          renderInfo: { engine, error: true },
        };
      }
    } else {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error($tr("error.ssrFailed", { engine, message }, lang));
    }
  }

  if (typeof result.html !== "string") {
    const type = typeof result.html;
    console.error(
      $tr("error.ssrResultNotString", { type }, lang),
      result.html,
    );
    result.html = String(result.html);
    if (result.html === "[object Object]") {
      throw new Error(
        $tr("error.ssrCannotStringify", { type }, lang),
      );
    }
  }

  const finalHtml = injectMultiple(result.html, prep.injections);

  let performanceMetrics: import("./types.ts").PerformanceMetrics | undefined;
  if (prep.perfMonitor) {
    performanceMetrics = prep.perfMonitor.end();
    recordPerformanceMetrics(performanceMetrics, options.performance);
  }

  return {
    ...result,
    html: finalHtml,
    metadata: prep.mergedMetadata ?? undefined,
    layoutData: prep.layoutData,
    pageData: prep.pageData,
    performance: performanceMetrics,
    fromCache: prep.fromCache,
    compressedSize: prep.compressedSize,
    originalSize: prep.originalSize,
  };
}

/**
 * Streaming SSR for view: returns an undrained `ReadableStream` of HTML bytes.
 * React/Preact must use `renderSSR()` (buffered `stream: true` if needed).
 *
 * View streaming is coarse (full snapshot, then optional re-render chunks) —
 * not Suspense selective streaming.
 *
 * @param options - SSR options (`engine` must be `"view"`)
 */
export async function renderSSRStream(
  options: SSROptions,
): Promise<StreamRenderResult> {
  const { engine } = options;
  const lang = options.lang as Locale | undefined;

  if (engine !== "view") {
    throw new Error($tr("error.streamViewOnly", {}, lang));
  }

  const prep = await prepareSSR(options);

  let adapterResult: Awaited<ReturnType<typeof viewAdapter.renderSSRToStream>>;
  try {
    adapterResult = await viewAdapter.renderSSRToStream(options);
  } catch (error) {
    const shouldContinue = await handleRenderError(
      error,
      { engine, component: options.component, phase: "ssr" },
      options.errorHandler,
      lang,
    );

    if (shouldContinue && options.errorHandler?.fallbackComponent) {
      adapterResult = await viewAdapter.renderSSRToStream({
        ...options,
        component: options.errorHandler.fallbackComponent,
      });
    } else {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error($tr("error.ssrFailed", { engine, message }, lang));
    }
  }

  const body = adapterResult.body.pipeThrough(
    createHtmlInjectTransform(prep.injections),
  );

  let performanceMetrics: import("./types.ts").PerformanceMetrics | undefined;
  if (prep.perfMonitor) {
    performanceMetrics = prep.perfMonitor.end();
    recordPerformanceMetrics(performanceMetrics, options.performance);
  }

  return {
    body,
    metadata: prep.mergedMetadata ?? undefined,
    layoutData: prep.layoutData,
    pageData: prep.pageData,
    performance: performanceMetrics,
    fromCache: prep.fromCache,
    renderInfo: {
      engine: "view",
      stream: true,
      mode: "pipe",
    },
  };
}
