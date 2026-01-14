/**
 * SSR 高级功能示例：布局系统
 *
 * 演示如何使用多层嵌套布局
 */

import { renderSSR } from "../../src/mod.ts";
import React from "react";
import type { LayoutComponent } from "../../src/types.ts";

// 定义外层布局组件
function OuterLayout({ children }: { children: React.ReactNode }) {
  return React.createElement(
    "div",
    { style: { border: "2px solid blue", padding: "20px" } },
    React.createElement("header", null, "外层布局"),
    children,
  );
}

// 定义内层布局组件
function InnerLayout({ children }: { children: React.ReactNode }) {
  return React.createElement(
    "div",
    { style: { border: "2px solid green", padding: "20px", margin: "10px" } },
    React.createElement("nav", null, "内层布局"),
    children,
  );
}

// 定义页面组件
function Page({ content }: { content: string }) {
  return React.createElement("main", null, React.createElement("p", null, content));
}

// 定义布局配置
const layouts: LayoutComponent[] = [
  {
    component: OuterLayout,
    props: {},
  },
  {
    component: InnerLayout,
    props: {},
  },
];

// 执行 SSR 渲染
async function main() {
  const result = await renderSSR({
    engine: "react",
    component: Page,
    props: { content: "这是页面内容" },
    layouts,
    template: `
      <!DOCTYPE html>
      <html lang="zh-CN">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>布局系统示例</title>
        </head>
        <body>
          
        </body>
      </html>
    `,
  });

  console.log("渲染结果:");
  console.log(result.html);
}

// 运行示例
if (import.meta.main) {
  main().catch(console.error);
}
