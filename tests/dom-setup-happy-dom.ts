/**
 * 为依赖 @dreamer/view 运行时 jsx 的 SSR 单测注入 happy-dom。
 * 当前 view 的 Thunk 在求值时会调用 `document.createElement`，Deno 默认无 `document`。
 */

import { Window } from "happy-dom";

const win = new Window();

// deno-lint-ignore no-explicit-any
(globalThis as any).window = win;
// deno-lint-ignore no-explicit-any
(globalThis as any).document = win.document;
// deno-lint-ignore no-explicit-any
(globalThis as any).Node = win.Node;
// deno-lint-ignore no-explicit-any
(globalThis as any).Element = win.Element;
// deno-lint-ignore no-explicit-any
(globalThis as any).HTMLElement = win.HTMLElement;
// deno-lint-ignore no-explicit-any
(globalThis as any).Text = win.Text;
// deno-lint-ignore no-explicit-any
(globalThis as any).DocumentFragment = win.DocumentFragment;
// deno-lint-ignore no-explicit-any
(globalThis as any).NodeList = win.NodeList;
// deno-lint-ignore no-explicit-any
(globalThis as any).HTMLCollection = win.HTMLCollection;
// deno-lint-ignore no-explicit-any
(globalThis as any).CharacterData = win.CharacterData;
// deno-lint-ignore no-explicit-any
(globalThis as any).Comment = win.Comment;
// deno-lint-ignore no-explicit-any
(globalThis as any).Event = win.Event;
// deno-lint-ignore no-explicit-any
(globalThis as any).CustomEvent = win.CustomEvent;
// deno-lint-ignore no-explicit-any
(globalThis as any).InputEvent = win.InputEvent;
// deno-lint-ignore no-explicit-any
(globalThis as any).MouseEvent = win.MouseEvent;
// deno-lint-ignore no-explicit-any
(globalThis as any).KeyboardEvent = win.KeyboardEvent;
// deno-lint-ignore no-explicit-any
(globalThis as any).navigator = win.navigator;
