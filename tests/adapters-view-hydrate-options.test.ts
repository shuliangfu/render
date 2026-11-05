/**
 * View 水合选项透传（P0-1／P1-2）：mismatchMode／bindings／onMismatch。
 * 真编译器绑定表不在本包生成；此处用手工 bindings 证明能传到 view。
 */
import "./dom-setup-happy-dom.ts";
import { describe, expect, it } from "@dreamer/test";
import { jsx } from "@dreamer/view/jsx-runtime";
import {
  createReactiveRootHydrate,
  hydrate,
} from "../src/client/adapters/view.ts";
import { hydrate as hybridHydrate } from "../src/client/adapters/view-hybrid.ts";
import { resolveViewHydrateOptions } from "../src/client/utils/view-hydrate-options.ts";

function Page() {
  return jsx("div", {
    children: jsx("p", { children: "Server rendered content" }, undefined),
  }, undefined);
}

function setupSsrContainer(html: string): HTMLElement {
  document.body.innerHTML = "";
  const el = document.createElement("div");
  el.id = "hydrate-app";
  el.innerHTML = html;
  document.body.appendChild(el);
  return el;
}

describe("resolveViewHydrateOptions", () => {
  it("省略 mismatchMode 时应默认 continue，bindings 默认 []", () => {
    const opts = resolveViewHydrateOptions({});
    expect(opts.mismatchMode).toBe("continue");
    expect(opts.bindings).toEqual([]);
  });

  it("应透传 assert／bindings／warnMismatch／onMismatch", () => {
    const onMismatch = () => {};
    const bindings: [number[], string][] = [[[0], "root"]];
    const opts = resolveViewHydrateOptions({
      mismatchMode: "assert",
      bindings,
      warnMismatch: false,
      onMismatch,
    });
    expect(opts.mismatchMode).toBe("assert");
    expect(opts.bindings).toBe(bindings);
    expect(opts.warnMismatch).toBe(false);
    expect(opts.onMismatch).toBe(onMismatch);
  });
});

describe("view hydrate 选项透传", () => {
  it("默认 continue：坏 bindings 触发 onMismatch 但不抛，SSR 内容仍在", () => {
    const container = setupSsrContainer(
      "<div><p>Server rendered content</p></div>",
    );
    const mismatches: { id: string }[] = [];
    const result = hydrate({
      engine: "view",
      component: Page,
      container,
      bindings: [[[99, 99], "missing"]],
      warnMismatch: false,
      onMismatch: (info) => {
        mismatches.push(info);
      },
    });
    expect(mismatches.length).toBe(1);
    expect(mismatches[0]?.id).toBe("missing");
    expect(container.textContent).toContain("Server rendered content");
    result.unmount();
  });

  it("mismatchMode assert：坏 bindings 经 errorHandler 收到 assert 错误", async () => {
    const container = setupSsrContainer(
      "<div><p>Server rendered content</p></div>",
    );
    let resolveCaught!: (e: Error) => void;
    const caughtP = new Promise<Error>((r) => {
      resolveCaught = r;
    });
    hydrate({
      engine: "view",
      component: Page,
      container,
      mismatchMode: "assert",
      bindings: [[[99, 99], "missing"]],
      warnMismatch: false,
      errorHandler: {
        logError: false,
        onError: (error) => {
          resolveCaught(error);
        },
      },
    });
    const caught = await Promise.race([
      caughtP,
      new Promise<null>((r) => setTimeout(() => r(null), 1000)),
    ]);
    expect(caught).not.toBeNull();
    expect(String(caught?.message ?? "")).toContain("hydration assert");
  });

  it("合法 bindings 路径应不触发 onMismatch", () => {
    const container = setupSsrContainer(
      "<div><p>Server rendered content</p></div>",
    );
    const mismatches: unknown[] = [];
    // path [0] = 容器下第一个子节点（外层 div）
    const result = hydrate({
      engine: "view",
      component: Page,
      container,
      bindings: [[[0], "wrap"]],
      warnMismatch: false,
      onMismatch: (info) => mismatches.push(info),
    });
    expect(mismatches.length).toBe(0);
    expect(container.textContent).toContain("Server rendered content");
    result.unmount();
  });

  it("view-hybrid hydrate 应同样透传 onMismatch", () => {
    const container = setupSsrContainer(
      "<div><p>Server rendered content</p></div>",
    );
    const mismatches: { id: string }[] = [];
    const result = hybridHydrate({
      engine: "view",
      component: Page,
      container,
      bindings: [[[88], "hybrid-miss"]],
      warnMismatch: false,
      onMismatch: (info) => mismatches.push(info),
    });
    expect(mismatches[0]?.id).toBe("hybrid-miss");
    result.unmount();
  });

  it("createReactiveRootHydrate 第四参可传 mismatchMode／onMismatch", () => {
    const container = setupSsrContainer(
      "<div><p>Server rendered content</p></div>",
    );
    const mismatches: { id: string }[] = [];
    const { unmount } = createReactiveRootHydrate(
      container,
      () => ({ n: 1 }),
      (state) =>
        jsx("div", {
          children: jsx("p", {
            children: `Server rendered content ${state.n}`,
          }, undefined),
        }, undefined),
      {
        bindings: [[[77], "reactive-miss"]],
        warnMismatch: false,
        onMismatch: (info) => mismatches.push(info),
      },
    );
    expect(mismatches[0]?.id).toBe("reactive-miss");
    unmount();
  });
});
