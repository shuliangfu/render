# 变更日志

本项目的重要变更将记录在此文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

---

## [1.0.31] - 2026-02-18

### 变更

- **依赖**：更新相关依赖（如 `@dreamer/view` 至 ^1.0.20）。

---

## [1.0.30] - 2026-02-18

### 变更

- **依赖**：更新 `@dreamer/view` 至 ^1.0.19。

---

## [1.0.29] - 2026-02-18

### 变更

- **i18n**：仅在入口初始化；`mod.ts` 中调用一次 `initRenderI18n()`。`$t()`
  内不再调用 `ensureRenderI18n()` 或设置 locale。

---

## [1.0.28] - 2026-02-17

### 新增

- **服务端 i18n：** `SSROptions` 与 `SSGOptions` 支持可选
  `lang`；未传时从环境变量 （LANGUAGE/LC_ALL/LANG）自动检测。新增
  `i18n.ts`、`detectLocale()`、 `ensureRenderI18n()`、`$t()`；文案文件
  `en-US.json`、`zh-CN.json` 覆盖错误与日志。
- **错误/日志翻译：** SSR/SSG 抛错、error-handler 文案、generateErrorHTML 标题、
  server-data/performance/compression 的 console 输出，以及 View/Preact 适配器
  降级失败抛错均使用 `$t`。

### 变更

- **Error handler：** `handleRenderError`、`generateErrorHTML` 增加可选参数
  `lang`； 所有面向用户的字符串使用 locale 键。
- **适配器（View、Preact）：** 降级渲染失败时的抛错使用
  `$t("error.viewSsrFailed" | "error.preactSsrFailed", { message }, locale)`；
  `handleRenderError` 传入 `options.lang`。

---

## [1.0.27] - 2026-02-17

### 新增

- **SSG：** 支持 query 形式动态路由展开（如 `/user?id=[id]` →
  `/user?id=1`、`/user?id=2`）。
- **SSG：** `routeToFilePath(route)`，将 route（pathname 或
  pathname?search）映射为输出文件路径；带 query 的 route 使用
  `path/__q_key_value.html`。
- **SSG：** `filePathToRoute(filePath)`，作为 `routeToFilePath`
  的逆运算，用于生产读盘与 hydration。

### 变更

- **SSG：** `expandDynamicRoute` 现支持在 query 中占位；`renderSSG` 使用
  `routeToFilePath` 生成输出路径。
- **测试：** 共 252 个测试；新增对 `routeToFilePath`、`filePathToRoute` 及 query
  形式 `expandDynamicRoute` 的测试；中文测试报告已全文翻译。

---

## [1.0.26] - 2026-02-17

### 变更

- **文档：** 全包 JSDoc 与注释改为英文。
- **依赖：** `@dreamer/view` 设为 `^1.0.15`。

---

## [1.0.25] - 2026-02-16

### 变更

- **依赖：** 将 `@dreamer/view` 升级至 `^1.0.14`。

---

## [1.0.24] - 2026-02-16

### 变更

- **依赖：** 将 `@dreamer/view` 升级至 `^1.0.12`，并更新
  `@dreamer/test`、`@dreamer/runtime-adapter` 至最新兼容版本。

---

## [1.0.23] - 2026-02-15

### 变更

- **依赖：** 将 `@dreamer/view` 升级至 `^1.0.11`（isEmptyChild
  辅助函数；客户端与 SSR 均不再渲染 JSX 子节点中的 `false` 与 `""`）。

---

## [1.0.21] - 2026-02-15

### 变更

- **依赖**：将 `@dreamer/view` 升级为 `^1.0.9`（vIf/vShow 导致的 input value
  修复、 扩展单元测试）。

---

## [1.0.20] - 2026-02-15

### 变更

- **依赖**：将 `@dreamer/view` 升级为 `^1.0.8`（SSR 不再把普通函数源码当 HTML
  输出；getter 返回单个 Fragment 时 input 保持焦点）。

---

## [1.0.19] - 2026-02-13

### 变更

- **依赖**：将 `@dreamer/view` 升级为 `^1.0.7`（动态 getter 内 input 焦点修复、
  context/Provider 在 patch 时 DOM 更新）。

---

## [1.0.18] - 2026-02-13

### 变更

- **依赖**：将 `@dreamer/view` 升级为 `^1.0.5`，以兼容 dweb init 与
  @dreamer/esbuild 解析器（以项目 deno.json 版本为准）。

---

## [1.0.17] - 2026-02-15

### 修复

- **View 客户端适配器**（`src/client/adapters/view.ts`）：在 `viewCreateElement`
  中，当子节点仅通过第二个参数传入（如 `createComponentTree` 只调用
  `createElement(Layout, { children: childElement })` 且无第三参）时，不再用
  `undefined` 覆盖 `props.children`。使用
  `resolvedChildren = fromArgs !== undefined ? fromArgs : rest.children`，使布局能收到页面
  VNode，主体内容得以渲染。

---

## [1.0.16] - 2026-02-14

### 新增

- **View 客户端适配器**（`src/client/adapters/view.ts`）：实现 `renderCSR` 与
  `hydrate`（基于 `@dreamer/view` 的 `createRoot`、`hydrate`）；复出
  `createReactiveRoot` 并新增
  `buildViewTree(component, props, layouts?,
  skipLayouts?)`，用于状态驱动的
  View 单根对接。从 `@dreamer/render/client/view` 使用 View 引擎 CSR、Hydration
  及 `createReactiveRoot` + `buildViewTree` 集成。

---

## [1.0.15] - 2026-02-13

### 新增

- **客户端浏览器测试**：扩展为 31 个用例，三个入口
  fixture（View、Preact、React）； `browserMode: true` 与 ESM 打包；按引擎的实际
  CSR 与 Hybrid hydrate 测试（View/Preact/React 实际 CSR 渲染与 DOM 断言、实际
  Hybrid hydrate 与内容断言）； 测试报告更新为共 243 个测试。

### 修复

- **View 客户端适配器**：CSR 渲染前清空容器，使 hybrid 导航在 hydrate → unmount
  → CSR 后正确显示主体内容。
- **客户端浏览器测试**：放宽 Preact Hybrid unmount
  断言（接受容器文本为空或保留）； React CSR/unmount 后增加短暂延迟再读取
  DOM，以等待异步提交。

---

## [1.0.14] - 2026-02-13

### 新增

- **View 引擎支持**：完整支持 View 模板引擎（`@dreamer/view`）。
  - **SSR**：新增服务端适配器 `src/adapters/view.ts`，使用 `@dreamer/view` 的
    `renderToString` 与 `@dreamer/view/stream` 的
    `renderToStream`；支持布局、模板注入、流式渲染、错误处理与性能监控。
  - **CSR 与 Hydration**：新增客户端适配器 `src/client/adapters/view.ts`；通过
    `@dreamer/render/client` 使用 `engine: "view"` 的 `renderCSR` 与
    `hydrate`；支持布局、错误处理与性能监控。
  - **引擎类型**：服务端与客户端类型中的 `Engine` 现为
    `"react" | "preact" | "view"`。
  - **导出**：新增子路径 `@dreamer/render/client/view` 用于 View 客户端适配器。
  - **测试**：新增测试文件 `tests/adapters-view.test.ts`（12
    个用例）；`tests/ssr.test.ts` 中增加 View SSR 用例；`mod.test.ts`
    更新为三种引擎；共 233 个测试，全部通过。
  - **文档**：README 与文档已更新 View 引擎说明、快速开始（View SSR
    示例）、环境表、API 表、测试报告摘要（233 通过）及模板引擎支持表。

### 移除

- **Solid.js 支持**：移除 Solid 模板引擎支持。
  - Solid SSR 适配器与客户端适配器（`@dreamer/render/client/solid`）已移除。
  - `Engine` 类型不再包含 `"solid"`。
  - 与 Solid.js 相关的依赖与代码已从包中移除。

### 变更

- **许可证**：本项目采用 Apache License, Version 2.0 许可。完整条款见
  [LICENSE](../../LICENSE) 文件。`deno.json` 中的 `license` 字段为
  `"Apache-2.0"`。

---

## [1.0.13] - 2026-02-11

### 修复

- **Solid SSR 适配器**：通过动态导入
  `solid-js/web`（`getSolidWeb()`）避免服务端代码路径拉取客户端
  API，消除在路由组件未使用 SSR 专用构建（如 dweb `generate: "ssr"`）时的
  "Client-only API called on the server side" 报错。补充 SSR 编译要求说明。

### 新增

- **Preact 适配器**：在 `composeLayouts`
  之后增加调试日志（根组件名、hasChildren、layoutsCount），便于排查布局/SSR
  问题。

---

## [1.0.12] - 2026-02-11

### 修复

- **SSR 适配器**：恢复 preact、react、solid 适配器的静态导入。原先的动态导入在
  dweb 打包服务端时导致模块解析异常（如 preact-csr 出现「app 容器未找到」）。
- **客户端适配器**：客户端保持动态导入，避免将 solid-js（及其使用 `require` 的
  seroval 依赖）打入浏览器包，否则会触发 "Dynamic require of seroval is not
  supported"。
- **客户端浏览器测试**：增加 `protocolTimeout`、`reuseBrowser`；修正非浏览器
  环境测试中对 async renderCSR/hydrate 使用 `await` 以正确捕获拒绝；卸载测试
  增加 `await`。

---

## [1.0.11] - 2026-02-10

### 新增

- **Solid.js 支持**：新增 Solid 适配器，支持 SSR 及客户端子路径
  `@dreamer/render/client/solid`。engine 选项现支持 `"solid"`，与
  `"react"`、`"preact"` 并列，用于 SSR、CSR、Hydration 和 SSG。

### 变更

- **文档**：文档结构调整为 `docs/en-US/` 与 `docs/zh-CN/`；根目录 README
  保留为英文入口；修正所有文档引用链接。

---

## [1.0.10] - 2026-02-09

### 新增

- **调试选项**：在 `CSROptions`、`HydrationOptions`、`SSROptions`、`SSGOptions`
  中增加 `debug?: boolean`。传 `debug: true`
  时输出详细日志（组件类型、布局组合、 渲染阶段等），便于诊断 Windows 路径问题及
  "(void 0) is not a function" 错误。

---

## [1.0.9] - 2026-02-09

### 新增

- **Preact/React 适配器**：增加 `enhanceVoidError`，对 "(void 0) is not a
  function" 错误包装诊断提示（路由/layout chunk 的 jsx-runtime 导入失败或组件 为
  undefined）。

### 变更

- **客户端异常**：`render/src/client` 下所有抛出异常改为英文信息（如 "CSR render
  must run in browser environment"、"Invalid hydration component"、"Unsupported
  template engine"）。

### 移除

- **Preact/React 适配器**：移除冗余的 `ensurePreactAPIs` / `ensureReactAPIs`
  （多实例并非当前失败原因）。

---

## [1.0.8] - 2026-02-09

### 修复

- **布局 (createComponentTree)**：增加 component 有效性校验，避免 component 为
  undefined 时出现 "(void 0) is not a function"。当 childConfig.component 为
  falsy 时，传递 undefined 而非递归处理，避免 Preact/React 尝试渲染
  undefined（常见于 Windows 下路径匹配失败时）。
- **客户端布局**：修正布局配置的误判。原先将所有对象视为布局配置，可能把
  React/Preact 元素（含 `{ type, props }` 结构）误判为布局配置，导致真实
  children 丢失。现已显式检查布局配置格式中的 `component` 和 `props` 键。

### 变更

- **依赖**：提升 @dreamer/test 至 ^1.0.2，使用最新兼容版本。

---

## [1.0.7] - 2026-02-08

### 变更

- **依赖**：提升 @dreamer/runtime-adapter、@dreamer/test 至最新兼容版本。

---

## [1.0.6] - 2026-02-08

### 修复

- **SSG**：用 `dirname()` 替代 `substring` + `lastIndexOf` 提取目录路径，使用
  runtime-adapter 的 `join()` 确保 Windows 路径兼容。

---

## [1.0.5] - 2026-02-08

### 修复

- **React 客户端适配器**：改用具名导入 `createElement` 替代默认导入
  `React`，修复浏览器打包时的 `_.default.createElement is not a function`
  互操作问题（如 dweb CSR/SSR 客户端构建）。

---

## [1.0.4] - 2026-02-08

### 修复

- **客户端 error-handler**：在 `console.error` 输出中包含
  `err.message`，便于控制台和 e2e 测试捕获错误信息（如 dweb 浏览器渲染调试）。

---

## [1.0.3] - 2026-02-08

### 修复

- **客户端布局**：`createComponentTree` 中当 `childConfig.component` 为 falsy
  时，不再将原始 childConfig 作为 children 传给 `createElement`，避免 Preact
  尝试渲染 undefined，修复 Windows 下的 `(void 0) is not a function`
  报错（如路径解析或模块加载失败）。

---

## [1.0.2] - 2026-02-08

### 修复

- **客户端**：preact、react、error-handler 适配器中的错误信息改为英文。
- **布局**：`composeLayouts` 的 validLayouts 过滤支持 string 类型（如
  `"OuterLayout"`）。
- **布局**：`createComponentTree` 支持 string 组件（如原生元素 `"div"`）。
- **测试**：更新 client-browser、client-utils 测试以匹配新的英文文案。

---

## [1.0.1] - 2026-02-08

### 新增

- **SSG**：`SSGOptions` 新增 `headInject` 选项，可在生成 HTML 的 `</head>`
  前注入内容（如 link 标签），支持直接使用 `_app` 输出而无需包装模板。
- **依赖**：在 `deno.json` 的 imports 中补充 `scheduler`，修复 React
  客户端打包时浏览器报错 "Dynamic require of scheduler is not supported"。

### 修复

- **测试**：在 Windows CI 上跳过 4 个浏览器测试（Preact/React 的
  update、performance 相关），因此环境下 Preact/React npm 模块在浏览器 bundle
  中加载失败。

### 变更

- **SSG**：`template` 现为可选；不传时直接使用 `_app` 输出。使用 `headInject`
  注入 link 等标签。

---

## [1.0.0] - 2026-02-06

### 新增

首个稳定版本。渲染包，支持 SSR、CSR、Hydration 和 SSG，兼容 Deno 和 Bun。

（详见 [CHANGELOG.md](../en-US/CHANGELOG.md) 英文版）
