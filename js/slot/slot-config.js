// ============================================================
// Slot Game — Configuration, Constants & Data Tables
// Extracted from slot-main.js for maintainability.
// This file MUST be loaded before slot-main.js.
// ============================================================

// --------------- Default Game Config ---------------
const DEFAULT_CONFIG = {
    simpleCoreMode: true,
    gridSize: 16, // 4x4
    bombCount: 0,
    featureFlags: {
        freeSpinEnabled: false,
        bonusGameEnabled: false
    },
    initialBlindBoxCount: 9,
    normalSymbolKeys: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'S10'],
    wishRewardBlindBoxes: 1,
    pairRewardBlindBoxes: 1,
    tripleRewardBlindBoxes: 2,
    fullSetRewardBlindBoxes: 2,
    maxSelectableSameSymbolCount: 3,
    triplePriorityOverPair: true,
    blockPool: {
        normalWeight: 70,
        wildWeight: 20,
        bonusWeight: 10,
        // 猴子符号权重（开到后触发猴子动画 + 转盘奖励）
        monkeyWeight: 6,
        // 黏性百搭权重（本体是百搭，并会在同位置额外停留若干轮）
        stickyWildWeight: 4,
        normalImages: [
            './Texture/BlockImg/Block_1.webp',
            './Texture/BlockImg/Block_2.webp',
            './Texture/BlockImg/Block_3.webp',
            './Texture/BlockImg/Block_4.webp',
            './Texture/BlockImg/Block_5.webp',
            './Texture/BlockImg/Block_6.webp',
            './Texture/BlockImg/Block_7.webp',
            './Texture/BlockImg/Block_8.webp',
            './Texture/BlockImg/Block_9.webp',
            './Texture/BlockImg/Block_10.webp'
        ],
        wildImage: './Texture/BlockImg/Block_Wild.webp',
        bonusImage: './Texture/BlockImg/Block_Bonus.webp',
        // 复用原炸弹素材作为猴子符号显示图
        monkeyImage: './Texture/BlockImg/Block_Bomb.webp',
        // 黏性百搭素材
        stickyWildImage: './Texture/BlockImg/Block_StickWild.webp'
    },
    clusterPayout: {
        minClusterSize: 3,
        baseCoins: 100,
        jackpotThreshold: 10,
        jackpotMultiplier: 12.5,
        multipliers: {
            3: 1,
            4: 1.5,
            5: 2.5,
            6: 3.8,
            7: 5.5,
            8: 7.8,
            9: 10
        },
        // 连线结算给到叠叠乐积木数量
        // 统一使用 stackBlocksByClusterSize，settlementStackBlocksBySize 为向后兼容别名
        stackBlocksByClusterSize: {
            3: 2,
            4: 3,
            5: 4,
            6: 5,
            7: 6,
            8: 7,
            9: 9,
            10: 11
        }
    },
    baseMultiplier: 1.0,
    multiplierStep: 0.2,
    baseBet: 100,
    maxStackForFullProgress: 15,
    bonusTriggerProgressTarget: 8,
    customerSatisfactionTarget: 8,
    customerPortraits: [
        './Texture/story/立绘/游客-1.webp',
        './Texture/story/立绘/游客-2.webp',
        './Texture/story/立绘/游客-3.webp',
        './Texture/story/立绘/游客-4.webp'
    ],
    customerPreferencePool: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'S10'],
    customerPreferenceSymbols: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'S10'],
    // 黏性百搭出现后，仅下一轮继续在同位置出现（共额外1轮）
    stickyWildExtraRounds: 1,
    stackHorizontalOffsetRange: {
        min: -18,
        max: 18
    },
    swayThresholds: {
        low: 2,
        medium: 5,
        high: 8,
        extreme: 11
    },
    destructionSpeeds: {
        total: 80,
        default: 150
    },
    bombWheelSpinMs: 2200,
    bombWheelDelayAfterAnimMs: 1000,
    bombWheelWeights: {
        // 猴子转盘五种奖励权重
        add3Blocks: 30,
        add8Blocks: 20,
        fillToMaxProgress: 15,
        giveBonusSymbol: 20,
        giveNothing: 15
    },
    freeSpin: {
        spinsPerTrigger: 3,
        specialBoxSizeWeights: {
            2: 76,
            3: 19,
            4: 5
        },
        rewardMultiplier: 0.4,
        specialBoxOffsetYBySize: {
            2: 0,
            3: 0,
            4: 0
        },
        specialBoxScaleBySize: {
            1: 0.85,
            2: 0.85,
            3: 0.85,
            4: 0.85
        }
    },
    blueprintWeights: {
        default: {
            BP_01: 18,
            BP_02: 14,
            BP_03: 24,
            BP_04: 6,
            BP_05: 8,
            BP_06: 7,
            BP_07: 3,
            BP_08: 12,
            BP_09: 8
        },
        withCarriedStickyWild: {
            BP_01: 36,
            BP_02: 28,
            BP_03: 28,
            BP_04: 8,
            BP_05: 0,
            BP_06: 0,
            BP_07: 0,
            BP_08: 0,
            BP_09: 0
        },
        hardPityJackpot: {
            BP_06: 70,
            BP_07: 30
        },
        hardPityThreshold: 10
    },
    explosionDelayMs: 600,
    modalDelayMs: 500,
    scrollIntoViewDelayMs: 50
};

// --------------- Default UI Config ---------------
const DEFAULT_UI_CONFIG = {
    cssVars: {
        '--game-ratio-w': '390',
        '--game-ratio-h': '844',
        '--block-size': '72px',
        '--stack-overlap': '-30px',
        '--stack-start-lift': '18px',
        '--stack-clip-bottom-offset': '10px',
        '--mine-scale': '0.9',
        '--grid-board-center-y': '52.5%',
        '--grid-board-gap-x': '0%',
        '--grid-board-gap-y': '0%',
        '--grid-cell-bg-size': '118%',
        '--grid-cell-reward-scale': '0.9',
        '--grid-cell-bottom-offset': '8%',
        '--grid-cell-overlap-x': '0px',
        '--grid-cell-overlap-y': '0px',
        '--restock-tray-top': '-22%',
        '--selection-hint-top': '-4.2rem',
        '--top-bg-left': '-5px',
        '--top-bg-top': '0px',
        '--tower-offset-y': '-80px'
    }
};

// --------------- Config Merge ---------------
const externalConfig = window.APP_CONFIG || {};
const externalGameConfig = externalConfig.game || {};
const externalUiConfig = externalConfig.ui || {};
const externalBlockPool = externalGameConfig.blockPool || {};
const externalClusterPayout = externalGameConfig.clusterPayout || {};
const externalBlueprintWeights = externalGameConfig.blueprintWeights || {};
const fallbackExternalNormalImages = Array.isArray(externalGameConfig.blockImages)
    ? externalGameConfig.blockImages.slice(0, 10)
    : [];

const CONFIG = {
    ...DEFAULT_CONFIG,
    ...externalGameConfig,
    blockPool: {
        ...DEFAULT_CONFIG.blockPool,
        ...externalBlockPool,
        normalImages: (Array.isArray(externalBlockPool.normalImages) && externalBlockPool.normalImages.length > 0)
            ? externalBlockPool.normalImages
            : (fallbackExternalNormalImages.length > 0 ? fallbackExternalNormalImages : DEFAULT_CONFIG.blockPool.normalImages)
    },
    clusterPayout: {
        ...DEFAULT_CONFIG.clusterPayout,
        ...externalClusterPayout,
        multipliers: {
            ...DEFAULT_CONFIG.clusterPayout.multipliers,
            ...((externalClusterPayout && externalClusterPayout.multipliers) || {})
        },
        // 合并 settlementStackBlocksBySize / stackBlocksByClusterSize，优先取外部配置
        stackBlocksByClusterSize: {
            ...DEFAULT_CONFIG.clusterPayout.stackBlocksByClusterSize,
            ...((externalClusterPayout && (externalClusterPayout.settlementStackBlocksBySize || externalClusterPayout.stackBlocksByClusterSize)) || {})
        }
    },
    stackHorizontalOffsetRange: {
        ...DEFAULT_CONFIG.stackHorizontalOffsetRange,
        ...(externalGameConfig.stackHorizontalOffsetRange || {})
    },
    swayThresholds: {
        ...DEFAULT_CONFIG.swayThresholds,
        ...(externalGameConfig.swayThresholds || {})
    },
    bombWheelWeights: {
        ...DEFAULT_CONFIG.bombWheelWeights,
        ...(externalGameConfig.bombWheelWeights || {})
    },
    freeSpin: {
        ...DEFAULT_CONFIG.freeSpin,
        ...(externalGameConfig.freeSpin || {}),
        specialBoxSizeWeights: {
            ...DEFAULT_CONFIG.freeSpin.specialBoxSizeWeights,
            ...((externalGameConfig.freeSpin && externalGameConfig.freeSpin.specialBoxSizeWeights) || {})
        },
        specialBoxOffsetYBySize: {
            ...DEFAULT_CONFIG.freeSpin.specialBoxOffsetYBySize,
            ...((externalGameConfig.freeSpin && externalGameConfig.freeSpin.specialBoxOffsetYBySize) || {})
        },
        specialBoxScaleBySize: {
            ...DEFAULT_CONFIG.freeSpin.specialBoxScaleBySize,
            ...((externalGameConfig.freeSpin && externalGameConfig.freeSpin.specialBoxScaleBySize) || {})
        }
    },
    blueprintWeights: {
        ...DEFAULT_CONFIG.blueprintWeights,
        ...externalBlueprintWeights,
        default: {
            ...DEFAULT_CONFIG.blueprintWeights.default,
            ...((externalBlueprintWeights && externalBlueprintWeights.default) || {})
        },
        withCarriedStickyWild: {
            ...DEFAULT_CONFIG.blueprintWeights.withCarriedStickyWild,
            ...((externalBlueprintWeights && externalBlueprintWeights.withCarriedStickyWild) || {})
        },
        hardPityJackpot: {
            ...DEFAULT_CONFIG.blueprintWeights.hardPityJackpot,
            ...((externalBlueprintWeights && externalBlueprintWeights.hardPityJackpot) || {})
        }
    },
    destructionSpeeds: {
        ...DEFAULT_CONFIG.destructionSpeeds,
        ...(externalGameConfig.destructionSpeeds || {})
    },
    featureFlags: {
        ...DEFAULT_CONFIG.featureFlags,
        ...(externalGameConfig.featureFlags || {})
    }
};

const resolveSatisfactionTarget = () => {
    const toNumber = (value) => Number.isFinite(Number(value)) ? Number(Number(value)) : NaN;
    const custom = toNumber(CONFIG.customerSatisfactionTarget);
    const legacy = toNumber(CONFIG.bonusTriggerProgressTarget);
    const fallback = toNumber(DEFAULT_CONFIG.customerSatisfactionTarget);
    const candidate = Number.isFinite(custom) ? custom : (Number.isFinite(legacy) ? legacy : fallback);
    return Math.max(1, Math.floor(Number.isFinite(candidate) ? candidate : DEFAULT_CONFIG.customerSatisfactionTarget));
};

const resolvedSatisfactionTarget = resolveSatisfactionTarget();
CONFIG.customerSatisfactionTarget = resolvedSatisfactionTarget;
CONFIG.bonusTriggerProgressTarget = resolvedSatisfactionTarget;

// --------------- Config Sanitization ---------------
CONFIG.gridSize = Math.max(1, Math.floor(Number(CONFIG.gridSize) || DEFAULT_CONFIG.gridSize));
CONFIG.simpleCoreMode = CONFIG.simpleCoreMode !== false;
CONFIG.initialBlindBoxCount = Math.max(
    0,
    Math.floor(Number(CONFIG.initialBlindBoxCount) || DEFAULT_CONFIG.initialBlindBoxCount)
);
CONFIG.normalSymbolKeys = (Array.isArray(CONFIG.normalSymbolKeys) && CONFIG.normalSymbolKeys.length > 0
    ? CONFIG.normalSymbolKeys
    : DEFAULT_CONFIG.normalSymbolKeys
)
    .map((value) => String(value || '').trim())
    .filter((value, index, array) => value && array.indexOf(value) === index);
if (CONFIG.normalSymbolKeys.length <= 0) {
    CONFIG.normalSymbolKeys = [...DEFAULT_CONFIG.normalSymbolKeys];
}
CONFIG.wishRewardBlindBoxes = Math.max(
    0,
    Math.floor(Number(CONFIG.wishRewardBlindBoxes) || DEFAULT_CONFIG.wishRewardBlindBoxes)
);
CONFIG.pairRewardBlindBoxes = Math.max(
    0,
    Math.floor(Number(CONFIG.pairRewardBlindBoxes) || DEFAULT_CONFIG.pairRewardBlindBoxes)
);
CONFIG.tripleRewardBlindBoxes = Math.max(
    0,
    Math.floor(Number(CONFIG.tripleRewardBlindBoxes) || DEFAULT_CONFIG.tripleRewardBlindBoxes)
);
CONFIG.fullSetRewardBlindBoxes = Math.max(
    0,
    Math.floor(Number(CONFIG.fullSetRewardBlindBoxes) || DEFAULT_CONFIG.fullSetRewardBlindBoxes)
);
CONFIG.maxSelectableSameSymbolCount = Math.max(
    2,
    Math.floor(Number(CONFIG.maxSelectableSameSymbolCount) || DEFAULT_CONFIG.maxSelectableSameSymbolCount)
);
CONFIG.triplePriorityOverPair = CONFIG.triplePriorityOverPair !== false;
CONFIG.featureFlags = {
    freeSpinEnabled: Boolean(CONFIG.featureFlags && CONFIG.featureFlags.freeSpinEnabled),
    bonusGameEnabled: Boolean(CONFIG.featureFlags && CONFIG.featureFlags.bonusGameEnabled)
};
CONFIG.bombCount = Math.min(
    CONFIG.gridSize,
    Math.max(0, Math.floor(Number(CONFIG.bombCount) || DEFAULT_CONFIG.bombCount))
);
CONFIG.bonusTriggerProgressTarget = Math.max(
    1,
    Math.floor(Number(CONFIG.bonusTriggerProgressTarget) || DEFAULT_CONFIG.bonusTriggerProgressTarget)
);
CONFIG.blockPool.normalWeight = Number.isFinite(Number(CONFIG.blockPool.normalWeight))
    ? Math.max(0, Number(CONFIG.blockPool.normalWeight))
    : DEFAULT_CONFIG.blockPool.normalWeight;
CONFIG.blockPool.wildWeight = Number.isFinite(Number(CONFIG.blockPool.wildWeight))
    ? Math.max(0, Number(CONFIG.blockPool.wildWeight))
    : DEFAULT_CONFIG.blockPool.wildWeight;
CONFIG.blockPool.bonusWeight = Number.isFinite(Number(CONFIG.blockPool.bonusWeight))
    ? Math.max(0, Number(CONFIG.blockPool.bonusWeight))
    : DEFAULT_CONFIG.blockPool.bonusWeight;
CONFIG.blockPool.monkeyWeight = Number.isFinite(Number(CONFIG.blockPool.monkeyWeight))
    ? Math.max(0, Number(CONFIG.blockPool.monkeyWeight))
    : DEFAULT_CONFIG.blockPool.monkeyWeight;
CONFIG.blockPool.stickyWildWeight = Number.isFinite(Number(CONFIG.blockPool.stickyWildWeight))
    ? Math.max(0, Number(CONFIG.blockPool.stickyWildWeight))
    : DEFAULT_CONFIG.blockPool.stickyWildWeight;
if (!Array.isArray(CONFIG.blockPool.normalImages) || CONFIG.blockPool.normalImages.length === 0) {
    CONFIG.blockPool.normalImages = [...DEFAULT_CONFIG.blockPool.normalImages];
}
if (!CONFIG.blockPool.wildImage) {
    CONFIG.blockPool.wildImage = DEFAULT_CONFIG.blockPool.wildImage;
}
if (!CONFIG.blockPool.bonusImage) {
    CONFIG.blockPool.bonusImage = DEFAULT_CONFIG.blockPool.bonusImage;
}
if (!CONFIG.blockPool.monkeyImage) {
    CONFIG.blockPool.monkeyImage = DEFAULT_CONFIG.blockPool.monkeyImage;
}
if (!CONFIG.blockPool.stickyWildImage) {
    CONFIG.blockPool.stickyWildImage = DEFAULT_CONFIG.blockPool.stickyWildImage;
}
CONFIG.stickyWildExtraRounds = Math.max(
    0,
    Math.floor(Number(CONFIG.stickyWildExtraRounds) || DEFAULT_CONFIG.stickyWildExtraRounds)
);
CONFIG.bombWheelDelayAfterAnimMs = Number.isFinite(Number(CONFIG.bombWheelDelayAfterAnimMs))
    ? Math.max(0, Math.floor(Number(CONFIG.bombWheelDelayAfterAnimMs)))
    : DEFAULT_CONFIG.bombWheelDelayAfterAnimMs;
CONFIG.clusterPayout.minClusterSize = Math.max(
    1,
    Math.floor(Number(CONFIG.clusterPayout.minClusterSize) || DEFAULT_CONFIG.clusterPayout.minClusterSize)
);
CONFIG.clusterPayout.baseCoins = Number.isFinite(Number(CONFIG.clusterPayout.baseCoins))
    ? Math.max(0, Number(CONFIG.clusterPayout.baseCoins))
    : DEFAULT_CONFIG.clusterPayout.baseCoins;
CONFIG.clusterPayout.jackpotThreshold = Math.max(
    CONFIG.clusterPayout.minClusterSize,
    Math.floor(Number(CONFIG.clusterPayout.jackpotThreshold) || DEFAULT_CONFIG.clusterPayout.jackpotThreshold)
);
CONFIG.clusterPayout.jackpotMultiplier = Number.isFinite(Number(CONFIG.clusterPayout.jackpotMultiplier))
    ? Math.max(0, Number(CONFIG.clusterPayout.jackpotMultiplier))
    : DEFAULT_CONFIG.clusterPayout.jackpotMultiplier;

const safeClusterMultipliers = {};
Object.entries(CONFIG.clusterPayout.multipliers || {}).forEach(([sizeKey, value]) => {
    const size = Math.floor(Number(sizeKey));
    if (size < CONFIG.clusterPayout.minClusterSize || size >= CONFIG.clusterPayout.jackpotThreshold) return;
    const numeric = Number(value);
    safeClusterMultipliers[size] = Number.isFinite(numeric) ? Math.max(0, numeric) : 0;
});
CONFIG.clusterPayout.multipliers = safeClusterMultipliers;

// 统一 stackBlocksByClusterSize / settlementStackBlocksBySize
const safeSettlementStackBlocksBySize = {};
const rawSettlementStackBlocksBySize = (
    CONFIG.clusterPayout.stackBlocksByClusterSize
    || {}
);
Object.entries(rawSettlementStackBlocksBySize).forEach(([sizeKey, value]) => {
    const size = Math.floor(Number(sizeKey));
    if (!Number.isFinite(size) || size < 1) return;
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return;
    safeSettlementStackBlocksBySize[size] = Math.max(0, Math.floor(numeric));
});
if (Object.keys(safeSettlementStackBlocksBySize).length <= 0) {
    safeSettlementStackBlocksBySize[CONFIG.clusterPayout.minClusterSize] = 1;
}
// 两个字段指向同一份数据，保持向后兼容
CONFIG.clusterPayout.settlementStackBlocksBySize = { ...safeSettlementStackBlocksBySize };
CONFIG.clusterPayout.stackBlocksByClusterSize = { ...safeSettlementStackBlocksBySize };

CONFIG.blueprintWeights.default = sanitizeBlueprintWeightMap(
    CONFIG.blueprintWeights.default,
    DEFAULT_CONFIG.blueprintWeights.default
);
CONFIG.blueprintWeights.withCarriedStickyWild = sanitizeBlueprintWeightMap(
    CONFIG.blueprintWeights.withCarriedStickyWild,
    DEFAULT_CONFIG.blueprintWeights.withCarriedStickyWild
);
CONFIG.blueprintWeights.hardPityJackpot = sanitizeBlueprintWeightMap(
    CONFIG.blueprintWeights.hardPityJackpot,
    DEFAULT_CONFIG.blueprintWeights.hardPityJackpot
);
CONFIG.blueprintWeights.hardPityThreshold = Math.max(
    0,
    Math.floor(Number(CONFIG.blueprintWeights.hardPityThreshold) || DEFAULT_CONFIG.blueprintWeights.hardPityThreshold)
);

function sanitizeBlueprintWeightMap(weightMap = {}, fallbackWeightMap = {}) {
    const safeMap = {};
    Object.keys(fallbackWeightMap).forEach((blueprintId) => {
        const rawWeight = Number((weightMap || {})[blueprintId]);
        const fallbackWeight = Math.max(0, Number(fallbackWeightMap[blueprintId]) || 0);
        safeMap[blueprintId] = Number.isFinite(rawWeight) ? Math.max(0, rawWeight) : fallbackWeight;
    });
    return safeMap;
}

function hasPositiveWeight(weightMap = {}) {
    return Object.values(weightMap || {}).some((value) => Number(value) > 0);
}

// --------------- Symbol & Payout Tables ---------------
// NORMAL_SYMBOL_ORDER must match CONFIG.normalSymbolKeys for payout/blueprint logic
const NORMAL_SYMBOL_ORDER = CONFIG.normalSymbolKeys.slice(0, 5);
const NORMAL_SYMBOL_VALUE_ORDER = NORMAL_SYMBOL_ORDER.slice().reverse();
const MAX_STACK_BLOCKS_PER_SETTLEMENT_EVENT = 30;
const STACK_BLOCK_MULTI_FLY_STAGGER_MS = 35;
const SYMBOL_IMAGE_FALLBACKS = {
    S1: './Texture/BlockImg/Block_1.webp',
    S2: './Texture/BlockImg/Block_2.webp',
    S3: './Texture/BlockImg/Block_3.webp',
    S4: './Texture/BlockImg/Block_4.webp',
    S5: './Texture/BlockImg/Block_5.webp',
    S6: './Texture/BlockImg/Block_6.webp',
    S7: './Texture/BlockImg/Block_7.webp',
    S8: './Texture/BlockImg/Block_8.webp',
    S9: './Texture/BlockImg/Block_9.webp',
    S10: './Texture/BlockImg/Block_10.webp'
};
const MAIN_BOARD_PAYOUTS = {
    S1: { 3: 120, 4: 180, 5: 300, 6: 460, 7: 660, 8: 940, 9: 1200, 10: 1500 },
    S2: { 3: 170, 4: 260, 5: 430, 6: 650, 7: 940, 8: 1330, 9: 1700, 10: 2130 },
    S3: { 3: 240, 4: 360, 5: 600, 6: 910, 7: 1320, 8: 1870, 9: 2400, 10: 3000 },
    S4: { 3: 340, 4: 510, 5: 850, 6: 1290, 7: 1870, 8: 2650, 9: 3400, 10: 4250 },
    S5: { 3: 480, 4: 720, 5: 1200, 6: 1820, 7: 2640, 8: 3740, 9: 4800, 10: 6000 }
};

// --------------- Blueprint Definitions ---------------
const BLUEPRINTS = {
    BP_01: {
        id: 'BP_01',
        counts: { S1: 7, S2: 5, S3: 3, S4: 1, S5: 0, W: 0, SW: 0, B: 0 },
        usesTemplate: false
    },
    BP_02: {
        id: 'BP_02',
        counts: { S1: 5, S2: 5, S3: 4, S4: 2, S5: 0, W: 0, SW: 0, B: 0 },
        usesTemplate: false
    },
    BP_03: {
        id: 'BP_03',
        counts: { S1: 4, S2: 4, S3: 3, S4: 3, S5: 1, W: 1, SW: 0, B: 0 },
        usesTemplate: true,
        templates: ['TPL_03_A']
    },
    BP_04: {
        id: 'BP_04',
        counts: { S1: 2, S2: 3, S3: 3, S4: 4, S5: 2, W: 2, SW: 0, B: 0 },
        usesTemplate: true,
        templates: ['TPL_04_A']
    },
    BP_05: {
        id: 'BP_05',
        counts: { S1: 3, S2: 3, S3: 3, S4: 4, S5: 1, W: 1, SW: 1, B: 0 },
        usesTemplate: true,
        templates: ['TPL_05_A']
    },
    BP_06: {
        id: 'BP_06',
        counts: { S1: 5, S2: 4, S3: 3, S4: 1, S5: 0, W: 0, SW: 0, B: 3 },
        usesTemplate: true,
        templates: ['TPL_06_A']
    },
    BP_07: {
        id: 'BP_07',
        counts: { S1: 4, S2: 3, S3: 3, S4: 2, S5: 1, W: 2, SW: 0, B: 1 },
        usesTemplate: true,
        templates: ['TPL_07_A']
    },
    BP_08: {
        id: 'BP_08',
        counts: { S1: 5, S2: 4, S3: 3, S4: 2, S5: 1, W: 0, SW: 0, B: 1 },
        usesTemplate: true,
        templates: ['TPL_08_A']
    },
    BP_09: {
        id: 'BP_09',
        counts: { S1: 4, S2: 4, S3: 3, S4: 2, S5: 1, W: 0, SW: 0, B: 2 },
        usesTemplate: true,
        templates: ['TPL_09_A']
    }
};

const BLUEPRINT_TEMPLATES = {
    TPL_03_A: {
        id: 'TPL_03_A',
        blueprintId: 'BP_03',
        mask: [
            ['F', 'F', 'F', 'F'],
            ['F', 'H1', 'H1', 'F'],
            ['F', 'W', 'H1', 'F'],
            ['F', 'F', 'F', 'F']
        ]
    },
    TPL_04_A: {
        id: 'TPL_04_A',
        blueprintId: 'BP_04',
        mask: [
            ['H1', 'H1', 'W', 'M1'],
            ['F', 'H1', 'H1', 'M1'],
            ['F', 'F', 'W', 'M1'],
            ['F', 'F', 'F', 'F']
        ]
    },
    TPL_05_A: {
        id: 'TPL_05_A',
        blueprintId: 'BP_05',
        mask: [
            ['SW', 'F', 'F', 'F'],
            ['H1', 'H1', 'F', 'F'],
            ['F', 'H1', 'F', 'F'],
            ['F', 'F', 'F', 'F']
        ]
    },
    TPL_06_A: {
        id: 'TPL_06_A',
        blueprintId: 'BP_06',
        mask: [
            ['B', 'F', 'F', 'B'],
            ['F', 'M1', 'M1', 'F'],
            ['F', 'F', 'M1', 'F'],
            ['F', 'F', 'F', 'B']
        ]
    },
    TPL_07_A: {
        id: 'TPL_07_A',
        blueprintId: 'BP_07',
        mask: [
            ['F', 'F', 'F', 'F'],
            ['B', 'H1', 'H1', 'F'],
            ['W', 'H1', 'W', 'F'],
            ['F', 'F', 'F', 'F']
        ]
    },
    TPL_08_A: {
        id: 'TPL_08_A',
        blueprintId: 'BP_08',
        mask: [
            ['F', 'F', 'B', 'F'],
            ['F', 'H1', 'H1', 'F'],
            ['F', 'F', 'M1', 'F'],
            ['F', 'F', 'F', 'F']
        ]
    },
    TPL_09_A: {
        id: 'TPL_09_A',
        blueprintId: 'BP_09',
        mask: [
            ['B', 'F', 'F', 'F'],
            ['F', 'H1', 'H1', 'F'],
            ['F', 'F', 'F', 'B'],
            ['F', 'M1', 'F', 'F']
        ]
    }
};

const D4_TRANSFORMS = [
    'identity',
    'rotate90',
    'rotate180',
    'rotate270',
    'flipX',
    'flipY',
    'diagMain',
    'diagAnti'
];

const BONUS_DRY_STREAK_STORAGE_KEY = 'wynnesZoo.bonusDryStreak';

// --------------- UI Config Merge ---------------
const UI_CONFIG = {
    ...DEFAULT_UI_CONFIG,
    ...externalUiConfig,
    cssVars: {
        ...DEFAULT_UI_CONFIG.cssVars,
        ...(externalUiConfig.cssVars || {})
    }
};

function applyUiCssVars(cssVars) {
    if (!cssVars) return;
    Object.entries(cssVars).forEach(([key, value]) => {
        document.documentElement.style.setProperty(key, String(value));
    });
}

applyUiCssVars(UI_CONFIG.cssVars);

// --------------- Cell / State Constants ---------------
const CELL_SAFE = 0;
const CELL_BOMB = 1;

// --------------- Monkey Wheel Data ---------------
const BOMB_WHEEL_OPTIONS = [
    { id: 'add3Blocks',        shortLabel: '+3',    resultText: 'Reward: +3 satisfaction' },
    { id: 'add8Blocks',        shortLabel: '+8',    resultText: 'Reward: +8 satisfaction' },
    { id: 'fillToMaxProgress', shortLabel: 'MAX',   resultText: 'Reward: fill satisfaction to max' },
    { id: 'giveBonusSymbol',   shortLabel: 'BONUS', resultText: 'Reward: gain 1 BONUS symbol' },
    { id: 'giveNothing',       shortLabel: '0',     resultText: 'Reward: no bonus' }
];

const BOMB_WHEEL_COLOR_MAP = {
    add3Blocks: '#55c57a',
    add8Blocks: '#33b5ff',
    fillToMaxProgress: '#ffd166',
    giveBonusSymbol: '#ff7ad1',
    giveNothing: '#9aa3ad'
};

// --------------- Monkey Animation Frames ---------------
const BOMB_MONKEY_ANIM_FRAMES = [
    './Texture/UI/MonkeyAnim/frame-2.png',
    './Texture/UI/MonkeyAnim/frame-3.png',
    './Texture/UI/MonkeyAnim/frame-4.png',
    './Texture/UI/MonkeyAnim/frame-5.png',
    './Texture/UI/MonkeyAnim/frame-6.png',
    './Texture/UI/MonkeyAnim/frame-7.png',
    './Texture/UI/MonkeyAnim/frame-8.png'
];

// --------------- Grid Box Assets ---------------
const GRID_BOX_UNOPEN_IMAGE_SRC = './Texture/UI/FigmaSlot/blind-box-stock.webp';
const GRID_BOX_OPEN_IMAGE_SRC = './Texture/Icon/Icon_Box_Open.png';
const GRID_BOX_FALLBACK_ASPECT = 1; // Icon_Box_UnOpen/Open are square assets (512x512).

// --------------- Monkey Animation Timing ---------------
const BOMB_MONKEY_ANIM_FPS = 15;
const BOMB_MONKEY_FRAME_MS = Math.max(40, Math.round(1000 / BOMB_MONKEY_ANIM_FPS));
const BOMB_MONKEY_LAST_FRAME_HOLD_MS = Math.round(BOMB_MONKEY_FRAME_MS * 2.2);

// --------------- Success Multiplier Table ---------------
const SUCCESS_MULTIPLIER_TABLE = {
    1: 1.1,
    2: 1.2,
    3: 1.4,
    4: 1.6,
    5: 1.9,
    6: 2.2,
    7: 2.6,
    8: 3.1,
    9: 3.7,
    10: 4.4,
    11: 5.2,
    12: 6.1,
    13: 7.1,
    14: 8.2,
    15: 9.4,
    16: 10.7
};
const MAX_SUCCESS_FOR_MULTIPLIER = 16;

// --------------- Board Entrance Timing ---------------
const BOARD_ROW_ENTRANCE_STAGGER_MS = 80;
const BOARD_COL_ENTRANCE_STAGGER_MS = 20;
const BOARD_ENTRANCE_DURATION_MS = 550;
