(function initZooBalance(globalScope) {
    'use strict';

    const SLOT_THEME = {
        machineName: '动物园惊喜盲盒',
        ticketName: '盲盒券',
        ticketPackName: '盲盒券·栖地联名版',
        ticketHint: '由各栖息地根据小动物心情自动产出，用于拆开一次惊喜盲盒。普通局和 Free Spin 结算金币，Bonus 结算钻石。'
    };

    const HABITAT_TIER_ORDER = ['standard', 'improved', 'deluxe'];

    const HABITAT_TIERS = {
        standard: {
            id: 'standard',
            label: '普通栏舍',
            shortLabel: '普通',
            diamondCost: 0,
            capacity: 2,
            environment: 60,
            moodBonus: 0,
            ticketIntervalSec: 180,
            ticketCap: 3
        },
        improved: {
            id: 'improved',
            label: '中级栏舍',
            shortLabel: '中级',
            diamondCost: 80,
            capacity: 4,
            environment: 78,
            moodBonus: 8,
            ticketIntervalSec: 125,
            ticketCap: 5
        },
        deluxe: {
            id: 'deluxe',
            label: '高级栏舍',
            shortLabel: '高级',
            diamondCost: 220,
            capacity: 6,
            environment: 92,
            moodBonus: 18,
            ticketIntervalSec: 85,
            ticketCap: 8
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
            sceneAsset: './Texture/ZOO/red-panda-habitat-standard.png',
            sceneAlt: '小熊猫栖息地主视觉',
            sceneBadge: 'Red Panda',
            appearanceTitle: '小熊猫栖息地',
            stageAssets: {
                standardEmpty: './Texture/ZOO/小熊猫栖息地-普通-没有小熊猫.png',
                standard: './Texture/ZOO/red-panda-habitat-standard.png',
                improved: './Texture/ZOO/red-panda-habitat-improved.png',
                deluxe: './Texture/ZOO/red-panda-habitat-deluxe.png',
                christmas: './Texture/ZOO/red-panda-habitat-christmas.png'
            },
            unlockCostCoin: 0,
            defaultUnlocked: false,
            unlockPendingStory: true,
            unlockStoryLabel: '后续剧情',
            defaultTierId: 'standard',
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
            defaultTierId: 'standard',
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

    function getTierById(tierId) {
        return HABITAT_TIERS[tierId] || HABITAT_TIERS.standard;
    }

    function getTierIndex(tierId) {
        return Math.max(0, HABITAT_TIER_ORDER.indexOf(tierId));
    }

    function getNextTier(tierId) {
        const nextIndex = getTierIndex(tierId) + 1;
        const nextId = HABITAT_TIER_ORDER[nextIndex];
        return nextId ? getTierById(nextId) : null;
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
        HABITAT_TIER_ORDER,
        HABITAT_TIERS,
        HABITAT_DEFINITIONS,
        clampNumber,
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
