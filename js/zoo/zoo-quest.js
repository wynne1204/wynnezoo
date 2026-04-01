(function initQuestSystem(globalScope) {
    'use strict';

    // =========================================================================
    // 静态任务链配置（QUEST_CHAIN）
    // =========================================================================

    const QUEST_CHAIN = Object.freeze([
        {
            id: 1,
            description: '喂养小熊猫 1 次',
            conditionType: 'feed',
            targetValue: 1,
            relatedId: 'red-panda',
            navTarget: 'habitat-panel'
        },
        {
            id: 2,
            description: '完成第一章剧情',
            conditionType: 'story',
            targetValue: 1,
            relatedId: '第一章',
            navTarget: 'story'
        },
        {
            id: 3,
            description: '建造小熊猫栏舍',
            conditionType: 'build',
            targetValue: 1,
            relatedId: 'red-panda',
            navTarget: 'habitat-panel'
        },
        {
            id: 4,
            description: '进行 1 次盲盒挑战',
            conditionType: 'blindbox',
            targetValue: 1,
            relatedId: '',
            navTarget: 'slot'
        },
        {
            id: 5,
            description: '升级小熊猫栏舍',
            conditionType: 'upgrade',
            targetValue: 1,
            relatedId: 'red-panda',
            navTarget: 'habitat-panel'
        },
        {
            id: 6,
            description: '再喂养小熊猫 3 次',
            conditionType: 'feed',
            targetValue: 3,
            relatedId: 'red-panda',
            navTarget: 'habitat-panel'
        }
    ]);
    const HABITAT_ID_BY_SPECIES_ID = Object.freeze({
        'red-panda': 'red-panda-grove'
    });

    // =========================================================================
    // 运行时状态
    // =========================================================================

    let runtimeState = createDefaultState();

    /**
     * 创建默认初始状态（第一个任务为活跃）。
     * @returns {{ version: number, currentQuestId: number|null, completedQuestIds: number[], progress: number }}
     */
    function createDefaultState() {
        return {
            version: 1,
            currentQuestId: QUEST_CHAIN.length > 0 ? QUEST_CHAIN[0].id : null,
            completedQuestIds: [],
            progress: 0
        };
    }

    // =========================================================================
    // localStorage 持久化层（Task 1.2）
    // =========================================================================

    const STORAGE_PREFIX = 'wynnesZoo.quest.user.';

    /**
     * 获取当前用户的 localStorage 存储键。
     * @returns {string} 存储键，userId 不可用时返回空字符串
     */
    function getStorageKey() {
        var economy = globalScope.WynneZooEconomy;
        var userId = economy && typeof economy.getActiveUserId === 'function'
            ? economy.getActiveUserId()
            : '';
        return userId ? STORAGE_PREFIX + encodeURIComponent(userId) : '';
    }

    /**
     * 将 runtimeState 序列化写入 localStorage。
     */
    function persistState() {
        var key = getStorageKey();
        if (!key) return;
        try {
            globalScope.localStorage.setItem(key, JSON.stringify(runtimeState));
        } catch (e) { /* 写入失败静默忽略 */ }
    }

    /**
     * 从 localStorage 反序列化恢复状态，异常时回退到默认状态。
     * @returns {{ version: number, currentQuestId: number|null, completedQuestIds: number[], progress: number }}
     */
    function loadState() {
        var key = getStorageKey();
        if (!key) return createDefaultState();
        try {
            var raw = JSON.parse(globalScope.localStorage.getItem(key));
            return normalizeState(raw);
        } catch (e) {
            return createDefaultState();
        }
    }

    /**
     * 校验并修正非法存档数据，确保状态始终合法。
     * @param {*} raw - 从 localStorage 解析出的原始对象
     * @returns {{ version: number, currentQuestId: number|null, completedQuestIds: number[], progress: number }}
     */
    function normalizeState(raw) {
        var defaults = createDefaultState();
        if (!raw || typeof raw !== 'object') return defaults;

        // 校验 completedQuestIds：必须是数组，元素必须是 QUEST_CHAIN 中存在的 id
        var validIds = QUEST_CHAIN.map(function (q) { return q.id; });
        var completedQuestIds = Array.isArray(raw.completedQuestIds)
            ? raw.completedQuestIds.filter(function (id) {
                return typeof id === 'number' && validIds.indexOf(id) !== -1;
            })
            : [];
        // 去重
        var seen = {};
        completedQuestIds = completedQuestIds.filter(function (id) {
            if (seen[id]) return false;
            seen[id] = true;
            return true;
        });

        // 校验 currentQuestId：必须是 QUEST_CHAIN 中存在的 id 且不在已完成列表中，或为 null（全部完成）
        var currentQuestId = raw.currentQuestId;
        if (currentQuestId === null && completedQuestIds.length === validIds.length) {
            // 全部完成，合法
            currentQuestId = null;
        } else if (typeof currentQuestId !== 'number' || validIds.indexOf(currentQuestId) === -1) {
            // 非法 id，找到第一个未完成的任务
            currentQuestId = defaults.currentQuestId;
            for (var i = 0; i < QUEST_CHAIN.length; i++) {
                if (completedQuestIds.indexOf(QUEST_CHAIN[i].id) === -1) {
                    currentQuestId = QUEST_CHAIN[i].id;
                    break;
                }
            }
        } else if (completedQuestIds.indexOf(currentQuestId) !== -1) {
            // currentQuestId 已在完成列表中，找下一个未完成的
            currentQuestId = null;
            for (var j = 0; j < QUEST_CHAIN.length; j++) {
                if (completedQuestIds.indexOf(QUEST_CHAIN[j].id) === -1) {
                    currentQuestId = QUEST_CHAIN[j].id;
                    break;
                }
            }
        }

        // 校验 progress：必须是非负整数
        var progress = Math.max(0, Math.floor(Number(raw.progress) || 0));

        return {
            version: 1,
            currentQuestId: currentQuestId,
            completedQuestIds: completedQuestIds,
            progress: progress
        };
    }

    // =========================================================================
    // 进度检查与推进逻辑（Task 2）
    // =========================================================================

    /**
     * 根据 currentQuestId 从 QUEST_CHAIN 中查找当前活跃任务。
     * @returns {Object|null} 当前活跃任务对象，全部完成时返回 null
     */
    function getActiveQuest() {
        if (runtimeState.currentQuestId == null) return null;
        for (var i = 0; i < QUEST_CHAIN.length; i++) {
            if (QUEST_CHAIN[i].id === runtimeState.currentQuestId) {
                return QUEST_CHAIN[i];
            }
        }
        return null;
    }

    /**
     * 根据 id 从 QUEST_CHAIN 中查找任务。
     * @param {number} id
     * @returns {Object|null}
     */
    function getQuestById(id) {
        for (var i = 0; i < QUEST_CHAIN.length; i++) {
            if (QUEST_CHAIN[i].id === id) {
                return QUEST_CHAIN[i];
            }
        }
        return null;
    }

    /**
     * 在经济系统快照的 habitats 数组中查找指定 id 的栏舍。
     * @param {Object} snapshot - 经济系统快照
     * @param {string} habitatId - 栏舍 id
     * @returns {Object|null}
     */
    function findHabitatById(snapshot, habitatId) {
        var habitats = snapshot && snapshot.habitats;
        if (!Array.isArray(habitats)) return null;
        for (var i = 0; i < habitats.length; i++) {
            if (habitats[i] && habitats[i].id === habitatId) {
                return habitats[i];
            }
        }
        return null;
    }

    function getQuestHabitatId(quest) {
        var relatedId = String(quest && quest.relatedId || '').trim();
        return HABITAT_ID_BY_SPECIES_ID[relatedId] || relatedId;
    }

    /**
     * 检查 build 类型任务条件：目标栏舍是否已解锁。
     * @param {Object} snapshot - 经济系统快照
     * @param {Object} quest - 当前活跃任务
     */
    function checkBuildCondition(snapshot, quest) {
        var habitat = findHabitatById(snapshot, getQuestHabitatId(quest));
        if (habitat && habitat.unlocked) {
            runtimeState.progress = quest.targetValue;
        }
    }

    /**
     * 检查 upgrade 类型任务条件：目标栏舍是否已升级到 2 级及以上。
     * @param {Object} snapshot - 经济系统快照
     * @param {Object} quest - 当前活跃任务
     */
    function checkUpgradeCondition(snapshot, quest) {
        var habitat = findHabitatById(snapshot, getQuestHabitatId(quest));
        if (habitat && habitat.unlocked && habitat.tier
            && habitat.tier.id !== 'tier-1') {
            runtimeState.progress = quest.targetValue;
        }
    }

    /**
     * 当经济系统状态变化时调用。
     * 根据 reason 判断是否与当前任务相关，更新进度。
     * @param {Object} snapshot - 经济系统快照
     * @param {{ reason: string }} meta - 变化原因
     */
    function onEconomyChange(snapshot, meta) {
        var reason = meta && meta.reason;
        var quest = getActiveQuest();
        if (!quest) return;

        switch (quest.conditionType) {
            case 'feed':
                if (reason === 'feed') {
                    runtimeState.progress += 1;
                }
                break;
            case 'build':
                checkBuildCondition(snapshot, quest);
                break;
            case 'upgrade':
                if (reason === 'upgrade-tier') {
                    checkUpgradeCondition(snapshot, quest);
                }
                break;
        }

        checkCompletion();
    }

    /**
     * 处理 STORY_COMPLETE 事件，更新 story 类型任务进度。
     * @param {Object} payload - 事件载荷，包含 storyId
     */
    function onStoryComplete(payload) {
        var quest = getActiveQuest();
        if (!quest || quest.conditionType !== 'story') return;

        runtimeState.progress += 1;
        checkCompletion();
    }

    /**
     * 处理 ROUND_END 事件，更新 blindbox 类型任务进度。
     * @param {Object} payload - 事件载荷
     */
    function onRoundEnd(payload) {
        var quest = getActiveQuest();
        if (!quest || quest.conditionType !== 'blindbox') return;

        runtimeState.progress += 1;
        checkCompletion();
    }

    /**
     * 检查当前任务是否完成，若完成则推进到下一个任务。
     */
    function checkCompletion() {
        var quest = getActiveQuest();
        if (!quest) return;

        if (runtimeState.progress >= quest.targetValue) {
            completeCurrentQuest();
        } else {
            persistState();
            renderQuestUI();
            notifySubscribers('progress');
        }
    }

    /**
     * 完成当前任务，推进到下一个。
     */
    function completeCurrentQuest() {
        var quest = getActiveQuest();
        if (!quest) return;

        runtimeState.completedQuestIds.push(quest.id);

        // 在 QUEST_CHAIN 中找到当前任务的索引，取下一个
        var nextQuest = null;
        for (var i = 0; i < QUEST_CHAIN.length; i++) {
            if (QUEST_CHAIN[i].id === quest.id && i + 1 < QUEST_CHAIN.length) {
                nextQuest = QUEST_CHAIN[i + 1];
                break;
            }
        }

        if (nextQuest) {
            runtimeState.currentQuestId = nextQuest.id;
            runtimeState.progress = 0;
        } else {
            runtimeState.currentQuestId = null;
        }

        persistState();
        renderQuestUI();
        emitQuestComplete(quest);
        showCompletionToast(quest);
        notifySubscribers('quest-complete');

        // 对新任务执行追赶检查
        if (nextQuest) {
            catchUpCheck(globalScope.WynneZooEconomy);
        }
    }

    // =========================================================================
    // 追赶检查（Task 3）
    // =========================================================================

    /**
     * 统计 storyFlags 中与 relatedId 匹配的已完成剧情数量。
     * @param {Object} storyFlags - 剧情标记对象，键为剧情 ID，值为布尔
     * @param {string} relatedId - 任务关联的剧情 ID
     * @returns {number} 已完成的匹配剧情数量
     */
    function countCompletedStories(storyFlags, relatedId) {
        if (!storyFlags || typeof storyFlags !== 'object') return 0;
        var count = 0;
        var keys = Object.keys(storyFlags);
        for (var i = 0; i < keys.length; i++) {
            if (storyFlags[keys[i]] && keys[i] === relatedId) {
                count += 1;
            }
        }
        return count;
    }

    /**
     * 检查当前活跃任务是否在激活时已满足条件。
     * 对于 build/upgrade 类型，检查经济系统快照中的栏舍状态。
     * 对于 story 类型，检查已完成的剧情标记。
     * @param {Object} economy - 经济系统模块引用
     */
    function catchUpCheck(economy) {
        var quest = getActiveQuest();
        if (!quest || !economy) return;

        var snapshot = economy.getSnapshot();

        switch (quest.conditionType) {
            case 'build': {
                var habitat = findHabitatById(snapshot, getQuestHabitatId(quest));
                if (habitat && habitat.unlocked) {
                    runtimeState.progress = quest.targetValue;
                }
                break;
            }
            case 'upgrade': {
                var habitat = findHabitatById(snapshot, getQuestHabitatId(quest));
                if (habitat && habitat.unlocked && habitat.tier
                    && habitat.tier.id !== 'tier-1') {
                    runtimeState.progress = quest.targetValue;
                }
                break;
            }
            case 'story': {
                var storyFlags = snapshot.storyFlags || {};
                var completedCount = countCompletedStories(storyFlags, quest.relatedId);
                runtimeState.progress = Math.max(runtimeState.progress, completedCount);
                break;
            }
        }

        checkCompletion();
    }

    // =========================================================================
    // 公开 API 和事件发射（Task 5）
    // =========================================================================

    /**
     * 发射任务完成事件到事件总线。
     * （完整实现将在 Task 5 中完成）
     * @param {Object} quest - 已完成的任务对象
     */
    function emitQuestComplete(quest) {
        var Events = globalScope.WynneEvents;
        if (Events && typeof Events.emit === 'function') {
            Events.emit('quest:complete', {
                questId: quest.id,
                nextQuestId: runtimeState.currentQuestId
            });
        }
    }

    /**
     * 显示任务完成的 Toast 提示。
     * （完整实现将在 Task 5 中完成）
     * @param {Object} quest - 已完成的任务对象
     */
    function showCompletionToast(quest) {
        var message = '✅ 任务完成：' + quest.description;
        // 优先使用 ZooHomeModule.notify（项目已有的 Toast 机制）
        var zooHome = globalScope.WynneRegistry
            && typeof globalScope.WynneRegistry.get === 'function'
            ? globalScope.WynneRegistry.get('ZooHomeModule')
            : null;
        if (zooHome && typeof zooHome.notify === 'function') {
            zooHome.notify(message, 'success');
            return;
        }
        // 回退：直接操作 zoo-home-toast DOM 元素
        var toastEl = globalScope.document && globalScope.document.getElementById('zoo-home-toast');
        if (toastEl) {
            toastEl.textContent = message;
            toastEl.dataset.tone = 'success';
            toastEl.classList.add('is-visible');
            globalScope.setTimeout(function () {
                toastEl.classList.remove('is-visible');
            }, 2200);
        }
    }

    /** @type {Array<Function>} */
    var listeners = [];

    /**
     * 通知所有订阅者状态已变更。
     * @param {string} [reason] - 变更原因
     */
    function notifySubscribers(reason) {
        var snap = getSnapshot();
        var meta = { reason: reason || 'update' };
        for (var i = 0; i < listeners.length; i++) {
            try {
                listeners[i](snap, meta);
            } catch (e) { /* 订阅者异常不影响其他订阅者 */ }
        }
    }

    /**
     * 获取当前任务系统的只读快照。
     * @returns {QuestSnapshot}
     */
    function getSnapshot() {
        var quest = getActiveQuest();
        var currentQuest = null;
        if (quest) {
            currentQuest = {
                id: quest.id,
                description: quest.description,
                conditionType: quest.conditionType,
                targetValue: quest.targetValue,
                relatedId: quest.relatedId,
                navTarget: quest.navTarget,
                progress: runtimeState.progress
            };
        }
        return {
            currentQuestId: runtimeState.currentQuestId,
            currentQuest: currentQuest,
            completedQuestIds: runtimeState.completedQuestIds.slice(),
            allCompleted: runtimeState.currentQuestId === null,
            totalQuests: QUEST_CHAIN.length
        };
    }

    /**
     * 订阅任务状态变化。回调在每次状态变更时触发。
     * @param {Function} listener - (snapshot, { reason }) => void
     * @returns {Function} unsubscribe 函数
     */
    function subscribe(listener) {
        if (typeof listener !== 'function') return function () {};
        listeners.push(listener);
        return function unsubscribe() {
            var idx = listeners.indexOf(listener);
            if (idx !== -1) {
                listeners.splice(idx, 1);
            }
        };
    }

    /**
     * 获取当前活跃任务的描述文本（供 zoo-home.js 渲染按钮用）。
     * @returns {string}
     */
    function getActiveQuestText() {
        var quest = getActiveQuest();
        if (!quest) return '主线任务已全部完成';

        if (['feed', 'story', 'blindbox'].includes(quest.conditionType)) {
            return quest.description + '（' + runtimeState.progress + '/' + quest.targetValue + '）';
        }
        return quest.description;
    }

    /**
     * 获取当前活跃任务的导航目标（供按钮点击跳转用）。
     * @returns {string|null} 'story' | 'slot' | 'habitat-panel' | null
     */
    function getActiveQuestNavTarget() {
        var quest = getActiveQuest();
        return quest ? quest.navTarget || null : null;
    }

    /**
     * 手动触发追赶检查（用于模块延迟加载场景）。
     */
    function recheckProgress() {
        catchUpCheck(globalScope.WynneZooEconomy);
    }

    var api = {
        getSnapshot: getSnapshot,
        subscribe: subscribe,
        getActiveQuestText: getActiveQuestText,
        getActiveQuestNavTarget: getActiveQuestNavTarget,
        recheckProgress: recheckProgress
    };

    // =========================================================================
    // UI 渲染（Task 6）
    // =========================================================================

    /**
     * 更新左下角任务按钮的文本内容。
     * （完整实现将在 Task 6 中完成）
     */
    function renderQuestUI() {
        var textEl = globalScope.document && globalScope.document.getElementById('zoo-main-task-text');
        if (!textEl) return;
        textEl.textContent = getActiveQuestText();
    }

    // =========================================================================
    // 初始化与注册（Task 7）
    // =========================================================================

    // 从 localStorage 恢复状态
    runtimeState = loadState();

    // 获取依赖模块
    var economy = globalScope.WynneZooEconomy || null;
    var Events = globalScope.WynneEvents || null;

    // 订阅经济系统变化
    if (economy && typeof economy.subscribe === 'function') {
        economy.subscribe(onEconomyChange);
    }

    // 监听事件总线
    if (Events && typeof Events.on === 'function') {
        Events.on(Events.EVENTS.STORY_COMPLETE, onStoryComplete);
        Events.on(Events.EVENTS.ROUND_END, onRoundEnd);
    }

    // 执行初始追赶检查（处理离线期间已满足的条件）
    catchUpCheck(economy);

    // 首次 UI 渲染
    renderQuestUI();

    // 注册模块到 WynneRegistry
    if (globalScope.WynneRegistry && typeof globalScope.WynneRegistry.register === 'function') {
        globalScope.WynneRegistry.register('WynneZooQuest', api);
    }

    // 导出供测试使用的内部引用
    globalScope._WynneZooQuestInternals = {
        QUEST_CHAIN: QUEST_CHAIN,
        createDefaultState: createDefaultState,
        getRuntimeState: function () { return runtimeState; },
        setRuntimeState: function (s) { runtimeState = s; },
        getStorageKey: getStorageKey,
        persistState: persistState,
        loadState: loadState,
        normalizeState: normalizeState,
        getActiveQuest: getActiveQuest,
        getQuestById: getQuestById,
        findHabitatById: findHabitatById,
        checkBuildCondition: checkBuildCondition,
        checkUpgradeCondition: checkUpgradeCondition,
        onEconomyChange: onEconomyChange,
        onStoryComplete: onStoryComplete,
        onRoundEnd: onRoundEnd,
        checkCompletion: checkCompletion,
        completeCurrentQuest: completeCurrentQuest,
        catchUpCheck: catchUpCheck,
        countCompletedStories: countCompletedStories,
        emitQuestComplete: emitQuestComplete,
        showCompletionToast: showCompletionToast,
        renderQuestUI: renderQuestUI,
        getSnapshot: getSnapshot,
        subscribe: subscribe,
        getActiveQuestText: getActiveQuestText,
        getActiveQuestNavTarget: getActiveQuestNavTarget,
        recheckProgress: recheckProgress,
        notifySubscribers: notifySubscribers,
        getListeners: function () { return listeners; }
    };

}(window));
