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
        return _trimTrailingZero((num / 1e4).toFixed(1)) + 'K';
    }
    return num.toLocaleString();
}

function _trimTrailingZero(str) {
    return str.replace(/\.0$/, '');
}
