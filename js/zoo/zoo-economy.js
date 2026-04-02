(function initZooEconomy(globalScope) {
    'use strict';

    const balance = globalScope.WynneZooBalance || null;
    if (!balance) {
        return;
    }

    const STORAGE_PREFIX = 'wynnesZoo.zooEconomy.user.';
    const ACTIVE_USER_STORAGE_KEY = 'wynnesZoo.activeUserId';
    const SAVE_VERSION = 7;
    const DEFAULT_USER_ID_PREFIX = 'guest';
    const ACTIVE_TABS = new Set(['status', 'animals', 'environment', 'appearance']);
    const HABITAT_BUILD_DURATION_MS = 2000;
    const listeners = new Set();
    let tickTimerId = 0;
    let visibilityHandlerBound = false;
    const COLLECTION_REDPANDA_CARD_IMAGE_SRC = './Texture/UI/Collection/图鉴_小熊猫.webp';
    const COLLECTION_NORTHEAST_TIGER_CARD_IMAGE_SRC = './Texture/UI/Collection/图鉴_东北虎.webp';
    const COLLECTION_ASIAN_ELEPHANT_CARD_IMAGE_SRC = './Texture/UI/Collection/图鉴_亚洲象.webp';
    const COLLECTION_PENGUIN_CARD_IMAGE_SRC = './Texture/UI/Collection/图鉴_企鹅.webp';
    const COLLECTION_GIANT_PANDA_CARD_IMAGE_SRC = './Texture/UI/Collection/图鉴_大熊猫.webp';
    const COLLECTION_SLOTH_CARD_IMAGE_SRC = './Texture/UI/Collection/图鉴_树懒.webp';
    const COLLECTION_GOLDEN_SNUB_NOSED_MONKEY_CARD_IMAGE_SRC = './Texture/UI/Collection/图鉴_金丝猴.webp';
    const COLLECTION_GIRAFFE_CARD_IMAGE_SRC = './Texture/UI/Collection/图鉴_长颈鹿.webp';
    const COLLECTION_SNOW_LEOPARD_CARD_IMAGE_SRC = './Texture/UI/Collection/图鉴_雪豹.webp';
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
            id: 'northeast-tiger',
            name: '东北虎',
            rarity: '濒危',
            imageSrc: COLLECTION_NORTHEAST_TIGER_CARD_IMAGE_SRC,
            imageAlt: '东北虎图鉴立绘',
            summary: '体型健硕的森林顶级猎手，步伐安静却极具压迫感。',
            traits: '独居巡猎、爆发力强、冬季会长出更厚的被毛。',
            habitat: '偏好针阔混交林、山地林区与水源充足的寒温带森林。',
            detailImageSrc: COLLECTION_NORTHEAST_TIGER_CARD_IMAGE_SRC,
            detailImageAlt: '东北虎动物详情立绘',
            detailDescription: '东北虎是现存体型最大的猫科动物之一，主要分布在中国东北和俄罗斯远东的森林地带。它们需要广阔而连续的领地来完成巡猎、繁殖和育幼，对栖息地完整性与野生猎物数量都非常敏感。',
            iucnText: 'IUCN 红色名录濒危 (EN)，属重点保护物种',
            populationText: '约600只',
            temperatureText: '-30-20度',
            socialText: '独居',
            placeholder: false
        },
        {
            id: 'asian-elephant',
            name: '亚洲象',
            rarity: '濒危',
            imageSrc: COLLECTION_ASIAN_ELEPHANT_CARD_IMAGE_SRC,
            imageAlt: '亚洲象图鉴立绘',
            summary: '沉稳而聪明的巨型草食动物，记忆力和家庭意识都很强。',
            traits: '母系家族、长距离迁移、会用鼻子完成取食和交流。',
            habitat: '适合热带雨林、季雨林与拥有稳定水源的草木混生地带。',
            detailImageSrc: COLLECTION_ASIAN_ELEPHANT_CARD_IMAGE_SRC,
            detailImageAlt: '亚洲象动物详情立绘',
            detailDescription: '亚洲象是亚洲现存最大的陆生哺乳动物，通常以母象为核心组成家族群体活动。它们每日需要大量食物和饮水，对迁徙通道和森林连通性依赖极高，栖息地缩减会直接影响种群延续。',
            iucnText: 'IUCN 红色名录濒危 (EN)，栖息地破碎化压力显著',
            populationText: '约40000-50000只',
            temperatureText: '18-35度',
            socialText: '群居',
            placeholder: false
        },
        {
            id: 'penguin',
            name: '企鹅',
            rarity: '罕见',
            imageSrc: COLLECTION_PENGUIN_CARD_IMAGE_SRC,
            imageAlt: '企鹅图鉴立绘',
            summary: '擅长在寒冷海域穿梭，走起路来摇摆可爱却很有耐力。',
            traits: '善游泳、群体繁殖、羽毛致密可有效隔绝冷水。',
            habitat: '多见于寒冷海岸、岛屿冰缘地带以及周边海域。',
            detailImageSrc: COLLECTION_PENGUIN_CARD_IMAGE_SRC,
            detailImageAlt: '企鹅动物详情立绘',
            detailDescription: '企鹅并不是单一物种，而是一类高度适应海洋生活的不会飞的鸟类。它们依靠流线型身体和密集羽毛在低温海域中潜游觅食，繁殖时往往会聚成庞大群落，以群体协作提升幼崽存活率。',
            iucnText: '不同企鹅物种保育等级差异较大，需关注海冰与食物链变化',
            populationText: '南半球多种群合计数百万只',
            temperatureText: '-40-15度',
            socialText: '群居',
            placeholder: false
        },
        {
            id: 'giant-panda',
            name: '大熊猫',
            rarity: '易危',
            imageSrc: COLLECTION_GIANT_PANDA_CARD_IMAGE_SRC,
            imageAlt: '大熊猫图鉴立绘',
            summary: '以竹子为主食，动作看起来慢悠悠，却有很强的攀爬能力。',
            traits: '偏食竹类、独居、会通过气味与声音划分活动范围。',
            habitat: '适宜高山竹林、湿润山地与季节分明的温带森林。',
            detailImageSrc: COLLECTION_GIANT_PANDA_CARD_IMAGE_SRC,
            detailImageAlt: '大熊猫动物详情立绘',
            detailDescription: '大熊猫是中国最具代表性的珍稀动物之一，主要分布在四川、陕西和甘肃的高山竹林。它们虽然属于食肉目，却高度依赖竹类为主食，因此对竹林面积、连通性和季节性食物更替都十分敏感。',
            iucnText: 'IUCN 红色名录易危 (VU)，保护成效持续向好',
            populationText: '约1900只',
            temperatureText: '2-25度',
            socialText: '独居',
            placeholder: false
        },
        {
            id: 'sloth',
            name: '树懒',
            rarity: '罕见',
            imageSrc: COLLECTION_SLOTH_CARD_IMAGE_SRC,
            imageAlt: '树懒图鉴立绘',
            summary: '动作缓慢却非常稳定，擅长长时间倒挂在树冠间休息。',
            traits: '新陈代谢慢、善于伪装、一天中大部分时间都在树上。',
            habitat: '偏好湿润热带雨林、树冠层发达且植被茂密的环境。',
            detailImageSrc: COLLECTION_SLOTH_CARD_IMAGE_SRC,
            detailImageAlt: '树懒动物详情立绘',
            detailDescription: '树懒是中南美洲热带雨林中的典型树栖哺乳动物，以极慢的动作节奏和低代谢著称。它们依赖茂密树冠提供食物与隐蔽空间，毛发表面还会生长藻类，帮助自己更好地融入森林环境。',
            iucnText: '不同树懒物种保育状态不一，森林保护尤为关键',
            populationText: '多物种总量尚存，局部种群下降明显',
            temperatureText: '20-32度',
            socialText: '独居',
            placeholder: false
        },
        {
            id: 'golden-snub-nosed-monkey',
            name: '金丝猴',
            rarity: '濒危',
            imageSrc: COLLECTION_GOLDEN_SNUB_NOSED_MONKEY_CARD_IMAGE_SRC,
            imageAlt: '金丝猴图鉴立绘',
            summary: '金色长毛十分醒目，群体协作和高山适应能力都很出色。',
            traits: '群居、耐寒、擅长在陡峭林地间跳跃移动。',
            habitat: '主要生活在海拔较高、气候寒冷的山地针阔混交林。',
            detailImageSrc: COLLECTION_GOLDEN_SNUB_NOSED_MONKEY_CARD_IMAGE_SRC,
            detailImageAlt: '金丝猴动物详情立绘',
            detailDescription: '金丝猴是中国特有的珍稀灵长类动物之一，拥有柔长而华丽的被毛，可以帮助它们在寒冷高山环境中保温。它们通常以复杂群体结构活动，依赖完整森林提供食物、庇护与迁移通道。',
            iucnText: 'IUCN 红色名录濒危 (EN)，属国家一级保护动物',
            populationText: '野外约数万只，不同种群差异明显',
            temperatureText: '-10-20度',
            socialText: '群居',
            placeholder: false
        },
        {
            id: 'giraffe',
            name: '长颈鹿',
            rarity: '普通',
            imageSrc: COLLECTION_GIRAFFE_CARD_IMAGE_SRC,
            imageAlt: '长颈鹿图鉴立绘',
            summary: '拥有极佳视野和修长脖颈，总能先一步发现远处动静。',
            traits: '高处取食、奔跑速度快、斑纹像指纹一样各不相同。',
            habitat: '常见于稀树草原、灌木草地与水源分布稳定的开阔区域。',
            detailImageSrc: COLLECTION_GIRAFFE_CARD_IMAGE_SRC,
            detailImageAlt: '长颈鹿动物详情立绘',
            detailDescription: '长颈鹿是现存最高的陆生动物，依靠修长脖颈取食高处枝叶，也能在开阔草原中提前观察风险。它们通常以松散群体活动，需要较大的觅食空间和稳定的植被结构来维持种群健康。',
            iucnText: 'IUCN 红色名录无危 (LC)，但部分亚种保护压力仍然较高',
            populationText: '约117000只',
            temperatureText: '18-35度',
            socialText: '松散群居',
            placeholder: false
        },
        {
            id: 'snow-leopard',
            name: '雪豹',
            rarity: '易危',
            imageSrc: COLLECTION_SNOW_LEOPARD_CARD_IMAGE_SRC,
            imageAlt: '雪豹图鉴立绘',
            summary: '行动隐秘的高山猎手，善于在岩壁与雪坡间无声移动。',
            traits: '跳跃能力强、独居、尾巴粗长能帮助保持平衡与保暖。',
            habitat: '生活在高寒山地、裸岩峭壁和稀疏灌丛地带。',
            detailImageSrc: COLLECTION_SNOW_LEOPARD_CARD_IMAGE_SRC,
            detailImageAlt: '雪豹动物详情立绘',
            detailDescription: '雪豹被称为高山生态系统中的隐秘猎手，主要分布在高海拔寒冷山区。它们依靠厚密皮毛和长尾适应低温环境，行动范围广，通常独自巡游领地。',
            iucnText: 'IUCN 红色名录易危 (VU)，需长期保护高山栖息地',
            populationText: '约4000-6500只',
            temperatureText: '-20-12度',
            socialText: '独居',
            placeholder: false
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

    function normalizeCollectionRewardClaimMap(rawMap) {
        if (!rawMap || typeof rawMap !== 'object') {
            return {};
        }

        return Object.keys(rawMap).reduce((result, key) => {
            const normalizedKey = normalizeCollectionSpeciesId(key);
            if (!normalizedKey || !COLLECTION_SPECIES_ID_SET.has(normalizedKey) || !rawMap[key]) {
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
            pendingGuideSpeciesId: COLLECTION_SPECIES_ID_SET.has(pendingGuideSpeciesId) ? pendingGuideSpeciesId : '',
            lastViewedSpeciesId: COLLECTION_SPECIES_ID_SET.has(lastViewedSpeciesId) ? lastViewedSpeciesId : '',
            pendingGuideRewardSpeciesId: COLLECTION_SPECIES_ID_SET.has(pendingGuideRewardSpeciesId) ? pendingGuideRewardSpeciesId : '',
            guideRewardClaimedBySpeciesId
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
            tierId: balance.getTierById(definition.defaultTierId, definition.id).id,
            ticketProgressSec: 0,
            storedTickets: 0,
            lastSyncAt: Math.max(0, Math.floor(Number(nowTs) || Date.now())),
            animals: balance.createStarterAnimals(definition.id)
        };
    }

    function createDefaultState() {
        const now = Date.now();
        const habitats = balance.getAllHabitatDefinitions().map((definition) => createDefaultHabitatState(definition, now));
        const starterPlayTickets = Math.max(0, Math.floor(Number(balance.STARTER_PLAY_TICKETS) || 0));

        return {
            version: SAVE_VERSION,
            resources: {
                coin: 0,
                diamond: 100,
                playTicket: starterPlayTickets
            },
            ui: {
                activeHabitatId: habitats[0].id,
                activeTab: 'status',
                panelOpen: false
            },
            collection: {
                unlockedAtBySpeciesId: {},
                pendingGuideSpeciesId: '',
                lastViewedSpeciesId: '',
                pendingGuideRewardSpeciesId: '',
                guideRewardClaimedBySpeciesId: {}
            },
            habitats,
            meta: {
                lastSettlement: null,
                lastTicketSpendAt: 0,
                storyFlags: {},
                unlockedSystems: {},
                storyFlow: normalizePendingReturnStoryFlow(null),
                constructionFlow: normalizeConstructionFlow(null)
            }
        };
    }

    function shouldGrantStarterPlayTickets(state) {
        if (!state || typeof state !== 'object') {
            return false;
        }

        const starterPlayTickets = Math.max(0, Math.floor(Number(balance.STARTER_PLAY_TICKETS) || 0));
        if (starterPlayTickets <= 0) {
            return false;
        }

        const resources = state.resources || {};
        const meta = state.meta || {};
        const collection = state.collection || {};
        const habitats = Array.isArray(state.habitats) ? state.habitats : [];
        const unlockedAtBySpeciesId = collection.unlockedAtBySpeciesId && typeof collection.unlockedAtBySpeciesId === 'object'
            ? collection.unlockedAtBySpeciesId
            : {};
        const storyFlags = meta.storyFlags && typeof meta.storyFlags === 'object'
            ? meta.storyFlags
            : {};
        const hasStoredTickets = habitats.some((habitat) => Math.max(0, Math.floor(Number(habitat && habitat.storedTickets) || 0)) > 0);
        const hasUnlockedHabitat = habitats.some((habitat) => Boolean(habitat && habitat.unlocked));
        const hasCollectionProgress = Object.keys(unlockedAtBySpeciesId).some((speciesId) => Number(unlockedAtBySpeciesId[speciesId]) > 0);
        const hasStoryProgress = Object.keys(storyFlags).some((storyId) => Boolean(storyFlags[storyId]));

        return (
            Math.max(0, Math.floor(Number(resources.coin) || 0)) <= 0
            && Math.max(0, Math.floor(Number(resources.diamond) || 0)) <= 0
            && Math.max(0, Math.floor(Number(resources.playTicket) || 0)) <= 0
            && !meta.lastSettlement
            && Math.max(0, Math.floor(Number(meta.lastTicketSpendAt) || 0)) <= 0
            && !hasStoredTickets
            && !hasUnlockedHabitat
            && !hasCollectionProgress
            && !hasStoryProgress
        );
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
            tierId: balance.getTierById((rawHabitat && rawHabitat.tierId) || baseHabitat.tierId, definition.id).id,
            ticketProgressSec: Math.max(0, Number((rawHabitat && rawHabitat.ticketProgressSec) ?? baseHabitat.ticketProgressSec) || 0),
            storedTickets: Math.max(0, Math.floor(Number((rawHabitat && rawHabitat.storedTickets) ?? baseHabitat.storedTickets) || 0)),
            lastSyncAt: Math.max(0, Math.floor(Number((rawHabitat && rawHabitat.lastSyncAt) ?? baseHabitat.lastSyncAt) || baseHabitat.lastSyncAt)),
            animals: animalsInput.map((animal, index) => normalizeAnimal(animal, fallbackAnimals[index % Math.max(1, fallbackAnimals.length)]))
        };
    }

    function normalizeUnlockedSystems(rawMap) {
        if (!rawMap || typeof rawMap !== 'object') {
            return {};
        }

        return Object.keys(rawMap).reduce(function (result, key) {
            var normalizedKey = String(key || '').trim();
            if (!normalizedKey) {
                return result;
            }

            var entry = rawMap[key];
            if (!entry || typeof entry !== 'object') {
                return result;
            }

            var unlockedAt = Number(entry.unlockedAt);
            if (!Number.isFinite(unlockedAt) || unlockedAt <= 0) {
                return result;
            }

            result[normalizedKey] = {
                unlockedAt: Math.floor(unlockedAt),
                notificationShown: Boolean(entry.notificationShown)
            };
            return result;
        }, {});
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

    function normalizeConstructionFlow(rawFlow) {
        const flow = rawFlow && typeof rawFlow === 'object' ? rawFlow : {};
        const habitatId = String(flow.habitatId || '').trim().slice(0, 64);
        const definition = habitatId
            ? balance.getAllHabitatDefinitions().find((item) => item && item.id === habitatId)
            : null;
        const startedAt = Math.max(0, Math.floor(Number(flow.startedAt) || 0));
        const completeAt = Math.max(0, Math.floor(Number(flow.completeAt) || 0));

        if (!definition || completeAt <= 0) {
            return {
                habitatId: '',
                startedAt: 0,
                completeAt: 0
            };
        }

        return {
            habitatId: definition.id,
            startedAt,
            completeAt: Math.max(startedAt, completeAt)
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

        const normalizedState = {
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
                storyFlags: normalizeStoryFlags(rawState.meta && rawState.meta.storyFlags),
                unlockedSystems: normalizeUnlockedSystems(rawState.meta && rawState.meta.unlockedSystems),
                storyFlow: normalizePendingReturnStoryFlow(rawState.meta && rawState.meta.storyFlow),
                constructionFlow: normalizeConstructionFlow(rawState.meta && rawState.meta.constructionFlow)
            }
        };

        if (shouldGrantStarterPlayTickets(normalizedState)) {
            normalizedState.resources.playTicket = Math.max(
                normalizedState.resources.playTicket,
                Math.max(0, Math.floor(Number(balance.STARTER_PLAY_TICKETS) || 0))
            );
        }

        return normalizedState;
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
            return sum + balance.getTierById(habitat.tierId, habitat.id).ticketCap;
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
        const tier = balance.getTierById(habitat.tierId, habitat.id);
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
        const tier = balance.getTierById(habitat.tierId, habitat.id);
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

    function shouldUseAnimatedConstruction(habitatId) {
        return String(habitatId || '').trim() === 'red-panda-grove';
    }

    function syncConstruction(nowTs = Date.now()) {
        if (!runtimeState.meta || typeof runtimeState.meta !== 'object') {
            runtimeState.meta = {};
        }

        const constructionFlow = normalizeConstructionFlow(runtimeState.meta.constructionFlow);
        if (!constructionFlow.habitatId) {
            if (runtimeState.meta.constructionFlow && runtimeState.meta.constructionFlow.habitatId) {
                runtimeState.meta.constructionFlow = normalizeConstructionFlow(null);
                return true;
            }
            return false;
        }

        const habitat = runtimeState.habitats.find((item) => item && item.id === constructionFlow.habitatId) || null;
        if (!habitat) {
            runtimeState.meta.constructionFlow = normalizeConstructionFlow(null);
            return true;
        }

        if (habitat.unlocked) {
            runtimeState.meta.constructionFlow = normalizeConstructionFlow(null);
            return true;
        }

        const safeNow = Math.max(0, Math.floor(Number(nowTs) || Date.now()));
        if (constructionFlow.completeAt > safeNow) {
            return false;
        }

        habitat.unlocked = true;
        habitat.ticketProgressSec = 0;
        habitat.storedTickets = 0;
        habitat.lastSyncAt = safeNow;
        runtimeState.meta.constructionFlow = normalizeConstructionFlow(null);
        return true;
    }

    function syncAll(nowTs = Date.now()) {
        let changed = false;
        runtimeState.habitats.forEach((habitat) => {
            changed = syncHabitatWithTime(habitat, nowTs) || changed;
        });
        changed = syncConstruction(nowTs) || changed;
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
        const tier = balance.getTierById(habitat.tierId, habitat.id);
        const nextTier = balance.getNextTier(habitat.tierId, habitat.id);
        const metrics = deriveHabitatMetrics(habitat);
        const storyFlags = normalizeStoryFlags(runtimeState.meta && runtimeState.meta.storyFlags);
        const constructionFlow = normalizeConstructionFlow(runtimeState.meta && runtimeState.meta.constructionFlow);
        const storyRequirementMet = hasMetStoryRequirement(definition, storyFlags);
        const unlockStoryId = normalizeStoryId(definition.unlockStoryId);
        const unlockStoryLabel = String(definition.unlockStoryLabel || unlockStoryId || '').trim();
        const unlockPending = isUnlockPending(definition);
        const isConstructing = !habitat.unlocked && constructionFlow.habitatId === habitat.id;
        const constructionRemainingMs = isConstructing
            ? Math.max(0, constructionFlow.completeAt - Date.now())
            : 0;
        const constructionDurationMs = isConstructing
            ? Math.max(1, constructionFlow.completeAt - constructionFlow.startedAt)
            : 0;
        const constructionProgressPct = isConstructing
            ? Math.max(0, Math.min(100, Math.round(((constructionDurationMs - constructionRemainingMs) / constructionDurationMs) * 100)))
            : 0;
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
            isConstructing,
            constructionRemainingMs,
            constructionProgressPct,
            unlockCostCoin: habitat.unlockCostCoin,
            unlockStoryId,
            unlockStoryLabel,
            isStoryLocked: !habitat.unlocked && (!storyRequirementMet || unlockPending),
            canUnlock: !habitat.unlocked && !isConstructing && !unlockPending && storyRequirementMet && runtimeState.resources.coin >= habitat.unlockCostCoin,
            unlockActionText: isConstructing
                ? '建造中...'
                : (unlockPending
                ? '暂未开放'
                : (!storyRequirementMet
                    ? `完成${unlockStoryLabel || '对应剧情'}后解锁`
                    : `建造栏舍 · ${habitat.unlockCostCoin} 金币`)),
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
                : (isConstructing
                    ? '栏舍施工中，完工后会开始自动产出盲盒券'
                    : `建成后每 ${Math.max(1, Math.round(tier.ticketIntervalSec / 60))} 分钟产出 1 张盲盒券`),
            ticketProgressPct: habitat.unlocked
                ? (ticketPoolFull ? 100 : Math.round((habitat.ticketProgressSec / Math.max(1, metrics.effectiveTicketIntervalSec)) * 100))
                : 0,
            ticketCountdownText: habitat.unlocked
                ? (ticketPoolFull ? '盲盒券库存已满' : `下一张券 ${balance.formatDuration(ticketSecondsLeft)}`)
                : (isConstructing
                    ? `建造中 · ${balance.formatDuration(Math.max(1, Math.ceil(constructionRemainingMs / 1000)))}`
                    : '建成后开始自动产券'),
            claimableTickets,
            hasClaimableTickets: claimableTickets > 0,
            totalTicketCap,
            statusMetrics: metrics.statusMetrics,
            animals,
            lockDescription: habitat.unlocked
                ? ''
                : (isConstructing
                    ? `${definition.name} 正在施工中，约 2 秒后就会正式开放为 1 级栏舍。`
                : (unlockPending
                    ? `${definition.name} 暂未开放，后续会改为指定剧情解锁。`
                    : (!storyRequirementMet
                        ? `完成${unlockStoryLabel || '对应剧情'}后，${definition.name}才会开放，小动物也会正式入住。`
                        : `消耗 ${habitat.unlockCostCoin} 金币建成后，${definition.name}会直接以 1 级栏舍开放，并开始自动产出 ${balance.SLOT_THEME.ticketName}。`)))
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
            lastViewedSpeciesId,
            pendingGuideRewardSpeciesId: collectionState.pendingGuideRewardSpeciesId || '',
            guideRewardClaimedBySpeciesId: { ...(collectionState.guideRewardClaimedBySpeciesId || {}) }
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
            unlockedSystems: JSON.parse(JSON.stringify(runtimeState.meta.unlockedSystems || {})),
            slotTheme: { ...balance.SLOT_THEME },
            collection,
            habitats,
            selectedHabitat,
            habitat: selectedHabitat,
            storyFlow: { ...(runtimeState.meta.storyFlow || normalizePendingReturnStoryFlow(null)) },
            constructionFlow: { ...(runtimeState.meta.constructionFlow || normalizeConstructionFlow(null)) },
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

    function hasSeenSlotTutorial() {
        syncAll(Date.now());
        return Boolean(runtimeState.meta && runtimeState.meta.slotTutorialSeen);
    }

    function markSlotTutorialSeen() {
        syncAll(Date.now());
        if (!runtimeState.meta || typeof runtimeState.meta !== 'object') {
            runtimeState.meta = {};
        }
        runtimeState.meta.slotTutorialSeen = true;
        emitChange('tutorial-flag');
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

    function queueCollectionGuideReward(speciesId) {
        syncAll(Date.now());
        const normalizedSpeciesId = normalizeCollectionSpeciesId(speciesId);
        if (!getCollectionSpeciesDefinition(normalizedSpeciesId) || normalizedSpeciesId !== 'red-panda') {
            return false;
        }

        if (!runtimeState.collection || typeof runtimeState.collection !== 'object') {
            runtimeState.collection = normalizeCollectionState(null);
        }

        if (!runtimeState.collection.guideRewardClaimedBySpeciesId || typeof runtimeState.collection.guideRewardClaimedBySpeciesId !== 'object') {
            runtimeState.collection.guideRewardClaimedBySpeciesId = {};
        }

        if (runtimeState.collection.guideRewardClaimedBySpeciesId[normalizedSpeciesId]) {
            return false;
        }

        if (runtimeState.collection.pendingGuideRewardSpeciesId === normalizedSpeciesId) {
            return true;
        }

        runtimeState.collection.pendingGuideRewardSpeciesId = normalizedSpeciesId;
        emitChange('collection-guide-reward-pending');
        return true;
    }

    function claimCollectionGuideReward(speciesId = '') {
        syncAll(Date.now());
        if (!runtimeState.collection || typeof runtimeState.collection !== 'object') {
            runtimeState.collection = normalizeCollectionState(null);
        }

        if (!runtimeState.collection.guideRewardClaimedBySpeciesId || typeof runtimeState.collection.guideRewardClaimedBySpeciesId !== 'object') {
            runtimeState.collection.guideRewardClaimedBySpeciesId = {};
        }

        const normalizedSpeciesId = normalizeCollectionSpeciesId(speciesId);
        const pendingRewardSpeciesId = normalizeCollectionSpeciesId(runtimeState.collection.pendingGuideRewardSpeciesId);
        const targetSpeciesId = pendingRewardSpeciesId || normalizedSpeciesId;
        if (!getCollectionSpeciesDefinition(targetSpeciesId)) {
            return false;
        }

        if (pendingRewardSpeciesId && normalizedSpeciesId && pendingRewardSpeciesId !== normalizedSpeciesId) {
            return false;
        }

        runtimeState.collection.pendingGuideRewardSpeciesId = '';
        runtimeState.collection.guideRewardClaimedBySpeciesId[targetSpeciesId] = true;
        emitChange('collection-guide-reward-claim');
        return true;
    }

    function getPendingReturnStory() {
        syncAll(Date.now());
        const storyFlow = runtimeState.meta && runtimeState.meta.storyFlow
            ? normalizePendingReturnStoryFlow(runtimeState.meta.storyFlow)
            : normalizePendingReturnStoryFlow(null);

        if (!storyFlow.pendingReturnStoryId) {
            return null;
        }

        return { ...storyFlow };
    }

    function setPendingReturnStory(storyId, options = {}) {
        syncAll(Date.now());
        const pendingReturnStoryId = normalizeStoryId(storyId);
        const pendingGuideSpeciesId = normalizeCollectionSpeciesId(options.pendingGuideSpeciesId || options.speciesId);
        if (!runtimeState.meta || typeof runtimeState.meta !== 'object') {
            runtimeState.meta = {};
        }

        runtimeState.meta.storyFlow = {
            pendingReturnStoryId,
            pendingGuideSpeciesId,
            readyToResume: Boolean(pendingReturnStoryId && options.readyToResume)
        };
        emitChange('pending-return-story');
        return getPendingReturnStory();
    }

    function markPendingReturnStoryReady(speciesId = '') {
        syncAll(Date.now());
        if (!runtimeState.meta || typeof runtimeState.meta !== 'object') {
            runtimeState.meta = {};
        }

        const storyFlow = normalizePendingReturnStoryFlow(runtimeState.meta.storyFlow);
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

        runtimeState.meta.storyFlow = {
            ...storyFlow,
            readyToResume: true
        };
        emitChange('pending-return-story-ready');
        return true;
    }

    function consumePendingReturnStory() {
        syncAll(Date.now());
        if (!runtimeState.meta || typeof runtimeState.meta !== 'object') {
            runtimeState.meta = {};
        }

        const storyFlow = normalizePendingReturnStoryFlow(runtimeState.meta.storyFlow);
        if (!storyFlow.pendingReturnStoryId || !storyFlow.readyToResume) {
            return '';
        }

        runtimeState.meta.storyFlow = normalizePendingReturnStoryFlow(null);
        emitChange('pending-return-story-consumed');
        return storyFlow.pendingReturnStoryId;
    }

    function beginHabitatConstruction(habitatId = '') {
        syncAll(Date.now());
        const targetHabitatId = String(habitatId || '').trim();
        const habitat = targetHabitatId
            ? (runtimeState.habitats.find((item) => item && item.id === targetHabitatId) || null)
            : getSelectedHabitat();

        if (!habitat) {
            return {
                ok: false,
                code: 'unknown-habitat',
                message: '未找到要建造的栏舍。'
            };
        }

        const habitatDefinition = balance.getHabitatDefinition(habitat.id);
        const storyFlags = normalizeStoryFlags(runtimeState.meta && runtimeState.meta.storyFlags);
        const constructionFlow = normalizeConstructionFlow(runtimeState.meta && runtimeState.meta.constructionFlow);

        if (habitat.unlocked) {
            return {
                ok: false,
                code: 'already-unlocked',
                message: `${habitatDefinition.name} 已经建好了。`
            };
        }

        if (!shouldUseAnimatedConstruction(habitat.id)) {
            return unlockSelectedHabitat();
        }

        if (constructionFlow.habitatId === habitat.id) {
            return {
                ok: false,
                code: 'construction-active',
                message: `${habitatDefinition.name} 正在建造中。`
            };
        }

        if (constructionFlow.habitatId) {
            return {
                ok: false,
                code: 'construction-busy',
                message: '当前已有栏舍正在建造中。'
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

        const startedAt = Date.now();
        runtimeState.resources.coin -= habitat.unlockCostCoin;
        runtimeState.ui.activeHabitatId = habitat.id;
        runtimeState.ui.panelOpen = false;
        habitat.ticketProgressSec = 0;
        habitat.storedTickets = 0;
        habitat.lastSyncAt = startedAt;
        runtimeState.meta.constructionFlow = normalizeConstructionFlow({
            habitatId: habitat.id,
            startedAt,
            completeAt: startedAt + HABITAT_BUILD_DURATION_MS
        });
        emitChange('start-habitat-construction');

        return {
            ok: true,
            code: 'construction-started',
            habitatId: habitat.id,
            durationMs: HABITAT_BUILD_DURATION_MS,
            message: `${habitatDefinition.name} 开始建造，马上就会落成 1 级栏舍。`
        };
    }

    function unlockSelectedHabitat() {
        syncAll(Date.now());
        const habitat = getSelectedHabitat();
        const habitatDefinition = balance.getHabitatDefinition(habitat.id);
        const storyFlags = normalizeStoryFlags(runtimeState.meta && runtimeState.meta.storyFlags);

        if (shouldUseAnimatedConstruction(habitat.id)) {
            return beginHabitatConstruction(habitat.id);
        }

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

        const nextTier = balance.getNextTier(habitat.tierId, habitat.id);
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
        getRuntimeState: function () {
            return runtimeState;
        },
        emitChange: function (reason) {
            emitChange(reason);
        },
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
        hasSeenSlotTutorial,
        markSlotTutorialSeen,
        unlockCollectionSpecies,
        clearCollectionGuide,
        markCollectionSpeciesViewed,
        queueCollectionGuideReward,
        claimCollectionGuideReward,
        getPendingReturnStory,
        setPendingReturnStory,
        markPendingReturnStoryReady,
        consumePendingReturnStory,
        beginHabitatConstruction,
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
