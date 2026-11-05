/**
 * 将 render 的 HydrationOptions 子集解析为 @dreamer/view HydrateOptions。
 *
 * 意图：库层默认钉 `mismatchMode: "continue"`（2.x 容忍），不跟随 view 3.0
 * 「省略 → DEV assert／生产 remount」。不变量：未传 mismatchMode 时行为与升 3.0
 * 脏树一致。边界：bindings 仅透传；真编译器产出在 dweb／@dreamer/view/compiler。
 * 为何不直接把整个 HydrationOptions 丢给 view：含 engine／container 等非 Hydrate 字段。
 */

import type {
  HydrationOptions,
  ViewHydrationBinding,
  ViewHydrationMismatch,
  ViewHydrationMismatchMode,
} from "../types.ts";

/** 传给 view `hydrate`／`internalHydrate` 的选项形状（与 view HydrateOptions 对齐） */
export interface ResolvedViewHydrateOptions {
  bindings: ViewHydrationBinding[];
  mismatchMode: ViewHydrationMismatchMode;
  warnMismatch?: boolean;
  onMismatch?: (info: ViewHydrationMismatch) => void;
}

/** HydrationOptions／createReactiveRootHydrate 第四参共用的 view 水合字段 */
export type ViewHydrateOptionFields = Pick<
  HydrationOptions,
  "mismatchMode" | "bindings" | "warnMismatch" | "onMismatch"
>;

/**
 * 解析 view 水合选项：缺省 `mismatchMode` → `"continue"`；缺省 `bindings` → `[]`。
 */
export function resolveViewHydrateOptions(
  options: ViewHydrateOptionFields = {},
): ResolvedViewHydrateOptions {
  const resolved: ResolvedViewHydrateOptions = {
    bindings: options.bindings ?? [],
    mismatchMode: options.mismatchMode ?? "continue",
  };
  if (options.warnMismatch !== undefined) {
    resolved.warnMismatch = options.warnMismatch;
  }
  if (options.onMismatch) {
    resolved.onMismatch = options.onMismatch;
  }
  return resolved;
}
