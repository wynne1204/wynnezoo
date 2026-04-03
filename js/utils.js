/**
 * 通用数字缩写格式化（用于顶部资源栏货币显示）
 * 规则：
 *   < 10,000        → 原数字加逗号分隔 (如 9,999)
 *   ≥ 10,000        → K (如 10K, 99.9K)
 *   ≥ 1,000,000     → M (如 1M, 999.9M)
 *   ≥ 1,000,000,000 → B (如 1B)
 */
function formatResourceNumber(value) {
    var num = Math.max(0, Math.floor(Number(value) || 0));

    if (num >= 1e9) {
        return _trimTrailingZero((num / 1e9).toFixed(1)) + 'B';
    }
    if (num >= 1e6) {
        return _trimTrailingZero((num / 1e6).toFixed(1)) + 'M';
    }
    if (num >= 1e4) {
        return _trimTrailingZero((num / 1e3).toFixed(1)) + 'K';
    }
    return num.toLocaleString();
}

function _trimTrailingZero(str) {
    return str.replace(/\.0$/, '');
}

// ── 通用安全数值转换 ────────────────────────────────────────
/**
 * 将任意值转为非负整数，带可选下限和回退值。
 * @param {*} value - 待转换值
 * @param {number} [fallback=0] - 转换失败时的回退值
 * @param {number} [min=0] - 结果下限
 * @returns {number}
 */
function safeInt(value, fallback, min) {
    var fb = arguments.length >= 2 ? fallback : 0;
    var lo = arguments.length >= 3 ? min : 0;
    var n = Math.floor(Number(value));
    return Math.max(lo, Number.isFinite(n) ? n : Math.floor(Number(fb) || 0));
}

/**
 * 将任意值转为有限浮点数，带可选下限/上限和回退值。
 * @param {*} value
 * @param {number} [fallback=0]
 * @param {number} [min=-Infinity]
 * @param {number} [max=Infinity]
 * @returns {number}
 */
function safeFloat(value, fallback, min, max) {
    var fb = arguments.length >= 2 ? fallback : 0;
    var lo = arguments.length >= 3 ? min : -Infinity;
    var hi = arguments.length >= 4 ? max : Infinity;
    var n = Number(value);
    if (!Number.isFinite(n)) n = Number(fb) || 0;
    return Math.min(hi, Math.max(lo, n));
}

// ── 通用 HTML 转义 ──────────────────────────────────────────
/**
 * 转义 HTML 特殊字符，防止 XSS。
 * 各模块可直接调用，无需各自实现。
 * @param {*} value
 * @returns {string}
 */
function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// ── 通用数组随机工具 ────────────────────────────────────────
/**
 * 从数组中随机取一个元素。
 * @param {Array} items
 * @returns {*}
 */
function pickRandom(items) {
    if (!Array.isArray(items) || items.length === 0) return undefined;
    return items[Math.floor(Math.random() * items.length)];
}

/**
 * 限制值在 [min, max] 范围内。
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function clamp(value, min, max) {
    var n = Number(value) || 0;
    return Math.min(max, Math.max(min, n));
}
