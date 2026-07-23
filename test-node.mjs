#!/usr/bin/env node
/**
 * Node.js test runner — runs each test file in the MAIN process (no --test flag).
 *
 * 【Why 根源】Node 22's `node --test` forks a child process per file and uses the
 * child's stdout as the TAP/IPC message channel (parsed via structuredClone). When
 * a test file — or code under test — writes to stdout (e.g. `console.log()`), the
 * non-TAP bytes corrupt the parent's message parser, throwing "Unable to
 * deserialize cloned data due to invalid or unsupported version."
 *
 * `--test-isolation=none` would disable forking, but it is Node 23+ only. Our
 * `engines.node >= 22` constraint means CI runs Node 22, where the flag is absent.
 *
 * 【Fix】Run each file as the entry point (`node --import tsx <file>`) WITHOUT the
 * `--test` flag. `node:test` auto-runs registered tests IN-PROCESS when the module
 * is the main entry — no child process, no IPC, no serialization bug. The process
 * exit code still reflects results (0 on pass, 1 on fail). `--test-force-exit`
 * ensures the process exits even if a test leaves dangling handles (timers etc.).
 *
 * 【Invariant】One file per process invocation; exit code is the single source of
 * truth for pass/fail. Browser tests (client-browser, adapters-view-client) are
 * excluded — they require Playwright/Chromium which is not available in Node CI.
 */
import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, resolve } from "node:path";

// 显式置 CI=true：使脚本自包含，不依赖 Unix shell 前缀语法（Windows 不支持
// `CI=true node ...`）也不依赖外部环境。
process.env.CI = "true";

// 排除浏览器测试（需 Playwright/Chromium，Node CI 不安装）
const EXCLUDE = ["client-browser.test.ts", "adapters-view-client.test.ts"];

const testDir = resolve("tests");
const files = readdirSync(testDir)
  .filter((f) => f.endsWith(".test.ts"))
  .filter((f) => !EXCLUDE.includes(f))
  .sort()
  .map((f) => join(testDir, f));

console.log(`Found ${files.length} test files (${EXCLUDE.length} browser tests excluded)\n`);

let failed = 0;
for (const file of files) {
  const rel = file.replace(process.cwd() + "/", "");
  console.log(`▶ ${rel}`);
  const result = spawnSync(
    process.execPath,
    ["--import", "tsx", "--test-force-exit", file],
    {
      stdio: "inherit",
      env: { ...process.env, CI: "true" },
    },
  );
  if (result.status !== 0) {
    failed++;
    console.error(`✗ FAILED: ${rel}\n`);
  } else {
    console.log(`✓ ${rel}\n`);
  }
}

console.log("=".repeat(60));
if (failed > 0) {
  console.error(`✗ ${failed}/${files.length} test file(s) failed`);
  process.exit(1);
}
console.log(`✓ All ${files.length} test files passed`);
