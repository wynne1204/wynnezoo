(function initZooEconomy(globalScope) {
    'use strict';

    const balance = globalScope.WynneZooBalance || null;
    if (!balance) {
        return;
    }

    const STORAGE_PREFIX = 'wynnesZoo.zooEconomy.user.';
    const ACTIVE_USER_STORAGE_KEY = 'wynnesZoo.activeUserId';
    const SAVE_VERSION = 6;
    const DEFAULT_USER_ID_PREFIX = 'guest';
    const ACTIVE_TABS = new Set(['status', 'animals', 'environment', 'appearance']);
    const listeners = new Set();
    let tickTimerId = 0;
    let visibilityHandlerBound = false;
    const COLLECTION_REDPANDA_CARD_IMAGE_SRC = './Texture/UI/Collection/图鉴_小熊猫.png';
    const COLLECTION_PLACEHOLDER_IMAGE_SRC = COLLECTION_REDPANDA_CARD_IMAGE_SRC;
    const COLLECTION_SPECIES_DEFINITIONS = Object.freeze([
        {
            id: 'red-panda',
            name: '小熊猫',
            rarity: '濒危',
            imageSrc: COLLECTION_REDPANDA_CARD_IMAGE_SRC,
            imageAlt: '小熊猫图鉴立绘',
            summary: '喜欢在树梢之间来回穿梭，行动轻巧，警觉又灵动。',
            traits: '擅长攀爬、晨昏活跃、会用前爪抱着食物慢慢啃。',
            habitat: '偏爱温凉潮湿、竹林与阔叶林交错的山地环境。',
            detailImageSrc: COLLECTION_REDPANDA_CARD_IMAGE_SRC,
            detailImageAlt: '小熊猫动物详情立绘',
            detailDescription: '小熊猫（学名：Ailurus fulgens）是一种原产于喜马拉雅山脉东部和中国西南地区的小型哺乳动物。尽管名字中带有“熊猫”二字，且同样拥有食竹的习性，但它在进化上更接近于鼬类和浣熊，而非大熊猫。小熊猫对温度非常敏感。',
            iucnText: 'IUCN 红色名录中被列为濒危 (EN) 级别',
            populationText: '10000只',
            temperatureText: '0-29度',
            socialText: '独居',
            placeholder: false
        },
        {
            id: 'monkey',
            name: '猴子',
            rarity: '普通',
            imageSrc: COLLECTION_PLACEHOLDER_IMAGE_SRC,
            imageAlt: '猴子图鉴占位图',
            summary: '性格活泼好动，喜欢在树枝间跳跃玩耍。',
            traits: '身手敏捷、群居动物、喜欢吃水果。',
            habitat: '常见于气候温暖的森林和丛林区域。',
            detailImageSrc: COLLECTION_PLACEHOLDER_IMAGE_SRC,
            detailImageAlt: '猴子动物详情占位立绘',
            detailDescription: '猴子通常生活在温暖湿润的森林环境中，善于借助树枝快速移动。它们具有较强的学习能力和社群意识，常通过叫声、动作和梳理行为维持群体关系。',
            iucnText: 'IUCN 红色名录示例：部分猴类处于需持续监测状态',
            populationText: '约20000只',
            temperatureText: '18-32度',
            socialText: '群居',
            placeholder: true
        },
        {
            id: 'alpaca',
            name: '羊驼',
            rarity: '罕见',
            imageSrc: COLLECTION_PLACEHOLDER_IMAGE_SRC,
            imageAlt: '羊驼图鉴占位图',
            summary: '外表憨态可掬，有着厚实柔软的绒毛。',
            traits: '性情温顺、群居动物、有时会吐口水。',
            habitat: '多栖居于高海拔的高原地区。',
            detailImageSrc: COLLECTION_PLACEHOLDER_IMAGE_SRC,
            detailImageAlt: '羊驼动物详情占位立绘',
            detailDescription: '羊驼原产于南美洲高原地区，拥有厚实的绒毛和耐寒能力，适应昼夜温差较大的环境。它们性情相对温和，通常以小群体活动，并通过姿态和叫声传递信息。',
            iucnText: 'IUCN 红色名录示例：人工保育稳定，野外种群待持续观察',
            populationText: '约15000只',
            temperatureText: '5-22度',
            socialText: '群居',
            placeholder: true
        },
        {
            id: 'snow-leopard',
            name: '雪豹',
            rarity: '近危',
            imageSrc: COLLECTION_PLACEHOLDER_IMAGE_SRC,
            imageAlt: '雪豹图鉴占位图',
            summary: '行动隐秘的高山猎手，善于在岩壁与雪坡间无声移动。',
            traits: '跳跃能力强、独居、尾巴粗长能帮助保持平衡与保暖。',
            habitat: '生活在高寒山地、裸岩峭壁和稀疏灌丛地带。',
            detailImageSrc: COLLECTION_PLACEHOLDER_IMAGE_SRC,
            detailImageAlt: '雪豹动物详情占位立绘',
            detailDescription: '雪豹被称为高山生态系统中的隐秘猎手，主要分布在高海拔寒冷山区。它们依靠厚密皮毛和长尾适应低温环境，行动范围广，通常独自巡游领地。',
            iucnText: 'IUCN 红色名录示例：近危 (NT)，需要长期保护栖息地',
            populationText: '约4000只',
            temperatureText: '-20-12度',
            socialText: '独居',
            placeholder: true
        },
        {
            id: 'koala',
            name: '考拉',
            rarity: '近危',
            imageSrc: COLLECTION_PLACEHOLDER_IMAGE_SRC,
            imageAlt: '考拉图鉴占位图',
            summary: '一天中大部分时间都在安静休息，对环境变化较为敏感。',
            traits: '嗜睡、偏食桉树叶、喜欢固定的树冠活动范围。',
            habitat: '适合树木高大、气候温和的森林环境。',
            detailImageSrc: COLLECTION_PLACEHOLDER_IMAGE_SRC,
            detailImageAlt: '考拉动物详情占位立绘',
            detailDescription: '考拉主要生活在桉树林中，依赖稳定的树冠和充足的叶片资源。它们新陈代谢较慢，大部分时间用于休息和消化，因此对温度和栖息地变化十分敏感。',
            iucnText: 'IUCN 红色名录示例：近危 (NT)，需控制栖息地破碎化',
            populationText: '约8000只',
            temperatureText: '12-30度',
            socialText: '独居',
            placeholder: true
        },
        {
            id: 'emperor-penguin',
            name: '帝企鹅',
            rarity: '罕见',
            imageSrc: COLLECTION_PLACEHOLDER_IMAGE_SRC,
            imageAlt: '帝企鹅图鉴占位图',
            summary: '群体协作能力出众，会通过紧密站位共同抵御严寒。',
            traits: '耐寒、擅长游泳、育雏期间拥有很强的守护本能。',
            habitat: '适宜寒冷海岸、冰缘地带与低温水域周边。',
            detailImageSrc: COLLECTION_PLACEHOLDER_IMAGE_SRC,
            detailImageAlt: '帝企鹅动物详情占位立绘',
            detailDescription: '帝企鹅是典型的极地鸟类，擅长在寒冷海域潜游觅食，并依靠群体站位抵御严寒。繁殖季节中，成体会分工协作，确保幼崽在极端气候中存活。',
            iucnText: 'IUCN 红色名录示例：近危风险上升，受气候变化影响显著',
            populationText: '约12000只',
            temperatureText: '-40-5度',
            socialText: '群居',
            placeholder: true
        },
        {
            id: 'ring-tailed-lemur',
            name: '环尾狐猴',
            rarity: '濒危',
            imageSrc: COLLECTION_PLACEHOLDER_IMAGE_SRC,
            imageAlt: '环尾狐猴图鉴占位图',
            summary: '尾巴花纹鲜明，群体中互动频繁，性格活泼好动。',
            traits: '会晒太阳取暖、擅长跳跃、常以气味标记地盘。',
            habitat: '偏好干燥树林、岩地与灌丛混合的区域。',
            detailImageSrc: COLLECTION_PLACEHOLDER_IMAGE_SRC,
            detailImageAlt: '环尾狐猴动物详情占位立绘',
            detailDescription: '环尾狐猴拥有辨识度很高的环纹尾巴，常以群体形式活动。它们会通过晒太阳、跳跃和气味标记来适应环境，是岛屿生态中极具代表性的灵长类动物。',
            iucnText: 'IUCN 红色名录示例：濒危 (EN)，受栖息地缩减影响明显',
            populationText: '约2500只',
            temperatureText: '16-30度',
            socialText: '群居',
            placeholder: true
        },
        {
            id: 'zebra',
            name: '斑马',
            rarity: '普通',
            imageSrc: COLLECTION_PLACEHOLDER_IMAGE_SRC,
            imageAlt: '斑马图鉴占位图',
            summary: '群体移动时节奏整齐，对周围动静非常敏锐。',
            traits: '善奔跑、条纹独一无二、会通过叫声和耳位交流。',
            habitat: '适合开阔草原、稀树草原和稳定的饮水点附近。',
            detailImageSrc: COLLECTION_PLACEHOLDER_IMAGE_SRC,
            detailImageAlt: '斑马动物详情占位立绘',
            detailDescription: '斑马广泛分布于草原与稀树草原地带，依赖群体行动提升警戒效率。它们醒目的黑白条纹不仅便于识别个体，也能在群体奔跑时干扰捕食者判断。',
            iucnText: 'IUCN 红色名录示例：普通种群仍需关注迁徙通道保护',
            populationText: '约30000只',
            temperatureText: '20-35度',
            socialText: '群居',
            placeholder: true
        },
        {
            id: 'giraffe',
            name: '长颈鹿',
            rarity: '野外灭绝',
            imageSrc: COLLECTION_PLACEHOLDER_IMAGE_SRC,
            imageAlt: '长颈鹿图鉴占位图',
            summary: '拥有出众视野，进食时偏爱高处的新鲜嫩叶。',
            traits: '脖颈修长、步态平稳、需要宽阔的活动空间。',
            habitat: '常见于高树分布较多、视野开阔的草原地带。',
            detailImageSrc: COLLECTION_PLACEHOLDER_IMAGE_SRC,
            detailImageAlt: '长颈鹿动物详情占位立绘',
            detailDescription: '长颈鹿以修长的脖颈和开阔视野著称，主要在稀树草原中取食高处树叶。它们行动优雅，需要较大的活动空间，也依赖稳定水源和植被分布。',
            iucnText: 'IUCN 红色名录示例：部分亚种保育等级较高，需持续恢复种群',
            populationText: '约6800只',
            temperatureText: '18-34度',
            socialText: '松散群居',
            placeholder: true
        }
    ]);
    const COLLECTION_SPECIES_ID_SET = new Set(COLLECTION_SPECIES_DEFINITIONS.map((species) => species.id));

    function normalizeUserId(userId) {
        return String(userId || '').trim().slice(0, 32);
    }

    function getStorageKeyForUser(userId) {
        const normalized = normalizeUserId(userId);
        return normalized ? `${STORAGE_PREFIX}${encodeURIComponent(normalized)}` : '';
    }

    function loadLastActiveUserId() {
        try {
            return normalizeUserId(globalScope.localStorage.getItem(ACTIVE_USER_STORAGE_KEY));
        } catch (error) {
            return '';
        }
    }

    function persistActiveUserId(userId) {
        const normalized = normalizeUserId(userId);
        try {
            if (normalized) {
                globalScope.localStorage.setItem(ACTIVE_USER_STORAGE_KEY, normalized);
            } else {
                globalScope.localStorage.removeItem(ACTIVE_USER_STORAGE_KEY);
            }
        } catch (error) {
            return;
        }
    }

    function createDefaultUserId() {
        const timestamp = Date.now().toString(36).slice(-6);
        const randomPart = Math.random().toString(36).slice(2, 6);
        return normalizeUserId(`${DEFAULT_USER_ID_PREFIX}-${timestamp}${randomPart}`);
    }

    function ensureInitialActiveUserId() {
        const lastUserId = loadLastActiveUserId();
        if (lastUserId) {
            return {
                userId: lastUserId,
                autoAssigned: false
            };
        }

        const defaultUserId = createDefaultUserId();
        persistActiveUserId(defaultUserId);

        return {
            userId: defaultUserId,
            autoAssigned: true
        };
    }

    function normalizeStoryId(storyId) {
        return String(storyId || '').trim().slice(0, 64);
    }

    function normalizeStoryFlags(rawFlags) {
        if (!rawFlags || typeof rawFlags !== 'object') {
            return {};
        }

        return Object.keys(rawFlags).reduce((result, key) => {
            const normalizedKey = normalizeStoryId(key);
            if (!normalizedKey) {
                return result;
            }

            result[normalizedKey] = Boolean(rawFlags[key]);
            return result;
        }, {});
    }

    function normalizeCollectionSpeciesId(speciesId) {
        return String(speciesId || '').trim().toLowerCase().slice(0, 64);
    }

    function getCollectionSpeciesDefinition(speciesId) {
        const normalizedId = normalizeCollectionSpeciesId(speciesId);
        return COLLECTION_SPECIES_DEFINITIONS.find((species) => species.id === normalizedId) || null;
    }

    function normalizeCollectionUnlockMap(rawMap) {
        if (!rawMap || typeof rawMap !== 'object') {
            return {};
        }

        return Object.keys(rawMap).reduce((result, key) => {
            const normalizedKey = normalizeCollectionSpeciesId(key);
            if (!normalizedKey || !COLLECTION_SPECIES_ID_SET.has(normalizedKey)) {
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

    function normalizeCollectionState(rawCollection) {
        const unlockedAtBySpeciesId = normalizeCollectionUnlockMap(rawCollection && rawCollection.unlockedAtBySpeciesId);
        const pendingGuideSpeciesId = normalizeCollectionSpeciesId(rawCollection && rawCollection.pendingGuideSpeciesId);
        const lastViewedSpeciesId = normalizeCollectionSpeciesId(rawCollection && rawCollection.lastViewedSpeciesId);

        return {
            unlockedAtBySpeciesId,
            pendingGuideSpeciesId: COLLECTION_SPECIES_ID_SET.has(pendingGuideSpeciesId) ? pendingGuideSpeciesId : '',
            lastViewedSpeciesId: COLLECTION_SPECIES_ID_SET.has(lastViewedSpeciesId) ? lastViewedSpeciesId : ''
        };
    }

    function syncCollectionUnlocksFromPlayedStories(nowTs = Date.now()) {
        if (!runtimeState.collection || typeof runtimeState.collection !== 'object') {
            runtimeState.collection = normalizeCollectionState(null);
        }

        if (!runtimeState.collection.unlockedAtBySpeciesId || typeof runtimeState.collection.unlockedAtBySpeciesId !== 'object') {
            runtimeState.collection.unlockedAtBySpeciesId = {};
        }

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
            const beats = story && Array.isArray(story.beats)
                ? story.beats
                : [];

            beats.forEach((beat) => {
                const unlock = beat && beat.collectionUnlock && typeof beat.collectionUnlock === 'object'
                    ? beat.collectionUnlock
                    : null;
                const speciesId = normalizeCollectionSpeciesId(unlock && unlock.speciesId);

                if (!speciesId || !COLLECTION_SPECIES_ID_SET.has(speciesId)) {
                    return;
                }

                const existingUnlockedAt = Math.max(
                    0,
                    Math.floor(Number(runtimeState.collection.unlockedAtBySpeciesId[speciesId]) || 0)
                );

                if (existingUnlockedAt > 0) {
                    return;
                }

                runtimeState.collection.unlockedAtBySpeciesId[speciesId] = fallbackUnlockedAt;
                changed = true;
            });
        });

        return changed;
    }

    function isUnlockPending(definition) {
        return Boolean(definition && definition.unlockPendingStory);
    }

    function hasStoryRequirement(definition) {
        return Boolean(definition && definition.unlockStoryId);
    }

    function hasMetStoryRequirement(definition, storyFlags) {
        if (isUnlockPending(definition)) {
            return false;
        }

        if (!hasStoryRequirement(definition)) {
            return true;
        }

        const storyId = normalizeStoryId(definition.unlockStoryId);
        return Boolean(storyId && storyFlags && storyFlags[storyId]);
    }

    function createDefaultHabitatState(definition, nowTs = Date.now()) {
        return {
            id: definition.id,
            unlocked: Boolean(definition.defaultUnlocked),
            unlockCostCoin: Math.max(0, Math.floor(Number(definition.unlockCostCoin) || 0)),
            tierId: balance.getTierById(definition.defaultTierId).id,
            ticketProgressSec: 0,
            storedTickets: 0,
            lastSyncAt: Math.max(0, Math.floor(Number(nowTs) || Date.now())),
            animals: balance.createStarterAnimals(definition.id)
        };
    }

    function createDefaultState() {
        const now = Date.now();
        const habitats = balance.getAllHabitatDefinitions().map((definition) => createDefaultHabitatState(definition, now));

        return {
            version: SAVE_VERSION,
            resources: {
                coin: 0,
                diamond: 0,
                playTicket: 0
            },
            ui: {
                activeHabitatId: habitats[0].id,
                activeTab: 'status',
                panelOpen: false
            },
            collection: {
                unlockedAtBySpeciesId: {},
                pendingGuideSpeciesId: '',
                lastViewedSpeciesId: ''
            },
            habitats,
            meta: {
                lastSettlement: null,
                lastTicketSpendAt: 0,
                storyFlags: {}
            }
        };
    }

    function safeParse(jsonText) {
        try {
            return JSON.parse(jsonText);
        } catch (error) {
            return null;
        }
    }

    function normalizeAnimal(rawAnimal, fallbackAnimal) {
        const baseAnimal = fallbackAnimal || {};
        return {
            id: String((rawAnimal && rawAnimal.id) || baseAnimal.id || ''),
            name: String((rawAnimal && rawAnimal.name) || baseAnimal.name || '小动物'),
            gender: String((rawAnimal && rawAnimal.gender) || baseAnimal.gender || '未知'),
            ageLabel: String((rawAnimal && rawAnimal.ageLabel) || baseAnimal.ageLabel || '未知'),
            hunger: balance.clampNumber((rawAnimal && rawAnimal.hunger) ?? baseAnimal.hunger ?? 85, 0, 100),
            thirst: balance.clampNumber((rawAnimal && rawAnimal.thirst) ?? baseAnimal.thirst ?? 85, 0, 100)
        };
    }

    function normalizeHabitat(rawHabitat, definition, fallbackHabitat) {
        const baseHabitat = fallbackHabitat || createDefaultHabitatState(definition);
        const fallbackAnimals = Array.isArray(baseHabitat.animals) ? baseHabitat.animals : [];
        const animalsInput = Array.isArray(rawHabitat && rawHabitat.animals)
            ? rawHabitat.animals
            : fallbackAnimals;

        return {
            id: definition.id,
            unlocked: Boolean((rawHabitat && rawHabitat.unlocked) ?? baseHabitat.unlocked),
            unlockCostCoin: Math.max(0, Math.floor(Number((rawHabitat && rawHabitat.unlockCostCoin) ?? definition.unlockCostCoin) || 0)),
            tierId: balance.getTierById((rawHabitat && rawHabitat.tierId) || baseHabitat.tierId).id,
            ticketProgressSec: Math.max(0, Number((rawHabitat && rawHabitat.ticketProgressSec) ?? baseHabitat.ticketProgressSec) || 0),
            storedTickets: Math.max(0, Math.floor(Number((rawHabitat && rawHabitat.storedTickets) ?? baseHabitat.storedTickets) || 0)),
            lastSyncAt: Math.max(0, Math.floor(Number((rawHabitat && rawHabitat.lastSyncAt) ?? baseHabitat.lastSyncAt) || baseHabitat.lastSyncAt)),
            animals: animalsInput.map((animal, index) => normalizeAnimal(animal, fallbackAnimals[index % Math.max(1, fallbackAnimals.length)]))
        };
    }

    function normalizeState(rawState) {
        const defaultState = createDefaultState();
        if (!rawState || typeof rawState !== 'object') {
            return defaultState;
        }

        const rawHabitatList = Array.isArray(rawState.habitats) ? rawState.habitats : [];
        const habitats = balance.getAllHabitatDefinitions().map((definition, index) => {
            const rawHabitat = rawHabitatList.find((item) => item && item.id === definition.id) || rawHabitatList[index] || null;
            return normalizeHabitat(rawHabitat, definition, defaultState.habitats[index]);
        });
        const activeHabitatId = String((rawState.ui && rawState.ui.activeHabitatId) || defaultState.ui.activeHabitatId);

        return {
            version: SAVE_VERSION,
            resources: {
                coin: Math.max(0, Math.floor(Number(rawState.resources && rawState.resources.coin) || 0)),
                diamond: Math.max(0, Math.floor(Number(rawState.resources && rawState.resources.diamond) || 0)),
                playTicket: Math.max(0, Math.floor(Number(rawState.resources && rawState.resources.playTicket) || 0))
            },
            ui: {
                activeHabitatId: habitats.some((habitat) => habitat.id === activeHabitatId) ? activeHabitatId : habitats[0].id,
                activeTab: ACTIVE_TABS.has(rawState.ui && rawState.ui.activeTab) ? rawState.ui.activeTab : defaultState.ui.activeTab,
                panelOpen: Boolean((rawState.ui && rawState.ui.panelOpen) ?? defaultState.ui.panelOpen)
            },
            collection: normalizeCollectionState(rawState.collection),
            habitats,
            meta: {
                lastSettlement: rawState.meta && rawState.meta.lastSettlement
                    ? {
                        coinReward: Math.max(0, Math.floor(Number(rawState.meta.lastSettlement.coinReward) || 0)),
                        diamondReward: Math.max(0, Math.floor(Number(rawState.meta.lastSettlement.diamondReward) || 0)),
                        at: Math.max(0, Math.floor(Number(rawState.meta.lastSettlement.at) || 0))
                    }
                    : null,
                lastTicketSpendAt: Math.max(0, Math.floor(Number(rawState.meta && rawState.meta.lastTicketSpendAt) || 0)),
                storyFlags: normalizeStoryFlags(rawState.meta && rawState.meta.storyFlags)
            }
        };
    }

    function loadStateForUser(userId) {
        const storageKey = getStorageKeyForUser(userId);
        if (!storageKey) {
            return createDefaultState();
        }

        try {
            const rawText = globalScope.localStorage.getItem(storageKey);
            return normalizeState(safeParse(rawText));
        } catch (error) {
            return createDefaultState();
        }
    }

    function saveStateForUser(userId, state) {
        const storageKey = getStorageKeyForUser(userId);
        if (!storageKey) {
            return;
        }

        try {
            globalScope.localStorage.setItem(storageKey, JSON.stringify(state));
        } catch (error) {
            return;
        }
    }

    function getHabitatById(habitatId) {
        const targetId = String(habitatId || runtimeState.ui.activeHabitatId || '');
        return runtimeState.habitats.find((habitat) => habitat.id === targetId) || runtimeState.habitats[0];
    }

    function getSelectedHabitat() {
        return getHabitatById(runtimeState.ui.activeHabitatId);
    }

    function getTotalTicketCap() {
        return runtimeState.habitats.reduce((sum, habitat) => {
            if (!habitat.unlocked) return sum;
            return sum + balance.getTierById(habitat.tierId).ticketCap;
        }, 0);
    }

    function getTotalStoredTickets() {
        return runtimeState.habitats.reduce((sum, habitat) => {
            if (!habitat.unlocked) return sum;
            return sum + Math.max(0, Math.floor(Number(habitat.storedTickets) || 0));
        }, 0);
    }

    function deriveHabitatMetrics(habitat) {
        const definition = balance.getHabitatDefinition(habitat.id);
        const tier = balance.getTierById(habitat.tierId);
        const animals = Array.isArray(habitat.animals) ? habitat.animals : [];
        const residentCount = animals.length;
        const capacity = tier.capacity;
        const occupancyRatio = capacity > 0 ? residentCount / capacity : 1;
        const averageHunger = residentCount > 0
            ? animals.reduce((sum, animal) => sum + balance.clampNumber(animal.hunger, 0, 100), 0) / residentCount
            : 100;
        const averageThirst = residentCount > 0
            ? animals.reduce((sum, animal) => sum + balance.clampNumber(animal.thirst, 0, 100), 0) / residentCount
            : 100;

        const cleanliness = balance.clampNumber(
            92
            - (occupancyRatio * 18)
            - (Math.max(0, 80 - averageHunger) * 0.16)
            - (Math.max(0, 80 - averageThirst) * 0.14)
            + (definition.baseMoodBonus * 0.45)
            + (tier.moodBonus * 0.3),
            18,
            100
        );
        const environment = balance.clampNumber(tier.environment, 0, 100);
        const health = balance.clampNumber(
            (cleanliness * 0.2)
            + (averageHunger * 0.24)
            + (averageThirst * 0.2)
            + (environment * 0.2)
            + (tier.moodBonus * 0.8),
            12,
            100
        );
        const mood = balance.clampNumber(
            (cleanliness * 0.16)
            + (averageHunger * 0.22)
            + (averageThirst * 0.18)
            + (environment * 0.22)
            + (health * 0.22)
            + definition.baseMoodBonus
            + tier.moodBonus,
            10,
            100
        );

        const ticketMultiplier = balance.getMoodTicketMultiplier(mood);
        const effectiveTicketIntervalSec = Math.max(45, Math.round(tier.ticketIntervalSec / ticketMultiplier));

        return {
            residentCount,
            capacity,
            mood: Math.round(mood),
            moodLabel: balance.getMoodLabel(mood),
            feedCost: balance.computeFeedCost(animals),
            ticketMultiplier,
            ticketEfficiencyLabel: balance.getTicketEfficiencyLabel(ticketMultiplier),
            effectiveTicketIntervalSec,
            statusMetrics: {
                cleanliness: Math.round(cleanliness),
                food: Math.round(averageHunger),
                water: Math.round(averageThirst),
                environment: Math.round(environment),
                health: Math.round(health)
            }
        };
    }

    function syncHabitatWithTime(habitat, nowTs) {
        const safeNow = Math.max(0, Math.floor(Number(nowTs) || Date.now()));
        if (!habitat.unlocked) {
            habitat.lastSyncAt = safeNow;
            return false;
        }

        const definition = balance.getHabitatDefinition(habitat.id);
        const tier = balance.getTierById(habitat.tierId);
        const lastSyncAt = Math.max(0, Math.floor(Number(habitat.lastSyncAt) || safeNow));
        const elapsedSec = Math.max(0, Math.floor((safeNow - lastSyncAt) / 1000));
        if (elapsedSec <= 0) {
            habitat.lastSyncAt = safeNow;
            return false;
        }

        let changed = false;
        habitat.animals = habitat.animals.map((animal) => {
            const nextHunger = balance.clampNumber(animal.hunger - (elapsedSec * definition.hungerDecayPerSec), 0, 100);
            const nextThirst = balance.clampNumber(animal.thirst - (elapsedSec * definition.thirstDecayPerSec), 0, 100);
            if (nextHunger !== animal.hunger || nextThirst !== animal.thirst) {
                changed = true;
            }
            return {
                ...animal,
                hunger: nextHunger,
                thirst: nextThirst
            };
        });

        const metrics = deriveHabitatMetrics(habitat);
        const totalTicketCap = Math.max(1, getTotalTicketCap());
        const effectiveIntervalSec = Math.max(45, metrics.effectiveTicketIntervalSec);

        if ((runtimeState.resources.playTicket + getTotalStoredTickets()) < totalTicketCap && habitat.storedTickets < tier.ticketCap) {
            habitat.ticketProgressSec += elapsedSec;
            while (
                habitat.ticketProgressSec >= effectiveIntervalSec &&
                (runtimeState.resources.playTicket + getTotalStoredTickets()) < totalTicketCap &&
                habitat.storedTickets < tier.ticketCap
            ) {
                habitat.storedTickets += 1;
                habitat.ticketProgressSec -= effectiveIntervalSec;
                changed = true;
            }
        } else {
            habitat.ticketProgressSec = Math.min(habitat.ticketProgressSec, Math.max(0, effectiveIntervalSec - 1));
        }

        habitat.lastSyncAt = safeNow;
        return changed;
    }

    function syncAll(nowTs = Date.now()) {
        let changed = false;
        runtimeState.habitats.forEach((habitat) => {
            changed = syncHabitatWithTime(habitat, nowTs) || changed;
        });
        changed = syncCollectionUnlocksFromPlayedStories(nowTs) || changed;
        return changed;
    }

    function createAnimalSnapshot(animal) {
        return {
            ...animal,
            hunger: Math.round(balance.clampNumber(animal.hunger, 0, 100)),
            thirst: Math.round(balance.clampNumber(animal.thirst, 0, 100)),
            hungerLabel: balance.getNeedLabel(animal.hunger),
            thirstLabel: balance.getNeedLabel(animal.thirst)
        };
    }

    function createHabitatSnapshot(habitat) {
        const definition = balance.getHabitatDefinition(habitat.id);
        const tier = balance.getTierById(habitat.tierId);
        const nextTier = balance.getNextTier(habitat.tierId);
        const metrics = deriveHabitatMetrics(habitat);
        const storyFlags = normalizeStoryFlags(runtimeState.meta && runtimeState.meta.storyFlags);
        const storyRequirementMet = hasMetStoryRequirement(definition, storyFlags);
        const unlockStoryId = normalizeStoryId(definition.unlockStoryId);
        const unlockStoryLabel = String(definition.unlockStoryLabel || unlockStoryId || '').trim();
        const unlockPending = isUnlockPending(definition);
        const totalTicketCap = Math.max(1, getTotalTicketCap());
        const totalBufferedTickets = runtimeState.resources.playTicket + getTotalStoredTickets();
        const ticketPoolFull = totalBufferedTickets >= totalTicketCap;
        const ticketSecondsLeft = habitat.unlocked && !ticketPoolFull
            ? Math.max(0, Math.ceil(metrics.effectiveTicketIntervalSec - habitat.ticketProgressSec))
            : 0;
        const animals = habitat.animals.map(createAnimalSnapshot);
        const claimableTickets = Math.max(0, Math.floor(Number(habitat.storedTickets) || 0));

        return {
            id: habitat.id,
            name: definition.name,
            speciesLabel: definition.speciesLabel,
            tagline: definition.tagline,
            cardGlyph: definition.cardGlyph,
            cardSceneLabel: definition.cardSceneLabel,
            artTheme: definition.artTheme,
            sceneAsset: definition.sceneAsset || '',
            sceneAlt: definition.sceneAlt || '',
            sceneBadge: definition.sceneBadge || '',
            appearanceTitle: definition.appearanceTitle || definition.tagline,
            stageAssets: definition.stageAssets || {},
            unlocked: habitat.unlocked,
            unlockCostCoin: habitat.unlockCostCoin,
            unlockStoryId,
            unlockStoryLabel,
            isStoryLocked: !habitat.unlocked && (!storyRequirementMet || unlockPending),
            canUnlock: !habitat.unlocked && !unlockPending && storyRequirementMet && runtimeState.resources.coin >= habitat.unlockCostCoin,
            unlockActionText: unlockPending
                ? '暂未开放'
                : (!storyRequirementMet
                    ? `完成${unlockStoryLabel || '对应剧情'}后解锁`
                    : `解锁栖息地 · ${habitat.unlockCostCoin} 金币`),
            tier,
            nextTier,
            residentCount: metrics.residentCount,
            capacity: metrics.capacity,
            mood: metrics.mood,
            moodLabel: metrics.moodLabel,
            feedCost: metrics.feedCost,
            ticketMultiplier: metrics.ticketMultiplier,
            ticketEfficiencyLabel: metrics.ticketEfficiencyLabel,
            ticketIntervalSec: metrics.effectiveTicketIntervalSec,
            ticketBaseIntervalSec: tier.ticketIntervalSec,
            ticketSummary: habitat.unlocked
                ? `${metrics.ticketEfficiencyLabel} · 每 ${Math.max(1, Math.round(metrics.effectiveTicketIntervalSec / 60))} 分钟产出 1 张盲盒券`
                : `解锁后每 ${Math.max(1, Math.round(tier.ticketIntervalSec / 60))} 分钟产出 1 张盲盒券`,
            ticketProgressPct: habitat.unlocked
                ? (ticketPoolFull ? 100 : Math.round((habitat.ticketProgressSec / Math.max(1, metrics.effectiveTicketIntervalSec)) * 100))
                : 0,
            ticketCountdownText: habitat.unlocked
                ? (ticketPoolFull ? '盲盒券库存已满' : `下一张券 ${balance.formatDuration(ticketSecondsLeft)}`)
                : '解锁后开始自动产券',
            claimableTickets,
            hasClaimableTickets: claimableTickets > 0,
            totalTicketCap,
            statusMetrics: metrics.statusMetrics,
            animals,
            lockDescription: habitat.unlocked
                ? ''
                : (unlockPending
                    ? `${definition.name} 暂未开放，后续会改为指定剧情解锁。`
                    : (!storyRequirementMet
                        ? `完成${unlockStoryLabel || '对应剧情'}后，${definition.name}才会开放，小动物也会正式入住。`
                        : `消耗 ${habitat.unlockCostCoin} 金币解锁后，小动物会正式入住，并开始自动产出 ${balance.SLOT_THEME.ticketName}。`))
        };
    }

    function createCollectionSnapshot() {
        const collectionState = normalizeCollectionState(runtimeState.collection);
        const pendingGuideSpeciesId = collectionState.pendingGuideSpeciesId;
        const lastViewedSpeciesId = collectionState.lastViewedSpeciesId;
        const species = COLLECTION_SPECIES_DEFINITIONS.map((definition, index) => {
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
            lastViewedSpeciesId
        };
    }

    function getSnapshot() {
        syncAll(Date.now());
        const selectedHabitat = createHabitatSnapshot(getSelectedHabitat());
        const habitats = runtimeState.habitats.map(createHabitatSnapshot);
        const collection = createCollectionSnapshot();

        return {
            user: {
                id: activeUserId,
                loggedIn: Boolean(activeUserId)
            },
            resources: { ...runtimeState.resources },
            ui: { ...runtimeState.ui },
            storyFlags: { ...(runtimeState.meta.storyFlags || {}) },
            slotTheme: { ...balance.SLOT_THEME },
            collection,
            habitats,
            selectedHabitat,
            habitat: selectedHabitat,
            lastSettlement: runtimeState.meta.lastSettlement
                ? { ...runtimeState.meta.lastSettlement }
                : null
        };
    }

    function emitChange(reason) {
        syncAll(Date.now());
        saveStateForUser(activeUserId, runtimeState);
        const snapshot = getSnapshot();
        listeners.forEach((listener) => {
            try {
                listener(snapshot, { reason });
            } catch (error) {
                return;
            }
        });
    }

    function subscribe(listener) {
        if (typeof listener !== 'function') {
            return function noop() {};
        }
        listeners.add(listener);
        listener(getSnapshot(), { reason: 'subscribe' });
        return function unsubscribe() {
            listeners.delete(listener);
        };
    }

    function setPanelOpen(isOpen) {
        runtimeState.ui.panelOpen = Boolean(isOpen);
        emitChange('panel-toggle');
        return getSnapshot();
    }

    function setActiveTab(tabId) {
        runtimeState.ui.activeTab = ACTIVE_TABS.has(tabId) ? tabId : 'status';
        emitChange('tab-change');
        return getSnapshot();
    }

    function openHabitatPanel(habitatId) {
        runtimeState.ui.activeHabitatId = getHabitatById(habitatId).id;
        runtimeState.ui.panelOpen = true;
        emitChange('open-habitat');
        return getSnapshot();
    }

    function collectHabitatTickets(habitatId) {
        syncAll(Date.now());
        const habitat = getHabitatById(habitatId);
        const claimableTickets = Math.max(0, Math.floor(Number(habitat.storedTickets) || 0));

        if (claimableTickets <= 0) {
            return {
                ok: false,
                code: 'empty',
                claimedTickets: 0,
                message: '当前没有可领取的盲盒券。'
            };
        }

        habitat.storedTickets = 0;
        runtimeState.resources.playTicket += claimableTickets;
        emitChange('collect-tickets');

        return {
            ok: true,
            code: 'success',
            claimedTickets: claimableTickets,
            message: `领取成功，获得 ${claimableTickets} 张 ${balance.SLOT_THEME.ticketName}。`
        };
    }

    function canStartFreshRound() {
        syncAll(Date.now());
        return runtimeState.resources.playTicket > 0;
    }

    function consumePlayTicket() {
        syncAll(Date.now());
        if (runtimeState.resources.playTicket <= 0) {
            emitChange('ticket-empty');
            return false;
        }

        runtimeState.resources.playTicket -= 1;
        runtimeState.meta.lastTicketSpendAt = Date.now();
        emitChange('ticket-consumed');
        return true;
    }

    function applySlotSettlement(result = {}) {
        syncAll(Date.now());
        const coinReward = Math.max(0, Math.floor(Number(result.coinReward) || 0));
        const diamondReward = Math.max(0, Math.floor(Number(result.diamondReward) || 0));
        runtimeState.resources.coin += coinReward;
        runtimeState.resources.diamond += diamondReward;
        runtimeState.meta.lastSettlement = {
            coinReward,
            diamondReward,
            at: Date.now()
        };
        emitChange('settlement');
        return getSnapshot();
    }

    function hasPlayedStory(storyId) {
        syncAll(Date.now());
        const targetId = normalizeStoryId(storyId);
        if (!targetId) {
            return false;
        }

        return Boolean(runtimeState.meta && runtimeState.meta.storyFlags && runtimeState.meta.storyFlags[targetId]);
    }

    function markStoryPlayed(storyId, played = true) {
        syncAll(Date.now());
        const targetId = normalizeStoryId(storyId);
        if (!targetId) {
            return false;
        }

        if (!runtimeState.meta || typeof runtimeState.meta !== 'object') {
            runtimeState.meta = {};
        }

        if (!runtimeState.meta.storyFlags || typeof runtimeState.meta.storyFlags !== 'object') {
            runtimeState.meta.storyFlags = {};
        }

        runtimeState.meta.storyFlags[targetId] = Boolean(played);
        emitChange('story-flag');
        return true;
    }

    function unlockCollectionSpecies(speciesId, options = {}) {
        syncAll(Date.now());
        const normalizedSpeciesId = normalizeCollectionSpeciesId(speciesId);
        const definition = getCollectionSpeciesDefinition(normalizedSpeciesId);
        if (!definition) {
            return {
                ok: false,
                code: 'unknown-species',
                speciesId: normalizedSpeciesId,
                message: '未找到对应的图鉴物种。'
            };
        }

        if (!runtimeState.collection || typeof runtimeState.collection !== 'object') {
            runtimeState.collection = normalizeCollectionState(null);
        }

        if (!runtimeState.collection.unlockedAtBySpeciesId || typeof runtimeState.collection.unlockedAtBySpeciesId !== 'object') {
            runtimeState.collection.unlockedAtBySpeciesId = {};
        }

        const existingUnlockedAt = Math.max(
            0,
            Math.floor(Number(runtimeState.collection.unlockedAtBySpeciesId[normalizedSpeciesId]) || 0)
        );

        if (existingUnlockedAt > 0) {
            return {
                ok: true,
                code: 'already-unlocked',
                speciesId: normalizedSpeciesId,
                speciesName: definition.name,
                unlockedAt: existingUnlockedAt,
                unlockedNow: false,
                pendingGuideSpeciesId: runtimeState.collection.pendingGuideSpeciesId || '',
                message: `${definition.name} 已经解锁。`
            };
        }

        const unlockedAt = Math.max(0, Math.floor(Number(options.unlockedAt) || Date.now()));
        runtimeState.collection.unlockedAtBySpeciesId[normalizedSpeciesId] = unlockedAt;
        runtimeState.collection.lastViewedSpeciesId = '';

        if (options.setGuidePending !== false) {
            runtimeState.collection.pendingGuideSpeciesId = normalizedSpeciesId;
        }

        emitChange('collection-unlock');
        return {
            ok: true,
            code: 'success',
            speciesId: normalizedSpeciesId,
            speciesName: definition.name,
            unlockedAt,
            unlockedNow: true,
            pendingGuideSpeciesId: runtimeState.collection.pendingGuideSpeciesId || '',
            message: `${definition.name} 图鉴已解锁。`
        };
    }

    function clearCollectionGuide(speciesId) {
        syncAll(Date.now());
        if (!runtimeState.collection || typeof runtimeState.collection !== 'object') {
            runtimeState.collection = normalizeCollectionState(null);
        }

        const normalizedSpeciesId = normalizeCollectionSpeciesId(speciesId);
        const currentPendingSpeciesId = normalizeCollectionSpeciesId(runtimeState.collection.pendingGuideSpeciesId);
        if (normalizedSpeciesId && currentPendingSpeciesId && normalizedSpeciesId !== currentPendingSpeciesId) {
            return false;
        }

        if (!currentPendingSpeciesId) {
            return false;
        }

        runtimeState.collection.pendingGuideSpeciesId = '';
        emitChange('collection-guide-clear');
        return true;
    }

    function markCollectionSpeciesViewed(speciesId) {
        syncAll(Date.now());
        const normalizedSpeciesId = normalizeCollectionSpeciesId(speciesId);
        if (!getCollectionSpeciesDefinition(normalizedSpeciesId)) {
            return false;
        }

        if (!runtimeState.collection || typeof runtimeState.collection !== 'object') {
            runtimeState.collection = normalizeCollectionState(null);
        }

        runtimeState.collection.lastViewedSpeciesId = normalizedSpeciesId;
        emitChange('collection-view');
        return true;
    }

    function unlockSelectedHabitat() {
        syncAll(Date.now());
        const habitat = getSelectedHabitat();
        const habitatDefinition = balance.getHabitatDefinition(habitat.id);
        const storyFlags = normalizeStoryFlags(runtimeState.meta && runtimeState.meta.storyFlags);

        if (habitat.unlocked) {
            return {
                ok: false,
                code: 'already-unlocked',
                message: `${habitatDefinition.name} 已经解锁。`
            };
        }

        if (isUnlockPending(habitatDefinition)) {
            return {
                ok: false,
                code: 'unlock-pending',
                message: `${habitatDefinition.name} 暂未开放，解锁剧情还没配置。`
            };
        }

        if (!hasMetStoryRequirement(habitatDefinition, storyFlags)) {
            return {
                ok: false,
                code: 'story-locked',
                message: `${habitatDefinition.name} 需要先完成${habitatDefinition.unlockStoryLabel || '对应剧情'}。`
            };
        }

        if (runtimeState.resources.coin < habitat.unlockCostCoin) {
            return {
                ok: false,
                code: 'coin-shortage',
                message: `金币不足，还差 ${habitat.unlockCostCoin - runtimeState.resources.coin} 金币。`
            };
        }

        runtimeState.resources.coin -= habitat.unlockCostCoin;
        habitat.unlocked = true;
        habitat.ticketProgressSec = 0;
        habitat.storedTickets = 0;
        habitat.lastSyncAt = Date.now();
        emitChange('unlock-habitat');

        return {
            ok: true,
            code: 'success',
            message: `${habitatDefinition.name} 已解锁。`
        };
    }

    function login(userId) {
        const normalized = normalizeUserId(userId);
        if (!normalized) {
            return {
                ok: false,
                code: 'invalid-user-id',
                message: '请输入有效的用户 ID。'
            };
        }

        activeUserId = normalized;
        persistActiveUserId(activeUserId);
        runtimeState = loadStateForUser(activeUserId);
        syncAll(Date.now());
        emitChange('login');

        return {
            ok: true,
            code: 'success',
            userId: activeUserId,
            snapshot: getSnapshot()
        };
    }

    function debugGrantResources(payload = {}) {
        const targetUserId = normalizeUserId(payload.userId);
        if (!targetUserId) {
            return {
                ok: false,
                code: 'invalid-user-id',
                message: '请输入要修改的用户 ID。'
            };
        }

        const coin = Math.max(0, Math.floor(Number(payload.coin) || 0));
        const diamond = Math.max(0, Math.floor(Number(payload.diamond) || 0));
        const playTicket = Math.max(0, Math.floor(Number(payload.playTicket) || 0));

        if ((coin + diamond + playTicket) <= 0) {
            return {
                ok: false,
                code: 'empty-grant',
                message: '请至少填写一种要增加的资源数量。'
            };
        }

        const targetState = loadStateForUser(targetUserId);
        targetState.resources.coin += coin;
        targetState.resources.diamond += diamond;
        targetState.resources.playTicket += playTicket;
        saveStateForUser(targetUserId, targetState);

        if (targetUserId === activeUserId) {
            runtimeState = targetState;
            emitChange('debug-grant');
        }

        return {
            ok: true,
            code: 'success',
            userId: targetUserId,
            added: {
                coin,
                diamond,
                playTicket
            },
            message: `已为 ${targetUserId} 增加资源：金币 ${coin}，钻石 ${diamond}，盲盒券 ${playTicket}。`
        };
    }

    function feedSelectedHabitatAnimals() {
        syncAll(Date.now());
        const habitat = getSelectedHabitat();
        const habitatDefinition = balance.getHabitatDefinition(habitat.id);

        if (!habitat.unlocked) {
            return {
                ok: false,
                code: 'locked',
                message: `${habitatDefinition.name} 尚未解锁。`
            };
        }

        const feedCost = deriveHabitatMetrics(habitat).feedCost;
        if (feedCost <= 0) {
            return {
                ok: false,
                code: 'not-needed',
                message: `${habitatDefinition.speciesLabel} 们状态很好，暂时无需喂食。`
            };
        }

        if (runtimeState.resources.coin < feedCost) {
            return {
                ok: false,
                code: 'coin-shortage',
                message: `金币不足，还差 ${feedCost - runtimeState.resources.coin} 金币。`
            };
        }

        runtimeState.resources.coin -= feedCost;
        habitat.animals = habitat.animals.map((animal) => ({
            ...animal,
            hunger: 100,
            thirst: 100
        }));
        habitat.lastSyncAt = Date.now();
        emitChange('feed');

        return {
            ok: true,
            code: 'success',
            cost: feedCost,
            message: `已为 ${habitatDefinition.speciesLabel} 完成一键喂食，消耗 ${feedCost} 金币。`
        };
    }

    function upgradeSelectedHabitatTier() {
        syncAll(Date.now());
        const habitat = getSelectedHabitat();
        const habitatDefinition = balance.getHabitatDefinition(habitat.id);

        if (!habitat.unlocked) {
            return {
                ok: false,
                code: 'locked',
                message: `${habitatDefinition.name} 尚未解锁。`
            };
        }

        const nextTier = balance.getNextTier(habitat.tierId);
        if (!nextTier) {
            return {
                ok: false,
                code: 'max-tier',
                message: '当前已经是最高等级栏舍。'
            };
        }

        if (runtimeState.resources.diamond < nextTier.diamondCost) {
            return {
                ok: false,
                code: 'diamond-shortage',
                message: `钻石不足，还差 ${nextTier.diamondCost - runtimeState.resources.diamond} 钻石。`
            };
        }

        runtimeState.resources.diamond -= nextTier.diamondCost;
        habitat.tierId = nextTier.id;
        habitat.ticketProgressSec = Math.max(0, Math.min(habitat.ticketProgressSec, nextTier.ticketIntervalSec - 1));
        habitat.lastSyncAt = Date.now();
        emitChange('upgrade-tier');

        return {
            ok: true,
            code: 'success',
            tierId: nextTier.id,
            message: `${habitatDefinition.name} 已升级为 ${nextTier.label}。`
        };
    }

    function startClock() {
        if (tickTimerId) {
            return;
        }

        tickTimerId = globalScope.setInterval(() => {
            const changed = syncAll(Date.now());
            if (changed) {
                emitChange('tick');
            }
        }, 1000);

        if (!visibilityHandlerBound) {
            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'visible') {
                    syncAll(Date.now());
                    emitChange('visibility');
                }
            });
            visibilityHandlerBound = true;
        }
    }

    const initialUserBootstrap = ensureInitialActiveUserId();
    let autoAssignedUserId = initialUserBootstrap.autoAssigned ? initialUserBootstrap.userId : '';
    let activeUserId = initialUserBootstrap.userId;
    let runtimeState = loadStateForUser(activeUserId);
    startClock();

    globalScope.WynneZooEconomy = {
        getSnapshot,
        subscribe,
        login,
        getActiveUserId() {
            return activeUserId;
        },
        getLastUserId() {
            return loadLastActiveUserId();
        },
        consumeAutoAssignedUserId() {
            const userId = autoAssignedUserId;
            autoAssignedUserId = '';
            return userId;
        },
        setPanelOpen,
        setActiveTab,
        openHabitatPanel,
        collectHabitatTickets,
        canStartFreshRound,
        consumePlayTicket,
        applySlotSettlement,
        hasPlayedStory,
        markStoryPlayed,
        unlockCollectionSpecies,
        clearCollectionGuide,
        markCollectionSpeciesViewed,
        unlockSelectedHabitat,
        feedSelectedHabitatAnimals,
        upgradeSelectedHabitatTier,
        debugGrantResources
    };

    // 注册到模块中心
    if (globalScope.WynneRegistry) {
        globalScope.WynneRegistry.register('WynneZooEconomy', globalScope.WynneZooEconomy);
    }
}(window));
