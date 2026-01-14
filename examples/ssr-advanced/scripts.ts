/**
 * SSR 高级功能示例：脚本注入
 *
 * 演示如何提取和注入客户端脚本
 */

import React from "react";
import { renderSSR } from "../../src/mod.ts";
import type { ScriptDefinition } from "../../src/types.ts";

// 定义页面组件
function Page() {
  return React.createElement(
    "div",
    null,
    React.createElement("h1", null, "脚本注入示例"),
    React.createElement("p", null, "查看页面源代码，可以看到注入的脚本"),
  );
}

// 定义组件脚本（组件可以导出 scripts 属性）
(Page as any).scripts = [
  {
    src: "/js/main.js",
    async: true,
    priority: 1,
  },
  {
    content: "console.log('内联脚本已执行');",
    priority: 2,
  },
] as ScriptDefinition[];

// 执行 SSR 渲染
async function main() {
  const result = await renderSSR({
    engine: "react",
    component: Page,
    // 也可以通过选项注入脚本
    scripts: [
      {
        src: "/js/vendor.js",
        defer: true,
        priority: 0,
      },
    ],
    template: `
      <!DOCTYPE html>
      <html lang="zh-CN">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>脚本注入示例</title>
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
