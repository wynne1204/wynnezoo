(function initZooBalance(globalScope) {
    'use strict';

    const SLOT_THEME = {
        machineName: '动物园惊喜盲盒',
        ticketName: '盲盒券',
        ticketPackName: '盲盒券·栖地联名版',
        ticketHint: '由各栖息地根据小动物心情自动产出，用于拆开一次惊喜盲盒。普通局和 Free Spin 结算金币，Bonus 结算钻石。'
    };

    const STARTER_PLAY_TICKETS = 30;

    const HABITAT_TIER_ORDER = ['tier-1', 'tier-2', 'tier-3', 'tier-4', 'tier-5', 'tier-6'];

    const LEGACY_TIER_ID_MAP = {
        standard: 'tier-1',
        improved: 'tier-3',
        deluxe: 'tier-6'
    };

    const HABITAT_TIERS = {
        'tier-1': {
            id: 'tier-1',
            level: 1,
            label: '1级栏舍',
            shortLabel: 'Lv.1',
            diamondCost: 0,
            capacity: 2,
            environment: 60,
            moodBonus: 0,
            ticketIntervalSec: 180,
            ticketCap: 3
        },
        'tier-2': {
            id: 'tier-2',
            level: 2,
            label: '2级栏舍',
            shortLabel: 'Lv.2',
            diamondCost: 40,
            capacity: 3,
            environment: 68,
            moodBonus: 4,
            ticketIntervalSec: 155,
            ticketCap: 4
        },
        'tier-3': {
            id: 'tier-3',
            level: 3,
            label: '3级栏舍',
            shortLabel: 'Lv.3',
            diamondCost: 80,
            capacity: 4,
            environment: 76,
            moodBonus: 8,
            ticketIntervalSec: 130,
            ticketCap: 5
        },
        'tier-4': {
            id: 'tier-4',
            level: 4,
            label: '4级栏舍',
            shortLabel: 'Lv.4',
            diamondCost: 140,
            capacity: 5,
            environment: 84,
            moodBonus: 12,
            ticketIntervalSec: 110,
            ticketCap: 6
        },
        'tier-5': {
            id: 'tier-5',
            level: 5,
            label: '5级栏舍',
            shortLabel: 'Lv.5',
            diamondCost: 220,
            capacity: 6,
            environment: 90,
            moodBonus: 16,
            ticketIntervalSec: 95,
            ticketCap: 7
        },
        'tier-6': {
            id: 'tier-6',
            level: 6,
            label: '6级栏舍',
            shortLabel: 'Lv.6',
            diamondCost: 320,
            capacity: 8,
            environment: 98,
            moodBonus: 22,
            ticketIntervalSec: 80,
            ticketCap: 9
        }
    };

    const HABITAT_DEFINITIONS = {
        'red-panda-grove': {
            id: 'red-panda-grove',
            name: '小熊猫栖息地',
            speciesLabel: '小熊猫',
            tagline: '竹影坡地',
            cardGlyph: '猫',
            cardSceneLabel: '小熊猫乐园',
            artTheme: 'red-panda',
            sceneAsset: './Texture/ZOO/redpanda/habitat-level-1.webp',
            sceneAlt: '小熊猫栖息地主视觉',
            sceneBadge: 'Red Panda',
            appearanceTitle: '小熊猫栖息地',
            stageAssets: {
                level1: './Texture/ZOO/redpanda/habitat-level-1.webp',
                level2: './Texture/ZOO/redpanda/habitat-level-2.webp',
                level3: './Texture/ZOO/redpanda/habitat-level-3.webp',
                level4: './Texture/ZOO/redpanda/habitat-level-4.webp',
                level5: './Texture/ZOO/redpanda/habitat-level-5.webp'
            },
            unlockCostCoin: 0,
            defaultUnlocked: false,
            unlockPendingStory: false,
            unlockStoryId: '第二章',
            unlockStoryLabel: '第二章剧情',
            defaultTierId: 'tier-1',
            availableTierIds: ['tier-1', 'tier-2', 'tier-3', 'tier-4', 'tier-5'],
            tierDiamondCosts: {
                'tier-2': 100,
                'tier-3': 200,
                'tier-4': 300,
                'tier-5': 400
            },
            hungerDecayPerSec: 0.017,
            thirstDecayPerSec: 0.021,
            baseMoodBonus: 6,
            starterAnimals: []
        },
        'capybara-lagoon': {
            id: 'capybara-lagoon',
            name: '水豚栖息地',
            speciesLabel: '水豚',
            tagline: '温泉水岸',
            cardGlyph: '豚',
            cardSceneLabel: '水岸浅滩',
            artTheme: 'capybara',
            sceneAsset: '',
            sceneAlt: '',
            sceneBadge: '',
            appearanceTitle: '',
            stageAssets: {},
            unlockCostCoin: 1200,
            defaultUnlocked: false,
            defaultTierId: 'tier-1',
            hungerDecayPerSec: 0.015,
            thirstDecayPerSec: 0.017,
            baseMoodBonus: 4,
            starterAnimals: [
                {
                    id: 'capybara-keke',
                    name: '可可',
                    gender: '雌性',
                    ageLabel: '2岁',
                    hunger: 84,
                    thirst: 86
                },
                {
                    id: 'capybara-mumu',
                    name: '木木',
                    gender: '雄性',
                    ageLabel: '4岁',
                    hunger: 78,
                    thirst: 90
                }
            ]
        }
    };

    function clampNumber(value, min, max) {
        const numeric = Number(value);
        if (!Number.isFinite(numeric)) {
            return min;
        }
        return Math.min(max, Math.max(min, numeric));
    }

    function getHabitatTierOrder(habitatId) {
        const habitatDefinition = habitatId ? getHabitatDefinition(habitatId) : null;
        const configuredTierIds = habitatDefinition && Array.isArray(habitatDefinition.availableTierIds)
            ? habitatDefinition.availableTierIds.filter((tierId, index, tierIds) => (
                HABITAT_TIERS[tierId]
                && tierIds.indexOf(tierId) === index
            ))
            : [];

        return configuredTierIds.length > 0
            ? configuredTierIds
            : HABITAT_TIER_ORDER;
    }

    function getTierById(tierId, habitatId) {
        const normalizedTierId = LEGACY_TIER_ID_MAP[tierId] || tierId;
        const tierOrder = getHabitatTierOrder(habitatId);
        const fallbackTierId = tierOrder[0] || 'tier-1';
        const baseTierId = HABITAT_TIERS[normalizedTierId] ? normalizedTierId : fallbackTierId;
        const resolvedTierId = tierOrder.includes(baseTierId)
            ? baseTierId
            : (tierOrder[tierOrder.length - 1] || fallbackTierId);
        const tier = HABITAT_TIERS[resolvedTierId] || HABITAT_TIERS[fallbackTierId] || HABITAT_TIERS['tier-1'];
        const habitatDefinition = habitatId ? getHabitatDefinition(habitatId) : null;
        const tierDiamondCosts = habitatDefinition && habitatDefinition.tierDiamondCosts && typeof habitatDefinition.tierDiamondCosts === 'object'
            ? habitatDefinition.tierDiamondCosts
            : null;

        if (!tierDiamondCosts || !Object.prototype.hasOwnProperty.call(tierDiamondCosts, tier.id)) {
            return tier;
        }

        return {
            ...tier,
            diamondCost: Math.max(0, Math.floor(Number(tierDiamondCosts[tier.id]) || 0))
        };
    }

    function getTierIndex(tierId, habitatId) {
        const tierOrder = getHabitatTierOrder(habitatId);
        const normalizedTierId = getTierById(tierId, habitatId).id;
        return Math.max(0, tierOrder.indexOf(normalizedTierId));
    }

    function getNextTier(tierId, habitatId) {
        const tierOrder = getHabitatTierOrder(habitatId);
        const nextIndex = getTierIndex(tierId, habitatId) + 1;
        const nextId = tierOrder[nextIndex];
        return nextId ? getTierById(nextId, habitatId) : null;
    }

    function getHabitatDefinition(habitatId) {
        return HABITAT_DEFINITIONS[habitatId] || HABITAT_DEFINITIONS['red-panda-grove'];
    }

    function getAllHabitatDefinitions() {
        return Object.values(HABITAT_DEFINITIONS);
    }

    function createStarterAnimals(habitatId) {
        return getHabitatDefinition(habitatId).starterAnimals.map((animal) => ({
            ...animal
        }));
    }

    function getNeedLabel(value) {
        const safeValue = clampNumber(value, 0, 100);
        if (safeValue >= 88) return '状态极佳';
        if (safeValue >= 68) return '比较稳定';
        if (safeValue >= 42) return '需要关注';
        return '急需处理';
    }

    function getMoodLabel(value) {
        const safeValue = clampNumber(value, 0, 100);
        if (safeValue >= 90) return '非常开心';
        if (safeValue >= 76) return '心情不错';
        if (safeValue >= 58) return '状态平稳';
        if (safeValue >= 40) return '有些烦躁';
        return '需要安抚';
    }

    function getMoodTicketMultiplier(value) {
        const safeValue = clampNumber(value, 0, 100);
        if (safeValue >= 90) return 1.45;
        if (safeValue >= 80) return 1.25;
        if (safeValue >= 68) return 1.1;
        if (safeValue >= 50) return 1;
        if (safeValue >= 36) return 0.82;
        return 0.68;
    }

    function getTicketEfficiencyLabel(multiplier) {
        const safeMultiplier = Number(multiplier) || 1;
        if (safeMultiplier >= 1.35) return '产券很旺';
        if (safeMultiplier >= 1.15) return '产券加速';
        if (safeMultiplier >= 0.95) return '产券稳定';
        if (safeMultiplier >= 0.8) return '产券变慢';
        return '产券偏低';
    }

    function formatDuration(totalSeconds) {
        const safeSeconds = Math.max(0, Math.floor(Number(totalSeconds) || 0));
        const hours = Math.floor(safeSeconds / 3600);
        const minutes = Math.floor((safeSeconds % 3600) / 60);
        const seconds = safeSeconds % 60;

        if (hours > 0) {
            return `${hours}时${minutes.toString().padStart(2, '0')}分`;
        }
        if (minutes <= 0) {
            return `${seconds}秒`;
        }
        return `${minutes}分${seconds.toString().padStart(2, '0')}秒`;
    }

    function computeFeedCost(animals) {
        const safeAnimals = Array.isArray(animals) ? animals : [];
        const deficit = safeAnimals.reduce((sum, animal) => {
            const hunger = clampNumber(animal && animal.hunger, 0, 100);
            const thirst = clampNumber(animal && animal.thirst, 0, 100);
            return sum + (100 - hunger) + (100 - thirst);
        }, 0);

        if (deficit < 12) {
            return 0;
        }

        const baseCost = Math.ceil(deficit * 0.9);
        return Math.max(18, baseCost + (safeAnimals.length * 10));
    }

    globalScope.WynneZooBalance = {
        SLOT_THEME,
        STARTER_PLAY_TICKETS,
        HABITAT_TIER_ORDER,
        HABITAT_TIERS,
        HABITAT_DEFINITIONS,
        clampNumber,
        getHabitatTierOrder,
        getTierById,
        getNextTier,
        getHabitatDefinition,
        getAllHabitatDefinitions,
        createStarterAnimals,
        getNeedLabel,
        getMoodLabel,
        getMoodTicketMultiplier,
        getTicketEfficiencyLabel,
        formatDuration,
        computeFeedCost
    };

    if (globalScope.WynneRegistry) {
        globalScope.WynneRegistry.register('WynneZooBalance', globalScope.WynneZooBalance);
    }
}(window));
