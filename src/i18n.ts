/**
 * @module @dreamer/render/i18n
 *
 * Server-side i18n for @dreamer/render: error and log messages.
 * Uses $tr + module instance, no install(); locale auto-detected from env
 * (LANGUAGE/LC_ALL/LANG) when not set.
 */

import {
  createI18n,
  type I18n,
  type TranslationData,
  type TranslationParams,
} from "@dreamer/i18n";
import { getEnv } from "@dreamer/runtime-adapter";
import enUS from "./locales/en-US.json" with { type: "json" };
import zhCN from "./locales/zh-CN.json" with { type: "json" };

/** Supported locale; en-US is default for server. */
export type Locale = "en-US" | "zh-CN";

/** Default locale when detection fails. */
export const DEFAULT_LOCALE: Locale = "en-US";

const RENDER_LOCALES: Locale[] = ["en-US", "zh-CN"];

const LOCALE_DATA: Record<string, TranslationData> = {
  "en-US": enUS as TranslationData,
  "zh-CN": zhCN as TranslationData,
};

/** Module-scoped i18n instance for render; not installed globally. */
let renderI18n: I18n | null = null;

/**
 * Detect locale (server-side only): LANGUAGE > LC_ALL > LANG.
 * Returns en-US when unset or not in supported list.
 */
export function detectLocale(): Locale {
  const langEnv = getEnv("LANGUAGE") || getEnv("LC_ALL") || getEnv("LANG");
  if (!langEnv) return "en-US";
  const first = langEnv.split(/[:\s]/)[0]?.trim();
  if (!first) return "en-US";
  const match = first.match(/^([a-z]{2})[-_]([A-Z]{2})/i);
  if (match) {
    const normalized = `${match[1].toLowerCase()}-${
      match[2].toUpperCase()
    }` as Locale;
    if (RENDER_LOCALES.includes(normalized)) return normalized;
  }
  const primary = first.substring(0, 2).toLowerCase();
  if (primary === "zh") return "zh-CN";
  if (primary === "en") return "en-US";
  return "en-US";
}

/** 内部初始化，导入 i18n 时自动执行，不导出 */
function initRenderI18n(): void {
  if (renderI18n) return;
  const i18n = createI18n({
    defaultLocale: DEFAULT_LOCALE,
    fallbackBehavior: "default",
    locales: [...RENDER_LOCALES],
    translations: LOCALE_DATA as Record<string, TranslationData>,
  });
  i18n.setLocale(detectLocale());
  renderI18n = i18n;
}

initRenderI18n();

/**
 * Translate by key (server-side). Uses module instance; when lang is not passed, uses current locale.
 * When init not called, returns key.
 *
 * @param key - Message key (e.g. "error.renderErrorTitle")
 * @param params - Placeholders (e.g. { engine: "react" })
 * @param lang - Optional locale; omitted = current locale
 */
export function $tr(
  key: string,
  params?: Record<string, string | number>,
  lang?: Locale,
): string {
  if (!renderI18n) initRenderI18n();
  if (!renderI18n) return key;
  if (lang !== undefined) {
    const prev = renderI18n.getLocale();
    renderI18n.setLocale(lang);
    try {
      return renderI18n.t(key, params as TranslationParams);
    } finally {
      renderI18n.setLocale(prev);
    }
  }
  return renderI18n.t(key, params as TranslationParams);
}
