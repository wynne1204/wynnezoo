// CasinoStack 运行时配置
window.APP_CONFIG = {
    game: {
        gridSize: 16,
        bombCount: 0,
        blockPool: {
            normalWeight: 90,
            wildWeight: 8,
            bonusWeight: 30000,
            // 猴子符号权重（用于触发猴子动画与转盘）
            monkeyWeight: 2,
            // 黏性百搭权重（本体按百搭参与结算，并可跨轮停留）
            stickyWildWeight: 2,
            normalImages: [
                './Texture/BlockImg/Block_1.png',
                './Texture/BlockImg/Block_2.png',
                './Texture/BlockImg/Block_3.png',
                './Texture/BlockImg/Block_4.png',
                './Texture/BlockImg/Block_5.png'
            ],
            wildImage: './Texture/BlockImg/Block_Wild.png',
            bonusImage: './Texture/BlockImg/Block_Bonus.png',
            // 猴子符号素材（当前复用 Block_Bomb 资源）
            monkeyImage: './Texture/BlockImg/Block_Bomb.png',
            // 黏性百搭素材
            stickyWildImage: './Texture/BlockImg/Block_StickWild.png'
        },
        clusterPayout: {
            minClusterSize: 3,
            baseCoins: 100,
            jackpotThreshold: 10,
            jackpotMultiplier: 100,
            multipliers: {
                3: 1,
                4: 2,
                5: 2,
                6: 5,
                7: 7,
                8: 10
            },
            // 连线结算给到叠叠乐积木数量（可配置）
            stackBlocksByClusterSize: {
                3: 1,
                4: 2,
                5: 3,
                6: 4,
                7: 5,
                8: 6,
                9: 8,
                10: 10
            }
        },
        baseMultiplier: 1.0,
        multiplierStep: 0.2,
        baseBet: 100,
        maxStackForFullProgress: 15,
        bonusTriggerProgressTarget: 8,
        customerSatisfactionTarget: 8,
        customerPortraits: [
            './Texture/story/立绘/游客-1.png',
            './Texture/story/立绘/游客-2.png',
            './Texture/story/立绘/游客-3.png',
            './Texture/story/立绘/游客-4.png'
        ],
        customerPreferencePool: ['S1', 'S2', 'S3', 'S4', 'S5'],
        customerPreferenceSymbols: ['S1', 'S2', 'S3', 'S4', 'S5'],
        // 黏性百搭“额外停留”轮数：出现后仅下一轮继续在同坐标出现
        stickyWildExtraRounds: 1,
        stackHorizontalOffsetRange: {
            min: -20,
            max: 20
        },
        swayThresholds: {
            low: 2,
            medium: 5,
            high: 8,
            extreme: 11
        },
        destructionSpeeds: {
            total: 80,
            default: 150
        },
        bombWheelSpinMs: 2200,
        // 猴子动画结束后到炸弹转盘出现的额外延迟（毫秒）
        bombWheelDelayAfterAnimMs: 500,
        bombWheelWeights: {
            // 猴子转盘奖励权重
            add3Blocks: 30,
            add8Blocks: 20,
            fillToMaxProgress: 15,
            giveBonusSymbol: 20,
            giveNothing: 15
        },
        freeSpin: {
            spinsPerTrigger: 3,
            // free spin 中特殊大箱子的尺寸权重：
            // 2 表示 2x2 箱子，3 表示 3x3 箱子，4 表示 4x4 箱子
            // 数值越大，随机到该尺寸的概率越高
            specialBoxSizeWeights: {
                2: 76,
                3: 19,
                4: 5
            },
            rewardMultiplier: 0.4,
            // free spin 中特殊大箱子的纵向位移，单位 px：
            // 正数 = 往下移，负数 = 往上移
            // 这里不仅影响箱子显示位置，也会同步影响开箱特效/粒子/飞行动画的中心点
            specialBoxOffsetYBySize: {
                // 2x2 箱子上下位移
                2: -80,
                // 3x3 箱子上下位移
                3: -78,
                // 4x4 箱子上下位移
                4: -80
            }
        },
        // 主棋盘蓝图抽取权重（可配置）
        // default：普通回合使用的蓝图权重
        // withCarriedStickyWild：当“上一局遗留的 Sticky Wild”带入本局时使用的权重
        // hardPityJackpot：触发保底后，仅在该权重池中抽取蓝图（通常是 BP_06/BP_07）
        // hardPityThreshold：连续多少局未抽到 BP_06/BP_07 时触发保底
        // 说明：
        // 1) 权重支持 0（表示该蓝图不会被抽到）
        // 2) 只需改 game.blueprintWeights，不需要改 script.js
        // 3) BP_05 含 SW，调高 BP_05 权重可提升 SW 出现概率
        blueprintWeights: {
            default: {
                BP_01: 18,
                BP_02: 14,
                BP_03: 24,
                BP_04: 6,
                BP_05: 8,
                BP_06: 7,
                BP_07: 3,
                BP_08: 12,
                BP_09: 8
            },
            withCarriedStickyWild: {
                BP_01: 36,
                BP_02: 28,
                BP_03: 28,
                BP_04: 8,
                BP_05: 0,
                BP_06: 0,
                BP_07: 0,
                BP_08: 0,
                BP_09: 0
            },
            hardPityJackpot: {
                BP_06: 70,
                BP_07: 30
            },
            hardPityThreshold: 10
        },
        explosionDelayMs: 600,
        modalDelayMs: 500,
        scrollIntoViewDelayMs: 50
    },
    ui: {
        cssVars: {
            '--game-ratio-w': '390',
            '--game-ratio-h': '844',
            '--block-size': '72px',
            '--stack-overlap': '-36px',
            '--stack-start-lift': '17px',
            '--stack-clip-bottom-offset': '10px',
            '--mine-scale': '0.9',
            // 盲盒网格 UI 调整参数
            '--grid-board-center-y': '41%', // 整个 4x4 网格的纵向位置
            '--grid-board-gap-x': '9%',    // 箱子之间的水平间距
            '--grid-board-gap-y': '2%',   // 箱子之间的垂直间距
            '--grid-cell-bg-size': '185%', // 单个箱子底图缩放
            '--grid-cell-reward-scale': '0.92', // 开箱后格子内奖励图标缩放
            '--grid-cell-bottom-offset': '25%', // 单个箱子纵向偏移（用于对齐货架）
            '--top-bg-left': '-5px', // 上半区背景 X 偏移
            '--top-bg-top': '0px', // 上半区背景 Y 偏移
            '--tower-offset-y': '-40px', // 上方叠叠乐整体纵向偏移（负值上移）
            '--story-actor-lift-y': '20px'
        }
    }
};

// ── 系统解锁表（SystemUnlockTable） ──────────────────────────────
// 定义各子系统的解锁条件，新增系统只需在数组中追加一条记录即可。
// 字段说明：
//   systemId     — 系统唯一标识
//   systemName   — 系统显示名称
//   iconSrc      — 系统图标资源路径
//   chapterId    — 解锁所需章节ID（0=序章，1=第一章…）
//   beatIndex    — 解锁所需幕索引（从 0 开始）
//   navElementId — 主界面导航按钮的 DOM 元素 ID
window.APP_CONFIG.systemUnlockTable = [
    {
        systemId: 'collection',
        systemName: '动物图鉴',
        iconSrc: './Texture/UI/Icon_System_Collection.png',
        chapterId: 1,
        beatIndex: 25,
        navElementId: 'zoo-nav-collection'
    }
    // ── 追加新条目示例 ──
    // {
    //     systemId: 'trip',
    //     systemName: '动物远行',
    //     iconSrc: './Texture/UI/Icon_System_Trip.png',
    //     chapterId: 1,
    //     beatIndex: 0,
    //     navElementId: 'zoo-nav-trip'
    // }
];
