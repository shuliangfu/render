/**
 * React SSR 基础示例
 *
 * 演示如何使用 @dreamer/render 进行 React 服务端渲染
 */

import React from "react";
import { renderSSR } from "../../src/mod.ts";

// 定义一个简单的 React 组件
function App({ name }: { name: string }) {
  return React.createElement(
    "div",
    null,
    React.createElement("h1", null, `Hello, ${name}!`),
    React.createElement("p", null, "这是通过 SSR 渲染的内容"),
  );
}

// 执行 SSR 渲染
async function main() {
  const result = await renderSSR({
    engine: "react",
    component: App,
    props: { name: "World" },
    template: `
      <!DOCTYPE html>
      <html lang="zh-CN">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>React SSR 示例</title>
        </head>
        <body>
          <!-- 组件 HTML 会自动注入到这里 -->
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
