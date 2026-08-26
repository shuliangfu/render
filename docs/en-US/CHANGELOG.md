# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

---

## [1.3.0] - 2026-08-26

### Added

- **`renderSSRStream`** — view-only true streaming SSR returning
  `StreamRenderResult { body: ReadableStream<Uint8Array> }` (no `html` string).
  Head injects flush at `</head>`; body scripts splice before `</body>` via
  `utils/html-stream-inject.ts`. React/Preact must keep using `renderSSR()`.
- **`StreamRenderResult` type** exported from the package entry.
- View adapter **`renderSSRToStream`**: undrained `renderToStream` path
  (optional template outlet / body wrap); existing `renderSSR` + `stream: true`
  still drains to a string.

### Changed

- **`SSROptions.stream` JSDoc**: clarified as buffered drain-to-string; prefer
  `renderSSRStream` for a ReadableStream.
- README: streaming notes — view-only pipe; View stream is coarse (full snapshot
  then optional re-renders); **not** Suspense selective streaming.

---

## [1.2.0] - 2026-07-23

### Added

- **Node.js 22+ compatibility** — `@dreamer/render` now runs on Deno 2.9+, Bun
  1.3+, and Node.js 22+.
  - `package.json`: `engines.node >= 22`, `test:node` script via tsx.
  - `test-node.mjs`: Node test runner — each file runs in the main process (no
    `--test` fork/IPC), avoiding "Unable to deserialize cloned data" when tests
    write to stdout. Browser tests excluded.
  - `tsconfig.json`: Bundler module resolution + `dom` lib for cross-runtime
    type consistency.
  - CI: 9-job matrix (3 Deno v2.9 + 3 Bun + 3 Node 22, no Chromium).

### Changed

- **Dependencies**: `@dreamer/view` bumped `^2.1.0` → `^2.2.0`
  (Node-compatible); `@dreamer/runtime-adapter` `^1.2.2`; `@dreamer/test`
  `^1.2.3`; `@dreamer/i18n` `^1.1.2` — synced across `deno.json` and
  `package.json`. Added `happy-dom` to `package.json` devDependencies (was
  missing, caused Node test failures).
- **`dom-setup-happy-dom.ts`**: replaced direct `globalThis.X = value`
  assignments with `Object.defineProperty`. Node 21+ has a read-only `navigator`
  global (getter-only), so direct assignment throws `TypeError`.
  `defineProperty` works uniformly across Deno / Bun / Node.

### Tests

- **Deno** 266 passed / 0 failed; **Bun** 249 pass / 0 fail / 14 files;
  **Node.js 22** 12/12 files passed — 0 failures across all three runtimes.
- Browser tests (`client-browser.test.ts`, `adapters-view-client.test.ts`)
  excluded from Node CI (require Playwright/Chromium).

---

## [1.1.8] - 2026-05-08

### Fixed

- **Dependencies**: align React and react-dom caret ranges to `^19.2.6` in
  `deno.json` and `package.json`, preventing React 19 runtime version mismatch
  errors when Deno resolves CLI or SSR dependency graphs.

---

## [1.1.7] - 2026-04-21

### Changed

- **Dependencies**: bump `@dreamer/test` to `^1.1.8`; React / react-dom
  `^19.2.5`; scheduler `^0.27.0`; Preact `^10.29.1`; preact-render-to-string
  `^6.6.7`; happy-dom `^20.9.0` (`deno.json` imports); align semver caret ranges
  in `package.json` for the same npm stack.

---

## [1.1.6] - 2026-04-20

### Changed

- **Dependencies**: **`@dreamer/view`** **`^2.0.2`** in **`deno.json`** and
  **`package.json`**; **`@dreamer/test`** **`^1.1.6`** in **`deno.json`**
  (imports) and **`package.json`** (**`devDependencies`**).

### Fixed

- **`tests/ssr-comprehensive.test.ts`**: Expect tagged **`<title>`** HTML
  (**`DWEB_ROUTE_META_ATTR`**) consistent with SSR metadata injection.
- **`tests/client-browser.test.ts`**: Combine export checks and performance
  monitor usage in **one** **`browser.evaluate`** to avoid intermittent **60s**
  timeouts from a second evaluation when **`reuseBrowser`** is enabled
  (Playwright/CDP).

---

## [1.1.5] - 2026-04-20

### Added

- **Main entry (`src/mod.ts`)**: Export **`DWEB_ROUTE_META_ATTR`**,
  **`generateRouteMetaTagsWithoutTitle`**, and **`generateRouteTitleTag`** from
  `./utils/metadata.ts` for downstream bundlers (Bun/npm) that resolve the
  package entry.

### Changed

- **SSR (`src/ssr.ts`)**: Head injection uses two steps — route `<meta>` HTML
  (without `<title>`) first, then the tagged `<title>`, so the DOM order keeps
  all route metas before the title (aligned with hybrid client navigation).
- **Metadata (`src/utils/metadata.ts`)**: Route-level `<meta>` / `<title>`
  output includes **`data-dweb-route-meta="1"`** for replaceable route meta
  during client-side navigation; split APIs
  **`generateRouteMetaTagsWithoutTitle`** / **`generateRouteTitleTag`**;
  **`generateMetaTags`** remains and composes the same combined string as
  before.

### Breaking

- **`LoadContext`** (`src/types.ts`): **`request`** renamed to **`req`**
  (optional **`Request`**), aligned with **@dreamer/dweb** and file-route
  naming. Update call sites that read **`loadContext.request`**.

---

## [1.1.4] - 2026-04-06

### Changed

- **@dreamer/view**: Bumped to **`^2.0.0`** in **`deno.json`**
  (`jsr:@dreamer/view@^2.0.0`) and **`package.json`**
  (`npm:@jsr/dreamer__view@^2.0.0`). View **v2** drops npm **`./csr`** /
  **`./hybrid`** convenience exports; this package now imports **`mount`**,
  **`hydrate`**, **`createRoot`**, **`insert`**, **`internalHydrate`**, and
  **`stopHydration`** from the **main** `@dreamer/view` entry where required.
- **@dreamer/test**: **`^1.1.1`** in **`deno.json`** and **`package.json`**
  **`devDependencies`**.
- **View SSR** (`src/adapters/view.ts`): **`renderToString`** /
  **`renderToStream`** (`@dreamer/view/ssr`) now receive a **root thunk**
  **`() => VNode`** (no **`(container) => void`** mount callback). Streaming
  HTML is assembled by reading the **`ReadableStream`** from
  **`renderToStream(rootFn)`** with **`TextDecoder`**.
- **View client — full** (`src/client/adapters/view.ts`): CSR uses
  **`mount(() => VNode, container)`** (returns **dispose**); hydration uses
  **`hydrate(() => VNode, container, bindings)`** with **`[]`** when no binding
  map. **`createReactiveRoot`** uses **`createRoot`** + **`insert`**.
  **`createReactiveRootHydrate`** uses **`stopHydration`**,
  **`internalHydrate(container, [])`**, then **`insert`**.
  **`viewCreateElement`** types use **`JSXElementType`**.
- **View client — CSR** (`src/client/adapters/view-csr.ts`): **`mount`** from
  **`@dreamer/view`** replaces **`@dreamer/view/csr`** **`createRoot`** +
  **`insert`** wrapper pattern.
- **View client — hybrid** (`src/client/adapters/view-hybrid.ts`): **`hydrate`**
  / **`mount`** from **`@dreamer/view`**; removes **`@dreamer/view/hybrid`** and
  **`@dreamer/view/compiler`** **hydrate** imports for this path.
- **`deno.json`**: **`compilerOptions.jsx`**: **`react-jsx`**,
  **`jsxImportSource`**: **`@dreamer/view`**; **`happy-dom`** in **`imports`**
  for test DOM shims.

### Tests

- **`tests/dom-setup-happy-dom.ts`**: Installs **happy-dom** **`Window`** /
  **`document`** (and common DOM globals) so Deno can run SSR tests that
  evaluate View **Thunk**s calling **`document.createElement`**.
- **`tests/adapters-view.test.ts`**, **`tests/ssr.test.ts`**: Import the DOM
  setup module; relax sanitizer options on the View adapter suite where needed.
- **`tests/adapters-view-client.test.ts`**: Expect **`buildViewTree`** roots to
  be **Thunk**s (**`typeof vnode === "function"`**); assert layout nesting via
  **`composeLayouts`** instead of **`{ type, props }`** VNode shape.

### Breaking (integration)

- **Downstream View apps** must depend on **@dreamer/view ≥ 2.0.0** with this
  release. If you pinned **view 1.x** mount APIs (**`fn(container) + insert`**
  for **`renderToString`**), migrate to **view 2** SSR/client signatures as
  reflected in the adapters above.

---

## [1.1.3] - 2026-03-26

### Changed

- **@dreamer/view**: Bumped to **`^1.3.7`** in **`deno.json`**
  (`jsr:@dreamer/view@^1.3.7`) and **`package.json`**
  (`npm:@jsr/dreamer__view@^1.3.7`), aligned with **@dreamer/view v1.3.7**
  (upstream compiler/runtime fixes and features; see the view changelog).
- **`package.json` (npm)**: **`@dreamer/view`**, **React**, **Preact**,
  **`preact-render-to-string`**, **`react-dom`**, and **`scheduler`** are listed
  under **`dependencies`**; the previous **`peerDependencies`** block was
  removed so **`npm install`** resolves these without a separate peer step.
  **`@dreamer/view`** is no longer duplicated under **`devDependencies`**.
- **CI** (`.github/workflows/ci.yml`): Set workflow
  **`FORCE_JAVASCRIPT_ACTIONS_TO_NODE24`** for Actions using Node 24.

---

## [1.1.2] - 2026-03-21

### Changed

- **@dreamer/view (v1.3.x)**: Require **`^1.3.1`** (`peerDependencies` and
  `deno.json` imports). Aligns with view **v1.3** **`fn(container) + insert`**
  roots: **`createRoot`**, **`hydrate`**, and **`renderToString`** expect a
  **mount function** **`(container) => void`** that calls
  **`insert(container, () => VNode)`**, not a bare VNode factory.

### Refactored

- **View SSR** (`src/adapters/view.ts`): Use **`renderToString`** /
  **`renderToStream`** from **`@dreamer/view/ssr`**, **`insert`** from
  **`@dreamer/view`**. Stream and string paths wrap
  **`(c) => insert(c,
  rootFn)`**; narrow casts use
  **`Parameters<typeof insert>[0]`** where JSR vs npm type graphs would
  otherwise disagree.

### Fixed

- **View client** (`view.ts`, `view-csr.ts`, `view-hybrid.ts`): CSR / hydrate /
  hot-swap / error fallbacks use mount-fn + **`insert`**; **`hydrate`** from
  **`@dreamer/view/compiler`**.
- **`createReactiveRoot` / `createReactiveRootHydrate`**: Implemented in
  **`client/adapters/view.ts`** with **`createRoot`/`hydrate` + insert** (view
  removed built-ins); **`view-hybrid`** re-exports from **`./view.ts`**.
- Removed debug **`console.log`** from view hydrate paths.
- **Tests**: Hydration fixtures use wrapper **`div`**; **`hydrate().unmount()`**
  expectations match view (**effects off, SSR HTML kept**).

### Note

- **`SSROptions.options` (View)**: No longer forwarded into view
  **`renderToString` / `renderToStream`**. Migrate if you relied on that.

---

## [1.1.1] - 2026-03-14

### Changed

- **Dependencies**: Bumped @dreamer/view to ^1.1.4 for compatibility with view
  v1.1.4 (unified escape, getCreateRootDeps, directive-name, performance
  optimizations, and store/proxy subscriber cleanup fix).

---

## [1.1.0] - 2026-03-12

### Changed

- **Dependencies**: Bumped @dreamer/view to ^1.1.3 for compatibility with view
  dynamic-child single-node optimization (no wrapper span).

---

## [1.0.41] - 2026-02-25

### Changed

- **Dependencies**: Updated related dependencies for compatibility.

---

## [1.0.40] - 2026-02-25

### Changed

- **Dependencies**: Bumped @dreamer/view dependency for compatibility.

---

## [1.0.39] - 2026-02-22

### Added

- **JSR publish**: Include `package.json` in published JSR package so Bun and
  npm consumers can read `peerDependencies` (Preact, React, etc.) and avoid
  duplicate runtime instances when using `bun add jsr:@dreamer/render` or future
  npm installs.

---

## [1.0.38] - 2026-02-21

### Added

- **Client exports**: New subpaths `@dreamer/render/client/view-csr` and
  `@dreamer/render/client/view-hybrid`. `view-csr`: View adapter for CSR only
  (imports from `@dreamer/view/csr`), smaller bundle when hydration is not
  needed. `view-hybrid`: View adapter for hybrid apps (imports from
  `@dreamer/view/hybrid`) with `hydrate` and `createReactiveRootHydrate` for
  first-paint hydration and subsequent patch.
- **view adapter**: Re-export `createReactiveRootHydrate` from `@dreamer/view`
  for state-driven roots that hydrate on first paint then patch on the same
  root. Debug: `hydrate()` logs once when called to confirm the hydration path.

### Changed

- **Dependencies**: Bumped @dreamer/view to ^1.0.30.

---

## [1.0.37] - 2026-02-20

### Changed

- **Dependencies**: Bumped @dreamer/view to ^1.0.29.

---

## [1.0.36] - 2026-02-20

### Changed

- **Dependencies**: Bumped @dreamer/view to ^1.0.28.

---

## [1.0.35] - 2026-02-19

### Changed

- **Dependencies**: Bumped @dreamer/view to ^1.0.27.

---

## [1.0.34] - 2026-02-19

### Changed

- **i18n**: i18n now initializes automatically when the i18n module is loaded;
  `initRenderI18n` is no longer exported. Removed explicit `initRenderI18n()`
  call from `mod.ts`. `$tr` still ensures init when called.
- **Dependencies**: Bumped @dreamer/runtime-adapter, @dreamer/test,
  @dreamer/view.

---

## [1.0.33] - 2026-02-19

### Changed

- **i18n**: Renamed translation method from `$t` to `$tr` to avoid conflict with
  global `$t`. Update existing code to use `$tr` for package messages.

### Fixed

- **Bun compatibility**: React fixture now imports `createElement` from the
  client adapter so the same React instance is used (avoids double-React under
  Bun where `root.render()` would not update DOM). React adapter re-exports
  `createElement` for fixture and callers. View fixture uses
  `@dreamer/view/jsx-runtime` instead of `jsr:` URL so Bun resolver can resolve.

---

## [1.0.32] - 2026-02-18

### Changed

- **Dependencies**: Updated `@dreamer/view` to ^1.0.21.

---

## [1.0.31] - 2026-02-18

### Changed

- **Dependencies**: Updated related dependencies (e.g. `@dreamer/view` to
  ^1.0.20).

---

## [1.0.30] - 2026-02-18

### Changed

- **Dependencies**: Updated `@dreamer/view` to ^1.0.19.

---

## [1.0.29] - 2026-02-18

### Changed

- **i18n**: Init at entry only; `initRenderI18n()` is called once in `mod.ts`.
  `$t()` no longer calls `ensureRenderI18n()` or sets locale internally.

---

## [1.0.28] - 2026-02-17

### Added

- **Server-side i18n:** Optional `lang` on `SSROptions` and `SSGOptions`; when
  omitted, locale is auto-detected from env (LANGUAGE/LC_ALL/LANG). New
  `i18n.ts`, `detectLocale()`, `ensureRenderI18n()`, `$t()`; locales
  `en-US.json` and `zh-CN.json` for error and log messages.
- **Error/log translation:** SSR/SSG errors, error-handler messages,
  generateErrorHTML title, server-data/performance/compression console messages,
  and View/Preact adapter fallback-failure messages use `$t`.

### Changed

- **Error handler:** `handleRenderError` and `generateErrorHTML` accept optional
  `lang`; all user-facing strings use locale keys.
- **Adapters (View, Preact):** Fallback render failure throws use
  `$t("error.viewSsrFailed" | "error.preactSsrFailed", { message }, locale)`;
  `handleRenderError` is called with `options.lang`.

---

## [1.0.27] - 2026-02-17

### Added

- **SSG:** Query-style dynamic route expansion (e.g. `/user?id=[id]` →
  `/user?id=1`, `/user?id=2`).
- **SSG:** `routeToFilePath(route)` to map route (pathname or pathname?search)
  to output file path; query routes use `path/__q_key_value.html`.
- **SSG:** `filePathToRoute(filePath)` as the inverse of `routeToFilePath` for
  serving and hydration.

### Changed

- **SSG:** `expandDynamicRoute` now supports placeholders in query string;
  `renderSSG` uses `routeToFilePath` for output paths.
- **Tests:** 252 tests; new tests for `routeToFilePath`, `filePathToRoute`, and
  query-form `expandDynamicRoute`. zh-CN TEST_REPORT fully translated.

---

## [1.0.26] - 2026-02-17

### Changed

- **Docs:** JSDoc and all comments rewritten in English across the package.
- **Dependencies:** `@dreamer/view` set to `^1.0.15`.

---

## [1.0.25] - 2026-02-16

### Changed

- **Dependencies:** Bump `@dreamer/view` to `^1.0.14`.

---

## [1.0.24] - 2026-02-16

### Changed

- **Dependencies:** Bump `@dreamer/view` to `^1.0.12`, and update
  `@dreamer/test` and `@dreamer/runtime-adapter` to latest compatible versions.

---

## [1.0.23] - 2026-02-15

### Changed

- **Dependencies:** Bump `@dreamer/view` to `^1.0.11` (isEmptyChild helper; skip
  rendering `false` and `""` in JSX children in both client and SSR).

---

## [1.0.21] - 2026-02-15

### Changed

- **Dependencies**: Bump `@dreamer/view` to `^1.0.9` (input value fix with
  vIf/vShow directives, extended unit tests).

---

## [1.0.20] - 2026-02-15

### Changed

- **Dependencies**: Bump `@dreamer/view` to `^1.0.8` (SSR no longer outputs
  plain function source as HTML; input keeps focus when getter returns single
  Fragment).

---

## [1.0.19] - 2026-02-13

### Changed

- **Dependencies**: Bump `@dreamer/view` to `^1.0.7` (input focus fix in dynamic
  getters, context/Provider DOM updates in patch).

---

## [1.0.18] - 2026-02-13

### Changed

- **Dependencies**: Bump `@dreamer/view` to `^1.0.5` for compatibility with dweb
  init and @dreamer/esbuild resolver (project deno.json version takes
  precedence).

---

## [1.0.17] - 2026-02-15

### Fixed

- **View client adapter** (`src/client/adapters/view.ts`): In
  `viewCreateElement`, do not overwrite `props.children` with `undefined` when
  children are only passed via the second argument (e.g. when
  `createComponentTree` calls
  `createElement(Layout, { children: childElement })` with no third argument).
  Use `resolvedChildren = fromArgs !== undefined ? fromArgs : rest.children` so
  layout receives page VNode and main content renders.

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
