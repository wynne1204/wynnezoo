(function initStoryData(globalScope) {
    'use strict';

    const schema = globalScope.WynneStorySchema || null;
    if (!schema) {
        return;
    }

    const GENERATED_SCRIPT_PATH = 'js/story/story-generated-data.js';
    const GENERATED_POLL_MS = 3000;
    const STORY_VERSION_STORAGE_PREFIX = 'wynnesZoo.storyVersionSeen.';

    const builtinProject = typeof schema.createPrologueProject === 'function'
        ? schema.createPrologueProject()
        : schema.createSampleProject();

    let importedRegistry = {};
    let registry = {};
    let importedMeta = {};
    let importedMetaSignature = '';
    let pollTimer = 0;

    function normalizeStoryId(storyId) {
        return String(storyId || '').trim();
    }

    function getStoryVersionStorageKey(storyId) {
        const targetId = normalizeStoryId(storyId);
        return targetId
            ? `${STORY_VERSION_STORAGE_PREFIX}${encodeURIComponent(targetId)}`
            : '';
    }

    function normalizeImportedStories(rawStories) {
        if (!rawStories || typeof rawStories !== 'object') {
            return {};
        }

        const normalized = {};
        Object.keys(rawStories).forEach((storyId) => {
            try {
                const project = schema.normalizeProject(rawStories[storyId]);
                normalized[project.storyId || storyId] = project;
            } catch (error) {
                // noop
            }
        });
        return normalized;
    }

    function rebuildRegistry() {
        const nextRegistry = {
            [builtinProject.storyId]: builtinProject,
            ...importedRegistry
        };

        registry = nextRegistry;
    }

    function emitStoryDataUpdated() {
        if (typeof globalScope.CustomEvent !== 'function' || typeof globalScope.dispatchEvent !== 'function') {
            return;
        }

        try {
            globalScope.dispatchEvent(new globalScope.CustomEvent('wynne-story-data-updated', {
                detail: {
                    storyIds: Object.keys(registry),
                    importedMeta: { ...importedMeta }
                }
            }));
        } catch (error) {
            // noop
        }
    }

    function applyImportedStories(rawStories, rawMeta) {
        const nextImportedRegistry = normalizeImportedStories(rawStories);
        const nextImportedMeta = rawMeta && typeof rawMeta === 'object'
            ? { ...rawMeta }
            : {};
        const nextMetaSignature = JSON.stringify(rawMeta || {});
        const hasChanged = JSON.stringify(nextImportedRegistry) !== JSON.stringify(importedRegistry)
            || nextMetaSignature !== importedMetaSignature;

        importedRegistry = nextImportedRegistry;
        importedMeta = nextImportedMeta;
        importedMetaSignature = nextMetaSignature;
        rebuildRegistry();

        if (hasChanged) {
            emitStoryDataUpdated();
        }
    }

    function readImportedStoriesFromWindow() {
        applyImportedStories(
            globalScope.WynneImportedStories,
            globalScope.WynneImportedStoryMeta
        );
    }

    function loadGeneratedStories() {
        const script = document.createElement('script');
        script.src = `${GENERATED_SCRIPT_PATH}?v=${Date.now()}`;
        script.async = true;

        script.addEventListener('load', () => {
            readImportedStoriesFromWindow();
            script.remove();
        });

        script.addEventListener('error', () => {
            script.remove();
        });

        document.head.appendChild(script);
    }

    function startGeneratedStoryPolling() {
        if (!document || !document.head) {
            return;
        }

        readImportedStoriesFromWindow();
        loadGeneratedStories();

        if (pollTimer) {
            globalScope.clearInterval(pollTimer);
        }

        pollTimer = globalScope.setInterval(() => {
            loadGeneratedStories();
        }, GENERATED_POLL_MS);
    }

    readImportedStoriesFromWindow();
    rebuildRegistry();
    startGeneratedStoryPolling();

    globalScope.WynneStoryData = {
        getStory(storyId) {
            const targetId = normalizeStoryId(storyId);
            return registry[targetId] || null;
        },
        hasStory(storyId) {
            return Boolean(this.getStory(storyId));
        },
        getAllStoryIds() {
            return Object.keys(registry);
        },
        getNextStoryId(storyId) {
            const targetId = normalizeStoryId(storyId);
            if (!targetId) {
                return '';
            }

            const storyIds = Object.keys(registry);
            const currentIndex = storyIds.indexOf(targetId);
            if (currentIndex < 0 || currentIndex >= (storyIds.length - 1)) {
                return '';
            }

            return normalizeStoryId(storyIds[currentIndex + 1]);
        },
        getImportedMeta() {
            return { ...importedMeta };
        },
        getStoryVersion(storyId) {
            const targetId = normalizeStoryId(storyId);
            if (!targetId || !importedRegistry[targetId]) {
                return '';
            }

            return importedMeta && importedMeta.generatedAt
                ? String(importedMeta.generatedAt).trim()
                : '';
        },
        hasSeenCurrentStoryVersion(storyId) {
            const targetId = normalizeStoryId(storyId);
            const currentVersion = this.getStoryVersion(targetId);

            if (!targetId || !currentVersion) {
                return true;
            }

            try {
                return globalScope.localStorage.getItem(getStoryVersionStorageKey(targetId)) === currentVersion;
            } catch (error) {
                return false;
            }
        },
        markCurrentStoryVersionSeen(storyId) {
            const targetId = normalizeStoryId(storyId);
            const storageKey = getStoryVersionStorageKey(targetId);
            const currentVersion = this.getStoryVersion(targetId);

            if (!targetId || !storageKey) {
                return false;
            }

            try {
                if (currentVersion) {
                    globalScope.localStorage.setItem(storageKey, currentVersion);
                } else {
                    globalScope.localStorage.removeItem(storageKey);
                }
                return true;
            } catch (error) {
                return false;
            }
        }
    };

    if (globalScope.WynneRegistry) {
        globalScope.WynneRegistry.register('WynneStoryData', globalScope.WynneStoryData);
    }
}(window));
