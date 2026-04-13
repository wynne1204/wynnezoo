// ============================================================
// Slot Game — UI Refresh Helpers
// Loaded before slot-main.js via index.html.
// ============================================================

function formatSlotHudValue(value) {
    return formatResourceNumber(value);
}

function updateSlotEconomyHud(snapshot = null) {
    const zooEconomy = getZooEconomy();
    const activeSnapshot = snapshot && snapshot.resources
        ? snapshot
        : (zooEconomy && typeof zooEconomy.getSnapshot === 'function'
            ? zooEconomy.getSnapshot()
            : null);
    const resources = activeSnapshot && activeSnapshot.resources ? activeSnapshot.resources : null;

    if (slotResourceCoinDisplay) {
        slotResourceCoinDisplay.textContent = formatSlotHudValue(resources ? resources.coin : 0);
    }
    if (slotResourceDiamondDisplay) {
        slotResourceDiamondDisplay.textContent = formatSlotHudValue(resources ? resources.diamond : 0);
    }
    if (slotResourceTicketDisplay) {
        slotResourceTicketDisplay.textContent = formatSlotHudValue(resources ? resources.playTicket : 0);
    }
}

function applyModeTexts() {
    if (SIMPLE_SLOT_MODE) {
        if (statusLabels[0]) {
            statusLabels[0].textContent = '对碰规则';
        }
        if (statusLabels[1]) {
            statusLabels[1].textContent = '剩余盲盒';
        }
        if (cashoutBtn) {
            cashoutBtn.textContent = '全部开箱';
        }
        if (randomBtn) {
            randomBtn.textContent = '盲开一箱';
        }
        return;
    }
    if (statusLabels[0]) {
        statusLabels[0].textContent = 'Match Threshold';
    }
    if (statusLabels[1]) {
        statusLabels[1].textContent = 'Current Reward';
    }
    if (cashoutBtn) {
        cashoutBtn.textContent = 'Open All';
    }
    if (randomBtn) {
        randomBtn.textContent = '盲开一箱';
    }
}

function updatePrimaryActionButtonState() {
    if (!randomBtn) return;
    randomBtn.classList.toggle('is-auto-running', AUTO_OPEN_STATE.active);
    randomBtn.setAttribute('aria-pressed', AUTO_OPEN_STATE.active ? 'true' : 'false');
    if (SIMPLE_SLOT_MODE) {
        randomBtn.textContent = AUTO_OPEN_STATE.active ? '连开中…' : '盲开一箱';
        return;
    }
    randomBtn.textContent = AUTO_OPEN_STATE.active ? '自动开箱…' : '随机翻开';
}

function renderCurrentCustomer() {
    const currentCustomer = STATE.currentCustomer;
    if (!currentCustomer) return;

    if (customerPortraitDisplay) {
        customerPortraitDisplay.src = currentCustomer.portraitSrc;
        customerPortraitDisplay.alt = currentCustomer.portraitAlt || '顾客立绘';
    }

    if (customerPreferenceBlockDisplay) {
        if (SIMPLE_SLOT_MODE) {
            renderSimpleModeWishSymbol();
            return;
        }
        const symbolId = getCustomerPreferenceSymbolId(currentCustomer.preferenceKey);
        customerPreferenceBlockDisplay.src = getNormalSymbolImage(symbolId);
        customerPreferenceBlockDisplay.alt = `当前顾客喜欢的积木 ${symbolId}`;
    }
}

function updateBombDisplay() {
    if (bombCountDisplay) {
        if (SIMPLE_SLOT_MODE) {
            bombCountDisplay.textContent = '许愿+1 / 对碰+1 / 三连+2 / 全家福+2';
            return;
        }
        bombCountDisplay.textContent = `${CONFIG.clusterPayout.minClusterSize}+`;
    }
}

function ensureStackProgressBar() {
    const steps = getCustomerSatisfactionTarget();
    document.documentElement.style.setProperty('--stack-progress-steps', String(steps));

    if (!multiplierFill || !stackProgressRuler) {
        stackProgressCells = [];
        return;
    }
    if (stackProgressCells.length === steps
        && multiplierFill.childElementCount === steps
        && stackProgressRuler.childElementCount === steps) {
        return;
    }

    multiplierFill.innerHTML = '';
    stackProgressRuler.innerHTML = '';
    stackProgressCells = [];

    for (let value = steps; value >= 1; value--) {
        const cell = document.createElement('div');
        cell.className = 'stack-progress-cell';
        cell.dataset.progressValue = String(value);
        multiplierFill.appendChild(cell);
        stackProgressCells.push(cell);

        const tick = document.createElement('div');
        const isMajor = (value === steps) || (value === 1) || (value % 5 === 0);
        tick.className = isMajor ? 'stack-progress-ruler-step major' : 'stack-progress-ruler-step';

        if (isMajor) {
            const label = document.createElement('span');
            label.className = 'stack-progress-ruler-label';
            label.textContent = String(value);
            tick.appendChild(label);
        }

        stackProgressRuler.appendChild(tick);
    }
}

function updateStackProgressBar() {
    if (SIMPLE_SLOT_MODE) {
        updateSimpleBlindBoxCounterUi();
        if (multiplierBubble) {
            multiplierBubble.textContent = `盲盒 ${Math.max(0, Math.floor(Number(STATE.remainingBlindBoxes) || 0))}`;
        }
        if (customerHeartRows.length > 0) {
            customerHeartRows.forEach((row) => row.classList.remove('active'));
        }
        lastRenderedSatisfactionValue = 0;
        return;
    }
    ensureStackProgressBar();

    const steps = getCustomerSatisfactionTarget();
    const current = Math.max(0, Math.floor(Number(STATE.stackHeight) || 0));
    const clamped = Math.min(current, steps);

    stackProgressCells.forEach((cell) => {
        const cellValue = Math.floor(Number(cell.dataset.progressValue) || 0);
        cell.classList.toggle('active', clamped >= cellValue);
    });

    if (multiplierBubble) {
        multiplierBubble.textContent = `${clamped}/${steps}`;
    }

    if (customerHeartRows.length > 0) {
        customerHeartRows.forEach((row, index) => {
            row.classList.toggle('active', (customerHeartRows.length - index) <= clamped);
        });
        if (clamped > lastRenderedSatisfactionValue) {
            pulseCustomerHeartRange(lastRenderedSatisfactionValue + 1, clamped);
        }
        lastRenderedSatisfactionValue = clamped;
    }
}

function getSimpleModeRestockDisplayCount() {
    return Math.max(0, Math.floor(Number(STATE.restockPoolCount) || 0));
}

function getSimpleModeOpenedBlindBoxesCount() {
    return Math.max(0, Math.floor(Number(STATE.openedBlindBoxesThisRound) || 0));
}

function updateStats() {
    if (SIMPLE_SLOT_MODE) {
        updateStackProgressBar();
        const restockDisplayCount = getSimpleModeRestockDisplayCount();
        const openedBlindBoxesCount = getSimpleModeOpenedBlindBoxesCount();
        if (multiOpenCountDisplay) {
            multiOpenCountDisplay.textContent = `${openedBlindBoxesCount}个`;
        }
        if (currentRewardDisplay) {
            currentRewardDisplay.textContent = String(restockDisplayCount);
        }
        return;
    }
    const currentReward = calculateCurrentReward();
    updateStackProgressBar();
    if (currentRewardDisplay) {
        currentRewardDisplay.textContent = currentReward;
    }
}

function updateSlotBackButtonVisibility() {
    if (!slotBackBtn) return;
    const wishOverlay = SIMPLE_MATCH_CORE && typeof SIMPLE_MATCH_CORE.getWishOverlayElement === 'function'
        ? SIMPLE_MATCH_CORE.getWishOverlayElement()
        : null;

    const hasBlockingOverlay = Boolean(
        (modalOverlay && !modalOverlay.classList.contains('hidden'))
        || (wishOverlay && !wishOverlay.classList.contains('hidden'))
        || (freeSpinTriggerOverlay && !freeSpinTriggerOverlay.classList.contains('hidden'))
        || (freeSpinResultOverlay && !freeSpinResultOverlay.classList.contains('hidden'))
        || (bonusTriggerOverlay && !bonusTriggerOverlay.classList.contains('hidden'))
        || (bonusResultOverlay && !bonusResultOverlay.classList.contains('hidden'))
    );

    const isBaseGameVisible = Boolean(
        SLOT_GAME_RUNTIME.viewActive
        && !STATE.isBonusGameActive
        && !STATE.bonusGamePendingStart
        && !FREE_SPIN_STATE.active
        && !FREE_SPIN_STATE.pendingStart
        && !FREE_SPIN_STATE.isTransitioning
        && !hasBlockingOverlay
    );

    slotBackBtn.classList.toggle('hidden', !isBaseGameVisible);
}
