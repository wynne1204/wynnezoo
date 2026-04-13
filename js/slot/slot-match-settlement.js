// ============================================================
// Slot Game — Match/Pair Settlement (对对碰结算)
// Pure match-based settlement logic: pair matching, triple
// line detection, full-set checking, and blind box rewards.
// Only active when SIMPLE_SLOT_MODE === true.
// ============================================================

(function initMatchSettlement(globalScope) {
    'use strict';

    function createMatchSettlement(deps) {
        const config = deps.config;
        const state = deps.state;
        const helpers = deps.helpers;

        // Generate triple lines dynamically based on grid size
        const gridSide = Math.round(Math.sqrt(config.gridSize || 9));
        const tripleLines = [];
        if (gridSide === 3) {
            for (let r = 0; r < 3; r++) tripleLines.push([r * 3, r * 3 + 1, r * 3 + 2]);
            for (let c = 0; c < 3; c++) tripleLines.push([c, c + 3, c + 6]);
            tripleLines.push([0, 4, 8]);
            tripleLines.push([2, 4, 6]);
        }

        // ---- Symbol helpers ----

        function getSimpleModeCellSymbolKey(index) {
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
                if (getSimpleModeCellSymbolKey(index) === safeSymbolKey) indexes.push(index);
            }
            return indexes;
        }

        function getSimpleModeRevealedIndexes() {
            const indexes = [];
            for (let index = 0; index < state.boardCellStates.length; index++) {
                if (state.boardCellStates[index] === 'revealed') indexes.push(index);
            }
            return indexes;
        }

        // ---- Match detection ----

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
            if (!hasSimpleModeTripleOpportunity(symbolKey)) return 2;
            return Math.min(sameSymbolIndexes.length, Math.max(3, Math.floor(Number(config.maxSelectableSameSymbolCount) || 3)));
        }

        function isSimpleModeTripleLine(indexes) {
            if (!Array.isArray(indexes) || indexes.length !== 3) return false;
            const indexSet = new Set(indexes.map((v) => Math.floor(Number(v))));
            if (indexSet.size !== 3) return false;
            return tripleLines.some((line) => line.every((lineIndex) => indexSet.has(lineIndex)));
        }

        function isSimpleModeFullSetAvailable() {
            if (state.boardCellStates.length !== 9) return false;
            const revealedIndexes = getSimpleModeRevealedIndexes();
            if (revealedIndexes.length !== 9) return false;
            const symbolKeysInBoard = revealedIndexes.map((index) => getSimpleModeCellSymbolKey(index));
            if (symbolKeysInBoard.some((sk) => !sk)) return false;
            return new Set(symbolKeysInBoard).size === 9;
        }

        function hasAnyResolvableAction() {
            if (isSimpleModeFullSetAvailable()) return true;
            const groups = new Map();
            for (let index = 0; index < state.boardCellStates.length; index++) {
                const symbolKey = getSimpleModeCellSymbolKey(index);
                if (!symbolKey) continue;
                if (!groups.has(symbolKey)) groups.set(symbolKey, []);
                groups.get(symbolKey).push(index);
            }
            for (const indexes of groups.values()) {
                if (indexes.length >= 2) return true;
            }
            return false;
        }

        // ---- Reward ----

        function rewardBlindBoxes(count) {
            // Delegate to the provided reward function which handles
            // state mutation, pulse animation, and UI refresh internally
            if (typeof helpers.rewardBlindBoxesFn === 'function') {
                return helpers.rewardBlindBoxesFn(count);
            }
            const safeCount = Math.max(0, Math.floor(Number(count) || 0));
            state.remainingBlindBoxes += safeCount;
            state.roundReward += safeCount;
            state.restockPoolCount += safeCount;
            helpers.refreshSimpleModeUi();
            return safeCount;
        }

        // ---- Settlement resolution ----

        function getMatchCenter(indexes) {
            const points = indexes
                .map((index) => helpers.getGridCellElement(index))
                .filter(Boolean)
                .map((cell) => helpers.getGridCellBoxCenterInViewport(cell));
            if (points.length <= 0) return { x: 0, y: 0 };
            const sum = points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
            return { x: sum.x / points.length, y: sum.y / points.length };
        }

        function clearMatchHighlight(indexes) {
            indexes.forEach((index) => {
                const cell = helpers.getGridCellElement(index);
                if (!cell) return;
                cell.classList.remove('win-cluster', 'win-jackpot');
            });
        }

        async function resolveSelection(match) {
            if (state.isSettling || !match || !Array.isArray(match.indexes) || match.indexes.length <= 0) {
                return false;
            }
            state.isSettling = true;
            helpers.stopAutoOpen();
            if (helpers.cashoutBtn) helpers.cashoutBtn.disabled = true;
            if (helpers.randomBtn) helpers.randomBtn.disabled = true;

            try {
                state.totalSettlements += 1;
                const center = getMatchCenter(match.indexes);
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
                if (match.type === 'full-set') {
                    helpers.createConfettiFireworks();
                }
                await helpers.waitMs(match.type === 'full-set' ? 320 : 260);

                helpers.clearSimpleModeSelectionState();
                match.indexes.forEach((resolvedIndex) => {
                    helpers.setSimpleModeCellEmpty(resolvedIndex);
                });
                rewardBlindBoxes(match.rewardCount);
                helpers.clearRealtimeSettlementHighlight(highlightedIndexes, state.gridCells);
                clearMatchHighlight(match.indexes);
                await helpers.waitMs(120);
            } finally {
                state.isSettling = false;
                helpers.refreshSimpleModeUi();
                if (typeof helpers.handleAllBoxesOpened === 'function') {
                    helpers.handleAllBoxesOpened();
                }
            }
            return true;
        }

        async function maybeResolveSelection() {
            if (state.isSettling) return false;

            if (state.selectionMode === 'full-set') {
                if (state.selectedIndexes.length < 9 || !isSimpleModeFullSetAvailable()) return false;
                return resolveSelection({
                    type: 'full-set',
                    indexes: state.selectedIndexes.slice(),
                    rewardCount: Math.max(0, Math.floor(Number(config.fullSetRewardBlindBoxes) || 0))
                });
            }

            if (state.selectionMode !== 'same-symbol' || state.selectedIndexes.length <= 0) return false;

            const symbolKey = getSimpleModeCellSymbolKey(state.selectedIndexes[0]);
            const targetCount = getSimpleModeTargetSelectionCount(symbolKey);
            if (targetCount <= 0 || state.selectedIndexes.length < targetCount) return false;

            if (targetCount === 2) {
                return resolveSelection({
                    type: 'pair',
                    indexes: state.selectedIndexes.slice(0, 2),
                    rewardCount: Math.max(0, Math.floor(Number(config.pairRewardBlindBoxes) || 0))
                });
            }

            if (!isSimpleModeTripleLine(state.selectedIndexes)) {
                helpers.refreshSimpleModeSelectionUi();
                return false;
            }

            return resolveSelection({
                type: 'triple',
                indexes: state.selectedIndexes.slice(0, 3),
                rewardCount: Math.max(0, Math.floor(Number(config.tripleRewardBlindBoxes) || 0))
            });
        }

        // ---- Selection click handler ----

        function handleSelectionClick(index) {
            if (state.boardCellStates[index] !== 'revealed') return;
            const safeIndex = Math.floor(Number(index));
            if (!Number.isFinite(safeIndex) || safeIndex < 0) return;
            const symbolKey = getSimpleModeCellSymbolKey(safeIndex);
            if (!symbolKey) return;

            // Deselect
            if (state.selectedIndexes.includes(safeIndex)) {
                state.selectedIndexes = state.selectedIndexes.filter((v) => v !== safeIndex);
                if (state.selectedIndexes.length <= 0) helpers.clearSimpleModeSelectionState();
                helpers.refreshSimpleModeSelectionUi();
                return;
            }

            // Start new selection
            if (state.selectionMode === 'none') {
                if (isSimpleModeFullSetAvailable()) {
                    state.selectionMode = 'full-set';
                    state.selectedIndexes = [safeIndex];
                } else {
                    const targetCount = getSimpleModeTargetSelectionCount(symbolKey);
                    if (targetCount <= 0) {
                        helpers.refreshSimpleModeSelectionUi();
                        return;
                    }
                    state.selectionMode = 'same-symbol';
                    state.selectedIndexes = [safeIndex];
                }
                helpers.refreshSimpleModeSelectionUi();
                helpers.playSelectedCellFeedback(safeIndex);
                void maybeResolveSelection();
                return;
            }

            // Full-set mode
            if (state.selectionMode === 'full-set') {
                if (!isSimpleModeFullSetAvailable()) {
                    helpers.clearSimpleModeSelectionState();
                    helpers.refreshSimpleModeSelectionUi();
                    return;
                }
                state.selectedIndexes = [...state.selectedIndexes, safeIndex];
                helpers.refreshSimpleModeSelectionUi();
                void maybeResolveSelection();
                return;
            }

            // Same-symbol mode
            const activeSymbolKey = getSimpleModeCellSymbolKey(state.selectedIndexes[0]);
            if (!activeSymbolKey || symbolKey !== activeSymbolKey) {
                helpers.refreshSimpleModeSelectionUi();
                return;
            }
            const targetCount = getSimpleModeTargetSelectionCount(symbolKey);
            if (targetCount <= 0 || state.selectedIndexes.length >= targetCount) {
                helpers.refreshSimpleModeSelectionUi();
                return;
            }
            state.selectedIndexes = [...state.selectedIndexes, safeIndex];
            helpers.refreshSimpleModeSelectionUi();
            void maybeResolveSelection();
        }

        return {
            getSimpleModeCellSymbolKey,
            getSimpleModeTargetSelectionCount,
            isSimpleModeTripleLine,
            isSimpleModeFullSetAvailable,
            hasAnyResolvableAction,
            rewardBlindBoxes,
            resolveSelection,
            maybeResolveSelection,
            handleSelectionClick
        };
    }

    globalScope.WynneMatchSettlement = {
        create: createMatchSettlement
    };
}(window));
