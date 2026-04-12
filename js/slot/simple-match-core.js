(function initSimpleMatchCore(globalScope) {
    'use strict';

    function createSimpleMatchCore(deps) {
        const config = deps && deps.config ? deps.config : {};
        const state = deps && deps.state ? deps.state : {};
        const helpers = deps && deps.helpers ? deps.helpers : {};
        const elements = deps && deps.elements ? deps.elements : {};
        const simpleSlotMode = Boolean(deps && deps.simpleSlotMode);

        const symbolKeys = Array.isArray(config.normalSymbolKeys) && config.normalSymbolKeys.length > 0
            ? config.normalSymbolKeys.slice()
            : ['S1'];
        const tripleLines = [
            [0, 1, 2],
            [3, 4, 5],
            [6, 7, 8],
            [0, 3, 6],
            [1, 4, 7],
            [2, 5, 8],
            [0, 4, 8],
            [2, 4, 6]
        ];
        const SIMPLE_RESTOCK_FLIGHT_MS = 240;
        const SIMPLE_RESTOCK_STAGGER_MS = 70;

        let slotWishOverlay = elements.slotWishOverlay || null;
        let slotWishOptions = elements.slotWishOptions || null;
        let celebrationTimerId = 0;
        let rewardPulseTimerId = 0;
        let isRestockSequenceActive = false;

        function getSimpleModeSymbolLabel(symbolKey) {
            const safeKey = String(symbolKey || '').trim();
            return safeKey || '未选择';
        }

        function getSimpleModeRewardCopy(type) {
            if (type === 'full-set') {
                return `全家福 +${Math.max(0, Math.floor(Number(config.fullSetRewardBlindBoxes) || 0))} 盲盒`;
            }
            if (type === 'triple') {
                return `三连 +${Math.max(0, Math.floor(Number(config.tripleRewardBlindBoxes) || 0))} 盲盒`;
            }
            if (type === 'pair') {
                return `对碰 +${Math.max(0, Math.floor(Number(config.pairRewardBlindBoxes) || 0))} 盲盒`;
            }
            return `命中许愿 +${Math.max(0, Math.floor(Number(config.wishRewardBlindBoxes) || 0))} 盲盒`;
        }

        function pulseSimpleModeRewardSurfaces() {
            if (!simpleSlotMode) return;
            if (rewardPulseTimerId) {
                clearTimeout(rewardPulseTimerId);
            }
            if (elements.customerSatisfaction) {
                elements.customerSatisfaction.classList.remove('reward-pop');
                void elements.customerSatisfaction.offsetWidth;
                elements.customerSatisfaction.classList.add('reward-pop');
            }
            if (elements.restockTray) {
                elements.restockTray.classList.remove('reward-pop');
                void elements.restockTray.offsetWidth;
                elements.restockTray.classList.add('reward-pop');
            }
            rewardPulseTimerId = setTimeout(() => {
                if (elements.customerSatisfaction) {
                    elements.customerSatisfaction.classList.remove('reward-pop');
                }
                if (elements.restockTray) {
                    elements.restockTray.classList.remove('reward-pop');
                }
                rewardPulseTimerId = 0;
            }, 560);
        }

        function clearSimpleMatchCelebration() {
            if (celebrationTimerId) {
                clearTimeout(celebrationTimerId);
                celebrationTimerId = 0;
            }
        }

        function showSimpleMatchCelebration(match) {
            return;
        }

        function ensureSimpleBlindBoxCounterElements() {
            if (!simpleSlotMode || !elements.customerSatisfaction) return null;
            if (document.getElementById('blindbox-meter-value')) {
                return null;
            }
            let counter = elements.customerSatisfaction.querySelector('.simple-blindbox-counter');
            if (!counter) {
                counter = document.createElement('div');
                counter.className = 'simple-blindbox-counter';

                const value = document.createElement('strong');
                value.className = 'simple-blindbox-counter-value';
                value.textContent = '0';

                const label = document.createElement('span');
                label.className = 'simple-blindbox-counter-label';
                label.textContent = '盲盒';

                counter.appendChild(value);
                counter.appendChild(label);
                elements.customerSatisfaction.appendChild(counter);
            }
            return counter;
        }

        function updateSimpleBlindBoxCounterUi() {
            if (!simpleSlotMode) return;
            const meterValue = document.getElementById('blindbox-meter-value');
            if (meterValue) {
                meterValue.textContent = String(Math.max(0, Math.floor(Number(state.remainingBlindBoxes) || 0)));
            }
            const counter = ensureSimpleBlindBoxCounterElements();
            if (!counter) return;
            const value = counter.querySelector('.simple-blindbox-counter-value');
            if (value) {
                value.textContent = String(Math.max(0, Math.floor(Number(state.remainingBlindBoxes) || 0)));
            }
        }

        function bindWishOverlay(overlay) {
            if (!overlay || overlay.dataset.bound === '1') {
                return;
            }
            overlay.dataset.bound = '1';
            overlay.addEventListener('click', (event) => {
                const target = event.target;
                if (!(target instanceof Element)) return;
                const option = target.closest('.slot-wish-option');
                if (!option || !overlay.contains(option)) return;
                const symbolKey = String(option.dataset.symbolKey || '');
                if (!symbolKeys.includes(symbolKey)) return;
                state.wishSymbolKey = symbolKey;
                if (typeof helpers.renderCurrentCustomer === 'function') {
                    helpers.renderCurrentCustomer();
                }
                hideSimpleWishOverlay();
                refreshSimpleModeUi();
            });
        }

        function ensureSimpleWishOverlay() {
            if (!simpleSlotMode || !elements.gameContainer) return null;
            if (slotWishOverlay && slotWishOverlay.isConnected) {
                slotWishOptions = slotWishOverlay.querySelector('#slot-wish-options');
                bindWishOverlay(slotWishOverlay);
                return slotWishOverlay;
            }

            slotWishOverlay = document.createElement('div');
            slotWishOverlay.id = 'slot-wish-overlay';
            slotWishOverlay.className = 'slot-wish-overlay hidden';
            slotWishOverlay.innerHTML = `
                <div class="slot-wish-card" role="dialog" aria-modal="true" aria-labelledby="slot-wish-title">
                    <div class="slot-wish-badge">WISH PICK</div>
                    <h2 id="slot-wish-title" class="slot-wish-title">选择本局许愿积木</h2>
                    <p id="slot-wish-subtitle" class="slot-wish-subtitle">翻到许愿积木立即 +1 盲盒</p>
                    <div id="slot-wish-options" class="slot-wish-options"></div>
                </div>
            `;
            elements.gameContainer.appendChild(slotWishOverlay);
            slotWishOptions = slotWishOverlay.querySelector('#slot-wish-options');
            if (slotWishOptions) {
                slotWishOptions.innerHTML = '';
                symbolKeys.forEach((symbolKey) => {
                    const button = document.createElement('button');
                    button.type = 'button';
                    button.className = 'slot-wish-option';
                    button.dataset.symbolKey = symbolKey;
                    button.innerHTML = `
                        <img src="${helpers.getNormalSymbolImage(symbolKey)}" alt="${symbolKey}">
                        <span>${symbolKey}</span>
                    `;
                    slotWishOptions.appendChild(button);
                });
            }
            bindWishOverlay(slotWishOverlay);
            return slotWishOverlay;
        }

        function hideSimpleWishOverlay() {
            if (!slotWishOverlay) return;
            slotWishOverlay.classList.add('hidden');
            if (typeof helpers.updateSlotBackButtonVisibility === 'function') {
                helpers.updateSlotBackButtonVisibility();
            }
        }

        function showSimpleWishOverlay() {
            const overlay = ensureSimpleWishOverlay();
            if (!overlay) return;
            if (typeof helpers.stopAutoOpen === 'function') {
                helpers.stopAutoOpen();
            }
            overlay.classList.remove('hidden');
            if (elements.cashoutBtn) elements.cashoutBtn.disabled = true;
            if (elements.randomBtn) elements.randomBtn.disabled = true;
            if (typeof helpers.updateSlotBackButtonVisibility === 'function') {
                helpers.updateSlotBackButtonVisibility();
            }
        }

        function hasSimpleWishSelection() {
            return !simpleSlotMode || symbolKeys.includes(String(state.wishSymbolKey || ''));
        }

        function resetSimpleModeState(size) {
            const safeSize = Math.max(1, Math.floor(Number(size) || config.gridSize || 1));
            clearSimpleMatchCelebration();
            state.wishSymbolKey = '';
            state.remainingBlindBoxes = Math.max(0, Math.floor(Number(config.initialBlindBoxCount) || safeSize));
            state.restockPoolCount = 0;
            state.queuedBlindBoxes = 0;
            state.selectedIndexes = [];
            state.selectionMode = 'none';
            state.pendingPlacementIndexes = [];
        }

        function pickSimpleModeSymbolKey() {
            return helpers.pickRandomItem(symbolKeys) || symbolKeys[0] || 'S1';
        }

        function createSimpleModeBlockData() {
            return helpers.createNormalBlockData(pickSimpleModeSymbolKey());
        }

        function applyGridCellLayoutVars(cell, index, size) {
            if (!cell) return;
            const safeSize = Math.max(1, Math.floor(Number(size) || config.gridSize || 1));
            const side = Math.max(1, Math.round(Math.sqrt(safeSize)));
            const col = index % side;
            const row = Math.floor(index / side);
            const center = (side - 1) / 2;
            const overlapFactorX = center - col;
            const overlapFactorY = center - row;
            cell.style.setProperty('--grid-cell-overlap-x-offset', `calc(var(--grid-cell-overlap-x, 0px) * ${overlapFactorX})`);
            cell.style.setProperty('--grid-cell-overlap-y-offset', `calc(var(--grid-cell-overlap-y, 0px) * ${overlapFactorY})`);
        }

        function getSimpleModeEmptyIndexes() {
            const indexes = [];
            for (let index = 0; index < state.boardCellStates.length; index++) {
                if (state.boardCellStates[index] === 'empty') {
                    indexes.push(index);
                }
            }
            return indexes;
        }

        function syncSimpleModeStockState() {
            state.queuedBlindBoxes = Math.max(0, Math.floor(Number(state.restockPoolCount) || 0));
        }

        function updateSimpleModePlacementState() {
            const emptyIndexes = getSimpleModeEmptyIndexes();
            state.pendingPlacementIndexes = emptyIndexes.slice();
            syncSimpleModeStockState();
            return emptyIndexes;
        }

        function getSimpleModeAutoFillTargets() {
            return updateSimpleModePlacementState().slice();
        }

        function getVisibleRestockTrayBoxes() {
            if (!elements.restockTrayBoxes) return [];
            return Array.from(elements.restockTrayBoxes.querySelectorAll('.restock-tray-box'))
                .filter((button) => !button.classList.contains('is-hidden'))
                .sort((a, b) => Number(a.dataset.stockIndex || 0) - Number(b.dataset.stockIndex || 0));
        }

        function addUnrevealedIndex(index) {
            const safeIndex = Math.floor(Number(index));
            if (!Number.isFinite(safeIndex) || safeIndex < 0) return;
            if (safeIndex >= state.unrevealedPosByIndex.length) return;
            if (state.unrevealedPosByIndex[safeIndex] >= 0) return;
            const nextPos = state.unrevealedIndices.length;
            state.unrevealedIndices.push(safeIndex);
            state.unrevealedPosByIndex[safeIndex] = nextPos;
        }

        function markCellAsUnrevealed(index) {
            const safeIndex = Math.floor(Number(index));
            if (!Number.isFinite(safeIndex) || safeIndex < 0) return;
            if (!state.revealed[safeIndex]) return;
            state.revealed[safeIndex] = 0;
            state.revealedCount = Math.max(0, state.revealedCount - 1);
            addUnrevealedIndex(safeIndex);
        }

        function clearSafeOpenBoxImage(cell) {
            if (!cell) return;
            const img = cell.querySelector('.safe-open-box-frame');
            if (img) {
                img.remove();
            }
        }

        function setSimpleModeCellSealed(index) {
            const cell = helpers.getGridCellElement(index);
            if (!cell) return;
            helpers.resetGridCellElement(cell, index);
            state.cellBlocks[index] = null;
            state.boardCellStates[index] = 'sealed';
            state.boardResolvedFlags[index] = 0;
            markCellAsUnrevealed(index);
        }

        function setSimpleModeCellEmpty(index) {
            const cell = helpers.getGridCellElement(index);
            if (!cell) return;
            helpers.resetGridCellElement(cell, index);
            cell.classList.add('revealed', 'empty-slot');
            clearSafeOpenBoxImage(cell);
            helpers.clearStickyWildRoundBadge(cell);
            helpers.clearBombAnimImage(cell);
            state.cellBlocks[index] = null;
            state.boardCellStates[index] = 'empty';
            state.boardResolvedFlags[index] = 1;
            let plusButton = cell.querySelector('.cell-plus');
            if (!plusButton) {
                plusButton = document.createElement('button');
                plusButton.type = 'button';
                plusButton.className = 'cell-plus';
                plusButton.textContent = '+';
                cell.appendChild(plusButton);
            }
            plusButton.dataset.index = String(index);
            helpers.positionSimpleModeCellPlusButton(cell, plusButton);
        }

        function renderSimpleModeRevealedCell(index, blockData) {
            const cell = helpers.getGridCellElement(index);
            if (!cell) return;
            cell.classList.add('revealed', 'safe');
            cell.classList.remove('empty-slot');
            const rewardImg = helpers.ensureSafeOpenBoxImage(cell, blockData.imageSrc, 'stack block');
            if (rewardImg) {
                rewardImg.classList.remove('bonus-reward-glow', 'sticky-wild-reward-glow');
            }
        }

        function clearSimpleModeSelectionState() {
            state.selectedIndexes = [];
            state.selectionMode = 'none';
        }

        function getSimpleModeRevealedIndexes() {
            const indexes = [];
            for (let index = 0; index < state.boardCellStates.length; index++) {
                if (state.boardCellStates[index] === 'revealed') {
                    indexes.push(index);
                }
            }
            return indexes;
        }

        function getSimpleModeCellSymbolKey(index) {
            if (!simpleSlotMode) return '';
            if (state.boardCellStates[index] !== 'revealed') return '';
            const blockData = state.cellBlocks[index];
            if (!blockData || blockData.type !== 'normal') return '';
            return String(blockData.normalKey || '');
        }

        function getSimpleModeSameSymbolIndexes(symbolKey) {
            const safeSymbolKey = String(symbolKey || '');
            if (!safeSymbolKey) return [];
            const indexes = [];
            for (let index = 0; index < state.boardCellStates.length; index++) {
                if (getSimpleModeCellSymbolKey(index) === safeSymbolKey) {
                    indexes.push(index);
                }
            }
            return indexes;
        }

        function hasSimpleModeTripleOpportunity(symbolKey) {
            const sameSymbolIndexes = getSimpleModeSameSymbolIndexes(symbolKey);
            if (sameSymbolIndexes.length < 3) return false;
            const indexSet = new Set(sameSymbolIndexes);
            return tripleLines.some((line) => line.every((lineIndex) => indexSet.has(lineIndex)));
        }

        function getSimpleModeTargetSelectionCount(symbolKey) {
            const sameSymbolIndexes = getSimpleModeSameSymbolIndexes(symbolKey);
            if (sameSymbolIndexes.length < 2) return 0;
            if (sameSymbolIndexes.length === 2) return 2;
            if (!hasSimpleModeTripleOpportunity(symbolKey)) {
                return 2;
            }
            return Math.min(sameSymbolIndexes.length, Math.max(3, Math.floor(Number(config.maxSelectableSameSymbolCount) || 3)));
        }

        function isSimpleModeTripleLine(indexes) {
            if (!Array.isArray(indexes) || indexes.length !== 3) return false;
            const indexSet = new Set(indexes.map((value) => Math.floor(Number(value))));
            if (indexSet.size !== 3) return false;
            return tripleLines.some((line) => line.every((lineIndex) => indexSet.has(lineIndex)));
        }

        function isSimpleModeFullSetAvailable() {
            if (!simpleSlotMode || state.boardCellStates.length !== 9) return false;
            const revealedIndexes = getSimpleModeRevealedIndexes();
            if (revealedIndexes.length !== 9) return false;
            const symbolKeysInBoard = revealedIndexes.map((index) => getSimpleModeCellSymbolKey(index));
            if (symbolKeysInBoard.some((symbolKey) => !symbolKey)) return false;
            return new Set(symbolKeysInBoard).size === 9;
        }

        function getSimpleModeSelectableIndexes() {
            if (!simpleSlotMode) return [];
            const selectedSet = new Set(state.selectedIndexes);
            if (state.selectionMode === 'full-set') {
                return getSimpleModeRevealedIndexes().filter((index) => !selectedSet.has(index));
            }
            if (state.selectionMode === 'same-symbol' && state.selectedIndexes.length > 0) {
                const symbolKey = getSimpleModeCellSymbolKey(state.selectedIndexes[0]);
                return getSimpleModeSameSymbolIndexes(symbolKey).filter((index) => !selectedSet.has(index));
            }
            return [];
        }

        function getSimpleModeSelectionHintText() {
            if (!simpleSlotMode) return '';
            if (!hasSimpleWishSelection()) {
                return '先选择本局许愿积木';
            }
            if (state.selectionMode === 'full-set') {
                const remaining = Math.max(0, 9 - state.selectedIndexes.length);
                return remaining > 0 ? `全家福进行中，再选 ${remaining} 个不同积木` : '全家福已满足';
            }
            if (state.selectionMode === 'same-symbol' && state.selectedIndexes.length > 0) {
                const symbolKey = getSimpleModeCellSymbolKey(state.selectedIndexes[0]);
                const targetCount = getSimpleModeTargetSelectionCount(symbolKey);
                if (targetCount <= 0) {
                    return '当前没有可配对的同色积木';
                }
                if (targetCount === 2) {
                    const remaining = Math.max(0, 2 - state.selectedIndexes.length);
                    return remaining > 0 ? `再选 ${remaining} 个同色可对碰` : '已满足对碰';
                }
                if (state.selectedIndexes.length >= 3 && !isSimpleModeTripleLine(state.selectedIndexes)) {
                    return '三连需要横线、竖线或斜线';
                }
                const remaining = Math.max(0, 3 - state.selectedIndexes.length);
                return remaining > 0 ? `再选 ${remaining} 个同色尝试三连` : '已满足三连';
            }
            if (isSimpleModeFullSetAvailable()) {
                return '全家福可选，点任意积木开始';
            }
            return '点击已翻开的积木进行对碰';
        }

        function updateSimpleModeStatusPanel() {
            if (!simpleSlotMode) return;
            const revealedCount = getSimpleModeRevealedIndexes().length;
            let stageText = '翻盲盒中';
            let rewardText = getSimpleModeRewardCopy('wish');
            let targetText = hasSimpleWishSelection()
                ? `许愿 ${getSimpleModeSymbolLabel(state.wishSymbolKey)}`
                : '请选择许愿积木';
            let progressText = `${revealedCount} 已翻开`;

            if (!hasSimpleWishSelection()) {
                stageText = '等待许愿';
                rewardText = getSimpleModeRewardCopy('wish');
                progressText = '0 / 1';
            } else if (state.selectionMode === 'full-set') {
                stageText = '全家福机会';
                rewardText = getSimpleModeRewardCopy('full-set');
                targetText = '集齐 9 种不同积木';
                progressText = `${state.selectedIndexes.length} / 9`;
            } else if (state.selectionMode === 'same-symbol' && state.selectedIndexes.length > 0) {
                const activeSymbolKey = getSimpleModeCellSymbolKey(state.selectedIndexes[0]);
                const targetCount = Math.max(2, getSimpleModeTargetSelectionCount(activeSymbolKey) || 0);
                stageText = targetCount >= 3 ? '冲刺三连' : '准备对碰';
                rewardText = getSimpleModeRewardCopy(targetCount >= 3 ? 'triple' : 'pair');
                targetText = `${getSimpleModeSymbolLabel(activeSymbolKey)} x ${targetCount}`;
                progressText = `${state.selectedIndexes.length} / ${targetCount}`;
            } else if (isSimpleModeFullSetAvailable()) {
                stageText = '全家福机会';
                rewardText = getSimpleModeRewardCopy('full-set');
                targetText = '9 种都在场';
                progressText = `${revealedCount} / 9`;
            }

            if (elements.simpleMatchStageTag) {
                elements.simpleMatchStageTag.textContent = stageText;
            }
            if (elements.simpleMatchRewardTag) {
                elements.simpleMatchRewardTag.textContent = rewardText;
            }
            if (elements.simpleMatchTargetChip) {
                elements.simpleMatchTargetChip.textContent = targetText;
            }
            if (elements.simpleMatchProgressChip) {
                elements.simpleMatchProgressChip.textContent = progressText;
            }
            if (elements.simpleMatchStockChip) {
                elements.simpleMatchStockChip.textContent = String(Math.max(0, Math.floor(Number(state.restockPoolCount) || 0)));
            }
        }

        function renderSimpleModeRestockTray() {
            if (!simpleSlotMode || !elements.restockTrayBoxes) return;
            const emptyIndexes = updateSimpleModePlacementState();
            const restockCount = Math.max(0, Math.floor(Number(state.restockPoolCount) || 0));
            const canFill = emptyIndexes.length > 0 && restockCount > 0 && !isRestockSequenceActive;
            const stableRows = Math.max(1, Math.ceil(restockCount / 5));
            const fragment = document.createDocumentFragment();
            elements.restockTrayBoxes.style.setProperty('--restock-tray-rows', String(stableRows));
            for (let index = 0; index < restockCount; index++) {
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'restock-tray-box';
                button.dataset.stockIndex = String(index);
                button.style.setProperty('--stock-col', String(index % 5));
                button.style.setProperty('--stock-row', String(Math.floor(index / 5)));
                button.style.zIndex = String(index + 1);
                button.disabled = !canFill;
                button.classList.toggle('disabled', !canFill);
                button.classList.toggle('is-restock-locked', isRestockSequenceActive);
                button.setAttribute('aria-hidden', 'false');
                button.setAttribute('tabindex', canFill ? '0' : '-1');
                button.setAttribute('aria-label', canFill ? '点击补齐所有盲盒' : '当前没有可补的空格');
                fragment.appendChild(button);
            }
            elements.restockTrayBoxes.replaceChildren(fragment);
            if (elements.restockTray) {
                elements.restockTray.classList.toggle('disabled', !canFill);
                elements.restockTray.classList.toggle('ready-to-fill', canFill);
                elements.restockTray.classList.toggle('is-restock-sequence', isRestockSequenceActive);
                elements.restockTray.setAttribute('aria-disabled', canFill ? 'false' : 'true');
            }
        }

        function refreshSimpleModeSelectionUi() {
            if (!simpleSlotMode) return;
            const selectedSet = new Set(state.selectedIndexes);
            const selectableSet = new Set(getSimpleModeSelectableIndexes());
            const isFullSetMode = state.selectionMode === 'full-set';
            state.gridCells.forEach((cell, index) => {
                if (!cell) return;
                cell.classList.remove('selected', 'selectable', 'full-set', 'disabled');
                if (state.boardCellStates[index] === 'empty') {
                    const plusButton = cell.querySelector('.cell-plus');
                    if (plusButton) {
                        helpers.positionSimpleModeCellPlusButton(cell, plusButton);
                        const canPlace = state.restockPoolCount > 0 && !isRestockSequenceActive;
                        plusButton.classList.toggle('disabled', !canPlace);
                        plusButton.classList.toggle('is-ready', canPlace);
                        plusButton.disabled = !canPlace;
                        plusButton.setAttribute('aria-label', canPlace ? '补齐全部盲盒' : '暂无盲盒可补');
                    }
                    return;
                }
                if (state.boardCellStates[index] !== 'revealed') {
                    return;
                }
                if (isFullSetMode) {
                    cell.classList.add('full-set');
                }
                if (selectedSet.has(index)) {
                    cell.classList.add('selected');
                } else if (selectableSet.has(index)) {
                    cell.classList.add('selectable');
                } else if (state.selectionMode !== 'none') {
                    cell.classList.add('disabled');
                }
            });
            if (elements.gridSelectionHint) {
                elements.gridSelectionHint.textContent = getSimpleModeSelectionHintText();
            }
        }

        function updateSimpleModeActionButtons() {
            if (!simpleSlotMode) return;
            const canReveal = hasSimpleWishSelection()
                && !state.isGameOver
                && !state.isBoardEntering
                && !state.isAnimating
                && !state.isSettling
                && !state.isBonusGameActive
                && !state.bonusGamePendingStart
                && state.pendingOpens <= 0
                && state.selectionMode === 'none'
                && state.selectedIndexes.length <= 0
                && state.unrevealedIndices.length > 0;
            if (elements.cashoutBtn) {
                elements.cashoutBtn.disabled = !canReveal;
            }
            if (elements.randomBtn) {
                elements.randomBtn.disabled = !canReveal;
            }
        }

        function refreshSimpleModeUi() {
            if (!simpleSlotMode) return;
            renderSimpleModeRestockTray();
            refreshSimpleModeSelectionUi();
            updateSimpleModeActionButtons();
            if (typeof helpers.updateStats === 'function') {
                helpers.updateStats();
            }
        }

        function hasAnySimpleModeResolvableAction() {
            if (!simpleSlotMode) return false;
            if (isSimpleModeFullSetAvailable()) {
                return true;
            }
            const groups = new Map();
            for (let index = 0; index < state.boardCellStates.length; index++) {
                const symbolKey = getSimpleModeCellSymbolKey(index);
                if (!symbolKey) continue;
                if (!groups.has(symbolKey)) {
                    groups.set(symbolKey, []);
                }
                groups.get(symbolKey).push(index);
            }
            for (const indexes of groups.values()) {
                if (indexes.length >= 2) {
                    return true;
                }
            }
            return false;
        }

        function rewardSimpleModeBlindBoxes(count) {
            const safeCount = Math.max(0, Math.floor(Number(count) || 0));
            if (safeCount <= 0) return 0;
            state.remainingBlindBoxes += safeCount;
            state.roundReward += safeCount;
            state.restockPoolCount += safeCount;
            syncSimpleModeStockState();
            pulseSimpleModeRewardSurfaces();
            refreshSimpleModeUi();
            return safeCount;
        }

        function renderSimpleModeWishSymbol() {
            if (!simpleSlotMode || !elements.customerPreferenceBlockDisplay) return;
            const symbolKey = hasSimpleWishSelection() ? state.wishSymbolKey : (symbolKeys[0] || 'S1');
            elements.customerPreferenceBlockDisplay.src = helpers.getNormalSymbolImage(symbolKey);
            elements.customerPreferenceBlockDisplay.alt = `本局许愿积木 ${symbolKey}`;
        }

        function canPlaceSimpleModeBlindBoxAt(index) {
            const safeIndex = Math.floor(Number(index));
            if (!Number.isFinite(safeIndex) || safeIndex < 0) return false;
            if (state.restockPoolCount <= 0) return false;
            return state.boardCellStates[safeIndex] === 'empty';
        }

        function placeSimpleModeBlindBoxAt(index) {
            if (!simpleSlotMode || !canPlaceSimpleModeBlindBoxAt(index)) return false;
            setSimpleModeCellSealed(index);
            state.restockPoolCount = Math.max(0, state.restockPoolCount - 1);
            syncSimpleModeStockState();
            refreshSimpleModeUi();
            return true;
        }

        function placeSimpleModeBlindBoxesToAllEmpty() {
            return playSimpleModeRestockSequence();
        }

        async function playSimpleModeRestockSequence() {
            if (!simpleSlotMode) return 0;
            if (state.restockPoolCount <= 0) return 0;
            if (state.isGameOver || state.isBoardEntering || state.isAnimating || state.isSettling || state.isBonusGameActive || state.bonusGamePendingStart) {
                return 0;
            }

            const targets = getSimpleModeAutoFillTargets();
            if (targets.length <= 0) {
                refreshSimpleModeUi();
                return 0;
            }

            const totalPlacements = Math.min(targets.length, Math.max(0, Math.floor(Number(state.restockPoolCount) || 0)));
            const sourceBoxes = getVisibleRestockTrayBoxes().slice(0, totalPlacements);
            let placedCount = 0;

            if (typeof helpers.stopAutoOpen === 'function') {
                helpers.stopAutoOpen();
            }
            if (typeof helpers.clearAutoOpenHoldTimer === 'function') {
                helpers.clearAutoOpenHoldTimer();
            }
            if (typeof helpers.clearAutoOpenLoopTimer === 'function') {
                helpers.clearAutoOpenLoopTimer();
            }

            isRestockSequenceActive = true;
            state.isAnimating = true;
            if (elements.restockTray) {
                elements.restockTray.classList.add('is-restock-sequence');
                elements.restockTray.setAttribute('aria-disabled', 'true');
            }
            refreshSimpleModeSelectionUi();
            updateSimpleModeActionButtons();

            try {
                const tasks = targets.slice(0, totalPlacements).map((targetIndex, order) => (async () => {
                    if (order > 0) {
                        await helpers.waitMs(order * SIMPLE_RESTOCK_STAGGER_MS);
                    }

                    const targetCell = helpers.getGridCellElement(targetIndex);
                    if (!targetCell || state.boardCellStates[targetIndex] !== 'empty') {
                        return 0;
                    }

                    const sourceBox = sourceBoxes[order] || sourceBoxes[sourceBoxes.length - 1] || null;
                    if (sourceBox) {
                        sourceBox.classList.add('is-source-flying');
                    }

                    await helpers.playSimpleModeRestockFlight(sourceBox, targetCell, {
                        durationMs: SIMPLE_RESTOCK_FLIGHT_MS
                    });

                    setSimpleModeCellSealed(targetIndex);
                    state.restockPoolCount = Math.max(0, state.restockPoolCount - 1);
                    syncSimpleModeStockState();
                    if (typeof helpers.updateStats === 'function') {
                        helpers.updateStats();
                    }
                    if (typeof helpers.playSimpleModeRestockLandingFeedback === 'function') {
                        helpers.playSimpleModeRestockLandingFeedback(targetCell);
                    }
                    placedCount += 1;
                    return 1;
                })());

                await Promise.all(tasks);
            } finally {
                isRestockSequenceActive = false;
                state.isAnimating = false;
                syncSimpleModeStockState();
                refreshSimpleModeUi();
            }

            return placedCount;
        }

        function getSimpleModeMatchCenter(indexes) {
            const points = indexes
                .map((index) => helpers.getGridCellElement(index))
                .filter(Boolean)
                .map((cell) => helpers.getGridCellBoxCenterInViewport(cell));
            if (points.length <= 0) {
                return { x: 0, y: 0 };
            }
            const sum = points.reduce((acc, point) => ({
                x: acc.x + point.x,
                y: acc.y + point.y
            }), { x: 0, y: 0 });
            return {
                x: sum.x / points.length,
                y: sum.y / points.length
            };
        }

        function clearSimpleModeMatchHighlight(indexes) {
            indexes.forEach((index) => {
                const cell = helpers.getGridCellElement(index);
                if (!cell) return;
                cell.classList.remove('win-cluster', 'win-jackpot');
            });
        }

        async function resolveSimpleModeSelection(match) {
            if (!simpleSlotMode || state.isSettling || !match || !Array.isArray(match.indexes) || match.indexes.length <= 0) {
                return false;
            }
            state.isSettling = true;
            if (typeof helpers.stopAutoOpen === 'function') {
                helpers.stopAutoOpen();
            }
            if (typeof helpers.clearAutoOpenHoldTimer === 'function') {
                helpers.clearAutoOpenHoldTimer();
            }
            if (typeof helpers.clearAutoOpenLoopTimer === 'function') {
                helpers.clearAutoOpenLoopTimer();
            }
            if (elements.cashoutBtn) elements.cashoutBtn.disabled = true;
            if (elements.randomBtn) elements.randomBtn.disabled = true;
            try {
                state.totalSettlements += 1;
                const center = getSimpleModeMatchCenter(match.indexes);
                const highlightedIndexes = helpers.highlightRealtimeSettlementEvent({
                    indexes: match.indexes,
                    jackpot: match.type !== 'pair'
                }, state.gridCells);
                const label = match.type === 'full-set'
                    ? `全家福 +${match.rewardCount}盲盒`
                    : (match.type === 'triple'
                        ? `三连 +${match.rewardCount}盲盒`
                        : `对碰 +${match.rewardCount}盲盒`);
                helpers.createFloatingText(center.x, center.y - 28, label);
                await helpers.waitMs(match.type === 'full-set' ? 320 : 260);
                clearSimpleModeSelectionState();
                match.indexes.forEach((resolvedIndex) => {
                    setSimpleModeCellEmpty(resolvedIndex);
                });
                rewardSimpleModeBlindBoxes(match.rewardCount);
                helpers.clearRealtimeSettlementHighlight(highlightedIndexes, state.gridCells);
                clearSimpleModeMatchHighlight(match.indexes);
                await helpers.waitMs(120);
            } finally {
                state.isSettling = false;
                refreshSimpleModeUi();
                if (typeof helpers.handleAllBoxesOpened === 'function') {
                    helpers.handleAllBoxesOpened();
                }
            }
            return true;
        }

        async function maybeResolveSimpleModeSelection() {
            if (!simpleSlotMode || state.isSettling) return false;
            if (state.selectionMode === 'full-set') {
                if (state.selectedIndexes.length < 9 || !isSimpleModeFullSetAvailable()) {
                    return false;
                }
                return resolveSimpleModeSelection({
                    type: 'full-set',
                    indexes: state.selectedIndexes.slice(),
                    rewardCount: Math.max(0, Math.floor(Number(config.fullSetRewardBlindBoxes) || 0))
                });
            }
            if (state.selectionMode !== 'same-symbol' || state.selectedIndexes.length <= 0) {
                return false;
            }
            const symbolKey = getSimpleModeCellSymbolKey(state.selectedIndexes[0]);
            const targetCount = getSimpleModeTargetSelectionCount(symbolKey);
            if (targetCount <= 0 || state.selectedIndexes.length < targetCount) {
                return false;
            }
            if (targetCount === 2) {
                return resolveSimpleModeSelection({
                    type: 'pair',
                    indexes: state.selectedIndexes.slice(0, 2),
                    rewardCount: Math.max(0, Math.floor(Number(config.pairRewardBlindBoxes) || 0))
                });
            }
            if (!isSimpleModeTripleLine(state.selectedIndexes)) {
                refreshSimpleModeSelectionUi();
                return false;
            }
            return resolveSimpleModeSelection({
                type: 'triple',
                indexes: state.selectedIndexes.slice(0, 3),
                rewardCount: Math.max(0, Math.floor(Number(config.tripleRewardBlindBoxes) || 0))
            });
        }

        function handleSimpleModeSelectionClick(index) {
            if (!simpleSlotMode || state.boardCellStates[index] !== 'revealed') return;
            const safeIndex = Math.floor(Number(index));
            if (!Number.isFinite(safeIndex) || safeIndex < 0) return;
            const symbolKey = getSimpleModeCellSymbolKey(safeIndex);
            if (!symbolKey) return;

            if (state.selectedIndexes.includes(safeIndex)) {
                state.selectedIndexes = state.selectedIndexes.filter((value) => value !== safeIndex);
                if (state.selectedIndexes.length <= 0) {
                    clearSimpleModeSelectionState();
                }
                refreshSimpleModeSelectionUi();
                return;
            }

            if (state.selectionMode === 'none') {
                if (isSimpleModeFullSetAvailable()) {
                    state.selectionMode = 'full-set';
                    state.selectedIndexes = [safeIndex];
                } else {
                    const targetCount = getSimpleModeTargetSelectionCount(symbolKey);
                    if (targetCount <= 0) {
                        refreshSimpleModeSelectionUi();
                        return;
                    }
                    state.selectionMode = 'same-symbol';
                    state.selectedIndexes = [safeIndex];
                }
                refreshSimpleModeSelectionUi();
                const selectedCell = helpers.getGridCellElement(safeIndex);
                if (selectedCell && typeof helpers.playSimpleModeSelectedCellFeedback === 'function') {
                    helpers.playSimpleModeSelectedCellFeedback(selectedCell);
                }
                void maybeResolveSimpleModeSelection();
                return;
            }

            if (state.selectionMode === 'full-set') {
                if (!isSimpleModeFullSetAvailable()) {
                    clearSimpleModeSelectionState();
                    refreshSimpleModeSelectionUi();
                    return;
                }
                state.selectedIndexes = [...state.selectedIndexes, safeIndex];
                refreshSimpleModeSelectionUi();
                void maybeResolveSimpleModeSelection();
                return;
            }

            const activeSymbolKey = getSimpleModeCellSymbolKey(state.selectedIndexes[0]);
            if (!activeSymbolKey || symbolKey !== activeSymbolKey) {
                refreshSimpleModeSelectionUi();
                return;
            }

            const targetCount = getSimpleModeTargetSelectionCount(symbolKey);
            if (targetCount <= 0 || state.selectedIndexes.length >= targetCount) {
                refreshSimpleModeSelectionUi();
                return;
            }

            state.selectedIndexes = [...state.selectedIndexes, safeIndex];
            refreshSimpleModeSelectionUi();
            void maybeResolveSimpleModeSelection();
        }

        async function applySimpleModeSafeReward(cell, index) {
            const center = helpers.getGridCellBoxCenterInViewport(cell);
            const blockData = createSimpleModeBlockData();
            state.cellBlocks[index] = blockData;
            state.boardCellStates[index] = 'revealed';
            state.boardResolvedFlags[index] = 0;
            renderSimpleModeRevealedCell(index, blockData);

            if (hasSimpleWishSelection() && blockData.normalKey === state.wishSymbolKey) {
                rewardSimpleModeBlindBoxes(config.wishRewardBlindBoxes);
                helpers.createFloatingText(center.x, center.y - 20, '许愿 +1盲盒');
            }

            refreshSimpleModeUi();
        }

        return {
            updateSimpleBlindBoxCounterUi,
            ensureSimpleWishOverlay,
            hideSimpleWishOverlay,
            showSimpleWishOverlay,
            hasSimpleWishSelection,
            resetSimpleModeState,
            createSimpleModeBlockData,
            applyGridCellLayoutVars,
            setSimpleModeCellSealed,
            setSimpleModeCellEmpty,
            renderSimpleModeRevealedCell,
            clearSimpleModeSelectionState,
            refreshSimpleModeSelectionUi,
            getSimpleModeTargetSelectionCount,
            isSimpleModeFullSetAvailable,
            refreshSimpleModeUi,
            hasAnySimpleModeResolvableAction,
            rewardSimpleModeBlindBoxes,
            renderSimpleModeWishSymbol,
            getSimpleModeCellSymbolKey,
            getSimpleModeAutoFillTargets,
            placeSimpleModeBlindBoxAt,
            placeSimpleModeBlindBoxesToAllEmpty,
            playSimpleModeRestockSequence,
            resolveSimpleModeSelection,
            maybeResolveSimpleModeSelection,
            handleSimpleModeSelectionClick,
            applySimpleModeSafeReward,
            getWishOverlayElement() {
                return slotWishOverlay;
            },
            getSymbolKeys() {
                return symbolKeys.slice();
            }
        };
    }

    globalScope.WynneSimpleMatchCore = {
        create: createSimpleMatchCore
    };
}(window));
