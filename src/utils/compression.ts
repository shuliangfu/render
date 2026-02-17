/**
 * Data compression utilities for HTML-injected data.
 *
 * @packageDocumentation
 */

import type { CompressionOptions } from "../types.ts";

/** Base64 encode (no external deps). */
function encodeBase64(str: string): string {
  if (typeof btoa !== "undefined") {
    return btoa(str);
  }
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let output = "";
  let i = 0;
  const bytes = new TextEncoder().encode(str);
  while (i < bytes.length) {
    const a = bytes[i++];
    const b = i < bytes.length ? bytes[i++] : 0;
    const c = i < bytes.length ? bytes[i++] : 0;
    const bitmap = (a << 16) | (b << 8) | c;
    output += chars.charAt((bitmap >> 18) & 63);
    output += chars.charAt((bitmap >> 12) & 63);
    output += i - 2 < bytes.length ? chars.charAt((bitmap >> 6) & 63) : "=";
    output += i - 1 < bytes.length ? chars.charAt(bitmap & 63) : "=";
  }
  return output;
}

/** Base64 decode (no external deps). */
function decodeBase64(str: string): string {
  if (typeof atob !== "undefined") {
    return atob(str);
  }
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  let output = "";
  let i = 0;
  str = str.replace(/[^A-Za-z0-9\+\/\=]/g, "");
  while (i < str.length) {
    const enc1 = chars.indexOf(str.charAt(i++));
    const enc2 = chars.indexOf(str.charAt(i++));
    const enc3 = chars.indexOf(str.charAt(i++));
    const enc4 = chars.indexOf(str.charAt(i++));
    const bitmap = (enc1 << 18) | (enc2 << 12) | (enc3 << 6) | enc4;
    if (enc3 !== 64) output += String.fromCharCode((bitmap >> 16) & 255);
    if (enc4 !== 64) output += String.fromCharCode((bitmap >> 8) & 255);
  }
  return output;
}

/**
 * Compress data (JSON + optional threshold); returns base64 string and sizes.
 *
 * @param data - Data to compress
 * @param options - Compression options (enabled, threshold)
 * @returns { compressed, originalSize, compressedSize } or null if disabled/under threshold
 */
export function compressData(
  data: unknown,
  options?: CompressionOptions,
): { compressed: string; originalSize: number; compressedSize: number } | null {
  if (!options?.enabled) {
    return null;
  }

  const json = JSON.stringify(data);
  const originalSize = new TextEncoder().encode(json).length;

  if (options.threshold && originalSize < options.threshold) {
    return null;
  }

  let compressed = json.replace(/\s+/g, " ").trim();

  compressed = compressed.replace(/(.)\1{3,}/g, (match, char) => {
    if (match.length > 10) {
      return `[${char}*${match.length}]`;
    }
    return match;
  });

  const compressedSize = new TextEncoder().encode(compressed).length;

  if (compressedSize >= originalSize) {
    return null;
  }

  const base64 = encodeBase64(compressed);

  return {
    compressed: base64,
    originalSize,
    compressedSize,
  };
}

function base64Decode(str: string): string {
  return decodeBase64(str);
}

/**
 * Decompress data from base64 string.
 *
 * @param compressed - Base64 compressed string
 * @returns Parsed data or null on error
 */
export function decompressData(compressed: string): unknown {
  try {
    const decompressed = base64Decode(compressed);
    return JSON.parse(decompressed);
  } catch (error) {
    console.error("Decompress failed:", error);
    return null;
  }
}

/**
 * Generate script tag that decompresses and assigns to window.__DATA__.
 *
 * @param compressed - Compressed base64 string
 * @param originalSize - Original size in bytes
 * @param compressedSize - Compressed size in bytes
 * @returns Script HTML string
 */
export function generateCompressedDataScript(
  compressed: string,
  originalSize: number,
  compressedSize: number,
): string {
  return `<script>
  (function() {
    function decompressData(compressed) {
      try {
        const decompressed = atob(compressed);
        return JSON.parse(decompressed);
      } catch (error) {
        console.error('Decompress failed:', error);
        return null;
      }
    }
    const compressed = ${JSON.stringify(compressed)};
    window.__DATA__ = decompressData(compressed);
    window.__DATA_COMPRESSION__ = {
      originalSize: ${originalSize},
      compressedSize: ${compressedSize},
      ratio: ${(compressedSize / originalSize * 100).toFixed(2)}
    };
  })();
</script>`;
}
