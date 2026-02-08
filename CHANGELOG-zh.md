# 变更日志

本项目的重要变更将记录在此文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

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
