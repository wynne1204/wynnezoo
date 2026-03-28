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
        unlockNotificationQueue: [],
        unlockPopupActive: false
    };

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

    function renderStoryPreviewList() {
        if (!refs.storyPreviewList) {
            return;
        }

        const stories = getStoryEntries();
        localState.storyEntryCount = stories.length;

        if (refs.storyPreviewTrigger) {
            refs.storyPreviewTrigger.disabled = false;
            refs.storyPreviewTrigger.dataset.empty = stories.length <= 0 ? 'true' : 'false';
        }

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

    function getSlotCardCopy(slotSnapshot, zooSnapshot) {
        const theme = zooSnapshot && zooSnapshot.slotTheme
            ? zooSnapshot.slotTheme
            : (balance ? balance.SLOT_THEME : null);
        const ticketName = theme ? theme.ticketName : '游园惊喜券';
        const machineName = theme ? theme.machineName : '礼盒机';
        const unlockedHabitats = zooSnapshot && Array.isArray(zooSnapshot.habitats)
            ? zooSnapshot.habitats.filter((habitat) => habitat && habitat.unlocked)
            : [];

        if (unlockedHabitats.length <= 0
            && !hasUnfinishedRound(slotSnapshot)
            && (!zooSnapshot || !zooSnapshot.resources || zooSnapshot.resources.playTicket <= 0)) {
            return {
                status: '动物园暂未开放',
                hint: `首个栖息地暂未开放，当前先保持空园状态，不会产出${ticketName}。`,
                entryText: '暂未开放',
                disabled: true
            };
        }

        if (hasUnfinishedRound(slotSnapshot)) {
            if (slotSnapshot.isBonusGameActive) {
                return {
                    status: `${machineName} · Bonus 进行中`,
                    hint: `继续当前局即可衔接 Bonus，已翻开 ${slotSnapshot.revealedCount}/${slotSnapshot.totalCells} 格。`,
                    entryText: '继续当前局',
                    disabled: false
                };
            }

            if (slotSnapshot.isFreeSpinActive) {
                return {
                    status: `${machineName} · Free Spin`,
                    hint: `当前倍率 ${Number(slotSnapshot.currentMultiplier || 1).toFixed(1)}x，返回后继续免费回合。`,
                    entryText: '继续免费回合',
                    disabled: false
                };
            }

            return {
                status: `${machineName} · 进度保留中`,
                hint: `已翻开 ${slotSnapshot.revealedCount}/${slotSnapshot.totalCells} 格，继续时不额外消耗 ${ticketName}。`,
                entryText: '继续当前局',
                disabled: false
            };
        }

        if (!zooSnapshot || !zooSnapshot.resources || zooSnapshot.resources.playTicket <= 0) {
            return {
                status: `${ticketName} 不足`,
                hint: '等待小熊猫栖息地产券，或点击气泡领取新产出的盲盒券。',
                entryText: '暂无盲盒券',
                disabled: true
            };
        }

        return {
            status: `${machineName} 已待命`,
            hint: `当前持有 ${zooSnapshot.resources.playTicket} 张 ${ticketName}，点击右下角入口拆盲盒。`,
            entryText: '拆盲盒',
            disabled: false
        };
    }

    function getHabitatArt(habitat) {
        if (!habitat) {
            return '';
        }

        const assets = habitat.stageAssets || {};
        if (habitat.tier && habitat.tier.id === 'deluxe') {
            return assets.deluxe || assets.improved || assets.standard || habitat.sceneAsset || '';
        }
        if (habitat.tier && habitat.tier.id === 'improved') {
            return assets.improved || assets.standard || habitat.sceneAsset || '';
        }
        if (habitat.residentCount <= 0) {
            return assets.standardEmpty || assets.standard || habitat.sceneAsset || '';
        }
        return assets.standard || assets.standardEmpty || habitat.sceneAsset || '';
    }

    const HABITAT_STAGE_LAYOUTS = {
        standard: {
            stageLeft: '1.2821%',
            stageTop: '28.2385%',
            stageWidth: '106.9915%',
            stageHeight: '36.9273%',
            imageLeft: '0%',
            imageTop: '0%',
            imageWidth: '100%',
            imageHeight: '100%'
        },
        'standard-empty': {
            stageLeft: '1.2821%',
            stageTop: '28.2385%',
            stageWidth: '106.9915%',
            stageHeight: '36.9273%',
            imageLeft: '0%',
            imageTop: '0%',
            imageWidth: '100%',
            imageHeight: '100%'
        },
        improved: {
            stageLeft: '3.1624%',
            stageTop: '24.3681%',
            stageWidth: '103.1624%',
            stageHeight: '41.7062%',
            imageLeft: '0%',
            imageTop: '-68.01%',
            imageWidth: '100%',
            imageHeight: '204.61%'
        },
        deluxe: {
            stageLeft: '3.1624%',
            stageTop: '20.4976%',
            stageWidth: '101.0256%',
            stageHeight: '45.5766%',
            imageLeft: '0%',
            imageTop: '-47.67%',
            imageWidth: '100%',
            imageHeight: '183.38%'
        },
        christmas: {
            stageLeft: '0%',
            stageTop: '24.1706%',
            stageWidth: '105.4701%',
            stageHeight: '41.9036%',
            imageLeft: '0%',
            imageTop: '-64.76%',
            imageWidth: '100%',
            imageHeight: '208.23%'
        }
    };

    const HABITAT_TICKET_BUBBLE_LAYOUT = {
        bubbleLeft: '57.7778%',
        bubbleTop: '27.2117%',
        bubbleWidth: '33.2479%',
        bubbleHeight: '15.3633%'
    };

    function buildInlineStyle(styleMap) {
        return Object.entries(styleMap)
            .map(([key, value]) => `${key}:${value}`)
            .join(';');
    }

    function getHabitatArtVariant(habitat, art) {
        if (!habitat) {
            return 'standard';
        }

        const assets = habitat.stageAssets || {};
        if (art && assets.christmas && art === assets.christmas) {
            return 'christmas';
        }
        if (habitat.tier && habitat.tier.id === 'deluxe') {
            return 'deluxe';
        }
        if (habitat.tier && habitat.tier.id === 'improved') {
            return 'improved';
        }
        if (habitat.residentCount <= 0) {
            return 'standard-empty';
        }
        return 'standard';
    }

    function getHabitatStageLayout(habitat, art) {
        const variant = getHabitatArtVariant(habitat, art);
        return {
            variant,
            ...(HABITAT_STAGE_LAYOUTS[variant] || HABITAT_STAGE_LAYOUTS.standard),
            ...HABITAT_TICKET_BUBBLE_LAYOUT
        };
    }

    function renderTicketBubble(habitat) {
        if (!habitat || !habitat.hasClaimableTickets || habitat.claimableTickets <= 0) {
            return '';
        }

        return `
            <button
                class="zoo-habitat-ticket-bubble"
                type="button"
                data-action="claim-tickets"
                data-habitat-id="${escapeHtml(habitat.id)}"
                aria-label="领取${habitat.claimableTickets}张玩法券"
            >
                <img class="zoo-habitat-ticket-bubble-bg" src="./Texture/UI/Home_TicketBubble.png" alt="" aria-hidden="true">
                <img class="zoo-habitat-ticket-icon" src="./Texture/UI/Icon_Ticket.png" alt="" aria-hidden="true">
                <span class="zoo-habitat-ticket-copy">
                    <span class="zoo-habitat-ticket-count">x${habitat.claimableTickets}</span>
                    <span class="zoo-habitat-ticket-label">点击领取</span>
                </span>
            </button>
        `;
    }

    function getMainTaskCopy(snapshot) {
        const habitat = getInfoHabitat(snapshot);
        if (!habitat) {
            return '查看动物园主页';
        }

        const habitatLabel = habitat.speciesLabel
            ? `${habitat.speciesLabel}栏舍`
            : habitat.name;

        if (habitat.isStoryLocked) {
            return '建造小熊猫栏舍';
        }

        if (!habitat.unlocked) {
            return habitat.unlockActionText || `解锁${habitatLabel}`;
        }

        if (habitat.hasClaimableTickets && habitat.claimableTickets > 0) {
            return '领取盲盒券';
        }

        if (habitat.nextTier) {
            return `升级${habitatLabel}`;
        }

        return `查看${habitatLabel}`;
    }

    function renderHabitatStage(habitat) {
        if (!habitat) {
            return '';
        }

        const art = getHabitatArt(habitat);
        const layout = getHabitatStageLayout(habitat, art);
        const articleStyle = buildInlineStyle({
            '--habitat-stage-left': layout.stageLeft,
            '--habitat-stage-top': layout.stageTop,
            '--habitat-stage-width': layout.stageWidth,
            '--habitat-stage-height': layout.stageHeight,
            '--habitat-image-left': layout.imageLeft,
            '--habitat-image-top': layout.imageTop,
            '--habitat-image-width': layout.imageWidth,
            '--habitat-image-height': layout.imageHeight,
            '--habitat-bubble-left': layout.bubbleLeft,
            '--habitat-bubble-top': layout.bubbleTop,
            '--habitat-bubble-width': layout.bubbleWidth,
            '--habitat-bubble-height': layout.bubbleHeight
        });

        return `
            <article
                class="zoo-habitat-stage zoo-habitat-stage--${escapeHtml(layout.variant)}"
                data-habitat-id="${escapeHtml(habitat.id)}"
                style="${articleStyle}"
            >
                ${renderTicketBubble(habitat)}
                <button
                    class="zoo-habitat-hotspot"
                    type="button"
                    data-action="open-info"
                    data-habitat-id="${escapeHtml(habitat.id)}"
                    aria-label="查看栏舍信息"
                >
                    ${art ? `<img class="zoo-habitat-scene" src="${escapeHtml(art)}" alt="${escapeHtml(habitat.sceneAlt || habitat.name)}">` : ''}
                </button>
            </article>
        `;
    }

    function renderMetricCards(metrics) {
        const items = [
            { key: 'cleanliness', label: '清洁度' },
            { key: 'food', label: '食物' },
            { key: 'water', label: '水源' },
            { key: 'environment', label: '环境' },
            { key: 'health', label: '健康值' }
        ];

        return items.map((item) => {
            const value = Math.max(0, Math.min(100, Number(metrics[item.key]) || 0));
            return `
                <article class="habitat-stat-card">
                    <div class="habitat-stat-header">
                        <span>${item.label}</span>
                        <strong>${value}</strong>
                    </div>
                    <div class="habitat-stat-bar">
                        <span style="width:${value}%"></span>
                    </div>
                </article>
            `;
        }).join('');
    }

    function renderOverviewCard(habitat, actionMarkup = '') {
        const previewImage = habitat && habitat.sceneAsset
            ? `<img class="habitat-overview-image" src="${escapeHtml(habitat.sceneAsset)}" alt="${escapeHtml(habitat.sceneAlt || habitat.name)}">`
            : '<div class="habitat-overview-image habitat-overview-image--placeholder" aria-hidden="true"></div>';

        return `
            <section class="habitat-overview-card">
                <div class="habitat-overview-media">
                    ${previewImage}
                </div>
                <div class="habitat-overview-copy">
                    <div class="habitat-overview-head">
                        <div>
                            <div class="habitat-overview-kicker">${escapeHtml(habitat.tagline || habitat.speciesLabel || 'Habitat')}</div>
                            <h4>${escapeHtml(habitat.name)}</h4>
                        </div>
                        <span class="habitat-overview-tier">${escapeHtml((habitat.tier && (habitat.tier.shortLabel || habitat.tier.label)) || '普通')}</span>
                    </div>
                    <p class="habitat-overview-description">${escapeHtml(habitat.ticketSummary || habitat.lockDescription || '')}</p>
                    ${actionMarkup ? `<div class="habitat-overview-action">${actionMarkup}</div>` : ''}
                </div>
            </section>
        `;
    }

    function renderFactRows(rows) {
        return `
            <div class="habitat-fact-list">
                ${rows.map((row) => `
                    <article class="habitat-fact-row">
                        <span>${escapeHtml(row.label)}</span>
                        <strong>${escapeHtml(row.value)}</strong>
                    </article>
                `).join('')}
            </div>
        `;
    }

    function renderUnlockButton(habitat) {
        if (!habitat || !habitat.canUnlock) {
            return '';
        }

        return `
            <button class="habitat-action-btn" type="button" data-action="unlock">
                ${escapeHtml(habitat.unlockActionText)}
            </button>
        `;
    }

    function renderLockedStatusTab(snapshot) {
        const habitat = snapshot.selectedHabitat;
        const actionMarkup = renderUnlockButton(habitat);
        return `
            ${renderOverviewCard(habitat, actionMarkup)}
            <div class="habitat-placeholder-card habitat-locked-card">
                <div class="habitat-info-title">${escapeHtml(habitat.name)} \u5c1a\u672a\u5f00\u653e</div>
                <p>${escapeHtml(habitat.lockDescription)}</p>
                <p>\u89e3\u9501\u540e\u4f1a\u5f00\u653e\u680f\u820d\u72b6\u6001\u3001\u5c0f\u52a8\u7269\u3001\u73af\u5883\u5347\u7ea7\u548c\u81ea\u52a8\u4ea7\u5238\u3002</p>
            </div>
        `;
    }

    function renderLockedAnimalsTab(snapshot) {
        const habitat = snapshot.selectedHabitat;
        const previewAnimals = habitat.animals.map((animal) => `
            <article class="animal-resident-card">
                <div class="animal-resident-head">
                    <div>
                        <h4>${escapeHtml(animal.name)}</h4>
                        <p>${escapeHtml(animal.gender)} \u00b7 ${escapeHtml(animal.ageLabel)}</p>
                    </div>
                    <span class="animal-resident-badge">\u5f85\u5165\u4f4f</span>
                </div>
                <div class="animal-need-pills">
                    <span class="animal-need-pill">\u9965\u997f ${animal.hunger}</span>
                    <span class="animal-need-pill">\u53e3\u6e34 ${animal.thirst}</span>
                </div>
            </article>
        `).join('');

        return `
            ${renderOverviewCard(habitat, renderUnlockButton(habitat))}
            <div class="habitat-section-title">\u9884\u89c8\u5c0f\u52a8\u7269</div>
            <div class="animal-resident-list">${previewAnimals}</div>
            <div class="habitat-placeholder-card habitat-locked-card">
                <div class="habitat-info-title">\u89e3\u9501\u540e\u53ef\u67e5\u770b\u5168\u90e8\u5165\u4f4f\u6863\u6848</div>
                <p>\u5305\u62ec\u6027\u522b\u3001\u5e74\u9f84\u3001\u9965\u997f\u548c\u53e3\u6e34\u72b6\u6001\uff0c\u4e5f\u53ef\u76f4\u63a5\u8fdb\u884c\u4e00\u952e\u7167\u987e\u3002</p>
            </div>
        `;
    }


    function renderEnvironmentTierCard(tier, currentTierId, nextTierId) {
        const isCurrent = tier.id === currentTierId;
        const isNext = tier.id === nextTierId;
        const modifier = isCurrent ? 'is-current' : (isNext ? 'is-next' : '');
        const titleSuffix = isCurrent ? '\u5f53\u524d' : (isNext ? '\u4e0b\u4e00\u9636' : '\u53ef\u8fbe\u5c42\u7ea7');

        return `
            <article class="environment-tier-card ${modifier}">
                <div class="environment-tier-head">
                    <h4>${escapeHtml(tier.label)}</h4>
                    <span>${titleSuffix}</span>
                </div>
                <div class="environment-tier-meta">\u73af\u5883 ${tier.environment} \u00b7 \u5bb9\u91cf ${tier.capacity} \u00b7 \u5238\u4ed3\u4e0a\u9650 ${tier.ticketCap}</div>
                <div class="environment-tier-meta">\u57fa\u7840\u4ea7\u5238\u901f\u5ea6 \u6bcf ${Math.max(1, Math.round(tier.ticketIntervalSec / 60))} \u5206\u949f 1 \u5f20</div>
            </article>
        `;
    }

    function renderLockedEnvironmentTab(snapshot) {
        const habitat = snapshot.selectedHabitat;
        const tiers = balance && balance.HABITAT_TIERS ? Object.values(balance.HABITAT_TIERS) : [];
        const tierCards = tiers.slice(0, 2).map((tier) => (
            renderEnvironmentTierCard(tier, habitat.tier.id, habitat.nextTier && habitat.nextTier.id)
        )).join('');

        return `
            ${renderOverviewCard(habitat, renderUnlockButton(habitat))}
            ${renderFactRows([
                { label: '\u5f53\u524d\u5bb9\u91cf', value: `${habitat.capacity}` },
                { label: '\u73af\u5883\u5206\u503c', value: `${habitat.tier.environment}` },
                { label: '\u4ea7\u5238\u57fa\u7840\u901f\u5ea6', value: `\u6bcf ${Math.max(1, Math.round(habitat.ticketBaseIntervalSec / 60))} \u5206\u949f 1 \u5f20` },
                { label: '\u5238\u4ed3\u4e0a\u9650', value: `${habitat.tier.ticketCap}` }
            ])}
            <div class="habitat-section-title">\u73af\u5883\u9636\u6bb5\u9884\u89c8</div>
            <div class="environment-tier-list">${tierCards}</div>
        `;
    }


    function renderLockedAppearanceTab(snapshot) {
        const habitat = snapshot.selectedHabitat;
        return `
            ${renderOverviewCard(habitat, renderUnlockButton(habitat))}
            <div class="appearance-preview-card is-locked">
                <div class="appearance-preview-copy">
                    <div class="habitat-info-title">\u5916\u89c2\u6a21\u5f0f\u6682\u672a\u5f00\u653e</div>
                    <p>\u672c\u7248\u672c\u5148\u805a\u7126\u89e3\u9501\u3001\u5582\u98df\u3001\u5347\u7ea7\u548c\u4ea7\u5238\u95ed\u73af\uff0c\u5916\u89c2\u88c5\u4fee\u4f1a\u5728\u540e\u7eed\u6253\u5f00\u3002</p>
                </div>
                <div class="habitat-chip-list">
                    <span class="habitat-chip">${escapeHtml(habitat.name)}</span>
                    <span class="habitat-chip">${escapeHtml(habitat.tier.label)}</span>
                    <span class="habitat-chip">${escapeHtml(habitat.tagline)}</span>
                </div>
            </div>
        `;
    }


    function renderStatusTab(snapshot) {
        const habitat = snapshot.selectedHabitat;
        if (!habitat.unlocked) {
            return renderLockedStatusTab(snapshot);
        }

        const actionMarkup = habitat.nextTier
            ? `
                <button class="habitat-action-btn is-inline" type="button" data-action="upgrade">
                    \u5347\u7ea7\u680f\u820d \u00b7 ${habitat.nextTier.diamondCost} \u94bb\u77f3
                </button>
            `
            : `
                <button class="habitat-action-btn is-inline" type="button" data-action="feed" ${habitat.feedCost > 0 ? '' : 'disabled'}>
                    ${habitat.feedCost > 0 ? `\u4e00\u952e\u5582\u98df \u00b7 ${habitat.feedCost} \u91d1\u5e01` : '\u72b6\u6001\u826f\u597d\uff0c\u65e0\u9700\u5582\u98df'}
                </button>
            `;

        return `
            ${renderOverviewCard(habitat, actionMarkup)}
            <div class="habitat-summary-strip">
                <article class="habitat-summary-card">
                    <span>\u5165\u4f4f\u60c5\u51b5</span>
                    <strong>${habitat.residentCount}/${habitat.capacity}</strong>
                    <em>${escapeHtml(habitat.speciesLabel)} \u5df2\u5165\u4f4f</em>
                </article>
                <article class="habitat-summary-card">
                    <span>\u76f2\u76d2\u5238\u8fdb\u5ea6</span>
                    <strong>${Math.max(0, Math.round(habitat.ticketProgressPct || 0))}%</strong>
                    <em>${escapeHtml(habitat.ticketCountdownText)}</em>
                </article>
            </div>
            ${renderFactRows([
                { label: '\u6574\u4f53\u5fc3\u60c5', value: `${habitat.mood} \u00b7 ${habitat.moodLabel}` },
                { label: '\u4ea7\u5238\u901f\u5ea6', value: habitat.ticketEfficiencyLabel },
                { label: '\u4e0b\u4e00\u5f20\u76f2\u76d2\u5238', value: habitat.ticketCountdownText },
                { label: '\u5f53\u524d\u680f\u820d\u7b49\u7ea7', value: habitat.tier.label }
            ])}
            <div class="habitat-section-title">\u72b6\u6001\u6307\u6807</div>
            <div class="habitat-tab-grid">
                ${renderMetricCards(habitat.statusMetrics)}
            </div>
            <div class="habitat-summary-strip">
                <article class="habitat-summary-card">
                    <span>\u5fc3\u60c5\u503c</span>
                    <strong>${habitat.mood}</strong>
                    <em>${escapeHtml(habitat.moodLabel)}</em>
                </article>
                <article class="habitat-summary-card">
                    <span>\u76f2\u76d2\u5238\u6548\u7387</span>
                    <strong>${escapeHtml(habitat.ticketEfficiencyLabel)}</strong>
                    <em>\u6bcf ${Math.max(1, Math.round(habitat.ticketIntervalSec / 60))} \u5206\u949f 1 \u5f20</em>
                </article>
            </div>
        `;
    }

    function renderAnimalsTab(snapshot) {
        const habitat = snapshot.selectedHabitat;
        if (!habitat.unlocked) {
            return renderLockedAnimalsTab(snapshot);
        }

        const animalCards = habitat.animals.map((animal) => `
            <article class="animal-resident-card">
                <div class="animal-resident-head">
                    <div>
                        <h4>${escapeHtml(animal.name)}</h4>
                        <p>${escapeHtml(animal.gender)} \u00b7 ${escapeHtml(animal.ageLabel)}</p>
                    </div>
                    <span class="animal-resident-badge">${escapeHtml(habitat.tagline)}</span>
                </div>
                <div class="animal-need-pills">
                    <span class="animal-need-pill">\u9965\u997f ${animal.hunger} \u00b7 ${escapeHtml(animal.hungerLabel)}</span>
                    <span class="animal-need-pill">\u53e3\u6e34 ${animal.thirst} \u00b7 ${escapeHtml(animal.thirstLabel)}</span>
                </div>
            </article>
        `).join('');

        const feedDisabled = habitat.feedCost <= 0;
        const actionMarkup = `
            <button class="habitat-action-btn is-inline" type="button" data-action="feed" ${feedDisabled ? 'disabled' : ''}>
                ${feedDisabled ? '\u72b6\u6001\u826f\u597d\uff0c\u65e0\u9700\u5582\u98df' : `\u4e00\u952e\u5582\u98df \u00b7 ${habitat.feedCost} \u91d1\u5e01`}
            </button>
        `;

        return `
            ${renderOverviewCard(habitat, actionMarkup)}
            <div class="habitat-summary-strip">
                <article class="habitat-summary-card">
                    <span>\u5c0f\u52a8\u7269\u6570\u91cf</span>
                    <strong>${habitat.residentCount}/${habitat.capacity}</strong>
                    <em>\u5f53\u524d\u680f\u820d\u53ef\u5bb9\u7eb3 ${habitat.capacity} \u53ea</em>
                </article>
                <article class="habitat-summary-card">
                    <span>\u7167\u987e\u72b6\u6001</span>
                    <strong>${escapeHtml(habitat.moodLabel)}</strong>
                    <em>${feedDisabled ? '\u6682\u65e0\u9700\u8981\u989d\u5916\u7167\u987e' : '\u53ef\u76f4\u63a5\u6267\u884c\u4e00\u952e\u5582\u98df'}</em>
                </article>
            </div>
            ${renderFactRows([
                { label: '\u7269\u79cd', value: habitat.speciesLabel },
                { label: '\u680f\u820d\u4e3b\u9898', value: habitat.tagline },
                { label: '\u5f53\u524d\u5fc3\u60c5', value: habitat.moodLabel },
                { label: '\u5582\u98df\u6210\u672c', value: feedDisabled ? '\u65e0' : `${habitat.feedCost} \u91d1\u5e01` }
            ])}
            <div class="habitat-section-title">\u5165\u4f4f\u5217\u8868</div>
            <div class="animal-resident-list">${animalCards}</div>
        `;
    }


    function renderEnvironmentTab(snapshot) {
        const habitat = snapshot.selectedHabitat;
        if (!habitat.unlocked) {
            return renderLockedEnvironmentTab(snapshot);
        }

        const tiers = balance && balance.HABITAT_TIERS ? Object.values(balance.HABITAT_TIERS) : [];
        const tierCards = tiers
            .filter(tier => tier.id === habitat.tier.id || (habitat.nextTier && tier.id === habitat.nextTier.id))
            .map((tier) => (
                renderEnvironmentTierCard(tier, habitat.tier.id, habitat.nextTier && habitat.nextTier.id)
            )).join('');

        const nextTier = habitat.nextTier;
        const actionMarkup = `
            <button class="habitat-action-btn is-inline" type="button" data-action="upgrade" ${nextTier ? '' : 'disabled'}>
                ${nextTier ? `\u5347\u7ea7\u5230 ${escapeHtml(nextTier.label)} \u00b7 ${nextTier.diamondCost} \u94bb\u77f3` : '\u5df2\u8fbe\u5230\u6700\u9ad8\u680f\u820d\u7b49\u7ea7'}
            </button>
        `;

        return `
            ${renderOverviewCard(habitat, actionMarkup)}
            <div class="habitat-summary-strip">
                <article class="habitat-summary-card">
                    <span>\u73af\u5883\u5206\u503c</span>
                    <strong>${habitat.tier.environment}</strong>
                    <em>${escapeHtml(habitat.tier.label)}</em>
                </article>
                <article class="habitat-summary-card">
                    <span>\u5bb9\u91cf\u4e0a\u9650</span>
                    <strong>${habitat.capacity}</strong>
                    <em>\u5f53\u524d\u5df2\u5165\u4f4f ${habitat.residentCount} \u53ea</em>
                </article>
            </div>
            ${renderFactRows([
                { label: '\u5238\u4ed3\u4e0a\u9650', value: `${habitat.tier.ticketCap}` },
                { label: '\u5f53\u524d\u4ea7\u5238\u9891\u7387', value: `\u6bcf ${Math.max(1, Math.round(habitat.ticketIntervalSec / 60))} \u5206\u949f 1 \u5f20` },
                { label: '\u57fa\u7840\u9891\u7387', value: `\u6bcf ${Math.max(1, Math.round(habitat.ticketBaseIntervalSec / 60))} \u5206\u949f 1 \u5f20` },
                { label: '\u4e0b\u4e00\u9636\u6bb5', value: nextTier ? nextTier.label : '\u5df2\u6ee1\u7ea7' }
            ])}
            <div class="habitat-section-title">\u9636\u6bb5\u4fe1\u606f</div>
            <div class="environment-tier-list">${tierCards}</div>
        `;
    }


    function renderAppearanceTab(snapshot) {
        const habitat = snapshot.selectedHabitat;
        if (!habitat.unlocked) {
            return renderLockedAppearanceTab(snapshot);
        }

        return `
            ${renderOverviewCard(habitat)}
            <div class="appearance-preview-card">
                <div class="appearance-preview-media">
                    ${habitat.sceneAsset ? `<img class="appearance-preview-image" src="${escapeHtml(habitat.sceneAsset)}" alt="${escapeHtml(habitat.sceneAlt || habitat.name)}">` : '<div class="appearance-preview-image appearance-preview-image--placeholder" aria-hidden="true"></div>'}
                </div>
                <div class="appearance-preview-copy">
                    <div class="habitat-info-title">\u5f53\u524d\u5916\u89c2\u4e3b\u9898</div>
                    <p>${escapeHtml(habitat.appearanceTitle || habitat.name)} \u00b7 ${escapeHtml(habitat.tagline)}</p>
                    <p>\u4fdd\u6301\u4f60\u73b0\u5728\u7684\u6e29\u6696\u914d\u8272\u8bed\u8a00\uff0c\u540e\u7eed\u53ef\u5728\u8fd9\u91cc\u7ee7\u7eed\u6269\u5c55\u88c5\u9970\u3001\u76ae\u80a4\u548c\u4e3b\u9898\u5207\u6362\u529f\u80fd\u3002</p>
                </div>
                <div class="habitat-chip-list">
                    <span class="habitat-chip">${escapeHtml(habitat.name)}</span>
                    <span class="habitat-chip">${escapeHtml(habitat.tier.label)}</span>
                    <span class="habitat-chip">${escapeHtml(habitat.moodLabel)}</span>
                </div>
            </div>
            ${renderFactRows([
                { label: '\u5916\u89c2\u6807\u9898', value: habitat.appearanceTitle || habitat.name },
                { label: '\u573a\u666f\u6807\u7b7e', value: habitat.sceneBadge || habitat.speciesLabel },
                { label: '\u4e3b\u9898\u8bed\u6c47', value: habitat.tagline },
                { label: '\u5f53\u524d\u7b49\u7ea7', value: habitat.tier.label }
            ])}
        `;
    }


    function renderTabContent(snapshot) {
        const tab = snapshot && snapshot.ui ? snapshot.ui.activeTab : 'status';
        if (tab === 'animals') return renderAnimalsTab(snapshot);
        if (tab === 'environment') return renderEnvironmentTab(snapshot);
        if (tab === 'appearance') return renderAppearanceTab(snapshot);
        return renderStatusTab(snapshot);
    }

    function updateTabButtons(activeTab) {
        refs.tabButtons.forEach((button) => {
            const isActive = button.dataset.tab === activeTab;
            button.classList.toggle('is-active', isActive);
            button.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });
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

        if (typeof economy.openHabitatPanel === 'function') {
            economy.openHabitatPanel(habitat.id);
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
            // 静默失败
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

        const homeHabitat = getHomeHabitat(snapshot);
        const selectedHabitat = getInfoHabitat(snapshot);
        const slotCopy = getSlotCardCopy(localState.slotSnapshot, snapshot);

        if (refs.resourceCoin) refs.resourceCoin.textContent = formatResourceNumber(snapshot.resources.coin || 0);
        if (refs.resourceDiamond) refs.resourceDiamond.textContent = formatResourceNumber(snapshot.resources.diamond || 0);
        if (refs.resourceTicket) refs.resourceTicket.textContent = formatResourceNumber(snapshot.resources.playTicket || 0);

        if (refs.homeBackground) {
            refs.homeBackground.src = './Texture/ZOO/UI_Zoo_MainBG.png';
            refs.homeBackground.alt = '动物园主场景背景';
        }

        if (refs.devNote) {
            refs.devNote.textContent = homeHabitat
                ? `${homeHabitat.name} 当前为 ${homeHabitat.tier.label}，${homeHabitat.ticketCountdownText}`
                : '动物园当前还是空场景，栖息地解锁章节暂未配置。';
        }

        if (refs.habitatStageList) {
            refs.habitatStageList.innerHTML = renderHabitatStage(homeHabitat);
        }

        if (refs.mainTaskText) {
            // Prefer quest system text when available; fall back to habitat-based copy
            const questMod = globalScope.WynneRegistry
                && typeof globalScope.WynneRegistry.get === 'function'
                ? globalScope.WynneRegistry.get('WynneZooQuest')
                : null;
            refs.mainTaskText.textContent = questMod && typeof questMod.getActiveQuestText === 'function'
                ? questMod.getActiveQuestText()
                : getMainTaskCopy(snapshot);
        }

        if (refs.habitatResidentPill) {
            refs.habitatResidentPill.textContent = homeHabitat
                ? `${homeHabitat.residentCount}/${homeHabitat.capacity} 只小动物`
                : (selectedHabitat.isStoryLocked
                    ? `暂未开放 · ${selectedHabitat.unlockStoryLabel || '待定剧情'}`
                    : (selectedHabitat.unlocked
                        ? `${selectedHabitat.residentCount}/${selectedHabitat.capacity} 只小动物`
                        : `待解锁 · ${selectedHabitat.unlockCostCoin} 金币`));
        }

        if (refs.panelTitle) {
            refs.panelTitle.textContent = selectedHabitat.unlocked
                ? `${selectedHabitat.name} · ${selectedHabitat.tier.shortLabel || selectedHabitat.tier.label}`
                : (selectedHabitat.isStoryLocked
                    ? `${selectedHabitat.name} · 暂未开放`
                    : `${selectedHabitat.name} · 待解锁`);
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
            refs.tabContent.innerHTML = renderTabContent(snapshot);
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
        renderStoryPreviewList();
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
                // Quest system navigation: use quest nav target if available
                const questModule = globalScope.WynneRegistry
                    && typeof globalScope.WynneRegistry.get === 'function'
                    ? globalScope.WynneRegistry.get('WynneZooQuest')
                    : null;

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
                            if (!openPanelForTab('status')) {
                                showToast('当前没有可查看的栏舍信息。', 'warn');
                            }
                            return;
                        }
                    }
                }

                // Fallback: original behavior when quest system is unavailable
                const snapshot = economy && typeof economy.getSnapshot === 'function'
                    ? economy.getSnapshot()
                    : null;
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
                render(snapshot);
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
                refs.mainTaskText.textContent = questModule.getActiveQuestText();
            }

            // Subscribe to quest state changes to update button text in real-time
            if (typeof questModule.subscribe === 'function') {
                questModule.subscribe(function () {
                    if (refs.mainTaskText && typeof questModule.getActiveQuestText === 'function') {
                        refs.mainTaskText.textContent = questModule.getActiveQuestText();
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
        render();
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
