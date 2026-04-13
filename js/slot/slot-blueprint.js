// ============================================================
// Slot Game — Blueprint & Board Plan Generation
// Loaded before slot-main.js via index.html.
// ============================================================

function cloneBlueprintCounts(counts = {}) {
    return {
        S1: Math.max(0, Math.floor(Number(counts.S1) || 0)),
        S2: Math.max(0, Math.floor(Number(counts.S2) || 0)),
        S3: Math.max(0, Math.floor(Number(counts.S3) || 0)),
        S4: Math.max(0, Math.floor(Number(counts.S4) || 0)),
        S5: Math.max(0, Math.floor(Number(counts.S5) || 0)),
        W: Math.max(0, Math.floor(Number(counts.W) || 0)),
        SW: Math.max(0, Math.floor(Number(counts.SW) || 0)),
        B: Math.max(0, Math.floor(Number(counts.B) || 0))
    };
}

function getBlueprintWeights(hasCarriedStickyWild) {
    const configured = hasCarriedStickyWild
        ? CONFIG.blueprintWeights.withCarriedStickyWild
        : CONFIG.blueprintWeights.default;
    if (hasPositiveWeight(configured)) {
        return configured;
    }
    return hasCarriedStickyWild
        ? DEFAULT_CONFIG.blueprintWeights.withCarriedStickyWild
        : DEFAULT_CONFIG.blueprintWeights.default;
}

function loadBonusDryStreak() {
    const zooEconomy = getZooEconomy();
    const activeUserId = zooEconomy && typeof zooEconomy.getActiveUserId === 'function'
        ? String(zooEconomy.getActiveUserId() || '').trim()
        : '';
    const storageKey = activeUserId
        ? `${BONUS_DRY_STREAK_STORAGE_KEY}.${encodeURIComponent(activeUserId)}`
        : BONUS_DRY_STREAK_STORAGE_KEY;
    try {
        const rawValue = window.localStorage.getItem(storageKey);
        const parsed = Math.max(0, Math.floor(Number(rawValue) || 0));
        return Number.isFinite(parsed) ? parsed : 0;
    } catch (error) {
        return 0;
    }
}

function saveBonusDryStreak(value) {
    const safeValue = Math.max(0, Math.floor(Number(value) || 0));
    const zooEconomy = getZooEconomy();
    const activeUserId = zooEconomy && typeof zooEconomy.getActiveUserId === 'function'
        ? String(zooEconomy.getActiveUserId() || '').trim()
        : '';
    const storageKey = activeUserId
        ? `${BONUS_DRY_STREAK_STORAGE_KEY}.${encodeURIComponent(activeUserId)}`
        : BONUS_DRY_STREAK_STORAGE_KEY;
    try {
        window.localStorage.setItem(storageKey, String(safeValue));
    } catch (error) {
        return;
    }
}

function resetBonusDryStreak() {
    saveBonusDryStreak(0);
}

function isBlueprintFreeSpinEligible(blueprint) {
    if (!blueprint || !blueprint.counts) return false;
    const counts = cloneBlueprintCounts(blueprint.counts);
    const bonusCount = Math.max(0, counts.B || 0);
    const effectiveCount = bonusCount + Math.max(0, counts.W || 0) + Math.max(0, counts.SW || 0);
    return bonusCount >= 1 && effectiveCount >= 3;
}

function updateBonusDryStreakAfterBlueprint(blueprintId) {
    if (isBlueprintFreeSpinEligible(BLUEPRINTS[blueprintId])) {
        resetBonusDryStreak();
        return 0;
    }
    const nextValue = loadBonusDryStreak() + 1;
    saveBonusDryStreak(nextValue);
    return nextValue;
}

function pickWeightedKeyFromMap(weightMap = {}) {
    const entries = Object.entries(weightMap)
        .map(([key, weight]) => ({ key, weight: Number(weight) }))
        .filter((entry) => Number.isFinite(entry.weight) && entry.weight > 0);
    if (entries.length === 0) {
        return null;
    }
    const totalWeight = entries.reduce((sum, entry) => sum + entry.weight, 0);
    let cursor = Math.random() * totalWeight;
    for (let index = 0; index < entries.length; index++) {
        cursor -= entries[index].weight;
        if (cursor <= 0) {
            return entries[index].key;
        }
    }
    return entries[entries.length - 1].key;
}

function pickBlueprintId(hasCarriedStickyWild) {
    const dryStreakBefore = loadBonusDryStreak();
    const hardPityThreshold = Math.max(0, Math.floor(Number(CONFIG.blueprintWeights.hardPityThreshold) || 0));
    const hardPityEligible = !hasCarriedStickyWild && dryStreakBefore >= hardPityThreshold;
    const hardPityWeights = hasPositiveWeight(CONFIG.blueprintWeights.hardPityJackpot)
        ? CONFIG.blueprintWeights.hardPityJackpot
        : DEFAULT_CONFIG.blueprintWeights.hardPityJackpot;
    const activeWeights = hardPityEligible
        ? hardPityWeights
        : getBlueprintWeights(hasCarriedStickyWild);
    let blueprintId = pickWeightedKeyFromMap(activeWeights);
    if (!blueprintId || !BLUEPRINTS[blueprintId]) {
        blueprintId = pickWeightedKeyFromMap(DEFAULT_CONFIG.blueprintWeights.default) || 'BP_01';
    }
    const dryStreakAfter = updateBonusDryStreakAfterBlueprint(blueprintId);
    return {
        blueprintId,
        dryStreakBefore,
        dryStreakAfter,
        hardPityApplied: hardPityEligible,
        hardPityDeferredByStickyWild: Boolean(hasCarriedStickyWild && dryStreakBefore >= hardPityThreshold)
    };
}

function shuffleArray(items) {
    const next = Array.isArray(items) ? items.slice() : [];
    for (let index = next.length - 1; index > 0; index--) {
        const swapIndex = Math.floor(Math.random() * (index + 1));
        const temp = next[index];
        next[index] = next[swapIndex];
        next[swapIndex] = temp;
    }
    return next;
}

function pickRandomItem(items) {
    if (!Array.isArray(items) || items.length === 0) return null;
    return items[Math.floor(Math.random() * items.length)] || items[0] || null;
}

function getExpandedDeckTokens(deckCounts = {}) {
    const tokens = [];
    NORMAL_SYMBOL_ORDER.forEach((symbolKey) => {
        const count = Math.max(0, Math.floor(Number(deckCounts[symbolKey]) || 0));
        for (let index = 0; index < count; index++) {
            tokens.push(symbolKey);
        }
    });
    for (let index = 0; index < Math.max(0, Math.floor(Number(deckCounts.W) || 0)); index++) {
        tokens.push('W');
    }
    for (let index = 0; index < Math.max(0, Math.floor(Number(deckCounts.SW) || 0)); index++) {
        tokens.push('SW');
    }
    for (let index = 0; index < Math.max(0, Math.floor(Number(deckCounts.B) || 0)); index++) {
        tokens.push('B');
    }
    return tokens;
}

function consumeHighestAnimalFromDeck(deckCounts = {}) {
    for (let index = 0; index < NORMAL_SYMBOL_VALUE_ORDER.length; index++) {
        const symbolKey = NORMAL_SYMBOL_VALUE_ORDER[index];
        if ((deckCounts[symbolKey] || 0) > 0) {
            deckCounts[symbolKey] -= 1;
            return symbolKey;
        }
    }
    return 'S1';
}

function consumeSpecificTokenFromDeck(deckCounts = {}, tokenKey, fallbackToken = null) {
    if ((deckCounts[tokenKey] || 0) > 0) {
        deckCounts[tokenKey] -= 1;
        return tokenKey;
    }
    return fallbackToken;
}

function consumeCompensationToken(deckCounts = {}) {
    const compensationOrder = ['W', 'S5', 'S4'];
    for (let index = 0; index < compensationOrder.length; index++) {
        const tokenKey = compensationOrder[index];
        if ((deckCounts[tokenKey] || 0) > 0) {
            deckCounts[tokenKey] -= 1;
            return tokenKey;
        }
    }
    return null;
}

function flattenTemplateMask(mask) {
    return (Array.isArray(mask) ? mask : []).flat().map((slot) => String(slot || 'F'));
}

function getCoordFromIndex(index, side = 4) {
    return {
        row: Math.floor(index / side),
        col: index % side
    };
}

function getIndexFromCoord(row, col, side = 4) {
    return (row * side) + col;
}

function applyCoordTransform(row, col, transformName, side = 4) {
    const last = side - 1;
    switch (transformName) {
    case 'rotate90':
        return { row: col, col: last - row };
    case 'rotate180':
        return { row: last - row, col: last - col };
    case 'rotate270':
        return { row: last - col, col: row };
    case 'flipX':
        return { row, col: last - col };
    case 'flipY':
        return { row: last - row, col };
    case 'diagMain':
        return { row: col, col: row };
    case 'diagAnti':
        return { row: last - col, col: last - row };
    case 'identity':
    default:
        return { row, col };
    }
}

function transformMask(mask, transformName, side = 4) {
    const source = flattenTemplateMask(mask);
    const transformed = new Array(source.length).fill('F');
    for (let index = 0; index < source.length; index++) {
        const { row, col } = getCoordFromIndex(index, side);
        const nextCoord = applyCoordTransform(row, col, transformName, side);
        transformed[getIndexFromCoord(nextCoord.row, nextCoord.col, side)] = source[index];
    }
    return transformed;
}

function getIndexesForSlot(maskSlots, slotKey) {
    const indexes = [];
    for (let index = 0; index < maskSlots.length; index++) {
        if (maskSlots[index] === slotKey) {
            indexes.push(index);
        }
    }
    return indexes;
}

function createBlockDataFromToken(token) {
    if (NORMAL_SYMBOL_ORDER.includes(token)) {
        return createNormalBlockData(token);
    }
    if (token === 'W') return createSpecialBlockData('wild');
    if (token === 'SW') return createSpecialBlockData('stickyWild');
    if (token === 'B') return createSpecialBlockData('bonus');
    return createNormalBlockData('S1');
}

function getLargestNormalClusterSize(blockList) {
    const snapshot = createBoardClusterSnapshot(blockList);
    const symbolKeys = collectActiveSymbolKeys(snapshot).filter((symbolKey) => String(symbolKey || '').startsWith('normal:'));
    let maxSize = 0;
    symbolKeys.forEach((symbolKey) => {
        const cluster = findBestClusterForSymbol(symbolKey, snapshot);
        if (cluster && cluster.size > maxSize) {
            maxSize = cluster.size;
        }
    });
    return maxSize;
}

function createScatterBoardPlan(blueprint, size, hasCarriedStickyWild, carriedIndex) {
    const totalCells = Math.max(1, Math.floor(Number(size) || 16));
    const deckCounts = cloneBlueprintCounts(blueprint.counts);
    if (hasCarriedStickyWild) {
        consumeCompensationToken(deckCounts);
    }
    const tokens = getExpandedDeckTokens(deckCounts);
    const expectedCount = totalCells - (hasCarriedStickyWild ? 1 : 0);
    if (tokens.length !== expectedCount) {
        throw new Error(`Blueprint ${blueprint.id} deck size mismatch: expected ${expectedCount}, got ${tokens.length}`);
    }
    const attempts = 120;
    for (let attempt = 0; attempt < attempts; attempt++) {
        const shuffled = shuffleArray(tokens);
        const plan = new Array(totalCells).fill(null);
        let cursor = 0;
        for (let index = 0; index < totalCells; index++) {
            if (hasCarriedStickyWild && index === carriedIndex) {
                plan[index] = createSpecialBlockData('stickyWild');
                continue;
            }
            plan[index] = createBlockDataFromToken(shuffled[cursor++]);
        }
        if (getLargestNormalClusterSize(plan) < 5) {
            return {
                plan,
                meta: {
                    blueprintId: blueprint.id,
                    templateId: null,
                    transform: null,
                    hasCarriedStickyWild,
                    carriedIndex,
                    compensationRemoved: hasCarriedStickyWild ? true : false,
                    usedFallbackCarryMapping: false
                }
            };
        }
    }
    throw new Error(`Failed to anti-merge scatter blueprint ${blueprint.id}`);
}

function selectTransformedTemplate(templateIds, carriedIndex, hasCarriedStickyWild) {
    const templateId = pickRandomItem(templateIds);
    const template = BLUEPRINT_TEMPLATES[templateId];
    if (!template) {
        throw new Error(`Missing template: ${templateId}`);
    }
    const transformedVariants = D4_TRANSFORMS.map((transformName) => ({
        transformName,
        slots: transformMask(template.mask, transformName, 4)
    }));
    if (!hasCarriedStickyWild || carriedIndex < 0) {
        const picked = pickRandomItem(transformedVariants);
        return {
            templateId,
            transformName: picked.transformName,
            slots: picked.slots,
            usedFallbackCarryMapping: false
        };
    }
    const alignedVariants = transformedVariants.filter((variant) => variant.slots[carriedIndex] === 'W');
    if (alignedVariants.length > 0) {
        const picked = pickRandomItem(alignedVariants);
        return {
            templateId,
            transformName: picked.transformName,
            slots: picked.slots,
            usedFallbackCarryMapping: false
        };
    }
    const fallbackVariant = pickRandomItem(transformedVariants);
    const fallbackSlots = fallbackVariant.slots.slice();
    const downgradeIndex = fallbackSlots.findIndex((slot) => slot === 'W');
    if (downgradeIndex >= 0) {
        fallbackSlots[downgradeIndex] = 'F';
    }
    return {
        templateId,
        transformName: fallbackVariant.transformName,
        slots: fallbackSlots,
        usedFallbackCarryMapping: true
    };
}

function createTemplateBoardPlan(blueprint, size, hasCarriedStickyWild, carriedIndex) {
    const totalCells = Math.max(1, Math.floor(Number(size) || 16));
    const deckCounts = cloneBlueprintCounts(blueprint.counts);
    const removedToken = hasCarriedStickyWild ? consumeCompensationToken(deckCounts) : null;
    const selectedTemplate = selectTransformedTemplate(blueprint.templates, carriedIndex, hasCarriedStickyWild);
    const boardPlan = new Array(totalCells).fill(null);
    const openIndexes = [];
    for (let index = 0; index < totalCells; index++) {
        if (hasCarriedStickyWild && index === carriedIndex) {
            boardPlan[index] = createSpecialBlockData('stickyWild');
            continue;
        }
        openIndexes.push(index);
    }
    const remainingSlots = openIndexes.map((index) => ({ index, slot: selectedTemplate.slots[index] || 'F' }));
    const assignTokenToSlot = (slotKey, tokenFactory) => {
        remainingSlots.forEach((entry) => {
            if (entry.slot !== slotKey || boardPlan[entry.index]) return;
            const token = tokenFactory();
            if (!token) return;
            boardPlan[entry.index] = createBlockDataFromToken(token);
        });
    };
    assignTokenToSlot('SW', () => consumeSpecificTokenFromDeck(deckCounts, 'SW'));
    assignTokenToSlot('W', () => consumeSpecificTokenFromDeck(deckCounts, 'W'));
    assignTokenToSlot('B', () => consumeSpecificTokenFromDeck(deckCounts, 'B'));
    assignTokenToSlot('H1', () => consumeHighestAnimalFromDeck(deckCounts));
    assignTokenToSlot('M1', () => consumeHighestAnimalFromDeck(deckCounts));
    const fillerTokens = shuffleArray(getExpandedDeckTokens(deckCounts));
    let fillerCursor = 0;
    remainingSlots.forEach((entry) => {
        if (boardPlan[entry.index]) return;
        const token = fillerTokens[fillerCursor++] || 'S1';
        boardPlan[entry.index] = createBlockDataFromToken(token);
    });
    if (boardPlan.some((blockData) => !blockData)) {
        throw new Error(`Blueprint ${blueprint.id} template injection left empty cells`);
    }
    return {
        plan: boardPlan,
        meta: {
            blueprintId: blueprint.id,
            templateId: selectedTemplate.templateId,
            transform: selectedTemplate.transformName,
            hasCarriedStickyWild,
            carriedIndex,
            compensationRemoved: Boolean(removedToken),
            compensationToken: removedToken,
            usedFallbackCarryMapping: selectedTemplate.usedFallbackCarryMapping
        }
    };
}

function generateBoardPlan(size = CONFIG.gridSize) {
    const safeSize = Math.max(1, Math.floor(Number(size) || CONFIG.gridSize || 16));
    const carriedIndex = getCarriedStickyWildIndex(safeSize);
    const hasCarriedStickyWild = carriedIndex >= 0;
    const blueprintPick = pickBlueprintId(hasCarriedStickyWild);
    const blueprintId = blueprintPick.blueprintId;
    const blueprint = BLUEPRINTS[blueprintId];
    if (!blueprint) {
        throw new Error(`Unknown blueprint: ${blueprintId}`);
    }
    const generated = blueprint.usesTemplate
        ? createTemplateBoardPlan(blueprint, safeSize, hasCarriedStickyWild, carriedIndex)
        : createScatterBoardPlan(blueprint, safeSize, hasCarriedStickyWild, carriedIndex);
    generated.meta = {
        ...(generated.meta || {}),
        dryStreakBefore: blueprintPick.dryStreakBefore,
        dryStreakAfter: blueprintPick.dryStreakAfter,
        hardPityApplied: blueprintPick.hardPityApplied,
        hardPityDeferredByStickyWild: blueprintPick.hardPityDeferredByStickyWild
    };
    return generated;
}
