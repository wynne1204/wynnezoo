// ============================================================
// Slot Game — Runtime Logic
// Shared slot state and DOM bindings are loaded before this file.
// ============================================================





const SIMPLE_MATCH_CORE = (() => {
    if (!SIMPLE_SLOT_MODE) {
        return null;
    }
    if (!window.WynneSimpleMatchCore || typeof window.WynneSimpleMatchCore.create !== 'function') {
        throw new Error('js/slot/simple-match-core.js must be loaded before slot-main.js');
    }
    return window.WynneSimpleMatchCore.create({
        config: CONFIG,
        state: STATE,
        simpleSlotMode: SIMPLE_SLOT_MODE,
        elements: {
            gameContainer,
            customerSatisfaction,
            customerPreferenceBlockDisplay,
            cashoutBtn,
            randomBtn,
            slotWishOverlay: document.getElementById('slot-wish-overlay'),
            slotWishOptions: document.getElementById('slot-wish-options'),
            restockTray,
            restockTrayBoxes,
            gridSelectionHint
        },
        helpers: {
            getNormalSymbolImage,
            createNormalBlockData,
            pickRandomItem,
            stopAutoOpen,
            updateSlotBackButtonVisibility,
            renderCurrentCustomer,
            getGridCellElement,
            resetGridCellElement,
            clearStickyWildRoundBadge,
            clearBombAnimImage,
            positionSimpleModeCellPlusButton,
            ensureSafeOpenBoxImage,
            getGridCellBoxCenterInViewport,
            getRestockTrayBoxCenterInViewport,
            highlightRealtimeSettlementEvent,
            createFloatingText,
            waitMs,
            playSimpleModeRestockFlight,
            playSimpleModeRestockLandingFeedback,
            playSimpleModeSelectedCellFeedback,
            clearRealtimeSettlementHighlight,
            handleAllBoxesOpened,
            updateStats,
            clearAutoOpenHoldTimer,
            clearAutoOpenLoopTimer
        }
    });
})();

function getZooEconomy() {
    return (window.WynneRegistry && window.WynneRegistry.get('WynneZooEconomy')) || window.WynneZooEconomy || null;
}

function requestFreshRoundTicket() {
    const zooEconomy = getZooEconomy();
    if (!zooEconomy || typeof zooEconomy.consumePlayTicket !== 'function') {
        return true;
    }
    return zooEconomy.consumePlayTicket();
}

function applyRoundRewardsToZooEconomy() {
    if (STATE.rewardsAppliedToZoo) return;
    STATE.rewardsAppliedToZoo = true;
    if (SIMPLE_SLOT_MODE) {
        return;
    }

    const zooEconomy = getZooEconomy();
    if (!zooEconomy || typeof zooEconomy.applySlotSettlement !== 'function') {
        return;
    }

    zooEconomy.applySlotSettlement({
        coinReward: Math.max(0, Math.floor(Number(STATE.roundReward) || 0)),
        diamondReward: Math.max(0, Math.floor(Number(STATE.bonusDiamondReward) || 0))
    });
}

function clearCompletedRoundRuntime() {
    SLOT_GAME_RUNTIME.initialized = false;
    SLOT_GAME_RUNTIME.viewActive = false;
    SLOT_GAME_RUNTIME.ticketConsumedThisRound = false;
    if (modalOverlay) {
        modalOverlay.classList.add('hidden');
    }
    updateSlotBackButtonVisibility();
}

function clearAutoOpenHoldTimer() {
    if (AUTO_OPEN_STATE.holdTimerId !== null) {
        clearTimeout(AUTO_OPEN_STATE.holdTimerId);
        AUTO_OPEN_STATE.holdTimerId = null;
    }
}

function clearAutoOpenLoopTimer() {
    if (AUTO_OPEN_STATE.loopTimerId !== null) {
        clearTimeout(AUTO_OPEN_STATE.loopTimerId);
        AUTO_OPEN_STATE.loopTimerId = null;
    }
}

function stopAutoOpen({ clearButtonSuppression = true } = {}) {
    clearAutoOpenHoldTimer();
    clearAutoOpenLoopTimer();
    AUTO_OPEN_STATE.active = false;
    if (clearButtonSuppression) {
        AUTO_OPEN_STATE.suppressNextButtonClick = false;
    }
    updatePrimaryActionButtonState();
}

function performPrimaryOpenAction() {
    if (randomBtn?.disabled) {
        return false;
    }
    if (SIMPLE_SLOT_MODE && !hasSimpleWishSelection()) {
        showSimpleWishOverlay();
        return false;
    }

    if (FREE_SPIN_STATE.active) {
        if (FREE_SPIN_STATE.isEntering || FREE_SPIN_STATE.isSettling || FREE_SPIN_STATE.isTransitioning || isFreeSpinBlockedByBonusState()) {
            return false;
        }
        const pendingItems = getUnrevealedFreeSpinItems();
        if (pendingItems.length <= 0) return false;
        const target = pendingItems[Math.floor(Math.random() * pendingItems.length)];
        handleFreeSpinCellClick(target.id);
        return true;
    }

    if (STATE.isGameOver || STATE.isBoardEntering || STATE.isAnimating || STATE.isSettling || STATE.isBonusGameActive || STATE.bonusGamePendingStart) {
        return false;
    }

    const availableCount = STATE.unrevealedIndices.length;
    if (availableCount <= 0) return false;

    const randomIndex = STATE.unrevealedIndices[Math.floor(Math.random() * availableCount)];
    handleCellClick(randomIndex);
    return true;
}

function scheduleAutoOpenTick(delayMs = AUTO_OPEN_LOOP_DELAY_MS) {
    clearAutoOpenLoopTimer();
    if (!AUTO_OPEN_STATE.active) return;
    AUTO_OPEN_STATE.loopTimerId = window.setTimeout(runAutoOpenTick, Math.max(0, delayMs));
}

function runAutoOpenTick() {
    if (!AUTO_OPEN_STATE.active) return;
    const opened = performPrimaryOpenAction();
    scheduleAutoOpenTick(opened ? AUTO_OPEN_LOOP_DELAY_MS : AUTO_OPEN_RETRY_DELAY_MS);
}

function startAutoOpen() {
    clearAutoOpenHoldTimer();
    AUTO_OPEN_STATE.suppressNextButtonClick = true;
    if (AUTO_OPEN_STATE.active) return;
    AUTO_OPEN_STATE.active = true;
    updatePrimaryActionButtonState();
    runAutoOpenTick();
}

function scheduleAutoOpenFromLongPress() {
    clearAutoOpenHoldTimer();
    if (!randomBtn || randomBtn.disabled || AUTO_OPEN_STATE.active) return;
    AUTO_OPEN_STATE.holdTimerId = window.setTimeout(() => {
        AUTO_OPEN_STATE.holdTimerId = null;
        startAutoOpen();
    }, AUTO_OPEN_HOLD_MS);
}

function handlePrimaryButtonClick(event) {
    if (AUTO_OPEN_STATE.suppressNextButtonClick) {
        AUTO_OPEN_STATE.suppressNextButtonClick = false;
        event.preventDefault();
        event.stopPropagation();
        return;
    }

    if (AUTO_OPEN_STATE.active) {
        stopAutoOpen();
        event.preventDefault();
        event.stopPropagation();
        return;
    }

    performPrimaryOpenAction();
}

function bindPrimaryActionButton() {
    if (!randomBtn) return;

    randomBtn.addEventListener('pointerdown', () => {
        scheduleAutoOpenFromLongPress();
    });
    randomBtn.addEventListener('pointerup', clearAutoOpenHoldTimer);
    randomBtn.addEventListener('pointerleave', clearAutoOpenHoldTimer);
    randomBtn.addEventListener('pointercancel', clearAutoOpenHoldTimer);
    randomBtn.addEventListener('click', handlePrimaryButtonClick);

    document.addEventListener('pointerdown', (event) => {
        if (!AUTO_OPEN_STATE.active) return;
        const target = event.target;
        if (target instanceof Element && target.closest('#random-btn')) {
            return;
        }
        AUTO_OPEN_STATE.suppressNextScreenClick = true;
        stopAutoOpen();
        event.preventDefault();
        event.stopPropagation();
    }, true);
    document.addEventListener('click', (event) => {
        if (!AUTO_OPEN_STATE.suppressNextScreenClick) return;
        const target = event.target;
        if (target instanceof Element && target.closest('#random-btn')) {
            return;
        }
        AUTO_OPEN_STATE.suppressNextScreenClick = false;
        event.preventDefault();
        event.stopPropagation();
    }, true);

    updatePrimaryActionButtonState();
}


function loadScriptOnce(key, src) {
    if (LAZY_MODULES[key]) {
        return LAZY_MODULES[key];
    }
    LAZY_MODULES[key] = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => {
            LAZY_MODULES[key] = null;
            reject(new Error(`Failed to load ${src}`));
        };
        document.head.appendChild(script);
    });
    return LAZY_MODULES[key];
}

function loadEffectsApi() {
    if (window.GameEffects) {
        return Promise.resolve(window.GameEffects);
    }
    return loadScriptOnce('effects', './js/effects.js')
        .then(() => window.GameEffects || null)
        .catch((error) => {
            console.error('Effects module load failed:', error);
            return null;
        });
}

function getBonusModuleDeps() {
    return {
        statusBarTop,
        mainStage,
        controlPanel,
        bonusScreen,
        bonusGridBoard,
        bonusSpinBtn,
        bonusSpinMeta,
        bonusSpinsLeftInline,
        bonusTotalReward,
        bonusChestCards,
        bonusChestCardMap,
        bonusChestRow,
        bonusTriggerStackRow,
        bonusTriggerStackCards,
        bonusTriggerStackCardMap,
        sceneFade,
        gameContainer,
        bonusResultOverlay,
        bonusResultReward,
        bonusResultCollectBtn,
        bonusParticlesCanvas,
        freeSpinHud,
        createFloatingText,
        createBombWheel,
        removeBombWheel,
        highlightWinningSegment,
        showModal,
        waitMs,
        waitRaf
    };
}

function applyBaseBonusUiReset() {
    [statusBarTop, mainStage, controlPanel].forEach((el) => {
        if (!el) return;
        el.classList.remove('hidden');
    });
    if (bonusScreen) {
        bonusScreen.classList.add('hidden');
    }
    if (bonusGridBoard) {
        bonusGridBoard.innerHTML = '';
        bonusGridBoard.classList.remove('is-spinning');
    }
    bonusChestCards.forEach((card) => {
        card.classList.remove('win');
        const dots = card.querySelectorAll('.bonus-dot');
        dots.forEach((dot) => dot.classList.remove('active'));
    });
    bonusTriggerStackCards.forEach((card) => {
        card.classList.remove('unlocked', 'collapsed', 'collapse-burst');
        card.classList.remove('hidden');
        const giftImg = card.querySelector('[data-role="gift-img"]');
        if (!giftImg) return;
        if (card.dataset.stackId === 'add') {
            giftImg.src = './Texture/Icon/Giftpack1.png';
            giftImg.alt = 'Giftpack1';
            return;
        }
        if (card.dataset.stackId === 'chest') {
            giftImg.src = './Texture/Icon/Giftpack2.png';
            giftImg.alt = 'Giftpack2';
        }
    });
    if (bonusChestRow) {
        bonusChestRow.classList.add('hidden');
    }
    if (bonusTriggerStackRow) {
        bonusTriggerStackRow.classList.remove('hidden');
    }
    if (bonusSpinsLeftInline) {
        bonusSpinsLeftInline.textContent = '3';
    }
    if (bonusTotalReward) {
        bonusTotalReward.textContent = '0';
    }
    if (bonusSpinBtn) {
        bonusSpinBtn.disabled = true;
        bonusSpinBtn.classList.remove('spinning');
        bonusSpinBtn.textContent = 'SPIN';
    }
}

function loadBonusApi() {
    if (window.BonusGame) {
        if (typeof window.BonusGame.init === 'function') {
            window.BonusGame.init(getBonusModuleDeps());
        }
        return Promise.resolve(window.BonusGame);
    }
    return loadScriptOnce('bonus', './js/bonus.js')
        .then(() => {
            const api = window.BonusGame || null;
            if (api && typeof api.init === 'function') {
                api.init(getBonusModuleDeps());
            }
            return api;
        })
        .catch((error) => {
            console.error('Bonus module load failed:', error);
            return null;
        });
}

function runBonusSpin() {
    const currentApi = window.BonusGame;
    if (currentApi && typeof currentApi.runBonusSpin === 'function') {
        currentApi.runBonusSpin();
        return;
    }
    void loadBonusApi().then((api) => {
        if (api && typeof api.runBonusSpin === 'function') {
            api.runBonusSpin();
        }
    });
}

function startBonusGame(baseCashoutScore, baseSummaryMessage, options = {}) {
    stopAutoOpen();
    return loadBonusApi().then((api) => {
        if (!api || typeof api.startBonusGame !== 'function') {
            if (typeof options.onFinish === 'function') {
                options.onFinish({
                    bonusReward: 0,
                    finalScore: baseCashoutScore,
                    summary: `${baseSummaryMessage} Bonus module failed to load.`
                });
            }
            return Promise.resolve();
        }
        return api.startBonusGame(baseCashoutScore, baseSummaryMessage, options);
    });
}

function resetBonusGameUI() {
    const currentApi = window.BonusGame;
    if (!currentApi || typeof currentApi.resetBonusGameUI !== 'function') {
        applyBaseBonusUiReset();
        return;
    }
    currentApi.resetBonusGameUI();
}

function dispatchEffect(name, args) {
    const api = window.GameEffects;
    const immediateFn = api && api[name];
    if (typeof immediateFn === 'function') {
        immediateFn(...args);
        return;
    }

    void loadEffectsApi().then((loadedApi) => {
        const fn = loadedApi && loadedApi[name];
        if (typeof fn === 'function') {
            fn(...args);
        }
    });
}

function createParticles(x, y, color, count = 10) {
    dispatchEffect('createParticles', [x, y, color, count]);
}

function createFloatingText(x, y, text) {
    dispatchEffect('createFloatingText', [x, y, text]);
}

function createSafeShockwave(x, y) {
    dispatchEffect('createSafeShockwave', [x, y]);
}

function createSafeBurstParticles(x, y) {
    dispatchEffect('createSafeBurstParticles', [x, y]);
}

function createShockwave(x, y) {
    dispatchEffect('createShockwave', [x, y]);
}

function createConfettiFireworks() {
    dispatchEffect('createConfettiFireworks', []);
}

function createCustomerDepartureParticles(x, y) {
    dispatchEffect('createCustomerDepartureParticles', [x, y]);
}

function createCoinFloatingText(x, y, text) {
    dispatchEffect('createCoinFloatingText', [x, y, text]);
}

function createCoinRain(coinCount) {
    dispatchEffect('createCoinRain', [coinCount]);
}

function createCoinFall(coinCount) {
    dispatchEffect('createCoinFall', [coinCount]);
}

function createHeartBurstParticles(x, y) {
    dispatchEffect('createHeartBurstParticles', [x, y]);
}

function preloadBombMonkeyFrames() {
    if (bombMonkeyFramesPreloaded) return;
    bombMonkeyFramesPreloaded = true;
    BOMB_MONKEY_ANIM_FRAMES.forEach((src) => {
        const preload = new Image();
        preload.src = src;
    });
}

function scheduleDeferredPreload() {
    const run = () => {
        preloadBombMonkeyFrames();
        void loadEffectsApi();
    };
    if (typeof window.requestIdleCallback === 'function') {
        window.requestIdleCallback(run, { timeout: 1200 });
        return;
    }
    setTimeout(run, 900);
}

function isBombCell(index) {
    return STATE.grid[index] === CELL_BOMB;
}

function markCellAsRevealed(index) {
    if (STATE.revealed[index]) return;
    STATE.revealed[index] = 1;
    STATE.revealedCount += 1;
    removeUnrevealedIndex(index);
}

function removeUnrevealedIndex(index) {
    const pos = STATE.unrevealedPosByIndex[index];
    if (!Number.isFinite(pos) || pos < 0) return;
    const lastPos = STATE.unrevealedIndices.length - 1;
    if (lastPos < 0) return;
    const lastIndex = STATE.unrevealedIndices[lastPos];
    if (pos !== lastPos) {
        STATE.unrevealedIndices[pos] = lastIndex;
        STATE.unrevealedPosByIndex[lastIndex] = pos;
    }
    STATE.unrevealedIndices.pop();
    STATE.unrevealedPosByIndex[index] = -1;
}

function resetGridState(size) {
    const safeSize = Math.max(1, Number(size) || 16);
    STATE.grid = new Uint8Array(safeSize);
    STATE.revealed = new Uint8Array(safeSize);
    STATE.cellBlocks = new Array(safeSize).fill(null);
    STATE.boardCellStates = new Array(safeSize).fill('sealed');
    STATE.boardResolvedFlags = new Uint8Array(safeSize);
    STATE.pendingOpens = 0;
    STATE.revealedCount = 0;
    STATE.openedBlindBoxesThisRound = 0;
    STATE.isBoardEntering = false;
    STATE.roundReward = 0;
    STATE.bonusDiamondReward = 0;
    STATE.rewardsAppliedToZoo = false;
    STATE.totalSettlements = 0;
    STATE.realtimeSettlementEvents = [];
    STATE.symbolSettledSizeByKey = Object.create(null);
    STATE.boardPlan = new Array(safeSize).fill(null);
    STATE.boardMeta = null;
    STATE.isBonusGameActive = false;
    STATE.bonusGamePendingStart = false;
    STATE.hasTriggeredBonusGame = false;
    STATE.bonusTriggerBonusCount = 0;
    STATE.bonusTriggerWildCount = 0;
    STATE.freeSpinTriggersUsed = 0;
    STATE.unrevealedIndices = Array.from({ length: safeSize }, (_, index) => index);
    STATE.unrevealedPosByIndex = new Int32Array(safeSize);
    for (let i = 0; i < safeSize; i++) {
        STATE.unrevealedPosByIndex[i] = i;
    }
    if (SIMPLE_MATCH_CORE) {
        SIMPLE_MATCH_CORE.resetSimpleModeState(safeSize);
    } else {
        STATE.wishSymbolKey = '';
        STATE.remainingBlindBoxes = safeSize;
        STATE.restockPoolCount = 0;
        STATE.queuedBlindBoxes = 0;
        STATE.selectedIndexes = [];
        STATE.selectionMode = 'none';
        STATE.pendingPlacementIndexes = [];
    }
    resetFreeSpinRuntimeState();
}

function ensureStickyWildStateSize(size) {
    const safeSize = Math.max(1, Math.floor(Number(size) || 16));
    if (STICKY_WILD_STATE.carryRoundsByIndex.length !== safeSize) {
        STICKY_WILD_STATE.carryRoundsByIndex = new Int16Array(safeSize);
    }
    if (STICKY_WILD_STATE.activeMask.length !== safeSize) {
        STICKY_WILD_STATE.activeMask = new Uint8Array(safeSize);
    }
}

function prepareStickyWildForNextRound(size) {
    ensureStickyWildStateSize(size);
    STICKY_WILD_STATE.activeMask.fill(0);

    for (let i = 0; i < STICKY_WILD_STATE.carryRoundsByIndex.length; i++) {
        const remain = Math.max(0, Math.floor(Number(STICKY_WILD_STATE.carryRoundsByIndex[i]) || 0));
        if (remain <= 0) {
            STICKY_WILD_STATE.carryRoundsByIndex[i] = 0;
            continue;
        }
        STICKY_WILD_STATE.activeMask[i] = 1;
        STICKY_WILD_STATE.carryRoundsByIndex[i] = Math.max(0, remain - 1);
    }
}

function markStickyWildForFutureRounds(index) {
    const safeIndex = Math.floor(Number(index));
    if (!Number.isFinite(safeIndex) || safeIndex < 0) return;
    if (safeIndex >= STICKY_WILD_STATE.carryRoundsByIndex.length) return;
    const extraRounds = Math.max(0, Math.floor(Number(CONFIG.stickyWildExtraRounds) || 0));
    if (extraRounds <= 0) return;
    STICKY_WILD_STATE.carryRoundsByIndex[safeIndex] = Math.max(
        STICKY_WILD_STATE.carryRoundsByIndex[safeIndex],
        extraRounds
    );
}

function isStickyWildForcedAt(index) {
    const safeIndex = Math.floor(Number(index));
    if (!Number.isFinite(safeIndex) || safeIndex < 0) return false;
    if (safeIndex >= STICKY_WILD_STATE.activeMask.length) return false;
    return STICKY_WILD_STATE.activeMask[safeIndex] === 1;
}

function getCarriedStickyWildIndex(size = CONFIG.gridSize) {
    const safeSize = Math.max(1, Math.floor(Number(size) || CONFIG.gridSize || 16));
    for (let index = 0; index < safeSize; index++) {
        if (isStickyWildForcedAt(index)) {
            return index;
        }
    }
    return -1;
}

function getNormalSymbolImage(symbolKey) {
    const resolvedKey = String(symbolKey || '');
    const configuredOrder = Array.isArray(CONFIG.normalSymbolKeys) && CONFIG.normalSymbolKeys.length > 0
        ? CONFIG.normalSymbolKeys
        : NORMAL_SYMBOL_ORDER;
    let index = configuredOrder.indexOf(resolvedKey);
    if (index < 0) {
        index = NORMAL_SYMBOL_ORDER.indexOf(resolvedKey);
    }
    if (index >= 0 && Array.isArray(CONFIG.blockPool.normalImages) && CONFIG.blockPool.normalImages[index]) {
        return CONFIG.blockPool.normalImages[index];
    }
    return SYMBOL_IMAGE_FALLBACKS[resolvedKey] || CONFIG.blockPool.normalImages[0] || DEFAULT_CONFIG.blockPool.normalImages[0];
}

function createNormalBlockData(symbolKey) {
    return {
        type: 'normal',
        imageSrc: getNormalSymbolImage(symbolKey),
        normalKey: String(symbolKey || 'S1')
    };
}

function createSpecialBlockData(type) {
    if (type === 'wild') {
        return {
            type: 'wild',
            imageSrc: CONFIG.blockPool.wildImage,
            normalKey: null
        };
    }
    if (type === 'stickyWild') {
        return {
            type: 'stickyWild',
            imageSrc: CONFIG.blockPool.stickyWildImage,
            normalKey: null
        };
    }
    if (type === 'bonus') {
        return {
            type: 'bonus',
            imageSrc: CONFIG.blockPool.bonusImage,
            normalKey: null
        };
    }
    return createNormalBlockData('S1');
}

function getCustomerConfig() {
    const rawConfig = CONFIG.customerSystem || {};
    const targetCandidate = rawConfig.target
        ?? CONFIG.customerSatisfactionTarget
        ?? CONFIG.bonusTriggerProgressTarget
        ?? 8;
    const safeTarget = Math.max(1, Math.floor(Number(targetCandidate) || 8));
    const portraitImages = Array.isArray(rawConfig.portraitImages)
        ? rawConfig.portraitImages
        : (Array.isArray(CONFIG.customerPortraits) ? CONFIG.customerPortraits : []);
    const preferencePool = Array.isArray(rawConfig.preferencePool)
        ? rawConfig.preferencePool
        : (Array.isArray(rawConfig.preferenceSymbols)
            ? rawConfig.preferenceSymbols
            : (Array.isArray(CONFIG.customerPreferencePool)
                ? CONFIG.customerPreferencePool
                : (Array.isArray(CONFIG.customerPreferenceSymbols) ? CONFIG.customerPreferenceSymbols : [])));

    return {
        target: safeTarget,
        portraitImages: portraitImages.length > 0
            ? portraitImages
            : [
                './Texture/story/立绘/游客-1.webp',
                './Texture/story/立绘/游客-2.webp',
                './Texture/story/立绘/游客-3.webp',
                './Texture/story/立绘/游客-4.webp'
            ],
        preferencePool: preferencePool.length > 0 ? preferencePool : [...NORMAL_SYMBOL_ORDER]
    };
}

function getCustomerSatisfactionTarget() {
    return getCustomerConfig().target;
}

function normalizeCustomerPreferenceKey(symbolKey) {
    const raw = String(symbolKey || '').trim();
    if (!raw) return 'normal:S1';
    if (raw.startsWith('normal:')) return raw;
    const normalizedSymbol = NORMAL_SYMBOL_ORDER.includes(raw) ? raw : 'S1';
    return `normal:${normalizedSymbol}`;
}

function getCustomerPreferenceSymbolId(symbolKey) {
    const normalizedKey = normalizeCustomerPreferenceKey(symbolKey);
    const [, symbolId = 'S1'] = normalizedKey.split(':');
    return NORMAL_SYMBOL_ORDER.includes(symbolId) ? symbolId : 'S1';
}

function getCurrentCustomerPreferenceKey() {
    if (SIMPLE_SLOT_MODE && hasSimpleWishSelection()) {
        return normalizeCustomerPreferenceKey(STATE.wishSymbolKey);
    }
    return STATE.currentCustomer ? normalizeCustomerPreferenceKey(STATE.currentCustomer.preferenceKey) : null;
}

function playSimpleModeSelectedCellFeedback(cell) {
    if (!cell) return;
    const highlightTarget = cell.querySelector('.safe-open-box-frame') || cell.querySelector('.free-spin-reward-grid');
    if (!highlightTarget) return;
    restartCssClassAnimation(highlightTarget, 'settle-enlarge-glow');
    clearCssClassAnimation(highlightTarget, 'settle-enlarge-glow', 1220);
}

function pulseCustomerHeartRange(startValue, endValue) {
    if (!Array.isArray(customerHeartRows) || customerHeartRows.length <= 0) return;
    const start = Math.max(1, Math.floor(Number(startValue) || 0));
    const end = Math.max(start, Math.floor(Number(endValue) || 0));
    const total = customerHeartRows.length;
    for (let value = start; value <= end; value++) {
        const rowIndex = Math.max(0, total - value);
        const row = customerHeartRows[rowIndex];
        const icon = row && row.querySelector('.heart-icon');
        const delay = (value - start) * 120;
        window.setTimeout(() => {
            // 强烈的弹跳 + 发光动画
            animateUiElement(icon, [
                { transform: 'scale(0.6)' },
                { transform: 'scale(1.45)', filter: 'drop-shadow(0 0 8px rgba(255,107,132,0.9)) brightness(1.3)' },
                { transform: 'scale(0.92)', filter: 'brightness(1.05)' },
                { transform: 'scale(1.12)', filter: 'drop-shadow(0 0 4px rgba(255,107,132,0.5)) brightness(1.15)' },
                { transform: 'scale(1)', filter: 'brightness(1)' }
            ], {
                duration: 550,
                easing: 'cubic-bezier(0.22, 1, 0.36, 1)'
            });
            // 爱心位置迸发小粒子
            if (icon) {
                const rect = icon.getBoundingClientRect();
                const cx = rect.left + rect.width / 2;
                const cy = rect.top + rect.height / 2;
                createHeartBurstParticles(cx, cy);
            }
        }, delay);
    }
}

function createRandomCustomerProfile() {
    const customerConfig = getCustomerConfig();
    const portraits = customerConfig.portraitImages;
    const preferences = customerConfig.preferencePool
        .filter((item) => NORMAL_SYMBOL_ORDER.includes(String(item || '').trim()))
        .map((item) => String(item).trim());

    let chosenPortrait = pickRandomItem(portraits) || portraits[0];
    let chosenPreference = pickRandomItem(preferences) || preferences[0] || 'S1';
    let signature = `${chosenPortrait}|${chosenPreference}`;

    for (let attempt = 0; attempt < 6 && signature === STATE.lastCustomerSignature; attempt++) {
        chosenPortrait = pickRandomItem(portraits) || chosenPortrait;
        chosenPreference = pickRandomItem(preferences) || chosenPreference;
        signature = `${chosenPortrait}|${chosenPreference}`;
    }

    STATE.customerVisitCount += 1;
    return {
        id: `customer-${STATE.customerVisitCount}`,
        portraitSrc: chosenPortrait,
        portraitAlt: `顾客 ${STATE.customerVisitCount}`,
        preferenceKey: normalizeCustomerPreferenceKey(chosenPreference)
    };
}

function ensureCurrentCustomer() {
    if (STATE.currentCustomer) {
        renderCurrentCustomer();
        return STATE.currentCustomer;
    }
    STATE.currentCustomer = createRandomCustomerProfile();
    STATE.lastCustomerSignature = `${STATE.currentCustomer.portraitSrc}|${getCustomerPreferenceSymbolId(STATE.currentCustomer.preferenceKey)}`;
    renderCurrentCustomer();
    return STATE.currentCustomer;
}

async function advanceToNextCustomer() {
    const activePanel = customerPanel || customerPortraitDisplay;
    // 离场粒子：从顾客立绘中心位置发射
    const portraitEl = customerPortraitDisplay || customerPanel;
    if (portraitEl) {
        const rect = portraitEl.getBoundingClientRect();
        createCustomerDepartureParticles(rect.left + rect.width / 2, rect.top + rect.height * 0.35);
    }
    animateUiElement(activePanel, [
        { opacity: 1, transform: 'translateY(0) scale(1)' },
        { opacity: 0.12, transform: 'translateY(20px) scale(0.96)' }
    ], {
        duration: CUSTOMER_SWITCH_DELAY_MS,
        easing: 'ease-in'
    });
    await waitMs(CUSTOMER_SWITCH_DELAY_MS);

    STATE.currentCustomer = createRandomCustomerProfile();
    STATE.lastCustomerSignature = `${STATE.currentCustomer.portraitSrc}|${getCustomerPreferenceSymbolId(STATE.currentCustomer.preferenceKey)}`;
    renderCurrentCustomer();

    animateUiElement(activePanel, [
        { opacity: 0.12, transform: 'translateY(20px) scale(0.96)' },
        { opacity: 1, transform: 'translateY(0) scale(1)' }
    ], {
        duration: 340,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)'
    });
}

async function handleSatisfiedCustomer(event, clusterCenter) {
    if (!event || !event.satisfiesCustomer) return;

    // 气泡强烈弹跳 + 发光反馈
    animateUiElement(customerPreferenceBubble || customerPanel, [
        { transform: 'scale(1)', filter: 'brightness(1)' },
        { transform: 'scale(1.25)', filter: 'brightness(1.3) drop-shadow(0 0 12px rgba(255,215,0,0.7))' },
        { transform: 'scale(0.92)', filter: 'brightness(1.05)' },
        { transform: 'scale(1.08)', filter: 'brightness(1.15)' },
        { transform: 'scale(1)', filter: 'brightness(1)' }
    ], {
        duration: CUSTOMER_SATISFIED_FEEDBACK_MS + 100,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)'
    });
    // 立绘开心跳跃
    animateUiElement(customerPortraitDisplay, [
        { transform: 'translateY(0) scale(1)' },
        { transform: 'translateY(-14px) scale(1.05)' },
        { transform: 'translateY(2px) scale(0.98)' },
        { transform: 'translateY(-4px) scale(1.02)' },
        { transform: 'translateY(0) scale(1)' }
    ], {
        duration: CUSTOMER_SATISFIED_FEEDBACK_MS + 100,
        easing: 'ease-out'
    });

    // 气泡位置迸发爱心粒子
    if (customerPreferenceBubble) {
        const rect = customerPreferenceBubble.getBoundingClientRect();
        createHeartBurstParticles(rect.left + rect.width / 2, rect.top + rect.height / 2);
    }

    if (clusterCenter) {
        createFloatingText(clusterCenter.x, clusterCenter.y - 84, `❤ +${event.satisfactionGain}`);
    }

    await waitMs(CUSTOMER_SATISFIED_FEEDBACK_MS);
    await advanceToNextCustomer();
}

function decorateSettlementEventWithCustomerOutcome(event) {
    ensureCurrentCustomer();
    const preferenceKey = getCurrentCustomerPreferenceKey();
    const safeSize = Math.max(0, Math.floor(Number(event && event.size) || 0));
    const matchesCustomerPreference = Boolean(
        event
        && preferenceKey
        && String(event.symbolKey || '') === String(preferenceKey)
        && safeSize >= Math.max(1, Math.floor(Number(CONFIG.clusterPayout.minClusterSize) || 3))
    );
    const satisfactionGain = matchesCustomerPreference ? Math.max(0, safeSize - 2) : 0;
    event.customerPreferenceKey = preferenceKey;
    event.satisfactionGain = satisfactionGain;
    event.satisfiesCustomer = satisfactionGain > 0;
    return event;
}

function bindGridBoardClickHandler() {
    if (!gridBoard || isGridBoardClickBound) return;
    gridBoard.addEventListener('click', (event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;

        if (FREE_SPIN_STATE.active) {
            const freeSpinCell = target.closest('.free-spin-cell');
            if (!freeSpinCell || !gridBoard.contains(freeSpinCell)) return;
            const itemId = String(freeSpinCell.dataset.itemId || '');
            if (!itemId) return;
            handleFreeSpinCellClick(itemId);
            return;
        }

        if (SIMPLE_SLOT_MODE) {
            const plusButton = target.closest('.cell-plus');
            if (plusButton && gridBoard.contains(plusButton)) {
                event.preventDefault();
                event.stopPropagation();
                void playSimpleModeRestockSequence();
                return;
            }
        }

        const cell = target.closest('.grid-cell');
        if (!cell || !gridBoard.contains(cell)) return;
        const rawIndex = Number(cell.dataset.index);
        if (!Number.isFinite(rawIndex)) return;
        handleCellClick(rawIndex);
    });
    isGridBoardClickBound = true;
}

function bindSimpleModeRestockTrayHandler() {
    if (!SIMPLE_SLOT_MODE || !restockTray || restockTray.dataset.bound === '1') return;
    restockTray.dataset.bound = '1';
    restockTray.addEventListener('click', (event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;
        const trayBox = target.closest('.restock-tray-box');
        if (!trayBox || !restockTray.contains(trayBox)) return;
        void playSimpleModeRestockSequence();
    });
}

function seedBombs() {
    const total = STATE.grid.length;
    const bombCount = Math.min(total, Math.max(0, Number(CONFIG.bombCount) || 0));
    const temp = STATE.unrevealedIndices.slice();

    for (let i = 0; i < bombCount; i++) {
        const j = i + Math.floor(Math.random() * (total - i));
        const picked = temp[j];
        temp[j] = temp[i];
        temp[i] = picked;
        STATE.grid[picked] = CELL_BOMB;
    }
}

function applyGridBoardLayout(size) {
    if (!gridBoard) return;
    const side = getGridSideLength(size);
    gridBoard.style.gridTemplateColumns = `repeat(${side}, 1fr)`;
    gridBoard.style.gridTemplateRows = `repeat(${side}, 1fr)`;
    gridBoard.dataset.gridSide = String(side);
}

function renderGridBoardCells(size) {
    if (!gridBoard) return;
    const safeSize = Math.max(1, Number(size) || 16);
    applyGridBoardLayout(safeSize);
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < safeSize; i++) {
        const cell = document.createElement('div');
        cell.classList.add('grid-cell');
        cell.dataset.index = i;
        applyGridCellLayoutVars(cell, i, safeSize);
        const boxImg = document.createElement('img');
        boxImg.className = 'grid-cell-box-img';
        boxImg.src = GRID_BOX_UNOPEN_IMAGE_SRC;
        boxImg.alt = '';
        boxImg.draggable = false;
        cell.appendChild(boxImg);
        fragment.appendChild(cell);
    }
    gridBoard.innerHTML = '';
    gridBoard.appendChild(fragment);
    STATE.gridCells = Array.from(gridBoard.children);
}

function resetGridCellElement(cell, index) {
    if (!cell) return;
    cell.className = 'grid-cell';
    cell.dataset.index = String(index);
    applyGridCellLayoutVars(cell, index, STATE.gridCells.length || CONFIG.gridSize);
    // 保留箱子图片元素，清除其他子元素
    const existingBoxImg = cell.querySelector('.grid-cell-box-img');
    cell.textContent = '';
    if (existingBoxImg) {
        existingBoxImg.src = GRID_BOX_UNOPEN_IMAGE_SRC;
        existingBoxImg.style.display = '';
        cell.appendChild(existingBoxImg);
    } else {
        const boxImg = document.createElement('img');
        boxImg.className = 'grid-cell-box-img';
        boxImg.src = GRID_BOX_UNOPEN_IMAGE_SRC;
        boxImg.alt = '';
        boxImg.draggable = false;
        cell.appendChild(boxImg);
    }
}

function prepareGridBoardForNewRound(size) {
    if (!gridBoard) return;
    const safeSize = Math.max(1, Number(size) || 16);
    const currentCells = STATE.gridCells;
    applyGridBoardLayout(safeSize);

    if (!Array.isArray(currentCells) || currentCells.length !== safeSize || gridBoard.children.length !== safeSize) {
        renderGridBoardCells(safeSize);
        if (!SIMPLE_SLOT_MODE) {
            applyCarriedStickyWildCells(safeSize);
        }
        animateMainBoardEntrance();
        return;
    }

    for (let i = 0; i < safeSize; i++) {
        resetGridCellElement(currentCells[i], i);
    }

    if (!SIMPLE_SLOT_MODE) {
        applyCarriedStickyWildCells(safeSize);
    }
    animateMainBoardEntrance();
}

function getGridCellElement(index) {
    const safeIndex = Math.floor(Number(index));
    if (!Number.isFinite(safeIndex) || safeIndex < 0) return null;

    const currentCells = STATE.gridCells;
    if (Array.isArray(currentCells) && safeIndex < currentCells.length) {
        return currentCells[safeIndex] || null;
    }

    if (!gridBoard || safeIndex >= gridBoard.children.length) return null;
    return gridBoard.children[safeIndex] || null;
}

function clearGridSettlementClasses() {
    const currentCells = Array.isArray(STATE.gridCells) ? STATE.gridCells : [];
    currentCells.forEach((cell) => {
        if (!cell) return;
        cell.classList.remove('win-cluster', 'win-jackpot');
        cell.style.zIndex = '';
    });
}

function playSafeOpenFeedback(cell, center, options = {}) {
    if (!cell) return;

    cell.classList.add('revealed');
    if (options.markSafe !== false) {
        cell.classList.add('safe');
    }
    cell.classList.add('safe-flash');
    cell.classList.add('safe-pop');

    setTimeout(() => {
        if (cell.isConnected) {
            cell.classList.remove('safe-pop');
        }
    }, 300);

    if (center && Number.isFinite(center.x) && Number.isFinite(center.y)) {
        createSafeShockwave(center.x, center.y);
        createSafeBurstParticles(center.x, center.y);
    }
}

function resetFreeSpinRuntimeState() {
    FREE_SPIN_STATE.active = false;
    FREE_SPIN_STATE.pendingStart = false;
    FREE_SPIN_STATE.isEntering = false;
    FREE_SPIN_STATE.isSettling = false;
    FREE_SPIN_STATE.isTransitioning = false;
    FREE_SPIN_STATE.pausedByBonus = false;
    FREE_SPIN_STATE.spinsLeft = 0;
    FREE_SPIN_STATE.totalReward = 0;
    FREE_SPIN_STATE.items = [];
    FREE_SPIN_STATE.itemMap = new Map();
    FREE_SPIN_STATE.cellBlocks = new Array(CONFIG.gridSize).fill(null);
    FREE_SPIN_STATE.cellElementsByIndex = new Array(CONFIG.gridSize).fill(null);
    FREE_SPIN_STATE.symbolSettledSizeByKey = Object.create(null);
    FREE_SPIN_STATE.savedBoardMarkup = '';
    FREE_SPIN_STATE.savedGridCellCount = 0;
}

function updateFreeSpinHud() {
    if (freeSpinSpinsLeft) {
        freeSpinSpinsLeft.textContent = String(Math.max(0, FREE_SPIN_STATE.spinsLeft));
    }
    if (freeSpinTotalReward) {
        freeSpinTotalReward.textContent = String(Math.floor(FREE_SPIN_STATE.totalReward));
    }
}

function setFreeSpinHudVisible(isVisible) {
    if (!freeSpinHud) return;
    freeSpinHud.classList.toggle('hidden', !isVisible);
    updateFreeSpinHud();
}

function setFreeSpinVisualMode(isActive) {
    if (!gameContainer) return;
    gameContainer.classList.toggle('is-free-spin-mode', Boolean(isActive));
    updateSlotBackButtonVisibility();
}

function hideFreeSpinTriggerOverlay() {
    if (freeSpinTriggerOverlay) {
        freeSpinTriggerOverlay.classList.add('hidden');
    }
    updateSlotBackButtonVisibility();
}

function showFreeSpinTriggerOverlay() {
    if (!freeSpinTriggerOverlay) return;
    stopAutoOpen();
    freeSpinTriggerOverlay.classList.remove('hidden');
    updateSlotBackButtonVisibility();
}

function hideBonusTriggerOverlay({ resolvePending = true } = {}) {
    bonusTriggerConfirmPending = false;
    if (bonusTriggerStartBtn) {
        bonusTriggerStartBtn.classList.remove('click-feedback');
    }
    if (bonusTriggerOverlay) {
        bonusTriggerOverlay.classList.add('hidden');
    }
    if (resolvePending && typeof bonusTriggerOverlayResolver === 'function') {
        const resolver = bonusTriggerOverlayResolver;
        bonusTriggerOverlayResolver = null;
        resolver('dismiss');
    }
    updateSlotBackButtonVisibility();
}

function resolveBonusTriggerOverlayStart(source = 'confirm') {
    if (typeof bonusTriggerOverlayResolver !== 'function') {
        hideBonusTriggerOverlay({ resolvePending: false });
        return;
    }
    const resolver = bonusTriggerOverlayResolver;
    bonusTriggerOverlayResolver = null;
    hideBonusTriggerOverlay({ resolvePending: false });
    resolver(source);
}

function showBonusTriggerOverlay() {
    stopAutoOpen();
    bonusTriggerConfirmPending = false;
    if (bonusTriggerStartBtn) {
        bonusTriggerStartBtn.classList.remove('click-feedback');
    }
    if (!bonusTriggerOverlay) {
        return Promise.resolve('confirm');
    }
    hideBonusTriggerOverlay({ resolvePending: true });
    bonusTriggerOverlay.classList.remove('hidden');
    updateSlotBackButtonVisibility();
    return new Promise((resolve) => {
        bonusTriggerOverlayResolver = resolve;
    });
}

function playBonusTriggerButtonFeedback() {
    if (!bonusTriggerStartBtn) {
        return Promise.resolve();
    }
    bonusTriggerStartBtn.classList.remove('click-feedback');
    void bonusTriggerStartBtn.offsetWidth;
    bonusTriggerStartBtn.classList.add('click-feedback');
    return waitMs(BONUS_TRIGGER_BUTTON_FEEDBACK_MS).then(() => {
        if (bonusTriggerStartBtn) {
            bonusTriggerStartBtn.classList.remove('click-feedback');
        }
    });
}

async function beginPendingBonusGame() {
    if (!STATE.bonusGamePendingStart || STATE.isBonusGameActive || STATE.isGameOver) return false;
    if (FREE_SPIN_STATE.pendingStart) return false;
    const startedFromFreeSpin = FREE_SPIN_STATE.active;
    if (startedFromFreeSpin) {
        FREE_SPIN_STATE.pausedByBonus = true;
    }

    STATE.bonusGamePendingStart = false;
    STATE.isBonusGameActive = true;
    hideBonusTriggerOverlay({ resolvePending: false });

    const baseCashoutScore = Math.max(0, Math.floor(Number(STATE.roundReward) || 0));
    const baseSummaryMessage = formatFinalSummaryMessage();

    try {
        await startBonusGame(baseCashoutScore, baseSummaryMessage, {
            onFinish: handleBonusGameFinished
        });
        updateSlotBackButtonVisibility();
        return true;
    } catch (error) {
        console.error('Failed to start Bonus Game:', error);
        STATE.isBonusGameActive = false;
        resetBonusTriggerLatch();
        FREE_SPIN_STATE.pausedByBonus = false;
        if (FREE_SPIN_STATE.active && !FREE_SPIN_STATE.isEntering && !FREE_SPIN_STATE.isSettling && !FREE_SPIN_STATE.isTransitioning) {
            setFreeSpinButtonsEnabled(true);
        } else {
            if (cashoutBtn) cashoutBtn.disabled = false;
            if (randomBtn) randomBtn.disabled = false;
        }
        updateSlotBackButtonVisibility();
        return false;
    }
}

function getFreeSpinTriggerStats() {
    let bonusCount = 0;
    let wildCount = 0;

    STATE.cellBlocks.forEach((blockData) => {
        if (!blockData) return;
        if (blockData.type === 'bonus') {
            bonusCount += 1;
            return;
        }
        if (blockData.type === 'wild' || blockData.type === 'stickyWild') {
            wildCount += 1;
        }
    });

    const effectiveCount = bonusCount + wildCount;
    const isTriggered = bonusCount >= 1 && effectiveCount >= 3;
    return {
        bonusCount,
        wildCount,
        effectiveCount,
        availableTriggerCount: isTriggered ? 1 : 0,
        isTriggered
    };
}

function getFreeSpinTriggerBonusIndexes() {
    const indexes = [];
    STATE.cellBlocks.forEach((blockData, index) => {
        if (!blockData) return;
        if (blockData.type === 'bonus') {
            indexes.push(index);
        }
    });
    return indexes;
}

function getFreeSpinTriggerEffectiveIndexes() {
    const bonusIndexes = [];
    const wildIndexes = [];

    STATE.cellBlocks.forEach((blockData, index) => {
        if (!blockData) return;
        if (blockData.type === 'bonus') {
            bonusIndexes.push(index);
            return;
        }
        if (blockData.type === 'wild' || blockData.type === 'stickyWild') {
            wildIndexes.push(index);
        }
    });

    return bonusIndexes.concat(wildIndexes);
}

function shouldTriggerFreeSpinGameNow(stats = getFreeSpinTriggerStats()) {
    if (SIMPLE_SLOT_MODE || !(CONFIG.featureFlags && CONFIG.featureFlags.freeSpinEnabled)) return false;
    if (FREE_SPIN_STATE.active || FREE_SPIN_STATE.pendingStart || STATE.isGameOver || STATE.isBonusGameActive || STATE.bonusGamePendingStart) return false;
    return stats.isTriggered && STATE.freeSpinTriggersUsed <= 0;
}

async function playFreeSpinTriggerBonusFeedback(stats) {
    if (!stats || !stats.isTriggered) return;
    const triggerIndexes = getFreeSpinTriggerEffectiveIndexes();
    if (triggerIndexes.length < 3) return;

    const highlightedIndexes = highlightRealtimeSettlementEvent({
        indexes: triggerIndexes,
        jackpot: false
    }, STATE.gridCells);

    if (highlightedIndexes.length <= 0) return;
    await waitMs(FREE_SPIN_TRIGGER_BONUS_FEEDBACK_MS);
    clearRealtimeSettlementHighlight(highlightedIndexes, STATE.gridCells);
}

async function maybeTriggerFreeSpinGame() {
    const stats = getFreeSpinTriggerStats();
    if (!shouldTriggerFreeSpinGameNow(stats)) return false;
    STATE.freeSpinTriggersUsed += 1;
    resetBonusDryStreak();
    FREE_SPIN_STATE.pendingStart = true;
    stopAutoOpen();
    if (cashoutBtn) cashoutBtn.disabled = true;
    if (randomBtn) randomBtn.disabled = true;
    await playFreeSpinTriggerBonusFeedback(stats);
    if (STATE.isGameOver || !FREE_SPIN_STATE.pendingStart || FREE_SPIN_STATE.active) return false;
    showFreeSpinTriggerOverlay();
    return true;
}

function getFreeSpinBoxImageSrc(size) {
    return GRID_BOX_UNOPEN_IMAGE_SRC;
}

function getFreeSpinSpecialBoxOffsetY(size) {
    const safeSize = Math.max(1, Math.floor(Number(size) || 1));
    const offsetMap = (CONFIG.freeSpin && CONFIG.freeSpin.specialBoxOffsetYBySize) || {};
    const offset = Number(offsetMap[safeSize]);
    return Number.isFinite(offset) ? offset : 0;
}

function getFreeSpinBoxScale(size) {
    const safeSize = Math.max(1, Math.floor(Number(size) || 1));
    const scaleMap = (CONFIG.freeSpin && CONFIG.freeSpin.specialBoxScaleBySize) || {};
    const scale = Number(scaleMap[safeSize]);
    return (Number.isFinite(scale) && scale > 0) ? scale : 1;
}

function pickWeightedNumericKey(weights, fallbackValue) {
    const entries = Object.entries(weights || {})
        .map(([key, value]) => ({ key: Number(key), weight: Number(value) }))
        .filter((entry) => Number.isFinite(entry.key) && Number.isFinite(entry.weight) && entry.weight > 0);

    if (entries.length === 0) {
        return fallbackValue;
    }

    const totalWeight = entries.reduce((sum, entry) => sum + entry.weight, 0);
    let random = Math.random() * totalWeight;
    for (let i = 0; i < entries.length; i++) {
        random -= entries[i].weight;
        if (random <= 0) {
            return entries[i].key;
        }
    }

    return entries[entries.length - 1].key;
}

function pickFreeSpinSpecialAnchor(side, size) {
    const maxStart = side - size;
    const boardCenter = (side - 1) / 2;
    const candidates = [];

    for (let row = 0; row <= maxStart; row++) {
        for (let col = 0; col <= maxStart; col++) {
            const boxCenterRow = row + ((size - 1) / 2);
            const boxCenterCol = col + ((size - 1) / 2);
            const distance = Math.abs(boxCenterRow - boardCenter) + Math.abs(boxCenterCol - boardCenter);
            const weight = Math.max(1, 8 - (distance * 2));
            candidates.push({ row, col, weight });
        }
    }

    const totalWeight = candidates.reduce((sum, candidate) => sum + candidate.weight, 0);
    let random = Math.random() * totalWeight;
    for (let index = 0; index < candidates.length; index++) {
        random -= candidates[index].weight;
        if (random <= 0) {
            return { row: candidates[index].row, col: candidates[index].col };
        }
    }

    return { row: 0, col: 0 };
}

function createFreeSpinBlockData() {
    const normalWeight = Math.max(0, Number(CONFIG.blockPool.normalWeight) || 0);
    const wildWeight = Math.max(0, Number(CONFIG.blockPool.wildWeight) || 0);
    const totalWeight = normalWeight + wildWeight;

    if (totalWeight > 0 && Math.random() * totalWeight >= normalWeight) {
        return createSpecialBlockData('wild');
    }

    return createNormalBlockData(pickRandomItem(NORMAL_SYMBOL_ORDER) || 'S1');
}

function buildFreeSpinBoardItems() {
    const side = getGridSideLength(CONFIG.gridSize);
    const items = [];
    const specialSize = Math.max(2, Math.min(side, pickWeightedNumericKey(CONFIG.freeSpin.specialBoxSizeWeights, 2)));
    const anchor = pickFreeSpinSpecialAnchor(side, specialSize);
    const startRow = anchor.row;
    const startCol = anchor.col;
    const occupied = new Set();

    const pushItem = (row, col, size) => {
        const indexes = [];
        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                const index = ((row + r) * side) + (col + c);
                occupied.add(index);
                indexes.push(index);
            }
        }
        items.push({
            id: `fs-${items.length}`,
            row,
            col,
            size,
            indexes,
            revealed: false,
            blockData: null,
            element: null
        });
    };

    pushItem(startRow, startCol, specialSize);

    for (let index = 0; index < CONFIG.gridSize; index++) {
        if (occupied.has(index)) continue;
        const row = Math.floor(index / side);
        const col = index % side;
        pushItem(row, col, 1);
    }

    items.sort((a, b) => {
        const aIndex = Math.min(...a.indexes);
        const bIndex = Math.min(...b.indexes);
        return aIndex - bIndex;
    });

    items.forEach((item, index) => {
        item.id = `fs-${index}`;
    });

    return items;
}

function renderFreeSpinRewardGrid(item, blockData) {
    const rewardGrid = document.createElement('div');
    rewardGrid.className = `free-spin-reward-grid size-${item.size}`;
    rewardGrid.style.gridTemplateColumns = `repeat(${item.size}, minmax(0, 1fr))`;
    rewardGrid.style.gridTemplateRows = `repeat(${item.size}, minmax(0, 1fr))`;

    for (let index = 0; index < item.indexes.length; index++) {
        const rewardSlot = document.createElement('div');
        rewardSlot.className = 'free-spin-reward-slot';

        const rewardImg = document.createElement('img');
        rewardImg.className = 'free-spin-reward-item';
        if (blockData.type === 'wild') {
            rewardImg.classList.add('is-wild');
        }
        rewardImg.src = blockData.imageSrc;
        rewardImg.alt = blockData.type;
        rewardImg.draggable = false;
        rewardSlot.appendChild(rewardImg);
        rewardGrid.appendChild(rewardSlot);
    }

    return rewardGrid;
}

function positionFreeSpinRewardGrid(rewardGrid) {
    if (!rewardGrid) return;

    const slots = rewardGrid.querySelectorAll('.free-spin-reward-slot');
    slots.forEach((slot) => {
        const rewardImg = slot.querySelector('.free-spin-reward-item');
        if (!rewardImg) return;
        positionImageToGridBoxCenter(slot, rewardImg);
    });

    if (GRID_BOX_UNOPEN_IMAGE.naturalWidth <= 0 || GRID_BOX_UNOPEN_IMAGE.naturalHeight <= 0) {
        GRID_BOX_UNOPEN_IMAGE.addEventListener('load', () => {
            if (!rewardGrid.isConnected) return;
            const liveSlots = rewardGrid.querySelectorAll('.free-spin-reward-slot');
            liveSlots.forEach((slot) => {
                const rewardImg = slot.querySelector('.free-spin-reward-item');
                if (!rewardImg || !slot.isConnected) return;
                positionImageToGridBoxCenter(slot, rewardImg);
            });
        }, { once: true });
    }
}

function renderFreeSpinBoard() {
    if (!gridBoard) return;

    FREE_SPIN_STATE.items = buildFreeSpinBoardItems();
    FREE_SPIN_STATE.itemMap = new Map();
    FREE_SPIN_STATE.cellBlocks = new Array(CONFIG.gridSize).fill(null);
    FREE_SPIN_STATE.cellElementsByIndex = new Array(CONFIG.gridSize).fill(null);
    FREE_SPIN_STATE.symbolSettledSizeByKey = Object.create(null);

    const fragment = document.createDocumentFragment();
    const boardStyle = getComputedStyle(gridBoard);
    const columnGap = boardStyle.columnGap || boardStyle.gap || '0px';
    const rowGap = boardStyle.rowGap || boardStyle.gap || '0px';
    const boardRect = gridBoard.getBoundingClientRect();
    const side = getGridSideLength(CONFIG.gridSize);
    const columnGapPx = parseFloat(columnGap) || 0;
    const rowGapPx = parseFloat(rowGap) || 0;
    const cellWidth = (boardRect.width - (columnGapPx * (side - 1))) / side;
    const cellHeight = (boardRect.height - (rowGapPx * (side - 1))) / side;
    const bgSizeScale = parseScalePercent(boardStyle.getPropertyValue('--grid-cell-bg-size'), 1.5);
    const naturalWidth = GRID_BOX_UNOPEN_IMAGE.naturalWidth;
    const naturalHeight = GRID_BOX_UNOPEN_IMAGE.naturalHeight;
    const spriteAspect = (naturalWidth > 0 && naturalHeight > 0)
        ? (naturalWidth / naturalHeight)
        : GRID_BOX_FALLBACK_ASPECT;
    const safeSpriteAspect = (Number.isFinite(spriteAspect) && spriteAspect > 0)
        ? spriteAspect
        : GRID_BOX_FALLBACK_ASPECT;
    gridBoard.innerHTML = '';
    gridBoard.classList.add('is-free-spin');

    FREE_SPIN_STATE.items.forEach((item) => {
        const cell = document.createElement('div');
        cell.className = `free-spin-cell size-${item.size}`;
        cell.dataset.itemId = item.id;
        cell.dataset.boxSize = String(item.size);
        cell.style.gridColumn = `${item.col + 1} / span ${item.size}`;
        cell.style.gridRow = `${item.row + 1} / span ${item.size}`;
        cell.style.setProperty('--free-spin-gap-x', columnGap);
        cell.style.setProperty('--free-spin-gap-y', rowGap);
        if (item.size > 1) {
            const sizeScale = getFreeSpinBoxScale(item.size);
            const boxWidth = cellWidth * bgSizeScale * item.size * sizeScale;
            const boxHeight = cellHeight * 2 * item.size * sizeScale;
            const boxAspect = boxWidth / boxHeight;
            const renderHeight = (boxAspect > safeSpriteAspect)
                ? boxHeight
                : (boxWidth / safeSpriteAspect);
            const renderWidth = renderHeight * safeSpriteAspect;
            const offsetY = (boxHeight - renderHeight) / 2;
            const extraOffsetY = getFreeSpinSpecialBoxOffsetY(item.size);
            cell.style.setProperty('--free-spin-box-width', `${boxWidth}px`);
            cell.style.setProperty('--free-spin-box-height', `${boxHeight}px`);
            cell.style.setProperty('--free-spin-box-render-width', `${renderWidth}px`);
            cell.style.setProperty('--free-spin-box-render-height', `${renderHeight}px`);
            cell.style.setProperty('--free-spin-box-offset-y', `${offsetY}px`);
            cell.style.setProperty('--free-spin-box-shift-y', `${extraOffsetY}px`);
        } else {
            const sizeScale1 = getFreeSpinBoxScale(1);
            if (sizeScale1 !== 1) {
                const scaledBgSize = bgSizeScale * 100 * sizeScale1;
                cell.style.setProperty('--free-spin-box-width', `${scaledBgSize}%`);
                cell.style.setProperty('--free-spin-box-height', `${200 * sizeScale1}%`);
            } else {
                cell.style.removeProperty('--free-spin-box-width');
                cell.style.removeProperty('--free-spin-box-height');
            }
            cell.style.removeProperty('--free-spin-box-render-width');
            cell.style.removeProperty('--free-spin-box-render-height');
            cell.style.removeProperty('--free-spin-box-offset-y');
            cell.style.removeProperty('--free-spin-box-shift-y');
        }
        item.element = cell;
        FREE_SPIN_STATE.itemMap.set(item.id, item);
        item.indexes.forEach((index) => {
            FREE_SPIN_STATE.cellElementsByIndex[index] = cell;
        });
        fragment.appendChild(cell);
    });

    gridBoard.appendChild(fragment);
    animateFreeSpinBoardEntrance();
}


function applyCarriedStickyWildCells(size) {
    const safeSize = Math.max(1, Number(size) || 16);
    const currentCells = STATE.gridCells;
    if (!Array.isArray(currentCells) || currentCells.length !== safeSize) return;

    for (let i = 0; i < safeSize; i++) {
        if (!isStickyWildForcedAt(i)) continue;

        const cell = currentCells[i];
        if (!cell) continue;

        const blockData = STATE.boardPlan[i] || createSpecialBlockData('stickyWild');
        STATE.cellBlocks[i] = blockData;
        markCellAsRevealed(i);

        cell.classList.add('revealed');
        cell.classList.add('safe');

        const rewardImg = ensureSafeOpenBoxImage(cell, blockData.imageSrc, 'sticky wild');
        if (rewardImg) {
            rewardImg.classList.remove('bonus-reward-glow');
            rewardImg.classList.add('sticky-wild-reward-glow');
        }
        ensureStickyWildRoundBadge(cell, getStickyWildRemainingRounds(i));

        if (!STATE.hasTriggeredBonusGame) {
            STATE.bonusTriggerWildCount += 1;
        }
    }
}


let mainBoardEntranceRunId = 0;
let freeSpinBoardEntranceRunId = 0;
let nextRoundTimerId = null;

function getBoardEntranceTotalMs(itemCount) {
    return BOARD_ENTRANCE_DURATION_MS;
}

function playSequentialBoardEntrance(entries) {
    const normalizedEntries = Array.isArray(entries)
        ? entries.filter((entry) => entry && entry.element)
        : [];

    normalizedEntries.forEach(({ element }) => {
        element.classList.remove('board-entering');
        element.style.removeProperty('--board-enter-delay');
    });

    if (normalizedEntries.length <= 0) {
        return 0;
    }

    if (gridBoard) {
        void gridBoard.offsetWidth;
    }

    let maxDelayMs = 0;
    normalizedEntries.forEach((entry) => {
        // animateMainBoardEntrance 中 primary 是 col，secondary 是 row
        // 我们需要一行接着一行，因此让 row (secondary) 决定主要延迟
        const col = Math.floor(Number(entry.primary) || 0);
        const row = Math.floor(Number(entry.secondary) || 0);
        
        // 按照行延迟 + 列延迟
        const delay = row * BOARD_ROW_ENTRANCE_STAGGER_MS + col * BOARD_COL_ENTRANCE_STAGGER_MS;
        maxDelayMs = Math.max(maxDelayMs, delay);
        
        entry.element.style.setProperty('--board-enter-delay', `${delay}ms`);
        entry.element.classList.add('board-entering');
    });

    return maxDelayMs + BOARD_ENTRANCE_DURATION_MS;
}

function animateMainBoardEntrance() {
    const cells = Array.isArray(STATE.gridCells) ? STATE.gridCells.filter(Boolean) : [];
    const side = getGridSideLength(cells.length || CONFIG.gridSize);
    const runId = ++mainBoardEntranceRunId;
    const totalMs = playSequentialBoardEntrance(cells.map((cell, index) => ({
        element: cell,
        primary: index % side,
        secondary: Math.floor(index / side)
    })));

    STATE.isBoardEntering = totalMs > 0;
    if (cashoutBtn) cashoutBtn.disabled = true;
    if (randomBtn) randomBtn.disabled = true;

    if (totalMs <= 0) {
        STATE.isBoardEntering = false;
        if (!STATE.isGameOver && !STATE.isAnimating && !STATE.isSettling && !STATE.isBonusGameActive && !STATE.bonusGamePendingStart && !FREE_SPIN_STATE.pendingStart && !FREE_SPIN_STATE.active) {
            if (cashoutBtn) cashoutBtn.disabled = false;
            if (randomBtn) randomBtn.disabled = false;
        }
        return;
    }

    window.setTimeout(() => {
        if (runId !== mainBoardEntranceRunId) return;
        STATE.isBoardEntering = false;
        cells.forEach((cell) => {
            cell.classList.remove('board-entering');
        });
        if (!STATE.isGameOver && !STATE.isAnimating && !STATE.isSettling && !STATE.isBonusGameActive && !STATE.bonusGamePendingStart && !FREE_SPIN_STATE.pendingStart && !FREE_SPIN_STATE.active) {
            if (cashoutBtn) cashoutBtn.disabled = false;
            if (randomBtn) randomBtn.disabled = false;
        }
    }, totalMs);
}

function animateFreeSpinBoardEntrance() {
    const items = Array.isArray(FREE_SPIN_STATE.items) ? FREE_SPIN_STATE.items.filter((item) => item && item.element) : [];
    const runId = ++freeSpinBoardEntranceRunId;
    const totalMs = playSequentialBoardEntrance(items.map((item) => ({
        element: item.element,
        primary: item.col,
        secondary: item.row
    })));

    FREE_SPIN_STATE.isEntering = totalMs > 0;
    setFreeSpinButtonsEnabled(false);

    if (totalMs <= 0) {
        FREE_SPIN_STATE.isEntering = false;
        if (FREE_SPIN_STATE.active && !FREE_SPIN_STATE.isSettling && !FREE_SPIN_STATE.isTransitioning && !isFreeSpinBlockedByBonusState()) {
            setFreeSpinButtonsEnabled(true);
        }
        return;
    }

    window.setTimeout(() => {
        if (runId !== freeSpinBoardEntranceRunId) return;
        FREE_SPIN_STATE.isEntering = false;
        items.forEach((item) => {
            item.element.classList.remove('board-entering');
        });
        if (FREE_SPIN_STATE.active && !FREE_SPIN_STATE.isSettling && !FREE_SPIN_STATE.isTransitioning && !isFreeSpinBlockedByBonusState()) {
            setFreeSpinButtonsEnabled(true);
        }
    }, totalMs);
}

function scheduleNextRoundTransition(delayMs = 220) {
    if (nextRoundTimerId !== null) {
        clearTimeout(nextRoundTimerId);
        nextRoundTimerId = null;
    }

    STATE.isGameOver = true;
    STATE.isBoardEntering = false;
    if (cashoutBtn) cashoutBtn.disabled = true;
    if (randomBtn) randomBtn.disabled = true;
    modalOverlay.classList.add('hidden');
    applyRoundRewardsToZooEconomy();

    nextRoundTimerId = window.setTimeout(() => {
        nextRoundTimerId = null;

        // Check if player has tickets before preparing next round
        const zooEconomy = typeof getZooEconomy === 'function' ? getZooEconomy() : null;
        const hasTicket = !zooEconomy || typeof zooEconomy.canStartFreshRound !== 'function'
            || zooEconomy.canStartFreshRound();

        if (!hasTicket) {
            clearCompletedRoundRuntime();
            const zooHome = window.ZooHomeModule;
            if (zooHome && typeof zooHome.notify === 'function') {
                zooHome.notify('盲盒券不足，已回到栖息地等待下一张券。', 'warn');
            }
            const appShell = window.WynneZooAppShell;
            if (appShell && typeof appShell.showZooHome === 'function') {
                appShell.showZooHome();
            }
            return;
        }

        const restarted = initGame();
        if (restarted !== false) {
            return;
        }

        clearCompletedRoundRuntime();
        const zooHome = window.ZooHomeModule;
        if (zooHome && typeof zooHome.notify === 'function') {
            zooHome.notify('盲盒券不足，已回到栖息地等待下一张券。', 'warn');
        }
        const appShell = window.WynneZooAppShell;
        if (appShell && typeof appShell.showZooHome === 'function') {
            appShell.showZooHome();
        }
    }, Math.max(0, Math.floor(Number(delayMs) || 0)));
}

function handleAllBoxesOpened() {
    if (SIMPLE_SLOT_MODE) {
        if (STATE.pendingOpens > 0 || STATE.isSettling) return false;
        if (STATE.remainingBlindBoxes > 0) return false;
        if (STATE.unrevealedIndices.length > 0) return false;
        if (STATE.restockPoolCount > 0) return false;
        if (STATE.selectedIndexes.length > 0 || STATE.selectionMode !== 'none') return false;
        if (hasAnySimpleModeResolvableAction()) return false;
        scheduleNextRoundTransition();
        return true;
    }
    if (STATE.pendingOpens > 0 || STATE.unrevealedIndices.length > 0) return false;
    if (FREE_SPIN_STATE.active || FREE_SPIN_STATE.pendingStart || STATE.isBonusGameActive || STATE.bonusGamePendingStart) return false;
    scheduleNextRoundTransition();
    return true;
}

function ensureBombAnimImage(cell) {
    if (!cell) return null;
    let img = cell.querySelector('.bomb-anim-frame');
    if (!img) {
        img = document.createElement('img');
        img.className = 'bomb-anim-frame';
        img.alt = 'bomb animation';
        img.draggable = false;
        img.loading = 'eager';
        img.decoding = 'sync';
        cell.appendChild(img);
    }
    positionBombAnimImage(cell, img);
    if (GRID_BOX_UNOPEN_IMAGE.naturalWidth <= 0 || GRID_BOX_UNOPEN_IMAGE.naturalHeight <= 0) {
        GRID_BOX_UNOPEN_IMAGE.addEventListener('load', () => {
            if (!cell.isConnected) return;
            positionBombAnimImage(cell, img);
        }, { once: true });
    }
    return img;
}

function ensureSafeOpenBoxImage(cell, imageSrc = GRID_BOX_OPEN_IMAGE_SRC, altText = 'opened box') {
    if (!cell) return null;
    let img = cell.querySelector('.safe-open-box-frame');
    if (!img) {
        img = document.createElement('img');
        img.className = 'safe-open-box-frame';
        img.alt = altText;
        img.draggable = false;
        img.loading = 'eager';
        img.decoding = 'sync';
        cell.appendChild(img);
    }
    if (img.src !== imageSrc) {
        img.src = imageSrc;
    }
    img.alt = altText;
    positionImageToGridBoxCenter(cell, img);
    if (GRID_BOX_UNOPEN_IMAGE.naturalWidth <= 0 || GRID_BOX_UNOPEN_IMAGE.naturalHeight <= 0) {
        GRID_BOX_UNOPEN_IMAGE.addEventListener('load', () => {
            if (!cell.isConnected) return;
            positionImageToGridBoxCenter(cell, img);
        }, { once: true });
    }
    return img;
}

function getStickyWildRemainingRounds(index) {
    const safeIndex = Math.floor(Number(index));
    if (!Number.isFinite(safeIndex) || safeIndex < 0) return 0;
    if (safeIndex >= STICKY_WILD_STATE.carryRoundsByIndex.length) return 0;
    return Math.max(0, Math.floor(Number(STICKY_WILD_STATE.carryRoundsByIndex[safeIndex]) || 0)) + 1;
}

function ensureStickyWildRoundBadge(cell, rounds) {
    if (!cell) return null;
    const safeRounds = Math.max(0, Math.floor(Number(rounds) || 0));
    let badge = cell.querySelector('.sticky-wild-round-badge');
    if (!badge) {
        badge = document.createElement('span');
        badge.className = 'sticky-wild-round-badge';
        cell.appendChild(badge);
    }
    badge.textContent = String(safeRounds);
    positionStickyWildRoundBadge(cell, badge);
    if (GRID_BOX_UNOPEN_IMAGE.naturalWidth <= 0 || GRID_BOX_UNOPEN_IMAGE.naturalHeight <= 0) {
        GRID_BOX_UNOPEN_IMAGE.addEventListener('load', () => {
            if (!cell.isConnected || !badge.isConnected) return;
            positionStickyWildRoundBadge(cell, badge);
        }, { once: true });
    }
    return badge;
}

function clearStickyWildRoundBadge(cell) {
    if (!cell) return;
    const badge = cell.querySelector('.sticky-wild-round-badge');
    if (badge) {
        badge.remove();
    }
}

function positionStickyWildRoundBadge(cell, badge) {
    if (!cell || !badge) return;
    const rect = cell.getBoundingClientRect();
    const cellWidth = rect.width || 0;
    const cellHeight = rect.height || 0;
    if (cellWidth <= 0 || cellHeight <= 0) return;

    const style = getComputedStyle(cell);
    const bgSizeScale = parseScalePercent(style.getPropertyValue('--grid-cell-bg-size'), 1.5);
    const rewardScale = parseScalePercent(style.getPropertyValue('--grid-cell-reward-scale'), 1);
    const rewardWidth = cellWidth * bgSizeScale * rewardScale;
    const center = getGridCellBoxCenter(cell);

    const x = center.x - (rewardWidth / 2) + (rewardWidth * (81 / 256));
    const y = center.y - (rewardWidth / 2) + (rewardWidth * (169 / 256)) + 9;
    const fontSize = rewardWidth * (40 / 256);

    badge.style.left = `${x}px`;
    badge.style.top = `${y}px`;
    badge.style.fontSize = `${fontSize}px`;
}

function clearBombAnimImage(cell) {
    if (!cell) return;
    const img = cell.querySelector('.bomb-anim-frame');
    if (img) {
        img.remove();
    }
}

async function playBombMonkeyAnimation(cell) {
    preloadBombMonkeyFrames();
    const img = ensureBombAnimImage(cell);
    if (!img || !Array.isArray(BOMB_MONKEY_ANIM_FRAMES) || BOMB_MONKEY_ANIM_FRAMES.length === 0) {
        return;
    }

    cell.classList.add('bomb-animating');

    for (let i = 0; i < BOMB_MONKEY_ANIM_FRAMES.length; i++) {
        if (!cell.isConnected) return;
        img.src = BOMB_MONKEY_ANIM_FRAMES[i];
        if (i < BOMB_MONKEY_ANIM_FRAMES.length - 1) {
            await waitMs(BOMB_MONKEY_FRAME_MS);
        }
    }

    await waitMs(BOMB_MONKEY_LAST_FRAME_HOLD_MS);
}


// Initialize Game
function initGame() {
    SLOT_GAME_RUNTIME.initialized = true;
    SLOT_GAME_RUNTIME.ticketConsumedThisRound = false;
    resetBonusGameUI();
    scheduleDeferredPreload();
    bindGridBoardClickHandler();
    bindSimpleModeRestockTrayHandler();
    applyModeTexts();
    ensureCurrentCustomer();
    if (SIMPLE_SLOT_MODE && customerSatisfaction) {
        customerSatisfaction.classList.add('blindbox-meter');
    }

    // Reset State
    resetGridState(CONFIG.gridSize);
    if (!SIMPLE_SLOT_MODE) {
        prepareStickyWildForNextRound(CONFIG.gridSize);
        const generatedBoard = generateBoardPlan(CONFIG.gridSize);
        STATE.boardPlan = generatedBoard.plan;
        STATE.boardMeta = generatedBoard.meta;
    }
    STATE.currentMultiplier = CONFIG.baseMultiplier;
    STATE.rewardRetentionRatio = 1.0;
    STATE.isGameOver = false;
    STATE.isAnimating = false;
    STATE.mustOpenAllBeforeSettlement = false;
    STATE.remainingBombs = 0;

    // Reset UI
    updateStackBlockZIndex();
    updateSway();
    updateStackProgressBar();
    renderCurrentCustomer();
    removeBombWheel();
    clearGridSettlementClasses();
    hideFreeSpinTriggerOverlay();
    hideBonusTriggerOverlay({ resolvePending: true });
    setFreeSpinHudVisible(false);
    setFreeSpinVisualMode(false);
    if (gridBoard) {
        gridBoard.classList.remove('is-free-spin');
    }
    updateStats();
    updateBombDisplay();
    if (SIMPLE_SLOT_MODE) {
        showSimpleWishOverlay();
    }
    if (cashoutBtn) {
        cashoutBtn.disabled = SIMPLE_SLOT_MODE ? !hasSimpleWishSelection() : false;
    }
    if (randomBtn) {
        randomBtn.disabled = SIMPLE_SLOT_MODE && !hasSimpleWishSelection();
    }
    updatePrimaryActionButtonState();
    modalOverlay.classList.add('hidden');
    updateSlotBackButtonVisibility();

    // Create Grid UI
    prepareGridBoardForNewRound(CONFIG.gridSize);
    if (SIMPLE_SLOT_MODE) {
        refreshSimpleModeUi();
    }
    return true;
}

function handleCellClick(index, isAuto = false) {
    if (SIMPLE_SLOT_MODE && !hasSimpleWishSelection()) {
        showSimpleWishOverlay();
        return;
    }
    if (SIMPLE_SLOT_MODE) {
        if (STATE.boardCellStates[index] === 'revealed') {
            if (STATE.isGameOver || STATE.isBoardEntering || STATE.isAnimating || STATE.isBonusGameActive || STATE.bonusGamePendingStart || STATE.pendingOpens > 0 || STATE.isSettling) {
                return;
            }
            handleSimpleModeSelectionClick(index);
            return;
        }
        if (STATE.selectionMode !== 'none' || STATE.selectedIndexes.length > 0) {
            refreshSimpleModeSelectionUi();
            return;
        }
        if (STATE.boardCellStates[index] !== 'sealed') {
            return;
        }
    }
    if (STATE.isGameOver || STATE.isBoardEntering || STATE.revealed[index] || STATE.isAnimating || STATE.isBonusGameActive || STATE.bonusGamePendingStart || (STATE.isSettling && !isAuto)) return;

    // Consume ticket on first cell click of the round
    if (!SLOT_GAME_RUNTIME.ticketConsumedThisRound) {
        if (!requestFreshRoundTicket()) {
            return;
        }
        SLOT_GAME_RUNTIME.ticketConsumedThisRound = true;
    }

    const cell = getGridCellElement(index);
    if (!cell) return;
    const openCenter = getGridCellBoxCenterInViewport(cell);
    markCellAsRevealed(index);
    if (SIMPLE_SLOT_MODE) {
        STATE.remainingBlindBoxes = Math.max(0, STATE.remainingBlindBoxes - 1);
        STATE.openedBlindBoxesThisRound += 1;
        STATE.boardCellStates[index] = 'revealed';
        STATE.boardResolvedFlags[index] = 0;
        refreshSimpleModeUi();
    }
    STATE.pendingOpens++;
    if (cashoutBtn) cashoutBtn.disabled = true;
    if (randomBtn) randomBtn.disabled = true;

    // Play open animation
    cell.classList.add('opening');

    setTimeout(async () => {
        if (STATE.isGameOver) {
            cell.classList.remove('opening');
            STATE.pendingOpens = Math.max(0, STATE.pendingOpens - 1);
            return;
        }

        cell.classList.remove('opening');
        playSafeOpenFeedback(cell, openCenter, { markSafe: true });

        try {
            await applySafeReward(cell, index);
        } catch (error) {
            console.error('Safe reward flow failed:', error);
        } finally {
            STATE.pendingOpens = Math.max(0, STATE.pendingOpens - 1);
            if (STATE.pendingOpens === 0 && !STATE.isAnimating && !STATE.isGameOver && !STATE.isSettling && !STATE.isBonusGameActive && !STATE.bonusGamePendingStart && !FREE_SPIN_STATE.pendingStart && !FREE_SPIN_STATE.active) {
                if (STATE.unrevealedIndices.length === 0) {
                    if (handleAllBoxesOpened()) {
                        return;
                    }
                    if (SIMPLE_SLOT_MODE) {
                        refreshSimpleModeUi();
                        return;
                    }
                }
                if (cashoutBtn) cashoutBtn.disabled = false;
                if (randomBtn) randomBtn.disabled = false;
            }
        }
    }, 400); // Wait for the opening animation to finish
}

function relocateProtectedBomb(index) {
    const candidateSafeCells = [];
    for (let i = 0; i < STATE.unrevealedIndices.length; i++) {
        const candidate = STATE.unrevealedIndices[i];
        if (candidate === index) continue;
        if (!isBombCell(candidate)) {
            candidateSafeCells.push(candidate);
        }
    }

    STATE.grid[index] = CELL_SAFE;
    if (candidateSafeCells.length === 0) return;

    const target = candidateSafeCells[Math.floor(Math.random() * candidateSafeCells.length)];
    STATE.grid[target] = CELL_BOMB;
}

function pickWeightedBlockType() {
    const normalWeight = CONFIG.blockPool.normalWeight;
    const wildWeight = CONFIG.blockPool.wildWeight;
    const bonusWeight = CONFIG.blockPool.bonusWeight;
    const monkeyWeight = CONFIG.blockPool.monkeyWeight;
    const stickyWildWeight = CONFIG.blockPool.stickyWildWeight;
    const totalWeight = normalWeight + wildWeight + bonusWeight + monkeyWeight + stickyWildWeight;

    if (totalWeight <= 0) {
        return 'normal';
    }

    let rand = Math.random() * totalWeight;
    rand -= normalWeight;
    if (rand < 0) return 'normal';
    rand -= wildWeight;
    if (rand < 0) return 'wild';
    rand -= bonusWeight;
    if (rand < 0) return 'bonus';
    rand -= monkeyWeight;
    if (rand < 0) return 'monkey';
    // 剩余权重视为黏性百搭
    return 'stickyWild';
}

function createRandomStackBlockData(options = {}) {
    const forcedType = options && options.forceType ? String(options.forceType) : '';
    const blockType = forcedType || pickWeightedBlockType();

    if (blockType === 'wild') {
        return createSpecialBlockData('wild');
    }

    if (blockType === 'bonus') {
        return createSpecialBlockData('bonus');
    }

    if (blockType === 'monkey') {
        // monkey symbol only triggers monkey animation + wheel and does not join normal settlements
        return {
            type: 'monkey',
            imageSrc: CONFIG.blockPool.monkeyImage,
            normalKey: null
        };
    }

    if (blockType === 'stickyWild') {
        return createSpecialBlockData('stickyWild');
    }

    return createNormalBlockData(pickRandomItem(NORMAL_SYMBOL_ORDER) || 'S1');
}

function createProgressRewardBlockData() {
    return createNormalBlockData(pickRandomItem(NORMAL_SYMBOL_ORDER) || 'S1');
}

function grantStackBlocks(count) {
    const safeCount = Math.max(0, Math.floor(Number(count) || 0));
    if (safeCount <= 0) return 0;
    const blockList = Array.from({ length: safeCount }, () => ({ type: 'satisfaction', imageSrc: '', normalKey: null }));
    addBlocksToStack(blockList);
    return safeCount;
}

function grantBonusSymbolBlock() {
    // 杞洏濂栧姳鈥滅粰 bonus 绗﹀彿鈥濓細鐩存帴杩藉姞 1 涓?bonus 绉湪
    addBlockToStack({
        type: 'bonus',
        imageSrc: CONFIG.blockPool.bonusImage,
        normalKey: null
    }, false);
}

function updateConsecutiveBlockGlow() {
    if (!stackContainer) return;
    STATE.stack.forEach((item) => {
        if (!item || !item.element) return;
        item.element.classList.remove('block-match-glow');
    });

    if (STATE.stack.length < 3) return;

    const normalKeys = new Set();
    STATE.stack.forEach((item) => {
        if (!item || item.type !== 'normal') return;
        normalKeys.add(item.normalKey || item.imageSrc);
    });
    if (normalKeys.size === 0) return;

    const highlightIndexes = new Set();

    normalKeys.forEach((targetKey) => {
        let runStart = -1;
        let runLength = 0;
        let runHasTargetNormal = false;

        const commitRun = () => {
            if (runLength < 3 || runStart < 0 || !runHasTargetNormal) return;
            for (let i = runStart; i < runStart + runLength; i++) {
                highlightIndexes.add(i);
            }
        };

        for (let i = 0; i < STATE.stack.length; i++) {
            const item = STATE.stack[i];
            if (!item) continue;

            const isMatch = (item.type === 'wild' || item.type === 'stickyWild')
                || (item.type === 'normal' && (item.normalKey || item.imageSrc) === targetKey);

            if (isMatch) {
                if (runLength === 0) runStart = i;
                runLength += 1;
                if (item.type === 'normal' && (item.normalKey || item.imageSrc) === targetKey) {
                    runHasTargetNormal = true;
                }
            } else {
                commitRun();
                runStart = -1;
                runLength = 0;
                runHasTargetNormal = false;
            }
        }

        commitRun();
    });

    highlightIndexes.forEach((index) => {
        const item = STATE.stack[index];
        if (!item || !item.element) return;
        item.element.classList.add('block-match-glow');
    });
}

function updateStackBlockZIndex() {
    if (!stackContainer) return;
    STATE.stack.forEach((item, index) => {
        if (!item || !item.element) return;
        item.element.style.zIndex = String(index + 1);
    });
}

function ensureTowerScrollHintElement() {
    if (STACK_VIEWPORT_STATE.hintElement?.isConnected) {
        return STACK_VIEWPORT_STATE.hintElement;
    }
    if (!towerSection) return null;

    const hint = document.createElement('div');
    hint.className = 'stack-scroll-hint';
    hint.textContent = '上滑查看更高积木';
    towerSection.appendChild(hint);
    STACK_VIEWPORT_STATE.hintElement = hint;
    return hint;
}

function showTowerScrollHint() {
    if (STACK_VIEWPORT_STATE.hasShownScrollHint) return;
    const hint = ensureTowerScrollHintElement();
    if (!hint) return;

    STACK_VIEWPORT_STATE.hasShownScrollHint = true;
    hint.classList.add('show');
    if (STACK_VIEWPORT_STATE.hintTimerId !== null) {
        clearTimeout(STACK_VIEWPORT_STATE.hintTimerId);
    }
    STACK_VIEWPORT_STATE.hintTimerId = setTimeout(() => {
        hint.classList.remove('show');
        STACK_VIEWPORT_STATE.hintTimerId = null;
    }, 2400);
}

function updateTowerViewportScrollState() {
    if (!towerViewport) {
        return { canScroll: false, maxScrollTop: 0 };
    }
    const maxScrollTop = Math.max(0, towerViewport.scrollHeight - towerViewport.clientHeight);
    const canScroll = maxScrollTop > 1;
    towerViewport.classList.toggle('is-scrollable', canScroll);
    if (canScroll) {
        showTowerScrollHint();
    }
    if (!canScroll) {
        towerViewport.scrollTop = 0;
        STACK_VIEWPORT_STATE.autoFollow = true;
    }
    return { canScroll, maxScrollTop };
}

function isNewestStackBlockVisible(tolerancePx = 16) {
    if (!towerViewport || !stackContainer) return true;
    const newestBlock = stackContainer.lastElementChild;
    if (!newestBlock) return true;

    const viewportRect = towerViewport.getBoundingClientRect();
    const blockRect = newestBlock.getBoundingClientRect();
    const bottomVisible = blockRect.bottom <= (viewportRect.bottom + tolerancePx);
    const hasOverlap = blockRect.top < viewportRect.bottom && blockRect.bottom > viewportRect.top;
    return bottomVisible && hasOverlap;
}

function maybeAutoScrollTowerViewport({ force = false, smooth = true, target = null } = {}) {
    if (!towerViewport) return;
    const { canScroll, maxScrollTop } = updateTowerViewportScrollState();
    if (!canScroll) return;
    if (!force && !STACK_VIEWPORT_STATE.autoFollow) return;

    const scrollTarget = target || stackContainer?.lastElementChild || stackContainer;
    if (scrollTarget && typeof scrollTarget.scrollIntoView === 'function') {
        scrollTarget.scrollIntoView({
            behavior: smooth ? 'smooth' : 'auto',
            block: 'end',
            inline: 'nearest'
        });
        return;
    }

    if (typeof towerViewport.scrollTo === 'function') {
        towerViewport.scrollTo({ top: maxScrollTop, behavior: smooth ? 'smooth' : 'auto' });
        return;
    }
    towerViewport.scrollTop = maxScrollTop;
}

function scheduleBonusTriggerCheckOnStackMutation() {
    if (bonusTriggerCheckQueued) return;
    bonusTriggerCheckQueued = true;

    Promise.resolve().then(async () => {
        bonusTriggerCheckQueued = false;
        if (STATE.isGameOver || STATE.isBoardEntering || STATE.isAnimating || STATE.isSettling) return;
        if (STATE.isBonusGameActive || STATE.bonusGamePendingStart) return;
        if (FREE_SPIN_STATE.pendingStart) return;
        if (!shouldTriggerBonusGameNow()) return;
        try {
            await maybeTriggerBonusGame();
        } catch (error) {
            console.error('Bonus trigger check after stack mutation failed:', error);
        }
    });
}

function finalizeStackMutation(scrollTarget = null) {
    const shouldFollowBottom = STACK_VIEWPORT_STATE.autoFollow;
    updateStackBlockZIndex();
    updateConsecutiveBlockGlow();
    updateStackProgressBar();

    if (scrollTarget && towerViewport) {
        setTimeout(() => {
            maybeAutoScrollTowerViewport({ force: shouldFollowBottom, smooth: true, target: scrollTarget });
        }, CONFIG.scrollIntoViewDelayMs);
    } else {
        maybeAutoScrollTowerViewport({ force: shouldFollowBottom, smooth: true });
    }

    updateSway();
    scheduleBonusTriggerCheckOnStackMutation();
}

function addBlockToStack(blockData, isHidden = false, options = {}) {
    let block = null;
    if (stackContainer) {
        block = document.createElement('div');
        block.classList.add('block');
        if (!isHidden) {
            block.classList.add('new-item');
        }
        if (blockData.type === 'wild' || blockData.type === 'stickyWild') {
            block.classList.add('block-wild-glow');
        }
        if (blockData.type === 'bonus') {
            block.classList.add('block-bonus-glow');
        }
        block.style.left = `${getRandomStackOffsetPx()}px`;
        block.dataset.blockType = blockData.type;
        if (blockData.normalKey) {
            block.dataset.normalKey = blockData.normalKey;
        }

        if (blockData.imageSrc) {
            const img = document.createElement('img');
            img.classList.add('block-img');
            img.src = blockData.imageSrc;
            img.alt = 'stack block';
            img.draggable = false;
            img.loading = 'eager';
            img.onerror = () => {
                img.remove();
                block.textContent = '?';
            };
            block.appendChild(img);
        }

        if (isHidden) {
            block.style.opacity = '0';
        }

        stackContainer.appendChild(block);
    }
    STATE.stack.push({
        ...blockData,
        element: block
    });
    STATE.stackHeight = STATE.stack.length;

    if (options.finalize !== false) {
        finalizeStackMutation(options.scroll === false ? null : block);
    }

    return block;
}

function addBlocksToStack(blockList, options = {}) {
    if (!Array.isArray(blockList) || blockList.length === 0) return [];

    const createdBlocks = [];
    for (let i = 0; i < blockList.length; i++) {
        const block = addBlockToStack(blockList[i], false, { finalize: false, scroll: false });
        createdBlocks.push(block);
    }

    if (options.finalize !== false) {
        finalizeStackMutation(options.scroll === false ? null : createdBlocks[createdBlocks.length - 1]);
    }

    return createdBlocks;
}

function consumeStackBlocks(count, options = {}) {
    const safeCount = Math.max(0, Math.floor(Number(count) || 0));
    if (safeCount <= 0 || !Array.isArray(STATE.stack) || STATE.stack.length <= 0) return 0;

    const removeCount = Math.min(safeCount, STATE.stack.length);
    for (let i = 0; i < removeCount; i++) {
        const item = STATE.stack.pop();
        const element = item && item.element;
        if (element && typeof element.remove === 'function') {
            element.remove();
        }
    }
    STATE.stackHeight = STATE.stack.length;

    if (options.finalize !== false) {
        finalizeStackMutation(null);
    }
    return removeCount;
}

function flyBlockToStack(startX, startY, blockData) {
    return new Promise((resolve) => {
        if (!gameContainer || !stackContainer) {
            addBlockToStack(blockData, false);
            resolve();
            return;
        }
        const flyEl = document.createElement('div');
        flyEl.className = 'block';
        flyEl.style.margin = '0';
        flyEl.style.position = 'absolute';
        if (blockData.type === 'bonus') {
            flyEl.classList.add('block-bonus-glow');
        }
        const img = document.createElement('img');
        img.className = 'block-img';
        img.src = blockData.imageSrc;
        flyEl.appendChild(img);

        gameContainer.appendChild(flyEl);

        const actualBlock = addBlockToStack(blockData, true);
        
        requestAnimationFrame(() => {
            const targetRect = actualBlock.getBoundingClientRect();
            const containerRect = gameContainer.getBoundingClientRect();

            const relStartX = startX - containerRect.left;
            const relStartY = startY - containerRect.top;
            
            const relEndX = targetRect.left - containerRect.left + targetRect.width / 2;
            const relEndY = targetRect.top - containerRect.top + targetRect.height / 2;

            flyEl.style.left = `${relStartX}px`;
            flyEl.style.top = `${relStartY}px`;
            flyEl.style.transform = `translate(-50%, -50%) scale(1.1)`;
            flyEl.style.zIndex = '200';
            flyEl.style.pointerEvents = 'none';

            void flyEl.offsetWidth;

            flyEl.style.transition = 'all 0.5s cubic-bezier(0.25, 0.8, 0.25, 1)';
            flyEl.style.left = `${relEndX}px`;
            flyEl.style.top = `${relEndY}px`;
            flyEl.style.transform = `translate(-50%, -50%) scale(0.9)`;

            setTimeout(() => {
                flyEl.remove();
                actualBlock.style.opacity = '1';
                actualBlock.classList.add('new-item');
                resolve();
            }, 500);
        });
    });
}

// flyVisualBlockToStack is identical to flyBlockToStack — use single implementation
const flyVisualBlockToStack = flyBlockToStack;

function updateSway() {
    if (!stackContainer) return;
    // Remove old classes
    stackContainer.classList.remove('sway-low', 'sway-medium', 'sway-high', 'sway-extreme');

    if (STATE.stackHeight >= CONFIG.swayThresholds.extreme) {
        stackContainer.classList.add('sway-extreme');
    } else if (STATE.stackHeight >= CONFIG.swayThresholds.high) {
        stackContainer.classList.add('sway-high');
    } else if (STATE.stackHeight >= CONFIG.swayThresholds.medium) {
        stackContainer.classList.add('sway-medium');
    } else if (STATE.stackHeight >= CONFIG.swayThresholds.low) {
        stackContainer.classList.add('sway-low');
    }
}

function getRandomStackOffsetPx() {
    const range = CONFIG.stackHorizontalOffsetRange || {};
    const min = Number(range.min);
    const max = Number(range.max);

    const safeMin = Number.isFinite(min) ? min : -18;
    const safeMax = Number.isFinite(max) ? max : 18;
    const low = Math.min(safeMin, safeMax);
    const high = Math.max(safeMin, safeMax);

    return Math.floor(Math.random() * (high - low + 1)) + low;
}

function resetStackProgressState() {
    STATE.stack = [];
    STATE.stackHeight = 0;
    STACK_VIEWPORT_STATE.autoFollow = true;
    if (stackContainer) {
        stackContainer.innerHTML = '';
        stackContainer.className = 'stack-container';
    }
    maybeAutoScrollTowerViewport({ force: true, smooth: false });
    updateSway();
    lastRenderedSatisfactionValue = 0;
    updateStackProgressBar();
}

function getMultiplierBySuccessCount(successCount) {
    const safeCount = Math.max(0, Math.floor(Number(successCount) || 0));
    if (safeCount <= 0) return CONFIG.baseMultiplier;
    const boundedCount = Math.min(MAX_SUCCESS_FOR_MULTIPLIER, safeCount);
    return SUCCESS_MULTIPLIER_TABLE[boundedCount] || SUCCESS_MULTIPLIER_TABLE[MAX_SUCCESS_FOR_MULTIPLIER];
}

function calculateCurrentReward() {
    return Math.floor(STATE.roundReward);
}

function triggerGlobalEffects(type) {
    // Remove old classes
    gameContainer.classList.remove('shake-hard', 'shake-medium', 'shake-soft', 'shake-soft-strong');
    flashOverlay.className = 'flash-overlay'; // reset
    void gameContainer.offsetWidth; // trigger reflow

    let flashFadeDuration = 300;
    if (type === 'total') {
        gameContainer.classList.add('shake-hard');
        flashOverlay.classList.add('flash-red');
        flashOverlay.style.opacity = '1';
    } else {
        gameContainer.classList.add('shake-soft');
        flashOverlay.classList.add('flash-white');
        flashOverlay.style.opacity = '0.5';
    }

    // Fade out flash
    setTimeout(() => {
        flashOverlay.style.opacity = '0';
    }, flashFadeDuration);
}

function hasPendingSimpleModeMatches() {
    return hasAnySimpleModeResolvableAction();
}

function updateSimpleBlindBoxCounterUi() {
    if (!SIMPLE_MATCH_CORE) return;
    SIMPLE_MATCH_CORE.updateSimpleBlindBoxCounterUi();
}

function ensureSimpleWishOverlay() {
    return SIMPLE_MATCH_CORE ? SIMPLE_MATCH_CORE.ensureSimpleWishOverlay() : null;
}

function hideSimpleWishOverlay() {
    if (!SIMPLE_MATCH_CORE) return;
    SIMPLE_MATCH_CORE.hideSimpleWishOverlay();
}

function showSimpleWishOverlay() {
    if (!SIMPLE_MATCH_CORE) return;
    SIMPLE_MATCH_CORE.showSimpleWishOverlay();
}

function hasSimpleWishSelection() {
    return !SIMPLE_SLOT_MODE || Boolean(SIMPLE_MATCH_CORE && SIMPLE_MATCH_CORE.hasSimpleWishSelection());
}

function createSimpleModeBlockData() {
    return SIMPLE_MATCH_CORE
        ? SIMPLE_MATCH_CORE.createSimpleModeBlockData()
        : createNormalBlockData('S1');
}

function applyGridCellLayoutVars(cell, index, size) {
    if (!SIMPLE_MATCH_CORE) return;
    SIMPLE_MATCH_CORE.applyGridCellLayoutVars(cell, index, size);
}

function setSimpleModeCellSealed(index) {
    if (!SIMPLE_MATCH_CORE) return;
    SIMPLE_MATCH_CORE.setSimpleModeCellSealed(index);
}

function setSimpleModeCellEmpty(index) {
    if (!SIMPLE_MATCH_CORE) return;
    SIMPLE_MATCH_CORE.setSimpleModeCellEmpty(index);
}

function renderSimpleModeRevealedCell(index, blockData) {
    if (!SIMPLE_MATCH_CORE) return;
    SIMPLE_MATCH_CORE.renderSimpleModeRevealedCell(index, blockData);
}

function clearSimpleModeSelectionState() {
    if (!SIMPLE_MATCH_CORE) return;
    SIMPLE_MATCH_CORE.clearSimpleModeSelectionState();
}

function getSimpleModeTargetSelectionCount(symbolKey) {
    return SIMPLE_MATCH_CORE ? SIMPLE_MATCH_CORE.getSimpleModeTargetSelectionCount(symbolKey) : 0;
}

function isSimpleModeFullSetAvailable() {
    return SIMPLE_MATCH_CORE ? SIMPLE_MATCH_CORE.isSimpleModeFullSetAvailable() : false;
}

function refreshSimpleModeSelectionUi() {
    if (!SIMPLE_MATCH_CORE) return;
    SIMPLE_MATCH_CORE.refreshSimpleModeSelectionUi();
}

function refreshSimpleModeUi() {
    if (!SIMPLE_MATCH_CORE) return;
    SIMPLE_MATCH_CORE.refreshSimpleModeUi();
}

function hasAnySimpleModeResolvableAction() {
    return SIMPLE_MATCH_CORE ? SIMPLE_MATCH_CORE.hasAnySimpleModeResolvableAction() : false;
}

function rewardSimpleModeBlindBoxes(count) {
    return SIMPLE_MATCH_CORE ? SIMPLE_MATCH_CORE.rewardSimpleModeBlindBoxes(count) : 0;
}

function renderSimpleModeWishSymbol() {
    if (!SIMPLE_MATCH_CORE) return;
    SIMPLE_MATCH_CORE.renderSimpleModeWishSymbol();
}

function getSimpleModeCellSymbolKey(index) {
    return SIMPLE_MATCH_CORE ? SIMPLE_MATCH_CORE.getSimpleModeCellSymbolKey(index) : '';
}

function placeSimpleModeBlindBoxAt(index) {
    return SIMPLE_MATCH_CORE ? SIMPLE_MATCH_CORE.placeSimpleModeBlindBoxAt(index) : false;
}

function placeSimpleModeBlindBoxesToAllEmpty() {
    return SIMPLE_MATCH_CORE ? SIMPLE_MATCH_CORE.placeSimpleModeBlindBoxesToAllEmpty() : 0;
}

function playSimpleModeRestockSequence() {
    return SIMPLE_MATCH_CORE ? SIMPLE_MATCH_CORE.playSimpleModeRestockSequence() : Promise.resolve(0);
}

async function resolveSimpleModeSelection(match) {
    return SIMPLE_MATCH_CORE ? SIMPLE_MATCH_CORE.resolveSimpleModeSelection(match) : false;
}

async function maybeResolveSimpleModeSelection() {
    return SIMPLE_MATCH_CORE ? SIMPLE_MATCH_CORE.maybeResolveSimpleModeSelection() : false;
}

function handleSimpleModeSelectionClick(index) {
    if (!SIMPLE_MATCH_CORE) return;
    SIMPLE_MATCH_CORE.handleSimpleModeSelectionClick(index);
}

async function applySafeReward(cell, index) {
    if (SIMPLE_SLOT_MODE) {
        if (SIMPLE_MATCH_CORE) {
            await SIMPLE_MATCH_CORE.applySimpleModeSafeReward(cell, index);
        }
        return;
    }
    const { x: centerX, y: centerY } = getGridCellBoxCenterInViewport(cell);

    const isForcedStickyWild = isStickyWildForcedAt(index);
    const blockData = STATE.boardPlan[index] || (isForcedStickyWild
        ? createSpecialBlockData('stickyWild')
        : createNormalBlockData('S1'));
    STATE.cellBlocks[index] = blockData;
    if (blockData.type === 'stickyWild' && !isForcedStickyWild) {
        markStickyWildForFutureRounds(index);
    }
    if (!STATE.hasTriggeredBonusGame) {
        if (blockData.type === 'bonus') {
            STATE.bonusTriggerBonusCount += 1;
        } else if (blockData.type === 'wild' || blockData.type === 'stickyWild') {
            STATE.bonusTriggerWildCount += 1;
        }
    }
    const rewardImg = ensureSafeOpenBoxImage(cell, blockData.imageSrc, 'stack block');
    if (rewardImg) {
        rewardImg.classList.toggle('bonus-reward-glow', blockData.type === 'bonus');
        rewardImg.classList.toggle('sticky-wild-reward-glow', blockData.type === 'stickyWild');
    }
    if (blockData.type === 'stickyWild') {
        ensureStickyWildRoundBadge(cell, getStickyWildRemainingRounds(index));
    } else {
        clearStickyWildRoundBadge(cell);
    }
    if (blockData.type === 'wild') {
        createFloatingText(centerX, centerY - 20, 'WILD');
    } else if (blockData.type === 'stickyWild') {
        createFloatingText(centerX, centerY - 20, 'STICKY WILD');
    } else if (blockData.type === 'bonus') {
        createFloatingText(centerX, centerY - 20, 'BONUS');
    } else if (blockData.type === 'monkey') {
        createFloatingText(centerX, centerY - 20, 'MONKEY');
        await playBombMonkeyAnimation(cell);
        await waitMs(Math.max(0, Number(CONFIG.bombWheelDelayAfterAnimMs) || 0));
        await startBombWheel(cell, index);
        clearBombAnimImage(cell);
        cell.classList.remove('bomb-animating');
    }
    await settleRealtimeRewardsForCurrentBoard(centerX, centerY);
    const bonusTriggered = await maybeTriggerBonusGame();
    if (!bonusTriggered) {
        await maybeTriggerFreeSpinGame();
    }
    updateStats();
}

function applyRewardRetentionRatio(ratio) {
    const safeRatio = Math.max(0, Math.min(1, Number(ratio) || 0));
    STATE.rewardRetentionRatio = Number((STATE.rewardRetentionRatio * safeRatio).toFixed(4));
    const baseMultiplier = getMultiplierBySuccessCount(STATE.stackHeight);
    STATE.currentMultiplier = Number((baseMultiplier * STATE.rewardRetentionRatio).toFixed(4));
    updateStats();
}

function pickBombWheelOutcome() {
    const weights = CONFIG.bombWheelWeights || {};
    const options = BOMB_WHEEL_OPTIONS.map((option) => {
        const raw = Number(weights[option.id]);
        return {
            ...option,
            weight: Number.isFinite(raw) && raw > 0 ? raw : 0
        };
    });

    const totalWeight = options.reduce((sum, option) => sum + option.weight, 0);
    if (totalWeight <= 0) {
        return options[Math.floor(Math.random() * options.length)];
    }

    let rand = Math.random() * totalWeight;
    for (let i = 0; i < options.length; i++) {
        rand -= options[i].weight;
        if (rand <= 0) return options[i];
    }

    return options[options.length - 1];
}

function trySettleAfterAllBoxesOpened() {
    if (STATE.isGameOver || STATE.isAnimating) return;
    if (STATE.pendingOpens > 0) return;
    if (STATE.unrevealedIndices.length > 0) return;
    handleAllBoxesOpened();
}

function continueAfterWheel() {
    STATE.isAnimating = false;
    if (randomBtn) randomBtn.disabled = false;
    if (STATE.mustOpenAllBeforeSettlement) {
        if (cashoutBtn) cashoutBtn.disabled = true;
        trySettleAfterAllBoxesOpened();
        return;
    }
    if (cashoutBtn) {
        cashoutBtn.disabled = STATE.stackHeight <= 0;
    }
}

function showMonkeyText(x, y, text) {
    const monkeyText = document.createElement('div');
    monkeyText.className = 'monkey-floating-text';
    monkeyText.textContent = text;
    monkeyText.style.left = `${x}px`;
    monkeyText.style.top = `${y}px`;
    document.body.appendChild(monkeyText);
    setTimeout(() => {
        if (monkeyText.isConnected) monkeyText.remove();
    }, 1750);
}

async function resolveBombWheelOutcome(outcome, outcomeSegment, cell, index, ui) {
    const { x: centerX, y: centerY } = getGridCellBoxCenterInViewport(cell);

    highlightWinningSegment(ui.wheel, outcome.id, outcomeSegment);
    ui.result.textContent = outcome.resultText;
    ui.result.classList.add('show');
    await waitMs(500);
    removeBombWheel();

    const target = getCustomerSatisfactionTarget();
    let floatingMessage = 'No reward';

    if (outcome.id === 'add3Blocks') {
        grantStackBlocks(3);
        floatingMessage = '满意度 +3';
    } else if (outcome.id === 'add8Blocks') {
        grantStackBlocks(8);
        floatingMessage = '满意度 +8';
    } else if (outcome.id === 'fillToMaxProgress') {
        const need = Math.max(0, target - STATE.stackHeight);
        if (need > 0) {
            grantStackBlocks(need);
            floatingMessage = `满意拉满 (+${need})`;
        } else {
            floatingMessage = '满意度已满';
        }
    } else if (outcome.id === 'giveBonusSymbol') {
        grantBonusSymbolBlock();
        floatingMessage = 'BONUS +1';
    } else {
        floatingMessage = 'No reward';
    }

    showMonkeyText(centerX, centerY - 40, floatingMessage);
    updateStats();
    continueAfterWheel();
}

async function startBombWheel(cell, index) {
    STATE.isAnimating = true;
    if (cashoutBtn) cashoutBtn.disabled = true;
    if (randomBtn) randomBtn.disabled = true;

    try {
        removeBombWheel();
        const segments = getBombWheelSegments();
        const ui = createBombWheel(cell, segments);
        const outcome = pickBombWheelOutcome();
        const outcomeSegment = segments.find((segment) => segment.id === outcome.id) || segments[0];
        const centerAngle = outcomeSegment.centerAngle;
        const maxOffset = Math.max(0, Math.min(outcomeSegment.span * 0.4, 15));
        const randomOffset = maxOffset > 0 ? (Math.random() - 0.5) * (maxOffset * 2) : 0;
        const extraSpins = (5 + Math.floor(Math.random() * 2)) * 360;
        const finalRotation = extraSpins + (360 - (centerAngle + randomOffset));
        const spinMs = Math.max(600, Number(CONFIG.bombWheelSpinMs) || DEFAULT_CONFIG.bombWheelSpinMs);
        const spinTransition = `transform ${spinMs}ms cubic-bezier(0.12, 0.8, 0.18, 1)`;
        ui.wheel.style.setProperty('--spin-ms', `${spinMs}ms`);
        ui.wheel.style.transition = 'none';
        ui.wheel.style.transform = 'rotate(0deg)';
        void ui.wheel.offsetWidth;
        await waitRaf();
        ui.wheel.style.transition = spinTransition;
        void ui.wheel.offsetWidth;
        await waitRaf();
        ui.wheel.style.transform = `rotate(${finalRotation}deg)`;
        await waitMs(spinMs + 120);
        await resolveBombWheelOutcome(outcome, outcomeSegment, cell, index, ui);
    } catch (err) {
        console.error('Bomb wheel failed:', err);
        removeBombWheel();
        continueAfterWheel();
    }
}

function getGridSideLength(totalCells) {
    const safeTotal = Math.max(1, Math.floor(Number(totalCells) || 0));
    const rounded = Math.round(Math.sqrt(safeTotal));
    if (rounded * rounded === safeTotal) return rounded;
    return 4;
}

function getBlockSymbolKey(blockData) {
    if (!blockData || !blockData.type) return null;
    if (blockData.type === 'wild') return null;
    if (blockData.type === 'stickyWild') return null;
    if (blockData.type === 'bonus') return null;
    // monkey symbol does not join normal settlements
    if (blockData.type === 'monkey') return null;
    if (blockData.type === 'normal') {
        return `normal:${blockData.normalKey || blockData.imageSrc}`;
    }
    return `${blockData.type}:${blockData.imageSrc || blockData.type}`;
}

function getClusterMultiplier(size) {
    const payout = CONFIG.clusterPayout;
    const safeSize = Math.max(0, Math.floor(Number(size) || 0));
    if (safeSize < payout.minClusterSize) return 0;
    if (safeSize >= payout.jackpotThreshold) return payout.jackpotMultiplier;
    const mapped = Number(payout.multipliers[safeSize]);
    return Number.isFinite(mapped) ? Math.max(0, mapped) : 0;
}

function getClusterReward(symbolKey, size) {
    const safeSize = Math.max(0, Math.floor(Number(size) || 0));
    const symbolText = String(symbolKey || '');
    const [, rawSymbol = ''] = symbolText.split(':');
    const payoutTable = MAIN_BOARD_PAYOUTS[rawSymbol];
    if (!payoutTable || safeSize < 3) {
        return 0;
    }
    if (safeSize >= 10) {
        return payoutTable[10] || 0;
    }
    return payoutTable[safeSize] || 0;
}

function getSettlementStackBlockCount(size) {
    const payout = CONFIG.clusterPayout || {};
    const mapping = payout.stackBlocksByClusterSize || {};
    const threshold = Math.max(1, Math.floor(Number(payout.jackpotThreshold) || 10));
    const safeSize = Math.max(0, Math.floor(Number(size) || 0));
    const exact = Number(mapping[safeSize]);
    if (Number.isFinite(exact)) return Math.max(0, Math.floor(exact));
    const jackpotMapped = Number(mapping[threshold]);
    if (safeSize >= threshold && Number.isFinite(jackpotMapped)) return Math.max(0, Math.floor(jackpotMapped));
    return 1;
}

function createSettlementStackBlockData(symbolKey) {
    const [type, ...parts] = String(symbolKey || '').split(':');
    const symbolValue = parts.join(':');

    if (type === 'bonus') {
        return {
            type: 'bonus',
            imageSrc: CONFIG.blockPool.bonusImage,
            normalKey: null
        };
    }

    if (type === 'normal') {
        return createNormalBlockData(symbolValue || 'S1');
    }

    return createNormalBlockData('S1');
}

function getSettlementStackBlockCountByClusterSize(clusterSize) {
    const safeSize = Math.max(1, Math.floor(Number(clusterSize) || 0));
    const rewardMap = CONFIG.clusterPayout.settlementStackBlocksBySize || {};
    const directValue = Number(rewardMap[safeSize]);
    if (Number.isFinite(directValue)) {
        return Math.max(0, Math.floor(directValue));
    }

    const minSize = Math.max(1, Math.floor(Number(CONFIG.clusterPayout.minClusterSize) || 3));
    const fallbackValue = Number(rewardMap[minSize]);
    if (Number.isFinite(fallbackValue)) {
        return Math.max(0, Math.floor(fallbackValue));
    }
    return 1;
}

function createBoardClusterSnapshot(blocksInput = STATE.cellBlocks) {
    const blocks = Array.isArray(blocksInput) ? blocksInput : [];
    const total = blocks.length;
    const side = getGridSideLength(total);
    const blockSymbols = new Array(total);
    const symbolKeys = [];
    const seenSymbols = new Set();

    for (let index = 0; index < total; index++) {
        const symbolKey = getBlockSymbolKey(blocks[index]);
        blockSymbols[index] = symbolKey;
        if (!symbolKey || seenSymbols.has(symbolKey)) continue;
        seenSymbols.add(symbolKey);
        symbolKeys.push(symbolKey);
    }

    return {
        blocks,
        blockSymbols,
        symbolKeys,
        total,
        side
    };
}

function collectActiveSymbolKeys(boardSnapshot = createBoardClusterSnapshot()) {
    return boardSnapshot.symbolKeys.slice();
}

function getBonusTriggerCounts() {
    const bonusCount = Math.max(0, Math.floor(Number(STATE.bonusTriggerBonusCount) || 0));
    const wildCount = Math.max(0, Math.floor(Number(STATE.bonusTriggerWildCount) || 0));
    const effectiveBonusCount = bonusCount > 0 ? (bonusCount + wildCount) : bonusCount;
    return {
        bonusCount,
        wildCount,
        effectiveBonusCount
    };
}

function shouldTriggerBonusGameNow() {
    if (SIMPLE_SLOT_MODE || !(CONFIG.featureFlags && CONFIG.featureFlags.bonusGameEnabled)) return false;
    if (STATE.hasTriggeredBonusGame || STATE.isBonusGameActive || STATE.bonusGamePendingStart || STATE.isGameOver || FREE_SPIN_STATE.pendingStart) return false;
    const target = getCustomerSatisfactionTarget();
    return STATE.stackHeight >= target;
}

function resetBonusTriggerLatch() {
    STATE.hasTriggeredBonusGame = false;
    STATE.bonusGamePendingStart = false;
}

function isFreeSpinBlockedByBonusState() {
    return STATE.isBonusGameActive || STATE.bonusGamePendingStart || FREE_SPIN_STATE.pausedByBonus;
}

function resumeFreeSpinAfterBonus() {
    if (!FREE_SPIN_STATE.active) return false;
    FREE_SPIN_STATE.pausedByBonus = false;
    hideFreeSpinTriggerOverlay();
    setFreeSpinVisualMode(true);
    setFreeSpinHudVisible(true);
    updateFreeSpinHud();

    if (FREE_SPIN_STATE.isTransitioning) {
        if (FREE_SPIN_STATE.spinsLeft <= 0) {
            endFreeSpinSession();
            return true;
        }
        startNextFreeSpinBoard();
        return true;
    }

    if (!FREE_SPIN_STATE.isEntering && !FREE_SPIN_STATE.isSettling) {
        setFreeSpinButtonsEnabled(true);
    }
    return true;
}

function handleBonusGameFinished(result = {}) {
    const reward = Number(result.bonusReward);
    const bonusReward = Number.isFinite(reward) ? Math.max(0, Math.floor(reward)) : 0;
    if (bonusReward > 0) {
        STATE.bonusDiamondReward += bonusReward;
    }
    const bonusProgressCost = getCustomerSatisfactionTarget();
    if (bonusProgressCost > 0) {
        consumeStackBlocks(bonusProgressCost, { finalize: true });
    }

    STATE.isBonusGameActive = false;
    resetBonusTriggerLatch();
    hideBonusTriggerOverlay({ resolvePending: true });
    STATE.isAnimating = false;
    updateStats();
    updateSlotBackButtonVisibility();

    if (STATE.isGameOver) return;
    if (resumeFreeSpinAfterBonus()) {
        if (freeSpinHud) freeSpinHud.classList.remove('hidden');
        return;
    }
    if (handleAllBoxesOpened()) {
        return;
    }

    if (cashoutBtn) cashoutBtn.disabled = false;
    if (randomBtn) randomBtn.disabled = false;
}

function getUnrevealedFreeSpinItems() {
    return FREE_SPIN_STATE.items.filter((item) => item && !item.revealed);
}

function setFreeSpinButtonsEnabled(enabled) {
    if (cashoutBtn) cashoutBtn.disabled = !enabled;
    if (randomBtn) randomBtn.disabled = !enabled;
}

function startNextFreeSpinBoard() {
    if (!FREE_SPIN_STATE.active || isFreeSpinBlockedByBonusState()) return;
    FREE_SPIN_STATE.isEntering = false;
    FREE_SPIN_STATE.isSettling = false;
    FREE_SPIN_STATE.isTransitioning = false;
    renderFreeSpinBoard();
    updateFreeSpinHud();
}

function restoreMainBoardAfterFreeSpin() {
    if (!gridBoard) return;
    gridBoard.innerHTML = FREE_SPIN_STATE.savedBoardMarkup || '';
    gridBoard.classList.remove('is-free-spin');
    STATE.gridCells = Array.from(gridBoard.children);
}

function endFreeSpinSession() {
    FREE_SPIN_STATE.pausedByBonus = false;
    restoreMainBoardAfterFreeSpin();
    setFreeSpinHudVisible(false);
    setFreeSpinVisualMode(false);
    hideFreeSpinTriggerOverlay();
    
    // Show the result overlay with the total reward
    showFreeSpinResultOverlay();
    updateSlotBackButtonVisibility();
}

function finishFreeSpinResult() {
    if (freeSpinResultOverlay && freeSpinResultOverlay.classList.contains('hidden')) return; // 避免重复触发
    
    hideFreeSpinResultOverlay();
    resetFreeSpinRuntimeState();
    updateStats();
    updateSlotBackButtonVisibility();

    if (STATE.isGameOver) return;
    if (handleAllBoxesOpened()) {
        return;
    }

    if (cashoutBtn) cashoutBtn.disabled = false;
    if (randomBtn) randomBtn.disabled = false;
}

function showFreeSpinResultOverlay() {
    if (!freeSpinResultOverlay) return;
    freeSpinResultOverlay.classList.remove('hidden');
    updateSlotBackButtonVisibility();
    
    // Reset and start number rolling animation
    if (freeSpinResultReward) {
        freeSpinResultReward.textContent = '0';
        animateNumberRoll(freeSpinResultReward, 0, Math.floor(FREE_SPIN_STATE.totalReward), 1500);
    }

    // Start particles
    startFreeSpinParticles();
}

function hideFreeSpinResultOverlay() {
    if (!freeSpinResultOverlay) return;
    freeSpinResultOverlay.classList.add('hidden');
    stopFreeSpinParticles();
    updateSlotBackButtonVisibility();
}

let freeSpinParticlesAnimationId = null;

function startFreeSpinParticles() {
    if (!freeSpinParticlesCanvas) return;
    
    const ctx = freeSpinParticlesCanvas.getContext('2d');
    const width = freeSpinParticlesCanvas.width = window.innerWidth;
    const height = freeSpinParticlesCanvas.height = window.innerHeight;
    
    const particles = [];
    const emojis = ['🌸', '✨', '🍀', '🎈', '💖', '🎵', '🌼', '🍉'];
    const particleCount = 35; // 进一步减少粒子数量，提升移动端/低端机性能
    
    // To optimize performance, pre-render emojis to offscreen canvases
    const emojiCanvases = {};
    emojis.forEach(emoji => {
        const offCanvas = document.createElement('canvas');
        // Size it large enough for the biggest particle
        const size = 60;
        offCanvas.width = size;
        offCanvas.height = size;
        const oCtx = offCanvas.getContext('2d', { alpha: true });
        oCtx.font = '40px Arial';
        oCtx.textAlign = 'center';
        oCtx.textBaseline = 'middle';
        oCtx.fillText(emoji, size/2, size/2);
        emojiCanvases[emoji] = offCanvas;
    });

    for (let i = 0; i < particleCount; i++) {
        particles.push({
            x: Math.random() * width,
            y: -20 - Math.random() * 100, // start above screen
            size: Math.random() * 20 + 15,
            speedY: Math.random() * 5 + 4, // 增加下落速度
            speedX: (Math.random() - 0.5) * 3, // 增加左右飘动幅度
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.15, // 增加旋转速度
            emoji: emojis[Math.floor(Math.random() * emojis.length)]
        });
    }
    
    let lastTime = 0;

    function animate(currentTime) {
        if (!lastTime) lastTime = currentTime;
        // Calculate delta time to make movement frame-rate independent
        const deltaTime = Math.min((currentTime - lastTime) / 16.66, 3); // cap at 3 frames to avoid huge jumps
        lastTime = currentTime;

        ctx.clearRect(0, 0, width, height);
        
        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            
            p.y += p.speedY * deltaTime;
            p.x += p.speedX * deltaTime;
            p.rotation += p.rotationSpeed * deltaTime;
            
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation);
            
            // Draw from pre-rendered canvas instead of text rendering which is slow
            const renderCanvas = emojiCanvases[p.emoji];
            if (renderCanvas) {
                // Scale the 60px canvas down/up to the desired particle size
                const scale = p.size / 40;
                ctx.scale(scale, scale);
                ctx.drawImage(renderCanvas, -30, -30);
            }
            
            ctx.restore();
            
            // Reset particle if it goes off screen
            if (p.y > height + 50) {
                p.y = -50;
                p.x = Math.random() * width;
            }
        }
        
        freeSpinParticlesAnimationId = requestAnimationFrame(animate);
    }
    
    if (freeSpinParticlesAnimationId) {
        cancelAnimationFrame(freeSpinParticlesAnimationId);
    }
    freeSpinParticlesAnimationId = requestAnimationFrame(animate);
}

function stopFreeSpinParticles() {
    if (freeSpinParticlesAnimationId) {
        cancelAnimationFrame(freeSpinParticlesAnimationId);
        freeSpinParticlesAnimationId = null;
    }
}

function animateNumberRoll(element, start, end, duration) {
    if (!element) return;
    const startTime = performance.now();
    
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function (easeOutQuad)
        const easeOut = progress * (2 - progress);
        
        const currentNum = Math.floor(start + (end - start) * easeOut);
        element.textContent = currentNum.toLocaleString();
        
        if (progress < 1) {
            requestAnimationFrame(update);
        } else {
            element.textContent = end.toLocaleString();
        }
    }
    
    requestAnimationFrame(update);
}

function finishCurrentFreeSpinBoard() {
    if (!FREE_SPIN_STATE.active || FREE_SPIN_STATE.isTransitioning || isFreeSpinBlockedByBonusState()) return;
    FREE_SPIN_STATE.isTransitioning = true;
    setFreeSpinButtonsEnabled(false);
    FREE_SPIN_STATE.spinsLeft = Math.max(0, FREE_SPIN_STATE.spinsLeft - 1);
    updateFreeSpinHud();

    if (FREE_SPIN_STATE.spinsLeft <= 0) {
        setTimeout(() => {
            if (isFreeSpinBlockedByBonusState()) return;
            endFreeSpinSession();
        }, 500);
        return;
    }

    setTimeout(() => {
        if (isFreeSpinBlockedByBonusState()) return;
        startNextFreeSpinBoard();
    }, 650);
}

function beginPendingFreeSpinGame() {
    if (!FREE_SPIN_STATE.pendingStart || FREE_SPIN_STATE.active || STATE.isBonusGameActive || STATE.bonusGamePendingStart) return;
    if (!gridBoard) return;

    FREE_SPIN_STATE.pendingStart = false;
    FREE_SPIN_STATE.active = true;
    FREE_SPIN_STATE.pausedByBonus = false;
    FREE_SPIN_STATE.spinsLeft = Math.max(1, Math.floor(Number(CONFIG.freeSpin.spinsPerTrigger) || 3));
    FREE_SPIN_STATE.totalReward = 0;
    FREE_SPIN_STATE.savedBoardMarkup = gridBoard.innerHTML;
    FREE_SPIN_STATE.savedGridCellCount = gridBoard.children.length;
    hideFreeSpinTriggerOverlay();
    setFreeSpinHudVisible(true);
    setFreeSpinVisualMode(true);
    startNextFreeSpinBoard();
}

async function settleFreeSpinRewardsForCurrentBoard() {
    const boardSnapshot = createBoardClusterSnapshot(FREE_SPIN_STATE.cellBlocks);
    const symbolKeys = collectActiveSymbolKeys(boardSnapshot);
    const gridCells = Array.isArray(FREE_SPIN_STATE.cellElementsByIndex) ? FREE_SPIN_STATE.cellElementsByIndex : [];
    const triggeredEvents = [];

    symbolKeys.forEach((symbolKey) => {
        const bestCluster = findBestClusterForSymbol(symbolKey, boardSnapshot);
        if (!bestCluster || bestCluster.size <= 0) return;

        const prevSettledSize = Math.max(0, Math.floor(Number(FREE_SPIN_STATE.symbolSettledSizeByKey[symbolKey]) || 0));
        const maxSettleSize = Math.min(bestCluster.size, CONFIG.clusterPayout.jackpotThreshold);
        if (maxSettleSize <= prevSettledSize) return;

        const settleFrom = Math.max(CONFIG.clusterPayout.minClusterSize, prevSettledSize + 1);
        if (settleFrom > maxSettleSize) {
            FREE_SPIN_STATE.symbolSettledSizeByKey[symbolKey] = maxSettleSize;
            return;
        }

        const settleSize = maxSettleSize;
        const reward = Math.floor(
            getClusterReward(symbolKey, settleSize)
            * Math.max(0, Number(CONFIG.freeSpin.rewardMultiplier) || 0)
        );
        if (reward > 0) {
            STATE.roundReward += reward;
            FREE_SPIN_STATE.totalReward += reward;

            triggeredEvents.push({
                symbolKey,
                size: settleSize,
                reward,
                indexes: bestCluster.indexes.slice(),
                minIndex: bestCluster.minIndex,
                stackBlocks: getSettlementStackBlockCount(settleSize),
                satisfactionGain: 0,
                satisfiesCustomer: false,
                customerPreferenceKey: null,
                multiplier: getClusterMultiplier(settleSize),
                jackpot: settleSize >= CONFIG.clusterPayout.jackpotThreshold
            });
        }

        FREE_SPIN_STATE.symbolSettledSizeByKey[symbolKey] = maxSettleSize;
    });

    if (triggeredEvents.length === 0) {
        updateStats();
        updateFreeSpinHud();
        return;
    }

    triggeredEvents.sort((a, b) => {
        const aMin = Number.isFinite(a.minIndex) ? a.minIndex : Number.MAX_SAFE_INTEGER;
        const bMin = Number.isFinite(b.minIndex) ? b.minIndex : Number.MAX_SAFE_INTEGER;
        if (aMin !== bMin) return aMin - bMin;
        if (a.symbolKey !== b.symbolKey) return String(a.symbolKey).localeCompare(String(b.symbolKey));
        return a.size - b.size;
    });

    FREE_SPIN_STATE.isSettling = true;

    try {
        await playSettlementAnimationSequence(triggeredEvents, gridCells, {
            centerGetter: getFreeSpinItemBoxCenterInViewport,
            flyBlockFn: flyVisualBlockToStack
        });
    } catch (err) {
        console.error('Free spin settlement animation failed:', err);
    } finally {
        FREE_SPIN_STATE.isSettling = false;
    }

    updateStats();
    updateFreeSpinHud();
}

function handleFreeSpinCellClick(itemId) {
    if (!FREE_SPIN_STATE.active || FREE_SPIN_STATE.isEntering || FREE_SPIN_STATE.isSettling || FREE_SPIN_STATE.isTransitioning || isFreeSpinBlockedByBonusState()) {
        return Promise.resolve();
    }

    const item = FREE_SPIN_STATE.itemMap.get(String(itemId));
    if (!item || item.revealed || !item.element) {
        return Promise.resolve();
    }

    setFreeSpinButtonsEnabled(false);
    item.revealed = true;
    item.blockData = createFreeSpinBlockData();
    item.indexes.forEach((index) => {
        FREE_SPIN_STATE.cellBlocks[index] = item.blockData;
    });

    const openCenter = getFreeSpinItemBoxCenterInViewport(item.element);

    item.element.classList.add('opening');
    return new Promise((resolve) => {
        setTimeout(async () => {
            item.element.classList.remove('opening');
            item.element.classList.add('revealed');
            item.element.classList.add('safe-pop');
            setTimeout(() => {
                if (item.element && item.element.isConnected) {
                    item.element.classList.remove('safe-pop');
                }
            }, 300);

            createSafeShockwave(openCenter.x, openCenter.y);
            createSafeBurstParticles(openCenter.x, openCenter.y);

            const rewardGrid = renderFreeSpinRewardGrid(item, item.blockData);
            item.element.appendChild(rewardGrid);
            requestAnimationFrame(() => {
                positionFreeSpinRewardGrid(rewardGrid);
            });

            if (item.blockData.type === 'wild') {
                const center = getFreeSpinItemBoxCenterInViewport(item.element);
                createFloatingText(center.x, center.y - 20, 'WILD');
            }

            await settleFreeSpinRewardsForCurrentBoard();
            const shouldFinishBoard = getUnrevealedFreeSpinItems().length === 0;
            if (shouldFinishBoard) {
                finishCurrentFreeSpinBoard();
            }
            const bonusTriggered = await maybeTriggerBonusGame();
            if (bonusTriggered) {
                resolve();
                return;
            }

            if (shouldFinishBoard) {
                resolve();
                return;
            }

            if (!FREE_SPIN_STATE.isSettling && !FREE_SPIN_STATE.isTransitioning && !isFreeSpinBlockedByBonusState()) {
                setFreeSpinButtonsEnabled(true);
            }
            resolve();
        }, 400);
    });
}

function openAllFreeSpinBoxes() {
    if (!FREE_SPIN_STATE.active || FREE_SPIN_STATE.isEntering || FREE_SPIN_STATE.isSettling || FREE_SPIN_STATE.isTransitioning || isFreeSpinBlockedByBonusState()) return;
    const pendingItems = getUnrevealedFreeSpinItems();
    if (pendingItems.length === 0) return;
    void (async () => {
        for (let index = 0; index < pendingItems.length; index++) {
            await handleFreeSpinCellClick(pendingItems[index].id);
            if (!FREE_SPIN_STATE.active || FREE_SPIN_STATE.isTransitioning || isFreeSpinBlockedByBonusState()) {
                break;
            }
        }
    })();
}

function randomOpenFreeSpinBox() {
    if (!FREE_SPIN_STATE.active || FREE_SPIN_STATE.isEntering || FREE_SPIN_STATE.isSettling || FREE_SPIN_STATE.isTransitioning || isFreeSpinBlockedByBonusState()) return;
    const pendingItems = getUnrevealedFreeSpinItems();
    if (pendingItems.length === 0) return;
    const target = pendingItems[Math.floor(Math.random() * pendingItems.length)];
    handleFreeSpinCellClick(target.id);
}

function maybeTriggerBonusGame() {
    if (!shouldTriggerBonusGameNow()) return Promise.resolve(false);
    STATE.hasTriggeredBonusGame = true;
    STATE.bonusGamePendingStart = true;
    stopAutoOpen();
    if (cashoutBtn) cashoutBtn.disabled = true;
    if (randomBtn) randomBtn.disabled = true;

    return showBonusTriggerOverlay()
        .then((action) => {
            if (action !== 'confirm') {
                resetBonusTriggerLatch();
                return false;
            }
            if (STATE.isGameOver || !STATE.bonusGamePendingStart || STATE.isBonusGameActive) {
                resetBonusTriggerLatch();
                return false;
            }
            return beginPendingBonusGame();
        })
        .catch((error) => {
            resetBonusTriggerLatch();
            throw error;
        });
}

function canBlockJoinSymbol(blockData, blockSymbol, symbolKey) {
    if (!blockData) return false;
    return blockData.type === 'wild'
        || blockData.type === 'stickyWild'
        || blockSymbol === symbolKey;
}

function queueSymbolNeighbor(nextIndex, boardSnapshot, symbolKey, visited, queue) {
    if (visited[nextIndex]) return;

    const nextBlock = boardSnapshot.blocks[nextIndex];
    if (!canBlockJoinSymbol(nextBlock, boardSnapshot.blockSymbols[nextIndex], symbolKey)) return;

    visited[nextIndex] = 1;
    queue.push(nextIndex);
}

function findBestClusterForSymbol(symbolKey, boardSnapshot = createBoardClusterSnapshot()) {
    const { blocks, blockSymbols, total, side } = boardSnapshot;
    const visited = new Uint8Array(total);

    let bestSize = 0;
    let bestIndexes = [];
    let bestMinIndex = Number.MAX_SAFE_INTEGER;

    for (let start = 0; start < total; start++) {
        if (visited[start]) continue;
        const startBlock = blocks[start];
        if (!canBlockJoinSymbol(startBlock, blockSymbols[start], symbolKey)) continue;

        const queue = [start];
        const component = [];
        let cursor = 0;
        let hasTargetSymbol = false;
        let componentMinIndex = start;

        visited[start] = 1;
        while (cursor < queue.length) {
            const current = queue[cursor++];
            component.push(current);
            if (current < componentMinIndex) {
                componentMinIndex = current;
            }

            if (blockSymbols[current] === symbolKey) {
                hasTargetSymbol = true;
            }

            const row = Math.floor(current / side);
            const col = current % side;
            if (row > 0) queueSymbolNeighbor(current - side, boardSnapshot, symbolKey, visited, queue);
            if (row < side - 1) queueSymbolNeighbor(current + side, boardSnapshot, symbolKey, visited, queue);
            if (col > 0) queueSymbolNeighbor(current - 1, boardSnapshot, symbolKey, visited, queue);
            if (col < side - 1) queueSymbolNeighbor(current + 1, boardSnapshot, symbolKey, visited, queue);
        }

        if (!hasTargetSymbol) continue;
        if (component.length > bestSize) {
            bestSize = component.length;
            bestIndexes = component;
            bestMinIndex = componentMinIndex;
        }
    }

    return {
        symbolKey,
        size: bestSize,
        indexes: bestIndexes,
        minIndex: bestMinIndex
    };
}

function highlightRealtimeSettlementEvent(event, cells = STATE.gridCells) {
    if (!event || !Array.isArray(cells) || cells.length === 0) return [];
    const indexes = Array.from(new Set(event.indexes || []));

    indexes.forEach((index) => {
        const cell = cells[index];
        if (!cell) return;
        cell.classList.add('win-cluster');
        if (event.jackpot) {
            cell.classList.add('win-jackpot');
        } else {
            cell.classList.remove('win-jackpot');
        }
        cell.style.zIndex = '20';

        const highlightTarget = cell.querySelector('.safe-open-box-frame') || cell.querySelector('.free-spin-reward-grid');
        if (highlightTarget) {
            highlightTarget.classList.remove('settle-enlarge-glow');
            void highlightTarget.offsetWidth; // trigger reflow
            highlightTarget.classList.add('settle-enlarge-glow');
        }

        const badge = cell.querySelector('.sticky-wild-round-badge');
        if (badge) {
            badge.classList.remove('settle-enlarge-glow');
            void badge.offsetWidth;
            badge.classList.add('settle-enlarge-glow');
        }
    });

    return indexes;
}

function clearRealtimeSettlementHighlight(indexes, cells = STATE.gridCells) {
    if (!Array.isArray(indexes) || indexes.length === 0 || !Array.isArray(cells) || cells.length === 0) return;

    indexes.forEach((index) => {
        const cell = cells[index];
        if (!cell) return;
        cell.classList.remove('win-cluster', 'win-jackpot');
        cell.style.zIndex = '';

        const highlightTarget = cell.querySelector('.safe-open-box-frame') || cell.querySelector('.free-spin-reward-grid');
        if (highlightTarget) {
            highlightTarget.classList.remove('settle-enlarge-glow');
        }

        const badge = cell.querySelector('.sticky-wild-round-badge');
        if (badge) {
            badge.classList.remove('settle-enlarge-glow');
        }
    });
}

async function playSettlementAnimationSequence(events, cells, options = {}) {
    if (!Array.isArray(events) || events.length === 0 || !Array.isArray(cells) || cells.length === 0) return;

    const centerGetter = typeof options.centerGetter === 'function'
        ? options.centerGetter
        : getGridCellBoxCenterInViewport;
    const flyBlockFn = typeof options.flyBlockFn === 'function'
        ? options.flyBlockFn
        : flyBlockToStack;
    const rewardTextFormatter = typeof options.rewardTextFormatter === 'function'
        ? options.rewardTextFormatter
        : ((event) => `+${event.reward}`);

    for (let index = 0; index < events.length; index++) {
        const event = decorateSettlementEventWithCustomerOutcome(events[index]);
        const highlightedIndexes = highlightRealtimeSettlementEvent(event, cells);

        if (event.size >= 5) {
            createConfettiFireworks();
        }

        // 连团数量 > 4 时触发金币雨，> 6 时更多金币
        if (event.size > 4) {
            createCoinRain(event.size > 6 ? 70 : 40);
        }

        await waitMs(500);

        let sumX = 0;
        let sumY = 0;
        let count = 0;
        highlightedIndexes.forEach((gridIndex) => {
            const cell = cells[gridIndex];
            if (!cell) return;
            const center = centerGetter(cell);
            sumX += center.x;
            sumY += center.y;
            count += 1;
        });

        if (count > 0) {
            const clusterCenter = {
                x: sumX / count,
                y: sumY / count
            };

            // 金币奖励飘字带金币图标
            createCoinFloatingText(
                clusterCenter.x,
                clusterCenter.y - 40,
                rewardTextFormatter(event)
            );

            const blockCount = Math.max(0, Math.floor(Number(event.satisfactionGain) || 0));
            if (blockCount > 0) {
                const flyTasks = [];
                for (let stackIndex = 0; stackIndex < blockCount; stackIndex++) {
                    flyTasks.push((async () => {
                        if (stackIndex > 0) {
                            await waitMs(stackIndex * STACK_BLOCK_MULTI_FLY_STAGGER_MS);
                        }
                        const offsetX = (Math.random() - 0.5) * 28;
                        const offsetY = (Math.random() - 0.5) * 20;
                        await flyBlockFn(
                            clusterCenter.x + offsetX,
                            clusterCenter.y + offsetY,
                            createSettlementStackBlockData(event.symbolKey)
                        );
                    })());
                }
                await Promise.all(flyTasks);
            }

            if (event.satisfiesCustomer) {
                await handleSatisfiedCustomer(event, clusterCenter);
            }
        }

        await waitMs(200);
        clearRealtimeSettlementHighlight(highlightedIndexes, cells);
    }
}

async function settleRealtimeRewardsForCurrentBoard(centerX, centerY) {
    const boardSnapshot = createBoardClusterSnapshot();
    const symbolKeys = collectActiveSymbolKeys(boardSnapshot);
    const gridCells = Array.isArray(STATE.gridCells) ? STATE.gridCells : [];
    const triggeredEvents = [];

    symbolKeys.forEach((symbolKey) => {
        const bestCluster = findBestClusterForSymbol(symbolKey, boardSnapshot);
        if (!bestCluster || bestCluster.size <= 0) return;

        const prevSettledSize = Math.max(0, Math.floor(Number(STATE.symbolSettledSizeByKey[symbolKey]) || 0));
        const maxSettleSize = Math.min(bestCluster.size, CONFIG.clusterPayout.jackpotThreshold);
        if (maxSettleSize <= prevSettledSize) return;

        const settleFrom = Math.max(CONFIG.clusterPayout.minClusterSize, prevSettledSize + 1);
        if (settleFrom > maxSettleSize) {
            STATE.symbolSettledSizeByKey[symbolKey] = maxSettleSize;
            return;
        }

        // Only settle once per symbol for each reveal.
        // WILD can still trigger multiple symbol settlements by contributing to multiple symbol keys.
        const settleSize = maxSettleSize;
        const reward = getClusterReward(symbolKey, settleSize);
        if (reward > 0) {
            STATE.roundReward += reward;
            STATE.totalSettlements += 1;

            const event = {
                symbolKey,
                size: settleSize,
                reward,
                indexes: bestCluster.indexes.slice(),
                minIndex: bestCluster.minIndex,
                stackBlocks: getSettlementStackBlockCount(settleSize),
                satisfactionGain: 0,
                satisfiesCustomer: false,
                customerPreferenceKey: null,
                multiplier: getClusterMultiplier(settleSize),
                jackpot: settleSize >= CONFIG.clusterPayout.jackpotThreshold
            };
            STATE.realtimeSettlementEvents.push(event);
            triggeredEvents.push(event);
        }

        STATE.symbolSettledSizeByKey[symbolKey] = maxSettleSize;
    });

    if (triggeredEvents.length > 0) {
        triggeredEvents.sort((a, b) => {
            const aMin = Number.isFinite(a.minIndex) ? a.minIndex : Number.MAX_SAFE_INTEGER;
            const bMin = Number.isFinite(b.minIndex) ? b.minIndex : Number.MAX_SAFE_INTEGER;
            if (aMin !== bMin) return aMin - bMin;
            if (a.symbolKey !== b.symbolKey) return String(a.symbolKey).localeCompare(String(b.symbolKey));
            return a.size - b.size;
        });

        STATE.isSettling = true;

        try {
            await playSettlementAnimationSequence(triggeredEvents, gridCells, {
                centerGetter: getGridCellBoxCenterInViewport,
                flyBlockFn: flyBlockToStack
            });
        } catch (err) {
            console.error('Settlement animation failed:', err);
        } finally {
            STATE.isSettling = false;
        }

        // Since isSettling is false now, we check if we should re-enable buttons
        if (STATE.pendingOpens === 0 && !STATE.isAnimating && !STATE.isGameOver && !STATE.isBonusGameActive && !STATE.bonusGamePendingStart && !FREE_SPIN_STATE.pendingStart && !FREE_SPIN_STATE.active) {
            if (STATE.unrevealedIndices.length > 0) {
                if (cashoutBtn) cashoutBtn.disabled = false;
                if (randomBtn) randomBtn.disabled = false;
            }
        }
    }
}

function formatFinalSummaryMessage() {
    if (STATE.totalSettlements <= 0) {
        const bonusDiamonds = Math.max(0, Math.floor(Number(STATE.bonusDiamondReward) || 0));
        return bonusDiamonds > 0
            ? `No ${CONFIG.clusterPayout.minClusterSize}+ connected settlement triggered in this round. Bonus diamonds: ${bonusDiamonds}.`
            : `No ${CONFIG.clusterPayout.minClusterSize}+ connected settlement triggered in this round.`;
    }

    let maxConnected = 0;
    let jackpotHits = 0;
    STATE.realtimeSettlementEvents.forEach((event) => {
        if (event.size > maxConnected) {
            maxConnected = event.size;
        }
        if (event.jackpot) {
            jackpotHits += 1;
        }
    });

    const bonusDiamonds = Math.max(0, Math.floor(Number(STATE.bonusDiamondReward) || 0));
    return bonusDiamonds > 0
        ? `Realtime settlements: ${STATE.totalSettlements}. Max connected: ${maxConnected}. Jackpot hits: ${jackpotHits}. Bonus diamonds: ${bonusDiamonds}.`
        : `Realtime settlements: ${STATE.totalSettlements}. Max connected: ${maxConnected}. Jackpot hits: ${jackpotHits}.`;
}

function endGame(result) {
    if (STATE.isGameOver) return;
    stopAutoOpen();
    STATE.isGameOver = true;
    if (cashoutBtn) cashoutBtn.disabled = true;
    if (randomBtn) randomBtn.disabled = true;

    updateStats();
    applyRoundRewardsToZooEconomy();

    const title = result === 'allOpened' ? 'Settlement' : 'Game Over';
    const msg = formatFinalSummaryMessage();
    const score = Math.floor(STATE.roundReward);

    setTimeout(() => {
        showModal(title, msg, score);
    }, CONFIG.modalDelayMs);
}

function openAllBoxes() {
    if (SIMPLE_SLOT_MODE && !hasSimpleWishSelection()) {
        showSimpleWishOverlay();
        return;
    }
    if (FREE_SPIN_STATE.active) {
        openAllFreeSpinBoxes();
        return;
    }
    if (STATE.isGameOver || STATE.isBoardEntering || STATE.isAnimating || STATE.isSettling || STATE.isBonusGameActive || STATE.bonusGamePendingStart) return;
    const pending = STATE.unrevealedIndices.slice();
    if (pending.length === 0) return;
    pending.forEach((index, order) => {
        setTimeout(() => {
            handleCellClick(index, true);
        }, order * 70);
    });
}

function randomOpen() {
    performPrimaryOpenAction();
}

function showModal(title, msg, score) {
    stopAutoOpen();
    hideBonusTriggerOverlay({ resolvePending: true });
    modalTitle.textContent = title;
    modalMessage.textContent = msg;
    finalReward.textContent = score;
    modalOverlay.classList.remove('hidden');
    updateSlotBackButtonVisibility();
}

function ensureSlotGameInitialized() {
    if (SLOT_GAME_RUNTIME.initialized) return true;
    return initGame();
}

function showSlotTutorial() {
    const overlay = document.getElementById('slot-tutorial-overlay');
    if (overlay) {
        overlay.classList.remove('hidden');
        const zooEconomy = typeof getZooEconomy === 'function' ? getZooEconomy() : null;
        if (zooEconomy && typeof zooEconomy.markSlotTutorialSeen === 'function') {
            zooEconomy.markSlotTutorialSeen();
        }
        updateSlotBackButtonVisibility();
    }
}

function hideSlotTutorial() {
    const overlay = document.getElementById('slot-tutorial-overlay');
    if (overlay) {
        overlay.classList.add('hidden');
        updateSlotBackButtonVisibility();
    }
}

function enterSlotGameView() {
    const initialized = ensureSlotGameInitialized();
    if (!initialized) {
        return false;
    }
    SLOT_GAME_RUNTIME.viewActive = true;
    updateSlotEconomyHud();
    ensureCurrentCustomer();
    renderCurrentCustomer();
    updatePrimaryActionButtonState();
    if (SIMPLE_SLOT_MODE && !hasSimpleWishSelection()) {
        showSimpleWishOverlay();
    }
    if (SIMPLE_SLOT_MODE) {
        refreshSimpleModeUi();
    }
    updateTowerViewportScrollState();
    maybeAutoScrollTowerViewport({ force: STACK_VIEWPORT_STATE.autoFollow, smooth: false });
    updateSlotBackButtonVisibility();
    playSlotEntranceAnimation();
    // Replay the box-drop animation for unrevealed cells every time the view is entered
    replayBoardEntranceOnViewEnter();

    const zooEconomy = typeof getZooEconomy === 'function' ? getZooEconomy() : null;
    if (zooEconomy && typeof zooEconomy.hasSeenSlotTutorial === 'function') {
        if (!zooEconomy.hasSeenSlotTutorial()) {
            showSlotTutorial();
        }
    }

    return true;
}

/**
 * Replay the board box-drop animation when re-entering the slot view.
 * Only animates cells that haven't been revealed yet, so partially-played
 * boards look natural — opened boxes stay put, closed ones drop in.
 */
function replayBoardEntranceOnViewEnter() {
    const cells = Array.isArray(STATE.gridCells) ? STATE.gridCells.filter(Boolean) : [];
    if (cells.length === 0) return;

    const side = getGridSideLength(cells.length || CONFIG.gridSize);
    const unrevealed = [];

    cells.forEach((cell, index) => {
        if (!cell.classList.contains('revealed')) {
            unrevealed.push({
                element: cell,
                primary: index % side,
                secondary: Math.floor(index / side)
            });
        }
    });

    if (unrevealed.length === 0) return;

    const runId = ++mainBoardEntranceRunId;
    const totalMs = playSequentialBoardEntrance(unrevealed);

    STATE.isBoardEntering = totalMs > 0;
    if (cashoutBtn) cashoutBtn.disabled = true;
    if (randomBtn) randomBtn.disabled = true;

    if (totalMs <= 0) {
        STATE.isBoardEntering = false;
        if (!STATE.isGameOver && !STATE.isAnimating && !STATE.isSettling && !STATE.isBonusGameActive && !STATE.bonusGamePendingStart && !FREE_SPIN_STATE.pendingStart && !FREE_SPIN_STATE.active) {
            if (cashoutBtn) cashoutBtn.disabled = false;
            if (randomBtn) randomBtn.disabled = false;
        }
        return;
    }

    window.setTimeout(() => {
        if (runId !== mainBoardEntranceRunId) return;
        STATE.isBoardEntering = false;
        unrevealed.forEach(({ element }) => {
            element.classList.remove('board-entering');
        });
        if (!STATE.isGameOver && !STATE.isAnimating && !STATE.isSettling && !STATE.isBonusGameActive && !STATE.bonusGamePendingStart && !FREE_SPIN_STATE.pendingStart && !FREE_SPIN_STATE.active) {
            if (cashoutBtn) cashoutBtn.disabled = false;
            if (randomBtn) randomBtn.disabled = false;
        }
    }, totalMs);
}

/**
 * Play a staggered entrance animation every time the slot game screen is shown.
 * Adds the `.slot-entering` class to the game container, which CSS uses to
 * drive per-element keyframe animations. The class is removed after the
 * animation sequence completes so it can replay on the next visit.
 */
function playSlotEntranceAnimation() {
    if (!gameContainer) return;
    // Remove first in case a previous animation was interrupted
    gameContainer.classList.remove('slot-entering');
    // Force a reflow so re-adding the class restarts all animations
    void gameContainer.offsetWidth;
    gameContainer.classList.add('slot-entering');

    // Total animation duration: longest delay (800ms) + longest anim (700ms) = ~1500ms
    // Add a small buffer and clean up
    const cleanupTimer = setTimeout(() => {
        if (gameContainer) gameContainer.classList.remove('slot-entering');
    }, 1800);

    // Store timer so it can be cleared if user leaves early
    SLOT_GAME_RUNTIME._entranceTimer = cleanupTimer;
}

function leaveSlotGameView() {
    SLOT_GAME_RUNTIME.viewActive = false;
    clearAutoOpenHoldTimer();
    stopAutoOpen();
    if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
    }
    updateSlotBackButtonVisibility();
    // Clean up entrance animation
    if (SLOT_GAME_RUNTIME._entranceTimer) {
        clearTimeout(SLOT_GAME_RUNTIME._entranceTimer);
        SLOT_GAME_RUNTIME._entranceTimer = null;
    }
    if (gameContainer) gameContainer.classList.remove('slot-entering');
}

function getSlotGameSnapshot() {
    return {
        initialized: SLOT_GAME_RUNTIME.initialized,
        viewActive: SLOT_GAME_RUNTIME.viewActive,
        isGameOver: STATE.isGameOver,
        isBonusGameActive: STATE.isBonusGameActive || STATE.bonusGamePendingStart,
        isFreeSpinActive: FREE_SPIN_STATE.active || FREE_SPIN_STATE.pendingStart,
        revealedCount: Math.max(0, Math.floor(Number(STATE.revealedCount) || 0)),
        openedBlindBoxesThisRound: Math.max(0, Math.floor(Number(STATE.openedBlindBoxesThisRound) || 0)),
        totalCells: Math.max(0, Math.floor(Number(CONFIG.gridSize) || 0)),
        remainingHidden: Array.isArray(STATE.unrevealedIndices) ? STATE.unrevealedIndices.length : 0,
        roundReward: Math.max(0, Math.floor(Number(STATE.roundReward) || 0)),
        bonusDiamondReward: Math.max(0, Math.floor(Number(STATE.bonusDiamondReward) || 0)),
        stackHeight: Math.max(0, Math.floor(Number(STATE.stackHeight) || 0)),
        satisfaction: Math.max(0, Math.floor(Number(STATE.stackHeight) || 0)),
        satisfactionTarget: getCustomerSatisfactionTarget(),
        currentCustomerPreferenceKey: getCurrentCustomerPreferenceKey(),
        currentMultiplier: Number(STATE.currentMultiplier || CONFIG.baseMultiplier || 1),
        remainingBlindBoxes: Math.max(0, Math.floor(Number(STATE.remainingBlindBoxes) || 0)),
        restockPoolCount: Math.max(0, Math.floor(Number(STATE.restockPoolCount) || 0)),
        queuedBlindBoxes: Math.max(0, Math.floor(Number(STATE.restockPoolCount) || 0)),
        wishSymbolKey: hasSimpleWishSelection() ? STATE.wishSymbolKey : null,
        selectionMode: STATE.selectionMode,
        selectedIndexes: Array.isArray(STATE.selectedIndexes) ? STATE.selectedIndexes.slice() : []
    };
}

// Event Listeners
const slotTutorialCloseBtn = document.getElementById('slot-tutorial-close-btn');
if (slotTutorialCloseBtn) {
    slotTutorialCloseBtn.addEventListener('click', hideSlotTutorial);
}

if (cashoutBtn) {
    cashoutBtn.addEventListener('click', openAllBoxes);
}
bindPrimaryActionButton();
if (modalRestartBtn) {
    modalRestartBtn.addEventListener('click', () => {
        const zooEconomy = typeof getZooEconomy === 'function' ? getZooEconomy() : null;
        const hasTicket = !zooEconomy || typeof zooEconomy.canStartFreshRound !== 'function'
            || zooEconomy.canStartFreshRound();

        if (!hasTicket) {
            clearCompletedRoundRuntime();
            const zooHome = window.ZooHomeModule;
            if (zooHome && typeof zooHome.notify === 'function') {
                zooHome.notify('盲盒券不足，已返回栖息地。', 'warn');
            }
            const appShell = window.WynneZooAppShell;
            if (appShell && typeof appShell.showZooHome === 'function') {
                appShell.showZooHome();
            }
            return;
        }

        const restarted = initGame();
        if (restarted !== false) {
            return;
        }

        clearCompletedRoundRuntime();
        const zooHome = window.ZooHomeModule;
        if (zooHome && typeof zooHome.notify === 'function') {
            zooHome.notify('盲盒券不足，已返回栖息地。', 'warn');
        }
        const appShell = window.WynneZooAppShell;
        if (appShell && typeof appShell.showZooHome === 'function') {
            appShell.showZooHome();
        }
    });
}
if (bonusSpinBtn) {
    bonusSpinBtn.addEventListener('click', runBonusSpin);
}
if (freeSpinStartBtn) {
    freeSpinStartBtn.addEventListener('click', beginPendingFreeSpinGame);
}
if (bonusTriggerStartBtn) {
    bonusTriggerStartBtn.addEventListener('click', () => {
        if (bonusTriggerConfirmPending) return;
        bonusTriggerConfirmPending = true;
        void playBonusTriggerButtonFeedback().then(() => {
            resolveBonusTriggerOverlayStart('confirm');
        }).catch(() => {
            resolveBonusTriggerOverlayStart('confirm');
        });
    });
}

if (freeSpinResultCollectBtn) {
    freeSpinResultCollectBtn.addEventListener('click', finishFreeSpinResult);
}
if (towerViewport) {
    towerViewport.addEventListener('scroll', () => {
        STACK_VIEWPORT_STATE.autoFollow = isNewestStackBlockVisible();
        updateTowerViewportScrollState();
    }, { passive: true });
    window.addEventListener('resize', () => {
        maybeAutoScrollTowerViewport({ force: STACK_VIEWPORT_STATE.autoFollow, smooth: false });
        if (SIMPLE_SLOT_MODE) {
            refreshSimpleModeSelectionUi();
        }
    });
    updateTowerViewportScrollState();
}

const zooEconomy = getZooEconomy();
if (zooEconomy && typeof zooEconomy.subscribe === 'function') {
    zooEconomy.subscribe((snapshot) => {
        updateSlotEconomyHud(snapshot);
    });
} else {
    updateSlotEconomyHud();
}

window.WynneZooSlotGame = {
    initGame,
    ensureInitialized: ensureSlotGameInitialized,
    enterView: enterSlotGameView,
    leaveView: leaveSlotGameView,
    getSnapshot: getSlotGameSnapshot
};

if (window.WynneRegistry) {
    window.WynneRegistry.register('WynneZooSlotGame', window.WynneZooSlotGame);
}
