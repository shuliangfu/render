/**
 * 数据懒加载工具函数
 *
 * 用于延迟加载大数据，减少初始 HTML 体积
 */

import type { ServerData } from "../types.ts";

/**
 * 生成懒加载数据脚本
 *
 * @param data 要懒加载的数据
 * @param endpoint 数据加载端点（可选，如果不提供则使用内联数据）
 * @returns 懒加载脚本 HTML
 */
export function generateLazyDataScript(
  data: ServerData,
  endpoint?: string,
): string {
  if (endpoint) {
    // 使用端点加载数据
    return `<script>
  (function() {
    if (!window.__DATA__) {
      window.__DATA__ = {};
    }
    fetch(${JSON.stringify(endpoint)})
      .then(response => response.json())
      .then(data => {
        Object.assign(window.__DATA__, data);
        // 触发数据加载完成事件
        window.dispatchEvent(new CustomEvent('__DATA_LOADED__', { detail: data }));
      })
      .catch(error => {
        console.error('懒加载数据失败:', error);
      });
  })();
</script>`;
  } else {
    // 内联数据，延迟加载
    const json = JSON.stringify(data);
    return `<script>
  (function() {
    if (!window.__DATA__) {
      window.__DATA__ = {};
    }
    // 延迟加载数据
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() {
        Object.assign(window.__DATA__, ${json});
        window.dispatchEvent(new CustomEvent('__DATA_LOADED__', { detail: ${json} }));
      });
    } else {
      // 如果 DOM 已经加载完成，立即加载
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
 * 判断数据是否应该懒加载
 *
 * @param data 数据对象
 * @param threshold 阈值（字节），超过此值才懒加载
 * @returns 是否应该懒加载
 */
export function shouldLazyLoad(
  data: ServerData,
  threshold: number = 10240, // 默认 10KB
): boolean {
  const json = JSON.stringify(data);
  const size = new TextEncoder().encode(json).length;
  return size > threshold;
}
