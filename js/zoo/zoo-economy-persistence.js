(function initZooEconomyPersistence(globalScope) {
    'use strict';

    function safeParse(jsonText) {
        try {
            return JSON.parse(jsonText);
        } catch (error) {
            return null;
        }
    }

    function create(deps = {}) {
        const storagePrefix = String(deps.storagePrefix || '');
        const activeUserStorageKey = String(deps.activeUserStorageKey || '');
        const defaultUserIdPrefix = String(deps.defaultUserIdPrefix || 'guest');
        const saveThrottleMs = Math.max(0, Math.floor(Number(deps.saveThrottleMs) || 0));
        const normalizeState = typeof deps.normalizeState === 'function'
            ? deps.normalizeState
            : function fallbackNormalizeState(value) { return value; };
        const createDefaultState = typeof deps.createDefaultState === 'function'
            ? deps.createDefaultState
            : function fallbackCreateDefaultState() { return null; };

        let saveTimerId = 0;
        let lastSaveAt = 0;
        let pendingSaveUserId = '';
        let pendingSaveState = null;

        function normalizeUserId(userId) {
            return String(userId || '').trim().slice(0, 32);
        }

        function getStorageKeyForUser(userId) {
            const normalized = normalizeUserId(userId);
            return normalized ? `${storagePrefix}${encodeURIComponent(normalized)}` : '';
        }

        function loadLastActiveUserId() {
            try {
                return normalizeUserId(globalScope.localStorage.getItem(activeUserStorageKey));
            } catch (error) {
                return '';
            }
        }

        function persistActiveUserId(userId) {
            const normalized = normalizeUserId(userId);
            try {
                if (normalized) {
                    globalScope.localStorage.setItem(activeUserStorageKey, normalized);
                } else {
                    globalScope.localStorage.removeItem(activeUserStorageKey);
                }
            } catch (error) {
                return;
            }
        }

        function createDefaultUserId() {
            const timestamp = Date.now().toString(36).slice(-6);
            const randomPart = Math.random().toString(36).slice(2, 6);
            return normalizeUserId(`${defaultUserIdPrefix}-${timestamp}${randomPart}`);
        }

        function ensureInitialActiveUserId() {
            const lastUserId = loadLastActiveUserId();
            if (lastUserId) {
                return {
                    userId: lastUserId,
                    autoAssigned: false
                };
            }

            const defaultUserId = createDefaultUserId();
            persistActiveUserId(defaultUserId);

            return {
                userId: defaultUserId,
                autoAssigned: true
            };
        }

        function loadStateForUser(userId) {
            const storageKey = getStorageKeyForUser(userId);
            if (!storageKey) {
                return createDefaultState();
            }

            try {
                const rawText = globalScope.localStorage.getItem(storageKey);
                return normalizeState(safeParse(rawText));
            } catch (error) {
                return createDefaultState();
            }
        }

        function saveStateForUser(userId, state) {
            const storageKey = getStorageKeyForUser(userId);
            if (!storageKey) {
                return;
            }

            try {
                globalScope.localStorage.setItem(storageKey, JSON.stringify(state));
            } catch (error) {
                return;
            }
        }

        function clearPendingSaveTimer() {
            if (!saveTimerId) {
                return;
            }

            globalScope.clearTimeout(saveTimerId);
            saveTimerId = 0;
        }

        function persistStateNow(userId, state) {
            const targetUserId = normalizeUserId(userId);
            if (!targetUserId || !state) {
                return false;
            }

            clearPendingSaveTimer();
            pendingSaveUserId = '';
            pendingSaveState = null;
            saveStateForUser(targetUserId, state);
            lastSaveAt = Date.now();
            return true;
        }

        function flushPendingSave() {
            if (!pendingSaveUserId || !pendingSaveState) {
                clearPendingSaveTimer();
                return false;
            }

            return persistStateNow(pendingSaveUserId, pendingSaveState);
        }

        function scheduleStateSave(userId, state, options = {}) {
            const targetUserId = normalizeUserId(userId);
            if (!targetUserId || !state) {
                return false;
            }

            if (pendingSaveUserId && pendingSaveUserId !== targetUserId) {
                flushPendingSave();
            }

            pendingSaveUserId = targetUserId;
            pendingSaveState = state;

            const immediate = Boolean(options.immediate);
            const now = Date.now();
            const remainingMs = Math.max(0, saveThrottleMs - (now - lastSaveAt));

            if (immediate || lastSaveAt === 0 || remainingMs <= 0) {
                return persistStateNow(targetUserId, state);
            }

            if (saveTimerId) {
                return true;
            }

            saveTimerId = globalScope.setTimeout(() => {
                const queuedUserId = pendingSaveUserId;
                const queuedState = pendingSaveState;
                saveTimerId = 0;
                if (!queuedUserId || !queuedState) {
                    return;
                }
                persistStateNow(queuedUserId, queuedState);
            }, remainingMs);

            return true;
        }

        return {
            clearPendingSaveTimer,
            createDefaultUserId,
            ensureInitialActiveUserId,
            flushPendingSave,
            getStorageKeyForUser,
            loadLastActiveUserId,
            loadStateForUser,
            normalizeUserId,
            persistActiveUserId,
            persistStateNow,
            saveStateForUser,
            scheduleStateSave
        };
    }

    globalScope.WynneZooEconomyPersistence = {
        create
    };
}(window));
