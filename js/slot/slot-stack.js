// ============================================================
// Slot Game — Stack / Tower System
// Extracted from slot-main.js for maintainability.
// This file MUST be loaded before slot-main.js.
// ============================================================

function grantStackBlocks(count) {
    const safeCount = Math.max(0, Math.floor(Number(count) || 0));
    if (safeCount <= 0) return 0;
    const blockList = Array.from({ length: safeCount }, () => ({ type: 'satisfaction', imageSrc: '', normalKey: null }));
    addBlocksToStack(blockList);
    return safeCount;
}

function grantBonusSymbolBlock() {
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