(function initZooEconomySnapshot(globalScope) {
    'use strict';

    function create(deps = {}) {
        const balance = deps.balance || null;
        const collectionSpeciesDefinitions = Array.isArray(deps.collectionSpeciesDefinitions)
            ? deps.collectionSpeciesDefinitions
            : [];
        const createHabitatSnapshot = typeof deps.createHabitatSnapshot === 'function'
            ? deps.createHabitatSnapshot
            : function fallbackCreateHabitatSnapshot() {
                return null;
            };
        const getActiveUserId = typeof deps.getActiveUserId === 'function'
            ? deps.getActiveUserId
            : function fallbackGetActiveUserId() {
                return '';
            };
        const getRuntimeState = typeof deps.getRuntimeState === 'function'
            ? deps.getRuntimeState
            : function fallbackGetRuntimeState() {
                return null;
            };
        const getSelectedHabitat = typeof deps.getSelectedHabitat === 'function'
            ? deps.getSelectedHabitat
            : function fallbackGetSelectedHabitat() {
                return null;
            };
        const normalizeCollectionState = typeof deps.normalizeCollectionState === 'function'
            ? deps.normalizeCollectionState
            : function fallbackNormalizeCollectionState(value) {
                return value || {};
            };
        const normalizeConstructionFlow = typeof deps.normalizeConstructionFlow === 'function'
            ? deps.normalizeConstructionFlow
            : function fallbackNormalizeConstructionFlow(value) {
                return value || {};
            };
        const normalizePendingReturnStoryFlow = typeof deps.normalizePendingReturnStoryFlow === 'function'
            ? deps.normalizePendingReturnStoryFlow
            : function fallbackNormalizePendingReturnStoryFlow(value) {
                return value || {};
            };
        const normalizeStoryFlags = typeof deps.normalizeStoryFlags === 'function'
            ? deps.normalizeStoryFlags
            : function fallbackNormalizeStoryFlags(value) {
                return value || {};
            };
        const redPandaHabitatId = String(deps.redPandaHabitatId || '').trim();
        const redPandaPostBuildStoryId = String(deps.redPandaPostBuildStoryId || '').trim();
        const redPandaHabitatLevel1ImageSrc = String(deps.redPandaHabitatLevel1ImageSrc || '');
        const redPandaHabitatLevel1PostBuildImageSrc = String(deps.redPandaHabitatLevel1PostBuildImageSrc || '');
        const syncAll = typeof deps.syncAll === 'function'
            ? deps.syncAll
            : function fallbackSyncAll() {
                return false;
            };

        function createAnimalSnapshot(animal) {
            return {
                ...animal,
                hunger: Math.round(balance.clampNumber(animal.hunger, 0, 100)),
                thirst: Math.round(balance.clampNumber(animal.thirst, 0, 100)),
                hungerLabel: balance.getNeedLabel(animal.hunger),
                thirstLabel: balance.getNeedLabel(animal.thirst)
            };
        }

        function getHabitatStageAssets(definition, storyFlags) {
            const stageAssets = definition && definition.stageAssets && typeof definition.stageAssets === 'object'
                ? { ...definition.stageAssets }
                : {};

            if (definition && definition.id === redPandaHabitatId) {
                stageAssets.level1 = storyFlags && storyFlags[redPandaPostBuildStoryId]
                    ? redPandaHabitatLevel1PostBuildImageSrc
                    : redPandaHabitatLevel1ImageSrc;
            }

            return stageAssets;
        }

        function getHabitatSceneAsset(definition, stageAssets) {
            if (definition && definition.id === redPandaHabitatId && stageAssets.level1) {
                return stageAssets.level1;
            }

            return definition && definition.sceneAsset
                ? definition.sceneAsset
                : '';
        }

        function createCollectionSnapshot() {
            const runtimeState = getRuntimeState();
            const collectionState = normalizeCollectionState(runtimeState && runtimeState.collection);
            const pendingGuideSpeciesId = collectionState.pendingGuideSpeciesId;
            const lastViewedSpeciesId = collectionState.lastViewedSpeciesId;
            const species = collectionSpeciesDefinitions.map((definition, index) => {
                const unlockedAt = collectionState.unlockedAtBySpeciesId[definition.id] || 0;
                return {
                    ...definition,
                    index,
                    pageIndex: Math.floor(index / 9),
                    unlocked: unlockedAt > 0,
                    unlockedAt,
                    isPendingGuide: pendingGuideSpeciesId === definition.id,
                    isLastViewed: lastViewedSpeciesId === definition.id
                };
            });

            return {
                species,
                totalSpecies: species.length,
                pageSize: 9,
                totalPages: Math.max(1, Math.ceil(species.length / 9)),
                unlockedCount: species.filter((item) => item.unlocked).length,
                unlockedAtBySpeciesId: { ...collectionState.unlockedAtBySpeciesId },
                pendingGuideSpeciesId,
                lastViewedSpeciesId,
                pendingGuideRewardSpeciesId: collectionState.pendingGuideRewardSpeciesId || '',
                guideRewardClaimedBySpeciesId: { ...(collectionState.guideRewardClaimedBySpeciesId || {}) }
            };
        }

        function getSnapshot() {
            syncAll(Date.now());
            const runtimeState = getRuntimeState();
            const selectedHabitat = createHabitatSnapshot(getSelectedHabitat());
            const habitats = runtimeState.habitats.map(createHabitatSnapshot);
            const collection = createCollectionSnapshot();

            return {
                user: {
                    id: getActiveUserId(),
                    loggedIn: Boolean(getActiveUserId())
                },
                resources: { ...runtimeState.resources },
                ui: { ...runtimeState.ui },
                storyFlags: { ...normalizeStoryFlags(runtimeState.meta && runtimeState.meta.storyFlags) },
                unlockedSystems: JSON.parse(JSON.stringify(runtimeState.meta && runtimeState.meta.unlockedSystems || {})),
                slotTutorialSeen: Boolean(runtimeState.meta && runtimeState.meta.slotTutorialSeen),
                slotTheme: balance ? { ...balance.SLOT_THEME } : null,
                collection,
                habitats,
                selectedHabitat,
                habitat: selectedHabitat,
                storyFlow: { ...(runtimeState.meta && runtimeState.meta.storyFlow || normalizePendingReturnStoryFlow(null)) },
                constructionFlow: { ...(runtimeState.meta && runtimeState.meta.constructionFlow || normalizeConstructionFlow(null)) },
                lastSettlement: runtimeState.meta && runtimeState.meta.lastSettlement
                    ? { ...runtimeState.meta.lastSettlement }
                    : null
            };
        }

        return {
            createAnimalSnapshot,
            createCollectionSnapshot,
            getHabitatSceneAsset,
            getHabitatStageAssets,
            getSnapshot
        };
    }

    globalScope.WynneZooEconomySnapshot = {
        create
    };
}(window));
