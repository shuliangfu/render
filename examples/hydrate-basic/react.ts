/**
 * React Hydration 基础示例
 *
 * 注意：此示例需要在浏览器环境中运行
 * 通常与 SSR 配合使用：先进行 SSR，然后在客户端进行 Hydration
 */

import { hydrate } from "../../src/mod.ts";
import React from "react";

// 定义一个简单的 React 组件（必须与 SSR 使用的组件相同）
function App({ name }: { name: string }) {
  const [count, setCount] = React.useState(0);

  return React.createElement(
    "div",
    null,
    React.createElement("h1", null, `Hello, ${name}!`),
    React.createElement("p", null, `计数: ${count}`),
    React.createElement(
      "button",
      {
        type: "button",
        onClick: () => setCount(count + 1),
      },
      "增加",
    ),
  );
}

// 执行 Hydration（仅在浏览器环境中）
function main() {
  // 检查是否在浏览器环境
  if (typeof globalThis.document === "undefined") {
    console.error("Hydration 只能在浏览器环境中运行");
    console.log("请将此文件在浏览器中运行，或使用支持 DOM 的环境（如 jsdom）");
    return;
  }

  // 假设 HTML 中已经有 SSR 生成的内容
  // <div id="app"><h1>Hello, World!</h1><p>计数: 0</p><button>增加</button></div>

  hydrate({
    engine: "react",
    component: App,
    props: { name: "World" },
    container: "#app",
    strictMode: true, // 启用严格模式（仅 React 支持）
  });

  console.log("Hydration 完成");
}

// 运行示例
if (import.meta.main) {
  main();
}
