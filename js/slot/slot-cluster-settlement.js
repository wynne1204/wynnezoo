// ============================================================
// Slot Game — Cluster Settlement (连线结算)
// Pure cluster-based settlement logic: BFS adjacency matching,
// payout calculation, and animation sequencing.
// Only active when SIMPLE_SLOT_MODE === false.
// ============================================================

(function initClusterSettlement(globalScope) {
    'use strict';

    function createClusterSettlement(deps) {
        const config = deps.config;
        const state = deps.state;
        const helpers = deps.helpers;

        // ---- Payout helpers ----

        function getClusterMultiplier(size) {
            const payout = config.clusterPayout;
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
            const payoutTable = helpers.getMainBoardPayouts()[rawSymbol];
            if (!payoutTable || safeSize < 3) return 0;
            if (safeSize >= 10) return payoutTable[10] || 0;
            return payoutTable[safeSize] || 0;
        }

        function getSettlementStackBlockCount(size) {
            const payout = config.clusterPayout || {};
            const mapping = payout.stackBlocksByClusterSize || {};
            const threshold = Math.max(1, Math.floor(Number(payout.jackpotThreshold) || 10));
            const safeSize = Math.max(0, Math.floor(Number(size) || 0));
            const exact = Number(mapping[safeSize]);
            if (Number.isFinite(exact)) return Math.max(0, Math.floor(exact));
            const jackpotMapped = Number(mapping[threshold]);
            if (safeSize >= threshold && Number.isFinite(jackpotMapped)) return Math.max(0, Math.floor(jackpotMapped));
            return 1;
        }

        function getSettlementStackBlockCountByClusterSize(clusterSize) {
            const safeSize = Math.max(1, Math.floor(Number(clusterSize) || 0));
            const rewardMap = config.clusterPayout.settlementStackBlocksBySize || {};
            const directValue = Number(rewardMap[safeSize]);
            if (Number.isFinite(directValue)) return Math.max(0, Math.floor(directValue));
            const minSize = Math.max(1, Math.floor(Number(config.clusterPayout.minClusterSize) || 3));
            const fallbackValue = Number(rewardMap[minSize]);
            if (Number.isFinite(fallbackValue)) return Math.max(0, Math.floor(fallbackValue));
            return 1;
        }

        // ---- Board snapshot & BFS ----

        function createBoardClusterSnapshot(blocksInput) {
            const blocks = Array.isArray(blocksInput) ? blocksInput : (Array.isArray(state.cellBlocks) ? state.cellBlocks : []);
            const total = blocks.length;
            const side = helpers.getGridSideLength(total);
            const blockSymbols = new Array(total);
            const symbolKeys = [];
            const seenSymbols = new Set();

            for (let index = 0; index < total; index++) {
                const symbolKey = helpers.getBlockSymbolKey(blocks[index]);
                blockSymbols[index] = symbolKey;
                if (!symbolKey || seenSymbols.has(symbolKey)) continue;
                seenSymbols.add(symbolKey);
                symbolKeys.push(symbolKey);
            }

            return { blocks, blockSymbols, symbolKeys, total, side };
        }

        function collectActiveSymbolKeys(boardSnapshot) {
            const snap = boardSnapshot || createBoardClusterSnapshot();
            return snap.symbolKeys.slice();
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

        function findBestClusterForSymbol(symbolKey, boardSnapshot) {
            const snap = boardSnapshot || createBoardClusterSnapshot();
            const { blocks, blockSymbols, total, side } = snap;
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
                    if (current < componentMinIndex) componentMinIndex = current;
                    if (blockSymbols[current] === symbolKey) hasTargetSymbol = true;

                    const row = Math.floor(current / side);
                    const col = current % side;
                    if (row > 0) queueSymbolNeighbor(current - side, snap, symbolKey, visited, queue);
                    if (row < side - 1) queueSymbolNeighbor(current + side, snap, symbolKey, visited, queue);
                    if (col > 0) queueSymbolNeighbor(current - 1, snap, symbolKey, visited, queue);
                    if (col < side - 1) queueSymbolNeighbor(current + 1, snap, symbolKey, visited, queue);
                }

                if (!hasTargetSymbol) continue;
                if (component.length > bestSize) {
                    bestSize = component.length;
                    bestIndexes = component;
                    bestMinIndex = componentMinIndex;
                }
            }

            return { symbolKey, size: bestSize, indexes: bestIndexes, minIndex: bestMinIndex };
        }

        // ---- Main settlement entry ----

        async function settleRealtimeRewardsForCurrentBoard() {
            const boardSnapshot = createBoardClusterSnapshot();
            const symbolKeys = collectActiveSymbolKeys(boardSnapshot);
            const gridCells = Array.isArray(state.gridCells) ? state.gridCells : [];
            const triggeredEvents = [];

            symbolKeys.forEach((symbolKey) => {
                const bestCluster = findBestClusterForSymbol(symbolKey, boardSnapshot);
                if (!bestCluster || bestCluster.size <= 0) return;

                const prevSettledSize = Math.max(0, Math.floor(Number(state.symbolSettledSizeByKey[symbolKey]) || 0));
                const maxSettleSize = Math.min(bestCluster.size, config.clusterPayout.jackpotThreshold);
                if (maxSettleSize <= prevSettledSize) return;

                const settleFrom = Math.max(config.clusterPayout.minClusterSize, prevSettledSize + 1);
                if (settleFrom > maxSettleSize) {
                    state.symbolSettledSizeByKey[symbolKey] = maxSettleSize;
                    return;
                }

                const settleSize = maxSettleSize;
                const reward = getClusterReward(symbolKey, settleSize);
                if (reward > 0) {
                    state.roundReward += reward;
                    state.totalSettlements += 1;

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
                        jackpot: settleSize >= config.clusterPayout.jackpotThreshold
                    };
                    state.realtimeSettlementEvents.push(event);
                    triggeredEvents.push(event);
                }

                state.symbolSettledSizeByKey[symbolKey] = maxSettleSize;
            });

            if (triggeredEvents.length > 0) {
                triggeredEvents.sort((a, b) => {
                    const aMin = Number.isFinite(a.minIndex) ? a.minIndex : Number.MAX_SAFE_INTEGER;
                    const bMin = Number.isFinite(b.minIndex) ? b.minIndex : Number.MAX_SAFE_INTEGER;
                    if (aMin !== bMin) return aMin - bMin;
                    if (a.symbolKey !== b.symbolKey) return String(a.symbolKey).localeCompare(String(b.symbolKey));
                    return a.size - b.size;
                });

                state.isSettling = true;
                try {
                    await helpers.playSettlementAnimationSequence(triggeredEvents, gridCells, {
                        centerGetter: helpers.getGridCellBoxCenterInViewport,
                        flyBlockFn: helpers.flyBlockToStack
                    });
                } catch (err) {
                    console.error('Cluster settlement animation failed:', err);
                } finally {
                    state.isSettling = false;
                }

                helpers.unlockButtonsIfIdle();
            }
        }

        return {
            getClusterMultiplier,
            getClusterReward,
            getSettlementStackBlockCount,
            getSettlementStackBlockCountByClusterSize,
            createBoardClusterSnapshot,
            collectActiveSymbolKeys,
            findBestClusterForSymbol,
            settleRealtimeRewardsForCurrentBoard
        };
    }

    globalScope.WynneClusterSettlement = {
        create: createClusterSettlement
    };
}(window));
