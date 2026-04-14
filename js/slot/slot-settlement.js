// ============================================================
// Slot Game — Settlement Shared Utilities
// Common settlement animation, highlight, and block helpers
// used by both cluster and match settlement modules.
//
// Mode-specific logic lives in:
//   slot-cluster-settlement.js  (cluster / 连线结算)
//   slot-match-settlement.js    (match / 对对碰结算)
// ============================================================

// ---- Stack block data helpers (shared by both modes) ----

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

// ---- Highlight helpers (shared by both modes) ----

function highlightRealtimeSettlementEvent(event, cells) {
    const gridCells = cells || STATE.gridCells;
    if (!event || !Array.isArray(gridCells) || gridCells.length === 0) return [];
    const indexes = Array.from(new Set(event.indexes || []));
    const isPair = Boolean(event.pair);

    indexes.forEach((index) => {
        const cell = gridCells[index];
        if (!cell) return;
        cell.classList.add('win-cluster');
        cell.classList.toggle('win-pair', isPair);
        if (event.jackpot) {
            cell.classList.add('win-jackpot');
        } else {
            cell.classList.remove('win-jackpot');
        }
        cell.style.zIndex = '20';

        const highlightTarget = cell.querySelector('.safe-open-box-frame') || cell.querySelector('.free-spin-reward-grid');
        if (highlightTarget) {
            highlightTarget.classList.remove('settle-enlarge-glow', 'settle-enlarge-glow-pair');
            void highlightTarget.offsetWidth;
            highlightTarget.classList.add(isPair ? 'settle-enlarge-glow-pair' : 'settle-enlarge-glow');
        }

        const badge = cell.querySelector('.sticky-wild-round-badge');
        if (badge) {
            badge.classList.remove('settle-enlarge-glow', 'settle-enlarge-glow-pair');
            void badge.offsetWidth;
            badge.classList.add(isPair ? 'settle-enlarge-glow-pair' : 'settle-enlarge-glow');
        }
    });

    return indexes;
}

function clearRealtimeSettlementHighlight(indexes, cells) {
    const gridCells = cells || STATE.gridCells;
    if (!Array.isArray(indexes) || indexes.length === 0 || !Array.isArray(gridCells) || gridCells.length === 0) return;

    indexes.forEach((index) => {
        const cell = gridCells[index];
        if (!cell) return;
        cell.classList.remove('win-cluster', 'win-jackpot', 'win-pair');
        cell.style.zIndex = '';

        const highlightTarget = cell.querySelector('.safe-open-box-frame') || cell.querySelector('.free-spin-reward-grid');
        if (highlightTarget) {
            highlightTarget.classList.remove('settle-enlarge-glow', 'settle-enlarge-glow-pair');
        }

        const badge = cell.querySelector('.sticky-wild-round-badge');
        if (badge) {
            badge.classList.remove('settle-enlarge-glow', 'settle-enlarge-glow-pair');
        }
    });
}

// ---- Settlement animation sequence (shared by both modes) ----

async function playSettlementAnimationSequence(events, cells, options) {
    const opts = options || {};
    if (!Array.isArray(events) || events.length === 0 || !Array.isArray(cells) || cells.length === 0) return;

    const centerGetter = typeof opts.centerGetter === 'function'
        ? opts.centerGetter
        : getGridCellBoxCenterInViewport;
    const flyBlockFn = typeof opts.flyBlockFn === 'function'
        ? opts.flyBlockFn
        : flyBlockToStack;
    const rewardTextFormatter = typeof opts.rewardTextFormatter === 'function'
        ? opts.rewardTextFormatter
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

// ============================================================
// Unified settlement dispatcher
// Called from slot-main.js — routes to the correct module.
// ============================================================

async function settleRealtimeRewardsForCurrentBoard() {
    if (SIMPLE_SLOT_MODE) {
        // 对对碰 mode: settlement is driven by user selection clicks,
        // not by automatic board scanning. No-op here.
        return;
    }
    if (typeof CLUSTER_SETTLEMENT !== 'undefined' && CLUSTER_SETTLEMENT) {
        await CLUSTER_SETTLEMENT.settleRealtimeRewardsForCurrentBoard();
    }
}

// ============================================================
// Backward-compatible global wrappers for cluster functions.
// Used by slot-free-spin.js and slot-blueprint.js which call
// these as globals. They delegate to CLUSTER_SETTLEMENT when
// available (cluster mode), otherwise return safe defaults.
// ============================================================

function getClusterMultiplier(size) {
    if (typeof CLUSTER_SETTLEMENT !== 'undefined' && CLUSTER_SETTLEMENT) {
        return CLUSTER_SETTLEMENT.getClusterMultiplier(size);
    }
    return 0;
}

function getClusterReward(symbolKey, size) {
    if (typeof CLUSTER_SETTLEMENT !== 'undefined' && CLUSTER_SETTLEMENT) {
        return CLUSTER_SETTLEMENT.getClusterReward(symbolKey, size);
    }
    return 0;
}

function getSettlementStackBlockCount(size) {
    if (typeof CLUSTER_SETTLEMENT !== 'undefined' && CLUSTER_SETTLEMENT) {
        return CLUSTER_SETTLEMENT.getSettlementStackBlockCount(size);
    }
    return 1;
}

function getSettlementStackBlockCountByClusterSize(clusterSize) {
    if (typeof CLUSTER_SETTLEMENT !== 'undefined' && CLUSTER_SETTLEMENT) {
        return CLUSTER_SETTLEMENT.getSettlementStackBlockCountByClusterSize(clusterSize);
    }
    return 1;
}

function createBoardClusterSnapshot(blocksInput) {
    if (typeof CLUSTER_SETTLEMENT !== 'undefined' && CLUSTER_SETTLEMENT) {
        return CLUSTER_SETTLEMENT.createBoardClusterSnapshot(blocksInput);
    }
    // Minimal fallback for when cluster module is not loaded
    const blocks = Array.isArray(blocksInput) ? blocksInput : (typeof STATE !== 'undefined' && Array.isArray(STATE.cellBlocks) ? STATE.cellBlocks : []);
    return { blocks, blockSymbols: [], symbolKeys: [], total: blocks.length, side: 0 };
}

function collectActiveSymbolKeys(boardSnapshot) {
    if (typeof CLUSTER_SETTLEMENT !== 'undefined' && CLUSTER_SETTLEMENT) {
        return CLUSTER_SETTLEMENT.collectActiveSymbolKeys(boardSnapshot);
    }
    return boardSnapshot ? boardSnapshot.symbolKeys.slice() : [];
}

function findBestClusterForSymbol(symbolKey, boardSnapshot) {
    if (typeof CLUSTER_SETTLEMENT !== 'undefined' && CLUSTER_SETTLEMENT) {
        return CLUSTER_SETTLEMENT.findBestClusterForSymbol(symbolKey, boardSnapshot);
    }
    return { symbolKey, size: 0, indexes: [], minIndex: Number.MAX_SAFE_INTEGER };
}
