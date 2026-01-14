/**
 * SSR 高级功能示例：性能监控
 *
 * 演示如何使用性能监控功能
 */

import { renderSSR } from "../../src/mod.ts";
import React from "react";
import type { PerformanceMetrics } from "../../src/types.ts";

// 定义页面组件
function Page({ items }: { items: string[] }) {
  return React.createElement(
    "div",
    null,
    React.createElement("h1", null, "性能监控示例"),
    React.createElement(
      "ul",
      null,
      items.map((item, index) =>
        React.createElement("li", { key: index }, item)
      ),
    ),
  );
}

// 执行 SSR 渲染（启用性能监控）
async function main() {
  let metrics: PerformanceMetrics | undefined;

  const result = await renderSSR({
    engine: "react",
    component: Page,
    props: {
      items: Array.from({ length: 1000 }, (_, i) => `项目 ${i + 1}`),
    },
    performance: {
      enabled: true,
      onMetrics: (m) => {
        metrics = m;
      },
    },
    template: `
      <!DOCTYPE html>
      <html lang="zh-CN">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>性能监控示例</title>
        </head>
        <body>
          
        </body>
      </html>
    `,
  });

  console.log("渲染结果长度:", result.html.length, "字符");
  console.log("\n性能指标:");
  if (metrics) {
    console.log(`- 引擎: ${metrics.engine}`);
    console.log(`- 阶段: ${metrics.phase}`);
    console.log(`- 开始时间: ${metrics.startTime}ms`);
    console.log(`- 结束时间: ${metrics.endTime}ms`);
    console.log(`- 总耗时: ${metrics.duration}ms`);
  }
}

// 运行示例
if (import.meta.main) {
  main().catch(console.error);
}
