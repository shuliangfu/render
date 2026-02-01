/**
 * Vue3 服务端渲染适配器
 *
 * 仅提供 Vue3 模板引擎的 SSR 功能
 *
 * 注意：客户端渲染（CSR）和 Hydration 已移至 @dreamer/render/client
 */

import { renderToString } from "@vue/server-renderer";
import { createSSRApp, h } from "vue";
import type { RenderResult, SSROptions } from "../types.ts";
import { injectComponentHtml } from "../utils/html-inject.ts";
import { filterLayouts, shouldSkipLayouts } from "../utils/layout.ts";

/**
 * Vue3 服务端渲染
 *
 * @param options SSR 选项
 * @returns 渲染结果
 */
export async function renderSSR(options: SSROptions): Promise<RenderResult> {
  const { component, props = {}, layouts, skipLayouts, template } = options;

  // 检查组件是否导出了 inheritLayout = false
  const shouldSkip = skipLayouts || shouldSkipLayouts(component);

  // 如果有布局且不跳过，创建包装组件
  let finalComponent = component;
  const finalProps = props;

  if (layouts && layouts.length > 0 && !shouldSkip) {
    // 过滤掉 skip 为 true 的布局
    const filteredLayouts = filterLayouts(layouts);
    if (filteredLayouts.length > 0) {
      // Vue3 的布局组合：创建一个包装组件，从外到内嵌套布局
      finalComponent = {
        setup() {
          // 从内到外构建组件树
          // 先创建页面组件
          const pageComponent = h(component as any, props);

          // 使用数组存储每一层的组件，避免闭包问题
          const components: any[] = [pageComponent];

          // 反向遍历布局数组（从内到外）
          for (let i = filteredLayouts.length - 1; i >= 0; i--) {
            const layout = filteredLayouts[i];
            // Vue3 的 children 通过插槽传递
            // 使用索引来避免闭包问题
            const childIndex = components.length - 1;
            const layoutComponent = h(
              layout.component as any,
              layout.props || {},
              {
                default: () => components[childIndex],
              },
            );
            components.push(layoutComponent);
          }

          // 返回最外层的组件
          return () => components[components.length - 1];
        },
      };
    }
  }

  // 创建 Vue3 SSR 应用
  const app = createSSRApp(finalComponent as any, finalProps);

  // 调试：检查 finalComponent 和 finalProps
  if (
    typeof finalComponent === "object" && finalComponent !== null &&
    !("setup" in finalComponent) && !("render" in finalComponent)
  ) {
    console.error(
      `Vue3 渲染错误: finalComponent 不是有效的 Vue3 组件，类型: ${typeof finalComponent}，值:`,
      finalComponent,
    );
  }

  // 渲染为字符串
  const html = await renderToString(app);

  // 调试：检查 renderToString 的返回值
  if (typeof html !== "string") {
    console.error(
      `Vue3 渲染错误: renderToString 返回的不是字符串，类型: ${typeof html}，值:`,
      html,
    );
  } else if (html === "[object Object]") {
    console.error(
      `Vue3 渲染错误: renderToString 返回的字符串是 "[object Object]"，说明原始值不是字符串`,
    );
  }

  // 确保 html 是字符串类型
  let finalHtml: string;
  if (typeof html === "string" && html !== "[object Object]") {
    finalHtml = html;
  } else {
    // 如果 renderToString 返回的不是字符串，记录错误并转换
    console.error(
      `Vue3 渲染错误: renderToString 返回的不是有效字符串，类型: ${typeof html}，值:`,
      html,
    );
    // 尝试转换为字符串
    finalHtml = String(html);
    // 如果转换后是 "[object Object]"，说明转换失败，尝试其他方法
    if (finalHtml === "[object Object]") {
      // 尝试使用 JSON.stringify
      try {
        finalHtml = JSON.stringify(html);
      } catch {
        // 如果 JSON.stringify 也失败，抛出错误
        throw new Error(
          `Vue3 渲染错误: 无法将 renderToString 的返回值转换为字符串，类型: ${typeof html}，值: ${html}`,
        );
      }
    }
  }

  // 如果有模板，自动注入组件 HTML
  if (template) {
    finalHtml = injectComponentHtml(template, finalHtml);
  }

  return {
    html: finalHtml,
    styles: [],
    scripts: [],
    renderInfo: {
      engine: "vue3",
    },
  };
}
