(function initStorySchema(globalScope) {
    'use strict';

    const STORY_FOLDER = '序章';
    const PORTRAIT_FOLDER = '立绘';
    const EFFECT_CLASSES = Object.freeze([
        'shake-hard',
        'shake-medium',
        'shake-soft',
        'shake-soft-strong'
    ]);
    const CAMERA_EFFECT_CLASSES = Object.freeze([
        'camera-zoom-in-soft',
        'camera-zoom-in',
        'camera-zoom-in-strong',
        'camera-pan-left-to-right',
        'camera-pan-right-to-left'
    ]);

    function buildStoryAsset(fileName) {
        return `./Texture/story/${STORY_FOLDER}/${fileName}.webp`;
    }

    function buildPortraitAsset(fileName) {
        return `./Texture/story/${PORTRAIT_FOLDER}/${fileName}.webp`;
    }

    const BUILTIN_ASSET_LIBRARY = Object.freeze({
        backgrounds: Object.freeze([
            buildStoryAsset('序章-别墅内'),
            buildStoryAsset('序章-凌乱的餐桌-开门'),
            buildStoryAsset('序章-凌乱的餐桌-关门'),
            buildStoryAsset('序章-CG-两人吵架'),
            buildStoryAsset('序章-CG-陆峰掀桌'),
            buildStoryAsset('序章-CG-苏薇出现')
        ]),
        portraits: Object.freeze([
            buildPortraitAsset('我'),
            buildPortraitAsset('我-伤心'),
            buildPortraitAsset('陆峰'),
            buildPortraitAsset('陆峰-愤怒'),
            buildPortraitAsset('苏薇')
        ])
    });

    let uidCounter = 0;

    function createUid(prefix) {
        uidCounter += 1;
        return `${prefix}-${Date.now().toString(36)}-${uidCounter.toString(36)}`;
    }

    function clampActorCount(value) {
        return Math.max(0, Math.min(2, Math.floor(Number(value) || 0)));
    }

    function normalizePresentation(value) {
        const presentation = String(value || '').trim();
        if (presentation === 'illustration') {
            return 'illustration';
        }
        if (presentation === 'transition') {
            return 'transition';
        }
        return 'standard';
    }

    function normalizeEffectClass(value) {
        const effectClass = String(value || '').trim();
        return EFFECT_CLASSES.includes(effectClass) ? effectClass : '';
    }

    function normalizeCameraEffect(value) {
        const cameraEffect = String(value || '').trim();
        return CAMERA_EFFECT_CLASSES.includes(cameraEffect) ? cameraEffect : '';
    }

    function normalizeBackgroundMode(value) {
        return String(value || '').trim() === 'zoo-home'
            ? 'zoo-home'
            : 'story';
    }

    function deriveItemRewardTitle(imageSrc) {
        const normalizedSrc = String(imageSrc || '').trim();
        if (!normalizedSrc) {
            return '';
        }

        const fileName = normalizedSrc.split(/[\\/]/).pop() || '';
        return fileName.replace(/\.[^.]+$/, '').trim();
    }

    function normalizeItemReward(rawItemReward) {
        const itemReward = rawItemReward && typeof rawItemReward === 'object'
            ? rawItemReward
            : null;

        if (!itemReward) {
            return null;
        }

        const imageSrc = String(itemReward.imageSrc || itemReward.src || '').trim();
        const title = String(itemReward.title || '').trim() || deriveItemRewardTitle(imageSrc);
        const text = String(itemReward.text || itemReward.description || '').replace(/\r\n/g, '\n').trim();
        const buttonLabel = String(itemReward.buttonLabel || '获得').trim() || '获得';

        if (!imageSrc && !title && !text) {
            return null;
        }

        return {
            imageSrc,
            title,
            text,
            buttonLabel
        };
    }

    function normalizeInteraction(rawInteraction) {
        const interaction = rawInteraction && typeof rawInteraction === 'object'
            ? rawInteraction
            : null;

        if (!interaction) {
            return null;
        }

        const type = String(interaction.type || '').trim();
        if (type !== 'cleaning') {
            return null;
        }

        const prompts = (Array.isArray(interaction.prompts) ? interaction.prompts : [
            interaction.prompt1,
            interaction.prompt2
        ])
            .map((item) => String(item || '').trim())
            .filter(Boolean)
            .slice(0, 2);

        const dirtyBackground = String(
            interaction.dirtyBackground
            || interaction.startBackground
            || interaction.background
            || ''
        ).trim();
        const midBackground = String(
            interaction.midBackground
            || interaction.halfDirtyBackground
            || ''
        ).trim();
        const cleanBackground = String(
            interaction.cleanBackground
            || interaction.finalBackground
            || ''
        ).trim();

        if (!dirtyBackground && !midBackground && !cleanBackground) {
            return null;
        }

        return {
            type: 'cleaning',
            dirtyBackground,
            midBackground,
            cleanBackground,
            prompts: [
                prompts[0] || '按住并滑动屏幕，把明显的脏污先擦掉。',
                prompts[1] || '继续清扫，把角落也整理干净。'
            ],
            completionText: String(interaction.completionText || '打扫完成，动物园焕然一新！').trim() || '打扫完成，动物园焕然一新！',
            buttonLabel: String(interaction.buttonLabel || '继续剧情').trim() || '继续剧情'
        };
    }

    function normalizeCollectionUnlock(rawCollection) {
        const collection = rawCollection && typeof rawCollection === 'object'
            ? rawCollection
            : null;
        if (!collection) {
            return null;
        }

        const speciesId = String(collection.speciesId || '').trim();
        const speciesName = String(collection.speciesName || '').trim();
        if (!speciesId || !speciesName) {
            return null;
        }

        return {
            speciesId,
            speciesName
        };
    }

    function normalizeChoice(rawChoice, index) {
        const choice = rawChoice && typeof rawChoice === 'object'
            ? rawChoice
            : null;

        if (!choice) {
            return null;
        }

        const label = String(choice.label || choice.text || '').replace(/\r\n/g, '\n').trim();
        const rawJump = Number(choice.jump ?? choice.target ?? (index + 1));
        const jump = Number.isFinite(rawJump)
            ? Math.max(1, Math.floor(rawJump))
            : (index + 1);

        if (!label) {
            return null;
        }

        return {
            id: String(choice.id || choice.key || (index + 1)).trim() || String(index + 1),
            label,
            jump
        };
    }

    function normalizeChoices(rawChoices) {
        const choices = Array.isArray(rawChoices)
            ? rawChoices
                .map((choice, index) => normalizeChoice(choice, index))
                .filter(Boolean)
            : [];

        return choices.length > 0 ? choices : null;
    }

    function createEmptyPortrait(overrides = {}) {
        return {
            id: String(overrides.id || createUid('portrait')).trim(),
            label: String(overrides.label || '默认').trim() || '默认',
            src: String(overrides.src || '').trim()
        };
    }

    function createEmptyCharacter(overrides = {}) {
        const portraitsInput = Array.isArray(overrides.portraits)
            ? overrides.portraits
            : [createEmptyPortrait()];

        return {
            id: String(overrides.id || createUid('character')).trim(),
            name: String(overrides.name || '新角色').trim() || '新角色',
            portraits: portraitsInput.map((portrait) => createEmptyPortrait(portrait))
        };
    }

    function createEmptyActor(overrides = {}) {
        return {
            characterId: String(overrides && overrides.characterId || '').trim(),
            portraitId: String(overrides && overrides.portraitId || '').trim()
        };
    }

    function createEmptyBeat(overrides = {}) {
        const actorCount = clampActorCount(
            overrides.actorCount ?? (Array.isArray(overrides.actors) ? overrides.actors.length : 0)
        );

        return {
            id: String(overrides.id || createUid('beat')).trim(),
            title: String(overrides.title || '新分幕').trim() || '新分幕',
            background: String(overrides.background || '').trim(),
            type: String(overrides.type) === 'dialogue' ? 'dialogue' : 'narration',
            speakerName: String(overrides.speakerName || '').trim(),
            text: String(overrides.text || '').replace(/\r\n/g, '\n'),
            actorCount,
            actors: Array.from({ length: actorCount }, (_, index) => createEmptyActor(
                Array.isArray(overrides.actors) ? overrides.actors[index] : null
            )),
            presentation: normalizePresentation(overrides.presentation),
            effectClass: normalizeEffectClass(overrides.effectClass),
            cameraEffect: normalizeCameraEffect(overrides.cameraEffect),
            backgroundMode: normalizeBackgroundMode(overrides.backgroundMode),
            itemReward: normalizeItemReward(overrides.itemReward),
            interaction: normalizeInteraction(overrides.interaction),
            choices: normalizeChoices(overrides.choices),
            collectionUnlock: normalizeCollectionUnlock(overrides.collectionUnlock)
        };
    }

    function createEmptyProject(overrides = {}) {
        const characters = Array.isArray(overrides.characters)
            ? overrides.characters.map((character) => createEmptyCharacter(character))
            : [createEmptyCharacter()];
        const beats = Array.isArray(overrides.beats)
            ? overrides.beats.map((beat) => createEmptyBeat(beat))
            : [createEmptyBeat({ title: '第 1 幕' })];

        return normalizeProject({
            version: 1,
            storyId: String(overrides.storyId || 'story-prologue').trim() || 'story-prologue',
            title: String(overrides.title || '序章').trim() || '序章',
            stage: overrides.stage,
            characters,
            beats
        });
    }

    function normalizePortrait(rawPortrait, index) {
        const portrait = rawPortrait && typeof rawPortrait === 'object' ? rawPortrait : {};
        return {
            id: String(portrait.id || `portrait-${index + 1}`).trim() || `portrait-${index + 1}`,
            label: String(portrait.label || `立绘 ${index + 1}`).trim() || `立绘 ${index + 1}`,
            src: String(portrait.src || '').trim()
        };
    }

    function normalizeCharacter(rawCharacter, index) {
        const character = rawCharacter && typeof rawCharacter === 'object' ? rawCharacter : {};
        const portraitsInput = Array.isArray(character.portraits) ? character.portraits : [];

        return {
            id: String(character.id || `character-${index + 1}`).trim() || `character-${index + 1}`,
            name: String(character.name || `角色 ${index + 1}`).trim() || `角色 ${index + 1}`,
            portraits: portraitsInput.map((portrait, portraitIndex) => normalizePortrait(portrait, portraitIndex))
        };
    }

    function normalizeActor(rawActor) {
        const actor = rawActor && typeof rawActor === 'object' ? rawActor : {};
        return {
            characterId: String(actor.characterId || '').trim(),
            portraitId: String(actor.portraitId || '').trim()
        };
    }

    function getCharacterById(project, characterId) {
        const targetId = String(characterId || '').trim();
        return Array.isArray(project && project.characters)
            ? project.characters.find((character) => character.id === targetId) || null
            : null;
    }

    function getPortraitById(character, portraitId) {
        const targetId = String(portraitId || '').trim();
        return Array.isArray(character && character.portraits)
            ? character.portraits.find((portrait) => portrait.id === targetId) || null
            : null;
    }

    function normalizeActorAgainstProject(rawActor, project) {
        const actor = normalizeActor(rawActor);
        if (!actor.characterId) {
            return createEmptyActor();
        }

        const character = getCharacterById(project, actor.characterId);
        if (!character) {
            return createEmptyActor();
        }

        const portrait = getPortraitById(character, actor.portraitId) || character.portraits[0] || null;

        return {
            characterId: character.id,
            portraitId: portrait ? portrait.id : ''
        };
    }

    function normalizeBeat(rawBeat, index, project) {
        const beat = rawBeat && typeof rawBeat === 'object' ? rawBeat : {};
        const actorCount = clampActorCount(
            beat.actorCount ?? (Array.isArray(beat.actors) ? beat.actors.length : 0)
        );
        const actorsInput = Array.isArray(beat.actors) ? beat.actors : [];

        return {
            id: String(beat.id || `beat-${index + 1}`).trim() || `beat-${index + 1}`,
            title: String(beat.title || `第 ${index + 1} 幕`).trim() || `第 ${index + 1} 幕`,
            background: String(beat.background || '').trim(),
            type: String(beat.type) === 'dialogue' ? 'dialogue' : 'narration',
            speakerName: String(beat.speakerName || '').trim(),
            text: String(beat.text || '').replace(/\r\n/g, '\n'),
            actorCount,
            actors: Array.from({ length: actorCount }, (_, actorIndex) => normalizeActorAgainstProject(
                actorsInput[actorIndex],
                project
            )),
            presentation: normalizePresentation(beat.presentation),
            effectClass: normalizeEffectClass(beat.effectClass),
            cameraEffect: normalizeCameraEffect(beat.cameraEffect),
            backgroundMode: normalizeBackgroundMode(beat.backgroundMode),
            itemReward: normalizeItemReward(beat.itemReward),
            interaction: normalizeInteraction(beat.interaction),
            choices: normalizeChoices(beat.choices),
            collectionUnlock: normalizeCollectionUnlock(beat.collectionUnlock)
        };
    }

    function normalizeStage(rawStage) {
        const stage = rawStage && typeof rawStage === 'object' ? rawStage : {};
        const doublePositions = Array.isArray(stage.doubleActorPositions)
            ? stage.doubleActorPositions
                .slice(0, 2)
                .map((item) => String(item || '').trim())
                .filter(Boolean)
            : [];

        return {
            maxActorsPerBeat: 2,
            singleActorPosition: String(stage.singleActorPosition || 'center').trim() || 'center',
            doubleActorPositions: doublePositions.length === 2 ? doublePositions : ['left', 'right']
        };
    }

    function normalizeProject(rawProject) {
        const project = rawProject && typeof rawProject === 'object' ? rawProject : {};
        const characters = Array.isArray(project.characters)
            ? project.characters.map((character, index) => normalizeCharacter(character, index))
            : [];

        const normalizedProject = {
            version: 1,
            storyId: String(project.storyId || 'story-prologue').trim() || 'story-prologue',
            title: String(project.title || '未命名剧情').trim() || '未命名剧情',
            stage: normalizeStage(project.stage),
            characters,
            beats: []
        };

        const beatsInput = Array.isArray(project.beats) ? project.beats : [];
        normalizedProject.beats = beatsInput.map((beat, index) => normalizeBeat(beat, index, normalizedProject));
        return normalizedProject;
    }

    function getResolvedActors(project, beat) {
        const normalizedProject = normalizeProject(project);
        const normalizedBeat = normalizeBeat(beat, 0, normalizedProject);
        const slots = [];

        if (normalizedBeat.actorCount === 1) {
            slots.push({
                position: normalizedProject.stage.singleActorPosition,
                actor: normalizedBeat.actors[0]
            });
        } else if (normalizedBeat.actorCount === 2) {
            const positions = normalizedProject.stage.doubleActorPositions;
            slots.push(
                { position: positions[0] || 'left', actor: normalizedBeat.actors[0] },
                { position: positions[1] || 'right', actor: normalizedBeat.actors[1] }
            );
        }

        return slots.map((slot, index) => {
            const character = getCharacterById(normalizedProject, slot.actor.characterId);
            const portrait = getPortraitById(character, slot.actor.portraitId)
                || (character && character.portraits[0])
                || null;

            return {
                index,
                position: slot.position,
                characterId: character ? character.id : '',
                characterName: character ? character.name : '',
                portraitId: portrait ? portrait.id : '',
                portraitLabel: portrait ? portrait.label : '',
                portraitSrc: portrait ? portrait.src : ''
            };
        });
    }

    function getDisplaySpeaker(project, beat) {
        const normalizedProject = normalizeProject(project);
        const normalizedBeat = normalizeBeat(beat, 0, normalizedProject);

        if (normalizedBeat.type !== 'dialogue') {
            return '';
        }

        const speakerName = String(normalizedBeat.speakerName || '').trim();
        if (speakerName) {
            return speakerName;
        }

        const firstActor = normalizedBeat.actors[0];
        const character = getCharacterById(normalizedProject, firstActor && firstActor.characterId);
        return character ? character.name : '未命名角色';
    }

    function stringifyProject(project) {
        return JSON.stringify(normalizeProject(project), null, 2);
    }

    function createPrologueProject() {
        function actor(characterId, portraitId) {
            return { characterId, portraitId };
        }

        return normalizeProject({
            storyId: 'prologue',
            title: '序章',
            characters: [
                {
                    id: 'self',
                    name: '我',
                    portraits: [
                        {
                            id: 'default',
                            label: '我',
                            src: buildPortraitAsset('我')
                        },
                        {
                            id: 'sad',
                            label: '我-伤心',
                            src: buildPortraitAsset('我-伤心')
                        }
                    ]
                },
                {
                    id: 'lufeng',
                    name: '陆峰',
                    portraits: [
                        {
                            id: 'default',
                            label: '陆峰',
                            src: buildPortraitAsset('陆峰')
                        },
                        {
                            id: 'angry',
                            label: '陆峰-愤怒',
                            src: buildPortraitAsset('陆峰-愤怒')
                        }
                    ]
                },
                {
                    id: 'suwei',
                    name: '苏薇',
                    portraits: [
                        {
                            id: 'default',
                            label: '苏薇',
                            src: buildPortraitAsset('苏薇')
                        }
                    ]
                }
            ],
            beats: [
                {
                    id: 'prologue-1',
                    title: '结婚三周年',
                    background: buildStoryAsset('序章-别墅内'),
                    type: 'dialogue',
                    speakerName: '我',
                    text: '今天是我结婚三周年…',
                    actorCount: 1,
                    actors: [actor('self', 'default')]
                },
                {
                    id: 'prologue-2',
                    title: '门声骤响',
                    background: buildStoryAsset('序章-别墅内'),
                    type: 'narration',
                    text: '门声：砰——',
                    actorCount: 0,
                    effectClass: 'shake-medium'
                },
                {
                    id: 'prologue-3',
                    title: '争吵瞬间',
                    background: buildStoryAsset('序章-CG-两人吵架'),
                    type: 'narration',
                    text: '',
                    actorCount: 0,
                    presentation: 'illustration'
                },
                {
                    id: 'prologue-4',
                    title: '陆峰发难',
                    background: buildStoryAsset('序章-别墅内'),
                    type: 'dialogue',
                    speakerName: '陆峰',
                    text: '林青，医生说你身体没问题。',
                    actorCount: 2,
                    actors: [actor('lufeng', 'default'), actor('self', 'default')]
                },
                {
                    id: 'prologue-5',
                    title: '陆峰发难',
                    background: buildStoryAsset('序章-别墅内'),
                    type: 'dialogue',
                    speakerName: '陆峰',
                    text: '三年了却一点动静都没有。',
                    actorCount: 2,
                    actors: [actor('lufeng', 'default'), actor('self', 'default')]
                },
                {
                    id: 'prologue-6',
                    title: '陆峰发难',
                    background: buildStoryAsset('序章-别墅内'),
                    type: 'dialogue',
                    speakerName: '陆峰',
                    text: '原来你的心思都花在这头畜生身上。',
                    actorCount: 2,
                    actors: [actor('lufeng', 'default'), actor('self', 'default')]
                },
                {
                    id: 'prologue-7',
                    title: '餐桌被掀翻',
                    background: buildStoryAsset('序章-别墅内'),
                    type: 'narration',
                    text: '陆峰一把掀开了桌子',
                    actorCount: 0,
                    effectClass: 'shake-medium'
                },
                {
                    id: 'prologue-8',
                    title: '失控瞬间',
                    background: buildStoryAsset('序章-CG-陆峰掀桌'),
                    type: 'narration',
                    text: '',
                    actorCount: 0,
                    presentation: 'illustration'
                },
                {
                    id: 'prologue-9',
                    title: '怒火升级',
                    background: buildStoryAsset('序章-凌乱的餐桌-开门'),
                    type: 'dialogue',
                    speakerName: '陆峰',
                    text: '我陆家需要的是继承人',
                    actorCount: 2,
                    actors: [actor('lufeng', 'angry'), actor('self', 'sad')]
                },
                {
                    id: 'prologue-10',
                    title: '怒火升级',
                    background: buildStoryAsset('序章-凌乱的餐桌-开门'),
                    type: 'dialogue',
                    speakerName: '陆峰',
                    text: '不是一个跟狗说话的疯子！',
                    actorCount: 2,
                    actors: [actor('lufeng', 'angry'), actor('self', 'sad')]
                },
                {
                    id: 'prologue-11',
                    title: '守住家人',
                    background: buildStoryAsset('序章-凌乱的餐桌-开门'),
                    type: 'dialogue',
                    speakerName: '我',
                    text: '大福不是畜生',
                    actorCount: 2,
                    actors: [actor('lufeng', 'angry'), actor('self', 'sad')]
                },
                {
                    id: 'prologue-12',
                    title: '守住家人',
                    background: buildStoryAsset('序章-凌乱的餐桌-开门'),
                    type: 'dialogue',
                    speakerName: '我',
                    text: '它是陪我走过最难日子的家人',
                    actorCount: 2,
                    actors: [actor('lufeng', 'angry'), actor('self', 'sad')]
                },
                {
                    id: 'prologue-13',
                    title: '门再次打开',
                    background: buildStoryAsset('序章-凌乱的餐桌-开门'),
                    type: 'narration',
                    text: '门再次打开。',
                    actorCount: 0
                },
                {
                    id: 'prologue-14',
                    title: '苏薇出现',
                    background: buildStoryAsset('序章-CG-苏薇出现'),
                    type: 'narration',
                    text: '',
                    actorCount: 0,
                    presentation: 'illustration'
                },
                {
                    id: 'prologue-15',
                    title: '苏薇出声',
                    background: buildStoryAsset('序章-凌乱的餐桌-开门'),
                    type: 'dialogue',
                    speakerName: '苏薇',
                    text: '峰哥，别生气了',
                    actorCount: 2,
                    actors: [actor('suwei', 'default'), actor('lufeng', 'angry')]
                },
                {
                    id: 'prologue-16',
                    title: '苏薇出声',
                    background: buildStoryAsset('序章-凌乱的餐桌-开门'),
                    type: 'dialogue',
                    speakerName: '苏薇',
                    text: '医生说宝宝很健康',
                    actorCount: 2,
                    actors: [actor('suwei', 'default'), actor('lufeng', 'angry')]
                },
                {
                    id: 'prologue-17',
                    title: '针锋相对',
                    background: buildStoryAsset('序章-凌乱的餐桌-开门'),
                    type: 'dialogue',
                    speakerName: '苏薇',
                    text: '青姐，你别怪峰哥',
                    actorCount: 2,
                    actors: [actor('suwei', 'default'), actor('self', 'sad')]
                },
                {
                    id: 'prologue-18',
                    title: '针锋相对',
                    background: buildStoryAsset('序章-凌乱的餐桌-开门'),
                    type: 'dialogue',
                    speakerName: '苏薇',
                    text: '陆家的香火不能断',
                    actorCount: 2,
                    actors: [actor('suwei', 'default'), actor('self', 'sad')]
                }
            ]
        });
    }

    function createSampleProject() {
        return createPrologueProject();
    }

    globalScope.WynneStorySchema = {
        BUILTIN_ASSET_LIBRARY,
        CAMERA_EFFECT_CLASSES,
        EFFECT_CLASSES,
        clampActorCount,
        createEmptyActor,
        createEmptyBeat,
        createEmptyCharacter,
        createEmptyPortrait,
        createEmptyProject,
        createPrologueProject,
        createSampleProject,
        getCharacterById,
        getDisplaySpeaker,
        getPortraitById,
        getResolvedActors,
        normalizeProject,
        stringifyProject
    };

    if (globalScope.WynneRegistry) {
        globalScope.WynneRegistry.register('WynneStorySchema', globalScope.WynneStorySchema);
    }
}(window));
