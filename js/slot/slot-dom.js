// ============================================================
// Slot Game — Shared DOM References
// Loaded before slot-main.js via index.html.
// ============================================================

const gridBoard = document.getElementById('grid-board');
const stackContainer = document.getElementById('stack-container');
const towerViewport = document.getElementById('tower-viewport');
const towerSection = document.querySelector('.tower-section');
const statusBarTop = document.querySelector('.status-bar-top');
const mainStage = document.querySelector('.main-stage');
const controlPanel = document.querySelector('.control-panel');
const stackProgressRuler = document.getElementById('stack-progress-ruler');
const multiplierBubble = document.getElementById('multiplier-bubble');
const multiplierFill = document.getElementById('multiplier-fill');
const customerSatisfaction = document.getElementById('customer-satisfaction');
const customerHeartRows = Array.from(document.querySelectorAll('#customer-satisfaction .heart-row'));
const customerPanel = document.getElementById('customer-panel');
const customerPortraitDisplay = document.getElementById('customer-portrait');
const customerPreferenceBubble = document.getElementById('customer-preference-bubble');
const customerPreferenceBlockDisplay = document.getElementById('customer-preference-block');
const currentRewardDisplay = document.getElementById('current-reward');
const slotResourceCoinDisplay = document.getElementById('slot-resource-coin');
const slotResourceDiamondDisplay = document.getElementById('slot-resource-diamond');
const slotResourceTicketDisplay = document.getElementById('slot-resource-ticket');
const bombCountDisplay = document.getElementById('bomb-count');
const cashoutBtn = document.getElementById('cashout-btn');
const randomBtn = document.getElementById('random-btn');
const slotBackBtn = document.getElementById('slot-back-btn');
const multiOpenCountDisplay = document.getElementById('multi-open-count');
const statusLabels = Array.from(document.querySelectorAll('.status-info-group .status-label'));
const modalOverlay = document.getElementById('modal-overlay');
const modalTitle = document.getElementById('modal-title');
const modalMessage = document.getElementById('modal-message');
const finalReward = document.getElementById('final-reward');
const modalRestartBtn = document.getElementById('modal-restart-btn');
const flashOverlay = document.getElementById('flash-overlay');
const bonusScreen = document.getElementById('bonus-screen');
const bonusGridBoard = document.getElementById('bonus-grid-board');
const bonusSpinBtn = document.getElementById('bonus-spin-btn');
const bonusSpinMeta = document.getElementById('bonus-spin-meta');
const bonusSpinsLeftInline = document.getElementById('bonus-spins-left-inline');
const bonusTotalReward = document.getElementById('bonus-total-reward');
const freeSpinHud = document.getElementById('free-spin-hud');
const freeSpinSpinsLeft = document.getElementById('free-spin-spins-left');
const freeSpinTotalReward = document.getElementById('free-spin-total-reward');
const freeSpinTriggerOverlay = document.getElementById('free-spin-trigger-overlay');
const freeSpinStartBtn = document.getElementById('free-spin-start-btn');
const bonusTriggerOverlay = document.getElementById('bonus-trigger-overlay');
const bonusTriggerStartBtn = document.getElementById('bonus-trigger-start-btn');
const freeSpinResultOverlay = document.getElementById('free-spin-result-overlay');
const freeSpinResultReward = document.getElementById('free-spin-result-reward');
const freeSpinResultCollectBtn = document.getElementById('free-spin-result-collect-btn');
const freeSpinParticlesCanvas = document.getElementById('free-spin-particles-canvas');
const bonusResultOverlay = document.getElementById('bonus-result-overlay');
const bonusResultReward = document.getElementById('bonus-result-reward');
const bonusResultCollectBtn = document.getElementById('bonus-result-collect-btn');
const bonusParticlesCanvas = document.getElementById('bonus-particles-canvas');
const restockTray = document.getElementById('restock-tray');
const restockTrayBoxes = document.getElementById('restock-tray-boxes');
const gridSelectionHint = document.getElementById('grid-selection-hint');
const bonusChestCards = Array.from(document.querySelectorAll('.bonus-chest[data-chest-id]'));
const bonusChestCardMap = new Map(
    bonusChestCards
        .filter((card) => card?.dataset?.chestId)
        .map((card) => [card.dataset.chestId, card])
);
const bonusChestRow = document.querySelector('.bonus-chest-row');
const bonusTriggerStackRow = document.querySelector('.bonus-trigger-stack-row');
const bonusTriggerStackCards = Array.from(document.querySelectorAll('.bonus-trigger-stack[data-stack-id]'));
const bonusTriggerStackCardMap = new Map(
    bonusTriggerStackCards
        .filter((card) => card?.dataset?.stackId)
        .map((card) => [card.dataset.stackId, card])
);
const sceneFade = document.getElementById('scene-fade');
const gameContainer = document.querySelector('.game-container');
