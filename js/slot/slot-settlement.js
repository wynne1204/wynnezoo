// ============================================================
// Slot Game — Settlement & Cluster Calculation
// Extracted from slot-main.js for maintainability.
// This file MUST be loaded before slot-main.js.
// ============================================================

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
            void highlightTarget.offsetWidth;
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

        if (STATE.pendingOpens === 0 && !STATE.isAnimating && !STATE.isGameOver && !STATE.isBonusGameActive && !STATE.bonusGamePendingStart && !FREE_SPIN_STATE.pendingStart && !FREE_SPIN_STATE.active) {
            if (STATE.unrevealedIndices.length > 0) {
                if (cashoutBtn) cashoutBtn.disabled = false;
                if (randomBtn) randomBtn.disabled = false;
            }
        }
    }
}
