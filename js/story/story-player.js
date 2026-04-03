(function initStoryPlayer(globalScope) {
    'use strict';

    const schema = globalScope.WynneStorySchema || null;
    const EFFECT_CLASSES = Array.isArray(schema && schema.EFFECT_CLASSES)
        ? schema.EFFECT_CLASSES
        : ['shake-hard', 'shake-medium', 'shake-soft', 'shake-soft-strong'];
    const CAMERA_EFFECT_CLASSES = Array.isArray(schema && schema.CAMERA_EFFECT_CLASSES)
        ? schema.CAMERA_EFFECT_CLASSES
        : ['camera-zoom-in-soft', 'camera-zoom-in', 'camera-zoom-in-strong', 'camera-pan-left-to-right', 'camera-pan-right-to-left'];
    const BACKDROP_MODE_STORY = 'story';
    const BACKDROP_MODE_ZOO_HOME = 'zoo-home';

    const TYPEWRITER_BASE_DELAY = 28;
    const TYPEWRITER_PUNCTUATION_DELAY = 140;
    const CLEANING_GRID_COLUMNS = 14;
    const CLEANING_GRID_ROWS = 8;
    const CLEANING_BRUSH_RADIUS = 56;
    const CLEANING_STAGE_TARGETS = [0.4, 0.4533333333333333];
    const CLEANING_CELEBRATION_SPARKLES = 16;
    const SPECIAL_SCENE_TREATMENTS = Object.freeze([
        Object.freeze({
            storyId: 'post-build-red-panda',
            backgroundMatch: '/post-build-red-panda/小熊猫栖息地剧情CG',
            screenClass: 'has-special-cg-red-panda',
            durationMs: 4200,
            scaleEnd: 1.15,
            focusX: '56%',
            focusY: '42%'
        })
    ]);
    const SPECIAL_SCENE_SCREEN_CLASSES = Object.freeze(
        SPECIAL_SCENE_TREATMENTS.map((config) => config.screenClass)
    );

    const refs = {
        screen: document.getElementById('story-screen'),
        background: document.getElementById('story-scene-background'),
        cinematicOverlay: document.getElementById('story-scene-cinematic-overlay'),
        title: document.getElementById('story-title'),
        progress: document.getElementById('story-progress'),
        beatTitle: document.getElementById('story-beat-title'),
        actorsLayer: document.getElementById('story-actors-layer'),
        dialoguePanel: document.querySelector('.story-dialogue-panel'),
        speaker: document.getElementById('story-speaker'),
        text: document.getElementById('story-text'),
        choiceList: document.getElementById('story-choice-list'),
        nextBtn: document.getElementById('story-next-btn'),
        collectionMessage: document.getElementById('story-unlock-banner'),
        skipBtn: document.getElementById('story-skip-btn'),
        itemRewardOverlay: document.getElementById('story-item-reward-overlay'),
        itemRewardImage: document.getElementById('story-item-reward-image'),
        itemRewardTitle: document.getElementById('story-item-reward-title'),
        itemRewardText: document.getElementById('story-item-reward-text'),
        itemRewardBtn: document.getElementById('story-item-reward-btn'),
        cleaningOverlay: document.getElementById('story-cleaning-overlay'),
        cleaningCanvas: document.getElementById('story-cleaning-canvas'),
        cleaningCelebration: document.getElementById('story-cleaning-celebration'),
        cleaningStagePill: document.getElementById('story-cleaning-stage-pill'),
        cleaningProgressFill: document.getElementById('story-cleaning-progress-fill'),
        cleaningProgressText: document.getElementById('story-cleaning-progress-text'),
        cleaningTitle: document.getElementById('story-cleaning-title'),
        cleaningHint: document.getElementById('story-cleaning-hint'),
        cleaningContinueBtn: document.getElementById('story-cleaning-continue-btn')
    };

    if (!schema || !refs.screen) {
        return;
    }

    const PLAYER_STATE = {
        active: false,
        storyId: '',
        story: null,
        beatIndex: 0,
        onComplete: null,
        backdropMode: BACKDROP_MODE_STORY
    };

    const backgroundLayers = [];
    let effectTimer = 0;
    let activeBackgroundIndex = 0;
    let activeBackgroundSrc = '';
    let hasRenderedBeat = false;
    let typewriterTimer = 0;
    let typewriterChars = [];
    let typewriterIndex = 0;
    let typewriterActive = false;
    let itemRewardOpen = false;
    let choiceOpen = false;
    let collectionUnlockPending = null;
    let activeSpecialSceneKey = '';

    // --------------- Image Preload System ---------------
    const PRELOAD_CACHE = new Map();
    const PRELOAD_AHEAD_COUNT = 5;
    let chapterPreloadIdleId = 0;

    // WebP support detection (resolved once, cached)
    let _webpSupported = null;
    function detectWebpSupport() {
        if (_webpSupported !== null) return Promise.resolve(_webpSupported);
        return new Promise(function (resolve) {
            var img = new Image();
            img.onload = function () { _webpSupported = (img.width > 0 && img.height > 0); resolve(_webpSupported); };
            img.onerror = function () { _webpSupported = false; resolve(false); };
            img.src = 'data:image/webp;base64,UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA';
        });
    }
    // Kick off detection immediately
    detectWebpSupport();

    function toWebpSrc(src) {
        if (!_webpSupported) return src;
        var s = String(src || '');
        return s.replace(/\.png(?=$|\?)/i, '.webp');
    }

    function preloadImage(src) {
        const normalized = String(src || '').trim();
        if (!normalized) return null;
        // Cache key is always the original (png) versioned URL
        const versionedOriginal = withAssetVersion(normalized);
        if (PRELOAD_CACHE.has(versionedOriginal)) return PRELOAD_CACHE.get(versionedOriginal);

        const entry = { src: versionedOriginal, loaded: false, failed: false, img: null, promise: null, resolvedSrc: versionedOriginal };
        entry.promise = new Promise(function (resolve) {
            var webpSrc = withAssetVersion(toWebpSrc(normalized));
            var tryWebp = _webpSupported && webpSrc !== versionedOriginal;

            function loadFinal(finalSrc) {
                var img = new Image();
                entry.img = img;
                img.onload = function () { entry.loaded = true; entry.resolvedSrc = finalSrc; resolve(entry); };
                img.onerror = function () { entry.failed = true; resolve(entry); };
                img.src = finalSrc;
            }

            if (tryWebp) {
                var probe = new Image();
                probe.onload = function () { entry.resolvedSrc = webpSrc; entry.loaded = true; entry.img = probe; resolve(entry); };
                probe.onerror = function () { loadFinal(versionedOriginal); };
                probe.src = webpSrc;
            } else {
                loadFinal(versionedOriginal);
            }
        });
        PRELOAD_CACHE.set(versionedOriginal, entry);
        return entry;
    }

    function collectBeatImageSrcs(story, beat) {
        var srcs = [];
        if (!beat) return srcs;
        if (beat.background) srcs.push(beat.background);
        if (beat.type === 'dialogue' && schema) {
            var actors = schema.getResolvedActors(story, beat);
            if (Array.isArray(actors)) {
                actors.forEach(function (a) { if (a && a.portraitSrc) srcs.push(a.portraitSrc); });
            }
        }
        if (beat.itemReward && beat.itemReward.imageSrc) srcs.push(beat.itemReward.imageSrc);
        if (beat.interaction) {
            var inter = beat.interaction;
            if (inter.dirtyBackground) srcs.push(inter.dirtyBackground);
            if (inter.midBackground) srcs.push(inter.midBackground);
            if (inter.cleanBackground) srcs.push(inter.cleanBackground);
        }
        return srcs;
    }

    function preloadUpcomingBeats(count) {
        var beats = PLAYER_STATE.story && Array.isArray(PLAYER_STATE.story.beats)
            ? PLAYER_STATE.story.beats : [];
        var start = PLAYER_STATE.beatIndex + 1;
        var end = Math.min(beats.length, start + (count || PRELOAD_AHEAD_COUNT));
        for (var i = start; i < end; i++) {
            collectBeatImageSrcs(PLAYER_STATE.story, beats[i]).forEach(preloadImage);
        }
    }

    function preloadChapterAssetsIdle(story) {
        if (chapterPreloadIdleId) {
            if (typeof globalScope.cancelIdleCallback === 'function') {
                globalScope.cancelIdleCallback(chapterPreloadIdleId);
            } else {
                globalScope.clearTimeout(chapterPreloadIdleId);
            }
            chapterPreloadIdleId = 0;
        }
        var beats = story && Array.isArray(story.beats) ? story.beats : [];
        var allSrcs = [];
        beats.forEach(function (beat) {
            collectBeatImageSrcs(story, beat).forEach(function (src) { allSrcs.push(src); });
        });
        // deduplicate
        var seen = new Set();
        var unique = allSrcs.filter(function (s) {
            var v = withAssetVersion(s);
            if (seen.has(v)) return false;
            seen.add(v);
            return true;
        });
        var idx = 0;
        function loadBatch(deadline) {
            var hasTime = typeof deadline.timeRemaining === 'function';
            while (idx < unique.length) {
                if (hasTime && deadline.timeRemaining() < 2) break;
                preloadImage(unique[idx]);
                idx++;
            }
            if (idx < unique.length) {
                chapterPreloadIdleId = scheduleIdle(loadBatch, 1500);
            } else {
                chapterPreloadIdleId = 0;
            }
        }
        chapterPreloadIdleId = scheduleIdle(loadBatch, 1500);
    }

    function scheduleIdle(callback, timeout) {
        if (typeof globalScope.requestIdleCallback === 'function') {
            return globalScope.requestIdleCallback(callback, { timeout: timeout || 2000 });
        }
        return globalScope.setTimeout(function () {
            callback({ timeRemaining: function () { return 12; } });
        }, 80);
    }

    function getPreloadEntry(src) {
        var normalized = String(src || '').trim();
        if (!normalized) return null;
        return PRELOAD_CACHE.get(withAssetVersion(normalized)) || null;
    }

    function clearPreloadCache() {
        PRELOAD_CACHE.clear();
        if (chapterPreloadIdleId) {
            if (typeof globalScope.cancelIdleCallback === 'function') {
                globalScope.cancelIdleCallback(chapterPreloadIdleId);
            } else {
                globalScope.clearTimeout(chapterPreloadIdleId);
            }
            chapterPreloadIdleId = 0;
        }
    }
    const CLEANING_STATE = {
        active: false,
        completed: false,
        stageIndex: 0,
        interaction: null,
        pendingAdvance: false,
        pointerId: null,
        lastPoint: null,
        markedCells: new Set(),
        canvasRect: null,
        celebrationTimer: 0
    };

    function escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function setText(ref, value) {
        if (ref) {
            ref.textContent = String(value || '');
        }
    }

    function getCurrentItemReward() {
        const beat = getCurrentBeat();
        return beat && beat.itemReward && typeof beat.itemReward === 'object'
            ? beat.itemReward
            : null;
    }

    function getCurrentInteraction() {
        const beat = getCurrentBeat();
        return beat && beat.interaction && typeof beat.interaction === 'object'
            ? beat.interaction
            : null;
    }

    function getCurrentChoices() {
        const beat = getCurrentBeat();
        return beat && Array.isArray(beat.choices) && beat.choices.length > 0
            ? beat.choices
            : null;
    }

    function getStoryData() {
        const runtimeStoryData = globalScope.WynneStoryData || null;
        return runtimeStoryData && typeof runtimeStoryData.getNextStoryId === 'function'
            ? runtimeStoryData
            : null;
    }

    function normalizeSceneAssetKey(value) {
        return String(value || '')
            .trim()
            .replace(/\\/g, '/')
            .replace(/\.(png|webp)(?=$|\?)/i, '');
    }

    function resolveSpecialSceneTreatment(beat) {
        const storyId = String(PLAYER_STATE.storyId || '').trim();
        const backgroundKey = normalizeSceneAssetKey(beat && beat.background);
        if (!storyId || !backgroundKey) {
            return null;
        }

        for (let i = 0; i < SPECIAL_SCENE_TREATMENTS.length; i += 1) {
            const config = SPECIAL_SCENE_TREATMENTS[i];
            if (config.storyId === storyId && backgroundKey.includes(config.backgroundMatch)) {
                return config;
            }
        }

        return null;
    }

    function getSpecialSceneTreatmentKey(beat, config) {
        if (!config) {
            return '';
        }

        const storyId = String(PLAYER_STATE.storyId || '').trim();
        const backgroundKey = normalizeSceneAssetKey(beat && beat.background);
        return storyId && backgroundKey
            ? `${storyId}::${backgroundKey}`
            : '';
    }

    function clearSpecialSceneTreatment() {
        SPECIAL_SCENE_SCREEN_CLASSES.forEach((className) => {
            refs.screen.classList.remove(className);
        });
        refs.screen.style.removeProperty('--story-special-cg-duration');
        refs.screen.style.removeProperty('--story-special-cg-scale-end');
        refs.screen.style.removeProperty('--story-special-cg-focus-x');
        refs.screen.style.removeProperty('--story-special-cg-focus-y');

        if (refs.cinematicOverlay) {
            refs.cinematicOverlay.classList.remove('is-visible');
            refs.cinematicOverlay.hidden = true;
        }
    }

    function applySpecialSceneTreatment(config) {
        clearSpecialSceneTreatment();

        if (!config) {
            return;
        }

        refs.screen.style.setProperty('--story-special-cg-duration', `${Math.max(1200, Math.floor(Number(config.durationMs) || 0))}ms`);
        refs.screen.style.setProperty('--story-special-cg-scale-end', String(config.scaleEnd || 1.08));
        refs.screen.style.setProperty('--story-special-cg-focus-x', String(config.focusX || '50%'));
        refs.screen.style.setProperty('--story-special-cg-focus-y', String(config.focusY || '50%'));

        if (refs.cinematicOverlay) {
            refs.cinematicOverlay.hidden = false;
        }

        void refs.screen.offsetWidth;
        refs.screen.classList.add(config.screenClass);

        if (refs.cinematicOverlay) {
            refs.cinematicOverlay.classList.add('is-visible');
        }
    }

    function updateSkipButton() {
        if (!refs.skipBtn) {
            return;
        }

        const storyData = getStoryData();
        const hasNextStory = Boolean(
            PLAYER_STATE.active
            && PLAYER_STATE.storyId
            && storyData
            && storyData.getNextStoryId(PLAYER_STATE.storyId)
        );

        refs.skipBtn.hidden = !(PLAYER_STATE.active && PLAYER_STATE.storyId);
        refs.skipBtn.title = hasNextStory
            ? '跳过本章并进入下一章'
            : '跳过当前剧情';
        setText(refs.skipBtn, '跳过');
    }

    function getCurrentCollectionUnlock() {
        const beat = getCurrentBeat();
        return beat && beat.collectionUnlock && typeof beat.collectionUnlock === 'object'
            ? beat.collectionUnlock
            : null;
    }

    function setCollectionUnlockPending(unlock) {
        collectionUnlockPending = unlock && typeof unlock === 'object'
            ? { ...unlock }
            : null;
    }

    function consumeCollectionUnlock() {
        const payload = collectionUnlockPending;
        collectionUnlockPending = null;
        return payload;
    }

    function shouldInterruptForCollectionUnlock(unlock) {
        const normalizedUnlock = unlock && typeof unlock === 'object'
            ? unlock
            : null;
        if (!normalizedUnlock || !normalizedUnlock.speciesId) {
            return false;
        }

        const economy = globalScope.WynneZooEconomy || null;
        if (!economy || typeof economy.getSnapshot !== 'function') {
            return true;
        }

        const snapshot = economy.getSnapshot();
        const collection = snapshot && snapshot.collection && typeof snapshot.collection === 'object'
            ? snapshot.collection
            : null;
        if (!collection) {
            return true;
        }

        const speciesId = String(normalizedUnlock.speciesId || '').trim();
        const pendingGuideSpeciesId = String(collection.pendingGuideSpeciesId || '').trim();
        const unlockedAtBySpeciesId = collection.unlockedAtBySpeciesId && typeof collection.unlockedAtBySpeciesId === 'object'
            ? collection.unlockedAtBySpeciesId
            : {};

        if (pendingGuideSpeciesId === speciesId) {
            return true;
        }

        return !(Number(unlockedAtBySpeciesId[speciesId]) > 0);
    }

    function showCollectionMessage(unlock) {
        if (!refs.collectionMessage || !unlock) {
            return;
        }

        refs.collectionMessage.textContent = `太棒了！解锁了${unlock.speciesName}！`;
        refs.collectionMessage.hidden = false;
        refs.screen.classList.add('has-collection-unlock');
    }

    function hideCollectionMessage() {
        if (!refs.collectionMessage) {
            return;
        }

        refs.collectionMessage.hidden = true;
        refs.screen.classList.remove('has-collection-unlock');
    }

    function showCollectionMessage(unlock) {
        if (!refs.collectionMessage || !unlock) {
            return;
        }

        refs.collectionMessage.textContent = `太棒了！解锁了${unlock.speciesName}！`;
        refs.collectionMessage.hidden = false;
        refs.screen.classList.add('has-collection-unlock');
    }

    function getStoryData() {
        const runtimeStoryData = globalScope.WynneStoryData || null;
        return runtimeStoryData && typeof runtimeStoryData.getStory === 'function'
            ? runtimeStoryData
            : null;
    }

    function getBuiltinStory(storyId) {
        const targetId = String(storyId || '').trim();
        if (!targetId || typeof schema.createPrologueProject !== 'function') {
            return null;
        }

        const builtinStory = schema.createPrologueProject();
        return builtinStory && builtinStory.storyId === targetId
            ? builtinStory
            : null;
    }

    function resolveStoryById(storyId) {
        const targetId = String(storyId || '').trim();
        if (!targetId) {
            return null;
        }

        const runtimeStoryData = getStoryData();
        if (runtimeStoryData) {
            const runtimeStory = runtimeStoryData.getStory(targetId);
            if (runtimeStory) {
                return runtimeStory;
            }
        }

        const importedStories = globalScope.WynneImportedStories;
        if (importedStories && typeof importedStories === 'object' && importedStories[targetId]) {
            return importedStories[targetId];
        }

        return getBuiltinStory(targetId);
    }

    function getAssetVersion() {
        const meta = globalScope.WynneImportedStoryMeta;
        return meta && meta.generatedAt
            ? String(meta.generatedAt)
            : '';
    }

    function withAssetVersion(src) {
        const normalized = String(src || '').trim();
        if (!normalized) {
            return '';
        }

        const version = getAssetVersion();
        if (!version) {
            return normalized;
        }

        const separator = normalized.includes('?') ? '&' : '?';
        return `${normalized}${separator}v=${encodeURIComponent(version)}`;
    }

    function clearTypewriter() {
        if (typewriterTimer) {
            globalScope.clearTimeout(typewriterTimer);
            typewriterTimer = 0;
        }

        typewriterChars = [];
        typewriterIndex = 0;
        typewriterActive = false;
        refs.screen.classList.remove('is-typing');
    }

    function hideItemReward() {
        itemRewardOpen = false;
        refs.screen.classList.remove('has-item-reward');

        if (refs.itemRewardOverlay) {
            refs.itemRewardOverlay.classList.remove('is-visible');
            refs.itemRewardOverlay.hidden = true;
        }

        if (refs.itemRewardImage) {
            refs.itemRewardImage.hidden = true;
            refs.itemRewardImage.removeAttribute('src');
            refs.itemRewardImage.alt = '';
        }

        setText(refs.itemRewardTitle, '');
        setText(refs.itemRewardText, '');
        setText(refs.itemRewardBtn, '获得');
    }

    function hideChoices() {
        choiceOpen = false;
        refs.screen.classList.remove('has-choice-overlay');

        if (!refs.choiceList) {
            return;
        }

        refs.choiceList.hidden = true;
        refs.choiceList.innerHTML = '';
    }

    function showChoices(choices) {
        const normalizedChoices = Array.isArray(choices)
            ? choices.filter((choice) => choice && typeof choice === 'object')
            : [];

        if (!refs.choiceList || normalizedChoices.length <= 0) {
            hideChoices();
            return;
        }

        refs.choiceList.innerHTML = normalizedChoices.map((choice, index) => {
            const rawJump = Number(choice.jump ?? (index + 1));
            const jump = Number.isFinite(rawJump)
                ? Math.max(1, Math.floor(rawJump))
                : (index + 1);
            const label = escapeHtml(String(choice.label || '').trim());
            const choiceId = escapeHtml(String(choice.id || (index + 1)).trim() || String(index + 1));
            return `<button class="story-choice-btn" type="button" data-choice-id="${choiceId}" data-choice-jump="${jump}">
                <span class="story-choice-badge">${badge}</span>
                <span class="story-choice-copy">
                    <span class="story-choice-kicker">关键抉择</span>
                    <span class="story-choice-label">${label}</span>
                </span>
                <span class="story-choice-arrow" aria-hidden="true">→</span>
            </button>`;
        }).join('');
        refs.choiceList.innerHTML = normalizedChoices.map((choice, index) => {
            const rawJump = Number(choice.jump ?? (index + 1));
            const jump = Number.isFinite(rawJump)
                ? Math.max(1, Math.floor(rawJump))
                : (index + 1);
            const label = escapeHtml(String(choice.label || '').trim());
            const choiceId = escapeHtml(String(choice.id || (index + 1)).trim() || String(index + 1));
            return `<button class="story-choice-btn" type="button" data-choice-id="${choiceId}" data-choice-jump="${jump}">
                <span class="story-choice-label">${label}</span>
                <span class="story-choice-arrow" aria-hidden="true">→</span>
            </button>`;
        }).join('');
        refs.choiceList.hidden = false;
        refs.screen.classList.add('has-choice-overlay');
        choiceOpen = true;
    }

    function showItemReward(itemReward) {
        if (!refs.itemRewardOverlay) {
            return;
        }

        const reward = itemReward && typeof itemReward === 'object'
            ? itemReward
            : null;

        if (!reward) {
            hideItemReward();
            return;
        }

        const title = String(reward.title || '').trim() || '获得物品';
        const text = String(reward.text || '').trim();
        const rewardEntry = reward.imageSrc ? getPreloadEntry(reward.imageSrc) : null;
        const imageSrc = (rewardEntry && rewardEntry.loaded && rewardEntry.resolvedSrc)
            ? rewardEntry.resolvedSrc
            : withAssetVersion(reward.imageSrc || '');
        const buttonLabel = String(reward.buttonLabel || '获得').trim() || '获得';

        itemRewardOpen = true;
        refs.screen.classList.add('has-item-reward');
        refs.itemRewardOverlay.classList.remove('is-visible');
        refs.itemRewardOverlay.hidden = false;

        if (refs.itemRewardImage) {
            if (imageSrc) {
                refs.itemRewardImage.src = imageSrc;
                refs.itemRewardImage.alt = title;
                refs.itemRewardImage.hidden = false;
            } else {
                refs.itemRewardImage.hidden = true;
                refs.itemRewardImage.removeAttribute('src');
                refs.itemRewardImage.alt = '';
            }
        }

        setText(refs.itemRewardTitle, title);
        setText(refs.itemRewardText, text);
        setText(refs.itemRewardBtn, buttonLabel);

        globalScope.requestAnimationFrame(() => {
            if (!refs.itemRewardOverlay || refs.itemRewardOverlay.hidden) {
                return;
            }
            refs.itemRewardOverlay.classList.add('is-visible');
        });
    }

    function isCleaningInteractionActive() {
        return CLEANING_STATE.active;
    }

    function getCleaningStageBackgrounds(interaction) {
        if (!interaction || typeof interaction !== 'object') {
            return [];
        }

        return [
            String(interaction.midBackground || '').trim(),
            String(interaction.cleanBackground || '').trim()
        ].filter(Boolean);
    }

    function resizeCleaningCanvas() {
        if (!refs.cleaningCanvas || !refs.cleaningOverlay || refs.cleaningOverlay.hidden) {
            return null;
        }

        const rect = refs.cleaningOverlay.getBoundingClientRect();
        const width = Math.max(1, Math.round(rect.width));
        const height = Math.max(1, Math.round(rect.height));
        const pixelRatio = globalScope.devicePixelRatio || 1;

        if (refs.cleaningCanvas.width !== Math.round(width * pixelRatio)
            || refs.cleaningCanvas.height !== Math.round(height * pixelRatio)) {
            refs.cleaningCanvas.width = Math.round(width * pixelRatio);
            refs.cleaningCanvas.height = Math.round(height * pixelRatio);
            refs.cleaningCanvas.style.width = `${width}px`;
            refs.cleaningCanvas.style.height = `${height}px`;
        }

        const context = refs.cleaningCanvas.getContext('2d');
        if (!context) {
            return null;
        }

        context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        context.lineCap = 'round';
        context.lineJoin = 'round';
        CLEANING_STATE.canvasRect = rect;
        return context;
    }

    function clearCleaningCanvas() {
        const context = resizeCleaningCanvas();
        if (!context || !CLEANING_STATE.canvasRect) {
            return;
        }

        context.clearRect(0, 0, CLEANING_STATE.canvasRect.width, CLEANING_STATE.canvasRect.height);
    }

    function clearCleaningCelebration() {
        if (CLEANING_STATE.celebrationTimer) {
            globalScope.clearTimeout(CLEANING_STATE.celebrationTimer);
            CLEANING_STATE.celebrationTimer = 0;
        }

        if (!refs.cleaningCelebration) {
            return;
        }

        refs.cleaningCelebration.classList.remove('is-active');
        refs.cleaningCelebration.innerHTML = '';
        refs.cleaningCelebration.hidden = true;
    }

    function playCleaningCelebration() {
        if (!refs.cleaningCelebration) {
            return;
        }

        clearCleaningCelebration();
        refs.cleaningCelebration.hidden = false;
        refs.cleaningCelebration.classList.add('is-active');

        for (let index = 0; index < CLEANING_CELEBRATION_SPARKLES; index += 1) {
            const sparkle = document.createElement('span');
            sparkle.className = 'story-cleaning-sparkle';
            sparkle.style.setProperty('--sparkle-x', `${10 + Math.random() * 80}%`);
            sparkle.style.setProperty('--sparkle-y', `${14 + Math.random() * 64}%`);
            sparkle.style.setProperty('--sparkle-size', `${16 + Math.random() * 24}px`);
            sparkle.style.setProperty('--sparkle-delay', `${Math.random() * 0.38}s`);
            sparkle.style.setProperty('--sparkle-duration', `${0.7 + Math.random() * 0.42}s`);
            refs.cleaningCelebration.appendChild(sparkle);
        }

        CLEANING_STATE.celebrationTimer = globalScope.setTimeout(() => {
            clearCleaningCelebration();
        }, 1500);
    }

    function resetCleaningCoverage() {
        CLEANING_STATE.pendingAdvance = false;
        CLEANING_STATE.markedCells = new Set();
        CLEANING_STATE.lastPoint = null;
        clearCleaningCanvas();
    }

    function getCleaningProgress() {
        const totalCells = CLEANING_GRID_COLUMNS * CLEANING_GRID_ROWS;
        return totalCells > 0
            ? Math.min(1, CLEANING_STATE.markedCells.size / totalCells)
            : 0;
    }

    function getCleaningSequenceMeta() {
        const beats = PLAYER_STATE.story && Array.isArray(PLAYER_STATE.story.beats)
            ? PLAYER_STATE.story.beats
            : [];
        const cleaningBeatIndexes = [];

        beats.forEach((beat, beatIndex) => {
            if (beat && beat.interaction && beat.interaction.type === 'cleaning') {
                cleaningBeatIndexes.push(beatIndex);
            }
        });

        const currentSequenceIndex = Math.max(0, cleaningBeatIndexes.indexOf(PLAYER_STATE.beatIndex));
        return {
            total: Math.max(1, cleaningBeatIndexes.length),
            currentIndex: currentSequenceIndex
        };
    }

    function getCleaningInteractionProgress() {
        if (!CLEANING_STATE.interaction) {
            return 0;
        }

        const totalStages = Math.max(1, getCleaningStageBackgrounds(CLEANING_STATE.interaction).length);
        if (CLEANING_STATE.completed) {
            return 1;
        }

        const activeStageIndex = Math.min(CLEANING_STATE.stageIndex, totalStages - 1);
        const stageTarget = CLEANING_STAGE_TARGETS[Math.min(activeStageIndex, CLEANING_STAGE_TARGETS.length - 1)] || 0.32;
        const stageProgress = stageTarget > 0
            ? Math.min(1, getCleaningProgress() / stageTarget)
            : 0;

        return Math.min(1, (activeStageIndex + stageProgress) / totalStages);
    }

    function getCleaningOverallProgress() {
        const sequenceMeta = getCleaningSequenceMeta();
        const interactionProgress = getCleaningInteractionProgress();
        return Math.min(1, (sequenceMeta.currentIndex + interactionProgress) / sequenceMeta.total);
    }

    function updateCleaningUi() {
        if (!refs.cleaningOverlay || !CLEANING_STATE.interaction) {
            return;
        }

        const sequenceMeta = getCleaningSequenceMeta();
        const stageNumber = CLEANING_STATE.completed
            ? sequenceMeta.total
            : Math.min(sequenceMeta.total, sequenceMeta.currentIndex + 1);
        const progress = getCleaningOverallProgress();
        const prompts = Array.isArray(CLEANING_STATE.interaction.prompts)
            ? CLEANING_STATE.interaction.prompts
            : [];

        setText(refs.cleaningStagePill, CLEANING_STATE.completed ? '清扫完成' : `清扫 ${stageNumber} / ${sequenceMeta.total}`);
        if (refs.cleaningProgressFill) {
            refs.cleaningProgressFill.style.width = `${Math.round(progress * 100)}%`;
        }
        setText(refs.cleaningProgressText, `${Math.round(progress * 100)}%`);

        if (CLEANING_STATE.completed) {
            setText(refs.cleaningTitle, '动物园焕然一新');
            setText(refs.cleaningHint, CLEANING_STATE.interaction.completionText || '打扫完成，动物园焕然一新！');
            if (refs.cleaningContinueBtn) {
                refs.cleaningContinueBtn.hidden = false;
                setText(refs.cleaningContinueBtn, CLEANING_STATE.interaction.buttonLabel || '继续剧情');
            }
            return;
        }

        const totalStages = Math.max(1, getCleaningStageBackgrounds(CLEANING_STATE.interaction).length);
        if (totalStages === 1) {
            setText(refs.cleaningTitle, String(CLEANING_STATE.interaction.cleanBackground || '').trim() ? '把这里彻底打扫干净' : '先把大块污渍擦掉');
        } else {
            setText(refs.cleaningTitle, stageNumber === 1 ? '先把大块污渍擦掉' : '再认真打扫一遍');
        }
        setText(refs.cleaningHint, prompts[CLEANING_STATE.stageIndex] || (totalStages === 1 && String(CLEANING_STATE.interaction.cleanBackground || '').trim()
            ? '继续滑动清扫，把剩下的污渍也处理干净。'
            : '按住并滑动屏幕进行清扫。'));
        if (refs.cleaningContinueBtn) {
            refs.cleaningContinueBtn.hidden = true;
        }
    }

    function drawCleaningStroke(fromPoint, toPoint) {
        const context = resizeCleaningCanvas();
        if (!context) {
            return;
        }

        context.save();
        context.strokeStyle = 'rgba(255, 245, 186, 0.92)';
        context.lineWidth = 22;
        context.shadowBlur = 26;
        context.shadowColor = 'rgba(255, 232, 132, 0.72)';
        context.beginPath();
        context.moveTo(fromPoint.x, fromPoint.y);
        context.lineTo(toPoint.x, toPoint.y);
        context.stroke();

        context.strokeStyle = 'rgba(255, 255, 255, 0.78)';
        context.lineWidth = 8;
        context.shadowBlur = 0;
        context.beginPath();
        context.moveTo(fromPoint.x, fromPoint.y);
        context.lineTo(toPoint.x, toPoint.y);
        context.stroke();
        context.restore();
    }

    function markCleaningCoverage(point) {
        if (!CLEANING_STATE.canvasRect) {
            return;
        }

        const cellWidth = CLEANING_STATE.canvasRect.width / CLEANING_GRID_COLUMNS;
        const cellHeight = CLEANING_STATE.canvasRect.height / CLEANING_GRID_ROWS;
        const radiusX = Math.ceil(CLEANING_BRUSH_RADIUS / cellWidth);
        const radiusY = Math.ceil(CLEANING_BRUSH_RADIUS / cellHeight);
        const centerColumn = Math.floor(point.x / cellWidth);
        const centerRow = Math.floor(point.y / cellHeight);

        for (let row = centerRow - radiusY; row <= centerRow + radiusY; row += 1) {
            if (row < 0 || row >= CLEANING_GRID_ROWS) {
                continue;
            }

            for (let column = centerColumn - radiusX; column <= centerColumn + radiusX; column += 1) {
                if (column < 0 || column >= CLEANING_GRID_COLUMNS) {
                    continue;
                }

                const cellCenterX = ((column + 0.5) * cellWidth);
                const cellCenterY = ((row + 0.5) * cellHeight);
                const distance = Math.hypot(cellCenterX - point.x, cellCenterY - point.y);
                if (distance <= CLEANING_BRUSH_RADIUS) {
                    CLEANING_STATE.markedCells.add(`${column}:${row}`);
                }
            }
        }
    }

    function getCleaningPoint(event) {
        if (!CLEANING_STATE.canvasRect) {
            resizeCleaningCanvas();
        }

        if (!CLEANING_STATE.canvasRect) {
            return null;
        }

        return {
            x: Math.max(0, Math.min(CLEANING_STATE.canvasRect.width, event.clientX - CLEANING_STATE.canvasRect.left)),
            y: Math.max(0, Math.min(CLEANING_STATE.canvasRect.height, event.clientY - CLEANING_STATE.canvasRect.top))
        };
    }

    function setCleaningBackground(backgroundSrc) {
        const normalized = String(backgroundSrc || '').trim();
        if (!normalized) {
            return;
        }

        setSceneBackground(normalized, { immediate: false });
    }

    function advanceCleaningStage() {
        if (!CLEANING_STATE.interaction) {
            return;
        }

        CLEANING_STATE.pendingAdvance = false;
        const stageBackgrounds = getCleaningStageBackgrounds(CLEANING_STATE.interaction);
        const nextBackground = stageBackgrounds[Math.min(CLEANING_STATE.stageIndex, stageBackgrounds.length - 1)] || '';

        if (CLEANING_STATE.stageIndex < (stageBackgrounds.length - 1)) {
            CLEANING_STATE.stageIndex += 1;
            resetCleaningCoverage();
            setCleaningBackground(nextBackground);
            updateCleaningUi();
            return;
        }

        CLEANING_STATE.completed = true;
        CLEANING_STATE.pointerId = null;
        CLEANING_STATE.lastPoint = null;
        clearCleaningCanvas();
        setCleaningBackground(nextBackground);
        playCleaningCelebration();
        updateCleaningUi();
    }

    function handleCleaningProgress(point) {
        if (!CLEANING_STATE.active || CLEANING_STATE.completed) {
            return;
        }

        markCleaningCoverage(point);
        updateCleaningUi();

        const target = CLEANING_STAGE_TARGETS[Math.min(CLEANING_STATE.stageIndex, CLEANING_STAGE_TARGETS.length - 1)] || 0.32;
        if (getCleaningProgress() >= target && !CLEANING_STATE.pendingAdvance) {
            CLEANING_STATE.pendingAdvance = true;
            globalScope.setTimeout(() => {
                if (CLEANING_STATE.active) {
                    advanceCleaningStage();
                }
            }, 120);
        }
    }

    function hideCleaningInteraction() {
        CLEANING_STATE.active = false;
        CLEANING_STATE.completed = false;
        CLEANING_STATE.stageIndex = 0;
        CLEANING_STATE.interaction = null;
        CLEANING_STATE.pendingAdvance = false;
        CLEANING_STATE.pointerId = null;
        CLEANING_STATE.lastPoint = null;
        CLEANING_STATE.canvasRect = null;
        CLEANING_STATE.markedCells = new Set();
        clearCleaningCelebration();
        refs.screen.classList.remove('has-cleaning-interaction');

        if (refs.cleaningOverlay) {
            refs.cleaningOverlay.classList.remove('is-visible');
            refs.cleaningOverlay.hidden = true;
        }

        clearCleaningCanvas();
        if (refs.cleaningContinueBtn) {
            refs.cleaningContinueBtn.hidden = true;
        }
        setText(refs.cleaningStagePill, '');
        setText(refs.cleaningProgressText, '0%');
        if (refs.cleaningProgressFill) {
            refs.cleaningProgressFill.style.width = '0%';
        }
        setText(refs.cleaningTitle, '');
        setText(refs.cleaningHint, '');
    }

    function showCleaningInteraction(interaction) {
        if (!refs.cleaningOverlay || !refs.cleaningCanvas) {
            return;
        }

        const normalizedInteraction = interaction && typeof interaction === 'object'
            ? interaction
            : null;

        if (!normalizedInteraction || normalizedInteraction.type !== 'cleaning') {
            hideCleaningInteraction();
            return;
        }

        CLEANING_STATE.active = true;
        CLEANING_STATE.completed = false;
        CLEANING_STATE.stageIndex = 0;
        CLEANING_STATE.interaction = normalizedInteraction;
        CLEANING_STATE.pendingAdvance = false;
        CLEANING_STATE.pointerId = null;
        CLEANING_STATE.lastPoint = null;
        refs.screen.classList.add('has-cleaning-interaction');
        refs.cleaningOverlay.classList.remove('is-visible');
        refs.cleaningOverlay.hidden = false;
        resetCleaningCoverage();
        setCleaningBackground(normalizedInteraction.dirtyBackground);
        updateCleaningUi();

        globalScope.requestAnimationFrame(() => {
            resizeCleaningCanvas();
            if (refs.cleaningOverlay && !refs.cleaningOverlay.hidden) {
                refs.cleaningOverlay.classList.add('is-visible');
            }
        });
    }

    function finishCleaningInteraction() {
        if (!CLEANING_STATE.active || !CLEANING_STATE.completed) {
            return false;
        }

        hideCleaningInteraction();
        return advanceBeatWithoutTypewriterCheck();
    }

    function normalizeBackdropMode(value) {
        return String(value || '').trim() === BACKDROP_MODE_ZOO_HOME
            ? BACKDROP_MODE_ZOO_HOME
            : BACKDROP_MODE_STORY;
    }

    function dispatchBackdropChange(backdropMode) {
        globalScope.dispatchEvent(new CustomEvent('wynne-story-backdrop-change', {
            detail: { backdropMode }
        }));
    }

    function setBackdropMode(backdropMode) {
        const normalizedMode = normalizeBackdropMode(backdropMode);
        const changed = PLAYER_STATE.backdropMode !== normalizedMode;

        PLAYER_STATE.backdropMode = normalizedMode;
        refs.screen.classList.toggle('is-over-zoo-home', normalizedMode === BACKDROP_MODE_ZOO_HOME);

        if (changed) {
            dispatchBackdropChange(normalizedMode);
        }
    }

    function isTypewriterRunning() {
        return typewriterActive && typewriterIndex < typewriterChars.length;
    }

    function finishTypewriter() {
        if (!typewriterChars.length) {
            clearTypewriter();
            return false;
        }

        setText(refs.text, typewriterChars.join(''));
        clearTypewriter();
        return true;
    }

    function getTypewriterDelay(character) {
        if ('，。！？；：…,.!?;:'.includes(character) || character === '\n') {
            return TYPEWRITER_PUNCTUATION_DELAY;
        }
        return TYPEWRITER_BASE_DELAY;
    }

    function stepTypewriter() {
        if (!typewriterActive) {
            return;
        }

        typewriterIndex += 1;
        setText(refs.text, typewriterChars.slice(0, typewriterIndex).join(''));

        if (typewriterIndex >= typewriterChars.length) {
            clearTypewriter();
            return;
        }

        const currentChar = typewriterChars[typewriterIndex - 1] || '';
        typewriterTimer = globalScope.setTimeout(stepTypewriter, getTypewriterDelay(currentChar));
    }

    function startTypewriter(text) {
        const normalizedText = String(text || '');
        clearTypewriter();

        if (!normalizedText) {
            setText(refs.text, '');
            return;
        }

        typewriterChars = Array.from(normalizedText);
        typewriterIndex = 0;
        typewriterActive = true;
        refs.screen.classList.add('is-typing');
        setText(refs.text, '');
        stepTypewriter();
    }

    function clearBeatEffects() {
        EFFECT_CLASSES.forEach((effectClass) => {
            refs.screen.classList.remove(effectClass);
        });

        if (effectTimer) {
            globalScope.clearTimeout(effectTimer);
            effectTimer = 0;
        }
    }

    function applyBeatEffect(effectClass) {
        const normalizedEffect = String(effectClass || '').trim();
        clearBeatEffects();

        if (!normalizedEffect || !EFFECT_CLASSES.includes(normalizedEffect)) {
            return;
        }

        void refs.screen.offsetWidth;
        refs.screen.classList.add(normalizedEffect);
        effectTimer = globalScope.setTimeout(() => {
            refs.screen.classList.remove(normalizedEffect);
            effectTimer = 0;
        }, 700);
    }

    function setBeatCameraEffect(cameraEffect) {
        const normalizedEffect = String(cameraEffect || '').trim();
        CAMERA_EFFECT_CLASSES.forEach((effectClass) => {
            refs.screen.classList.remove(effectClass);
        });

        if (!normalizedEffect || !CAMERA_EFFECT_CLASSES.includes(normalizedEffect)) {
            return;
        }

        refs.screen.classList.add(normalizedEffect);
    }

    function initializeBackgroundLayers() {
        if (!refs.background || backgroundLayers.length > 0) {
            return;
        }

        refs.background.classList.add('is-active');
        refs.background.dataset.layer = 'primary';
        backgroundLayers.push(refs.background);

        const secondaryLayer = refs.background.cloneNode(false);
        secondaryLayer.removeAttribute('id');
        secondaryLayer.classList.remove('is-active');
        secondaryLayer.dataset.layer = 'secondary';
        refs.background.insertAdjacentElement('afterend', secondaryLayer);
        backgroundLayers.push(secondaryLayer);
    }

    function formatBackgroundImage(backgroundSrc) {
        const normalized = String(backgroundSrc || '').trim();
        if (!normalized) return '';
        // Use resolved WebP src if preloaded, otherwise fall back to versioned original
        const entry = getPreloadEntry(normalized);
        const finalSrc = (entry && entry.loaded && entry.resolvedSrc) ? entry.resolvedSrc : withAssetVersion(normalized);
        return `url("${finalSrc.replace(/"/g, '\\"')}")`;
    }

    function applyBackgroundSwitch(normalized, immediate) {
        const currentLayer = backgroundLayers[activeBackgroundIndex] || backgroundLayers[0];

        if (normalized === activeBackgroundSrc && currentLayer) {
            currentLayer.classList.add('is-active');
            return;
        }

        if (immediate || !activeBackgroundSrc) {
            currentLayer.style.backgroundImage = formatBackgroundImage(normalized);
            currentLayer.classList.add('is-active');
            backgroundLayers.forEach((layer, index) => {
                if (index !== activeBackgroundIndex) {
                    layer.classList.remove('is-active');
                }
            });
            activeBackgroundSrc = normalized;
            return;
        }

        const nextIndex = activeBackgroundIndex === 0 ? 1 : 0;
        const nextLayer = backgroundLayers[nextIndex];

        nextLayer.style.backgroundImage = formatBackgroundImage(normalized);
        void nextLayer.offsetWidth;
        nextLayer.classList.add('is-active');
        currentLayer.classList.remove('is-active');

        activeBackgroundIndex = nextIndex;
        activeBackgroundSrc = normalized;
    }

    function setSceneBackground(backgroundSrc, options = {}) {
        const normalized = String(backgroundSrc || '').trim();
        initializeBackgroundLayers();

        if (backgroundLayers.length <= 0) {
            if (refs.background) {
                refs.background.style.backgroundImage = formatBackgroundImage(normalized);
            }
            activeBackgroundSrc = normalized;
            return;
        }

        const immediate = Boolean(options.immediate);

        // If image is already preloaded (or empty), apply immediately
        if (!normalized) {
            applyBackgroundSwitch(normalized, immediate);
            return;
        }

        const entry = getPreloadEntry(normalized);
        if (entry && (entry.loaded || entry.failed)) {
            applyBackgroundSwitch(normalized, immediate);
            return;
        }

        // Not yet loaded — kick off preload and apply once ready (with a timeout fallback)
        const preloadEntry = preloadImage(normalized);
        if (!preloadEntry || !preloadEntry.promise) {
            applyBackgroundSwitch(normalized, immediate);
            return;
        }

        // Race: wait for image load or 800ms max, whichever comes first
        var applied = false;
        var fallbackTimer = globalScope.setTimeout(function () {
            if (!applied) {
                applied = true;
                applyBackgroundSwitch(normalized, immediate);
            }
        }, 800);

        preloadEntry.promise.then(function () {
            if (!applied) {
                applied = true;
                globalScope.clearTimeout(fallbackTimer);
                applyBackgroundSwitch(normalized, immediate);
            }
        });
    }

    function getCurrentBeat() {
        if (!PLAYER_STATE.story || !Array.isArray(PLAYER_STATE.story.beats)) {
            return null;
        }
        return PLAYER_STATE.story.beats[PLAYER_STATE.beatIndex] || null;
    }

    function getStoryLength() {
        return PLAYER_STATE.story && Array.isArray(PLAYER_STATE.story.beats)
            ? PLAYER_STATE.story.beats.length
            : 0;
    }

    function getRenderableActors(beat) {
        if (!beat || beat.type !== 'dialogue') {
            return [];
        }

        const actors = schema.getResolvedActors(PLAYER_STATE.story, beat);
        return Array.isArray(actors) ? actors : [];
    }

    function buildActorMarkup(actor, options = {}) {
        const speakingName = String(options.speakingName || '').trim();
        const emphasisClass = speakingName && actor.characterName === speakingName
            ? 'is-speaking'
            : (speakingName ? 'is-support' : '');

        if (actor.portraitSrc) {
            const entry = getPreloadEntry(actor.portraitSrc);
            const resolvedSrc = (entry && entry.loaded && entry.resolvedSrc)
                ? entry.resolvedSrc
                : withAssetVersion(actor.portraitSrc);
            return `
                <img
                    class="story-actor is-${escapeHtml(actor.position)} ${escapeHtml(emphasisClass)}"
                    src="${escapeHtml(resolvedSrc)}"
                    alt="${escapeHtml(actor.characterName || '角色立绘')}"
                    decoding="async"
                >
            `;
        }

        const initial = actor.characterName ? actor.characterName.slice(0, 1) : '?';

        return `
            <div class="story-actor story-actor-placeholder is-${escapeHtml(actor.position)} ${escapeHtml(emphasisClass)}">
                <div class="story-actor-placeholder-badge">${escapeHtml(initial)}</div>
                <div class="story-actor-placeholder-name">${escapeHtml(actor.characterName || '未设置立绘')}</div>
            </div>
        `;
    }

    function resetBeatClasses() {
        refs.screen.classList.remove('is-illustration');
        refs.screen.classList.remove('is-narration-beat');
        refs.screen.classList.remove('is-silent-beat');
        refs.screen.classList.remove('is-typing');
        refs.screen.classList.remove('has-item-reward');
        refs.screen.classList.remove('has-cleaning-interaction');
        refs.screen.classList.remove('is-speaker-left');
        refs.screen.classList.remove('is-speaker-right');
        if (refs.dialoguePanel) {
            refs.dialoguePanel.classList.remove('is-speaker-left');
            refs.dialoguePanel.classList.remove('is-speaker-right');
        }
        if (refs.speaker) {
            refs.speaker.classList.remove('is-align-right');
        }
        CAMERA_EFFECT_CLASSES.forEach((effectClass) => {
            refs.screen.classList.remove(effectClass);
        });
    }

    function showChoices(choices) {
        const normalizedChoices = Array.isArray(choices)
            ? choices.filter((choice) => choice && typeof choice === 'object')
            : [];

        if (!refs.choiceList || normalizedChoices.length <= 0) {
            hideChoices();
            return;
        }

        refs.choiceList.innerHTML = normalizedChoices.map((choice, index) => {
            const rawJump = Number(choice.jump ?? (index + 1));
            const jump = Number.isFinite(rawJump)
                ? Math.max(1, Math.floor(rawJump))
                : (index + 1);
            const label = escapeHtml(String(choice.label || '').trim());
            const choiceId = escapeHtml(String(choice.id || (index + 1)).trim() || String(index + 1));
            return `<button class="story-choice-btn" type="button" data-choice-id="${choiceId}" data-choice-jump="${jump}">
                <span class="story-choice-label">${label}</span>
                <span class="story-choice-arrow" aria-hidden="true">→</span>
            </button>`;
        }).join('');
        refs.choiceList.hidden = false;
        refs.screen.classList.add('has-choice-overlay');
        choiceOpen = true;
    }

    function renderBeat() {
        const beat = getCurrentBeat();
        const storyLength = getStoryLength();

        clearTypewriter();
        hideItemReward();
        hideCleaningInteraction();
        hideChoices();

        if (!beat) {
            clearBeatEffects();
            clearSpecialSceneTreatment();
            activeSpecialSceneKey = '';
            resetBeatClasses();
            setBackdropMode(BACKDROP_MODE_STORY);
            setSceneBackground('', { immediate: true });
            setText(refs.title, '剧情');
            setText(refs.progress, '0 / 0');
            setText(refs.beatTitle, '暂无内容');
            refs.actorsLayer.innerHTML = '';

            if (refs.speaker) {
                refs.speaker.hidden = true;
                refs.speaker.dataset.type = 'narration';
            }

            setText(refs.text, '当前剧情还没有可播放的分幕。');
            setText(refs.nextBtn, '进入游戏');
            hasRenderedBeat = false;
            return;
        }

        const isIllustration = beat.presentation === 'illustration';
        const isDialogue = beat.type === 'dialogue';
        const isSilentTransition = beat.presentation === 'transition'
            || (!isDialogue && !String(beat.text || '').trim());
        const previousBackdropMode = PLAYER_STATE.backdropMode;
        const backdropMode = normalizeBackdropMode(beat.backgroundMode);
        const useZooHomeBackdrop = backdropMode === BACKDROP_MODE_ZOO_HOME;
        const specialSceneTreatment = useZooHomeBackdrop ? null : resolveSpecialSceneTreatment(beat);
        const specialSceneKey = getSpecialSceneTreatmentKey(beat, specialSceneTreatment);

        refs.screen.classList.toggle('is-illustration', isIllustration);
        refs.screen.classList.toggle('is-narration-beat', !isDialogue);
        refs.screen.classList.toggle('is-silent-beat', isSilentTransition);
        setBeatCameraEffect(beat.cameraEffect);
        setBackdropMode(backdropMode);

        setSceneBackground(useZooHomeBackdrop ? '' : beat.background, {
            immediate: !hasRenderedBeat || previousBackdropMode !== backdropMode || useZooHomeBackdrop
        });
        if (specialSceneKey !== activeSpecialSceneKey) {
            applySpecialSceneTreatment(specialSceneTreatment);
            activeSpecialSceneKey = specialSceneKey;
        }
        setText(refs.title, PLAYER_STATE.story && PLAYER_STATE.story.title ? PLAYER_STATE.story.title : '剧情');
        setText(refs.progress, `${PLAYER_STATE.beatIndex + 1} / ${Math.max(1, storyLength)}`);
        setText(refs.beatTitle, beat.title || `第 ${PLAYER_STATE.beatIndex + 1} 幕`);

        if (refs.speaker) {
            refs.speaker.hidden = !isDialogue;
            refs.speaker.dataset.type = isDialogue ? 'dialogue' : 'narration';
            setText(refs.speaker, isDialogue ? schema.getDisplaySpeaker(PLAYER_STATE.story, beat) : '');
        }

        startTypewriter(beat.text || '');

        const actors = getRenderableActors(beat);
        const speakingName = isDialogue ? schema.getDisplaySpeaker(PLAYER_STATE.story, beat) : '';
        const speakingActor = speakingName
            ? actors.find((actor) => actor.characterName === speakingName) || null
            : null;
        const speakingPosition = speakingActor ? String(speakingActor.position || '').trim() : '';

        refs.screen.classList.toggle('is-speaker-left', speakingPosition === 'left');
        refs.screen.classList.toggle('is-speaker-right', speakingPosition === 'right');
        if (refs.dialoguePanel) {
            refs.dialoguePanel.classList.toggle('is-speaker-left', speakingPosition === 'left');
            refs.dialoguePanel.classList.toggle('is-speaker-right', speakingPosition === 'right');
        }
        if (refs.speaker) {
            refs.speaker.classList.toggle('is-align-right', speakingPosition === 'right');
        }

        refs.actorsLayer.innerHTML = actors.map((actor) => buildActorMarkup(actor, { speakingName })).join('');
        setText(refs.nextBtn, PLAYER_STATE.beatIndex >= (storyLength - 1) ? '进入动物园' : '继续');

        applyBeatEffect(beat.effectClass);

        const collectionUnlock = getCurrentCollectionUnlock();
        if (collectionUnlock && shouldInterruptForCollectionUnlock(collectionUnlock)) {
            setCollectionUnlockPending(collectionUnlock);
            showCollectionMessage(collectionUnlock);
        } else {
            setCollectionUnlockPending(null);
            hideCollectionMessage();
        }

        const interaction = getCurrentInteraction();
        if (interaction) {
            showCleaningInteraction(interaction);
        } else {
            showItemReward(getCurrentItemReward());
            if (!itemRewardOpen) {
                showChoices(getCurrentChoices());
            }
        }
        hasRenderedBeat = true;

        // Preload images for upcoming beats
        preloadUpcomingBeats(PRELOAD_AHEAD_COUNT);
    }

    function finishPlayback(skipped) {
        const callback = PLAYER_STATE.onComplete;
        const payload = {
            storyId: PLAYER_STATE.storyId,
            skipped: Boolean(skipped)
        };
        const collectionUnlockPayload = consumeCollectionUnlock();
        if (collectionUnlockPayload) {
            payload.collectionUnlock = collectionUnlockPayload;
        }

        PLAYER_STATE.active = false;
        PLAYER_STATE.storyId = '';
        PLAYER_STATE.story = null;
        PLAYER_STATE.beatIndex = 0;
        PLAYER_STATE.onComplete = null;
        clearBeatEffects();
        clearTypewriter();
        hideItemReward();
        hideCleaningInteraction();
        hideChoices();
        resetBeatClasses();
        clearSpecialSceneTreatment();
        activeSpecialSceneKey = '';
        setBackdropMode(BACKDROP_MODE_STORY);
        setSceneBackground('', { immediate: true });
        hasRenderedBeat = false;
        hideCollectionMessage();
        updateSkipButton();
        clearPreloadCache();

        if (typeof callback === 'function') {
            callback(payload);
        }
    }

    function advanceBeatWithoutTypewriterCheck() {
        return advanceBeatByJump(1);
    }

    function advanceBeatByJump(jumpCount) {
        const storyLength = getStoryLength();
        const jump = Math.max(1, Math.floor(Number(jumpCount) || 1));
        if (storyLength <= 0 || PLAYER_STATE.beatIndex >= (storyLength - 1)) {
            finishPlayback(false);
            return true;
        }

        const nextBeatIndex = PLAYER_STATE.beatIndex + jump;
        if (nextBeatIndex >= storyLength) {
            finishPlayback(false);
            return true;
        }

        PLAYER_STATE.beatIndex = nextBeatIndex;
        renderBeat();
        return true;
    }

    function advance() {
        if (!PLAYER_STATE.active) {
            return false;
        }

        if (isCleaningInteractionActive()) {
            return true;
        }

        if (itemRewardOpen) {
            return true;
        }

        if (isTypewriterRunning()) {
            finishTypewriter();
            return true;
        }

        if (choiceOpen) {
            return true;
        }

        if (collectionUnlockPending && shouldInterruptForCollectionUnlock(collectionUnlockPending)) {
            finishPlayback(false);
            return true;
        }

        return advanceBeatWithoutTypewriterCheck();
    }

    function skip() {
        if (!PLAYER_STATE.active) {
            return false;
        }

        finishPlayback(true);
        return true;
    }

    function reloadActiveStoryFromData() {
        if (!PLAYER_STATE.storyId) {
            return false;
        }

        const latestStory = resolveStoryById(PLAYER_STATE.storyId);
        if (!latestStory) {
            return false;
        }

        const nextStory = schema.normalizeProject(latestStory);
        const nextLength = Array.isArray(nextStory.beats) ? nextStory.beats.length : 0;
        const nextBeatIndex = nextLength > 0
            ? Math.min(PLAYER_STATE.beatIndex, nextLength - 1)
            : 0;

        PLAYER_STATE.story = nextStory;
        PLAYER_STATE.beatIndex = nextBeatIndex;
        hasRenderedBeat = false;

        if (PLAYER_STATE.active) {
            renderBeat();
        }

        return true;
    }

    function play(storyId, options = {}) {
        const targetId = String(storyId || '').trim();
        const story = resolveStoryById(targetId);

        if (!story) {
            return false;
        }

        PLAYER_STATE.active = true;
        PLAYER_STATE.storyId = targetId;
        PLAYER_STATE.story = schema.normalizeProject(story);
        PLAYER_STATE.beatIndex = 0;
        PLAYER_STATE.onComplete = typeof options.onComplete === 'function'
            ? options.onComplete
            : null;
        PLAYER_STATE.backdropMode = BACKDROP_MODE_STORY;
        hasRenderedBeat = false;

        updateSkipButton();
        renderBeat();

        // Start idle preloading of all chapter assets in the background
        preloadChapterAssetsIdle(PLAYER_STATE.story);

        return true;
    }

    function leaveView() {
        PLAYER_STATE.active = false;
        clearBeatEffects();
        clearSpecialSceneTreatment();
        activeSpecialSceneKey = '';
        clearTypewriter();
        hideItemReward();
        hideCleaningInteraction();
        hideChoices();
        resetBeatClasses();
        setBackdropMode(BACKDROP_MODE_STORY);
        setSceneBackground('', { immediate: true });
        hasRenderedBeat = false;
        updateSkipButton();
    }

    function claimItemReward() {
        if (!PLAYER_STATE.active || !itemRewardOpen) {
            return false;
        }

        finishTypewriter();
        hideItemReward();
        return advanceBeatWithoutTypewriterCheck();
    }

    function chooseOption(jumpCount) {
        if (!PLAYER_STATE.active || !choiceOpen) {
            return false;
        }

        hideChoices();
        return advanceBeatByJump(jumpCount);
    }

    function bindEvents() {
        if (refs.nextBtn) {
            refs.nextBtn.addEventListener('click', () => {
                advance();
            });
        }

        if (refs.skipBtn) {
            refs.skipBtn.addEventListener('click', () => {
                skip();
            });
        }

        if (refs.itemRewardBtn) {
            refs.itemRewardBtn.addEventListener('click', () => {
                claimItemReward();
            });
        }

        if (refs.choiceList) {
            refs.choiceList.addEventListener('click', (event) => {
                const button = event.target.closest('.story-choice-btn');
                if (!button) {
                    return;
                }

                const jump = Number(button.dataset.choiceJump || 1);
                chooseOption(jump);
            });
        }

        if (refs.cleaningContinueBtn) {
            refs.cleaningContinueBtn.addEventListener('click', () => {
                finishCleaningInteraction();
            });
        }

        if (refs.cleaningCanvas) {
            refs.cleaningCanvas.addEventListener('pointerdown', (event) => {
                if (!CLEANING_STATE.active || CLEANING_STATE.completed) {
                    return;
                }

                event.preventDefault();
                resizeCleaningCanvas();
                CLEANING_STATE.pointerId = event.pointerId;
                if (typeof refs.cleaningCanvas.setPointerCapture === 'function') {
                    refs.cleaningCanvas.setPointerCapture(event.pointerId);
                }
                CLEANING_STATE.lastPoint = getCleaningPoint(event);
                if (!CLEANING_STATE.lastPoint) {
                    return;
                }

                markCleaningCoverage(CLEANING_STATE.lastPoint);
                drawCleaningStroke(CLEANING_STATE.lastPoint, CLEANING_STATE.lastPoint);
                handleCleaningProgress(CLEANING_STATE.lastPoint);
            });

            refs.cleaningCanvas.addEventListener('pointermove', (event) => {
                if (!CLEANING_STATE.active || CLEANING_STATE.completed || CLEANING_STATE.pointerId !== event.pointerId) {
                    return;
                }

                event.preventDefault();
                const nextPoint = getCleaningPoint(event);
                if (!nextPoint || !CLEANING_STATE.lastPoint) {
                    return;
                }

                drawCleaningStroke(CLEANING_STATE.lastPoint, nextPoint);
                CLEANING_STATE.lastPoint = nextPoint;
                handleCleaningProgress(nextPoint);
            });

            const stopCleaningPointer = (event) => {
                if (CLEANING_STATE.pointerId !== event.pointerId) {
                    return;
                }

                CLEANING_STATE.pointerId = null;
                CLEANING_STATE.lastPoint = null;
            };

            refs.cleaningCanvas.addEventListener('pointerup', stopCleaningPointer);
            refs.cleaningCanvas.addEventListener('pointercancel', stopCleaningPointer);
            refs.cleaningCanvas.addEventListener('pointerleave', stopCleaningPointer);
        }

        refs.screen.addEventListener('click', (event) => {
            if (!PLAYER_STATE.active) {
                return;
            }

            if (isCleaningInteractionActive()) {
                return;
            }

            const interactive = event.target.closest('button');
            if (interactive) {
                return;
            }

            advance();
        });

        document.addEventListener('keydown', (event) => {
            if (!PLAYER_STATE.active) {
                return;
            }

            if (isCleaningInteractionActive()) {
                if (event.key === 'Escape') {
                    event.preventDefault();
                    skip();
                }
                return;
            }

            if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowRight') {
                event.preventDefault();
                advance();
            } else if (event.key === 'Escape') {
                event.preventDefault();
                skip();
            }
        });

        globalScope.addEventListener('wynne-story-data-updated', () => {
            reloadActiveStoryFromData();
            updateSkipButton();
        });

        globalScope.addEventListener('resize', () => {
            if (CLEANING_STATE.active) {
                resizeCleaningCanvas();
            }
        });
    }

    bindEvents();

    globalScope.WynneStoryPlayer = {
        play,
        leaveView,
        skip,
        advance,
        preloadStoryAssets: function (storyId, onProgress) {
            var story = resolveStoryById(storyId);
            if (!story) return Promise.resolve();
            var normalized = schema.normalizeProject(story);
            var beats = Array.isArray(normalized.beats) ? normalized.beats : [];
            var allSrcs = [];
            beats.forEach(function (beat) {
                collectBeatImageSrcs(normalized, beat).forEach(function (s) { allSrcs.push(s); });
            });
            var seen = new Set();
            var unique = allSrcs.filter(function (s) {
                var v = withAssetVersion(s);
                if (seen.has(v)) return false;
                seen.add(v);
                return true;
            });
            if (unique.length === 0) return Promise.resolve();
            var loaded = 0;
            var total = unique.length;
            var entries = unique.map(function (src) { return preloadImage(src); });
            return Promise.all(entries.map(function (entry) {
                if (!entry || !entry.promise) { loaded++; return Promise.resolve(); }
                return entry.promise.then(function () {
                    loaded++;
                    if (typeof onProgress === 'function') onProgress(loaded, total);
                });
            }));
        },
        getState() {
            return {
                active: PLAYER_STATE.active,
                storyId: PLAYER_STATE.storyId,
                beatIndex: PLAYER_STATE.beatIndex,
                totalBeats: getStoryLength(),
                typing: isTypewriterRunning(),
                backdropMode: PLAYER_STATE.backdropMode
            };
        }
    };

    if (globalScope.WynneRegistry) {
        globalScope.WynneRegistry.register('WynneStoryPlayer', globalScope.WynneStoryPlayer);
    }
}(window));
