/**
 * 完整全栈应用示例：服务端
 *
 * 演示如何结合 SSR 和 Hydration 构建完整的全栈应用
 */

import { renderSSR } from "../../src/mod.ts";
import React from "react";
import type { LoadContext, ServerData } from "../../src/types.ts";

// 定义页面组件
function App({ title, count }: { title: string; count: number }) {
  return React.createElement(
    "div",
    null,
    React.createElement("h1", null, title),
    React.createElement("p", { id: "count" }, `计数: ${count}`),
    React.createElement(
      "button",
      {
        type: "button",
        id: "increment",
        onClick: () => {
          // 客户端交互逻辑
          const countEl = document.getElementById("count");
          if (countEl) {
            const current = parseInt(countEl.textContent?.match(/\d+/)?.[0] || "0");
            countEl.textContent = `计数: ${current + 1}`;
          }
        },
      },
      "增加",
    ),
  );
}

// 定义 load 方法
App.load = async (context: LoadContext): Promise<ServerData> => {
  // 从查询参数获取初始计数
  const url = new URL(context.url, "http://localhost");
  const count = parseInt(url.searchParams.get("count") || "0");

  return {
    title: "全栈应用示例",
    count,
  };
};

// 定义元数据
App.metadata = {
  title: "全栈应用示例",
  description: "这是一个结合 SSR 和 Hydration 的完整示例",
} as any;

// 模拟 HTTP 服务器
async function handleRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);

  // 只处理根路径
  if (url.pathname !== "/") {
    return new Response("Not Found", { status: 404 });
  }

  // 执行 SSR
  const result = await renderSSR({
    engine: "react",
    component: App,
    loadContext: {
      url: request.url,
      params: {},
      request,
    },
    // 注入客户端脚本（用于 Hydration）
    clientScripts: ["/client.js"],
    template: `
      <!DOCTYPE html>
      <html lang="zh-CN">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          
        </head>
        <body>
          
          
          
        </body>
      </html>
    `,
  });

  return new Response(result.html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}

// 运行服务器（示例，实际使用时需要真实的 HTTP 服务器）
async function main() {
  console.log("服务器示例（需要真实的 HTTP 服务器实现）");
  console.log("可以使用 Deno 的 std/http 或 Bun 的 HTTP 服务器");

  // 示例：渲染一次以查看结果
  const result = await renderSSR({
    engine: "react",
    component: App,
    loadContext: {
      url: "http://localhost/?count=5",
      params: {},
    },
    template: `
      <!DOCTYPE html>
      <html lang="zh-CN">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          
        </head>
        <body>
          
          
          <script src="/client.js"></script>
        </body>
      </html>
    `,
  });

  console.log("\n渲染结果:");
  console.log(result.html);
}

// 运行示例
if (import.meta.main) {
  main().catch(console.error);
}
