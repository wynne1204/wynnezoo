// ============================================================
// Slot Game — Grid & Board Management
// Extracted from slot-main.js for maintainability.
// This file MUST be loaded before slot-main.js.
// ============================================================

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
    if (blockData.type === 'monkey') return null;
    if (blockData.type === 'normal') {
        return `normal:${blockData.normalKey || blockData.imageSrc}`;
    }
    return `${blockData.type}:${blockData.imageSrc || blockData.type}`;
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
    for (let i = temp.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [temp[i], temp[j]] = [temp[j], temp[i]];
    }
    for (let i = 0; i < bombCount; i++) {
        STATE.grid[temp[i]] = CELL_BOMB;
    }
    STATE.remainingBombs = bombCount;
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
    return null;
}

function clearGridSettlementClasses() {
    if (!Array.isArray(STATE.gridCells)) return;
    STATE.gridCells.forEach((cell) => {
        if (!cell) return;
        cell.classList.remove('win-cluster', 'win-jackpot');
        cell.style.zIndex = '';
        const highlightTarget = cell.querySelector('.safe-open-box-frame');
        if (highlightTarget) {
            highlightTarget.classList.remove('settle-enlarge-glow');
        }
    });
}

function playSafeOpenFeedback(cell, center, options = {}) {
    if (!cell) return;
    if (options.markSafe !== false) {
        cell.classList.add('revealed');
        cell.classList.add('safe');
    }
    cell.classList.add('safe-pop');
    setTimeout(() => {
        if (cell.isConnected) {
            cell.classList.remove('safe-pop');
        }
    }, 300);
    createSafeShockwave(center.x, center.y);
    createSafeBurstParticles(center.x, center.y);
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