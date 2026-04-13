// ============================================================
// Slot Game — Free Spin System
// Extracted from slot-main.js for maintainability.
// This file MUST be loaded before slot-main.js.
// ============================================================

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
    
    showFreeSpinResultOverlay();
    updateSlotBackButtonVisibility();
}

function finishFreeSpinResult() {
    if (freeSpinResultOverlay && freeSpinResultOverlay.classList.contains('hidden')) return;
    
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
    
    if (freeSpinResultReward) {
        freeSpinResultReward.textContent = '0';
        animateNumberRoll(freeSpinResultReward, 0, Math.floor(FREE_SPIN_STATE.totalReward), 1500);
    }

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
    const particleCount = 35;
    
    const emojiCanvases = {};
    emojis.forEach(emoji => {
        const offCanvas = document.createElement('canvas');
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
            y: -20 - Math.random() * 100,
            size: Math.random() * 20 + 15,
            speedY: Math.random() * 5 + 4,
            speedX: (Math.random() - 0.5) * 3,
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.15,
            emoji: emojis[Math.floor(Math.random() * emojis.length)]
        });
    }
    
    let lastTime = 0;

    function animate(currentTime) {
        if (!lastTime) lastTime = currentTime;
        const deltaTime = Math.min((currentTime - lastTime) / 16.66, 3);
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
            
            const renderCanvas = emojiCanvases[p.emoji];
            if (renderCanvas) {
                const scale = p.size / 40;
                ctx.scale(scale, scale);
                ctx.drawImage(renderCanvas, -30, -30);
            }
            
            ctx.restore();
            
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
