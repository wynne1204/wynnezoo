// ============================================================
// WynneSystemUnlock — 系统解锁管理器
// 基于剧情进度的子系统渐进式开放机制。
// 依赖：WynneZooEconomy（读写 runtimeState）、APP_CONFIG.systemUnlockTable
// ============================================================
(function initSystemUnlock(globalScope) {
    'use strict';

    // ── 中文数字映射（1-10） ──────────────────────────────────
    var CHINESE_NUMBERS = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];

    // ── 配置校验所需字段 ─────────────────────────────────────
    var REQUIRED_FIELDS = ['systemId', 'systemName', 'iconSrc', 'navElementId'];

    // ── 辅助：获取 WynneZooEconomy ──────────────────────────
    function getEconomy() {
        return (globalScope.WynneRegistry && globalScope.WynneRegistry.get('WynneZooEconomy'))
            || globalScope.WynneZooEconomy
            || null;
    }

    // ── 辅助：获取 runtimeState ─────────────────────────────
    function getRuntimeState() {
        var eco = getEconomy();
        return eco && typeof eco.getRuntimeState === 'function' ? eco.getRuntimeState() : null;
    }

    // ── 辅助：触发持久化 ────────────────────────────────────
    function emitChange(reason) {
        var eco = getEconomy();
        if (eco && typeof eco.emitChange === 'function') {
            eco.emitChange(reason);
        }
    }

    // ── 辅助：确保 unlockedSystems 存在 ─────────────────────
    function ensureUnlockedSystems() {
        var state = getRuntimeState();
        if (!state) { return null; }
        if (!state.meta || typeof state.meta !== 'object') {
            state.meta = {};
        }
        if (!state.meta.unlockedSystems || typeof state.meta.unlockedSystems !== 'object') {
            state.meta.unlockedSystems = {};
        }
        return state.meta.unlockedSystems;
    }

    // ── 配置校验：读取并过滤有效条目 ────────────────────────
    function getValidEntries() {
        var table = globalScope.APP_CONFIG && globalScope.APP_CONFIG.systemUnlockTable;
        if (!Array.isArray(table)) {
            return [];
        }

        var seen = {};
        var result = [];
        for (var i = 0; i < table.length; i++) {
            var entry = table[i];
            if (!entry || typeof entry !== 'object') {
                console.warn('[SystemUnlock] 跳过无效条目（非对象），索引:', i);
                continue;
            }

            // 检查必要字段
            var missing = false;
            for (var f = 0; f < REQUIRED_FIELDS.length; f++) {
                var field = REQUIRED_FIELDS[f];
                if (typeof entry[field] !== 'string' || entry[field].trim() === '') {
                    console.warn('[SystemUnlock] 跳过缺少字段 "' + field + '" 的条目，索引:', i);
                    missing = true;
                    break;
                }
            }
            if (missing) { continue; }

            // 检查 chapterId 为非负整数
            var chapterId = entry.chapterId;
            if (typeof chapterId !== 'number' || !Number.isInteger(chapterId) || chapterId < 0) {
                console.warn('[SystemUnlock] 跳过 chapterId 无效的条目，索引:', i, 'chapterId:', chapterId);
                continue;
            }

            // 重复 systemId 以第一个为准
            if (seen[entry.systemId]) {
                continue;
            }
            seen[entry.systemId] = true;
            result.push(entry);
        }
        return result;
    }

    // ── mapChapterToStoryId ─────────────────────────────────
    function mapChapterToStoryId(chapterId) {
        if (chapterId === 0) {
            return 'prologue';
        }
        if (chapterId >= 1 && chapterId <= 10) {
            return '第' + CHINESE_NUMBERS[chapterId] + '章';
        }
        // 超过 10 直接用数字
        return '第' + chapterId + '章';
    }

    // ── checkAndUnlock ───────────────────────────────────────
    function checkAndUnlock(completedStoryId) {
        var result = { newlyUnlocked: [] };
        if (!completedStoryId || typeof completedStoryId !== 'string') {
            return result;
        }

        var unlockedSystems = ensureUnlockedSystems();
        if (!unlockedSystems) { return result; }

        var entries = getValidEntries();
        for (var i = 0; i < entries.length; i++) {
            var entry = entries[i];
            var mappedStoryId = mapChapterToStoryId(entry.chapterId);

            if (mappedStoryId !== completedStoryId) {
                continue;
            }

            // 跳过已解锁的系统（幂等）
            if (unlockedSystems[entry.systemId]
                && unlockedSystems[entry.systemId].unlockedAt > 0) {
                continue;
            }

            unlockedSystems[entry.systemId] = {
                unlockedAt: Date.now(),
                notificationShown: false
            };

            result.newlyUnlocked.push({
                systemId: entry.systemId,
                systemName: entry.systemName,
                iconSrc: entry.iconSrc
            });
        }

        if (result.newlyUnlocked.length > 0) {
            emitChange('system-unlock');
        }

        return result;
    }

    // ── syncFromStoryFlags ──────────────────────────────────
    function syncFromStoryFlags() {
        var result = { newlyUnlocked: [] };
        var state = getRuntimeState();
        if (!state || !state.meta) { return result; }

        var storyFlags = state.meta.storyFlags;
        if (!storyFlags || typeof storyFlags !== 'object') {
            return result;
        }

        var unlockedSystems = ensureUnlockedSystems();
        if (!unlockedSystems) { return result; }

        var entries = getValidEntries();
        for (var i = 0; i < entries.length; i++) {
            var entry = entries[i];
            var mappedStoryId = mapChapterToStoryId(entry.chapterId);

            if (!storyFlags[mappedStoryId]) {
                continue;
            }

            // 跳过已解锁的系统
            if (unlockedSystems[entry.systemId]
                && unlockedSystems[entry.systemId].unlockedAt > 0) {
                continue;
            }

            unlockedSystems[entry.systemId] = {
                unlockedAt: Date.now(),
                notificationShown: false
            };

            result.newlyUnlocked.push({
                systemId: entry.systemId,
                systemName: entry.systemName,
                iconSrc: entry.iconSrc
            });
        }

        if (result.newlyUnlocked.length > 0) {
            emitChange('system-unlock');
        }

        return result;
    }

    // ── isUnlocked ──────────────────────────────────────────
    function isUnlocked(systemId) {
        var unlockedSystems = ensureUnlockedSystems();
        if (!unlockedSystems) { return false; }
        var record = unlockedSystems[systemId];
        return Boolean(record && record.unlockedAt > 0);
    }

    // ── getAllStatus ─────────────────────────────────────────
    function getAllStatus() {
        var entries = getValidEntries();
        var result = [];
        for (var i = 0; i < entries.length; i++) {
            var entry = entries[i];
            result.push({
                systemId: entry.systemId,
                systemName: entry.systemName,
                iconSrc: entry.iconSrc,
                navElementId: entry.navElementId,
                unlocked: isUnlocked(entry.systemId)
            });
        }
        return result;
    }

    // ── getPendingNotifications ──────────────────────────────
    function getPendingNotifications() {
        var unlockedSystems = ensureUnlockedSystems();
        if (!unlockedSystems) { return []; }

        var entries = getValidEntries();
        var pending = [];
        for (var i = 0; i < entries.length; i++) {
            var entry = entries[i];
            var record = unlockedSystems[entry.systemId];
            if (record && record.unlockedAt > 0 && !record.notificationShown) {
                pending.push({
                    systemId: entry.systemId,
                    systemName: entry.systemName,
                    iconSrc: entry.iconSrc
                });
            }
        }
        return pending;
    }

    // ── markNotificationShown ───────────────────────────────
    function markNotificationShown(systemId) {
        var unlockedSystems = ensureUnlockedSystems();
        if (!unlockedSystems) { return; }
        var record = unlockedSystems[systemId];
        if (record) {
            record.notificationShown = true;
            emitChange('system-unlock');
        }
    }

    // ── 公开 API ────────────────────────────────────────────
    var api = {
        mapChapterToStoryId: mapChapterToStoryId,
        checkAndUnlock: checkAndUnlock,
        syncFromStoryFlags: syncFromStoryFlags,
        isUnlocked: isUnlocked,
        getAllStatus: getAllStatus,
        getPendingNotifications: getPendingNotifications,
        markNotificationShown: markNotificationShown
    };

    globalScope.WynneSystemUnlock = api;

    if (globalScope.WynneRegistry && typeof globalScope.WynneRegistry.register === 'function') {
        globalScope.WynneRegistry.register('WynneSystemUnlock', api);
    }
}(window));