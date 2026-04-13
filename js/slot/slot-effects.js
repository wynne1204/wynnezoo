// ============================================================
// Slot Game — Effects Dispatch & Lazy Loading
// Extracted from slot-main.js for maintainability.
// This file MUST be loaded before slot-main.js.
// ============================================================

function loadScriptOnce(key, src) {
    if (LAZY_MODULES[key]) {
        return LAZY_MODULES[key];
    }
    LAZY_MODULES[key] = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => {
            LAZY_MODULES[key] = null;
            reject(new Error(`Failed to load ${src}`));
        };
        document.head.appendChild(script);
    });
    return LAZY_MODULES[key];
}

function loadEffectsApi() {
    if (window.GameEffects) {
        return Promise.resolve(window.GameEffects);
    }
    return loadScriptOnce('effects', './js/effects.js')
        .then(() => window.GameEffects || null)
        .catch((error) => {
            console.error('Effects module load failed:', error);
            return null;
        });
}

function dispatchEffect(name, args) {
    const api = window.GameEffects;
    const immediateFn = api && api[name];
    if (typeof immediateFn === 'function') {
        immediateFn(...args);
        return;
    }

    void loadEffectsApi().then((loadedApi) => {
        const fn = loadedApi && loadedApi[name];
        if (typeof fn === 'function') {
            fn(...args);
        }
    });
}

function createParticles(x, y, color, count = 10) {
    dispatchEffect('createParticles', [x, y, color, count]);
}

function createFloatingText(x, y, text) {
    dispatchEffect('createFloatingText', [x, y, text]);
}

function createSafeShockwave(x, y) {
    dispatchEffect('createSafeShockwave', [x, y]);
}

function createSafeBurstParticles(x, y) {
    dispatchEffect('createSafeBurstParticles', [x, y]);
}

function createShockwave(x, y) {
    dispatchEffect('createShockwave', [x, y]);
}

function createConfettiFireworks() {
    dispatchEffect('createConfettiFireworks', []);
}

function createCustomerDepartureParticles(x, y) {
    dispatchEffect('createCustomerDepartureParticles', [x, y]);
}

function createCoinFloatingText(x, y, text) {
    dispatchEffect('createCoinFloatingText', [x, y, text]);
}

function createCoinRain(coinCount) {
    dispatchEffect('createCoinRain', [coinCount]);
}

function createCoinFall(coinCount) {
    dispatchEffect('createCoinFall', [coinCount]);
}

function createHeartBurstParticles(x, y) {
    dispatchEffect('createHeartBurstParticles', [x, y]);
}

function preloadBombMonkeyFrames() {
    if (bombMonkeyFramesPreloaded) return;
    bombMonkeyFramesPreloaded = true;
    BOMB_MONKEY_ANIM_FRAMES.forEach((src) => {
        const preload = new Image();
        preload.src = src;
    });
}

function scheduleDeferredPreload() {
    const run = () => {
        preloadBombMonkeyFrames();
        void loadEffectsApi();
    };
    if (typeof window.requestIdleCallback === 'function') {
        window.requestIdleCallback(run, { timeout: 1200 });
        return;
    }
    setTimeout(run, 900);
}

function getBonusModuleDeps() {
    return {
        statusBarTop,
        mainStage,
        controlPanel,
        bonusScreen,
        bonusGridBoard,
        bonusSpinBtn,
        bonusSpinMeta,
        bonusSpinsLeftInline,
        bonusTotalReward,
        bonusChestCards,
        bonusChestCardMap,
        bonusChestRow,
        bonusTriggerStackRow,
        bonusTriggerStackCards,
        bonusTriggerStackCardMap,
        sceneFade,
        gameContainer,
        bonusResultOverlay,
        bonusResultReward,
        bonusResultCollectBtn,
        bonusParticlesCanvas,
        freeSpinHud,
        createFloatingText,
        createBombWheel,
        removeBombWheel,
        highlightWinningSegment,
        showModal,
        waitMs,
        waitRaf
    };
}

function applyBaseBonusUiReset() {
    [statusBarTop, mainStage, controlPanel].forEach((el) => {
        if (!el) return;
        el.classList.remove('hidden');
    });
    if (bonusScreen) {
        bonusScreen.classList.add('hidden');
    }
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
        card.classList.remove('hidden');
        const giftImg = card.querySelector('[data-role="gift-img"]');
        if (!giftImg) return;
        if (card.dataset.stackId === 'add') {
            giftImg.src = './Texture/Icon/Giftpack1.png';
            giftImg.alt = 'Giftpack1';
            return;
        }
        if (card.dataset.stackId === 'chest') {
            giftImg.src = './Texture/Icon/Giftpack2.png';
            giftImg.alt = 'Giftpack2';
        }
    });
    if (bonusChestRow) {
        bonusChestRow.classList.add('hidden');
    }
    if (bonusTriggerStackRow) {
        bonusTriggerStackRow.classList.remove('hidden');
    }
    if (bonusSpinsLeftInline) {
        bonusSpinsLeftInline.textContent = '3';
    }
    if (bonusTotalReward) {
        bonusTotalReward.textContent = '0';
    }
    if (bonusSpinBtn) {
        bonusSpinBtn.disabled = true;
        bonusSpinBtn.classList.remove('spinning');
        bonusSpinBtn.textContent = 'SPIN';
    }
}

function loadBonusApi() {
    if (window.BonusGame) {
        if (typeof window.BonusGame.init === 'function') {
            window.BonusGame.init(getBonusModuleDeps());
        }
        return Promise.resolve(window.BonusGame);
    }
    return loadScriptOnce('bonus', './js/bonus.js')
        .then(() => {
            const api = window.BonusGame || null;
            if (api && typeof api.init === 'function') {
                api.init(getBonusModuleDeps());
            }
            return api;
        })
        .catch((error) => {
            console.error('Bonus module load failed:', error);
            return null;
        });
}

function runBonusSpin() {
    const currentApi = window.BonusGame;
    if (currentApi && typeof currentApi.runBonusSpin === 'function') {
        currentApi.runBonusSpin();
        return;
    }
    void loadBonusApi().then((api) => {
        if (api && typeof api.runBonusSpin === 'function') {
            api.runBonusSpin();
        }
    });
}

function startBonusGame(baseCashoutScore, baseSummaryMessage, options = {}) {
    stopAutoOpen();
    return loadBonusApi().then((api) => {
        if (!api || typeof api.startBonusGame !== 'function') {
            if (typeof options.onFinish === 'function') {
                options.onFinish({
                    bonusReward: 0,
                    finalScore: baseCashoutScore,
                    summary: `${baseSummaryMessage} Bonus module failed to load.`
                });
            }
            return Promise.resolve();
        }
        return api.startBonusGame(baseCashoutScore, baseSummaryMessage, options);
    });
}

function resetBonusGameUI() {
    const currentApi = window.BonusGame;
    if (!currentApi || typeof currentApi.resetBonusGameUI !== 'function') {
        applyBaseBonusUiReset();
        return;
    }
    currentApi.resetBonusGameUI();
}