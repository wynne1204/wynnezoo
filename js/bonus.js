(function initBonusModule(globalScope) {
    'use strict';

    let statusBarTop = null;
    let mainStage = null;
    let controlPanel = null;
    let bonusScreen = null;
    let bonusGridBoard = null;
    let bonusSpinBtn = null;
    let bonusSpinMeta = null;
    let bonusSpinsLeftInline = null;
    let bonusTotalReward = null;
    let bonusChestCards = [];
    let bonusChestRow = null;
    let bonusTriggerStackRow = null;
    let bonusTriggerStackCards = [];
    let sceneFade = null;
    let gameContainer = null;
    let bonusResultOverlay = null;
    let bonusResultReward = null;
    let bonusResultCollectBtn = null;
    let bonusParticlesCanvas = null;
    let freeSpinHud = null;

    let bonusChestCardMap = new Map();
    let bonusTriggerStackCardMap = new Map();

    let createBombWheel = null;
    let removeBombWheel = () => {};
    let highlightWinningSegment = () => {};
    let showModal = () => {};
    let waitMs = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    let waitRaf = () => new Promise((resolve) => requestAnimationFrame(resolve));
    let bonusResponsiveLayoutFrame = 0;
    let bonusResponsiveBindingsReady = false;

    let createFloatingText = (x, y, text) => {
        const effectsApi = globalScope.GameEffects;
        if (effectsApi && typeof effectsApi.createFloatingText === 'function') {
            effectsApi.createFloatingText(x, y, text);
            return;
        }
        const el = document.createElement('div');
        el.classList.add('floating-text');
        el.textContent = text;
        el.style.left = `${x}px`;
        el.style.top = `${y}px`;
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 1000);
    };

    function init(deps = {}) {
        statusBarTop = deps.statusBarTop || statusBarTop;
        mainStage = deps.mainStage || mainStage;
        controlPanel = deps.controlPanel || controlPanel;
        bonusScreen = deps.bonusScreen || bonusScreen;
        bonusGridBoard = deps.bonusGridBoard || bonusGridBoard;
        bonusSpinBtn = deps.bonusSpinBtn || bonusSpinBtn;
        bonusSpinMeta = deps.bonusSpinMeta || bonusSpinMeta;
        bonusSpinsLeftInline = deps.bonusSpinsLeftInline || bonusSpinsLeftInline;
        bonusTotalReward = deps.bonusTotalReward || bonusTotalReward;
        bonusChestCards = Array.isArray(deps.bonusChestCards) ? deps.bonusChestCards : bonusChestCards;
        bonusChestRow = deps.bonusChestRow || bonusChestRow;
        bonusTriggerStackRow = deps.bonusTriggerStackRow || bonusTriggerStackRow;
        bonusTriggerStackCards = Array.isArray(deps.bonusTriggerStackCards) ? deps.bonusTriggerStackCards : bonusTriggerStackCards;
        sceneFade = deps.sceneFade || sceneFade;
        gameContainer = deps.gameContainer || gameContainer;
        bonusResultOverlay = deps.bonusResultOverlay || bonusResultOverlay;
        bonusResultReward = deps.bonusResultReward || bonusResultReward;
        bonusResultCollectBtn = deps.bonusResultCollectBtn || bonusResultCollectBtn;
        bonusParticlesCanvas = deps.bonusParticlesCanvas || bonusParticlesCanvas;
        freeSpinHud = deps.freeSpinHud || freeSpinHud;

        bonusChestCardMap = (deps.bonusChestCardMap instanceof Map)
            ? deps.bonusChestCardMap
            : new Map(
                bonusChestCards
                    .filter((card) => card && card.dataset && card.dataset.chestId)
                    .map((card) => [card.dataset.chestId, card])
            );

        bonusTriggerStackCardMap = (deps.bonusTriggerStackCardMap instanceof Map)
            ? deps.bonusTriggerStackCardMap
            : new Map(
                bonusTriggerStackCards
                    .filter((card) => card && card.dataset && card.dataset.stackId)
                    .map((card) => [card.dataset.stackId, card])
            );

        if (typeof deps.createBombWheel === 'function') {
            createBombWheel = deps.createBombWheel;
        }
        if (typeof deps.removeBombWheel === 'function') {
            removeBombWheel = deps.removeBombWheel;
        }
        if (typeof deps.highlightWinningSegment === 'function') {
            highlightWinningSegment = deps.highlightWinningSegment;
        }
        if (typeof deps.showModal === 'function') {
            showModal = deps.showModal;
        }
        if (typeof deps.waitMs === 'function') {
            waitMs = deps.waitMs;
        }
        if (typeof deps.waitRaf === 'function') {
            waitRaf = deps.waitRaf;
        }
        if (typeof deps.createFloatingText === 'function') {
            createFloatingText = deps.createFloatingText;
        }

        updateBonusChestRewardLabels();
        ensureBonusResponsiveBindings();
        scheduleBonusResponsiveLayout();
    }

    function ensureBonusResponsiveBindings() {
        if (bonusResponsiveBindingsReady) return;

        window.addEventListener('resize', scheduleBonusResponsiveLayout, { passive: true });
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', scheduleBonusResponsiveLayout, { passive: true });
        }
        if (document.fonts && typeof document.fonts.ready?.then === 'function') {
            document.fonts.ready
                .then(() => {
                    scheduleBonusResponsiveLayout();
                })
                .catch(() => {});
        }

        bonusResponsiveBindingsReady = true;
    }

    function scheduleBonusResponsiveLayout() {
        if (bonusResponsiveLayoutFrame) return;
        bonusResponsiveLayoutFrame = requestAnimationFrame(() => {
            bonusResponsiveLayoutFrame = 0;
            updateBonusResponsiveLayout();
        });
    }

    function parsePixelValue(value, fallback = 0) {
        const parsed = Number.parseFloat(String(value || '').replace('px', ''));
        return Number.isFinite(parsed) ? parsed : fallback;
    }

    function updateBonusResponsiveLayout() {
        if (!bonusScreen) return;

        const rect = bonusScreen.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return;

        const widthScale = rect.width / 390;
        const heightScale = rect.height / 844;
        const nextScale = clampNumber(Math.min(widthScale, heightScale, 1), 0.72, 1);

        bonusScreen.style.setProperty('--bonus-scale', nextScale.toFixed(4));
        updateBonusBoardLayout(rect);
    }

    function updateBonusBoardLayout(screenRect = null) {
        if (!bonusScreen || !bonusGridBoard) return;

        const gridWrap = bonusGridBoard.parentElement;
        if (!gridWrap) return;

        const wrapRect = gridWrap.getBoundingClientRect();
        const activeScreenRect = screenRect || bonusScreen.getBoundingClientRect();
        if (wrapRect.width <= 0 || wrapRect.height <= 0 || activeScreenRect.width <= 0 || activeScreenRect.height <= 0) {
            return;
        }

        const wrapStyle = window.getComputedStyle(gridWrap);
        const wrapPadTop = parsePixelValue(wrapStyle.paddingTop, 0);
        const wrapPadBottom = parsePixelValue(wrapStyle.paddingBottom, 0);
        const wrapPadLeft = parsePixelValue(wrapStyle.paddingLeft, 0);
        const wrapPadRight = parsePixelValue(wrapStyle.paddingRight, 0);
        const innerWidth = wrapRect.width - wrapPadLeft - wrapPadRight;
        const innerHeight = wrapRect.height - wrapPadTop - wrapPadBottom;

        const computedStyle = window.getComputedStyle(bonusGridBoard);
        const gap = parsePixelValue(computedStyle.columnGap || computedStyle.gap, 0);
        const columns = Math.max(1, Number(BONUS_GAME_CONFIG.columns) || 4);
        const rows = Math.max(1, Number(BONUS_STATE.boardRows) || Number(BONUS_GAME_CONFIG.initialRows) || 4);
        const maxCellByWidth = (innerWidth - (gap * (columns - 1))) / columns;
        const maxCellByHeight = (innerHeight - (gap * (rows - 1))) / rows;
        const cellSize = Math.min(maxCellByWidth, maxCellByHeight);

        if (!Number.isFinite(cellSize) || cellSize <= 0) {
            bonusScreen.style.setProperty('--bonus-board-max-width', `${Math.max(0, innerWidth)}px`);
            return;
        }

        const boardWidth = Math.min(
            innerWidth,
            (cellSize * columns) + (gap * (columns - 1))
        );
        bonusScreen.style.setProperty('--bonus-board-max-width', `${Math.max(0, boardWidth)}px`);
    }

    function getBonusChestCardById(chestId) {
        if (!chestId) return null;
        return bonusChestCardMap.get(chestId) || null;
    }

    function getBonusTriggerStackCardById(stackId) {
        if (!stackId) return null;
        return bonusTriggerStackCardMap.get(stackId) || null;
    }

    function createZeroChestMap() {
        return {
            monkey: 0,
            tiger: 0,
            panda: 0
        };
    }

    function formatBonusChestReward(value) {
        return '💎+' + Math.max(0, Math.floor(Number(value) || 0)).toLocaleString();
    }

    function updateBonusChestRewardLabels() {
        bonusChestCards.forEach((card) => {
            if (!card || !card.dataset) return;
            const chestId = String(card.dataset.chestId || '');
            const valueEl = card.querySelector('.bonus-chest-value');
            if (!valueEl || !BONUS_GAME_CONFIG.chestRewards[chestId]) return;
            valueEl.textContent = formatBonusChestReward(BONUS_GAME_CONFIG.chestRewards[chestId]);
        });
    }
const BONUS_STATE = {
    active: false,
    isSpinning: false,
    spinsLeft: 0,
    totalSpins: 0,
    baseCashoutScore: 0,
    baseSummaryMessage: '',
    totalReward: 0,
    diamondReward: 0,
    chestReward: 0,
    chestProgress: createZeroChestMap(),
    chestAwards: createZeroChestMap(),
    boardRows: 4,
    unlockedSpecials: {
        add: false,
        chest: true,
        magnet: false
    },
    collapsedStacks: {
        add: false,
        chest: false
    },
    triggerStacks: {
        add: 0,
        chest: 0
    },
    cells: [],
    rollingIntervals: [],
    stopTimeouts: [],
    finishTimer: null,
    onFinish: null
};

const BONUS_CHEST_IDS = ['monkey', 'tiger', 'panda'];
const BONUS_GAME_CONFIG = {
    columns: 4,
    initialRows: 4,
    maxRows: 6,
    maxSpins: 3,
    spinRollMs: 900,
    spinTickMs: 70,
    stopColumnStaggerMs: 220,
    stopCellStaggerMs: 0,
    stopJitterMs: 16,
    baseSpawnChance: 0.78,
    minSpawnChance: 0.18,
    maxNewCellsPerSpin: 3,
    newCellCountWeights: [
        { count: 1, weight: 60 },
        { count: 2, weight: 28 },
        { count: 3, weight: 12 }
    ],
    specialCellChance: 0.28,
    triggerBlockChance: 0.22,
    triggerTypeWeights: {
        add: 52,
        chest: 48
    },
    stackCollapseBaseChance: 0.04,
    stackCollapsePerLayerChance: 0.08,
    stackCollapseMaxChance: 0.38,
    simultaneousUnlockChance: 0.14,
    maxStackPreviewLayers: 6,
    chestRewards: {
        monkey: 12,
        tiger: 36,
        panda: 128
    },
    specialTypeWeights: {
        magnet: 100,
        add: 40,
        chest: 70
    },
    diamondWeights: [
        { value: 4, weight: 34 },
        { value: 8, weight: 28 },
        { value: 12, weight: 20 },
        { value: 20, weight: 12 },
        { value: 36, weight: 6 }
    ],
    addValueWeights: [
        { value: 2, weight: 40 },
        { value: 4, weight: 32 },
        { value: 6, weight: 20 },
        { value: 10, weight: 8 }
    ],
    frontLoadedChestSpins: 8,
    earlySpecialCellChance: 0.42,
    lateSpecialCellChance: 0.2,
    earlyTriggerBlockChance: 0.08,
    lateTriggerBlockChance: 0.18,
    earlySpecialTypeWeights: {
        magnet: 10,
        add: 14,
        chest: 320
    },
    lateSpecialTypeWeights: {
        magnet: 108,
        add: 54,
        chest: 82
    },
    earlyChestProgressWeights: {
        0: 150,
        1: 126,
        2: 30
    },
    earlyChestIdWeights: {
        monkey: 100,
        tiger: 82,
        panda: 72
    },
    earlyChestFinishPenaltyById: {
        monkey: 0.72,
        tiger: 0.24,
        panda: 0.06
    },
    lateChestBaseWeights: {
        monkey: 56,
        tiger: 30,
        panda: 20
    },
    lateChestFinishBoost: {
        monkey: 110,
        tiger: 20,
        panda: 4
    },
    lateChestNearMissPenaltyById: {
        monkey: 1,
        tiger: 0.26,
        panda: 0.05
    },
    jackpotChestId: 'panda',
    jackpotNearMissProgress: 2,
    jackpotNearMissPenalty: 0.18,
    specialRevealMs: 760,
    specialResolveGapMs: 320
};
const BONUS_CHEST_META = {
    monkey: { symbol: '🐵', name: '猴猴宝箱', animalName: '猴猴' },
    tiger: { symbol: '🐯', name: '虎虎宝箱', animalName: '虎虎' },
    panda: { symbol: '🐼', name: '胖达宝箱', animalName: '胖达' }
};
const BONUS_SPECIAL_META = {
    add: { symbol: '✨', label: 'Add' },
    chest: { symbol: '🎁', label: 'Chest' },
    magnet: { symbol: '🧲', label: 'Magnet' }
};
const BONUS_TRIGGER_STACK_META = {
    add: {
        stackId: 'add',
        giftImage: './Texture/Icon/Giftpack1.png',
        giftLabel: 'Giftpack1',
        tokenLabel: '✨',
        unlockedText: '加分果解锁！',
        collapseText: '棋盘扩大'
    },
    chest: {
        stackId: 'chest',
        giftImage: './Texture/Icon/Giftpack2.png',
        giftLabel: 'Giftpack2',
        tokenLabel: '🧲',
        unlockedText: '磁铁星解锁！',
        collapseText: '棋盘扩大'
    }
};
const BONUS_POPUP_RIBBON_PALETTES = {
    add: [
        ['#fff3a1', '#ffca28'],
        ['#ffd166', '#ff8f00'],
        ['#7ee081', '#43a047'],
        ['#7edcff', '#29b6f6'],
        ['#ff9f68', '#ff7043']
    ],
    magnet: [
        ['#efe1ff', '#b388ff'],
        ['#b39ddb', '#7e57c2'],
        ['#9be7ff', '#29b6f6'],
        ['#80deea', '#26c6da'],
        ['#ffd180', '#ff8a65']
    ],
    chest: [
        ['#fff4a3', '#ffd54f'],
        ['#ffe082', '#ffb300'],
        ['#ffccbc', '#ff7043'],
        ['#ffd1dc', '#ff5c8d'],
        ['#d1c4e9', '#7e57c2']
    ]
};
const BONUS_CHEST_SYMBOL_SET = new Set(
    Object.values(BONUS_CHEST_META)
        .map((meta) => meta && meta.symbol)
        .filter(Boolean)
);
const BONUS_EMOJI_IMAGE_BASE = 'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72';

function clearBonusRollingIntervals() {
    BONUS_STATE.rollingIntervals.forEach((timerId) => clearInterval(timerId));
    BONUS_STATE.rollingIntervals = [];
}

function clearBonusStopTimeouts() {
    BONUS_STATE.stopTimeouts.forEach((timerId) => clearTimeout(timerId));
    BONUS_STATE.stopTimeouts = [];
}

function clearBonusFinishTimer() {
    if (BONUS_STATE.finishTimer) {
        clearTimeout(BONUS_STATE.finishTimer);
        BONUS_STATE.finishTimer = null;
    }
}

function setMainGameVisibility(isVisible) {
    [statusBarTop, mainStage, controlPanel].forEach((el) => {
        if (!el) return;
        el.classList.toggle('hidden', !isVisible);
    });
    if (bonusScreen) {
        bonusScreen.classList.toggle('hidden', isVisible);
    }
    // ensure free spin hud is hidden when we are not in main game visibility mode 
    // (i.e. when bonus game is active, free spin HUD should definitely be hidden)
    if (freeSpinHud && !isVisible) {
        freeSpinHud.classList.add('hidden');
    }
    scheduleBonusResponsiveLayout();
}

function playSceneFadeSwitch(onMidpoint) {
    if (!sceneFade) {
        if (typeof onMidpoint === 'function') onMidpoint();
        return Promise.resolve();
    }

    return new Promise((resolve) => {
        sceneFade.classList.add('active');
        setTimeout(() => {
            if (typeof onMidpoint === 'function') onMidpoint();
            sceneFade.classList.remove('active');
            setTimeout(resolve, 230);
        }, 220);
    });
}

function resetBonusStateData() {
    clearBonusRollingIntervals();
    clearBonusStopTimeouts();
    clearBonusFinishTimer();
    BONUS_STATE.active = false;
    BONUS_STATE.isSpinning = false;
    BONUS_STATE.spinsLeft = 0;
    BONUS_STATE.totalSpins = 0;
    BONUS_STATE.baseCashoutScore = 0;
    BONUS_STATE.baseSummaryMessage = '';
    BONUS_STATE.totalReward = 0;
    BONUS_STATE.diamondReward = 0;
    BONUS_STATE.chestReward = 0;
    BONUS_STATE.chestProgress = createZeroChestMap();
    BONUS_STATE.chestAwards = createZeroChestMap();
    BONUS_STATE.boardRows = Math.max(1, Number(BONUS_GAME_CONFIG.initialRows) || 4);
    BONUS_STATE.unlockedSpecials = {
        add: false,
        chest: true,
        magnet: false
    };
    BONUS_STATE.collapsedStacks = {
        add: false,
        chest: false
    };
    BONUS_STATE.triggerStacks = {
        add: 0,
        chest: 0
    };
    BONUS_STATE.cells = [];
    BONUS_STATE.onFinish = null;
}

function updateBonusHud() {
    if (bonusSpinsLeftInline) {
        bonusSpinsLeftInline.textContent = BONUS_STATE.spinsLeft;
    }
    if (bonusTotalReward) {
        bonusTotalReward.textContent = BONUS_STATE.totalReward;
    }
    if (bonusSpinBtn) {
        const noOpenCells = getBonusSpinnableCells().length === 0;
        bonusSpinBtn.disabled = !BONUS_STATE.active || BONUS_STATE.isSpinning || BONUS_STATE.spinsLeft <= 0 || noOpenCells;
        bonusSpinBtn.textContent = 'GO 🎈';
        bonusSpinBtn.classList.toggle('spinning', BONUS_STATE.isSpinning);
    }
}

function updateBonusChestProgressUI() {
    updateBonusChestRowVisibility();
    bonusChestCards.forEach((card) => {
        const chestId = card.dataset.chestId;
        const activeCount = BONUS_STATE.chestProgress[chestId] || 0;
        const dots = Array.from(card.querySelectorAll('.bonus-dot'));
        dots.forEach((dot, index) => {
            dot.classList.toggle('active', index < activeCount);
        });
    });
}

function updateBonusChestRowVisibility() {
    if (!bonusChestRow) return;
    const shouldShow = Boolean(BONUS_STATE.unlockedSpecials.chest);
    bonusChestRow.classList.toggle('hidden', !shouldShow);
    scheduleBonusResponsiveLayout();
}

function getBonusCellCountByRows(rows) {
    const safeRows = Math.max(1, Number(rows) || 1);
    const safeColumns = Math.max(1, Number(BONUS_GAME_CONFIG.columns) || 4);
    return safeRows * safeColumns;
}

function getBonusTargetRowsByUnlockState() {
    const baseRows = Math.max(1, Number(BONUS_GAME_CONFIG.initialRows) || 4);
    const unlockedCount = ['add', 'magnet'].reduce((sum, unlockKey) => (
        sum + (BONUS_STATE.unlockedSpecials[unlockKey] ? 1 : 0)
    ), 0);
    return baseRows + unlockedCount;
}

function getBonusUnlockKeyByStackId(stackId) {
    if (stackId === 'add') return 'add';
    if (stackId === 'chest') return 'magnet';
    return '';
}

function isBonusStackUnlocked(stackId) {
    const unlockKey = getBonusUnlockKeyByStackId(stackId);
    return unlockKey ? Boolean(BONUS_STATE.unlockedSpecials[unlockKey]) : false;
}

function applyBonusStackUnlock(stackId) {
    const unlockKey = getBonusUnlockKeyByStackId(stackId);
    if (!unlockKey) return;
    BONUS_STATE.unlockedSpecials[unlockKey] = true;
}

function getBonusGiftGlowStyle(layerCount, isCollapsed) {
    const safeCount = Math.max(0, Number(layerCount) || 0);
    if (isCollapsed) {
        return {
            alpha: 0.96,
            size: 24,
            sat: 1.9,
            width: 100,
            urgent: false
        };
    }
    
    // Fake progress based on gathered tokens (layerCount)
    // Map count 0-3 to width 15% - 92%
    let fakeWidth = 15;
    let isUrgent = false;
    
    if (safeCount === 0) {
        fakeWidth = 15 + (Math.random() * 5); // 15% - 20%
    } else if (safeCount === 1) {
        fakeWidth = 40 + (Math.random() * 10); // 40% - 50%
    } else if (safeCount === 2) {
        fakeWidth = 70 + (Math.random() * 10); // 70% - 80%
    } else {
        fakeWidth = 90 + (Math.random() * 5); // 90% - 95%
        isUrgent = true; // Make it pulse intensely when it feels "about to burst"
    }

    return {
        alpha: 0.2 + (safeCount * 0.2), // glow gets stronger as count goes up
        size: 8 + (safeCount * 4),
        sat: 1 + (safeCount * 0.1),
        width: fakeWidth,
        urgent: isUrgent
    };
}

function updateBonusTriggerStackUI() {
    let visibleGiftCount = 0;
    bonusTriggerStackCards.forEach((card) => {
        const stackId = card.dataset.stackId;
        const meta = BONUS_TRIGGER_STACK_META[stackId];
        if (!meta) return;

        const layerCount = Math.max(0, Number(BONUS_STATE.triggerStacks[stackId]) || 0);
        const isUnlocked = isBonusStackUnlocked(stackId);
        const isCollapsed = Boolean(BONUS_STATE.collapsedStacks[stackId]);
        const glow = getBonusGiftGlowStyle(layerCount, isCollapsed);
        const shouldHideCard = isUnlocked;

        card.classList.toggle('hidden', shouldHideCard);
        if (shouldHideCard) {
            return;
        }
        visibleGiftCount += 1;

        card.classList.toggle('unlocked', isUnlocked);
        card.classList.toggle('collapsed', isCollapsed);

        const energySpan = card.querySelector('.bar-energy-pulse');
        if (energySpan && !isUnlocked) {
            energySpan.style.display = glow.urgent ? 'block' : 'none';
        }

        const progressBar = card.querySelector(`#progress-${stackId}`);
        if (progressBar) {
            progressBar.style.width = `${glow.width}%`;
            if (glow.urgent) {
                progressBar.classList.add('urgent-pulse');
            } else {
                progressBar.classList.remove('urgent-pulse');
            }
        }

        const lockIcon = card.querySelector('.lock-icon');
        if (lockIcon) {
            if (glow.urgent) {
                lockIcon.classList.add('shaking');
            } else {
                lockIcon.classList.remove('shaking');
            }
        }

        const giftImg = card.querySelector('[data-role="gift-img"]');
        if (giftImg) {
            giftImg.src = meta.giftImage;
            giftImg.alt = meta.giftLabel;
            giftImg.style.filter = `drop-shadow(0 0 ${glow.size}px rgba(255,215,0,${glow.alpha})) saturate(${glow.sat})`;
        }
    });

    if (bonusTriggerStackRow) {
        bonusTriggerStackRow.classList.toggle('hidden', visibleGiftCount <= 0);
    }
    scheduleBonusResponsiveLayout();
}

function getBonusSpinnableCells() {
    return BONUS_STATE.cells.filter((cell) => !cell.settled);
}

function getCurrentBonusDiamondCount() {
    return BONUS_STATE.cells.reduce((count, cell) => (
        count + (cell && cell.settled && cell.outcomeType === 'diamond' ? 1 : 0)
    ), 0);
}

function renderBonusDiamond(value) {
    return `<span class="bonus-diamond-hit"><span class="bonus-diamond-value">${value}</span><span class="bonus-diamond-icon">\uD83D\uDC8E</span></span>`;
}

function createDiamondHitMarkup(value) {
    return renderBonusDiamond(value);
}

function renderBonusTriggerBlock(stackId) {
    const meta = BONUS_TRIGGER_STACK_META[stackId];
    if (!meta) return '<span class="bonus-empty-mark"></span>';
    return `<span class="bonus-trigger-block"><img src="${meta.giftImage}" alt="${meta.giftLabel}"></span>`;
}

function emojiToCodepoint(emojiText) {
    return Array.from(String(emojiText || ''))
        .map((char) => char.codePointAt(0))
        .filter((codePoint) => Number.isFinite(codePoint) && codePoint !== 0xFE0F)
        .map((codePoint) => codePoint.toString(16))
        .join('-');
}

function getEmojiImageSrc(emojiText) {
    const codepoint = emojiToCodepoint(emojiText);
    if (!codepoint) return '';
    return `${BONUS_EMOJI_IMAGE_BASE}/${codepoint}.png`;
}

function isChestEmojiSymbol(symbol) {
    return BONUS_CHEST_SYMBOL_SET.has(String(symbol || ''));
}

function renderBonusEmojiSymbol(symbol, label = 'emoji') {
    const emoji = String(symbol || '');
    const src = getEmojiImageSrc(emoji);
    if (!src) {
        return `<span class="bonus-symbol">${emoji || '?'}</span>`;
    }
    return `<span class="bonus-symbol bonus-symbol-emoji"><img class="bonus-emoji-symbol" src="${src}" alt="${label}" loading="eager" decoding="async" onerror="this.onerror=null;this.parentElement.textContent='${emoji || '?'}';"></span>`;
}

function pickRandomBonusChestId() {
    return BONUS_CHEST_IDS[Math.floor(Math.random() * BONUS_CHEST_IDS.length)] || 'monkey';
}

function renderBonusSymbolMarkup(symbol, label = 'symbol') {
    if (isChestEmojiSymbol(symbol)) {
        return renderBonusEmojiSymbol(symbol, label);
    }
    return `<span class="bonus-symbol">${symbol}</span>`;
}

function renderBonusCell(cell) {
    if (!cell || !cell.element) return;

    cell.element.classList.remove('has-reward', 'empty-cell');
    if (cell.settled) {
        cell.element.classList.add('has-reward');
        if (cell.outcomeType === 'diamond') {
            cell.element.innerHTML = renderBonusDiamond(cell.value);
            return;
        }
        if (cell.outcomeType === 'symbol') {
            cell.element.innerHTML = renderBonusSymbolMarkup(cell.symbol, 'chest symbol');
            return;
        }
    }

    if (cell.outcomeType === 'special') {
        cell.element.classList.add('has-reward');
        if (isChestEmojiSymbol(cell.symbol)) {
            cell.element.innerHTML = renderBonusEmojiSymbol(cell.symbol, 'chest symbol');
        } else {
            cell.element.innerHTML = `<span class="bonus-special-symbol">${cell.symbol}</span>`;
        }
        return;
    }

    if (cell.outcomeType === 'trigger-block') {
        cell.element.classList.add('has-reward');
        cell.element.innerHTML = renderBonusTriggerBlock(cell.triggerStackId);
        return;
    }

    cell.element.classList.add('empty-cell');
    cell.element.innerHTML = '<span class="bonus-empty-mark"></span>';
}

function renderBonusRollingCell(cell) {
    if (!cell || !cell.element) return;
    const roll = Math.random();
    if (roll < 0.22) {
        cell.element.innerHTML = '<span class="bonus-empty-mark"></span>';
        return;
    }

    if (roll < 0.60) {
        const previewValues = [20, 40, 80, 150, 300];
        const value = previewValues[Math.floor(Math.random() * previewValues.length)];
        cell.element.innerHTML = renderBonusDiamond(value);
        return;
    }

    const previewItems = ['diamond'];
    if (BONUS_STATE.unlockedSpecials.magnet && getCurrentBonusDiamondCount() >= 2) {
        previewItems.push('magnet');
    }
    if (BONUS_STATE.unlockedSpecials.add) previewItems.push('add');
    if (BONUS_STATE.unlockedSpecials.chest) previewItems.push('chest');
    if (!BONUS_STATE.collapsedStacks.add) previewItems.push('trigger-add');
    if (!BONUS_STATE.collapsedStacks.chest) previewItems.push('trigger-chest');
    const previewId = previewItems[Math.floor(Math.random() * previewItems.length)] || 'magnet';

    if (previewId === 'trigger-add' || previewId === 'trigger-chest') {
        const stackId = previewId === 'trigger-add' ? 'add' : 'chest';
        cell.element.innerHTML = renderBonusTriggerBlock(stackId);
        return;
    }

    if (previewId === 'diamond') {
        const previewValues = [20, 40, 80, 150, 300];
        const value = previewValues[Math.floor(Math.random() * previewValues.length)];
        cell.element.innerHTML = renderBonusDiamond(value);
        return;
    }

    if (previewId === 'chest') {
        const chestId = pickRandomBonusChestId();
        const chestSymbol = BONUS_CHEST_META[chestId]?.symbol || '🐵';
        cell.element.innerHTML = renderBonusEmojiSymbol(chestSymbol, BONUS_CHEST_META[chestId]?.animalName || 'chest');
        return;
    }

    cell.element.innerHTML = `<span class="bonus-special-symbol">${BONUS_SPECIAL_META[previewId].symbol}</span>`;
}

function pickWeighted(items, getWeight) {
    const total = items.reduce((sum, item) => sum + Math.max(0, Number(getWeight(item)) || 0), 0);
    if (total <= 0) return items[items.length - 1];
    let roll = Math.random() * total;
    for (let i = 0; i < items.length; i++) {
        roll -= Math.max(0, Number(getWeight(items[i])) || 0);
        if (roll <= 0) return items[i];
    }
    return items[items.length - 1];
}

function pickBonusDiamondValue() {
    const selected = pickWeighted(BONUS_GAME_CONFIG.diamondWeights, (item) => item.weight);
    return selected ? selected.value : 20;
}

function pickBonusAddValue() {
    const selected = pickWeighted(BONUS_GAME_CONFIG.addValueWeights, (item) => item.weight);
    return selected ? selected.value : 6;
}

function clampNumber(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function pickRandomIntInRange(min, max) {
    const safeMin = Math.ceil(Math.min(min, max));
    const safeMax = Math.floor(Math.max(min, max));
    return safeMin + Math.floor(Math.random() * (safeMax - safeMin + 1));
}

function shuffleArray(items) {
    const arr = [...items];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function pickBonusSpecialType({ allowMagnet = true } = {}) {
    const available = [];
    if (allowMagnet && BONUS_STATE.unlockedSpecials.magnet) {
        available.push('magnet');
    }
    if (BONUS_STATE.unlockedSpecials.add) {
        available.push('add');
    }
    if (BONUS_STATE.unlockedSpecials.chest) {
        available.push('chest');
    }
    if (available.length === 0) {
        return null;
    }
    const picked = pickWeighted(available, (key) => getBonusSpecialTypeWeight(key));
    return picked || available[0];
}

function pickBonusChestId() {
    if (isBonusFrontLoadedPhase()) {
        const progressWeights = BONUS_GAME_CONFIG.earlyChestProgressWeights || {};
        const idWeights = BONUS_GAME_CONFIG.earlyChestIdWeights || {};
        const finishPenaltyById = BONUS_GAME_CONFIG.earlyChestFinishPenaltyById || {};
        const pickedEarly = pickWeighted(BONUS_CHEST_IDS, (chestId) => {
            const progress = Math.max(0, Number(BONUS_STATE.chestProgress[chestId]) || 0);
            const progressWeight = progress >= 2
                ? Number(progressWeights[2]) || 0
                : Number(progressWeights[progress]) || 0;
            let weight = Math.max(0, progressWeight);
            const idWeight = Number(idWeights[chestId]);
            if (Number.isFinite(idWeight)) {
                weight *= Math.max(0, idWeight) / 100;
            }
            if (progress >= 2) {
                const finishPenalty = Number(finishPenaltyById[chestId]);
                if (Number.isFinite(finishPenalty)) {
                    weight *= clampNumber(finishPenalty, 0, 1);
                }
            }
            return Math.max(0, weight);
        });
        return pickedEarly || 'monkey';
    }

    const baseWeights = BONUS_GAME_CONFIG.lateChestBaseWeights || {};
    const finishBoost = BONUS_GAME_CONFIG.lateChestFinishBoost || {};
    const nearMissPenaltyById = BONUS_GAME_CONFIG.lateChestNearMissPenaltyById || {};
    const jackpotChestId = BONUS_GAME_CONFIG.jackpotChestId || 'panda';
    const jackpotNearMissProgress = Math.max(1, Number(BONUS_GAME_CONFIG.jackpotNearMissProgress) || 2);
    const jackpotNearMissPenalty = clampNumber(Number(BONUS_GAME_CONFIG.jackpotNearMissPenalty) || 0.08, 0, 1);

    const pickedLate = pickWeighted(BONUS_CHEST_IDS, (chestId) => {
        const progress = Math.max(0, Number(BONUS_STATE.chestProgress[chestId]) || 0);
        let weight = Number(baseWeights[chestId]) || 0;
        if (progress >= 2) {
            weight += Number(finishBoost[chestId]) || 0;
            const nearMissPenalty = Number(nearMissPenaltyById[chestId]);
            if (Number.isFinite(nearMissPenalty)) {
                weight *= clampNumber(nearMissPenalty, 0, 1);
            }
        }
        if (chestId === jackpotChestId && progress >= jackpotNearMissProgress) {
            weight *= jackpotNearMissPenalty;
        }
        return Math.max(0, weight);
    });
    return pickedLate || 'monkey';
}

function isBonusFrontLoadedPhase() {
    const spinNo = Math.max(1, Number(BONUS_STATE.totalSpins) || 1);
    const frontLoadedSpins = Math.max(1, Number(BONUS_GAME_CONFIG.frontLoadedChestSpins) || 6);
    return spinNo <= frontLoadedSpins;
}

function getBonusSpecialCellChance() {
    const fallback = clampNumber(Number(BONUS_GAME_CONFIG.specialCellChance) || 0, 0, 1);
    if (isBonusFrontLoadedPhase()) {
        const early = Number(BONUS_GAME_CONFIG.earlySpecialCellChance);
        return Number.isFinite(early) ? clampNumber(early, 0, 1) : fallback;
    }
    const late = Number(BONUS_GAME_CONFIG.lateSpecialCellChance);
    return Number.isFinite(late) ? clampNumber(late, 0, 1) : fallback;
}

function getBonusTriggerBlockChance() {
    const fallback = clampNumber(Number(BONUS_GAME_CONFIG.triggerBlockChance) || 0, 0, 1);
    if (isBonusFrontLoadedPhase()) {
        const early = Number(BONUS_GAME_CONFIG.earlyTriggerBlockChance);
        return Number.isFinite(early) ? clampNumber(early, 0, 1) : fallback;
    }
    const late = Number(BONUS_GAME_CONFIG.lateTriggerBlockChance);
    return Number.isFinite(late) ? clampNumber(late, 0, 1) : fallback;
}

function getBonusSpecialTypeWeight(specialType) {
    const fallback = Number(BONUS_GAME_CONFIG.specialTypeWeights[specialType]) || 0;
    const earlyWeights = BONUS_GAME_CONFIG.earlySpecialTypeWeights || {};
    const lateWeights = BONUS_GAME_CONFIG.lateSpecialTypeWeights || {};
    if (isBonusFrontLoadedPhase()) {
        const early = Number(earlyWeights[specialType]);
        return Number.isFinite(early) ? Math.max(0, early) : Math.max(0, fallback);
    }
    const late = Number(lateWeights[specialType]);
    return Number.isFinite(late) ? Math.max(0, late) : Math.max(0, fallback);
}

function createSpecialOutcome(specialType, extraData = {}) {
    const outcome = {
        type: 'special',
        specialType,
        ...extraData,
        symbol: BONUS_SPECIAL_META[specialType].symbol
    };

    if (specialType === 'chest') {
        const chestId = extraData.chestId || pickBonusChestId();
        outcome.chestId = chestId;
        outcome.symbol = BONUS_CHEST_META[chestId]?.symbol || BONUS_SPECIAL_META.chest.symbol;
    }

    return outcome;
}

function getBonusSpawnChance(spinnableCount) {
    const baseChance = Number(BONUS_GAME_CONFIG.baseSpawnChance) || 0;
    const minChance = clampNumber(Number(BONUS_GAME_CONFIG.minSpawnChance) || 0, 0, 1);
    const totalCells = Math.max(1, BONUS_STATE.cells.length || getBonusCellCountByRows(BONUS_STATE.boardRows));
    const openRatio = clampNumber(spinnableCount / totalCells, 0, 1);
    const scaledChance = clampNumber(baseChance * openRatio, 0, 1);
    return clampNumber(Math.max(minChance, scaledChance), 0, 1);
}

function pickBonusNewCellCount(maxCount) {
    if (maxCount <= 0) return 0;
    const candidates = (BONUS_GAME_CONFIG.newCellCountWeights || [])
        .filter((item) => item.count <= maxCount);
    if (candidates.length === 0) return 1;
    const picked = pickWeighted(candidates, (item) => item.weight);
    const count = Number(picked?.count) || 1;
    return clampNumber(count, 1, maxCount);
}

function pickBonusTriggerStackType() {
    const candidates = ['add', 'chest'].filter((stackId) => !BONUS_STATE.collapsedStacks[stackId]);
    if (candidates.length === 0) return null;
    const picked = pickWeighted(candidates, (stackId) => BONUS_GAME_CONFIG.triggerTypeWeights[stackId] || 0);
    return picked || candidates[0];
}

function createTriggerBlockOutcome(stackId) {
    const meta = BONUS_TRIGGER_STACK_META[stackId];
    if (!meta) {
        return {
            type: 'empty'
        };
    }
    return {
        type: 'triggerBlock',
        stackId,
        symbol: meta.tokenLabel
    };
}

function pickStandardBonusOutcome({ allowMagnet = true } = {}) {
    const specialChance = getBonusSpecialCellChance();
    if (Math.random() < specialChance) {
        const canSpawnTrigger = ['add', 'chest'].some((stackId) => !BONUS_STATE.collapsedStacks[stackId]);
        const triggerChance = getBonusTriggerBlockChance();
        if (canSpawnTrigger && Math.random() < triggerChance) {
            const triggerStackId = pickBonusTriggerStackType();
            if (triggerStackId) {
                return createTriggerBlockOutcome(triggerStackId);
            }
        }
        const specialType = pickBonusSpecialType({ allowMagnet });
        if (!specialType) {
            return {
                type: 'diamond',
                value: pickBonusDiamondValue()
            };
        }
        return createSpecialOutcome(specialType);
    }
    return {
        type: 'diamond',
        value: pickBonusDiamondValue()
    };
}

function generateBonusSpinOutcomeMap(spinnableCells) {
    const outcomeMap = new Map();
    spinnableCells.forEach((cell) => {
        outcomeMap.set(cell.index, { type: 'empty' });
    });

    const maxNewCells = Math.min(
        Math.max(1, Number(BONUS_GAME_CONFIG.maxNewCellsPerSpin) || 3),
        spinnableCells.length
    );
    if (maxNewCells <= 0) return outcomeMap;

    const shouldSpawn = Math.random() < getBonusSpawnChance(spinnableCells.length);
    if (!shouldSpawn) return outcomeMap;

    const spawnCount = pickBonusNewCellCount(maxNewCells);
    const selectedCells = shuffleArray(spinnableCells).slice(0, spawnCount);
    if (selectedCells.length === 0) return outcomeMap;

    let projectedDiamondCount = getCurrentBonusDiamondCount();
    selectedCells.forEach((cell) => {
        const allowMagnet = projectedDiamondCount >= 2;
        const outcome = pickStandardBonusOutcome({ allowMagnet });
        outcomeMap.set(cell.index, outcome);
        if (outcome.type === 'diamond') {
            projectedDiamondCount += 1;
        }
    });

    return outcomeMap;
}

function getElementCenterInContainer(el, container) {
    if (!el || !container) return { x: 0, y: 0 };
    const rect = el.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    return {
        x: rect.left + (rect.width / 2) - containerRect.left,
        y: rect.top + (rect.height / 2) - containerRect.top
    };
}

function animateBonusFlyToken({ fromEl, toEl, text, className = '', duration = 680 }) {
    if (!fromEl || !toEl || !gameContainer) return Promise.resolve();
    const from = getElementCenterInContainer(fromEl, gameContainer);
    const to = getElementCenterInContainer(toEl, gameContainer);
    const token = document.createElement('div');
    token.className = `bonus-fly-token ${className}`.trim();
    token.textContent = text;
    token.style.left = `${from.x}px`;
    token.style.top = `${from.y}px`;
    token.style.opacity = '0.95';
    token.style.transition = `transform ${duration}ms cubic-bezier(0.175, 0.885, 0.32, 1.1), opacity ${duration}ms ease-out`;
    gameContainer.appendChild(token);

    return new Promise((resolve) => {
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                token.style.transform = `translate3d(calc(-50% + ${to.x - from.x}px), calc(-50% + ${to.y - from.y}px), 0) scale(0.9)`;
                token.style.opacity = '0.1';
            });
        });
        setTimeout(() => {
            token.remove();
            resolve();
        }, duration);
    });
}

function getBonusUnlockStartText(stackIds) {
    const ids = Array.isArray(stackIds) ? stackIds : [];
    if (ids.length >= 2) {
        return '🎉 解锁成功！<br><span>棋盘扩大至 6 行<br>加入✨加分果<br>加入🧲磁铁星</span><br><div>(转出后可吸收奖励或加分)</div>';
    }
    if (ids[0] === 'add') {
        return '🎉 解锁成功！<br><span>棋盘扩大至 5 行<br>加入✨神奇加分果</span><br><div>(转出后可给已有钻石加分)</div>';
    }
    if (ids[0] === 'chest') {
        return '🎉 解锁成功！<br><span>棋盘扩大至 6 行<br>加入🧲万能磁铁星</span><br><div>(转出后可一次性吸收全屏钻石)</div>';
    }
    return '🎉 解锁成功！<br><span>棋盘扩展！</span>';
}

async function playBonusGiftUnlockCinematic(stackIds) {
    const safeStackIds = [...new Set((Array.isArray(stackIds) ? stackIds : []).filter((stackId) => BONUS_TRIGGER_STACK_META[stackId]))];
    if (safeStackIds.length === 0 || !gameContainer) return;

    const overlay = document.createElement('div');
    overlay.className = 'bonus-trigger-cinematic';
    const dim = document.createElement('div');
    dim.className = 'bonus-trigger-cinematic-dim';

    const centerX = gameContainer.clientWidth * 0.5;
    const centerY = gameContainer.clientHeight * 0.5;
    const targetOffset = safeStackIds.length >= 2 ? [-36, 36] : [0];
    let icons = []; // Store to append later
    safeStackIds.forEach((stackId, index) => {
        const meta = BONUS_TRIGGER_STACK_META[stackId];
        if (!meta) return;
        const stackCard = getBonusTriggerStackCardById(stackId);
        const giftImg = stackCard?.querySelector('[data-role="gift-img"]');
        const fromEl = giftImg || stackCard;
        if (!fromEl) return;

        const from = getElementCenterInContainer(fromEl, gameContainer);
        const target = {
            x: centerX + (targetOffset[index] || 0),
            y: centerY - (safeStackIds.length >= 2 ? 132 : 118)
        };

        const icon = document.createElement('img');
        icon.className = `bonus-trigger-cinematic-icon ${stackId === 'chest' ? 'chest' : 'add'}`;
        icon.src = meta.giftImage;
        icon.alt = meta.giftLabel;
        icon.style.left = `${from.x}px`;
        icon.style.top = `${from.y}px`;
        icon.style.setProperty('--dx', `${target.x - from.x}px`);
        icon.style.setProperty('--dy', `${target.y - from.y}px`);
        icons.push(icon);
    });

    const cardBg = document.createElement('div');
    cardBg.className = 'bonus-trigger-cinematic-card';

    const startText = document.createElement('div');
    startText.className = 'bonus-trigger-cinematic-start-text';
    startText.innerHTML = getBonusUnlockStartText(safeStackIds);
    
    const text = document.createElement('div');
    text.className = 'bonus-trigger-cinematic-text';
    text.textContent = '点击继续';

    // Reserve space for the cinematic icon while keeping the CTA inside the card on narrow screens.
    cardBg.style.minHeight = safeStackIds.length >= 2 ? '340px' : '300px';

    cardBg.appendChild(startText);
    cardBg.appendChild(text);

    // Ensure container matches size of card background
    overlay.appendChild(dim);
    overlay.appendChild(cardBg);
    
    // Append icons directly to overlay so they can sit on top of everything without being constrained by card padding
    icons.forEach(icon => overlay.appendChild(icon));
    gameContainer.appendChild(overlay);

    await waitRaf();
    overlay.classList.add('pre-shake');
    await waitMs(340);
    overlay.classList.remove('pre-shake');
    await waitRaf();
    overlay.classList.add('play');
    await waitMs(640);
    spawnBonusGiftUnlockFireworks(overlay, centerX, centerY, safeStackIds.includes('chest') ? 'chest' : 'add');
    overlay.classList.add('ready');
    spawnBonusSideRibbonBurst(overlay, safeStackIds.includes('chest') ? 'magnet' : 'add');
    await waitForBonusGiftUnlockTap(overlay);
    overlay.classList.remove('ready');
    overlay.classList.add('after-tap');
    await waitMs(920);
    overlay.classList.add('fade-out');
    await waitMs(260);
    overlay.remove();
}

function waitForBonusGiftUnlockTap(overlay) {
    return new Promise((resolve) => {
        if (!overlay) {
            resolve();
            return;
        }
        const tapTarget = overlay.querySelector('.bonus-trigger-cinematic-card');
        let finished = false;
        let fallbackTimer = null;

        const finalize = () => {
            if (finished) return;
            finished = true;
            if (fallbackTimer) {
                clearTimeout(fallbackTimer);
                fallbackTimer = null;
            }
            removeEvents();
            resolve();
        };

        const removeEvents = () => {
            const targets = [overlay, tapTarget].filter(Boolean);
            targets.forEach((target) => {
                target.removeEventListener('pointerdown', onTap);
                target.removeEventListener('click', onTap);
                target.removeEventListener('touchstart', onTap);
                target.removeEventListener('mousedown', onTap);
            });
        };

        const onTap = (event) => {
            if (event) {
                event.preventDefault();
                event.stopPropagation();
            }
            finalize();
        };

        const targets = [overlay, tapTarget].filter(Boolean);
        targets.forEach((target) => {
            target.addEventListener('pointerdown', onTap, { passive: false });
            target.addEventListener('click', onTap, { passive: false });
            target.addEventListener('touchstart', onTap, { passive: false });
            target.addEventListener('mousedown', onTap, { passive: false });
        });

        // Fallback guard: avoid perma-lock if tap event is swallowed on some devices.
        fallbackTimer = setTimeout(finalize, 8000);
    });
}

function spawnBonusGiftUnlockFireworks(overlay, centerX, centerY, stackId) {
    if (!overlay) return;
    const palette = stackId === 'chest'
        ? ['#d2a2ff', '#b87dff', '#7e5cff', '#f2dcff', '#ffeb3b', '#ff5252']
        : ['#ffe59a', '#ffd166', '#ffbf3c', '#fff2c2', '#4caf50', '#03a9f4'];
    const sparkCount = 45; // 增加粒子数量
    for (let i = 0; i < sparkCount; i++) {
        const spark = document.createElement('span');
        spark.className = 'bonus-trigger-cinematic-spark';
        spark.style.left = `${centerX}px`;
        spark.style.top = `${centerY}px`;
        const angle = (Math.PI * 2 * i) / sparkCount + ((Math.random() - 0.5) * 0.5);
        const distance = 60 + Math.random() * 150; // 爆炸范围更大
        const tx = Math.cos(angle) * distance;
        const ty = Math.sin(angle) * distance + (Math.random() * 80); // 增加重力下落感
        const size = 4 + Math.random() * 8; // 粒子更大
        const duration = 600 + Math.random() * 500;
        
        // 随机形状：圆形或彩带(长条)
        if (Math.random() > 0.5) {
            spark.style.width = `${size * 2}px`;
            spark.style.height = `${size * 0.5}px`;
            spark.style.transform = `rotate(${Math.random() * 360}deg)`;
        } else {
            spark.style.width = `${size.toFixed(2)}px`;
            spark.style.height = `${size.toFixed(2)}px`;
        }
        
        spark.style.backgroundColor = palette[Math.floor(Math.random() * palette.length)];
        spark.style.setProperty('--tx', `${tx.toFixed(2)}px`);
        spark.style.setProperty('--ty', `${ty.toFixed(2)}px`);
        spark.style.setProperty('--dur', `${duration.toFixed(0)}ms`);
        overlay.appendChild(spark);
        setTimeout(() => {
            spark.remove();
        }, duration + 60);
    }

    const ring = document.createElement('span');
    ring.className = `bonus-trigger-cinematic-ring ${stackId === 'chest' ? 'chest' : 'add'}`;
    ring.style.left = `${centerX}px`;
    ring.style.top = `${centerY}px`;
    overlay.appendChild(ring);
    setTimeout(() => {
        ring.remove();
    }, 560);
}

function spawnBonusSideRibbonBurst(overlay, theme = 'add') {
    if (!overlay) return;

    const rect = overlay.getBoundingClientRect();
    const width = rect.width || overlay.clientWidth || window.innerWidth;
    const height = rect.height || overlay.clientHeight || window.innerHeight;
    if (width <= 0 || height <= 0) return;

    const palette = BONUS_POPUP_RIBBON_PALETTES[theme] || BONUS_POPUP_RIBBON_PALETTES.add;
    const countPerSide = width < 460 ? 12 : 18;
    const baseY = height * 0.54;

    ['left', 'right'].forEach((side) => {
        const direction = side === 'left' ? 1 : -1;

        const flare = document.createElement('span');
        flare.className = `bonus-side-ribbon-flare ${side}`;
        flare.style.top = `${baseY}px`;
        overlay.appendChild(flare);
        setTimeout(() => {
            flare.remove();
        }, 520);

        for (let index = 0; index < countPerSide; index++) {
            const piece = document.createElement('span');
            piece.className = 'bonus-side-ribbon-particle';

            const isDot = Math.random() < 0.22;
            if (isDot) {
                piece.classList.add('is-dot');
            }

            const colors = palette[Math.floor(Math.random() * palette.length)] || palette[0];
            const startX = side === 'left'
                ? 18 + (Math.random() * 24)
                : width - 18 - (Math.random() * 24);
            const startY = baseY + ((Math.random() - 0.5) * Math.min(170, height * 0.3));
            const widthSize = isDot ? (10 + (Math.random() * 8)) : (6 + (Math.random() * 5));
            const heightSize = isDot ? widthSize : (22 + (Math.random() * 32));
            const travelX = direction * (90 + (Math.random() * 140));
            const travelY = ((Math.random() - 0.5) * 180) - 12;
            const startRotation = direction * (28 + (Math.random() * 56));
            const endRotation = startRotation + (direction * (110 + (Math.random() * 150)));
            const duration = 820 + (Math.random() * 420);

            piece.style.left = `${startX}px`;
            piece.style.top = `${startY}px`;
            piece.style.width = `${widthSize}px`;
            piece.style.height = `${heightSize}px`;
            piece.style.background = `linear-gradient(180deg, rgba(255, 255, 255, 0.96) 0%, ${colors[0]} 42%, ${colors[1]} 100%)`;
            piece.style.setProperty('--tx', `${travelX.toFixed(2)}px`);
            piece.style.setProperty('--ty', `${travelY.toFixed(2)}px`);
            piece.style.setProperty('--rot-start', `${startRotation.toFixed(2)}deg`);
            piece.style.setProperty('--rot-end', `${endRotation.toFixed(2)}deg`);
            piece.style.setProperty('--dur', `${duration.toFixed(0)}ms`);

            overlay.appendChild(piece);
            setTimeout(() => {
                piece.remove();
            }, duration + 80);
        }
    });
}

function getBonusDiamondCells() {
    return BONUS_STATE.cells.filter((cell) => cell.settled && cell.outcomeType === 'diamond');
}

function getBonusDiamondRows() {
    const columnCount = Math.max(1, Number(BONUS_GAME_CONFIG.columns) || 4);
    const rowsMap = new Map();
    getBonusDiamondCells().forEach((cell) => {
        const rowIndex = Math.floor(cell.index / columnCount);
        if (!rowsMap.has(rowIndex)) {
            rowsMap.set(rowIndex, []);
        }
        rowsMap.get(rowIndex).push(cell);
    });

    return Array.from(rowsMap.entries())
        .sort((a, b) => a[0] - b[0])
        .map((entry) => entry[1]);
}

function pulseBonusCell(cell, className, duration = 460) {
    if (!cell || !cell.element) return;
    cell.element.classList.remove(className);
    void cell.element.offsetWidth;
    cell.element.classList.add(className);
    setTimeout(() => {
        cell.element.classList.remove(className);
    }, duration);
}

async function applyChestProgressById(chestId) {
    BONUS_STATE.chestProgress[chestId] = (BONUS_STATE.chestProgress[chestId] || 0) + 1;
    if (BONUS_STATE.chestProgress[chestId] >= 3) {
        const chestReward = BONUS_GAME_CONFIG.chestRewards[chestId] || 0;
        BONUS_STATE.chestProgress[chestId] = 0;
        BONUS_STATE.chestAwards[chestId] = (BONUS_STATE.chestAwards[chestId] || 0) + 1;
        
        flashBonusChest(chestId, chestReward);
        
        // Show chest reward overlay
        const overlay = document.getElementById('bonus-chest-reward-overlay');
        if (overlay) {
            const nameEl = document.getElementById('bonus-chest-reward-name');
            const iconEl = document.getElementById('bonus-chest-reward-icon');
            const valEl = document.getElementById('bonus-chest-reward-value');
            
            const meta = BONUS_CHEST_META[chestId];
            if (nameEl) nameEl.textContent = `获得${meta.name}`;
            if (iconEl) iconEl.textContent = meta.symbol;
            if (valEl) valEl.textContent = '0';
            
            overlay.classList.remove('hidden');
            await waitRaf();
            spawnBonusSideRibbonBurst(overlay, 'chest');

            // start particles if available
            if (typeof startBonusParticles === 'function') {
                startBonusParticles();
            }
            
            await waitMs(400);
            
            // Roll number
            const duration = 1200;
            const startTime = performance.now();
            await new Promise((resolve) => {
                const animateRoll = (currentTime) => {
                    const elapsed = currentTime - startTime;
                    const progress = Math.min(elapsed / duration, 1);
                    const easeOut = 1 - Math.pow(1 - progress, 3);
                    const currentVal = Math.floor(easeOut * chestReward);
                    if (valEl) valEl.textContent = currentVal;
                    
                    if (progress < 1) {
                        requestAnimationFrame(animateRoll);
                    } else {
                        if (valEl) valEl.textContent = chestReward;
                        resolve();
                    }
                };
                requestAnimationFrame(animateRoll);
            });
            
            await waitMs(1000); // show the full amount for a bit
            
            overlay.classList.add('hidden');
            await waitMs(300); // Wait for fade out
            
            if (typeof stopBonusParticles === 'function') {
                stopBonusParticles();
            }
        }

        // Fly token to top
        if (bonusTotalReward && gameContainer) {
            const chestCard = getBonusChestCardById(chestId) || bonusChestCards.find((card) => card.dataset.chestId === chestId);
            const fromEl = chestCard || gameContainer;
            await animateBonusFlyToken({
                fromEl: fromEl,
                toEl: bonusTotalReward,
                text: `+${chestReward}`,
                className: 'diamond',
                duration: 600
            });
            
            BONUS_STATE.chestReward += chestReward;
            BONUS_STATE.totalReward += chestReward;
            
            bonusTotalReward.classList.remove('bonus-win-burst');
            void bonusTotalReward.offsetWidth;
            bonusTotalReward.classList.add('bonus-win-burst');
            
            const startValue = BONUS_STATE.totalReward - chestReward;
            const rollDuration = 400;
            const startTime = performance.now();
            await new Promise((resolve) => {
                const animateQuickRoll = (currentTime) => {
                    const elapsed = currentTime - startTime;
                    const progress = Math.min(elapsed / rollDuration, 1);
                    const currentVal = Math.floor(startValue + (progress * chestReward));
                    bonusTotalReward.textContent = currentVal;
                    
                    if (progress < 1) {
                        requestAnimationFrame(animateQuickRoll);
                    } else {
                        bonusTotalReward.textContent = BONUS_STATE.totalReward;
                        resolve();
                    }
                };
                requestAnimationFrame(animateQuickRoll);
            });
        } else {
            BONUS_STATE.chestReward += chestReward;
            BONUS_STATE.totalReward += chestReward;
        }
    }
    updateBonusChestProgressUI();
    updateBonusHud();
}

function createEqualWheelSegments(values) {
    const span = 360 / values.length;
    return values.map((value, index) => {
        const startAngle = index * span;
        const endAngle = startAngle + span;
        const colors = ['#6bcB77', '#4d96ff', '#f9c74f', '#f9844a'];
        return {
            id: `add-${value}`,
            shortLabel: `${value}`,
            resultText: `+${value}`,
            color: colors[index % colors.length],
            startAngle,
            endAngle,
            centerAngle: startAngle + (span / 2),
            span
        };
    });
}

async function spinBonusAddValueWheel(cell) {
    removeBombWheel();
    const values = BONUS_GAME_CONFIG.addValueWeights.map((item) => item.value);
    const segments = createEqualWheelSegments(values);
    const ui = createBombWheel(cell.element || cell, segments);
    ui.overlay.classList.add('bonus-add-wheel-overlay');
    const spinMs = 1800;
    const spinTransition = `transform ${spinMs}ms cubic-bezier(0.12, 0.8, 0.18, 1)`;
    ui.wheel.style.setProperty('--spin-ms', `${spinMs}ms`);

    const selectedValue = pickBonusAddValue();
    const outcomeSegment = segments.find((segment) => segment.id === `add-${selectedValue}`) || segments[0];
    const extraSpins = (5 + Math.floor(Math.random() * 2)) * 360;
    const finalRotation = extraSpins + (360 - outcomeSegment.centerAngle);

    // Force a clean 0deg -> finalRotation transition each time to avoid skipped animations.
    ui.wheel.style.transition = 'none';
    ui.wheel.style.transform = 'rotate(0deg)';
    void ui.wheel.offsetWidth;
    await waitRaf();
    ui.wheel.style.transition = spinTransition;
    void ui.wheel.offsetWidth;
    await waitRaf();
    ui.wheel.style.transform = `rotate(${finalRotation}deg)`;

    await waitMs(spinMs + 60);
    highlightWinningSegment(ui.wheel, outcomeSegment.id, outcomeSegment);
    ui.result.textContent = `+${selectedValue}`;
    ui.result.classList.add('show');
    await waitMs(700);
    removeBombWheel();
    return selectedValue;
}

async function resolveAddSpecial(cell) {
    const addValue = await spinBonusAddValueWheel(cell);
    const diamondRows = getBonusDiamondRows();
    if (diamondRows.length === 0) {
        const pos = getElementCenterInContainer(cell.element, gameContainer);
        createFloatingText(pos.x + gameContainer.getBoundingClientRect().left, pos.y + gameContainer.getBoundingClientRect().top - 16, `+${addValue}`);
        await waitMs(300);
        return;
    }

    for (let rowIndex = 0; rowIndex < diamondRows.length; rowIndex++) {
        const rowCells = diamondRows[rowIndex].filter((diamondCell) => diamondCell && diamondCell.element);
        await Promise.all(rowCells.map(async (diamondCell) => {
            try {
                await animateBonusFlyToken({
                    fromEl: cell.element,
                    toEl: diamondCell.element,
                    text: `+${addValue}`,
                    className: 'diamond',
                    duration: 620
                });
            } catch (error) {
                console.error('A+ fly animation failed:', error);
            }
        }));

        rowCells.forEach((diamondCell) => {
            diamondCell.value += addValue;
            renderBonusCell(diamondCell);
            pulseBonusCell(diamondCell, 'diamond-boost', 520);
        });

        if (rowCells.length > 0 && gameContainer) {
            const rowTotalAdd = addValue * rowCells.length;
            const rowAnchorCell = rowCells[Math.floor(rowCells.length / 2)];
            const screenRect = gameContainer.getBoundingClientRect();
            const rowCenter = getElementCenterInContainer(rowAnchorCell.element, gameContainer);
            createFloatingText(screenRect.left + rowCenter.x, screenRect.top + rowCenter.y - 24, `✨全排加分 +${rowTotalAdd}✨`);
        }

        await waitMs(220);
    }

    await waitMs(320);
}

async function resolveChestSpecial(cell, outcome) {
    const chestId = outcome?.chestId || pickBonusChestId();
    const chestCard = getBonusChestCardById(chestId)
        || bonusChestCards.find((card) => card.dataset.chestId === chestId);
    if (chestCard) {
        await animateBonusFlyToken({
            fromEl: cell.element,
            toEl: chestCard,
            text: BONUS_CHEST_META[chestId].symbol,
            className: 'chest',
            duration: 620
        });
    }
    await applyChestProgressById(chestId);
    await waitMs(220);
}

async function resolveMagnetSpecial(cell) {
    const diamondCells = getBonusDiamondCells().filter((diamondCell) => diamondCell && diamondCell.element);
    if (diamondCells.length === 0) {
        await waitMs(260);
        return;
    }

    const renderMagnetCollectedValue = (value) => {
        if (!cell || !cell.element) return;
        cell.element.classList.remove('empty-cell');
        cell.element.classList.add('has-reward');
        cell.element.innerHTML = createDiamondHitMarkup(value);
    };

    renderMagnetCollectedValue(0);
    const magnetTotal = diamondCells.reduce((sum, diamondCell) => sum + (Number(diamondCell.value) || 0), 0);

    await Promise.all(diamondCells.map(async (diamondCell) => {
        try {
            await animateBonusFlyToken({
                fromEl: diamondCell.element,
                toEl: cell.element,
                text: `+${Number(diamondCell.value) || 0}`,
                className: 'magnet',
                duration: 780
            });
        } catch (error) {
            console.error('Magnet fly animation failed:', error);
        }
    }));

    diamondCells.forEach((diamondCell) => {
        pulseBonusCell(diamondCell, 'magnet-hit', 520);
        diamondCell.settled = false;
        diamondCell.outcomeType = 'empty';
        diamondCell.value = 0;
        diamondCell.symbol = '';
        diamondCell.triggerStackId = '';
        renderBonusCell(diamondCell);
    });
    renderMagnetCollectedValue(magnetTotal);
    pulseBonusCell(cell, 'diamond-boost', 460);

    BONUS_STATE.diamondReward += magnetTotal;
    BONUS_STATE.totalReward += magnetTotal;
    updateBonusHud();

    const screenRect = gameContainer.getBoundingClientRect();
    const magnetCenter = getElementCenterInContainer(cell.element, gameContainer);
    createFloatingText(screenRect.left + magnetCenter.x, screenRect.top + magnetCenter.y - 20, `🎉大丰收 +${magnetTotal}`);
    if (bonusTotalReward) {
        bonusTotalReward.classList.remove('bonus-win-burst');
        void bonusTotalReward.offsetWidth;
        bonusTotalReward.classList.add('bonus-win-burst');
        setTimeout(() => {
            bonusTotalReward.classList.remove('bonus-win-burst');
        }, 480);
    }
    pulseBonusCell(cell, 'magnet-hit', 500);
    await waitMs(380);
}

function getSpecialRevealText(outcome) {
    if (!outcome) return '';
    if (outcome.type === 'triggerBlock') {
        if (outcome.stackId === 'add') return '✨加分果出现了！';
        if (outcome.stackId === 'chest') return '🧲磁铁星出现了！';
        return '🌟触发器出现了！';
    }
    if (outcome.type !== 'special') return '';
    if (outcome.specialType === 'add') return '✨加分果出现了！';
    if (outcome.specialType === 'chest') {
        const chestMeta = BONUS_CHEST_META[outcome.chestId];
        if (chestMeta) return `🎁${chestMeta.animalName}宝箱出现了！`;
        return '🎁宝箱出现了！';
    }
    if (outcome.specialType === 'magnet') return '🧲磁铁星出现了！';
    return '';
}

async function playSpecialReveal(cell, outcome) {
    if (!cell || !cell.element) return;
    cell.element.classList.remove('special-intro');
    void cell.element.offsetWidth;
    cell.element.classList.add('special-intro');

    const revealText = getSpecialRevealText(outcome);
    if (revealText) {
        const rect = cell.element.getBoundingClientRect();
        createFloatingText(rect.left + (rect.width / 2), rect.top - 6, revealText);
    }

    await waitMs(BONUS_GAME_CONFIG.specialRevealMs || 760);
    cell.element.classList.remove('special-intro');
}

async function resolveSpecialOutcome(cell, outcome) {
    if (!cell || !outcome || outcome.type !== 'special') return;

    if (outcome.specialType === 'add') {
        await resolveAddSpecial(cell);
    } else if (outcome.specialType === 'chest') {
        await resolveChestSpecial(cell, outcome);
    } else if (outcome.specialType === 'magnet') {
        await resolveMagnetSpecial(cell);
    }

    cell.settled = false;
    cell.outcomeType = 'empty';
    cell.value = 0;
    cell.symbol = '';
    cell.triggerStackId = '';
    renderBonusCell(cell);
}

function getBonusStackCollapseChance(stackId) {
    const layerCount = Math.max(0, Number(BONUS_STATE.triggerStacks[stackId]) || 0);
    if (layerCount <= 0 || BONUS_STATE.collapsedStacks[stackId]) return 0;
    const base = Number(BONUS_GAME_CONFIG.stackCollapseBaseChance) || 0;
    const perLayer = Number(BONUS_GAME_CONFIG.stackCollapsePerLayerChance) || 0;
    const maxChance = clampNumber(Number(BONUS_GAME_CONFIG.stackCollapseMaxChance) || 1, 0, 1);
    return clampNumber(base + (layerCount * perLayer), 0, maxChance);
}

function pickBonusUnlockStackIds(triggerHits = {}) {
    const addLocked = !isBonusStackUnlocked('add');
    const chestLocked = !isBonusStackUnlocked('chest');
    const addTriggeredThisSpin = (Number(triggerHits.add) || 0) > 0;
    const chestTriggeredThisSpin = (Number(triggerHits.chest) || 0) > 0;
    const addChance = addLocked && addTriggeredThisSpin ? getBonusStackCollapseChance('add') : 0;
    const chestChance = chestLocked && chestTriggeredThisSpin ? getBonusStackCollapseChance('chest') : 0;
    const simultaneousUnlockChance = clampNumber(Number(BONUS_GAME_CONFIG.simultaneousUnlockChance) || 0, 0, 1);

    if (addChance > 0 && chestChance > 0) {
        const bothChance = clampNumber(Math.min(addChance, chestChance) * (1 + simultaneousUnlockChance), 0, 1);
        if (bothChance > 0 && Math.random() < bothChance) {
            return ['add', 'chest'];
        }
    }

    const unlockIds = [];
    if (addChance > 0 && Math.random() < addChance) {
        unlockIds.push('add');
    }
    if (chestChance > 0 && Math.random() < chestChance) {
        unlockIds.push('chest');
    }
    return unlockIds;
}

async function resolveTriggerBlockOutcome(cell, outcome) {
    if (!cell || !outcome || outcome.type !== 'triggerBlock') return;

    const stackId = outcome.stackId;
    const meta = BONUS_TRIGGER_STACK_META[stackId];
    if (!meta || BONUS_STATE.collapsedStacks[stackId]) {
        cell.settled = false;
        cell.outcomeType = 'empty';
        cell.value = 0;
        cell.symbol = '';
        cell.triggerStackId = '';
        renderBonusCell(cell);
        return;
    }

    const stackCard = getBonusTriggerStackCardById(stackId)
        || bonusTriggerStackCards.find((card) => card.dataset.stackId === stackId);
    if (stackCard) {
        await animateBonusFlyToken({
            fromEl: cell.element,
            toEl: stackCard,
            text: meta.tokenLabel,
            className: 'trigger',
            duration: 620
        });
    }
    BONUS_STATE.triggerStacks[stackId] = (BONUS_STATE.triggerStacks[stackId] || 0) + 1;
    updateBonusTriggerStackUI();

    cell.settled = false;
    cell.outcomeType = 'empty';
    cell.value = 0;
    cell.symbol = '';
    cell.triggerStackId = '';
    renderBonusCell(cell);
    await waitMs(180);
}

async function tryCollapseTriggerStacks(triggerHits = {}) {
    const unlockIds = pickBonusUnlockStackIds(triggerHits);
    if (unlockIds.length === 0) return false;

    unlockIds.forEach((stackId) => {
        const card = getBonusTriggerStackCardById(stackId);
        if (card) {
            card.classList.remove('collapse-burst');
            void card.offsetWidth;
            card.classList.add('collapse-burst');
            setTimeout(() => {
                card.classList.remove('collapse-burst');
            }, 580);
        }
    });

    await playBonusGiftUnlockCinematic(unlockIds);
    unlockIds.forEach((stackId) => {
        BONUS_STATE.collapsedStacks[stackId] = true;
        applyBonusStackUnlock(stackId);
        BONUS_STATE.triggerStacks[stackId] = 0;
    });

    updateBonusTriggerStackUI();
    updateBonusChestRewardLabels();
    updateBonusChestRowVisibility();

    const currentRows = Math.max(1, Number(BONUS_STATE.boardRows) || Number(BONUS_GAME_CONFIG.initialRows) || 4);
    const nextRows = getBonusTargetRowsByUnlockState();
    if (nextRows !== currentRows) {
        setBonusBoardRows(nextRows);
        if (gameContainer && bonusGridBoard) {
            const gridRect = bonusGridBoard.getBoundingClientRect();
            const rowActionText = nextRows > currentRows ? '✨ 场地扩展至' : '场地缩小至';
            createFloatingText(gridRect.left + (gridRect.width / 2), gridRect.top - 8, `${rowActionText} ${nextRows}x${BONUS_GAME_CONFIG.columns}`);
        }
    }

    await waitMs(260);
    return true;
}

function flashBonusChest(chestId, rewardValue) {
    const chestCard = getBonusChestCardById(chestId)
        || bonusChestCards.find((card) => card.dataset.chestId === chestId);
    if (!chestCard) return;
    chestCard.classList.remove('win');
    void chestCard.offsetWidth;
    chestCard.classList.add('win');
    setTimeout(() => {
        chestCard.classList.remove('win');
    }, 550);

    const rect = chestCard.getBoundingClientRect();
    createFloatingText(rect.left + (rect.width / 2), rect.top + 8, `+${rewardValue}`);
}

function applyBonusOutcomeToCell(cell, outcome) {
    if (!cell || !outcome) return;

    if (outcome.type === 'empty') {
        cell.settled = false;
        cell.outcomeType = 'empty';
        cell.value = 0;
        cell.symbol = '';
        cell.triggerStackId = '';
        renderBonusCell(cell);
        return;
    }

    if (outcome.type === 'diamond') {
        cell.settled = true;
        cell.outcomeType = 'diamond';
        cell.value = Number(outcome.value) || 0;
        cell.symbol = '';
        cell.triggerStackId = '';
        // 不在这里直接加到总分，留到结算时（finalizeBonusGame）汇集
        renderBonusCell(cell);
        return;
    }

    if (outcome.type === 'special') {
        cell.settled = false;
        cell.outcomeType = 'special';
        cell.value = 0;
        cell.symbol = outcome.symbol || '?';
        cell.triggerStackId = '';
        renderBonusCell(cell);
        return;
    }

    if (outcome.type === 'triggerBlock') {
        cell.settled = false;
        cell.outcomeType = 'trigger-block';
        cell.value = 0;
        cell.symbol = outcome.symbol || '';
        cell.triggerStackId = outcome.stackId || '';
        renderBonusCell(cell);
        return;
    }
}

function createBonusCell(index) {
    const el = document.createElement('div');
    el.className = 'bonus-grid-cell empty-cell';
    return {
        index,
        element: el,
        settled: false,
        outcomeType: 'empty',
        value: 0,
        symbol: '',
        triggerStackId: ''
    };
}

function setBonusBoardRows(nextRows) {
    if (!bonusGridBoard) return;
    const minRows = Math.max(1, Number(BONUS_GAME_CONFIG.initialRows) || 4);
    const maxRows = Math.max(minRows, Number(BONUS_GAME_CONFIG.maxRows) || 5);
    const safeRows = clampNumber(Number(nextRows) || minRows, minRows, maxRows);
    const targetCount = getBonusCellCountByRows(safeRows);
    const columnCount = Math.max(1, Number(BONUS_GAME_CONFIG.columns) || 4);

    BONUS_STATE.boardRows = safeRows;
    bonusGridBoard.style.gridTemplateColumns = `repeat(${columnCount}, minmax(0, 1fr))`;

    while (BONUS_STATE.cells.length > targetCount) {
        const removedCell = BONUS_STATE.cells.pop();
        if (removedCell?.element) {
            removedCell.element.remove();
        }
    }

    while (BONUS_STATE.cells.length < targetCount) {
        const nextIndex = BONUS_STATE.cells.length;
        const cell = createBonusCell(nextIndex);
        bonusGridBoard.appendChild(cell.element);
        BONUS_STATE.cells.push(cell);
        renderBonusCell(cell);
    }

    BONUS_STATE.cells.forEach((cell, index) => {
        cell.index = index;
    });
    updateBonusHud();
    scheduleBonusResponsiveLayout();
}

function createBonusBoard() {
    if (!bonusGridBoard) return;
    bonusGridBoard.innerHTML = '';
    bonusGridBoard.classList.remove('is-spinning');
    BONUS_STATE.cells = [];
    BONUS_STATE.boardRows = Math.max(1, Number(BONUS_GAME_CONFIG.initialRows) || 4);
    setBonusBoardRows(BONUS_STATE.boardRows);
}

let bonusParticlesAnimationId = null;

function startBonusParticles() {
    if (!bonusParticlesCanvas) return;
    
    const ctx = bonusParticlesCanvas.getContext('2d');
    const width = bonusParticlesCanvas.width = window.innerWidth;
    const height = bonusParticlesCanvas.height = window.innerHeight;
    
    const particles = [];
    const emojis = ['🎈', '💎', '🎉', '🎁', '✨', '🦒', '🦓'];
    const particleCount = 40;
    
    // To optimize performance, pre-render emojis to offscreen canvases
    const emojiCanvases = {};
    emojis.forEach(emoji => {
        const offCanvas = document.createElement('canvas');
        const size = 60;
        offCanvas.width = size;
        offCanvas.height = size;
        const oCtx = offCanvas.getContext('2d', { alpha: true });
        oCtx.font = '40px Arial';
        oCtx.textAlign = 'center';
        oCtx.textBaseline = 'middle';
        oCtx.fillText(emoji, size/2, size/2);
        emojiCanvases[emoji] = offCanvas;
    });

    for (let i = 0; i < particleCount; i++) {
        particles.push({
            x: Math.random() * width,
            y: -20 - Math.random() * 100, // start above screen
            size: Math.random() * 20 + 15,
            speedY: Math.random() * 4 + 3,
            speedX: (Math.random() - 0.5) * 2,
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.1,
            emoji: emojis[Math.floor(Math.random() * emojis.length)]
        });
    }
    
    function draw() {
        ctx.clearRect(0, 0, width, height);
        
        let activeParticles = 0;
        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            
            p.y += p.speedY;
            p.x += p.speedX;
            p.rotation += p.rotationSpeed;
            
            // if it falls off screen, loop it back top for a continuous effect
            if (p.y > height + 50) {
                p.y = -50;
                p.x = Math.random() * width;
            }
            
            activeParticles++;
            
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation);
            const size = p.size;
            ctx.drawImage(emojiCanvases[p.emoji], -size/2, -size/2, size, size);
            ctx.restore();
        }
        
        bonusParticlesAnimationId = requestAnimationFrame(draw);
    }
    
    draw();
}

function stopBonusParticles() {
    if (bonusParticlesAnimationId) {
        cancelAnimationFrame(bonusParticlesAnimationId);
        bonusParticlesAnimationId = null;
    }
    if (bonusParticlesCanvas) {
        const ctx = bonusParticlesCanvas.getContext('2d');
        ctx.clearRect(0, 0, bonusParticlesCanvas.width, bonusParticlesCanvas.height);
    }
}

async function finalizeBonusGame() {
    if (!BONUS_STATE.active) return;

    // 先展示现有的分数（比如已经结算的宝箱或磁铁奖励）
    if (bonusTotalReward) {
        bonusTotalReward.textContent = BONUS_STATE.totalReward;
    }

    // 收集棋盘上所有的钻石
    const diamondCells = getBonusDiamondCells().filter(c => c && c.element);
    if (diamondCells.length > 0 && bonusTotalReward) {
        // 稍微等待一下让玩家看清最后一次转动的结果
        await waitMs(600);
        
        // 按照从上到下，从左到右的顺序收集
        diamondCells.sort((a, b) => a.index - b.index);

        for (const cell of diamondCells) {
            const addedValue = cell.value;
            if (addedValue <= 0) continue;

            const flyDuration = 500;
            await animateBonusFlyToken({
                fromEl: cell.element,
                toEl: bonusTotalReward,
                text: `+${addedValue}`,
                className: 'diamond',
                duration: flyDuration
            });

            const startValue = BONUS_STATE.totalReward;
            BONUS_STATE.diamondReward += addedValue;
            BONUS_STATE.totalReward += addedValue;

            // 目标UI震动发光反馈
            bonusTotalReward.classList.remove('bonus-win-burst');
            void bonusTotalReward.offsetWidth;
            bonusTotalReward.classList.add('bonus-win-burst');

            // 棋盘上的格子变暗
            cell.element.style.transition = 'opacity 0.3s, transform 0.3s';
            cell.element.style.opacity = '0.3';
            cell.element.style.transform = 'scale(0.8)';

            // 目标UI数字滚动变化
            const rollDuration = 300;
            const startTime = performance.now();
            const animateQuickRoll = (currentTime) => {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / rollDuration, 1);
                const currentVal = Math.floor(startValue + (progress * addedValue));
                bonusTotalReward.textContent = currentVal;
                
                if (progress < 1) {
                    requestAnimationFrame(animateQuickRoll);
                } else {
                    bonusTotalReward.textContent = BONUS_STATE.totalReward;
                }
            };
            requestAnimationFrame(animateQuickRoll);

            // 每个钻石之间的收集间隔
            await waitMs(150);
        }
        
        // 收集完成后稍微停顿
        await waitMs(800);
    }

    const bonusReward = BONUS_STATE.totalReward;
    const finalDiamondReward = BONUS_STATE.diamondReward;
    const finalChestReward = BONUS_STATE.chestReward;
    const finalScore = BONUS_STATE.baseCashoutScore + bonusReward;
    const chestSummary = BONUS_CHEST_IDS
        .map((id) => `${BONUS_CHEST_META[id].name}x${BONUS_STATE.chestAwards[id] || 0}`)
        .join(' / ');
    const bonusSummary = bonusReward > 0
        ? `获得奖励 +${bonusReward} (钻石 ${finalDiamondReward}, 宝箱 ${finalChestReward}, ${chestSummary}).`
        : '本次派对未获得额外奖励。';
    const finalMessage = `${BONUS_STATE.baseSummaryMessage} ${bonusSummary} 最终得分 ${finalScore}。`;
    const onFinish = BONUS_STATE.onFinish;

    BONUS_STATE.active = false;
    BONUS_STATE.isSpinning = false;
    updateBonusHud();

    // Show the custom result overlay if available
    if (bonusResultOverlay && bonusResultReward && bonusResultCollectBtn) {
        bonusResultOverlay.classList.remove('hidden');
        bonusResultReward.textContent = '0';
        
        startBonusParticles();

        // Wait a small moment before starting animation for better impact
        await waitMs(300);
        
        // Rolling number animation
        const duration = 1800;
        const startTime = performance.now();
        const animateRoll = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Ease out cubic
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const currentVal = Math.floor(easeOut * bonusReward);
            bonusResultReward.textContent = currentVal;
            
            if (progress < 1) {
                requestAnimationFrame(animateRoll);
            } else {
                bonusResultReward.textContent = bonusReward;
            }
        };
        requestAnimationFrame(animateRoll);

        // Wait for the user to click collect
        await new Promise((resolve) => {
            const onCollect = () => {
                bonusResultCollectBtn.removeEventListener('click', onCollect);
                stopBonusParticles();
                bonusResultOverlay.classList.add('hidden');
                resolve();
            };
            bonusResultCollectBtn.addEventListener('click', onCollect);
        });
    } else {
        await waitMs(500); // Fallback wait
    }

    await playSceneFadeSwitch(() => {
        setMainGameVisibility(true);
        // Note: Free Spin HUD visibility will be managed by main script's handleBonusGameFinished if needed.
    });

    resetBonusStateData();
    if (bonusGridBoard) {
        bonusGridBoard.innerHTML = '';
        bonusGridBoard.classList.remove('is-spinning');
    }
    updateBonusHud();

    if (typeof onFinish === 'function') {
        onFinish({
            bonusReward,
            diamondReward: finalDiamondReward,
            chestReward: finalChestReward,
            finalScore,
            summary: finalMessage
        });
    } else if (!bonusResultOverlay) {
        showModal('🎉派对结算🎉', finalMessage, finalScore);
    }
}

function scheduleBonusFinalize() {
    clearBonusFinishTimer();
    BONUS_STATE.finishTimer = setTimeout(() => {
        BONUS_STATE.finishTimer = null;
        void finalizeBonusGame();
    }, 720);
}

function runBonusSpin() {
    if (!BONUS_STATE.active || BONUS_STATE.isSpinning || BONUS_STATE.spinsLeft <= 0) return;
    clearBonusRollingIntervals();
    clearBonusStopTimeouts();
    clearBonusFinishTimer();

    const spinnableCells = getBonusSpinnableCells();
    if (spinnableCells.length === 0) {
        BONUS_STATE.spinsLeft = 0;
        updateBonusHud();
        scheduleBonusFinalize();
        return;
    }

    BONUS_STATE.isSpinning = true;
    BONUS_STATE.totalSpins += 1;
    BONUS_STATE.spinsLeft = Math.max(0, BONUS_STATE.spinsLeft - 1);
    if (bonusGridBoard) {
        bonusGridBoard.classList.add('is-spinning');
    }
    updateBonusHud();

    const rollingIntervalsByIndex = new Map();
    const outcomeMap = generateBonusSpinOutcomeMap(spinnableCells);
    spinnableCells.forEach((cell) => {
        cell.element.classList.add('spinning');
        renderBonusRollingCell(cell);
        const timer = setInterval(() => {
            renderBonusRollingCell(cell);
        }, BONUS_GAME_CONFIG.spinTickMs);
        BONUS_STATE.rollingIntervals.push(timer);
        rollingIntervalsByIndex.set(cell.index, timer);
    });

    const columnCount = Math.max(1, Number(BONUS_GAME_CONFIG.columns) || 4);
    const orderedStops = [...spinnableCells].sort((a, b) => {
        const colA = a.index % columnCount;
        const colB = b.index % columnCount;
        if (colA !== colB) return colA - colB;
        const rowA = Math.floor(a.index / columnCount);
        const rowB = Math.floor(b.index / columnCount);
        return rowA - rowB;
    });

    let hasNewCell = false;
    const triggerHitsThisSpin = {
        add: 0,
        chest: 0
    };
    const specialQueue = [];
    let remainingStops = orderedStops.length;
    orderedStops.forEach((cell) => {
        const colOrder = cell.index % columnCount;
        const stopDelay = BONUS_GAME_CONFIG.spinRollMs
            + (colOrder * BONUS_GAME_CONFIG.stopColumnStaggerMs)
            + Math.floor(Math.random() * BONUS_GAME_CONFIG.stopCellStaggerMs)
            + Math.floor(Math.random() * BONUS_GAME_CONFIG.stopJitterMs);
        const stopTimer = setTimeout(() => {
            const timer = rollingIntervalsByIndex.get(cell.index);
            if (timer) {
                clearInterval(timer);
            }
            cell.element.classList.remove('spinning');
            const outcome = outcomeMap.get(cell.index) || { type: 'empty' };
            if (outcome.type !== 'empty') {
                hasNewCell = true;
            }
            applyBonusOutcomeToCell(cell, outcome);
            if (outcome.type === 'special' || outcome.type === 'triggerBlock') {
                specialQueue.push({ cell, outcome });
            }
            cell.element.classList.remove('settle-pop');
            void cell.element.offsetWidth;
            cell.element.classList.add('settle-pop');
            setTimeout(() => {
                cell.element.classList.remove('settle-pop');
            }, 360);

            remainingStops = Math.max(0, remainingStops - 1);
            if (remainingStops !== 0) return;

            clearBonusRollingIntervals();
            clearBonusStopTimeouts();
            if (bonusGridBoard) {
                bonusGridBoard.classList.remove('is-spinning');
            }
            const resolveSpin = async () => {
                try {
                    for (let i = 0; i < specialQueue.length; i++) {
                        const item = specialQueue[i];
                        await playSpecialReveal(item.cell, item.outcome);
                        if (item.outcome.type === 'special') {
                            await resolveSpecialOutcome(item.cell, item.outcome);
                        } else if (item.outcome.type === 'triggerBlock') {
                            await resolveTriggerBlockOutcome(item.cell, item.outcome);
                            const hitStackId = item.outcome.stackId;
                            if (hitStackId === 'add' || hitStackId === 'chest') {
                                triggerHitsThisSpin[hitStackId] += 1;
                            }
                        }
                        await waitMs(BONUS_GAME_CONFIG.specialResolveGapMs || 320);
                    }
                    await tryCollapseTriggerStacks(triggerHitsThisSpin);

                    if (hasNewCell) {
                        const isReset = BONUS_STATE.spinsLeft < BONUS_GAME_CONFIG.maxSpins;
                        BONUS_STATE.spinsLeft = BONUS_GAME_CONFIG.maxSpins;
                        
                        if (isReset) {
                            if (bonusSpinMeta) {
                                bonusSpinMeta.classList.remove('is-reset-notice');
                                void bonusSpinMeta.offsetWidth;
                                bonusSpinMeta.classList.add('is-reset-notice');
                            }
                            if (bonusSpinsLeftInline) {
                                bonusSpinsLeftInline.classList.remove('spins-reset-anim');
                                void bonusSpinsLeftInline.offsetWidth;
                                bonusSpinsLeftInline.classList.add('spins-reset-anim');
                            }
                        }
                    }
                } catch (error) {
                    console.error('Bonus spin resolve failed:', error);
                } finally {
                    BONUS_STATE.isSpinning = false;
                    updateBonusHud();

                    if (BONUS_STATE.spinsLeft <= 0 || getBonusSpinnableCells().length === 0) {
                        scheduleBonusFinalize();
                    }
                }
            };
            void resolveSpin();
        }, stopDelay);
        BONUS_STATE.stopTimeouts.push(stopTimer);
    });
}

async function startBonusGame(baseCashoutScore, baseSummaryMessage, options = {}) {
    resetBonusStateData();
    BONUS_STATE.active = true;
    BONUS_STATE.spinsLeft = BONUS_GAME_CONFIG.maxSpins;
    BONUS_STATE.baseCashoutScore = baseCashoutScore;
    BONUS_STATE.baseSummaryMessage = baseSummaryMessage;
    BONUS_STATE.onFinish = (options && typeof options.onFinish === 'function')
        ? options.onFinish
        : null;

    if (freeSpinHud) {
        freeSpinHud.classList.add('hidden');
    }
    if (bonusSpinMeta) {
        bonusSpinMeta.classList.remove('is-reset-notice');
    }
    if (bonusSpinsLeftInline) {
        bonusSpinsLeftInline.classList.remove('spins-reset-anim');
    }

    await playSceneFadeSwitch(() => {
        setMainGameVisibility(false);
    });

    createBonusBoard();
    updateBonusChestProgressUI();
    updateBonusTriggerStackUI();
    updateBonusHud();
    scheduleBonusResponsiveLayout();
    await waitRaf();
    scheduleBonusResponsiveLayout();
}

function resetBonusGameUI() {
    resetBonusStateData();
    setMainGameVisibility(true);
    if (bonusGridBoard) {
        bonusGridBoard.innerHTML = '';
        bonusGridBoard.classList.remove('is-spinning');
    }
    bonusChestCards.forEach((card) => {
        card.classList.remove('win');
        const dots = card.querySelectorAll('.bonus-dot');
        dots.forEach((dot) => dot.classList.remove('active'));
    });
    bonusTriggerStackCards.forEach((card) => {
        card.classList.remove('unlocked', 'collapsed', 'collapse-burst');
    });
    updateBonusTriggerStackUI();
    updateBonusChestRewardLabels();
    updateBonusChestRowVisibility();
    if (bonusSpinMeta) {
        bonusSpinMeta.classList.remove('is-reset-notice');
    }
    if (bonusSpinsLeftInline) {
        bonusSpinsLeftInline.classList.remove('spins-reset-anim');
        bonusSpinsLeftInline.textContent = BONUS_GAME_CONFIG.maxSpins;
    }
    if (bonusTotalReward) {
        bonusTotalReward.textContent = '0';
    }
    if (bonusSpinBtn) {
        bonusSpinBtn.disabled = true;
    }
    scheduleBonusResponsiveLayout();
}

    globalScope.BonusGame = {
        init,
        startBonusGame,
        runBonusSpin,
        resetBonusGameUI
    };

    if (globalScope.WynneRegistry) {
        globalScope.WynneRegistry.register('BonusGame', globalScope.BonusGame);
    }
}(window));
