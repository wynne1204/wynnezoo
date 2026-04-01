(function initAppShell(globalScope) {
    'use strict';

    const storyScreen = document.getElementById('story-screen');
    const zooHomeScreen = document.getElementById('zoo-home-screen');
    const slotGameScreen = document.getElementById('slot-game-screen');
    const collectionScreen = document.getElementById('collection-screen');
    const enterSlotBtn = document.getElementById('enter-slot-btn');
    const slotBackBtn = document.getElementById('slot-back-btn');

    const R = globalScope.WynneRegistry || null;
    const zooHome = (R && R.get('ZooHomeModule')) || globalScope.ZooHomeModule || null;
    const slotGame = (R && R.get('WynneZooSlotGame')) || globalScope.WynneZooSlotGame || null;
    const zooEconomy = (R && R.get('WynneZooEconomy')) || globalScope.WynneZooEconomy || null;

    const ENTRY_STORY_ID = 'prologue';
    const FIRST_CHAPTER_ID = '第一章';
    const SECOND_CHAPTER_ID = '第二章';
    const STORY_BACKDROP_MODE_STORY = 'story';
    const STORY_BACKDROP_MODE_ZOO_HOME = 'zoo-home';

    const APP_STATE = {
        currentScreen: 'zoo',
        storyBackdropMode: STORY_BACKDROP_MODE_STORY,
        initialized: false
    };

    function getSlotSnapshot() {
        return (slotGame && typeof slotGame.getSnapshot === 'function')
            ? slotGame.getSnapshot()
            : null;
    }

    function updateZooHomeFromSlotSnapshot() {
        if (!zooHome || typeof zooHome.setSlotSnapshot !== 'function') {
            return;
        }

        zooHome.setSlotSnapshot(getSlotSnapshot());
    }

    function getStoryData() {
        const runtimeStoryData = globalScope.WynneStoryData || null;
        return runtimeStoryData && typeof runtimeStoryData.getStory === 'function'
            ? runtimeStoryData
            : null;
    }

    function hasPlayableStory(storyId) {
        const targetId = String(storyId || '').trim();
        if (!targetId) {
            return false;
        }

        const storyData = getStoryData();
        if (storyData && typeof storyData.hasStory === 'function' && storyData.hasStory(targetId)) {
            return true;
        }

        const importedStories = globalScope.WynneImportedStories;
        if (importedStories && typeof importedStories === 'object' && importedStories[targetId]) {
            return true;
        }

        return false;
    }

    function resolveFollowupStoryId(storyId) {
        const targetId = String(storyId || '').trim();
        const storyData = getStoryData();
        if (storyData && typeof storyData.getNextStoryId === 'function') {
            const nextStoryId = String(storyData.getNextStoryId(targetId) || '').trim();
            if (nextStoryId && hasPlayableStory(nextStoryId)) {
                return nextStoryId;
            }
        }

        if (targetId === ENTRY_STORY_ID && hasPlayableStory(FIRST_CHAPTER_ID)) {
            return FIRST_CHAPTER_ID;
        }

        return '';
    }

    function resolveStoryById(storyId) {
        const targetId = String(storyId || '').trim();
        if (!targetId) {
            return null;
        }

        const storyData = getStoryData();
        if (storyData && typeof storyData.getStory === 'function') {
            const story = storyData.getStory(targetId);
            if (story) {
                return story;
            }
        }

        const importedStories = globalScope.WynneImportedStories;
        if (importedStories && typeof importedStories === 'object' && importedStories[targetId]) {
            return importedStories[targetId];
        }

        return null;
    }

    function getCollectionUnlocksForStory(storyId) {
        const story = resolveStoryById(storyId);
        const beats = story && Array.isArray(story.beats)
            ? story.beats
            : [];
        const unlocks = [];
        const seenSpeciesIds = new Set();

        beats.forEach((beat) => {
            const unlock = beat && beat.collectionUnlock && typeof beat.collectionUnlock === 'object'
                ? beat.collectionUnlock
                : null;
            const speciesId = String(unlock && unlock.speciesId || '').trim();
            if (!speciesId || seenSpeciesIds.has(speciesId)) {
                return;
            }

            seenSpeciesIds.add(speciesId);
            unlocks.push({
                speciesId,
                speciesName: String(unlock.speciesName || '').trim()
            });
        });

        return unlocks;
    }

    function getStoryPlayer() {
        const runtimeStoryPlayer = globalScope.WynneStoryPlayer || null;
        return runtimeStoryPlayer && typeof runtimeStoryPlayer.play === 'function'
            ? runtimeStoryPlayer
            : null;
    }

    function getZooCollection() {
        const runtimeCollection = globalScope.WynneZooCollection || null;
        return runtimeCollection && typeof runtimeCollection === 'object'
            ? runtimeCollection
            : null;
    }

    function getPendingReturnStory() {
        return zooEconomy && typeof zooEconomy.getPendingReturnStory === 'function'
            ? zooEconomy.getPendingReturnStory()
            : null;
    }

    function maybePlayReadyPendingReturnStory() {
        const pendingReturnStory = getPendingReturnStory();
        const pendingReturnStoryId = String(pendingReturnStory && pendingReturnStory.pendingReturnStoryId || '').trim();
        if (!pendingReturnStoryId || !pendingReturnStory.readyToResume || !hasPlayableStory(pendingReturnStoryId)) {
            return false;
        }

        if (!zooEconomy || typeof zooEconomy.consumePendingReturnStory !== 'function') {
            return false;
        }

        const consumedStoryId = String(zooEconomy.consumePendingReturnStory() || '').trim();
        if (!consumedStoryId) {
            return false;
        }

        globalScope.requestAnimationFrame(() => {
            showStory(consumedStoryId, {
                markAsPlayed: true,
                returnTo: 'zoo'
            });
        });
        return true;
    }

    function setScreenVisibility(visibility = {}) {
        if (storyScreen) {
            storyScreen.classList.toggle('is-active', Boolean(visibility.story));
        }
        if (zooHomeScreen) {
            zooHomeScreen.classList.toggle('is-active', Boolean(visibility.zoo));
        }
        if (slotGameScreen) {
            slotGameScreen.classList.toggle('is-active', Boolean(visibility.slot));
        }
        if (collectionScreen) {
            collectionScreen.classList.toggle('is-active', Boolean(visibility.collection));
        }
    }

    function showZooHomeBackdrop() {
        updateZooHomeFromSlotSnapshot();

        if (zooHome && typeof zooHome.onShow === 'function') {
            zooHome.onShow(getSlotSnapshot());
        }
    }

    function setActiveScreen(targetScreen) {
        if (targetScreen === 'story-over-zoo') {
            showZooHomeBackdrop();
            setScreenVisibility({
                story: true,
                zoo: true,
                slot: false,
                collection: false
            });
            APP_STATE.currentScreen = 'story';
            APP_STATE.storyBackdropMode = STORY_BACKDROP_MODE_ZOO_HOME;
            return;
        }

        if (targetScreen === 'story'
            && APP_STATE.storyBackdropMode === STORY_BACKDROP_MODE_ZOO_HOME
            && zooHome && typeof zooHome.onHide === 'function') {
            zooHome.onHide();
        }

        setScreenVisibility({
            story: targetScreen === 'story',
            zoo: targetScreen === 'zoo',
            slot: targetScreen === 'slot',
            collection: targetScreen === 'collection'
        });

        APP_STATE.currentScreen = targetScreen;
        APP_STATE.storyBackdropMode = STORY_BACKDROP_MODE_STORY;
    }

    function leaveCurrentViews(nextScreen) {
        if (nextScreen !== 'slot' && slotGame && typeof slotGame.leaveView === 'function') {
            slotGame.leaveView();
        }

        const storyPlayer = getStoryPlayer();
        if (nextScreen !== 'story' && storyPlayer && typeof storyPlayer.leaveView === 'function') {
            storyPlayer.leaveView();
        }

        if (nextScreen !== 'zoo'
            && (APP_STATE.currentScreen === 'zoo' || APP_STATE.storyBackdropMode === STORY_BACKDROP_MODE_ZOO_HOME)
            && zooHome && typeof zooHome.onHide === 'function') {
            zooHome.onHide();
        }

        const zooCollection = getZooCollection();
        if (nextScreen !== 'collection'
            && zooCollection && typeof zooCollection.hide === 'function') {
            zooCollection.hide();
        }
    }

    function showZooHome() {
        if (!zooHomeScreen || !slotGameScreen) {
            return false;
        }

        leaveCurrentViews('zoo');
        setActiveScreen('zoo');

        if (zooHome && typeof zooHome.onShow === 'function') {
            zooHome.onShow(getSlotSnapshot());
        }

        if (maybePlayReadyPendingReturnStory()) {
            return true;
        }

        return true;
    }

    function showCollection() {
        const zooCollection = getZooCollection();
        if (!collectionScreen || !zooCollection || typeof zooCollection.show !== 'function') {
            return showZooHome();
        }

        leaveCurrentViews('collection');
        setActiveScreen('collection');
        zooCollection.show(zooEconomy && typeof zooEconomy.getSnapshot === 'function'
            ? zooEconomy.getSnapshot()
            : null);
        return true;
    }

    function showStory(storyId = ENTRY_STORY_ID, options = {}) {
        const storyPlayer = getStoryPlayer();
        const storyData = getStoryData();

        if (!storyScreen || !storyPlayer || typeof storyPlayer.play !== 'function') {
            return showZooHome();
        }

        const config = {
            markAsPlayed: false,
            returnTo: 'zoo',
            onComplete: null,
            ...options
        };

        leaveCurrentViews('story');

        const started = storyPlayer.play(storyId, {
            onComplete(payload) {
                const targetStoryId = payload && payload.storyId ? payload.storyId : storyId;
                const finishedNormally = !(payload && payload.skipped);
                const followupStoryId = resolveFollowupStoryId(targetStoryId);
                const collectionUnlock = payload && payload.collectionUnlock && typeof payload.collectionUnlock === 'object'
                    ? payload.collectionUnlock
                    : null;
                const unlockCandidates = finishedNormally
                    ? (collectionUnlock ? [collectionUnlock] : [])
                    : getCollectionUnlocksForStory(targetStoryId);
                const collectionUnlockResults = zooEconomy
                    && typeof zooEconomy.unlockCollectionSpecies === 'function'
                    ? unlockCandidates.map((unlock) => zooEconomy.unlockCollectionSpecies(unlock.speciesId, {
                        setGuidePending: true
                    }))
                    : [];
                const unlockedAnyCollectionSpecies = collectionUnlockResults.some((result) => result && result.unlockedNow);
                const shouldDeferFollowupToCollectionReturn = Boolean(
                    targetStoryId === FIRST_CHAPTER_ID
                    && followupStoryId === SECOND_CHAPTER_ID
                    && collectionUnlockResults.some((result) => result && result.unlockedNow && result.speciesId === 'red-panda')
                );
                if ((finishedNormally || followupStoryId)
                    && config.markAsPlayed
                    && zooEconomy
                    && typeof zooEconomy.markStoryPlayed === 'function') {
                    zooEconomy.markStoryPlayed(targetStoryId, true);
                }
                if (storyData && typeof storyData.markCurrentStoryVersionSeen === 'function') {
                    storyData.markCurrentStoryVersionSeen(targetStoryId);
                }
                // 系统解锁检查
                var systemUnlock = globalScope.WynneSystemUnlock || null;
                if (systemUnlock && typeof systemUnlock.checkAndUnlock === 'function') {
                    systemUnlock.checkAndUnlock(targetStoryId);
                }
                if (shouldDeferFollowupToCollectionReturn
                    && zooEconomy
                    && typeof zooEconomy.setPendingReturnStory === 'function') {
                    zooEconomy.setPendingReturnStory(followupStoryId, {
                        pendingGuideSpeciesId: 'red-panda',
                        readyToResume: false
                    });
                }
                if (typeof config.onComplete === 'function') {
                    try {
                        config.onComplete(payload);
                    } catch (error) {
                        // noop
                    }
                }

                if (config.returnTo === 'slot') {
                    showSlotGame();
                    return;
                }

                if (unlockedAnyCollectionSpecies) {
                    showZooHome();
                    return;
                }

                if (followupStoryId) {
                    var chapterLoadingEl = document.getElementById('story-chapter-loading');
                    var chapterFill = document.getElementById('story-chapter-loading-fill');
                    var canPreloadChapter = chapterLoadingEl && storyPlayer
                        && typeof storyPlayer.preloadStoryAssets === 'function';

                    if (canPreloadChapter) {
                        chapterLoadingEl.classList.remove('is-fading');
                        chapterLoadingEl.hidden = false;
                        if (chapterFill) chapterFill.style.width = '0%';

                        var chapterMinDelay = new Promise(function (r) { globalScope.setTimeout(r, 400); });
                        var chapterMaxTimeout = new Promise(function (r) { globalScope.setTimeout(r, 8000); });
                        var chapterPreload = storyPlayer.preloadStoryAssets(followupStoryId, function (loaded, total) {
                            if (chapterFill) {
                                chapterFill.style.width = Math.round((loaded / total) * 100) + '%';
                            }
                        });

                        Promise.all([Promise.race([chapterPreload, chapterMaxTimeout]), chapterMinDelay]).then(function () {
                            chapterLoadingEl.classList.add('is-fading');
                            globalScope.setTimeout(function () {
                                chapterLoadingEl.hidden = true;
                                chapterLoadingEl.classList.remove('is-fading');
                            }, 340);
                            showStory(followupStoryId, { returnTo: 'zoo' });
                        });
                    } else {
                        globalScope.requestAnimationFrame(() => {
                            showStory(followupStoryId, { returnTo: 'zoo' });
                        });
                    }
                    return;
                }

                showZooHome();
            }
        });

        if (!started) {
            return showZooHome();
        }

        const playerState = typeof storyPlayer.getState === 'function'
            ? storyPlayer.getState()
            : null;
        setActiveScreen(
            playerState && playerState.backdropMode === STORY_BACKDROP_MODE_ZOO_HOME
                ? 'story-over-zoo'
                : 'story'
        );
        return true;
    }

    function showSlotGame() {
        if (!zooHomeScreen || !slotGameScreen || !slotGame) {
            return false;
        }

        const snapshot = (typeof slotGame.getSnapshot === 'function')
            ? slotGame.getSnapshot()
            : null;
        const hasUnfinishedRound = Boolean(snapshot && snapshot.initialized && !snapshot.isGameOver);
        const canStartFreshRound = !zooEconomy || typeof zooEconomy.canStartFreshRound !== 'function'
            ? true
            : zooEconomy.canStartFreshRound();

        if (!hasUnfinishedRound && !canStartFreshRound) {
            if (zooHome && typeof zooHome.notify === 'function') {
                zooHome.notify('当前没有可用的盲盒券，先去动物园收取产出吧。', 'warn');
            }
            return false;
        }

        leaveCurrentViews('slot');
        setActiveScreen('slot');

        globalScope.requestAnimationFrame(() => {
            let ready = true;
            if (typeof slotGame.ensureInitialized === 'function') {
                ready = slotGame.ensureInitialized() !== false;
            }

            if (!ready) {
                showZooHome();
                if (zooHome && typeof zooHome.notify === 'function') {
                    zooHome.notify('盲盒券不足，已返回动物园主页。', 'warn');
                }
                return;
            }

            if (typeof slotGame.enterView === 'function') {
                const entered = slotGame.enterView();
                if (entered === false) {
                    showZooHome();
                    if (zooHome && typeof zooHome.notify === 'function') {
                        zooHome.notify('盲盒券不足，已返回动物园主页。', 'warn');
                    }
                    return;
                }
            }

            updateZooHomeFromSlotSnapshot();
        });

        return true;
    }

    function shouldPlayEntryStory() {
        const storyPlayer = getStoryPlayer();
        const storyData = getStoryData();

        if (!storyScreen || !storyPlayer) {
            return false;
        }

        if (!zooEconomy || typeof zooEconomy.hasPlayedStory !== 'function') {
            return true;
        }

        if (!zooEconomy.hasPlayedStory(ENTRY_STORY_ID)) {
            return true;
        }

        if (storyData && typeof storyData.hasSeenCurrentStoryVersion === 'function') {
            return !storyData.hasSeenCurrentStoryVersion(ENTRY_STORY_ID);
        }

        return false;
    }

    function enterPostLoginFlow() {
        if (shouldPlayEntryStory()) {
            return showStory(ENTRY_STORY_ID, {
                markAsPlayed: true,
                returnTo: 'zoo'
            });
        }

        return showZooHome();
    }

    function bindNavigation() {
        if (enterSlotBtn) {
            enterSlotBtn.addEventListener('click', showSlotGame);
        }

        if (slotBackBtn) {
            slotBackBtn.addEventListener('click', showZooHome);
        }

        globalScope.addEventListener('wynne-story-backdrop-change', (event) => {
            if (APP_STATE.currentScreen !== 'story') {
                return;
            }

            const detail = event && event.detail ? event.detail : null;
            setActiveScreen(
                detail && detail.backdropMode === STORY_BACKDROP_MODE_ZOO_HOME
                    ? 'story-over-zoo'
                    : 'story'
            );
        });
    }

    function init() {
        if (APP_STATE.initialized) {
            return;
        }

        if (zooHome && typeof zooHome.init === 'function') {
            zooHome.init();
        }
        const zooCollection = getZooCollection();
        if (zooCollection && typeof zooCollection.init === 'function') {
            zooCollection.init();
        }

        bindNavigation();
        updateZooHomeFromSlotSnapshot();

        // 向后兼容：根据已有 storyFlags 补偿解锁系统
        var systemUnlockMgr = globalScope.WynneSystemUnlock || null;
        if (systemUnlockMgr && typeof systemUnlockMgr.syncFromStoryFlags === 'function') {
            systemUnlockMgr.syncFromStoryFlags();
        }

        showZooHome();
        APP_STATE.initialized = true;
    }

    init();

    globalScope.WynneZooAppShell = {
        showStory,
        showZooHome,
        showCollection,
        showSlotGame,
        enterPostLoginFlow,
        getEntryStoryId() {
            if (!shouldPlayEntryStory()) return '';
            var followup = resolveFollowupStoryId(ENTRY_STORY_ID);
            return followup || ENTRY_STORY_ID;
        },
        getState() {
            return { ...APP_STATE };
        }
    };

    if (globalScope.WynneRegistry) {
        globalScope.WynneRegistry.register('WynneZooAppShell', globalScope.WynneZooAppShell);
    }
}(window));
