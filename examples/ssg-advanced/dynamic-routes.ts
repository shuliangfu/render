/**
 * SSG 高级功能示例：动态路由
 *
 * 演示如何处理动态路由参数
 */

import { renderSSG, expandDynamicRoute } from "../../src/mod.ts";
import React from "react";

// 定义用户页面组件
function UserPage({ userId }: { userId: string }) {
  return React.createElement(
    "div",
    null,
    React.createElement("h1", null, `用户 ${userId}`),
    React.createElement("p", null, `这是用户 ${userId} 的个人页面`),
  );
}

// 定义用户页面组件（带 load 方法）
UserPage.load = async (context) => {
  const userId = context.params.id;
  return {
    userId,
    userInfo: {
      name: `用户 ${userId}`,
      email: `user${userId}@example.com`,
    },
  };
};

// 执行 SSG 生成（包含动态路由）
async function main() {
  const outputDir = "./examples/ssg-advanced/output";

  // 展开动态路由
  const dynamicRoutes = expandDynamicRoute("/user/[id]", ["1", "2", "3", "4", "5"]);
  const allRoutes = ["/", ...dynamicRoutes];

  const files = await renderSSG({
    engine: "react",
    routes: allRoutes,
    outputDir,
    loadRouteComponent: async (route) => {
      if (route === "/") {
        // 首页使用不同的组件
        return () => React.createElement("div", null, React.createElement("h1", null, "首页"));
      }
      return UserPage;
    },
    loadRouteData: async (route) => {
      // 从路由中提取参数
      const match = route.match(/^\/user\/(.+)$/);
      if (match) {
        return { id: match[1] };
      }
      return {};
    },
    template: `
      <!DOCTYPE html>
      <html lang="zh-CN">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>动态路由示例</title>
        </head>
        <body>


        </body>
      </html>
    `,
    generateSitemap: true,
    generateRobots: true,
  });

  console.log(`生成了 ${files.length} 个文件:`);
  files.forEach((file) => {
    console.log(`  - ${file}`);
  });
}

// 运行示例
if (import.meta.main) {
  main().catch(console.error);
}
