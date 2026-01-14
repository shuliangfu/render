/**
 * 数据压缩工具函数
 *
 * 用于压缩注入到 HTML 中的数据
 */

import type { CompressionOptions } from "../types.ts";

/**
 * Base64 编码（简单实现，不依赖外部库）
 */
function encodeBase64(str: string): string {
  if (typeof btoa !== "undefined") {
    return btoa(str);
  }
  // 手动实现 base64 编码
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

/**
 * Base64 解码（简单实现，不依赖外部库）
 */
function decodeBase64(str: string): string {
  if (typeof atob !== "undefined") {
    return atob(str);
  }
  // 手动实现 base64 解码
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
 * 压缩数据（使用简单的 JSON 压缩，实际项目中可以使用更高级的压缩算法）
 *
 * @param data 要压缩的数据
 * @param options 压缩选项
 * @returns 压缩后的数据（base64 编码的 JSON 字符串）
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

  // 检查是否超过阈值
  if (options.threshold && originalSize < options.threshold) {
    return null;
  }

  // 简单的压缩：移除空格和换行，并尝试压缩重复字符
  // 对于重复字符（如 "xxxxx"），可以简化为更短的表示
  let compressed = json.replace(/\s+/g, " ").trim();

  // 尝试压缩长重复字符序列（简单的 RLE 压缩）
  // 匹配 4 个或更多相同字符的序列
  compressed = compressed.replace(/(.)\1{3,}/g, (match, char) => {
    // 如果重复超过 10 次，使用特殊标记（实际项目中可以使用更高级的压缩）
    if (match.length > 10) {
      return `[${char}*${match.length}]`;
    }
    return match;
  });

  // 计算压缩后的大小
  const compressedSize = new TextEncoder().encode(compressed).length;

  // 如果压缩后反而更大，不压缩
  if (compressedSize >= originalSize) {
    return null;
  }

  // Base64 编码（兼容所有环境）
  const base64 = encodeBase64(compressed);

  return {
    compressed: base64,
    originalSize,
    compressedSize,
  };
}

/**
 * Base64 解码（兼容所有环境）
 */
function base64Decode(str: string): string {
  return decodeBase64(str);
}

/**
 * 解压数据
 *
 * @param compressed 压缩后的数据（base64 编码的字符串）
 * @returns 解压后的数据
 */
export function decompressData(compressed: string): unknown {
  try {
    const decompressed = base64Decode(compressed);
    return JSON.parse(decompressed);
  } catch (error) {
    console.error("数据解压失败:", error);
    return null;
  }
}

/**
 * 生成压缩数据的加载脚本
 *
 * @param compressed 压缩后的数据
 * @param originalSize 原始大小
 * @param compressedSize 压缩后大小
 * @returns 加载脚本 HTML
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
        console.error('数据解压失败:', error);
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
