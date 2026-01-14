/**
 * SSG 基础示例
 *
 * 演示如何使用 @dreamer/render 进行静态站点生成
 */

import { renderSSG } from "../../src/mod.ts";
import React from "react";
import { join } from "@dreamer/runtime-adapter";

// 定义应用组件
function App() {
  return React.createElement(
    "div",
    null,
    React.createElement("h1", null, "欢迎来到我的网站"),
    React.createElement("p", null, "这是一个静态生成的页面"),
  );
}

// 定义关于页面组件
function AboutPage() {
  return React.createElement(
    "div",
    null,
    React.createElement("h1", null, "关于我们"),
    React.createElement("p", null, "这是关于页面的内容"),
  );
}

// 执行 SSG 生成
async function main() {
  const outputDir = "./examples/ssg-basic/output";

  const files = await renderSSG({
    engine: "react",
    routes: ["/", "/about"],
    outputDir,
    loadRouteComponent: async (route) => {
      if (route === "/") {
        return App;
      } else if (route === "/about") {
        return AboutPage;
      }
      return App;
    },
    template: `
      <!DOCTYPE html>
      <html lang="zh-CN">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>静态站点</title>
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
