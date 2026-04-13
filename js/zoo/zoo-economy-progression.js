(function initZooEconomyProgression(globalScope) {
    'use strict';

    function create(deps = {}) {
        const collectionSpeciesDefinitions = Array.isArray(deps.collectionSpeciesDefinitions)
            ? deps.collectionSpeciesDefinitions
            : [];
        const collectionSpeciesIdSet = deps.collectionSpeciesIdSet instanceof Set
            ? deps.collectionSpeciesIdSet
            : new Set(collectionSpeciesDefinitions.map((species) => species.id));
        const emitChange = typeof deps.emitChange === 'function'
            ? deps.emitChange
            : function fallbackEmitChange() {};
        const getRuntimeState = typeof deps.getRuntimeState === 'function'
            ? deps.getRuntimeState
            : function fallbackGetRuntimeState() { return null; };
        const normalizeStoryFlags = typeof deps.normalizeStoryFlags === 'function'
            ? deps.normalizeStoryFlags
            : function fallbackNormalizeStoryFlags(value) { return value || {}; };
        const normalizeStoryId = typeof deps.normalizeStoryId === 'function'
            ? deps.normalizeStoryId
            : function fallbackNormalizeStoryId(value) { return String(value || '').trim(); };
        const syncAll = typeof deps.syncAll === 'function'
            ? deps.syncAll
            : function fallbackSyncAll() { return false; };

        function normalizeCollectionSpeciesId(speciesId) {
            return String(speciesId || '').trim().toLowerCase().slice(0, 64);
        }

        function getCollectionSpeciesDefinition(speciesId) {
            const normalizedId = normalizeCollectionSpeciesId(speciesId);
            return collectionSpeciesDefinitions.find((species) => species.id === normalizedId) || null;
        }

        function normalizeCollectionUnlockMap(rawMap) {
            if (!rawMap || typeof rawMap !== 'object') {
                return {};
            }

            return Object.keys(rawMap).reduce((result, key) => {
                const normalizedKey = normalizeCollectionSpeciesId(key);
                if (!normalizedKey || !collectionSpeciesIdSet.has(normalizedKey)) {
                    return result;
                }

                const rawValue = Number(rawMap[key]);
                if (!Number.isFinite(rawValue) || rawValue <= 0) {
                    return result;
                }

                result[normalizedKey] = Math.max(0, Math.floor(rawValue));
                return result;
            }, {});
        }

        function normalizeCollectionRewardClaimMap(rawMap) {
            if (!rawMap || typeof rawMap !== 'object') {
                return {};
            }

            return Object.keys(rawMap).reduce((result, key) => {
                const normalizedKey = normalizeCollectionSpeciesId(key);
                if (!normalizedKey || !collectionSpeciesIdSet.has(normalizedKey) || !rawMap[key]) {
                    return result;
                }

                result[normalizedKey] = true;
                return result;
            }, {});
        }

        function normalizeCollectionState(rawCollection) {
            const unlockedAtBySpeciesId = normalizeCollectionUnlockMap(rawCollection && rawCollection.unlockedAtBySpeciesId);
            const pendingGuideSpeciesId = normalizeCollectionSpeciesId(rawCollection && rawCollection.pendingGuideSpeciesId);
            const lastViewedSpeciesId = normalizeCollectionSpeciesId(rawCollection && rawCollection.lastViewedSpeciesId);
            const pendingGuideRewardSpeciesId = normalizeCollectionSpeciesId(rawCollection && rawCollection.pendingGuideRewardSpeciesId);
            const guideRewardClaimedBySpeciesId = normalizeCollectionRewardClaimMap(rawCollection && rawCollection.guideRewardClaimedBySpeciesId);

            return {
                unlockedAtBySpeciesId,
                pendingGuideSpeciesId: collectionSpeciesIdSet.has(pendingGuideSpeciesId) ? pendingGuideSpeciesId : '',
                lastViewedSpeciesId: collectionSpeciesIdSet.has(lastViewedSpeciesId) ? lastViewedSpeciesId : '',
                pendingGuideRewardSpeciesId: collectionSpeciesIdSet.has(pendingGuideRewardSpeciesId) ? pendingGuideRewardSpeciesId : '',
                guideRewardClaimedBySpeciesId
            };
        }

        function normalizePendingReturnStoryFlow(rawFlow) {
            const flow = rawFlow && typeof rawFlow === 'object' ? rawFlow : {};
            const pendingReturnStoryId = normalizeStoryId(flow.pendingReturnStoryId);
            const pendingGuideSpeciesId = normalizeCollectionSpeciesId(flow.pendingGuideSpeciesId);

            return {
                pendingReturnStoryId,
                pendingGuideSpeciesId,
                readyToResume: Boolean(pendingReturnStoryId && flow.readyToResume)
            };
        }

        function ensureCollectionState() {
            const runtimeState = getRuntimeState();
            if (!runtimeState.collection || typeof runtimeState.collection !== 'object') {
                runtimeState.collection = normalizeCollectionState(null);
            }
            if (!runtimeState.collection.unlockedAtBySpeciesId || typeof runtimeState.collection.unlockedAtBySpeciesId !== 'object') {
                runtimeState.collection.unlockedAtBySpeciesId = {};
            }
            if (!runtimeState.collection.guideRewardClaimedBySpeciesId || typeof runtimeState.collection.guideRewardClaimedBySpeciesId !== 'object') {
                runtimeState.collection.guideRewardClaimedBySpeciesId = {};
            }
            return runtimeState.collection;
        }

        function ensureMetaState() {
            const runtimeState = getRuntimeState();
            if (!runtimeState.meta || typeof runtimeState.meta !== 'object') {
                runtimeState.meta = {};
            }
            return runtimeState.meta;
        }

        function syncCollectionUnlocksFromPlayedStories(nowTs = Date.now()) {
            const runtimeState = getRuntimeState();
            const collectionState = ensureCollectionState();
            const storyData = globalScope.WynneStoryData || null;
            if (!storyData || typeof storyData.getStory !== 'function') {
                return false;
            }

            const storyFlags = normalizeStoryFlags(runtimeState.meta && runtimeState.meta.storyFlags);
            const fallbackUnlockedAt = Math.max(1, Math.floor(Number(nowTs) || Date.now()));
            let changed = false;

            Object.keys(storyFlags).forEach((storyId) => {
                if (!storyFlags[storyId]) {
                    return;
                }

                const story = storyData.getStory(storyId);
                const beats = story && Array.isArray(story.beats) ? story.beats : [];
                beats.forEach((beat) => {
                    const unlock = beat && beat.collectionUnlock && typeof beat.collectionUnlock === 'object'
                        ? beat.collectionUnlock
                        : null;
                    const speciesId = normalizeCollectionSpeciesId(unlock && unlock.speciesId);
                    if (!speciesId || !collectionSpeciesIdSet.has(speciesId)) {
                        return;
                    }

                    const existingUnlockedAt = Math.max(
                        0,
                        Math.floor(Number(collectionState.unlockedAtBySpeciesId[speciesId]) || 0)
                    );
                    if (existingUnlockedAt > 0) {
                        return;
                    }

                    collectionState.unlockedAtBySpeciesId[speciesId] = fallbackUnlockedAt;
                    changed = true;
                });
            });

            return changed;
        }

        function hasPlayedStory(storyId) {
            syncAll(Date.now());
            const runtimeState = getRuntimeState();
            const normalizedStoryId = normalizeStoryId(storyId);
            const storyFlags = normalizeStoryFlags(runtimeState.meta && runtimeState.meta.storyFlags);
            return Boolean(normalizedStoryId && storyFlags[normalizedStoryId]);
        }

        function markStoryPlayed(storyId, played = true) {
            syncAll(Date.now());
            const meta = ensureMetaState();
            const normalizedStoryId = normalizeStoryId(storyId);
            if (!normalizedStoryId) {
                return false;
            }

            meta.storyFlags = normalizeStoryFlags(meta.storyFlags);
            if (meta.storyFlags[normalizedStoryId] === Boolean(played)) {
                return true;
            }

            meta.storyFlags[normalizedStoryId] = Boolean(played);
            emitChange('story-flag');
            return true;
        }

        function unlockCollectionSpecies(speciesId, options = {}) {
            syncAll(Date.now());
            const runtimeState = getRuntimeState();
            const normalizedSpeciesId = normalizeCollectionSpeciesId(speciesId);
            const definition = getCollectionSpeciesDefinition(normalizedSpeciesId);
            if (!definition) {
                return {
                    ok: false,
                    code: 'unknown-species',
                    speciesId: normalizedSpeciesId,
                    message: '\u672a\u627e\u5230\u5bf9\u5e94\u7684\u56fe\u9274\u7269\u79cd\u3002'
                };
            }

            const collectionState = ensureCollectionState();
            const existingUnlockedAt = Math.max(
                0,
                Math.floor(Number(collectionState.unlockedAtBySpeciesId[normalizedSpeciesId]) || 0)
            );

            if (existingUnlockedAt > 0) {
                return {
                    ok: true,
                    code: 'already-unlocked',
                    speciesId: normalizedSpeciesId,
                    speciesName: definition.name,
                    unlockedAt: existingUnlockedAt,
                    unlockedNow: false,
                    pendingGuideSpeciesId: collectionState.pendingGuideSpeciesId || '',
                    message: `${definition.name}\u5df2\u7ecf\u89e3\u9501\u3002`
                };
            }

            const unlockedAt = Math.max(0, Math.floor(Number(options.unlockedAt) || Date.now()));
            collectionState.unlockedAtBySpeciesId[normalizedSpeciesId] = unlockedAt;
            collectionState.lastViewedSpeciesId = '';

            if (options.setGuidePending !== false) {
                collectionState.pendingGuideSpeciesId = normalizedSpeciesId;
            }

            emitChange('collection-unlock');
            return {
                ok: true,
                code: 'success',
                speciesId: normalizedSpeciesId,
                speciesName: definition.name,
                unlockedAt,
                unlockedNow: true,
                pendingGuideSpeciesId: collectionState.pendingGuideSpeciesId || '',
                message: `${definition.name}\u56fe\u9274\u5df2\u89e3\u9501\u3002`
            };
        }

        function clearCollectionGuide(speciesId) {
            syncAll(Date.now());
            const collectionState = ensureCollectionState();
            const normalizedSpeciesId = normalizeCollectionSpeciesId(speciesId);
            const currentPendingSpeciesId = normalizeCollectionSpeciesId(collectionState.pendingGuideSpeciesId);
            if (normalizedSpeciesId && currentPendingSpeciesId && normalizedSpeciesId !== currentPendingSpeciesId) {
                return false;
            }
            if (!currentPendingSpeciesId) {
                return false;
            }

            collectionState.pendingGuideSpeciesId = '';
            emitChange('collection-guide-clear');
            return true;
        }

        function markCollectionSpeciesViewed(speciesId) {
            syncAll(Date.now());
            const normalizedSpeciesId = normalizeCollectionSpeciesId(speciesId);
            if (!getCollectionSpeciesDefinition(normalizedSpeciesId)) {
                return false;
            }

            const collectionState = ensureCollectionState();
            collectionState.lastViewedSpeciesId = normalizedSpeciesId;
            emitChange('collection-view');
            return true;
        }

        function queueCollectionGuideReward(speciesId) {
            syncAll(Date.now());
            const normalizedSpeciesId = normalizeCollectionSpeciesId(speciesId);
            if (!getCollectionSpeciesDefinition(normalizedSpeciesId) || normalizedSpeciesId !== 'red-panda') {
                return false;
            }

            const collectionState = ensureCollectionState();
            if (collectionState.guideRewardClaimedBySpeciesId[normalizedSpeciesId]) {
                return false;
            }
            if (collectionState.pendingGuideRewardSpeciesId === normalizedSpeciesId) {
                return true;
            }

            collectionState.pendingGuideRewardSpeciesId = normalizedSpeciesId;
            emitChange('collection-guide-reward-pending');
            return true;
        }

        function claimCollectionGuideReward(speciesId = '') {
            syncAll(Date.now());
            const collectionState = ensureCollectionState();
            const normalizedSpeciesId = normalizeCollectionSpeciesId(speciesId);
            const pendingRewardSpeciesId = normalizeCollectionSpeciesId(collectionState.pendingGuideRewardSpeciesId);
            const targetSpeciesId = pendingRewardSpeciesId || normalizedSpeciesId;
            if (!getCollectionSpeciesDefinition(targetSpeciesId)) {
                return false;
            }
            if (pendingRewardSpeciesId && normalizedSpeciesId && pendingRewardSpeciesId !== normalizedSpeciesId) {
                return false;
            }

            collectionState.pendingGuideRewardSpeciesId = '';
            collectionState.guideRewardClaimedBySpeciesId[targetSpeciesId] = true;
            emitChange('collection-guide-reward-claim');
            return true;
        }

        function getPendingReturnStory() {
            syncAll(Date.now());
            const runtimeState = getRuntimeState();
            const storyFlow = runtimeState.meta && runtimeState.meta.storyFlow
                ? normalizePendingReturnStoryFlow(runtimeState.meta.storyFlow)
                : normalizePendingReturnStoryFlow(null);
            return storyFlow.pendingReturnStoryId ? { ...storyFlow } : null;
        }

        function setPendingReturnStory(storyId, options = {}) {
            syncAll(Date.now());
            const meta = ensureMetaState();
            const pendingReturnStoryId = normalizeStoryId(storyId);
            const pendingGuideSpeciesId = normalizeCollectionSpeciesId(options.pendingGuideSpeciesId || options.speciesId);

            meta.storyFlow = {
                pendingReturnStoryId,
                pendingGuideSpeciesId,
                readyToResume: Boolean(pendingReturnStoryId && options.readyToResume)
            };
            emitChange('pending-return-story');
            return getPendingReturnStory();
        }

        function markPendingReturnStoryReady(speciesId = '') {
            syncAll(Date.now());
            const meta = ensureMetaState();
            const storyFlow = normalizePendingReturnStoryFlow(meta.storyFlow);
            if (!storyFlow.pendingReturnStoryId) {
                return false;
            }

            const normalizedSpeciesId = normalizeCollectionSpeciesId(speciesId);
            if (storyFlow.pendingGuideSpeciesId && normalizedSpeciesId && storyFlow.pendingGuideSpeciesId !== normalizedSpeciesId) {
                return false;
            }
            if (storyFlow.readyToResume) {
                return true;
            }

            meta.storyFlow = {
                ...storyFlow,
                readyToResume: true
            };
            emitChange('pending-return-story-ready');
            return true;
        }

        function consumePendingReturnStory() {
            syncAll(Date.now());
            const meta = ensureMetaState();
            const storyFlow = normalizePendingReturnStoryFlow(meta.storyFlow);
            if (!storyFlow.pendingReturnStoryId || !storyFlow.readyToResume) {
                return '';
            }

            meta.storyFlow = normalizePendingReturnStoryFlow(null);
            emitChange('pending-return-story-consumed');
            return storyFlow.pendingReturnStoryId;
        }

        return {
            claimCollectionGuideReward,
            clearCollectionGuide,
            consumePendingReturnStory,
            getCollectionSpeciesDefinition,
            getPendingReturnStory,
            hasPlayedStory,
            markCollectionSpeciesViewed,
            markPendingReturnStoryReady,
            markStoryPlayed,
            normalizeCollectionRewardClaimMap,
            normalizeCollectionSpeciesId,
            normalizeCollectionState,
            normalizeCollectionUnlockMap,
            normalizePendingReturnStoryFlow,
            queueCollectionGuideReward,
            setPendingReturnStory,
            syncCollectionUnlocksFromPlayedStories,
            unlockCollectionSpecies
        };
    }

    globalScope.WynneZooEconomyProgression = {
        create
    };
}(window));
