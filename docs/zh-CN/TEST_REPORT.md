# @dreamer/render Test Report

## Test Overview

| Item                 | Info                                   |
| -------------------- | -------------------------------------- |
| Test library version | @dreamer/render@1.0.0-beta.5           |
| Runtime adapter      | @dreamer/runtime-adapter@1.0.0-beta.22 |
| Test framework       | @dreamer/test@1.0.0-beta.40            |
| Test date            | 2026-02-03                             |
| Test environment     | Deno 2.6.4 / Bun 1.3.5                 |

## Test Results

### Overall Statistics

| Metric         | Value                 |
| -------------- | --------------------- |
| Total tests    | 203                   |
| Passed         | 203 ✅                |
| Failed         | 0                     |
| Pass rate      | 100%                  |
| Execution time | ~25s (`deno test -A`) |

### Runtime Compatibility

| Runtime | Version | Result        |
| ------- | ------- | ------------- |
| Deno    | 2.6.4   | ✅ 203 passed |
| Bun     | 1.3.5   | ✅ 203 passed |

### Test File Statistics

| Test file                   | Count | Status        |
| --------------------------- | ----- | ------------- |
| `adapters-preact.test.ts`   | 11    | ✅ All passed |
| `adapters-react.test.ts`    | 10    | ✅ All passed |
| `client-browser.test.ts`    | 20    | ✅ All passed |
| `client-utils.test.ts`      | 26    | ✅ All passed |
| `edge-cases.test.ts`        | 13    | ✅ All passed |
| `layout.test.ts`            | 32    | ✅ All passed |
| `mod.test.ts`               | 6     | ✅ All passed |
| `ssg-advanced.test.ts`      | 11    | ✅ All passed |
| `ssg.test.ts`               | 16    | ✅ All passed |
| `ssr-comprehensive.test.ts` | 31    | ✅ All passed |
| `ssr.test.ts`               | 7     | ✅ All passed |
| `utils.test.ts`             | 22    | ✅ All passed |

## Feature Test Details

### 1. Server Adapter - Preact (adapters-preact.test.ts) - 11 tests

- ✅ SSR rendering basics
- ✅ Component rendering with props
- ✅ Template rendering
- ✅ Layout system support
- ✅ Nested layout support
- ✅ `inheritLayout = false` skips layout
- ✅ Streaming render
- ✅ Error handling
- ✅ Performance monitoring

### 2. Server Adapter - React (adapters-react.test.ts) - 10 tests

- ✅ SSR rendering basics
- ✅ Component rendering with props
- ✅ Template rendering
- ✅ Layout system support
- ✅ Nested layout support
- ✅ `inheritLayout = false` skips layout
- ✅ Streaming render
- ✅ Error handling
- ✅ Performance monitoring

### 3. Client Browser Tests (client-browser.test.ts) - 20 tests

#### General

- ✅ Export all required functions
- ✅ Performance monitor instance creation
- ✅ Performance monitor returns null when disabled
- ✅ Error fallback UI display
- ✅ HTMLElement container support
- ✅ handleRenderError error handling

#### Preact Adapter

- ✅ Throws when container does not exist
- ✅ Component unmount support
- ✅ update function support
- ✅ CSR returns performance metrics
- ✅ Non-browser environment detection

#### React Adapter

- ✅ Throws when container does not exist (CSR)
- ✅ Performance monitoring support
- ✅ Throws when hydration container does not exist
- ✅ Component unmount support
- ✅ update function support
- ✅ CSR returns performance metrics
- ✅ Non-browser environment detection

### 4. Client Utils (client-utils.test.ts) - 26 tests

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

### 5. Layout Inheritance (layout.test.ts) - 32 tests

- ✅ Server/client shouldSkipLayouts
- ✅ Server filterLayouts
- ✅ Server/client composeLayouts
- ✅ Server/client createComponentTree
- ✅ Real scenarios: inheritLayout = false, three-level nested layout

### 6. SSG Tests (ssg.test.ts, ssg-advanced.test.ts)

- ✅ React/Preact SSG generation
- ✅ Sitemap and Robots generation (React/Preact)
- ✅ Route data handling
- ✅ Dynamic route expansion, custom template, multi-engine comparison

### 7. SSR Tests (ssr.test.ts, ssr-comprehensive.test.ts)

- ✅ React/Preact SSR rendering
- ✅ Unsupported engine throws error
- ✅ Metadata, server data, layout system, streaming render
- ✅ Error handling, performance monitoring, cache

### 8. Utils Tests (utils.test.ts) - 22 tests

- ✅ Metadata, server-data, scripts, cache, performance, compression,
  lazy-loading, context utils

## Template Engine Support

| Engine | SSR | CSR | Hydration | SSG |
| ------ | --- | --- | --------- | --- |
| React  | ✅  | ✅  | ✅        | ✅  |
| Preact | ✅  | ✅  | ✅        | ✅  |

## Conclusion

All features of `@dreamer/render` pass comprehensive testing with 100% coverage.
All 203 tests pass on both Deno and Bun runtimes, with support for React and
Preact template engines.

---

**Report generated**: 2026-02-03 **Test environment**: Deno 2.6.4 / Bun 1.3.5
**Test framework**: @dreamer/test@1.0.0-beta.40
