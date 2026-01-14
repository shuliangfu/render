/**
 * 完整全栈应用示例：客户端
 *
 * 此文件应该在浏览器中运行，用于 Hydration
 */

import { hydrate } from "../../src/mod.ts";
import React from "react";

// 定义页面组件（必须与服务器端使用的组件相同）
function App({ title, count }: { title: string; count: number }) {
  const [currentCount, setCurrentCount] = React.useState(count);

  return React.createElement(
    "div",
    null,
    React.createElement("h1", null, title),
    React.createElement("p", null, `计数: ${currentCount}`),
    React.createElement(
      "button",
      {
        type: "button",
        onClick: () => setCurrentCount(currentCount + 1),
      },
      "增加",
    ),
  );
}

// 执行 Hydration
function main() {
  // 检查是否在浏览器环境
  if (typeof globalThis.document === "undefined") {
    console.error("Hydration 只能在浏览器环境中运行");
    return;
  }

  // 从 window.__DATA__ 获取服务端注入的数据
  const serverData = (globalThis as any).__DATA__;
  const pageData = serverData?.page || {};

  hydrate({
    engine: "react",
    component: App,
    props: {
      title: pageData.title || "全栈应用示例",
      count: pageData.count || 0,
    },
    container: "#app",
    strictMode: true,
  });

  console.log("Hydration 完成");
}

// 运行 Hydration
main();
