// ============================================================
// Slot Game — Customer System
// Extracted from slot-main.js for maintainability.
// This file MUST be loaded before slot-main.js.
// ============================================================

function getCustomerConfig() {
    const rawConfig = CONFIG.customerSystem || {};
    const targetCandidate = rawConfig.target
        ?? CONFIG.customerSatisfactionTarget
        ?? CONFIG.bonusTriggerProgressTarget
        ?? 8;
    const safeTarget = Math.max(1, Math.floor(Number(targetCandidate) || 8));
    const portraitImages = Array.isArray(rawConfig.portraitImages)
        ? rawConfig.portraitImages
        : (Array.isArray(CONFIG.customerPortraits) ? CONFIG.customerPortraits : []);
    const preferencePool = Array.isArray(rawConfig.preferencePool)
        ? rawConfig.preferencePool
        : (Array.isArray(rawConfig.preferenceSymbols)
            ? rawConfig.preferenceSymbols
            : (Array.isArray(CONFIG.customerPreferencePool)
                ? CONFIG.customerPreferencePool
                : (Array.isArray(CONFIG.customerPreferenceSymbols) ? CONFIG.customerPreferenceSymbols : [])));

    return {
        target: safeTarget,
        portraitImages: portraitImages.length > 0
            ? portraitImages
            : [
                './Texture/story/立绘/游客-1.webp',
                './Texture/story/立绘/游客-2.webp',
                './Texture/story/立绘/游客-3.webp',
                './Texture/story/立绘/游客-4.webp'
            ],
        preferencePool: preferencePool.length > 0 ? preferencePool : [...NORMAL_SYMBOL_ORDER]
    };
}

function getCustomerSatisfactionTarget() {
    return getCustomerConfig().target;
}

function normalizeCustomerPreferenceKey(symbolKey) {
    const raw = String(symbolKey || '').trim();
    if (!raw) return 'normal:S1';
    if (raw.startsWith('normal:')) return raw;
    const normalizedSymbol = NORMAL_SYMBOL_ORDER.includes(raw) ? raw : 'S1';
    return `normal:${normalizedSymbol}`;
}

function getCustomerPreferenceSymbolId(symbolKey) {
    const normalizedKey = normalizeCustomerPreferenceKey(symbolKey);
    const [, symbolId = 'S1'] = normalizedKey.split(':');
    return NORMAL_SYMBOL_ORDER.includes(symbolId) ? symbolId : 'S1';
}

function getCurrentCustomerPreferenceKey() {
    if (SIMPLE_SLOT_MODE && hasSimpleWishSelection()) {
        return normalizeCustomerPreferenceKey(STATE.wishSymbolKey);
    }
    return STATE.currentCustomer ? normalizeCustomerPreferenceKey(STATE.currentCustomer.preferenceKey) : null;
}

function playSimpleModeSelectedCellFeedback(cell) {
    if (!cell) return;
    // 仅保留空函数，不触发结算动画。
    // 选中状态的放大和悬浮效果已由 .selected CSS 类的 transition 接管。
}

function pulseCustomerHeartRange(startValue, endValue) {
    if (!Array.isArray(customerHeartRows) || customerHeartRows.length <= 0) return;
    const start = Math.max(1, Math.floor(Number(startValue) || 0));
    const end = Math.max(start, Math.floor(Number(endValue) || 0));
    const total = customerHeartRows.length;
    for (let value = start; value <= end; value++) {
        const rowIndex = Math.max(0, total - value);
        const row = customerHeartRows[rowIndex];
        const icon = row && row.querySelector('.heart-icon');
        const delay = (value - start) * 120;
        window.setTimeout(() => {
            // 强烈的弹跳 + 发光动画
            animateUiElement(icon, [
                { transform: 'scale(0.6)' },
                { transform: 'scale(1.45)', filter: 'drop-shadow(0 0 8px rgba(255,107,132,0.9)) brightness(1.3)' },
                { transform: 'scale(0.92)', filter: 'brightness(1.05)' },
                { transform: 'scale(1.12)', filter: 'drop-shadow(0 0 4px rgba(255,107,132,0.5)) brightness(1.15)' },
                { transform: 'scale(1)', filter: 'brightness(1)' }
            ], {
                duration: 550,
                easing: 'cubic-bezier(0.22, 1, 0.36, 1)'
            });
            // 爱心位置迸发小粒子
            if (icon) {
                const rect = icon.getBoundingClientRect();
                const cx = rect.left + rect.width / 2;
                const cy = rect.top + rect.height / 2;
                createHeartBurstParticles(cx, cy);
            }
        }, delay);
    }
}

function createRandomCustomerProfile() {
    const customerConfig = getCustomerConfig();
    const portraits = customerConfig.portraitImages;
    const preferences = customerConfig.preferencePool
        .filter((item) => NORMAL_SYMBOL_ORDER.includes(String(item || '').trim()))
        .map((item) => String(item).trim());

    let chosenPortrait = pickRandomItem(portraits) || portraits[0];
    let chosenPreference = pickRandomItem(preferences) || preferences[0] || 'S1';
    let signature = `${chosenPortrait}|${chosenPreference}`;

    for (let attempt = 0; attempt < 6 && signature === STATE.lastCustomerSignature; attempt++) {
        chosenPortrait = pickRandomItem(portraits) || chosenPortrait;
        chosenPreference = pickRandomItem(preferences) || chosenPreference;
        signature = `${chosenPortrait}|${chosenPreference}`;
    }

    STATE.customerVisitCount += 1;
    return {
        id: `customer-${STATE.customerVisitCount}`,
        portraitSrc: chosenPortrait,
        portraitAlt: `顾客 ${STATE.customerVisitCount}`,
        preferenceKey: normalizeCustomerPreferenceKey(chosenPreference)
    };
}

function ensureCurrentCustomer() {
    if (STATE.currentCustomer) {
        renderCurrentCustomer();
        return STATE.currentCustomer;
    }
    STATE.currentCustomer = createRandomCustomerProfile();
    STATE.lastCustomerSignature = `${STATE.currentCustomer.portraitSrc}|${getCustomerPreferenceSymbolId(STATE.currentCustomer.preferenceKey)}`;
    renderCurrentCustomer();
    return STATE.currentCustomer;
}

async function advanceToNextCustomer() {
    const activePanel = customerPanel || customerPortraitDisplay;
    // 离场粒子：从顾客立绘中心位置发射
    const portraitEl = customerPortraitDisplay || customerPanel;
    if (portraitEl) {
        const rect = portraitEl.getBoundingClientRect();
        createCustomerDepartureParticles(rect.left + rect.width / 2, rect.top + rect.height * 0.35);
    }
    animateUiElement(activePanel, [
        { opacity: 1, transform: 'translateY(0) scale(1)' },
        { opacity: 0.12, transform: 'translateY(20px) scale(0.96)' }
    ], {
        duration: CUSTOMER_SWITCH_DELAY_MS,
        easing: 'ease-in'
    });
    await waitMs(CUSTOMER_SWITCH_DELAY_MS);

    STATE.currentCustomer = createRandomCustomerProfile();
    STATE.lastCustomerSignature = `${STATE.currentCustomer.portraitSrc}|${getCustomerPreferenceSymbolId(STATE.currentCustomer.preferenceKey)}`;
    renderCurrentCustomer();

    animateUiElement(activePanel, [
        { opacity: 0.12, transform: 'translateY(20px) scale(0.96)' },
        { opacity: 1, transform: 'translateY(0) scale(1)' }
    ], {
        duration: 340,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)'
    });
}

async function handleSatisfiedCustomer(event, clusterCenter) {
    if (!event || !event.satisfiesCustomer) return;

    // 气泡强烈弹跳 + 发光反馈
    animateUiElement(customerPreferenceBubble || customerPanel, [
        { transform: 'scale(1)', filter: 'brightness(1)' },
        { transform: 'scale(1.25)', filter: 'brightness(1.3) drop-shadow(0 0 12px rgba(255,215,0,0.7))' },
        { transform: 'scale(0.92)', filter: 'brightness(1.05)' },
        { transform: 'scale(1.08)', filter: 'brightness(1.15)' },
        { transform: 'scale(1)', filter: 'brightness(1)' }
    ], {
        duration: CUSTOMER_SATISFIED_FEEDBACK_MS + 100,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)'
    });
    // 立绘开心跳跃
    animateUiElement(customerPortraitDisplay, [
        { transform: 'translateY(0) scale(1)' },
        { transform: 'translateY(-14px) scale(1.05)' },
        { transform: 'translateY(2px) scale(0.98)' },
        { transform: 'translateY(-4px) scale(1.02)' },
        { transform: 'translateY(0) scale(1)' }
    ], {
        duration: CUSTOMER_SATISFIED_FEEDBACK_MS + 100,
        easing: 'ease-out'
    });

    // 气泡位置迸发爱心粒子
    if (customerPreferenceBubble) {
        const rect = customerPreferenceBubble.getBoundingClientRect();
        createHeartBurstParticles(rect.left + rect.width / 2, rect.top + rect.height / 2);
    }

    if (clusterCenter) {
        createFloatingText(clusterCenter.x, clusterCenter.y - 84, `❤ +${event.satisfactionGain}`);
    }

    await waitMs(CUSTOMER_SATISFIED_FEEDBACK_MS);
    await advanceToNextCustomer();
}

function decorateSettlementEventWithCustomerOutcome(event) {
    ensureCurrentCustomer();
    const preferenceKey = getCurrentCustomerPreferenceKey();
    const safeSize = Math.max(0, Math.floor(Number(event && event.size) || 0));
    const matchesCustomerPreference = Boolean(
        event
        && preferenceKey
        && String(event.symbolKey || '') === String(preferenceKey)
        && safeSize >= Math.max(1, Math.floor(Number(CONFIG.clusterPayout.minClusterSize) || 3))
    );
    const satisfactionGain = matchesCustomerPreference ? Math.max(0, safeSize - 2) : 0;
    event.customerPreferenceKey = preferenceKey;
    event.satisfactionGain = satisfactionGain;
    event.satisfiesCustomer = satisfactionGain > 0;
    return event;
}