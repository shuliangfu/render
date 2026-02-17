/**
 * Lazy-loading utilities: defer large data to reduce initial HTML size.
 *
 * @packageDocumentation
 */

import type { ServerData } from "../types.ts";

/**
 * Generate script that loads data lazily (fetch from endpoint or inline after DOMContentLoaded).
 *
 * @param data - Data to expose (used when endpoint is not provided)
 * @param endpoint - Optional URL to fetch JSON; if omitted, inline data is used
 * @returns Script HTML string
 */
export function generateLazyDataScript(
  data: ServerData,
  endpoint?: string,
): string {
  if (endpoint) {
    return `<script>
  (function() {
    if (!window.__DATA__) {
      window.__DATA__ = {};
    }
    fetch(${JSON.stringify(endpoint)})
      .then(response => response.json())
      .then(data => {
        Object.assign(window.__DATA__, data);
        window.dispatchEvent(new CustomEvent('__DATA_LOADED__', { detail: data }));
      })
      .catch(error => {
        console.error('Lazy data load failed:', error);
      });
  })();
</script>`;
  } else {
    const json = JSON.stringify(data);
    return `<script>
  (function() {
    if (!window.__DATA__) {
      window.__DATA__ = {};
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() {
        Object.assign(window.__DATA__, ${json});
        window.dispatchEvent(new CustomEvent('__DATA_LOADED__', { detail: ${json} }));
      });
    } else {
      setTimeout(function() {
        Object.assign(window.__DATA__, ${json});
        window.dispatchEvent(new CustomEvent('__DATA_LOADED__', { detail: ${json} }));
      }, 0);
    }
  })();
</script>`;
  }
}

/**
 * Whether data should be lazy-loaded based on size threshold.
 *
 * @param data - Data object
 * @param threshold - Size in bytes; above this, lazy-load (default 10KB)
 * @returns true if size > threshold
 */
export function shouldLazyLoad(
  data: ServerData,
  threshold: number = 10240,
): boolean {
  const json = JSON.stringify(data);
  const size = new TextEncoder().encode(json).length;
  return size > threshold;
}
