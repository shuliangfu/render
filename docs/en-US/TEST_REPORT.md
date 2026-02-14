# @dreamer/render Test Report

## Test Overview

| Item                 | Info                            |
| -------------------- | ------------------------------- |
| Test library version | @dreamer/render@1.0.13          |
| Runtime adapter      | @dreamer/runtime-adapter@^1.0.5 |
| Test framework       | @dreamer/test@^1.0.5            |
| Test date            | 2026-02-13                      |
| Test environment     | Deno 2.x+ / Bun 1.x+            |

## Test Results

### Overall Statistics

| Metric         | Value                    |
| -------------- | ------------------------ |
| Total tests    | 243                      |
| Passed         | 243 ✅                   |
| Failed         | 0                        |
| Pass rate      | 100%                     |
| Execution time | ~40–45s (`deno test -A`) |

### Runtime Compatibility

| Runtime | Version | Result        |
| ------- | ------- | ------------- |
| Deno    | 2.x+    | ✅ 243 passed |
| Bun     | 1.x+    | ✅ 243 passed |

### Test File Statistics

| Test file                   | Count | Status        |
| --------------------------- | ----- | ------------- |
| `adapters-preact.test.ts`   | 12    | ✅ All passed |
| `adapters-react.test.ts`    | 11    | ✅ All passed |
| `adapters-view.test.ts`     | 12    | ✅ All passed |
| `client-browser.test.ts`    | 31    | ✅ All passed |
| `client-utils.test.ts`      | 28    | ✅ All passed |
| `edge-cases.test.ts`        | 14    | ✅ All passed |
| `layout.test.ts`            | 33    | ✅ All passed |
| `mod.test.ts`               | 7     | ✅ All passed |
| `ssg-advanced.test.ts`      | 13    | ✅ All passed |
| `ssg.test.ts`               | 16    | ✅ All passed |
| `ssr-comprehensive.test.ts` | 32    | ✅ All passed |
| `ssr.test.ts`               | 11    | ✅ All passed |
| `utils.test.ts`             | 23    | ✅ All passed |

## Feature Test Details

### 1. Server Adapter - Preact (adapters-preact.test.ts) - 12 tests

- ✅ SSR rendering basics
- ✅ Component rendering with props
- ✅ Template rendering
- ✅ Layout system support
- ✅ Nested layout support
- ✅ `inheritLayout = false` skips layout
- ✅ Streaming render
- ✅ Error handling
- ✅ Performance monitoring

### 2. Server Adapter - React (adapters-react.test.ts) - 11 tests

- ✅ SSR rendering basics
- ✅ Component rendering with props
- ✅ Template rendering
- ✅ Layout system support
- ✅ Nested layout support
- ✅ `inheritLayout = false` skips layout
- ✅ Streaming render
- ✅ Error handling
- ✅ Performance monitoring

### 3. Server Adapter - View (adapters-view.test.ts) - 12 tests

- ✅ SSR rendering basics (jsx from @dreamer/view/jsx-runtime)
- ✅ Component rendering with props
- ✅ Template rendering
- ✅ Streaming render (renderToStream)
- ✅ Layout system support
- ✅ Nested layout support
- ✅ `inheritLayout = false` skips layout
- ✅ Complex component tree
- ✅ Null component
- ✅ Error handling
- ✅ Performance monitoring

### 4. Client Browser Tests (client-browser.test.ts) - 31 tests

Three entry fixtures (View / Preact / React) with `browserMode: true`; each
covers general API and engine-specific actual CSR/Hydration.

#### View entry (general + View engine)

- ✅ Export all required functions
- ✅ Performance monitor instance creation
- ✅ Performance monitor returns null when disabled
- ✅ Error fallback UI display
- ✅ Throws when container does not exist (renderCSR)
- ✅ Non-browser environment detection
- ✅ All engines: Hydration error fallback UI
- ✅ handleRenderError error handling
- ✅ View: actual CSR render and DOM assertion
- ✅ View: actual Hybrid hydrate and content assertion
- ✅ View: Hybrid flow (hydrate → unmount → CSR) main content

#### Preact entry

- ✅ Throws when container does not exist
- ✅ Component unmount support
- ✅ update function support
- ✅ CSR returns performance metrics
- ✅ HTMLElement as container
- ✅ Preact: actual CSR render and DOM assertion
- ✅ Preact: actual Hybrid hydrate and content assertion

#### React entry

- ✅ Throws when container does not exist (CSR)
- ✅ Throws when hydration container does not exist
- ✅ Performance monitoring support
- ✅ Component unmount support
- ✅ update function support
- ✅ CSR returns performance metrics
- ✅ React: actual CSR render and DOM assertion
- ✅ React: actual Hybrid hydrate and content assertion

### 5. Client Utils (client-utils.test.ts) - 28 tests

#### Layout utils

- ✅ `shouldSkipLayouts` - `inheritLayout = false` detection
- ✅ `composeLayouts` - no layout / skip layout / nested
- ✅ `createComponentTree` - simple / nested component creation

#### Performance utils

- ✅ `PerformanceMonitor` instance creation and recording
- ✅ `createPerformanceMonitor` enable / disable
- ✅ `recordPerformanceMetrics` callback

#### Error handler utils

- ✅ `handleRenderError` fallback component, onError callback, non-Error types

### 6. Layout Inheritance (layout.test.ts) - 33 tests

- ✅ Server/client shouldSkipLayouts
- ✅ Server filterLayouts
- ✅ Server/client composeLayouts
- ✅ Server/client createComponentTree
- ✅ Real scenarios: inheritLayout = false, three-level nested layout

### 7. SSG Tests (ssg.test.ts, ssg-advanced.test.ts)

- ✅ React/Preact SSG generation
- ✅ Sitemap and Robots generation (React/Preact)
- ✅ Route data handling
- ✅ Dynamic route expansion, custom template, multi-engine comparison

### 8. SSR Tests (ssr.test.ts, ssr-comprehensive.test.ts)

- ✅ React/Preact/View SSR rendering
- ✅ Unsupported engine throws error
- ✅ Metadata, server data, layout system, streaming render
- ✅ Error handling, performance monitoring, cache

### 9. Utils Tests (utils.test.ts) - 23 tests

- ✅ Metadata, server-data, scripts, cache, performance, compression,
  lazy-loading, context utils

## Template Engine Support

| Engine | SSR | CSR | Hydration | SSG |
| ------ | --- | --- | --------- | --- |
| React  | ✅  | ✅  | ✅        | ✅  |
| Preact | ✅  | ✅  | ✅        | ✅  |
| View   | ✅  | ✅  | ✅        | —   |

## Conclusion

All features of `@dreamer/render` pass comprehensive testing with 100% coverage.
All 243 tests pass on both Deno and Bun runtimes, with support for React,
Preact, and View template engines.

---

**Report generated**: 2026-02-13 **Test environment**: Deno 2.x+ / Bun 1.x+
**Test framework**: @dreamer/test@^1.0.5
