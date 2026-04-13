(function initAppShell(globalScope) {
    'use strict';

    const storyScreen = document.getElementById('story-screen');
    const zooHomeScreen = document.getElementById('zoo-home-screen');
    const slotGameScreen = document.getElementById('slot-game-screen');
    const collectionScreen = document.getElementById('collection-screen');
    const enterSlotBtn = document.getElementById('enter-slot-btn');
    const slotBackBtn = document.getElementById('slot-back-btn');

    const R = globalScope.WynneRegistry || null;

    // Lazy module getters - avoid capturing stale null references at load time
    function getZooHome() {
        return (R && R.get('ZooHomeModule')) || globalScope.ZooHomeModule || null;
    }
    function getSlotGame() {
        return (R && R.get('WynneZooSlotGame')) || globalScope.WynneZooSlotGame || null;
    }
    function getZooEconomy() {
        return (R && R.get('WynneZooEconomy')) || globalScope.WynneZooEconomy || null;
    }

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
        return (getSlotGame() && typeof getSlotGame().getSnapshot === 'function')
            ? getSlotGame().getSnapshot()
            : null;
    }

    function updateZooHomeFromSlotSnapshot() {
        if (!getZooHome() || typeof getZooHome().setSlotSnapshot !== 'function') {
            return;
        }

        getZooHome().setSlotSnapshot(getSlotSnapshot());
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

    const MAIN_STORY_SEQUENCE = {
        'prologue': '第一章',
        '第一章': '第二章',
        '第二章': '第三章'
    };

    function resolveFollowupStoryId(storyId) {
        const targetId = String(storyId || '').trim();
        const nextId = MAIN_STORY_SEQUENCE[targetId] || '';
        if (nextId && hasPlayableStory(nextId)) {
            return nextId;
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
        return getZooEconomy() && typeof getZooEconomy().getPendingReturnStory === 'function'
            ? getZooEconomy().getPendingReturnStory()
            : null;
    }

    function maybePlayReadyPendingReturnStory() {
        const pendingReturnStory = getPendingReturnStory();
        const pendingReturnStoryId = String(pendingReturnStory && pendingReturnStory.pendingReturnStoryId || '').trim();
        if (!pendingReturnStoryId || !pendingReturnStory.readyToResume || !hasPlayableStory(pendingReturnStoryId)) {
            return false;
        }

        if (!getZooEconomy() || typeof getZooEconomy().consumePendingReturnStory !== 'function') {
            return false;
        }

        const consumedStoryId = String(getZooEconomy().consumePendingReturnStory() || '').trim();
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

        if (getZooHome() && typeof getZooHome().onShow === 'function') {
            getZooHome().onShow(getSlotSnapshot());
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
            && getZooHome() && typeof getZooHome().onHide === 'function') {
            getZooHome().onHide();
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
        if (nextScreen !== 'slot' && getSlotGame() && typeof getSlotGame().leaveView === 'function') {
            getSlotGame().leaveView();
        }

        const storyPlayer = getStoryPlayer();
        if (nextScreen !== 'story' && storyPlayer && typeof storyPlayer.leaveView === 'function') {
            storyPlayer.leaveView();
        }

        if (nextScreen !== 'zoo'
            && (APP_STATE.currentScreen === 'zoo' || APP_STATE.storyBackdropMode === STORY_BACKDROP_MODE_ZOO_HOME)
            && getZooHome() && typeof getZooHome().onHide === 'function') {
            getZooHome().onHide();
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

        if (getZooHome() && typeof getZooHome().onShow === 'function') {
            getZooHome().onShow(getSlotSnapshot());
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
        zooCollection.show(getZooEconomy() && typeof getZooEconomy().getSnapshot === 'function'
            ? getZooEconomy().getSnapshot()
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
                const collectionUnlockResults = getZooEconomy()
                    && typeof getZooEconomy().unlockCollectionSpecies === 'function'
                    ? unlockCandidates.map((unlock) => getZooEconomy().unlockCollectionSpecies(unlock.speciesId, {
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
                    && getZooEconomy()
                    && typeof getZooEconomy().markStoryPlayed === 'function') {
                    getZooEconomy().markStoryPlayed(targetStoryId, true);
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
                    && getZooEconomy()
                    && typeof getZooEconomy().setPendingReturnStory === 'function') {
                    getZooEconomy().setPendingReturnStory(followupStoryId, {
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
        if (!zooHomeScreen || !slotGameScreen || !getSlotGame()) {
            return false;
        }

        const snapshot = (typeof getSlotGame().getSnapshot === 'function')
            ? getSlotGame().getSnapshot()
            : null;
        const hasUnfinishedRound = Boolean(snapshot && snapshot.initialized && !snapshot.isGameOver);
        const canStartFreshRound = !getZooEconomy() || typeof getZooEconomy().canStartFreshRound !== 'function'
            ? true
            : getZooEconomy().canStartFreshRound();

        if (!hasUnfinishedRound && !canStartFreshRound) {
            if (getZooHome() && typeof getZooHome().notify === 'function') {
                getZooHome().notify('当前没有可用的盲盒券，先去动物园收取产出吧。', 'warn');
            }
            return false;
        }

        leaveCurrentViews('slot');
        setActiveScreen('slot');

        globalScope.requestAnimationFrame(() => {
            let ready = true;
            if (typeof getSlotGame().ensureInitialized === 'function') {
                ready = getSlotGame().ensureInitialized() !== false;
            }

            if (!ready) {
                showZooHome();
                if (getZooHome() && typeof getZooHome().notify === 'function') {
                    getZooHome().notify('盲盒券不足，已返回动物园主页。', 'warn');
                }
                return;
            }

            if (typeof getSlotGame().enterView === 'function') {
                const entered = getSlotGame().enterView();
                if (entered === false) {
                    showZooHome();
                    if (getZooHome() && typeof getZooHome().notify === 'function') {
                        getZooHome().notify('盲盒券不足，已返回动物园主页。', 'warn');
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

        if (!getZooEconomy() || typeof getZooEconomy().hasPlayedStory !== 'function') {
            return true;
        }

        if (!getZooEconomy().hasPlayedStory(ENTRY_STORY_ID)) {
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

        if (getZooHome() && typeof getZooHome().init === 'function') {
            getZooHome().init();
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
