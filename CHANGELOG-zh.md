# 变更日志

本项目的重要变更将记录在此文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

---

## [1.0.7] - 2026-02-08

### 变更

- **依赖**：提升 @dreamer/runtime-adapter、@dreamer/test 至最新兼容版本。

---

## [1.0.6] - 2026-02-08

### 修复

- **SSG**：用 `dirname()` 替代 `substring` + `lastIndexOf` 提取目录路径，使用 runtime-adapter 的 `join()` 确保 Windows 路径兼容。

---

## [1.0.5] - 2026-02-08

### 修复

- **React 客户端适配器**：改用具名导入 `createElement` 替代默认导入 `React`，修复浏览器打包时的 `_.default.createElement is not a function` 互操作问题（如 dweb CSR/SSR 客户端构建）。

---

## [1.0.4] - 2026-02-08

### 修复

- **客户端 error-handler**：在 `console.error` 输出中包含 `err.message`，便于控制台和 e2e 测试捕获错误信息（如 dweb 浏览器渲染调试）。

---

## [1.0.3] - 2026-02-08

### 修复

- **客户端布局**：`createComponentTree` 中当 `childConfig.component` 为 falsy 时，不再将原始 childConfig 作为 children 传给 `createElement`，避免 Preact 尝试渲染 undefined，修复 Windows 下的 `(void 0) is not a function` 报错（如路径解析或模块加载失败）。

---

## [1.0.2] - 2026-02-08

### 修复

- **客户端**：preact、react、error-handler 适配器中的错误信息改为英文。
- **布局**：`composeLayouts` 的 validLayouts 过滤支持 string 类型（如 `"OuterLayout"`）。
- **布局**：`createComponentTree` 支持 string 组件（如原生元素 `"div"`）。
- **测试**：更新 client-browser、client-utils 测试以匹配新的英文文案。

---

## [1.0.1] - 2026-02-08

### 新增

- **SSG**：`SSGOptions` 新增 `headInject` 选项，可在生成 HTML 的 `</head>` 前注入内容（如 link 标签），支持直接使用 `_app` 输出而无需包装模板。
- **依赖**：在 `deno.json` 的 imports 中补充 `scheduler`，修复 React 客户端打包时浏览器报错 "Dynamic require of scheduler is not supported"。

### 修复

- **测试**：在 Windows CI 上跳过 4 个浏览器测试（Preact/React 的 update、performance 相关），因此环境下 Preact/React npm 模块在浏览器 bundle 中加载失败。

### 变更

- **SSG**：`template` 现为可选；不传时直接使用 `_app` 输出。使用 `headInject` 注入 link 等标签。

---

## [1.0.0] - 2026-02-06

### 新增

首个稳定版本。渲染库，支持 SSR、CSR、Hydration 和 SSG，兼容 Deno 和 Bun。

（详见 [CHANGELOG.md](./CHANGELOG.md) 英文版）
