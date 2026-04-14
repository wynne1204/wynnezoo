// ============================================================
// Slot Game — Shared Runtime State
// Loaded before slot-main.js via index.html.
// ============================================================

// --------------- Config Guard ---------------
if (typeof CONFIG === 'undefined') {
    throw new Error('js/slot/slot-config.js must be loaded before js/slot/slot-runtime-state.js');
}

// --------------- Runtime State ---------------
const STATE = {
    grid: new Uint8Array(0),
    revealed: new Uint8Array(0),
    cellBlocks: [],
    boardCellStates: [],
    boardResolvedFlags: new Uint8Array(0),
    stackHeight: 0,
    currentMultiplier: 1.0,
    rewardRetentionRatio: 1.0,
    isGameOver: false,
    stack: [],
    isAnimating: false,
    isBoardEntering: false,
    isSettling: false,
    mustOpenAllBeforeSettlement: false,
    remainingBombs: CONFIG.bombCount,
    pendingOpens: 0,
    revealedCount: 0,
    openedBlindBoxesThisRound: 0,
    wishHitCountThisRound: 0,
    roundReward: 0,
    bonusDiamondReward: 0,
    rewardsAppliedToZoo: false,
    totalSettlements: 0,
    realtimeSettlementEvents: [],
    symbolSettledSizeByKey: Object.create(null),
    boardPlan: [],
    boardMeta: null,
    isBonusGameActive: false,
    bonusGamePendingStart: false,
    hasTriggeredBonusGame: false,
    bonusTriggerBonusCount: 0,
    bonusTriggerWildCount: 0,
    freeSpinTriggersUsed: 0,
    unrevealedIndices: [],
    unrevealedPosByIndex: new Int32Array(0),
    gridCells: [],
    wishSymbolKey: '',
    remainingBlindBoxes: 0,
    restockPoolCount: 0,
    queuedBlindBoxes: 0,
    simpleSettlementPending: false,
    clearBoardBonusGrantedThisRound: false,
    selectedIndexes: [],
    selectionMode: 'none',
    pendingPlacementIndexes: [],
    currentCustomer: null,
    customerVisitCount: 0,
    lastCustomerSignature: ''
};

const FREE_SPIN_STATE = {
    active: false,
    pendingStart: false,
    isEntering: false,
    isSettling: false,
    isTransitioning: false,
    pausedByBonus: false,
    spinsLeft: 0,
    totalReward: 0,
    items: [],
    itemMap: new Map(),
    cellBlocks: new Array(CONFIG.gridSize).fill(null),
    cellElementsByIndex: new Array(CONFIG.gridSize).fill(null),
    symbolSettledSizeByKey: Object.create(null),
    savedBoardMarkup: '',
    savedGridCellCount: 0
};

// 黏性百搭跨轮状态
const STICKY_WILD_STATE = {
    carryRoundsByIndex: new Int16Array(0),
    activeMask: new Uint8Array(0)
};

// --------------- Preloaded Assets ---------------
let bombMonkeyFramesPreloaded = false;
const GRID_BOX_UNOPEN_IMAGE = new Image();
GRID_BOX_UNOPEN_IMAGE.src = GRID_BOX_UNOPEN_IMAGE_SRC;
const GRID_BOX_OPEN_IMAGE = new Image();
GRID_BOX_OPEN_IMAGE.src = GRID_BOX_OPEN_IMAGE_SRC;

// --------------- Runtime Flags & Constants ---------------
const LAZY_MODULES = {
    effects: null,
    bonus: null
};

const AUTO_OPEN_HOLD_MS = 450;
const AUTO_OPEN_LOOP_DELAY_MS = 140;
const AUTO_OPEN_RETRY_DELAY_MS = 90;
const FREE_SPIN_TRIGGER_BONUS_FEEDBACK_MS = 1200;
const BONUS_TRIGGER_BUTTON_FEEDBACK_MS = 140;
const CUSTOMER_SWITCH_DELAY_MS = 320;
const CUSTOMER_SATISFIED_FEEDBACK_MS = 420;
const SIMPLE_RESTOCK_FLIGHT_MS = 320;
const SIMPLE_NEXT_TARGET_FEEDBACK_MS = 360;

const AUTO_OPEN_STATE = {
    active: false,
    holdTimerId: null,
    loopTimerId: null,
    suppressNextButtonClick: false,
    suppressNextScreenClick: false
};

let isGridBoardClickBound = false;
let activeBombWheelOverlay = null;
let stackProgressCells = [];
let lastRenderedSatisfactionValue = 0;
let bonusTriggerOverlayResolver = null;
let bonusTriggerConfirmPending = false;
let bonusTriggerCheckQueued = false;

const STACK_VIEWPORT_STATE = {
    autoFollow: true,
    hasShownScrollHint: false,
    hintTimerId: null,
    hintElement: null
};

const SLOT_GAME_RUNTIME = {
    initialized: false,
    viewActive: false
};

const SIMPLE_SLOT_MODE = Boolean(CONFIG.simpleCoreMode);
