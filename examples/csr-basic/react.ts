/**
 * React CSR 基础示例
 *
 * 注意：此示例需要在浏览器环境中运行
 * 在 Node.js/Deno/Bun 环境中会抛出错误
 */

import { renderCSR } from "../../src/mod.ts";
import React from "react";

// 定义一个简单的 React 组件
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

// 执行 CSR 渲染（仅在浏览器环境中）
function main() {
  // 检查是否在浏览器环境
  if (typeof globalThis.document === "undefined") {
    console.error("CSR 渲染只能在浏览器环境中运行");
    console.log("请将此文件在浏览器中运行，或使用支持 DOM 的环境（如 jsdom）");
    return;
  }

  const result = renderCSR({
    engine: "react",
    component: App,
    props: { name: "World" },
    container: "#app",
  });

  console.log("CSR 渲染完成");
  console.log("卸载函数:", result.unmount);
}

// 运行示例
if (import.meta.main) {
  main();
}
