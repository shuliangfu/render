# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

---

## [1.0.5] - 2026-02-08

### Fixed

- **React client adapter**: Use named import `createElement` instead of default import `React` to fix `_.default.createElement is not a function` interop issue when bundling for browser (e.g. dweb CSR/SSR client builds).

---

## [1.0.4] - 2026-02-08

### Fixed

- **Client error-handler**: Include `err.message` in `console.error` output so error text is visible in console and e2e test capture (e.g. dweb browser-render debugging).

---

## [1.0.3] - 2026-02-08

### Fixed

- **Client layout**: When `childConfig.component` is falsy in `createComponentTree`, do not pass raw childConfig to `createElement` as children. Prevents Preact from attempting to render undefined, fixing `(void 0) is not a function` on Windows (e.g. path resolution or module load failure).

---

## [1.0.2] - 2026-02-08

### Fixed

- **Client**: Replace Chinese error messages with English in preact, react, error-handler adapters.
- **Layout**: Allow string type in `composeLayouts` validLayouts filter (e.g. `"OuterLayout"`).
- **Layout**: Allow string component in `createComponentTree` for native elements like `"div"`.
- **Tests**: Update client-browser and client-utils tests to match new English messages.

---

## [1.0.1] - 2026-02-08

### Added

- **SSG**: `headInject` option in `SSGOptions` to inject content (e.g. link tags) before `</head>` in generated HTML. Enables using `_app` output directly without wrapping template.
- **Dependencies**: Added `scheduler` to `deno.json` imports to fix browser "Dynamic require of scheduler is not supported" when bundling React client.

### Fixed

- **Tests**: Skip 4 browser tests (Preact/React update, performance metrics) on Windows CI where Preact/React npm modules fail to load in browser bundle.

### Changed

- **SSG**: `template` is now optional; when omitted, `_app` output is used directly. Use `headInject` for link tags.

---

## [1.0.0] - 2026-02-06

### Added

First stable release. Rendering library for SSR, CSR, Hydration, and SSG, compatible with Deno and Bun.

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
