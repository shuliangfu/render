/**
 * SSR 高级功能示例：元数据管理和数据注入
 *
 * 演示如何使用 metadata 和 load 方法进行元数据管理和服务端数据注入
 */

import React from "react";
import { renderSSR } from "../../src/mod.ts";
import type { LoadContext, Metadata, ServerData } from "../../src/types.ts";

// 定义页面组件
function Page(
  { title, user }: { title: string; user: { name: string; email: string } },
) {
  return React.createElement(
    "div",
    null,
    React.createElement("h1", null, title),
    React.createElement("p", null, `欢迎, ${user.name}!`),
    React.createElement("p", null, `邮箱: ${user.email}`),
  );
}

// 定义静态元数据
(Page as any).metadata = {
  title: "用户页面",
  description: "这是一个用户信息页面",
  keywords: "用户,信息,页面",
  og: {
    title: "用户页面",
    description: "这是一个用户信息页面",
    type: "website",
  },
} as Metadata;

// 定义 load 方法（用于加载服务端数据）
(Page as any).load = async (context: LoadContext): Promise<ServerData> => {
  // 模拟从数据库或 API 获取数据
  const userId = context.params.id || "1";

  // 模拟异步数据获取
  await new Promise((resolve) => setTimeout(resolve, 100));

  return {
    title: `用户 ${userId} 的信息`,
    user: {
      name: `用户 ${userId}`,
      email: `user${userId}@example.com`,
    },
  };
};

// 执行 SSR 渲染
async function main() {
  const result = await renderSSR({
    engine: "react",
    component: Page,
    loadContext: {
      url: "/user/123",
      params: { id: "123" },
    },
    template: `
      <!DOCTYPE html>
      <html lang="zh-CN">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <!-- 元数据标签会自动注入到这里 -->
          <!-- 数据脚本会自动注入到这里 -->
        </head>
        <body>
          <!-- 组件 HTML 会自动注入到这里 -->
        </body>
      </html>
    `,
  });

  console.log("渲染结果:");
  console.log(result.html);
  console.log("\n页面数据:");
  console.log(result.pageData);
  console.log("\n元数据:");
  console.log(result.metadata);
}

// 运行示例
if (import.meta.main) {
  main().catch(console.error);
}
