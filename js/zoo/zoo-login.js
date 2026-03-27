(function initZooLogin(globalScope) {
    'use strict';

    const economy = globalScope.WynneZooEconomy || null;
    if (!economy) {
        return;
    }

    const refs = {
        overlay: document.getElementById('login-overlay'),
        form: document.getElementById('login-form'),
        userIdInput: document.getElementById('login-user-id'),
        submitBtn: document.getElementById('login-submit-btn'),
        feedback: document.getElementById('login-feedback'),
        debugToggle: document.getElementById('login-debug-toggle'),
        debugPanel: document.getElementById('login-debug-panel'),
        debugClose: document.getElementById('login-debug-close'),
        debugUserIdInput: document.getElementById('debug-user-id'),
        debugCoinInput: document.getElementById('debug-add-coin'),
        debugDiamondInput: document.getElementById('debug-add-diamond'),
        debugTicketInput: document.getElementById('debug-add-ticket'),
        debugApplyBtn: document.getElementById('debug-apply-btn'),
        debugFeedback: document.getElementById('debug-feedback')
    };

    if (!refs.overlay || !refs.form || !refs.userIdInput) {
        return;
    }

    function setFeedback(element, message, tone = 'info') {
        if (!element) return;
        element.textContent = message || '';
        element.classList.remove('is-success', 'is-error');
        if (tone === 'success') {
            element.classList.add('is-success');
        } else if (tone === 'error') {
            element.classList.add('is-error');
        }
    }

    function toggleDebugPanel(forceOpen) {
        if (!refs.debugPanel || !refs.debugToggle) return;
        const shouldOpen = typeof forceOpen === 'boolean'
            ? forceOpen
            : refs.debugPanel.classList.contains('hidden');
        refs.debugPanel.classList.toggle('hidden', !shouldOpen);
        refs.debugToggle.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
    }

    function hideOverlay() {
        refs.overlay.classList.add('hidden');
        document.body.classList.remove('is-login-open');
        document.body.classList.add('is-logged-in');
    }

    function fillKnownUserIds() {
        const lastUserId = typeof economy.getLastUserId === 'function'
            ? economy.getLastUserId()
            : '';
        const activeUserId = typeof economy.getActiveUserId === 'function'
            ? economy.getActiveUserId()
            : '';
        const preferredUserId = String(activeUserId || lastUserId || '').trim();

        if (preferredUserId) {
            refs.userIdInput.value = preferredUserId;
            if (refs.debugUserIdInput) {
                refs.debugUserIdInput.value = preferredUserId;
            }
            setFeedback(refs.feedback, `检测到最近使用的用户 ID：${preferredUserId}`, 'success');
        }
    }

    function handleLoginSubmit(event) {
        event.preventDefault();
        const userId = String(refs.userIdInput.value || '').trim();
        const result = typeof economy.login === 'function'
            ? economy.login(userId)
            : { ok: false, message: '登录功能不可用。' };

        if (!result || !result.ok) {
            setFeedback(refs.feedback, result && result.message ? result.message : '登录失败，请重试。', 'error');
            refs.userIdInput.focus();
            return;
        }

        if (refs.debugUserIdInput && !refs.debugUserIdInput.value.trim()) {
            refs.debugUserIdInput.value = result.userId;
        }

        setFeedback(refs.feedback, `登录成功，已载入用户 ${result.userId} 的存档。`, 'success');

        const loadingEl = document.getElementById('login-loading');
        const loadingFill = document.getElementById('login-loading-fill');
        const loginCard = refs.overlay.querySelector('.login-card');
        const storyPlayer = globalScope.WynneStoryPlayer;
        const appShell = globalScope.WynneZooAppShell;

        // Determine which story will play after login
        const entryStoryId = (appShell && typeof appShell.getEntryStoryId === 'function')
            ? appShell.getEntryStoryId()
            : 'prologue';

        const canPreload = loadingEl && entryStoryId && storyPlayer && typeof storyPlayer.preloadStoryAssets === 'function';

        if (canPreload) {
            // Switch to loading view
            if (loginCard) loginCard.hidden = true;
            if (refs.debugToggle) refs.debugToggle.hidden = true;
            loadingEl.hidden = false;

            var minDelay = new Promise(function (r) { globalScope.setTimeout(r, 600); });
            var maxTimeout = new Promise(function (r) { globalScope.setTimeout(r, 8000); });
            var preload = storyPlayer.preloadStoryAssets(entryStoryId, function (loaded, total) {
                if (loadingFill) {
                    loadingFill.style.width = Math.round((loaded / total) * 100) + '%';
                }
            });

            Promise.all([Promise.race([preload, maxTimeout]), minDelay]).then(function () {
                hideOverlay();
                if (appShell && typeof appShell.enterPostLoginFlow === 'function') {
                    appShell.enterPostLoginFlow();
                } else if (appShell && typeof appShell.showZooHome === 'function') {
                    appShell.showZooHome();
                }
                // Restore login card for next time
                if (loginCard) loginCard.hidden = false;
                if (refs.debugToggle) refs.debugToggle.hidden = false;
                loadingEl.hidden = true;
                if (loadingFill) loadingFill.style.width = '0%';
            });
        } else {
            globalScope.setTimeout(function () {
                hideOverlay();
                if (appShell && typeof appShell.enterPostLoginFlow === 'function') {
                    appShell.enterPostLoginFlow();
                } else if (appShell && typeof appShell.showZooHome === 'function') {
                    appShell.showZooHome();
                }
            }, 220);
        }
    }

    function readPositiveInt(input) {
        return Math.max(0, Math.floor(Number(input && input.value) || 0));
    }

    function resetDebugAmounts() {
        if (refs.debugCoinInput) refs.debugCoinInput.value = '0';
        if (refs.debugDiamondInput) refs.debugDiamondInput.value = '0';
        if (refs.debugTicketInput) refs.debugTicketInput.value = '0';
    }

    function handleDebugApply() {
        const userId = String(refs.debugUserIdInput && refs.debugUserIdInput.value || '').trim();
        const coin = readPositiveInt(refs.debugCoinInput);
        const diamond = readPositiveInt(refs.debugDiamondInput);
        const playTicket = readPositiveInt(refs.debugTicketInput);

        const result = typeof economy.debugGrantResources === 'function'
            ? economy.debugGrantResources({ userId, coin, diamond, playTicket })
            : { ok: false, message: 'Debug 功能不可用。' };

        if (!result || !result.ok) {
            setFeedback(refs.debugFeedback, result && result.message ? result.message : '资源发放失败。', 'error');
            return;
        }

        setFeedback(refs.debugFeedback, result.message, 'success');
        if (!refs.userIdInput.value.trim()) {
            refs.userIdInput.value = result.userId;
        }
        resetDebugAmounts();
    }

    refs.form.addEventListener('submit', handleLoginSubmit);

    if (refs.debugToggle) {
        refs.debugToggle.addEventListener('click', () => {
            toggleDebugPanel();
        });
    }

    if (refs.debugClose) {
        refs.debugClose.addEventListener('click', () => {
            toggleDebugPanel(false);
        });
    }

    if (refs.debugApplyBtn) {
        refs.debugApplyBtn.addEventListener('click', handleDebugApply);
    }

    document.body.classList.add('is-login-open');
    document.body.classList.remove('is-logged-in');
    fillKnownUserIds();
    refs.userIdInput.focus();
}(window));
