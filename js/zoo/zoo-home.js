(function initZooHomeModule(globalScope) {
    'use strict';

    const economy = globalScope.WynneZooEconomy || null;
    const balance = globalScope.WynneZooBalance || null;
    const refs = {
        initialized: false,
        homeScreen: null,
        resourceCoin: null,
        resourceDiamond: null,
        resourceTicket: null,
        devNote: null,
        homeBackground: null,
        habitatStageList: null,
        mainTaskButton: null,
        mainTaskText: null,
        habitatResidentPill: null,
        panel: null,
        panelCloseButton: null,
        panelTitle: null,
        tabContent: null,
        tabButtons: [],
        navTrip: null,
        navCollection: null,
        collectionGuide: null,
        slotStatus: null,
        slotHint: null,
        entryButton: null,
        entryButtonText: null,
        toast: null,
        storyPreviewTrigger: null,
        storyPreviewPanel: null,
        storyPreviewClose: null,
        storyPreviewList: null,
        unlockPopup: null,
        unlockPopupIcon: null,
        unlockPopupTitle: null,
        unlockPopupBtn: null
    };

    const localState = {
        slotSnapshot: null,
        unsubscribeEconomy: null,
        toastTimerId: 0,
        storyPreviewOpen: false,
        storyEntryCount: 0,
        storyPreviewSignature: '',
        unlockNotificationQueue: [],
        unlockPopupActive: false,
        lastConstructionHabitatId: '',
        buildEffectActive: false,
        lastHabitatArtById: {},
        lastHabitatStageKey: ''
    };
    const assetPreloadCache = new Map();
    const HABITAT_ID_BY_SPECIES_ID = Object.freeze({
        'red-panda': 'red-panda-grove'
    });
    const DIRECT_BUILD_HABITAT_ID = 'red-panda-grove';
    const RED_PANDA_POST_BUILD_STORY_ID = 'post-build-red-panda';
    const RED_PANDA_POST_BUILD_IMAGE_SRC = './Texture/ZOO/redpanda/habitat-level-1-redpanda.webp';
    const selectorApi = globalScope.WynneZooHomeSelectors && typeof globalScope.WynneZooHomeSelectors.create === 'function'
        ? globalScope.WynneZooHomeSelectors.create({
            balance,
            hasUnfinishedRound,
            getInfoHabitat
        })
        : null;
    const viewHelpers = globalScope.WynneZooHomeViewHelpers && typeof globalScope.WynneZooHomeViewHelpers.create === 'function'
        ? globalScope.WynneZooHomeViewHelpers.create({
            escapeHtml,
            getHabitatArt,
            getHabitatArtKey
        })
        : null;
    const rendererApi = globalScope.WynneZooHomeRenderers && typeof globalScope.WynneZooHomeRenderers.create === 'function'
        ? globalScope.WynneZooHomeRenderers.create({
            buildInlineStyle,
            directBuildHabitatId: DIRECT_BUILD_HABITAT_ID,
            escapeHtml,
            getHabitatArt,
            getHabitatStageLayout,
            getHabitatTierDefinitions,
            renderEnvironmentTierCard,
            renderFactRows,
            renderMetricCards,
            renderOverviewCard,
            shouldAnimateHabitatArtSwap,
            shouldShowHabitatBuildGuide
        })
        : null;

    if (!selectorApi || !viewHelpers || !rendererApi) {
        throw new Error('zoo-home helper modules must load before zoo-home.js');
    }

    function cacheDom() {
        refs.homeScreen = document.getElementById('zoo-home-screen');
        refs.resourceCoin = document.getElementById('zoo-resource-coin');
        refs.resourceDiamond = document.getElementById('zoo-resource-diamond');
        refs.resourceTicket = document.getElementById('zoo-resource-ticket');
        refs.devNote = document.getElementById('zoo-home-dev-note');
        refs.homeBackground = document.getElementById('zoo-home-bg');
        refs.habitatStageList = document.getElementById('habitat-stage-list');
        refs.mainTaskButton = document.getElementById('zoo-main-task-btn');
        refs.mainTaskText = document.getElementById('zoo-main-task-text');
        refs.habitatResidentPill = document.getElementById('habitat-resident-pill');
        refs.panel = document.getElementById('habitat-detail-panel');
        refs.panelCloseButton = document.getElementById('habitat-panel-close');
        refs.panelTitle = document.getElementById('habitat-panel-title');
        refs.tabContent = document.getElementById('habitat-tab-content');
        refs.tabButtons = Array.from(document.querySelectorAll('.habitat-tab-btn[data-tab]'));
        refs.navTrip = document.getElementById('zoo-nav-trip');
        refs.navCollection = document.getElementById('zoo-nav-collection');
        refs.collectionGuide = document.getElementById('zoo-home-collection-guide');
        refs.slotStatus = document.getElementById('zoo-home-slot-status');
        refs.slotHint = document.getElementById('zoo-home-slot-hint');
        refs.entryButton = document.getElementById('enter-slot-btn');
        refs.entryButtonText = document.getElementById('enter-slot-btn-text');
        refs.toast = document.getElementById('zoo-home-toast');
        refs.storyPreviewTrigger = document.getElementById('story-preview-trigger');
        refs.storyPreviewPanel = document.getElementById('story-preview-panel');
        refs.storyPreviewClose = document.getElementById('story-preview-close');
        refs.storyPreviewList = document.getElementById('story-preview-list');
        refs.unlockPopup = document.getElementById('system-unlock-popup');
        refs.unlockPopupIcon = document.getElementById('system-unlock-popup-icon');
        refs.unlockPopupTitle = document.getElementById('system-unlock-popup-title');
        refs.unlockPopupBtn = document.getElementById('system-unlock-popup-btn');
        if (refs.navCollection && refs.collectionGuide && refs.collectionGuide.parentNode !== refs.navCollection) {
            refs.navCollection.appendChild(refs.collectionGuide);
        }
    }

    function escapeHtml(value) {
        // Delegate to the shared utility in js/utils.js.
        // Falls back to inline implementation if utils.js hasn't loaded.
        if (typeof globalScope.escapeHtml === 'function') {
            return globalScope.escapeHtml(value);
        }
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function showToast(message, tone = 'info') {
        if (!refs.toast || !message) {
            return;
        }

        refs.toast.textContent = message;
        refs.toast.dataset.tone = tone;
        refs.toast.classList.add('is-visible');

        if (localState.toastTimerId) {
            clearTimeout(localState.toastTimerId);
        }

        localState.toastTimerId = globalScope.setTimeout(() => {
            refs.toast.classList.remove('is-visible');
        }, 2200);
    }

    function preloadImageAsset(src) {
        const normalizedSrc = String(src || '').trim();
        if (!normalizedSrc) {
            return Promise.resolve(null);
        }

        if (assetPreloadCache.has(normalizedSrc)) {
            return assetPreloadCache.get(normalizedSrc);
        }

        const preloadPromise = new Promise((resolve) => {
            const image = new Image();
            let settled = false;

            const finish = () => {
                if (settled) {
                    return;
                }
                settled = true;
                resolve(image);
            };

            image.decoding = 'async';
            image.loading = 'eager';
            image.onload = () => {
                if (typeof image.decode === 'function') {
                    image.decode().catch(() => null).finally(finish);
                    return;
                }
                finish();
            };
            image.onerror = finish;
            image.src = normalizedSrc;
        });

        assetPreloadCache.set(normalizedSrc, preloadPromise);
        return preloadPromise;
    }

    function warmRedPandaPostBuildImage(snapshot) {
        if (!snapshot || !Array.isArray(snapshot.habitats)) {
            return;
        }

        const storyFlags = snapshot.storyFlags && typeof snapshot.storyFlags === 'object'
            ? snapshot.storyFlags
            : {};
        if (storyFlags[RED_PANDA_POST_BUILD_STORY_ID]) {
            return;
        }

        const redPandaHabitat = snapshot.habitats.find((habitat) => habitat && habitat.id === DIRECT_BUILD_HABITAT_ID);
        if (!redPandaHabitat || !redPandaHabitat.unlocked) {
            return;
        }

        preloadImageAsset(RED_PANDA_POST_BUILD_IMAGE_SRC);
    }

    function hasUnfinishedRound(snapshot) {
        return Boolean(snapshot && snapshot.initialized && !snapshot.isGameOver);
    }

    function getStoryData() {
        const runtimeStoryData = globalScope.WynneStoryData || null;
        return runtimeStoryData && typeof runtimeStoryData.getAllStoryIds === 'function'
            ? runtimeStoryData
            : null;
    }

    function appendStoryEntry(entryMap, storyId, story) {
        const normalizedId = String(storyId || '').trim();
        if (!normalizedId || entryMap.has(normalizedId)) {
            return;
        }

        entryMap.set(normalizedId, {
            id: normalizedId,
            title: story && story.title ? String(story.title).trim() : normalizedId,
            beatCount: story && Array.isArray(story.beats) ? story.beats.length : 0
        });
    }

    function getStoryEntries() {
        const entryMap = new Map();
        const storyData = getStoryData();
        if (storyData && typeof storyData.getAllStoryIds === 'function') {
            storyData.getAllStoryIds().forEach((storyId) => {
                const story = typeof storyData.getStory === 'function'
                    ? storyData.getStory(storyId)
                    : null;

                appendStoryEntry(entryMap, storyId, story);
            });
        }

        const importedStories = globalScope.WynneImportedStories;
        if (importedStories && typeof importedStories === 'object') {
            Object.keys(importedStories).forEach((storyId) => {
                appendStoryEntry(entryMap, storyId, importedStories[storyId]);
            });
        }

        const storySchema = globalScope.WynneStorySchema || null;
        if (storySchema && typeof storySchema.createPrologueProject === 'function') {
            const builtinStory = storySchema.createPrologueProject();
            appendStoryEntry(entryMap, builtinStory && builtinStory.storyId, builtinStory);
        }

        return Array.from(entryMap.values()).filter((entry) => entry.id);
    }

    function setStoryPreviewOpen(isOpen) {
        localState.storyPreviewOpen = Boolean(isOpen);

        if (refs.storyPreviewPanel) {
            refs.storyPreviewPanel.classList.toggle('is-open', localState.storyPreviewOpen);
            refs.storyPreviewPanel.setAttribute('aria-hidden', localState.storyPreviewOpen ? 'false' : 'true');
        }

        if (refs.storyPreviewTrigger) {
            refs.storyPreviewTrigger.setAttribute('aria-expanded', localState.storyPreviewOpen ? 'true' : 'false');
        }
    }

    function closeStoryPreviewPanel() {
        setStoryPreviewOpen(false);
    }

    function createStoryPreviewSignature(stories) {
        const safeStories = Array.isArray(stories) ? stories : [];
        if (safeStories.length <= 0) {
            return 'empty';
        }

        return safeStories.map((story) => [
            String(story && story.id || '').trim(),
            String(story && story.title || '').trim(),
            Math.max(0, Math.floor(Number(story && story.beatCount) || 0))
        ].join('|')).join('||');
    }

    function renderStoryPreviewList() {
        if (!refs.storyPreviewList) {
            return;
        }

        const stories = getStoryEntries();
        const nextSignature = createStoryPreviewSignature(stories);
        localState.storyEntryCount = stories.length;

        if (refs.storyPreviewTrigger) {
            refs.storyPreviewTrigger.disabled = false;
            refs.storyPreviewTrigger.dataset.empty = stories.length <= 0 ? 'true' : 'false';
        }

        if (localState.storyPreviewSignature === nextSignature) {
            return;
        }

        localState.storyPreviewSignature = nextSignature;

        if (stories.length <= 0) {
            refs.storyPreviewList.innerHTML = `
                <div class="story-preview-empty">
                    当前还没有可预览的剧情章节。
                </div>
            `;
            return;
        }

        refs.storyPreviewList.innerHTML = stories.map((story) => `
            <button class="story-preview-item" type="button" data-story-id="${escapeHtml(story.id)}">
                <span class="story-preview-item-copy">
                    <strong>${escapeHtml(story.title || story.id)}</strong>
                    <span>${escapeHtml(story.id)} · ${story.beatCount} 幕</span>
                </span>
                <span class="story-preview-item-action">预览</span>
            </button>
        `).join('');
    }

    function getHomeHabitat(snapshot) {
        if (!snapshot || !Array.isArray(snapshot.habitats)) {
            return null;
        }

        return snapshot.habitats.find((habitat) => habitat.unlocked)
            || null;
    }

    function getInfoHabitat(snapshot) {
        if (!snapshot) {
            return null;
        }
        return snapshot.selectedHabitat || snapshot.habitat || getHomeHabitat(snapshot);
    }

    function getQuestModule() {
        return globalScope.WynneRegistry
            && typeof globalScope.WynneRegistry.get === 'function'
            ? globalScope.WynneRegistry.get('WynneZooQuest')
            : null;
    }

    function getQuestSnapshot() {
        const questModule = getQuestModule();
        return questModule && typeof questModule.getSnapshot === 'function'
            ? questModule.getSnapshot()
            : null;
    }

    function getQuestTargetHabitatId(quest) {
        const relatedId = String(quest && quest.relatedId || '').trim();
        return HABITAT_ID_BY_SPECIES_ID[relatedId] || '';
    }

    function shouldShowHabitatBuildGuide(snapshot, habitat) {
        if (!snapshot || !habitat || habitat.id !== 'red-panda-grove') {
            return false;
        }

        if (habitat.unlocked || habitat.isConstructing) {
            return false;
        }

        if (shouldShowCollectionFollowupGuide(snapshot)) {
            return false;
        }

        const storyFlow = snapshot.storyFlow && typeof snapshot.storyFlow === 'object'
            ? snapshot.storyFlow
            : null;
        if (storyFlow && String(storyFlow.pendingReturnStoryId || '').trim()) {
            return false;
        }

        const storyFlags = snapshot.storyFlags && typeof snapshot.storyFlags === 'object'
            ? snapshot.storyFlags
            : {};
        return Boolean(storyFlags['第二章']);
    }

    function shouldShowCollectionFollowupGuide(snapshot) {
        return selectorApi.shouldShowCollectionFollowupGuide(snapshot);
    }

    function getSlotCardCopy(slotSnapshot, zooSnapshot) {
        return selectorApi.getSlotCardCopy(slotSnapshot, zooSnapshot);
    }
    function getHabitatTierLevel(habitat) {
        if (!habitat || !habitat.tier) {
            return 1;
        }

        const tierLevel = Number(habitat.tier.level);
        const assetLevels = habitat.stageAssets && typeof habitat.stageAssets === 'object'
            ? Object.keys(habitat.stageAssets)
                .map((key) => Number(String(key).replace('level', '')))
                .filter((level) => Number.isFinite(level) && level > 0)
            : [];
        const maxTierLevel = assetLevels.length > 0
            ? Math.max(...assetLevels)
            : 6;

        if (Number.isFinite(tierLevel) && tierLevel > 0) {
            return Math.max(1, Math.min(maxTierLevel, Math.round(tierLevel)));
        }

        return 1;
    }

    function getHabitatTierDefinitions(habitat) {
        if (!balance || !habitat) {
            return [];
        }

        if (typeof balance.getHabitatTierOrder === 'function' && typeof balance.getTierById === 'function') {
            return balance.getHabitatTierOrder(habitat.id).map((tierId) => balance.getTierById(tierId, habitat.id));
        }

        return balance.HABITAT_TIERS ? Object.values(balance.HABITAT_TIERS) : [];
    }

    function getHabitatArtKey(habitat) {
        if (!habitat) {
            return 'level1';
        }

        return `level${getHabitatTierLevel(habitat)}`;
    }

    function getHabitatArt(habitat) {
        if (!habitat) {
            return '';
        }

        if (!habitat.unlocked) {
            return '';
        }

        const assets = habitat.stageAssets || {};
        const desiredLevel = getHabitatTierLevel(habitat);

        for (let level = desiredLevel; level >= 1; level -= 1) {
            const asset = assets[`level${level}`];
            if (asset) {
                return asset;
            }
        }

        for (let level = desiredLevel + 1; level <= 6; level += 1) {
            const asset = assets[`level${level}`];
            if (asset) {
                return asset;
            }
        }

        return habitat.sceneAsset || '';
    }

    function buildInlineStyle(styleMap) {
        return viewHelpers.buildInlineStyle(styleMap);
    }

    function getHabitatStageLayout(habitat) {
        return viewHelpers.getHabitatStageLayout(habitat);
    }
    function getMainTaskCopy(snapshot) {
        return selectorApi.getMainTaskCopy(snapshot);
    }
    function shouldAnimateHabitatArtSwap(habitat, art) {
        const habitatId = String(habitat && habitat.id || '').trim();
        if (!habitatId) {
            return false;
        }

        const normalizedArt = String(art || '').trim();
        const previousArt = String(localState.lastHabitatArtById[habitatId] || '').trim();
        localState.lastHabitatArtById[habitatId] = normalizedArt;
        return Boolean(normalizedArt && previousArt && previousArt !== normalizedArt);
    }

    function renderHabitatStage(habitat, snapshot) {
        return rendererApi.renderHabitatStage(habitat, snapshot);
    }
    function renderMetricCards(metrics) {
        return viewHelpers.renderMetricCards(metrics);
    }
    function renderOverviewCard(habitat, actionMarkup = '') {
        return viewHelpers.renderOverviewCard(habitat, actionMarkup);
    }
    function renderFactRows(rows) {
        return viewHelpers.renderFactRows(rows);
    }
    function renderUnlockButton(habitat) {
        if (!habitat) {
            return '';
        }

        if (habitat.isConstructing) {
            return `
                <button class="habitat-action-btn" type="button" disabled>
                    建造中...
                </button>
            `;
        }

        if (!habitat.canUnlock) {
            return '';
        }

        return `
            <button class="habitat-action-btn" type="button" data-action="unlock">
                ${escapeHtml(habitat.unlockActionText)}
            </button>
        `;
    }

    function renderEnvironmentTierCard(tier, currentTierId, nextTierId) {
        return viewHelpers.renderEnvironmentTierCard(tier, currentTierId, nextTierId);
    }
    function renderTabContent(snapshot) {
        return rendererApi.renderTabContent(snapshot);
    }
    function updateTabButtons(activeTab) {
        refs.tabButtons.forEach((button) => {
            const isActive = button.dataset.tab === activeTab;
            button.classList.toggle('is-active', isActive);
            button.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });
    }

    function playBuildEffect(onComplete, options = {}) {
        const text = typeof options.text === 'string' && options.text.trim()
            ? options.text.trim()
            : '栏舍施工中...';
        localState.buildEffectActive = true;
        var overlay = document.createElement('div');
        overlay.className = 'zoo-build-effect-overlay';
        for (var i = 0; i < 28; i++) {
            var particle = document.createElement('span');
            particle.className = 'zoo-build-effect-particle';
            particle.style.setProperty('--particle-x', (15 + Math.random() * 70) + '%');
            particle.style.setProperty('--particle-y', (20 + Math.random() * 60) + '%');
            particle.style.setProperty('--particle-delay', (Math.random() * 0.3) + 's');
            particle.style.setProperty('--particle-size', (8 + Math.random() * 16) + 'px');
            particle.style.setProperty('--particle-drift', ((Math.random() - 0.5) * 80) + 'px');
            if (Math.random() > 0.5) {
                particle.style.background = 'radial-gradient(circle, rgba(74,222,128,0.95) 0%, rgba(34,197,94,0.7) 50%, transparent 80%)';
                particle.style.boxShadow = '0 0 10px rgba(74,222,128,0.5)';
            } else {
                particle.style.background = 'radial-gradient(circle, rgba(217,119,6,0.95) 0%, rgba(180,83,9,0.7) 50%, transparent 80%)';
                particle.style.boxShadow = '0 0 10px rgba(217,119,6,0.5)';
            }
            overlay.appendChild(particle);
        }
        var buildingText = document.createElement('div');
        buildingText.className = 'zoo-build-effect-text';
        buildingText.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:middle; margin-right:6px;">
                <path d="m15 12-8.5 8.5c-.83.83-2.17.83-3 0 0 0 0 0 0 0a2.12 2.12 0 0 1 0-3L12 9"/>
                <path d="M17.64 15 22 10.64"/>
                <path d="m20.91 11.7-1.25-1.25c-.6-.6-.93-1.4-.93-2.25v-.86L16.01 4.6a5.56 5.56 0 0 0-3.94-1.64H11.2l-1.42 1.42L14 8.6l3.5 3.5Z"/>
            </svg>
            <span style="display:inline-block; vertical-align:middle; color: #4ade80;">栏舍施工中...</span>
        `;
        var buildTextLabel = buildingText.querySelector('span');
        if (buildTextLabel) {
            buildTextLabel.textContent = text;
        }
        overlay.appendChild(buildingText);
        var container = refs.homeScreen || document.body;
        container.appendChild(overlay);
        globalScope.setTimeout(function () {
            localState.buildEffectActive = false;
            if (overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }
            if (typeof onComplete === 'function') {
                onComplete();
            }
        }, 2200);
    }

    function playConstructionCelebration(habitatId, options = {}) {
        const successText = typeof options.text === 'string' && options.text.trim()
            ? options.text.trim()
            : '栏舍建造完成！';
        var container = refs.homeScreen || document.body;
        var celebration = document.createElement('div');
        celebration.className = 'zoo-construction-celebration';

        // Fireworks Bursts
        var fireworkColors = ['#4ade80', '#22c55e', '#fde047', '#fef08a', '#38bdf8', '#a78bfa', '#f472b6', '#fb923c'];
        for (var b = 0; b < 6; b++) {
            var bx = 15 + Math.random() * 70;
            var by = 15 + Math.random() * 35;
            var delay = Math.random() * 0.5;
            var color1 = fireworkColors[Math.floor(Math.random() * fireworkColors.length)];
            var color2 = fireworkColors[Math.floor(Math.random() * fireworkColors.length)];
            
            for (var p = 0; p < 28; p++) {
                var particle = document.createElement('span');
                particle.className = 'zoo-firework-particle';
                var angle = (p / 28) * Math.PI * 2;
                var velocity = 60 + Math.random() * 80;
                var tx = Math.cos(angle) * velocity;
                var ty = Math.sin(angle) * velocity;
                
                particle.style.setProperty('--fw-x', bx + '%');
                particle.style.setProperty('--fw-y', by + '%');
                particle.style.setProperty('--fw-tx', tx + 'px');
                particle.style.setProperty('--fw-ty', ty + 'px');
                particle.style.setProperty('--fw-color', p % 2 === 0 ? color1 : color2);
                particle.style.setProperty('--fw-delay', delay + 's');
                celebration.appendChild(particle);
            }
        }

        // Leaf and Sparkle bursts
        for (var j = 0; j < 36; j++) {
            var sparkle = document.createElement('span');
            sparkle.className = 'zoo-celebration-sparkle';
            var angle = (j / 36) * 360;
            var dist = 80 + Math.random() * 140;
            sparkle.style.setProperty('--sparkle-angle', angle + 'deg');
            sparkle.style.setProperty('--sparkle-dist', dist + 'px');
            sparkle.style.setProperty('--sparkle-delay', (Math.random() * 0.2) + 's');
            sparkle.style.setProperty('--sparkle-size', (5 + Math.random() * 10) + 'px');
            
            if (j % 2 === 0) {
                sparkle.style.background = 'radial-gradient(circle, #fff 0%, #4ade80 50%, transparent 100%)';
                sparkle.style.boxShadow = '0 0 10px 2px rgba(74,222,128,0.6)';
            } else {
                sparkle.style.background = 'radial-gradient(circle, #fff 0%, #fde047 50%, transparent 100%)';
                sparkle.style.boxShadow = '0 0 10px 2px rgba(253,224,71,0.6)';
            }
            celebration.appendChild(sparkle);
        }

        // Star bursts using SVG paths instead of text characters
        for (var k = 0; k < 14; k++) {
            var star = document.createElement('span');
            star.className = 'zoo-celebration-star';
            star.style.width = '32px';
            star.style.height = '32px';
            star.style.display = 'inline-block';
            if (k % 2 === 0) {
                star.innerHTML = '<svg viewBox="0 0 24 24" fill="#4ade80" width="100%" height="100%"><path d="M12 2L15 9l7 1-5 5 1.5 7.5L12 18l-6.5 4.5L7 15l-5-5 7-1z"/></svg>';
                star.style.filter = 'drop-shadow(0 0 8px rgba(74,222,128,0.8))';
            } else {
                star.innerHTML = '<svg viewBox="0 0 24 24" fill="#fde047" width="100%" height="100%"><path d="M12 2C12 2 15 10 22 12C22 12 15 14 12 22C12 22 9 14 2 12C2 12 9 10 12 2z"/></svg>';
                star.style.filter = 'drop-shadow(0 0 8px rgba(253,224,71,0.8))';
            }
            star.style.setProperty('--star-x', (15 + Math.random() * 70) + '%');
            star.style.setProperty('--star-y', (20 + Math.random() * 40) + '%');
            star.style.setProperty('--star-delay', (Math.random() * 0.4) + 's');
            star.style.setProperty('--star-scale', (0.8 + Math.random() * 0.6).toFixed(2));
            celebration.appendChild(star);
        }

        // Completion text
        var text = document.createElement('div');
        text.className = 'zoo-celebration-text';
        text.innerHTML = `
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:middle; margin-right:8px;">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <path d="M22 4L12 14.01l-3-3"/>
            </svg>
            <span style="display:inline-block; vertical-align:middle; color: #4ade80; text-shadow: 0 2px 4px rgba(0,0,0,0.4);">栏舍建造完成！</span>
        `;
        var celebrationTextLabel = text.querySelector('span');
        if (celebrationTextLabel) {
            celebrationTextLabel.textContent = successText;
        }
        celebration.appendChild(text);

        container.appendChild(celebration);
        globalScope.setTimeout(function () {
            if (celebration.parentNode) {
                celebration.parentNode.removeChild(celebration);
            }
        }, 3500);
    }

    function startHabitatConstruction(habitatId) {
        if (!economy || typeof economy.beginHabitatConstruction !== 'function') {
            return null;
        }

        closePanel();
        closeStoryPreviewPanel();
        const result = economy.beginHabitatConstruction(habitatId);
        if (result) {
            if (result.ok) {
                if (habitatId === DIRECT_BUILD_HABITAT_ID) {
                    preloadImageAsset(RED_PANDA_POST_BUILD_IMAGE_SRC);
                }
                playBuildEffect(function () {
                    render();
                    playConstructionCelebration(habitatId);
                    // 小熊猫栏舍首次建造完成后，触发特殊剧情
                    if (habitatId === 'red-panda-grove') {
                        globalScope.setTimeout(function () {
                            if (economy && typeof economy.setPendingReturnStory === 'function') {
                                economy.setPendingReturnStory('post-build-red-panda', {
                                    readyToResume: true
                                });
                            }
                            var appShell = globalScope.WynneZooAppShell
                                || (globalScope.WynneRegistry && globalScope.WynneRegistry.get('WynneZooAppShell'));
                            if (appShell && typeof appShell.showZooHome === 'function') {
                                appShell.showZooHome();
                            }
                        }, 3500);
                    }
                });
            } else {
                showToast(result.message, 'warn');
                render();
            }
        }
        return result;
    }

    function playHabitatUpgradeSuccessFeedback(habitatId) {
        playBuildEffect(function () {
            render();
            playConstructionCelebration(habitatId, {
                text: '栖息地升级成功！'
            });
        }, {
            text: '栖息地升级中...'
        });
        closePanel();
        closeStoryPreviewPanel();
    }

    function openPanelForTab(tabId = 'status') {
        if (!economy) {
            return false;
        }

        const snapshot = economy.getSnapshot();
        const habitat = getInfoHabitat(snapshot);
        if (!habitat) {
            return false;
        }

        return openPanelForHabitat(habitat.id, tabId);
    }

    function openPanelForHabitat(habitatId, tabId = 'status') {
        if (!economy) {
            return false;
        }

        const targetHabitatId = String(habitatId || '').trim();
        if (!targetHabitatId) {
            return false;
        }

        if (typeof economy.openHabitatPanel === 'function') {
            economy.openHabitatPanel(targetHabitatId);
        }
        if (typeof economy.setActiveTab === 'function') {
            economy.setActiveTab(tabId);
        }
        if (typeof economy.setPanelOpen === 'function') {
            economy.setPanelOpen(true);
        }
        return true;
    }

    function closePanel() {
        if (economy && typeof economy.setPanelOpen === 'function') {
            economy.setPanelOpen(false);
        }
        if (refs.panel) {
            refs.panel.classList.remove('is-open');
            refs.panel.setAttribute('aria-hidden', 'true');
        }
    }

    function shouldClosePanelFromPageClick(event) {
        if (!economy || !refs.panel) {
            return false;
        }

        const target = event.target;
        if (!(target instanceof Element)) {
            return false;
        }

        const snapshot = economy.getSnapshot();
        if (!snapshot || !snapshot.ui || !snapshot.ui.panelOpen) {
            return false;
        }

        // If click is inside the panel, do not close
        if (target.closest('#habitat-detail-panel')) {
            return false;
        }

        // If click is on a button that opens the panel, do not close (it will toggle itself)
        if (target.closest('[data-action="open-info"]')) {
            return false;
        }

        // If click is on ticket collection, do not close
        if (target.closest('[data-action="claim-tickets"]') || target.closest('.zoo-habitat-ticket-claim')) {
            return false;
        }
        
        // If clicking the entry slot bottom right, do not close
        if (target.closest('.zoo-home-slot-entry') || target.closest('#enter-slot-btn')) {
            return false;
        }

        if (target.closest('#zoo-main-task-btn') || target.closest('#zoo-nav-collection')) {
            return false;
        }
        
        // If clicking the debug button, do not close
        if (target.closest('.login-debug-toggle')) {
            return false;
        }

        return true;
    }

    function shouldCloseStoryPreviewFromPageClick(event) {
        if (!localState.storyPreviewOpen) {
            return false;
        }

        const target = event.target;
        if (!(target instanceof Element)) {
            return false;
        }

        if (target.closest('#story-preview-panel')) {
            return false;
        }

        if (target.closest('#story-preview-trigger')) {
            return false;
        }

        return true;
    }

    function showNextUnlockPopup() {
        if (localState.unlockPopupActive || localState.unlockNotificationQueue.length <= 0) {
            return;
        }

        var notification = localState.unlockNotificationQueue[0];
        if (!refs.unlockPopup || !notification) {
            return;
        }

        try {
            localState.unlockPopupActive = true;

            if (refs.unlockPopupIcon) {
                refs.unlockPopupIcon.src = notification.iconSrc || '';
                refs.unlockPopupIcon.alt = notification.systemName || '';
            }

            if (refs.unlockPopupTitle) {
                refs.unlockPopupTitle.textContent = '解锁了' + (notification.systemName || '新系统') + '系统';
            }

            refs.unlockPopup.hidden = false;
            refs.unlockPopup.setAttribute('aria-hidden', 'false');
        } catch (error) {
            // 静默失败，不阻塞主界面
            localState.unlockPopupActive = false;
        }
    }

    function closeUnlockPopup() {
        if (!localState.unlockPopupActive) {
            return;
        }

        var notification = localState.unlockNotificationQueue.shift();
        localState.unlockPopupActive = false;

        if (refs.unlockPopup) {
            refs.unlockPopup.hidden = true;
            refs.unlockPopup.setAttribute('aria-hidden', 'true');
        }

        // 标记已展示
        if (notification && notification.systemId) {
            var systemUnlock = globalScope.WynneSystemUnlock || null;
            if (systemUnlock && typeof systemUnlock.markNotificationShown === 'function') {
                systemUnlock.markNotificationShown(notification.systemId);
            }
        }

        // 展示下一个通知
        if (localState.unlockNotificationQueue.length > 0) {
            globalScope.setTimeout(showNextUnlockPopup, 300);
        }
    }

    function processUnlockNotifications() {
        try {
            var systemUnlock = globalScope.WynneSystemUnlock || null;
            if (!systemUnlock || typeof systemUnlock.getPendingNotifications !== 'function') {
                return;
            }

            var pending = systemUnlock.getPendingNotifications();
            if (!Array.isArray(pending) || pending.length <= 0) {
                return;
            }

            localState.unlockNotificationQueue = pending.slice();
            showNextUnlockPopup();
        } catch (error) {
            // 闈欓粯澶辫触
        }
    }

    function updateNavVisibility() {
        var systemUnlock = globalScope.WynneSystemUnlock || null;
        if (!systemUnlock || typeof systemUnlock.getAllStatus !== 'function') {
            return;
        }

        var statuses = systemUnlock.getAllStatus();
        for (var i = 0; i < statuses.length; i++) {
            var status = statuses[i];
            var navEl = document.getElementById(status.navElementId);
            if (navEl) {
                navEl.hidden = !status.unlocked;
            }
        }
    }

    function render(snapshot = economy ? economy.getSnapshot() : null) {
        updateNavVisibility();

        if (!snapshot || !snapshot.selectedHabitat) {
            return;
        }

        warmRedPandaPostBuildImage(snapshot);

        const homeHabitat = getHomeHabitat(snapshot);
        const selectedHabitat = getInfoHabitat(snapshot);
        const displayHabitat = homeHabitat || selectedHabitat;
        const slotCopy = getSlotCardCopy(localState.slotSnapshot, snapshot);

        if (refs.resourceCoin) refs.resourceCoin.textContent = formatResourceNumber(snapshot.resources.coin || 0);
        if (refs.resourceDiamond) refs.resourceDiamond.textContent = formatResourceNumber(snapshot.resources.diamond || 0);
        if (refs.resourceTicket) refs.resourceTicket.textContent = formatResourceNumber(snapshot.resources.playTicket || 0);

        if (refs.homeBackground && !refs.homeBackground.src.includes('UI_Zoo_MainBG')) {
            refs.homeBackground.src = './Texture/ZOO/UI_Zoo_MainBG.webp';
            refs.homeBackground.alt = '动物园主场景背景';
        }

        if (refs.devNote) {
            refs.devNote.textContent = displayHabitat && displayHabitat.isConstructing
                ? `${displayHabitat.name} 正在施工中，马上就会开放 1 级栏舍`
                : (displayHabitat && displayHabitat.unlocked
                    ? `${displayHabitat.name} 当前为 ${displayHabitat.tier.label}，${displayHabitat.ticketCountdownText}`
                    : '动物园当前还是空场景，栖息地解锁章节暂未配置。');
        }

        if (refs.habitatStageList) {
            // Build a lightweight cache key to avoid destroying/recreating DOM on every tick.
            var currentHabitatArt = displayHabitat ? getHabitatArt(displayHabitat) : '';
            var stageKey = displayHabitat
                ? [
                    displayHabitat.id,
                    displayHabitat.unlocked ? '1' : '0',
                    displayHabitat.isConstructing ? 'c' : '',
                    displayHabitat.tier ? displayHabitat.tier.level : '',
                    currentHabitatArt,
                    displayHabitat.hasClaimableTickets ? displayHabitat.claimableTickets : '0',
                    displayHabitat.isStoryLocked ? 'sl' : ''
                ].join(':')
                : '';
            if (stageKey !== localState.lastHabitatStageKey) {
                localState.lastHabitatStageKey = stageKey;
                refs.habitatStageList.innerHTML = renderHabitatStage(displayHabitat, snapshot);
            }
        }

        if (refs.mainTaskText) {
            if (shouldShowCollectionFollowupGuide(snapshot)) {
                refs.mainTaskText.textContent = '查看小熊猫图鉴';
            } else if (displayHabitat && displayHabitat.isConstructing) {
                refs.mainTaskText.textContent = '建造中...';
            } else {
                const questMod = getQuestModule();
                refs.mainTaskText.textContent = questMod && typeof questMod.getActiveQuestText === 'function'
                    ? questMod.getActiveQuestText()
                    : getMainTaskCopy(snapshot);
            }
        }

        if (refs.habitatResidentPill) {
            refs.habitatResidentPill.textContent = displayHabitat && displayHabitat.isConstructing
                ? '施工中 · 即将开放 1 级栏舍'
                : (displayHabitat && displayHabitat.unlocked
                    ? `${displayHabitat.residentCount}/${displayHabitat.capacity} 只小动物`
                    : (selectedHabitat.isStoryLocked
                        ? `暂未开放 · ${selectedHabitat.unlockStoryLabel || '待定剧情'}`
                        : (selectedHabitat.unlocked
                            ? `${selectedHabitat.residentCount}/${selectedHabitat.capacity} 只小动物`
                            : `待建造 · ${selectedHabitat.unlockCostCoin} 金币`)));
        }

        if (refs.panelTitle) {
            refs.panelTitle.textContent = selectedHabitat.isConstructing
                ? `${selectedHabitat.name} · 建造中`
                : (selectedHabitat.unlocked
                    ? `${selectedHabitat.name} · ${selectedHabitat.tier.shortLabel || selectedHabitat.tier.label}`
                    : (selectedHabitat.isStoryLocked
                        ? `${selectedHabitat.name} · 暂未开放`
                        : `${selectedHabitat.name} · 待建造`));
        }

        if (refs.panel) {
            const isPanelOpen = Boolean(snapshot.ui && snapshot.ui.panelOpen);
            refs.panel.classList.toggle('is-open', isPanelOpen);
            refs.panel.setAttribute('aria-hidden', isPanelOpen ? 'false' : 'true');
            if (refs.homeScreen) {
                refs.homeScreen.classList.toggle('is-habitat-panel-open', isPanelOpen);
            }
        }

        if (refs.tabContent) {
            // Only re-render tab content when the panel is actually open
            var isPanelCurrentlyOpen = Boolean(snapshot.ui && snapshot.ui.panelOpen);
            if (isPanelCurrentlyOpen) {
                refs.tabContent.innerHTML = renderTabContent(snapshot);
            }
        }

        if (refs.slotStatus) refs.slotStatus.textContent = slotCopy.status;
        if (refs.slotHint) refs.slotHint.textContent = slotCopy.hint;
        if (refs.entryButtonText) refs.entryButtonText.textContent = slotCopy.entryText;
        if (refs.entryButton) refs.entryButton.disabled = slotCopy.disabled;
        const pendingGuideSpeciesId = snapshot && snapshot.collection
            ? String(snapshot.collection.pendingGuideSpeciesId || '').trim()
            : '';
        if (refs.navCollection) {
            refs.navCollection.classList.toggle('is-guide-highlight', Boolean(pendingGuideSpeciesId));
        }
        if (refs.collectionGuide) {
            refs.collectionGuide.hidden = !pendingGuideSpeciesId;
            refs.collectionGuide.setAttribute('aria-hidden', pendingGuideSpeciesId ? 'false' : 'true');
        }

        updateTabButtons(snapshot.ui ? snapshot.ui.activeTab : 'status');
    }

    function bindEvents() {
        globalScope.addEventListener('wynne-story-data-updated', () => {
            renderStoryPreviewList();
        });

        // Event delegation for closing the panel when clicking outside
        document.addEventListener('click', (event) => {
            if (shouldClosePanelFromPageClick(event)) {
                closePanel();
            }

            if (shouldCloseStoryPreviewFromPageClick(event)) {
                closeStoryPreviewPanel();
            }
        });

        if (refs.panelCloseButton) {
            refs.panelCloseButton.addEventListener('click', (event) => {
                event.stopPropagation();
                closePanel();
            });
        }

        if (refs.habitatStageList) {
            refs.habitatStageList.addEventListener('click', (event) => {
                const target = event.target instanceof Element ? event.target : null;
                if (!target || !economy) {
                    return;
                }

                const claimButton = target.closest('[data-action="claim-tickets"]');
                if (claimButton) {
                    const habitatId = claimButton.getAttribute('data-habitat-id');
                    const result = typeof economy.collectHabitatTickets === 'function'
                        ? economy.collectHabitatTickets(habitatId)
                        : null;

                    if (result) {
                        showToast(result.message, result.ok ? 'success' : 'warn');
                        render();
                    }
                    return;
                }

                const openButton = target.closest('[data-action="open-info"]');
                if (openButton && typeof economy.openHabitatPanel === 'function') {
                    economy.openHabitatPanel(openButton.getAttribute('data-habitat-id'));
                    return;
                }

                const buildButton = target.closest('[data-action="build-habitat"]');
                if (buildButton) {
                    startHabitatConstruction(buildButton.getAttribute('data-habitat-id'));
                    return;
                }

                const pendingButton = target.closest('[data-action="construction-pending"]');
                if (pendingButton) {
                    showToast('小熊猫栏舍正在建造中。', 'info');
                }
            });
        }

        refs.tabButtons.forEach((button) => {
            button.addEventListener('click', () => {
                if (!economy) return;
                if (typeof economy.setActiveTab === 'function') {
                    economy.setActiveTab(button.dataset.tab || 'status');
                }
                if (typeof economy.setPanelOpen === 'function') {
                    economy.setPanelOpen(true);
                }
            });
        });

        if (refs.tabContent) {
            refs.tabContent.addEventListener('click', (event) => {
                const actionButton = event.target instanceof Element
                    ? event.target.closest('[data-action]')
                    : null;

                if (!actionButton || !economy) {
                    return;
                }

                const action = actionButton.getAttribute('data-action');
                let result = null;
                const selectedSnapshot = typeof economy.getSnapshot === 'function'
                    ? economy.getSnapshot()
                    : null;
                const selectedHabitatId = selectedSnapshot && selectedSnapshot.selectedHabitat
                    ? selectedSnapshot.selectedHabitat.id
                    : '';

                if (action === 'unlock') {
                    result = typeof economy.unlockSelectedHabitat === 'function'
                        ? economy.unlockSelectedHabitat()
                        : null;
                } else if (action === 'feed') {
                    result = typeof economy.feedSelectedHabitatAnimals === 'function'
                        ? economy.feedSelectedHabitatAnimals()
                        : null;
                } else if (action === 'upgrade') {
                    result = typeof economy.upgradeSelectedHabitatTier === 'function'
                        ? economy.upgradeSelectedHabitatTier()
                        : null;
                }

                if (!result) {
                    return;
                }

                showToast(result.message, result.ok ? 'success' : 'warn');
                if (action === 'upgrade' && result.ok && selectedHabitatId) {
                    playHabitatUpgradeSuccessFeedback(selectedHabitatId);
                    return;
                }
                render();
            });
        }

        if (refs.storyPreviewTrigger) {
            refs.storyPreviewTrigger.addEventListener('click', () => {
                renderStoryPreviewList();

                if (localState.storyPreviewOpen) {
                    closeStoryPreviewPanel();
                } else {
                    closePanel();
                    setStoryPreviewOpen(true);
                }
            });
        }

        if (refs.storyPreviewClose) {
            refs.storyPreviewClose.addEventListener('click', () => {
                closeStoryPreviewPanel();
            });
        }

        if (refs.storyPreviewList) {
            refs.storyPreviewList.addEventListener('click', (event) => {
                const target = event.target instanceof Element
                    ? event.target.closest('[data-story-id]')
                    : null;

                if (!target) {
                    return;
                }

                const storyId = String(target.getAttribute('data-story-id') || '').trim();
                const appShell = globalScope.WynneZooAppShell;
                closeStoryPreviewPanel();

                if (!appShell || typeof appShell.showStory !== 'function') {
                    showToast('当前无法打开剧情预览。', 'warn');
                    return;
                }

                const opened = appShell.showStory(storyId, {
                    markAsPlayed: false,
                    returnTo: 'zoo'
                });

                if (!opened) {
                    showToast('当前剧情章节不可用。', 'warn');
                }
            });
        }

        if (refs.mainTaskButton) {
            refs.mainTaskButton.addEventListener('click', () => {
                const snapshot = economy && typeof economy.getSnapshot === 'function'
                    ? economy.getSnapshot()
                    : null;
                if (shouldShowCollectionFollowupGuide(snapshot)) {
                    const appShell = globalScope.WynneZooAppShell;
                    if (appShell && typeof appShell.showCollection === 'function') {
                        closePanel();
                        closeStoryPreviewPanel();
                        appShell.showCollection();
                    } else {
                        showToast('当前没有可查看的图鉴内容。', 'warn');
                    }
                    return;
                }

                // Quest system navigation: use quest nav target if available
                const questModule = getQuestModule();
                const questSnapshot = questModule && typeof questModule.getSnapshot === 'function'
                    ? questModule.getSnapshot()
                    : null;
                const currentQuest = questSnapshot && questSnapshot.currentQuest
                    ? questSnapshot.currentQuest
                    : null;
                const questTargetHabitatId = getQuestTargetHabitatId(currentQuest);
                const questTargetHabitat = snapshot && Array.isArray(snapshot.habitats)
                    ? snapshot.habitats.find((habitat) => habitat && habitat.id === questTargetHabitatId)
                    : null;

                if (currentQuest
                    && currentQuest.conditionType === 'build'
                    && questTargetHabitat
                    && !questTargetHabitat.unlocked) {
                    if (questTargetHabitat.isConstructing) {
                        showToast('小熊猫栏舍正在建造中。', 'info');
                    } else {
                        startHabitatConstruction(questTargetHabitat.id);
                    }
                    return;
                }

                if (questModule && typeof questModule.getActiveQuestNavTarget === 'function') {
                    const navTarget = questModule.getActiveQuestNavTarget();
                    if (navTarget) {
                        const appShell = globalScope.WynneZooAppShell;
                        if (navTarget === 'story') {
                            if (appShell && typeof appShell.showStory === 'function') {
                                closePanel();
                                closeStoryPreviewPanel();
                                appShell.showStory();
                            } else {
                                renderStoryPreviewList();
                                if (localState.storyEntryCount > 0) {
                                    closePanel();
                                    setStoryPreviewOpen(true);
                                } else {
                                    showToast('当前还没有可用的剧情章节。', 'warn');
                                }
                            }
                            return;
                        }
                        if (navTarget === 'slot') {
                            if (appShell && typeof appShell.showSlotGame === 'function') {
                                closePanel();
                                closeStoryPreviewPanel();
                                appShell.showSlotGame();
                            } else {
                                showToast('盲盒挑战暂不可用。', 'warn');
                            }
                            return;
                        }
                        if (navTarget === 'habitat-panel') {
                            const opened = questTargetHabitatId
                                ? openPanelForHabitat(questTargetHabitatId, 'status')
                                : openPanelForTab('status');
                            if (!opened) {
                                showToast('当前没有可查看的栏舍信息。', 'warn');
                            }
                            return;
                        }
                    }
                }

                // Fallback: original behavior when quest system is unavailable
                const habitat = getInfoHabitat(snapshot);

                if (habitat && habitat.isStoryLocked) {
                    renderStoryPreviewList();
                    if (localState.storyEntryCount > 0) {
                        closePanel();
                        setStoryPreviewOpen(true);
                    } else {
                        showToast('当前还没有可用的剧情章节。', 'warn');
                    }
                    return;
                }

                if (!openPanelForTab('status')) {
                    showToast('当前没有可查看的栏舍信息。', 'warn');
                }
            });
        }

        if (refs.navTrip) {
            refs.navTrip.addEventListener('click', () => {
                showToast('动物远行功能还在整理中，先保留正式版入口。', 'info');
            });
        }

        if (refs.navCollection) {
            refs.navCollection.addEventListener('click', () => {
                if (!openPanelForTab('animals')) {
                    showToast('当前没有可查看的图鉴内容。', 'warn');
                }
            });
        }

        // Removed homeScreen click listener in favor of document listener
    }

    function init() {
        if (refs.initialized) {
            return api;
        }

        cacheDom();
        renderStoryPreviewList();
        closeStoryPreviewPanel();
        bindEvents();
        if (refs.navCollection) {
            refs.navCollection.addEventListener('click', (event) => {
                const appShell = globalScope.WynneZooAppShell;
                if (!appShell || typeof appShell.showCollection !== 'function') {
                    return;
                }

                event.preventDefault();
                event.stopImmediatePropagation();
                closePanel();
                closeStoryPreviewPanel();
                appShell.showCollection();
            }, true);
        }

        if (refs.unlockPopupBtn) {
            refs.unlockPopupBtn.addEventListener('click', closeUnlockPopup);
        }
        if (refs.unlockPopup) {
            var backdrop = refs.unlockPopup.querySelector('.system-unlock-popup-backdrop');
            if (backdrop) {
                backdrop.addEventListener('click', closeUnlockPopup);
            }
        }

        if (economy && typeof economy.subscribe === 'function') {
            localState.unsubscribeEconomy = economy.subscribe((snapshot) => {
                if (!localState.buildEffectActive) {
                    render(snapshot);
                }
            });
        } else {
            render();
        }

        // Quest system integration: initialize button text and subscribe to changes
        const questModule = globalScope.WynneRegistry
            && typeof globalScope.WynneRegistry.get === 'function'
            ? globalScope.WynneRegistry.get('WynneZooQuest')
            : null;

        if (questModule) {
            // Initialize button text from quest system
            if (refs.mainTaskText && typeof questModule.getActiveQuestText === 'function') {
                const snapshot = economy && typeof economy.getSnapshot === 'function'
                    ? economy.getSnapshot()
                    : null;
                const taskHabitat = snapshot ? (getHomeHabitat(snapshot) || getInfoHabitat(snapshot)) : null;
                refs.mainTaskText.textContent = shouldShowCollectionFollowupGuide(snapshot)
                    ? '查看小熊猫图鉴'
                    : ((taskHabitat && taskHabitat.isConstructing)
                        ? '建造中...'
                        : questModule.getActiveQuestText());
            }

            // Subscribe to quest state changes to update button text in real-time
            if (typeof questModule.subscribe === 'function') {
                questModule.subscribe(function () {
                    if (refs.mainTaskText && typeof questModule.getActiveQuestText === 'function') {
                        const snapshot = economy && typeof economy.getSnapshot === 'function'
                            ? economy.getSnapshot()
                            : null;
                        const taskHabitat = snapshot ? (getHomeHabitat(snapshot) || getInfoHabitat(snapshot)) : null;
                        refs.mainTaskText.textContent = shouldShowCollectionFollowupGuide(snapshot)
                            ? '查看小熊猫图鉴'
                            : ((taskHabitat && taskHabitat.isConstructing)
                                ? '建造中...'
                                : questModule.getActiveQuestText());
                    }
                });
            }
        }

        refs.initialized = true;
        return api;
    }

    function setSlotSnapshot(snapshot) {
        localState.slotSnapshot = snapshot ? { ...snapshot } : null;
        render();
    }

    function onShow(snapshot) {
        renderStoryPreviewList();
        closeStoryPreviewPanel();
        setSlotSnapshot(snapshot);
        processUnlockNotifications();
    }

    function onHide() {
        closeStoryPreviewPanel();
    }

    function notify(message, tone = 'info') {
        showToast(message, tone);
    }

    const api = {
        init,
        onShow,
        onHide,
        notify,
        render,
        setSlotSnapshot
    };

    globalScope.ZooHomeModule = api;

    if (globalScope.WynneRegistry) {
        globalScope.WynneRegistry.register('ZooHomeModule', globalScope.ZooHomeModule);
    }
}(window));



