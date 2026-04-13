(function initZooHomeViewHelpers(globalScope) {
    'use strict';

    const HABITAT_STAGE_LAYOUTS = Object.freeze({
        level1: {
            stageLeft: '1.2821%',
            stageTop: '28.2385%',
            stageWidth: '106.9915%',
            stageHeight: '36.9273%',
            imageLeft: '0%',
            imageTop: '0%',
            imageWidth: '100%',
            imageHeight: '100%'
        },
        level2: {
            stageLeft: '1.2821%',
            stageTop: '28.2385%',
            stageWidth: '106.9915%',
            stageHeight: '36.9273%',
            imageLeft: '0%',
            imageTop: '0%',
            imageWidth: '100%',
            imageHeight: '100%'
        },
        level3: {
            stageLeft: '3.1624%',
            stageTop: '24.3681%',
            stageWidth: '103.1624%',
            stageHeight: '41.7062%',
            imageLeft: '0%',
            imageTop: '0%',
            imageWidth: '100%',
            imageHeight: '100%'
        },
        level4: {
            stageLeft: '3.1624%',
            stageTop: '24.3681%',
            stageWidth: '103.1624%',
            stageHeight: '41.7062%',
            imageLeft: '0%',
            imageTop: '0%',
            imageWidth: '100%',
            imageHeight: '100%'
        },
        level5: {
            stageLeft: '3.1624%',
            stageTop: '22.4%',
            stageWidth: '103.1624%',
            stageHeight: '43.8%',
            imageLeft: '0%',
            imageTop: '0%',
            imageWidth: '100%',
            imageHeight: '100%'
        },
        level6: {
            stageLeft: '5.8974%',
            stageTop: '20.7946%',
            stageWidth: '99.7436%',
            stageHeight: '43.0885%',
            imageLeft: '0%',
            imageTop: '-53.35%',
            imageWidth: '100%',
            imageHeight: '191.49%',
            imageFit: 'fill',
            imagePosition: 'center center'
        }
    });

    const HABITAT_TICKET_BUBBLE_LAYOUT = Object.freeze({
        bubbleLeft: '57.7778%',
        bubbleTop: '27.2117%',
        bubbleWidth: '33.2479%',
        bubbleHeight: '15.3633%'
    });

    // Delegate to the shared escapeHtml in js/utils.js
    var fallbackEscapeHtml = globalScope.escapeHtml || function(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    };

    function create(deps = {}) {
        const escapeHtml = typeof deps.escapeHtml === 'function'
            ? deps.escapeHtml
            : fallbackEscapeHtml;
        const getHabitatArt = typeof deps.getHabitatArt === 'function'
            ? deps.getHabitatArt
            : function fallbackGetHabitatArt() {
                return '';
            };
        const getHabitatArtKey = typeof deps.getHabitatArtKey === 'function'
            ? deps.getHabitatArtKey
            : function fallbackGetHabitatArtKey() {
                return 'level1';
            };

        function buildInlineStyle(styleMap) {
            return Object.entries(styleMap)
                .map(([key, value]) => `${key}:${value}`)
                .join(';');
        }

        function getHabitatStageLayout(habitat) {
            const variant = getHabitatArtKey(habitat);
            return {
                variant,
                ...(HABITAT_STAGE_LAYOUTS[variant] || HABITAT_STAGE_LAYOUTS.level1),
                ...HABITAT_TICKET_BUBBLE_LAYOUT
            };
        }

        function renderMetricCards(metrics) {
            const items = [
                { key: 'cleanliness', label: '\u6e05\u6d01\u5ea6' },
                { key: 'food', label: '\u98df\u7269' },
                { key: 'water', label: '\u6c34\u6e90' },
                { key: 'environment', label: '\u73af\u5883' },
                { key: 'health', label: '\u5065\u5eb7\u503c' }
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
            const previewArt = habitat ? getHabitatArt(habitat) : '';
            const previewImage = previewArt
                ? `<img class="habitat-overview-image" src="${escapeHtml(previewArt)}" alt="${escapeHtml(habitat.sceneAlt || habitat.name)}">`
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
                            <span class="habitat-overview-tier">${escapeHtml((habitat.tier && (habitat.tier.shortLabel || habitat.tier.label)) || '\u666e\u901a')}</span>
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

        return {
            buildInlineStyle,
            getHabitatStageLayout,
            renderEnvironmentTierCard,
            renderFactRows,
            renderMetricCards,
            renderOverviewCard
        };
    }

    globalScope.WynneZooHomeViewHelpers = {
        create
    };
}(window));
