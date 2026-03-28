(function initZooCollection(globalScope) {
    'use strict';

    const PAGE_SIZE = 9;
    const GUIDE_HAND_IMAGE_SRC = './Texture/UI/tutorial_hand.png';
    const COLLECTION_CARD_BACKGROUND_SRC = './Texture/UI/Collection/figma_card_bg.png';
    const COLLECTION_TAG_ASSET_BY_RARITY = Object.freeze({
        '普通': './Texture/UI/Collection/普通标签.png',
        '罕见': './Texture/UI/Collection/罕见标签.png',
        '近危': './Texture/UI/Collection/近危标签.png',
        '濒危': './Texture/UI/Collection/濒危标签.png',
        '野外灭绝': './Texture/UI/Collection/野外灭绝标签.png'
    });
    const COLLECTION_CARD_POSITIONS = Object.freeze([
        { x: 0, y: 0 },
        { x: 326, y: 0 },
        { x: 652, y: 0 },
        { x: 0, y: 469 },
        { x: 326, y: 469 },
        { x: 652, y: 469 },
        { x: 0, y: 938 },
        { x: 326, y: 938 },
        { x: 652, y: 938 }
    ]);

    const refs = {
        screen: null,
        grid: null,
        pageCounters: [],
        progressText: null,
        progressFill: null,
        prevBtn: null,
        nextBtn: null,
        backBtn: null,
        detail: null,
        detailImage: null,
        detailName: null,
        detailDescription: null,
        detailRarity: null,
        detailTagImage: null,
        detailIucn: null,
        detailPopulation: null,
        detailTemperature: null,
        detailSocial: null,
        detailUnlock: null,
    };

    const state = {
        initialized: false,
        currentPage: 0,
        detailSpeciesId: '',
        snapshot: null
    };

    function getEconomy() {
        const economy = globalScope.WynneZooEconomy || null;
        return economy && typeof economy.getSnapshot === 'function'
            ? economy
            : null;
    }

    function getAppShell() {
        return globalScope.WynneZooAppShell || null;
    }

    function escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function cacheDom() {
        refs.screen = document.getElementById('collection-screen');
        refs.grid = refs.screen && refs.screen.querySelector('[data-collection-grid]');
        refs.pageCounters = refs.screen ? Array.from(refs.screen.querySelectorAll('[data-collection-page-counter]')) : [];
        refs.progressText = refs.screen && refs.screen.querySelector('[data-collection-progress-text]');
        refs.progressFill = refs.screen && refs.screen.querySelector('[data-collection-progress-fill]');
        refs.prevBtn = refs.screen && refs.screen.querySelector('[data-collection-prev]');
        refs.nextBtn = refs.screen && refs.screen.querySelector('[data-collection-next]');
        refs.backBtn = document.getElementById('collection-back-btn');
        refs.detail = refs.screen && refs.screen.querySelector('[data-collection-detail]');
        refs.detailImage = refs.screen && refs.screen.querySelector('.cd-figma-portrait-image');
        refs.detailName = refs.screen && refs.screen.querySelector('.cd-figma-title');
        refs.detailDescription = refs.screen && refs.screen.querySelector('.cd-figma-description');
        refs.detailRarity = refs.screen && refs.screen.querySelector('.cd-figma-tag-label');
        refs.detailTagImage = refs.screen && refs.screen.querySelector('.cd-figma-tag-image');
        refs.detailIucn = refs.screen && refs.screen.querySelector('.cd-figma-iucn-text');
        refs.detailPopulation = refs.screen && refs.screen.querySelector('[data-collection-detail-population]');
        refs.detailTemperature = refs.screen && refs.screen.querySelector('[data-collection-detail-temperature]');
        refs.detailSocial = refs.screen && refs.screen.querySelector('[data-collection-detail-social]');
        refs.detailUnlock = refs.screen && refs.screen.querySelector('.cd-figma-unlock-value');
    }

    function getCollectionSnapshot(snapshot = state.snapshot) {
        return snapshot && snapshot.collection && Array.isArray(snapshot.collection.species)
            ? snapshot.collection
            : {
                species: [],
                totalPages: 1,
                totalSpecies: 0,
                unlockedCount: 0,
                pendingGuideSpeciesId: '',
                lastViewedSpeciesId: ''
            };
    }

    function getSpeciesById(speciesId, snapshot = state.snapshot) {
        const normalizedSpeciesId = String(speciesId || '').trim();
        if (!normalizedSpeciesId) {
            return null;
        }

        return getCollectionSnapshot(snapshot).species.find((species) => species.id === normalizedSpeciesId) || null;
    }

    function formatDetailUnlockDate(timestamp) {
        const safeTimestamp = Number(timestamp);
        if (!Number.isFinite(safeTimestamp) || safeTimestamp <= 0) {
            return '未解锁';
        }
        const unlockDate = new Date(safeTimestamp);
        if (Number.isNaN(unlockDate.getTime())) {
            return '未解锁';
        }
        const year = unlockDate.getFullYear();
        const month = `${unlockDate.getMonth() + 1}`.padStart(2, '0');
        const day = `${unlockDate.getDate()}`.padStart(2, '0');
        return `${year}.${month}.${day}`;
    }

    function getRarityTone(rarity) {
        switch (String(rarity || '').trim()) {
        case '罕见':
            return 'uncommon';
        case '近危':
            return 'rare';
        case '濒危':
            return 'epic';
        case '野外灭绝':
            return 'legendary';
        case '普通':
        default:
            return 'common';
        }
    }



    function syncPageForGuide(collection) {
        if (!collection || state.detailSpeciesId) {
            return;
        }

        const pendingGuideSpeciesId = String(collection.pendingGuideSpeciesId || '').trim();
        const guideSpecies = pendingGuideSpeciesId
            ? collection.species.find((species) => species.id === pendingGuideSpeciesId) || null
            : null;

        if (guideSpecies) {
            state.currentPage = guideSpecies.pageIndex;
            return;
        }

        const maxPageIndex = Math.max(0, Number(collection.totalPages || 1) - 1);
        state.currentPage = Math.max(0, Math.min(maxPageIndex, state.currentPage));
    }

    function updateBackButton() {
        if (!refs.backBtn) {
            return;
        }

        const label = state.detailSpeciesId ? '返回图鉴' : '返回主页';
        refs.backBtn.setAttribute('aria-label', label);
        refs.backBtn.setAttribute('title', label);
        const accessibleLabel = refs.backBtn.querySelector('.collection-back-accessible');
        if (accessibleLabel) {
            accessibleLabel.textContent = label;
        }
    }

    function buildGuideMarkup(species) {
        if (!species || !species.isPendingGuide || !species.unlocked) {
            return '';
        }

        return `
            <div class="collection-card-guide is-hand-only" aria-hidden="true">
                <img src="${escapeHtml(GUIDE_HAND_IMAGE_SRC)}" alt="">
            </div>
        `;
    }

    function getDisplayTagLabel(rarity) {
        return String(rarity || '').trim() === '野外灭绝'
            ? '野外\n灭绝'
            : String(rarity || '').trim();
    }

    function buildCardMarkup(species) {
        const rarityText = String(species.rarity || '普通').trim() || '普通';
        const displayName = species.name;
        const displayRarity = rarityText;
        const displayTagLabel = getDisplayTagLabel(displayRarity);
        const rarityTone = getRarityTone(rarityText);
        const displayRarityTone = rarityTone;
        const cardPosition = COLLECTION_CARD_POSITIONS[species.orderIndex] || COLLECTION_CARD_POSITIONS[0];
        const tagImageSrc = COLLECTION_TAG_ASSET_BY_RARITY[rarityText] || COLLECTION_TAG_ASSET_BY_RARITY.普通;
        const cardClasses = [
            'collection-card',
            species.unlocked ? 'unlocked' : 'locked',
            species.isPendingGuide ? 'is-guide-target' : ''
        ].filter(Boolean).join(' ');

        return `
            <article
                class="${cardClasses}"
                data-species-id="${escapeHtml(species.id)}"
                data-unlocked="${species.unlocked ? 'true' : 'false'}"
                data-rarity-tone="${escapeHtml(displayRarityTone)}"
                style="--collection-card-x:${cardPosition.x}; --collection-card-y:${cardPosition.y};"
                role="gridcell"
                aria-disabled="false"
                aria-label="${escapeHtml(`${displayName} ${displayRarity}${species.unlocked ? '' : ' 未解锁'}`)}"
            >
                ${buildGuideMarkup(species)}
                <img class="collection-card-bg" src="${escapeHtml(COLLECTION_CARD_BACKGROUND_SRC)}" alt="" aria-hidden="true">
                <div class="collection-card-media">
                    <div class="collection-card-image-shell">
                        <img class="collection-card-image" src="${escapeHtml(species.imageSrc)}" alt="${escapeHtml(species.imageAlt || species.name)}" loading="lazy">
                    </div>
                </div>
                <div class="collection-card-tag${displayTagLabel.indexOf('\n') >= 0 ? ' is-two-line' : ''}" aria-hidden="true">
                    <img class="collection-card-tag-image" src="${escapeHtml(tagImageSrc)}" alt="">
                    <span class="collection-card-tag-label${displayTagLabel.indexOf('\n') >= 0 ? ' is-two-line' : ''}">${escapeHtml(displayTagLabel)}</span>
                </div>
                <div class="collection-card-content">
                    <p class="collection-card-title">${species.unlocked ? '' : '<svg class="collection-card-lock-icon" aria-hidden="true" viewBox="0 0 16 16" fill="none"><rect x="3" y="7" width="10" height="7" rx="1.5" fill="currentColor"/><path d="M5 7V5a3 3 0 0 1 6 0v2" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg>'}${escapeHtml(displayName)}</p>
                </div>
            </article>
        `;
    }

    function buildEmptyCardMarkup(orderIndex) {
        const cardPosition = COLLECTION_CARD_POSITIONS[orderIndex] || COLLECTION_CARD_POSITIONS[0];
        return `
            <article class="collection-card collection-card-empty" style="--collection-card-x:${cardPosition.x}; --collection-card-y:${cardPosition.y};" aria-hidden="true">
                <img class="collection-card-bg" src="${escapeHtml(COLLECTION_CARD_BACKGROUND_SRC)}" alt="" aria-hidden="true">
                <div class="collection-card-media">
                    <div class="collection-card-empty-illustration"></div>
                </div>
                <div class="collection-card-content">
                    <p class="collection-card-title">敬请期待</p>
                </div>
            </article>
        `;
    }



    function renderGrid() {
        const collection = getCollectionSnapshot();
        const startIndex = state.currentPage * PAGE_SIZE;
        const species = collection.species
            .slice(startIndex, startIndex + PAGE_SIZE)
            .map((entry, index) => Object.assign({}, entry, { orderIndex: index }));

        if (refs.grid) {
            const fillerCount = Math.max(0, PAGE_SIZE - species.length);
            const markup = species.map(buildCardMarkup);
            for (let index = 0; index < fillerCount; index += 1) {
                markup.push(buildEmptyCardMarkup(species.length + index));
            }
            refs.grid.innerHTML = markup.join('');
        }

        refs.pageCounters.forEach((ref) => {
            ref.textContent = `${state.currentPage + 1} / ${Math.max(1, collection.totalPages || 1)}`;
        });

        if (refs.progressText) {
            refs.progressText.textContent = `${collection.unlockedCount || 0}/${collection.totalSpecies || 0}`;
        }

        if (refs.progressFill) {
            const totalSpecies = Math.max(0, Number(collection.totalSpecies || 0));
            const unlockedCount = Math.max(0, Number(collection.unlockedCount || 0));
            const progressPercent = totalSpecies > 0 ? Math.min(100, (unlockedCount / totalSpecies) * 100) : 0;
            refs.progressFill.style.width = `${progressPercent}%`;
            refs.progressFill.style.transform = 'none';
        }

        if (refs.prevBtn) {
            refs.prevBtn.disabled = state.currentPage <= 0;
        }

        if (refs.nextBtn) {
            refs.nextBtn.disabled = state.currentPage >= Math.max(0, (collection.totalPages || 1) - 1);
        }
    }

    function renderDetail() {
        const species = getSpeciesById(state.detailSpeciesId);
        if (!refs.detail) {
            return;
        }

        if (!species) {
            refs.detail.hidden = true;
            if (refs.screen) {
                refs.screen.classList.remove('is-detail-view');
            }
            return;
        }

        if (refs.detailImage) {
            refs.detailImage.src = species.detailImageSrc || species.imageSrc;
            refs.detailImage.alt = species.detailImageAlt || species.imageAlt || species.name;
        }

        if (refs.detailName) {
            refs.detailName.textContent = species.name;
        }

        if (refs.detailDescription) {
            refs.detailDescription.textContent = species.detailDescription || species.summary || '';
        }

        if (refs.detailRarity) {
            refs.detailRarity.textContent = getDisplayTagLabel(species.rarity);
            refs.detailRarity.dataset.rarityTone = getRarityTone(species.rarity);
        }

        if (refs.detailTagImage) {
            refs.detailTagImage.src = COLLECTION_TAG_ASSET_BY_RARITY[species.rarity] || COLLECTION_TAG_ASSET_BY_RARITY.普通;
        }

        if (refs.detailIucn) {
            refs.detailIucn.textContent = species.iucnText || '待补充';
        }

        if (refs.detailPopulation) {
            refs.detailPopulation.textContent = species.populationText || '待补充';
        }

        if (refs.detailTemperature) {
            refs.detailTemperature.textContent = species.temperatureText || '待补充';
        }

        if (refs.detailSocial) {
            refs.detailSocial.textContent = species.socialText || '待补充';
        }

        if (refs.detailUnlock) {
            refs.detailUnlock.textContent = formatDetailUnlockDate(species.unlockedAt);
        }

        refs.detail.hidden = false;
        if (refs.screen) {
            refs.screen.classList.add('is-detail-view');
        }
    }

    function closeDetail() {
        state.detailSpeciesId = '';
        if (refs.detail) {
            refs.detail.hidden = true;
        }
        if (refs.screen) {
            refs.screen.classList.remove('is-detail-view');
        }
        updateBackButton();
        renderGrid();
    }

    function openDetail(speciesId) {
        const species = getSpeciesById(speciesId);
        if (!species) {
            return false;
        }

        const economy = getEconomy();
        if (species.unlocked && economy && typeof economy.markCollectionSpeciesViewed === 'function') {
            economy.markCollectionSpeciesViewed(species.id);
        }
        if (species.unlocked && species.isPendingGuide && economy && typeof economy.clearCollectionGuide === 'function') {
            economy.clearCollectionGuide(species.id);
        }

        state.snapshot = economy ? economy.getSnapshot() : state.snapshot;
        state.detailSpeciesId = species.id;
        updateBackButton();
        renderGrid();
        renderDetail();
        return true;
    }

    function showPage(nextPageIndex) {
        const collection = getCollectionSnapshot();
        const maxPageIndex = Math.max(0, Number(collection.totalPages || 1) - 1);
        state.currentPage = Math.max(0, Math.min(maxPageIndex, Number(nextPageIndex) || 0));
        renderGrid();
    }

    function handleBack() {
        if (state.detailSpeciesId) {
            closeDetail();
            return;
        }

        const appShell = getAppShell();
        if (appShell && typeof appShell.showZooHome === 'function') {
            appShell.showZooHome();
        }
    }

    function bindEvents() {
        if (refs.grid) {
            refs.grid.addEventListener('click', (event) => {
                const target = event.target instanceof Element
                    ? event.target.closest('[data-species-id]')
                    : null;
                if (!target) {
                    return;
                }

                openDetail(target.getAttribute('data-species-id'));
            });
        }

        if (refs.prevBtn) {
            refs.prevBtn.addEventListener('click', () => {
                showPage(state.currentPage - 1);
            });
        }

        if (refs.nextBtn) {
            refs.nextBtn.addEventListener('click', () => {
                showPage(state.currentPage + 1);
            });
        }

        if (refs.backBtn) {
            refs.backBtn.addEventListener('click', handleBack);
        }

    }

    function init() {
        if (state.initialized) {
            return api;
        }

        cacheDom();
        bindEvents();
        updateBackButton();
        state.initialized = true;
        return api;
    }

    function show(snapshot = null) {
        if (!state.initialized) {
            init();
        }

        state.snapshot = snapshot || (getEconomy() ? getEconomy().getSnapshot() : null);
        syncPageForGuide(getCollectionSnapshot());
        updateBackButton();

        if (refs.screen) {
            refs.screen.classList.add('is-active');
            refs.screen.setAttribute('aria-hidden', 'false');
        }

        renderGrid();
        renderDetail();
    }

    function hide() {
        if (refs.screen) {
            refs.screen.classList.remove('is-active');
            refs.screen.setAttribute('aria-hidden', 'true');
        }
    }

    function render(snapshot = null) {
        state.snapshot = snapshot || (getEconomy() ? getEconomy().getSnapshot() : null);
        syncPageForGuide(getCollectionSnapshot());
        updateBackButton();
        renderGrid();
        renderDetail();
    }

    function getRefs() {
        return refs;
    }

    const api = {
        init,
        show,
        hide,
        render,
        getRefs
    };

    globalScope.WynneZooCollection = api;

    if (globalScope.WynneRegistry) {
        globalScope.WynneRegistry.register('WynneZooCollection', globalScope.WynneZooCollection);
    }
}(window));
