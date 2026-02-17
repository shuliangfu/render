/**
 * @module @dreamer/render/i18n
 *
 * Server-side i18n for @dreamer/render: uses @dreamer/i18n $t for error messages
 * and logs. Optional `lang`; when not passed, locale is auto-detected from env
 * (LANGUAGE / LC_ALL / LANG). Client-side translation is not implemented yet.
 */

import {
  $i18n,
  getGlobalI18n,
  getI18n,
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

let renderTranslationsLoaded = false;

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

/**
 * Load render translations into the current I18n instance (once).
 */
export function ensureRenderI18n(): void {
  if (renderTranslationsLoaded) return;
  const i18n = getGlobalI18n() ?? getI18n();
  i18n.loadTranslations("en-US", enUS as TranslationData);
  i18n.loadTranslations("zh-CN", zhCN as TranslationData);
  renderTranslationsLoaded = true;
}

/**
 * Load translations and set current locale. Call once at entry (e.g. mod).
 */
export function initRenderI18n(): void {
  ensureRenderI18n();
  $i18n.setLocale(detectLocale());
}

/**
 * Translate by key (server-side). When lang is not passed, uses current locale (set at entry).
 * Do not call ensure/init inside $t; call initRenderI18n() at entry.
 *
 * @param key - Message key (e.g. "error.renderErrorTitle")
 * @param params - Placeholders (e.g. { engine: "react" })
 * @param lang - Optional locale; omitted = current locale
 */
export function $t(
  key: string,
  params?: TranslationParams,
  lang?: Locale,
): string {
  if (lang !== undefined) {
    const prev = $i18n.getLocale();
    $i18n.setLocale(lang);
    try {
      return $i18n.t(key, params);
    } finally {
      $i18n.setLocale(prev);
    }
  }
  return $i18n.t(key, params);
}
