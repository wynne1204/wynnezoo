(function initZooHomeRenderers(globalScope) {
    'use strict';

    function create(deps = {}) {
        const escapeHtml = deps.escapeHtml;
        const getHabitatArt = deps.getHabitatArt;
        const getHabitatStageLayout = deps.getHabitatStageLayout;
        const buildInlineStyle = deps.buildInlineStyle;
        const shouldAnimateHabitatArtSwap = deps.shouldAnimateHabitatArtSwap;
        const shouldShowHabitatBuildGuide = deps.shouldShowHabitatBuildGuide;
        const getHabitatTierDefinitions = deps.getHabitatTierDefinitions;
        const renderOverviewCard = deps.renderOverviewCard;
        const renderFactRows = deps.renderFactRows;
        const renderMetricCards = deps.renderMetricCards;
        const renderEnvironmentTierCard = deps.renderEnvironmentTierCard;
        const directBuildHabitatId = String(deps.directBuildHabitatId || '').trim();

        function isDirectBuildTargetHabitat(habitat) {
            return Boolean(habitat && habitat.id === directBuildHabitatId);
        }

        function getHabitatPrimaryAction(snapshot, habitat) {
            const showBuildGuide = shouldShowHabitatBuildGuide(snapshot, habitat);
            if (habitat && habitat.isConstructing) {
                return {
                    action: 'construction-pending',
                    label: '\u5c0f\u718a\u732b\u680f\u820d\u5efa\u9020\u4e2d',
                    showBuildGuide: false
                };
            }

            if (habitat && !habitat.unlocked && isDirectBuildTargetHabitat(habitat) && showBuildGuide) {
                return {
                    action: 'build-habitat',
                    label: '\u5efa\u9020\u5c0f\u718a\u732b\u680f\u820d',
                    showBuildGuide: true
                };
            }

            return {
                action: 'open-info',
                label: '\u67e5\u770b\u680f\u820d\u4fe1\u606f',
                showBuildGuide
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
                    aria-label="\u9886\u53d6${habitat.claimableTickets}\u5f20\u73a9\u6cd5\u5238"
                >
                    <img class="zoo-habitat-ticket-bubble-bg" src="./Texture/UI/Home_TicketBubble.png" alt="" aria-hidden="true">
                    <img class="zoo-habitat-ticket-icon" src="./Texture/UI/Icon_Ticket.png" alt="" aria-hidden="true">
                    <span class="zoo-habitat-ticket-copy">
                        <span class="zoo-habitat-ticket-count">x${habitat.claimableTickets}</span>
                        <span class="zoo-habitat-ticket-label">\u70b9\u51fb\u9886\u53d6</span>
                    </span>
                </button>
            `;
        }

        function renderHabitatSitePlaceholder(habitat) {
            return `
                <div class="zoo-habitat-empty-site" aria-hidden="true">
                    <div class="zoo-habitat-empty-site-ground"></div>
                    <div class="zoo-habitat-empty-site-frame"></div>
                    <div class="zoo-habitat-empty-site-copy">
                        <span class="zoo-habitat-empty-site-badge">\u5f85\u5efa\u9020</span>
                        <strong>${escapeHtml((habitat && habitat.speciesLabel) || '\u680f\u820d')} 1 \u7ea7\u680f\u820d</strong>
                    </div>
                </div>
            `;
        }

        function renderHabitatConstructionOverlay(habitat) {
            if (!habitat || !habitat.isConstructing) {
                return '';
            }

            return `
                <div class="zoo-habitat-construction" aria-hidden="true">
                    <div class="zoo-habitat-construction-dust"></div>
                    <div class="zoo-habitat-construction-copy">
                        <span>CONSTRUCTING</span>
                        <strong>\u5c0f\u718a\u732b\u680f\u820d\u65bd\u5de5\u4e2d...</strong>
                    </div>
                    <div class="zoo-habitat-construction-progress">
                        <span style="width: 65%; background: linear-gradient(90deg, #86efac 0%, #4ade80 52%, #22c55e 100%); box-shadow: 0 0 0.6rem rgba(74, 222, 128, 0.5);"></span>
                    </div>
                </div>
            `;
        }

        function renderHabitatStage(habitat, snapshot) {
            if (!habitat || habitat.isStoryLocked || habitat.isConstructing) {
                return '';
            }

            const art = getHabitatArt(habitat);
            const animateArtSwap = shouldAnimateHabitatArtSwap(habitat, art);
            const layout = getHabitatStageLayout(habitat);
            const primaryAction = getHabitatPrimaryAction(snapshot, habitat);
            const showBuildGuide = primaryAction.showBuildGuide;
            const articleStyle = buildInlineStyle({
                '--habitat-stage-left': layout.stageLeft,
                '--habitat-stage-top': layout.stageTop,
                '--habitat-stage-width': layout.stageWidth,
                '--habitat-stage-height': layout.stageHeight,
                '--habitat-image-left': layout.imageLeft,
                '--habitat-image-top': layout.imageTop,
                '--habitat-image-width': layout.imageWidth,
                '--habitat-image-height': layout.imageHeight,
                '--habitat-image-fit': layout.imageFit || 'contain',
                '--habitat-image-position': layout.imagePosition || 'center bottom',
                '--habitat-bubble-left': layout.bubbleLeft,
                '--habitat-bubble-top': layout.bubbleTop,
                '--habitat-bubble-width': layout.bubbleWidth,
                '--habitat-bubble-height': layout.bubbleHeight
            });

            return `
                <article
                    class="zoo-habitat-stage zoo-habitat-stage--${escapeHtml(layout.variant)}${showBuildGuide ? ' is-guide-target' : ''}"
                    data-habitat-id="${escapeHtml(habitat.id)}"
                    style="${articleStyle}"
                >
                    ${renderTicketBubble(habitat)}
                    <button
                        class="zoo-habitat-hotspot${showBuildGuide ? ' is-guide-highlight' : ''}${habitat.isConstructing ? ' is-constructing' : ''}${!art && !showBuildGuide ? ' is-empty-site' : ''}"
                        type="button"
                        data-action="${escapeHtml(primaryAction.action)}"
                        data-habitat-id="${escapeHtml(habitat.id)}"
                        aria-label="${escapeHtml(primaryAction.label)}"
                        ${habitat.isConstructing ? 'disabled' : ''}
                    >
                        ${art ? `<img class="zoo-habitat-scene${animateArtSwap ? ' is-art-transitioning' : ''}" src="${escapeHtml(art)}" alt="${escapeHtml(habitat.sceneAlt || habitat.name)}">` : ''}
                        ${showBuildGuide && !art ? `
                            <div class="zoo-build-guide-zone" aria-hidden="true">
                                <div class="zoo-build-guide-ring"></div>
                                <div class="zoo-build-guide-ring zoo-build-guide-ring--outer"></div>
                                <div class="zoo-build-guide-icon">
                                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                        <path d="m15 12-8.5 8.5c-.83.83-2.17.83-3 0 0 0 0 0 0 0a2.12 2.12 0 0 1 0-3L12 9"/>
                                        <path d="M17.64 15 22 10.64"/>
                                        <path d="m20.91 11.7-1.25-1.25c-.6-.6-.93-1.4-.93-2.25v-.86L16.01 4.6a5.56 5.56 0 0 0-3.94-1.64H11.2l-1.42 1.42L14 8.6l3.5 3.5Z"/>
                                    </svg>
                                </div>
                                <div class="zoo-build-guide-label">\u70b9\u6b64\u5efa\u9020\u680f\u820d</div>
                            </div>
                        ` : ''}
                        ${!art && !showBuildGuide ? renderHabitatSitePlaceholder(habitat) : ''}
                        ${renderHabitatConstructionOverlay(habitat)}
                    </button>
                </article>
            `;
        }

        function renderUnlockButton(habitat) {
            if (!habitat) {
                return '';
            }

            if (habitat.isConstructing) {
                return `
                    <button class="habitat-action-btn" type="button" disabled>
                        \u5efa\u9020\u4e2d...
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

        function renderLockedStatusTab(snapshot) {
            const habitat = snapshot.selectedHabitat;
            const actionMarkup = renderUnlockButton(habitat);
            const infoTitle = habitat.isConstructing
                ? `${habitat.name} \u6b63\u5728\u5efa\u9020\u4e2d`
                : `${habitat.name} \u5c1a\u672a\u5f00\u653e`;
            const infoHint = habitat.isConstructing
                ? '\u5b8c\u5de5\u540e\u4f1a\u76f4\u63a5\u4ee5 1 \u7ea7\u680f\u820d\u5f00\u653e\uff0c\u5e76\u540c\u6b65\u89e3\u9501\u5165\u9a7b\u3001\u5347\u7ea7\u548c\u81ea\u52a8\u4ea7\u5238\u3002'
                : '\u89e3\u9501\u540e\u4f1a\u5f00\u653e\u680f\u820d\u72b6\u6001\u3001\u5c0f\u52a8\u7269\u3001\u73af\u5883\u5347\u7ea7\u548c\u81ea\u52a8\u4ea7\u5238\u3002';
            return `
                ${renderOverviewCard(habitat, actionMarkup)}
                <div class="habitat-placeholder-card habitat-locked-card">
                    <div class="habitat-info-title">${escapeHtml(infoTitle)}</div>
                    <p>${escapeHtml(habitat.lockDescription)}</p>
                    <p>${escapeHtml(infoHint)}</p>
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
                            <p>${escapeHtml(animal.gender)} · ${escapeHtml(animal.ageLabel)}</p>
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

        function renderLockedEnvironmentTab(snapshot) {
            const habitat = snapshot.selectedHabitat;
            const tiers = getHabitatTierDefinitions(habitat);
            const tierCards = tiers.map((tier) => (
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
                        \u5347\u7ea7\u680f\u820d · ${habitat.nextTier.diamondCost} \u94bb\u77f3
                    </button>
                `
                : `
                    <button class="habitat-action-btn is-inline" type="button" data-action="feed" ${habitat.feedCost > 0 ? '' : 'disabled'}>
                        ${habitat.feedCost > 0 ? `\u4e00\u952e\u5582\u98df · ${habitat.feedCost} \u91d1\u5e01` : '\u72b6\u6001\u826f\u597d\uff0c\u65e0\u9700\u5582\u98df'}
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
                    { label: '\u6574\u4f53\u5fc3\u60c5', value: `${habitat.mood} · ${habitat.moodLabel}` },
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
                            <p>${escapeHtml(animal.gender)} · ${escapeHtml(animal.ageLabel)}</p>
                        </div>
                        <span class="animal-resident-badge">${escapeHtml(habitat.tagline)}</span>
                    </div>
                    <div class="animal-need-pills">
                        <span class="animal-need-pill">\u9965\u997f ${animal.hunger} · ${escapeHtml(animal.hungerLabel)}</span>
                        <span class="animal-need-pill">\u53e3\u6e34 ${animal.thirst} · ${escapeHtml(animal.thirstLabel)}</span>
                    </div>
                </article>
            `).join('');

            const feedDisabled = habitat.feedCost <= 0;
            const actionMarkup = `
                <button class="habitat-action-btn is-inline" type="button" data-action="feed" ${feedDisabled ? 'disabled' : ''}>
                    ${feedDisabled ? '\u72b6\u6001\u826f\u597d\uff0c\u65e0\u9700\u5582\u98df' : `\u4e00\u952e\u5582\u98df · ${habitat.feedCost} \u91d1\u5e01`}
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

            const tiers = getHabitatTierDefinitions(habitat);
            const tierCards = tiers
                .filter((tier) => tier.id === habitat.tier.id || (habitat.nextTier && tier.id === habitat.nextTier.id))
                .map((tier) => (
                    renderEnvironmentTierCard(tier, habitat.tier.id, habitat.nextTier && habitat.nextTier.id)
                )).join('');

            const nextTier = habitat.nextTier;
            const actionMarkup = `
                <button class="habitat-action-btn is-inline" type="button" data-action="upgrade" ${nextTier ? '' : 'disabled'}>
                    ${nextTier ? `\u5347\u7ea7\u5230 ${escapeHtml(nextTier.label)} · ${nextTier.diamondCost} \u94bb\u77f3` : '\u5df2\u8fbe\u5230\u6700\u9ad8\u680f\u820d\u7b49\u7ea7'}
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

            const previewArt = getHabitatArt(habitat);
            return `
                ${renderOverviewCard(habitat)}
                <div class="appearance-preview-card">
                    <div class="appearance-preview-media">
                        ${previewArt ? `<img class="appearance-preview-image" src="${escapeHtml(previewArt)}" alt="${escapeHtml(habitat.sceneAlt || habitat.name)}">` : '<div class="appearance-preview-image appearance-preview-image--placeholder" aria-hidden="true"></div>'}
                    </div>
                    <div class="appearance-preview-copy">
                        <div class="habitat-info-title">\u5f53\u524d\u5916\u89c2\u4e3b\u9898</div>
                        <p>${escapeHtml(habitat.appearanceTitle || habitat.name)} · ${escapeHtml(habitat.tagline)}</p>
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

        return {
            renderHabitatStage,
            renderTabContent
        };
    }

    globalScope.WynneZooHomeRenderers = {
        create
    };
}(window));
