/**
 * Vue3 SSR 基础示例
 *
 * 演示如何使用 @dreamer/render 进行 Vue3 服务端渲染
 */

import { h } from "vue";
import { renderSSR } from "../../src/mod.ts";

// 定义一个简单的 Vue3 组件
const App = {
  props: ["name"],
  setup(props: { name: string }) {
    return () =>
      h("div", null, [
        h("h1", null, `Hello, ${props.name}!`),
        h("p", null, "这是通过 SSR 渲染的内容"),
      ]);
  },
};

// 执行 SSR 渲染
async function main() {
  const result = await renderSSR({
    engine: "vue3",
    component: App,
    props: { name: "Vue3" },
    template: `
      <!DOCTYPE html>
      <html lang="zh-CN">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Vue3 SSR 示例</title>
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
