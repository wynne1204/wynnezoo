# Bugfix 需求文档

## 简介

熊猫栏舍建造引导流程存在多个缺陷：触发时机错误（应在第二章剧情结束后出现，实际在第一章结束后就出现）、缺少引导手动画、缺少建造特效、缺少建造完成庆祝反馈、以及缺少栏舍 1 级图片展示。这些问题导致建造引导体验不完整，玩家无法获得清晰的操作指引和正向反馈。

## Bug 分析

### 当前行为（缺陷）

1.1 WHEN 第一章剧情结束后，任务系统推进到 build 类型任务时，THEN 建造引导在动物园主页立即出现，触发时机过早（应在第二章结束后才出现）

1.2 WHEN 建造引导出现时，THEN 引导手图片（tutorial_hand.webp）虽然存在于 DOM 中，但缺少与图鉴引导一致的点击引导动画效果，引导手没有明显的交互提示动画

1.3 WHEN 玩家点击栏舍区域触发建造时，THEN 系统直接调用 `beginHabitatConstruction` 开始建造流程，没有播放任何建造特效动画（约 2 秒）

1.4 WHEN 建造完成（`syncConstruction` 将 `habitat.unlocked` 设为 true）后，THEN 系统仅显示普通 Toast 提示，没有彩带飘落和飘字庆祝效果

1.5 WHEN 建造引导出现或建造完成后，THEN 屏幕中间没有展示栏舍 1 级的图片，玩家无法直观看到即将建造或已建造完成的栏舍外观

### 期望行为（正确）

2.1 WHEN 第二章剧情结束后，任务系统推进到 build 类型任务时，THEN 建造引导 SHALL 在动物园主页出现，引导玩家建造小熊猫栏舍

2.2 WHEN 建造引导出现时，THEN 引导手 SHALL 播放与图鉴引导一致的 `collectionGuideHandTap` 点击动画（1s ease-in-out infinite），引导玩家点击建造区域

2.3 WHEN 玩家点击栏舍区域触发建造时，THEN 系统 SHALL 播放建造特效动画（约 2 秒），特效结束后再完成建造流程

2.4 WHEN 建造完成后，THEN 系统 SHALL 播放彩带飘落效果并显示飘字提示，告知玩家建造已完成

2.5 WHEN 建造引导出现或建造完成后，THEN 屏幕中间 SHALL 展示栏舍 1 级的图片，让玩家直观看到栏舍外观

### 不变行为（回归防护）

3.1 WHEN 第一章剧情结束后且当前任务不是 build 类型时，THEN 系统 SHALL 继续正常推进到下一个任务（如盲盒挑战），不显示建造引导

3.2 WHEN 栏舍已解锁或正在建造中时，THEN `shouldShowHabitatBuildGuide` SHALL 继续返回 false，不显示建造引导

3.3 WHEN 图鉴后续引导（`pendingGuideSpeciesId`）存在时，THEN 建造引导 SHALL 继续被抑制，优先显示图鉴引导

3.4 WHEN 有待返回的故事（`pendingReturnStoryId`）时，THEN 建造引导 SHALL 继续被抑制

3.5 WHEN 非建造引导场景下的普通栏舍交互（查看信息、领取券等）时，THEN 这些功能 SHALL 继续正常工作，不受建造引导改动影响

3.6 WHEN 图鉴引导手动画在其他场景中使用时，THEN `collectionGuideHandTap` 动画 SHALL 继续正常工作

3.7 WHEN 清洁庆祝特效和奖励游戏彩带在各自场景中使用时，THEN 这些现有特效 SHALL 继续正常工作，不受新增建造特效影响
