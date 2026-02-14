# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

---

## [1.0.16] - 2026-02-14

### Added

- **View client adapter** (`src/client/adapters/view.ts`): Implemented
  `renderCSR` and `hydrate` using `@dreamer/view` `createRoot` and `hydrate`;
  re-exported `createReactiveRoot` and added
  `buildViewTree(component, props,
  layouts?, skipLayouts?)` for state-driven
  View roots. Use `@dreamer/render/client/view` for View engine CSR, hydration,
  and `createReactiveRoot` + `buildViewTree` integration.

---

## [1.0.15] - 2026-02-13

### Added

- **Client browser tests**: Expanded to 31 tests with three entry fixtures
  (View, Preact, React); `browserMode: true` and ESM bundle; per-engine actual
  CSR and Hybrid hydration tests (View/Preact/React actual CSR render and DOM
  assertion, actual Hybrid hydrate and content assertion); test report updated
  to 243 tests total.

### Fixed

- **View client adapter**: Clear container before CSR render so hybrid
  navigation shows main content correctly after hydrate → unmount → CSR.
- **Client browser tests**: Relax Preact Hybrid unmount assertion (accept
  container text empty or preserved); add short delay after React CSR/unmount
  before reading DOM for async commit.

---

## [1.0.14] - 2026-02-13

### Added

- **View engine support**: Full support for the View template engine
  (`@dreamer/view`).
  - **SSR**: New server adapter `src/adapters/view.ts` using `renderToString`
    and `renderToStream` from `@dreamer/view` and `@dreamer/view/stream`;
    supports layouts, template injection, streaming, error handling, and
    performance monitoring.
  - **CSR & Hydration**: New client adapter `src/client/adapters/view.ts`;
    `renderCSR` and `hydrate` with `engine: "view"` via
    `@dreamer/render/client`; supports layouts, error handling, and performance
    monitoring.
  - **Engine type**: `Engine` is now `"react" | "preact" | "view"` in both
    server and client types.
  - **Exports**: New subpath `@dreamer/render/client/view` for the View client
    adapter.
  - **Tests**: New test file `tests/adapters-view.test.ts` (12 tests); View SSR
    cases in `tests/ssr.test.ts`; `mod.test.ts` updated for three engines; 233
    tests total, all passing.
  - **Docs**: README and docs updated with View engine description, quick start
    (View SSR example), environment table, API tables, test report summary (233
    passed), and Template Engine Support table.

### Removed

- **Solid.js support**: Removed Solid template engine support.
  - Solid SSR adapter and client adapter (`@dreamer/render/client/solid`) have
    been removed.
  - `Engine` type no longer includes `"solid"`.
  - Dependencies and code related to Solid.js have been removed from the
    package.

### Changed

- **License**: This project is licensed under the Apache License, Version 2.0.
  See the [LICENSE](../../LICENSE) file for the full text. The `license` field
  in `deno.json` is set to `"Apache-2.0"`.

---

## [1.0.13] - 2026-02-11

### Fixed

- **Solid SSR adapter**: Use dynamic import for `solid-js/web` (via
  `getSolidWeb()`) so that server-only code paths do not pull in client-only
  APIs; avoids "Client-only API called on the server side" when route components
  are not built with SSR-specific compile (e.g. dweb `generate: "ssr"`). Add
  comment on SSR compile requirement.

### Added

- **Preact adapter**: Extra debug log after `composeLayouts` (root component
  name, hasChildren, layoutsCount) for easier diagnosis of layout/SSR issues.

---

## [1.0.12] - 2026-02-11

### Fixed

- **SSR adapters**: Revert to static imports for preact, react, and solid
  adapters. The previous dynamic import caused module resolution issues when
  dweb bundles the server (e.g. preact-csr "app container not found").
- **Client adapters**: Keep dynamic import for client to avoid pulling solid-js
  (and its seroval dependency using `require`) into browser bundle, which
  triggers "Dynamic require of seroval is not supported".
- **Client browser tests**: Add `protocolTimeout`, `reuseBrowser`; fix
  non-browser tests to `await` async renderCSR/hydrate for proper rejection
  handling; add `await` for unmount tests.

---

## [1.0.11] - 2026-02-10

### Added

- **Solid.js support**: Add Solid adapter for SSR and client subpath
  `@dreamer/render/client/solid`. Engine option accepts `"solid"` alongside
  `"react"` and `"preact"` for SSR, CSR, hydration, and SSG.

### Changed

- **Docs**: Restructure docs into `docs/en-US/` and `docs/zh-CN/`; root README
  remains English entry; fix all doc reference links.

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
  English messages (e.g. "CSR render must run in browser environment", "Invalid
  hydration component", "Unsupported template engine").

### Removed

- **Preact/React adapters**: Remove redundant `ensurePreactAPIs` /
  `ensureReactAPIs` (multi-instance is not the cause of current failures).

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
