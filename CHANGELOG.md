# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

---

## [1.0.10] - 2026-02-09

### Added

- **Debug option**: Add `debug?: boolean` to `CSROptions`, `HydrationOptions`,
  `SSROptions`, and `SSGOptions`. When `debug: true`, detailed logs are emitted
  for CSR, hydration, and SSR (e.g. component type, layout composition, render
  phases). Helps diagnose Windows path issues and "(void 0) is not a function"
  errors.

---

## [1.0.9] - 2026-02-09

### Added

- **Preact/React adapters**: Add `enhanceVoidError` to wrap "(void 0) is not a
  function" with diagnostic hints (route/layout chunk jsx-runtime import or
  component undefined).

### Changed

- **Client exceptions**: All thrown exceptions in `render/src/client` now use
  English messages (e.g. "CSR render must run in browser environment",
  "Invalid hydration component", "Unsupported template engine").

### Removed

- **Preact/React adapters**: Remove redundant `ensurePreactAPIs` / `ensureReactAPIs`
  (multi-instance is not the cause of current failures).

---

## [1.0.8] - 2026-02-09

### Fixed

- **Layout (createComponentTree)**: Add component validation to prevent
  "(void 0) is not a function" when component is undefined. When
  childConfig.component is falsy, pass undefined instead of recursing to avoid
  Preact/React trying to render undefined (common when path matching fails on
  Windows).
- **Client layout**: Fix incorrect detection of layout config. Previously it
  treated any object as layout config, which could misidentify React/Preact
  elements (with `{ type, props }`) as layout config and lose real children. Now
  explicitly checks for `component` and `props` keys in the layout config
  format.

### Changed

- **Dependencies**: Bump @dreamer/test to ^1.0.2 for latest compatible version.

---

## [1.0.7] - 2026-02-08

### Changed

- **Dependencies**: Bump @dreamer/runtime-adapter and @dreamer/test to ensure
  latest compatible versions are used.

---

## [1.0.6] - 2026-02-08

### Fixed

- **SSG**: Replace `substring` + `lastIndexOf` with `dirname()` for directory
  path extraction. Use `join()` from runtime-adapter for Windows path
  compatibility.

---

## [1.0.5] - 2026-02-08

### Fixed

- **React client adapter**: Use named import `createElement` instead of default
  import `React` to fix `_.default.createElement is not a function` interop
  issue when bundling for browser (e.g. dweb CSR/SSR client builds).

---

## [1.0.4] - 2026-02-08

### Fixed

- **Client error-handler**: Include `err.message` in `console.error` output so
  error text is visible in console and e2e test capture (e.g. dweb
  browser-render debugging).

---

## [1.0.3] - 2026-02-08

### Fixed

- **Client layout**: When `childConfig.component` is falsy in
  `createComponentTree`, do not pass raw childConfig to `createElement` as
  children. Prevents Preact from attempting to render undefined, fixing
  `(void 0) is not a function` on Windows (e.g. path resolution or module load
  failure).

---

## [1.0.2] - 2026-02-08

### Fixed

- **Client**: Replace Chinese error messages with English in preact, react,
  error-handler adapters.
- **Layout**: Allow string type in `composeLayouts` validLayouts filter (e.g.
  `"OuterLayout"`).
- **Layout**: Allow string component in `createComponentTree` for native
  elements like `"div"`.
- **Tests**: Update client-browser and client-utils tests to match new English
  messages.

---

## [1.0.1] - 2026-02-08

### Added

- **SSG**: `headInject` option in `SSGOptions` to inject content (e.g. link
  tags) before `</head>` in generated HTML. Enables using `_app` output directly
  without wrapping template.
- **Dependencies**: Added `scheduler` to `deno.json` imports to fix browser
  "Dynamic require of scheduler is not supported" when bundling React client.

### Fixed

- **Tests**: Skip 4 browser tests (Preact/React update, performance metrics) on
  Windows CI where Preact/React npm modules fail to load in browser bundle.

### Changed

- **SSG**: `template` is now optional; when omitted, `_app` output is used
  directly. Use `headInject` for link tags.

---

## [1.0.0] - 2026-02-06

### Added

First stable release. Rendering library for SSR, CSR, Hydration, and SSG,
compatible with Deno and Bun.

#### Server Rendering (@dreamer/render)

- **Server-Side Rendering (SSR)**
  - Render components to HTML on server
  - Streaming support (React, Preact)
  - HTML template wrapping
  - Metadata management
  - Server data injection via `load`
  - Layout system (single and nested)
  - Script extraction and injection
- **Static Site Generation (SSG)**
  - Pre-render routes to static HTML at build time
  - Multi-route generation
  - Dynamic route expansion
  - Auto sitemap.xml and robots.txt
- **Advanced features**
  - Metadata (static, sync, async)
  - Layout system with `inheritLayout = false` to skip
  - Metadata cache, compression, lazy-loading
  - Context API
- **Helpers**: `generateSitemap()`, `generateRobots()`, `expandDynamicRoute()`

#### Client Rendering (@dreamer/render/client)

- **Client-Side Rendering (CSR)**
  - Render to DOM in browser
  - Unmount and update functions
  - Performance monitoring
  - Error handling with fallback
  - Layout system
- **Hydration**
  - Connect SSR HTML with client JS
  - Restore interactivity
  - React strict mode support
  - Performance monitoring and error handling
- **Client adapters**
  - `@dreamer/render/client/preact`
  - `@dreamer/render/client/react`

#### Template Engine Support

- React 18+
- Preact 10+
- Unified render API across engines

#### Environment Compatibility

- Deno 2.5+
- Bun 1.0+
- Browser: CSR and Hydration
- React 18+, Preact 10+

#### Testing

- 203 tests, all passing
- Covers server adapters, client browser, layout, SSG, SSR, utils
- Deno and Bun runtime compatible
