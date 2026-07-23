/**
 * 为依赖 @dreamer/view 运行时 jsx 的 SSR 单测注入 happy-dom。
 * 当前 view 的 Thunk 在求值时会调用 `document.createElement`，Deno 默认无 `document`。
 *
 * 【Why 根源】Node 21+ 引入了只读的全局 `navigator`（只有 getter，无 setter），
 * 直接 `globalThis.navigator = win.navigator` 会抛 TypeError。其他 Web API 全局
 * （Event、CustomEvent 等）在更高版本 Node 中也可能变为只读。统一用
 * `Object.defineProperty` 设置：属性不存在时创建，存在且 configurable 时覆盖，
 * 在 Deno / Bun / Node 三端行为一致。
 */

import { Window } from "happy-dom";

const win = new Window();

/**
 * 在 globalThis 上定义全局变量，兼容三端只读属性。
 * writable + configurable 确保后续可被其他 setup 覆盖或测试清理。
 */
function defineGlobal(name: string, value: unknown): void {
  Object.defineProperty(globalThis, name, {
    value,
    writable: true,
    configurable: true,
  });
}

defineGlobal("window", win);
defineGlobal("document", win.document);
defineGlobal("Node", win.Node);
defineGlobal("Element", win.Element);
defineGlobal("HTMLElement", win.HTMLElement);
defineGlobal("Text", win.Text);
defineGlobal("DocumentFragment", win.DocumentFragment);
defineGlobal("NodeList", win.NodeList);
defineGlobal("HTMLCollection", win.HTMLCollection);
defineGlobal("CharacterData", win.CharacterData);
defineGlobal("Comment", win.Comment);
defineGlobal("Event", win.Event);
defineGlobal("CustomEvent", win.CustomEvent);
defineGlobal("InputEvent", win.InputEvent);
defineGlobal("MouseEvent", win.MouseEvent);
defineGlobal("KeyboardEvent", win.KeyboardEvent);
defineGlobal("navigator", win.navigator);
