// ============================================================
// Slot Game — Runtime Logic (Core Game Loop)
// Shared slot state, DOM bindings, and extracted modules are
// loaded before this file via index.html.
//
// Module load order:
//   game-config → slot-config → simple-match-core →
//   slot-runtime-state → slot-dom → slot-blueprint →
//   slot-geometry → slot-ui → slot-bomb-wheel →
//   slot-effects → slot-grid → slot-customer →
//   slot-stack → slot-settlement → slot-free-spin →
//   (zoo modules) → slot-main
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


// ============================================================
// Zoo Economy Bridge
// ============================================================

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

// ============================================================
// Auto-Open System
// ============================================================

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


// ============================================================
// Simple Mode Delegate Functions
// ============================================================

function triggerGlobalEffects(type) {
    gameContainer.classList.remove('shake-hard', 'shake-medium', 'shake-soft', 'shake-soft-strong');
    flashOverlay.className = 'flash-overlay';
    void gameContainer.offsetWidth;

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


// ============================================================
// Board Entrance Animation
// ============================================================

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
        const col = Math.floor(Number(entry.primary) || 0);
        const row = Math.floor(Number(entry.secondary) || 0);
        
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


// ============================================================
// Core Game Logic — Cell Click, Reward, Bomb Wheel
// ============================================================

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
    }, 400);
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


// ============================================================
// End Game & Summary
// ============================================================

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

// ============================================================
// View Lifecycle
// ============================================================

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
    replayBoardEntranceOnViewEnter();

    const zooEconomy = typeof getZooEconomy === 'function' ? getZooEconomy() : null;
    if (zooEconomy && typeof zooEconomy.hasSeenSlotTutorial === 'function') {
        if (!zooEconomy.hasSeenSlotTutorial()) {
            showSlotTutorial();
        }
    }

    return true;
}

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

function playSlotEntranceAnimation() {
    if (!gameContainer) return;
    gameContainer.classList.remove('slot-entering');
    void gameContainer.offsetWidth;
    gameContainer.classList.add('slot-entering');

    const cleanupTimer = setTimeout(() => {
        if (gameContainer) gameContainer.classList.remove('slot-entering');
    }, 1800);

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

// ============================================================
// Event Listeners & Module Registration
// ============================================================

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
