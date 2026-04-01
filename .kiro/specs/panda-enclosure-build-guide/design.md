# 熊猫栏舍建造引导 Bugfix Design

## Overview

熊猫栏舍建造引导流程存在 5 个缺陷：触发时机过早（第一章结束后即出现，应在第二章结束后）、引导手缺少点击动画、缺少建造特效动画、缺少建造完成庆祝效果、缺少栏舍 1 级图片展示。本设计通过修正任务链触发条件、补全 CSS 动画、新增建造特效与庆祝效果、以及在引导和完成阶段展示栏舍图片来修复这些问题。

## Glossary

- **Bug_Condition (C)**: 建造引导在第一章结束后就出现，或引导/建造流程中缺少动画和视觉反馈的条件
- **Property (P)**: 建造引导应在第二章结束后出现，且引导手有点击动画、建造有特效、完成有庆祝效果、有栏舍图片展示
- **Preservation**: 现有的鼠标点击交互、图鉴引导动画、清洁庆祝特效、普通栏舍操作等功能不受影响
- **QUEST_CHAIN**: `zoo-quest.js` 中定义的主线任务链数组，包含 feed → story → build → blindbox → upgrade → feed 六个任务
- **shouldShowHabitatBuildGuide()**: `zoo-home.js` 中判断是否显示建造引导的函数，依赖当前任务类型和栏舍状态
- **beginHabitatConstruction()**: `zoo-economy.js` 中启动栏舍建造流程的函数，设置 constructionFlow 并触发 2 秒计时
- **syncConstruction()**: `zoo-economy.js` 中检查建造是否完成的函数，到期后将 `habitat.unlocked` 设为 true
- **collectionGuideHandTap**: `style.collection.css` 中定义的引导手点击动画关键帧（1s ease-in-out infinite）

## Bug Details

### Bug Condition

本次修复涉及 5 个相关缺陷，统一归纳为建造引导流程不完整的 bug condition。核心触发条件是：当任务系统推进到 build 类型任务时，建造引导流程的各个环节存在缺失或时机错误。

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { gameState, userAction }
  OUTPUT: boolean

  // Bug 1: 触发时机错误
  IF input.gameState.currentQuest.conditionType == 'build'
     AND input.gameState.currentQuest.relatedId == 'red-panda'
     AND input.gameState.storyFlags['第一章'] == true
     AND input.gameState.storyFlags['第二章'] != true
     AND buildGuideIsVisible(input.gameState)
  THEN RETURN true  // 建造引导不应在此时出现

  // Bug 2: 引导手缺少动画
  IF buildGuideIsVisible(input.gameState)
     AND NOT hasGuideHandTapAnimation('.zoo-home-habitat-guide-hand')
  THEN RETURN true

  // Bug 3: 缺少建造特效
  IF input.userAction == 'click-build-habitat'
     AND NOT playsBuildEffect(input.gameState)
  THEN RETURN true

  // Bug 4: 缺少庆祝效果
  IF input.gameState.constructionJustCompleted == true
     AND NOT playsCelebrationEffect(input.gameState)
  THEN RETURN true

  // Bug 5: 缺少栏舍图片
  IF (buildGuideIsVisible(input.gameState) OR input.gameState.constructionJustCompleted)
     AND NOT displaysHabitatLevel1Image(input.gameState)
  THEN RETURN true

  RETURN false
END FUNCTION
```

### Examples

- Bug 1: 玩家完成第一章剧情 → 图鉴解锁小熊猫 → 图鉴引导完成 → 返回动物园主页 → 建造引导立即出现（实际应等第二章播放完毕后才出现）
- Bug 2: 建造引导出现时，引导手图片（tutorial_hand.webp）静止不动，没有 `collectionGuideHandTap` 的上下缩放动画效果
- Bug 3: 玩家点击栏舍区域触发建造 → `beginHabitatConstruction` 被调用 → 直接显示 Toast "开始建造" → 没有任何视觉特效过渡
- Bug 4: 2 秒建造计时结束 → `syncConstruction` 将栏舍解锁 → 仅显示普通 Toast → 没有彩带飘落和飘字庆祝
- Bug 5: 建造引导出现时和建造完成后，屏幕中间没有展示 `habitat-level-1.webp` 图片

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- 鼠标/触摸点击栏舍按钮的交互逻辑必须继续正常工作
- 图鉴引导中的 `collectionGuideHandTap` 动画在图鉴场景中必须继续正常工作
- 清洁小游戏中的 sparkle 庆祝特效必须继续正常工作
- 盲盒游戏中的 confetti 彩带效果必须继续正常工作
- 栏舍已解锁或正在建造中时，`shouldShowHabitatBuildGuide` 必须继续返回 false
- 图鉴后续引导（`pendingGuideSpeciesId`）存在时，建造引导必须继续被抑制
- 有待返回的故事（`pendingReturnStoryId`）时，建造引导必须继续被抑制
- 非建造引导场景下的普通栏舍交互（查看信息、领取券等）必须继续正常工作
- 任务系统的 localStorage 持久化和追赶检查逻辑不受影响

**Scope:**
所有不涉及建造引导流程的输入和交互应完全不受本次修复影响。包括：
- 非 build 类型任务的推进和显示
- 其他栏舍（非 red-panda-grove）的操作
- 盲盒游戏、剧情播放、图鉴浏览等独立功能

## Hypothesized Root Cause

Based on the bug description and code analysis, the most likely issues are:

1. **触发时机错误（Bug 1）**: `shouldShowHabitatBuildGuide()` 仅检查当前任务是否为 build 类型且目标栏舍匹配，但没有检查第二章是否已完成。当第一章结束后，story 任务完成，任务链推进到 build 任务，此时 `shouldShowHabitatBuildGuide` 条件已满足。但实际流程是：第一章结束 → 图鉴解锁 → `setPendingReturnStory('第二章', { readyToResume: false })` → 图鉴引导完成后 `markPendingReturnStoryReady` → 第二章播放 → 第二章结束后才应显示建造引导。问题在于 `shouldShowHabitatBuildGuide` 没有检查第二章的 storyFlags 状态。

2. **引导手缺少动画（Bug 2）**: `zoo-home-habitat-guide-hand` CSS 类已经定义了 `animation: collectionGuideHandTap 1s ease-in-out infinite`，但 `collectionGuideHandTap` 关键帧定义在 `style.collection.css` 中。如果 CSS 加载顺序或作用域导致关键帧未被正确引用，动画可能不生效。需要确认 `@keyframes collectionGuideHandTap` 是否在 `style.zoo-home.css` 中也有定义，或者是否需要在该文件中补充。

3. **缺少建造特效（Bug 3）**: `startHabitatConstruction()` 在 `zoo-home.js` 中直接调用 `economy.beginHabitatConstruction()`，然后显示 Toast 和重新渲染。没有任何建造特效动画的代码。需要在调用建造后、渲染完成前插入一个约 2 秒的特效动画。

4. **缺少庆祝效果（Bug 4）**: `syncConstruction()` 在建造完成时仅将 `habitat.unlocked` 设为 true 并清除 constructionFlow，没有触发任何庆祝效果。`zoo-home.js` 的 `render()` 函数在经济系统状态变化时被调用，但没有检测"刚刚完成建造"的状态来触发庆祝。

5. **缺少栏舍图片（Bug 5）**: `getHabitatArt(habitat)` 在 `habitat.unlocked` 为 false 时直接返回空字符串，因此建造引导出现时（栏舍未解锁）不会显示任何图片。建造完成后虽然 `unlocked` 变为 true，但没有专门的图片展示环节。

## Correctness Properties

Property 1: Bug Condition - 建造引导仅在第二章结束后出现

_For any_ 游戏状态，当第一章已完成但第二章尚未完成时，即使当前任务为 build 类型且目标栏舍为 red-panda-grove，修复后的 `shouldShowHabitatBuildGuide` 函数 SHALL 返回 false，不显示建造引导。

**Validates: Requirements 2.1**

Property 2: Bug Condition - 引导手播放点击动画

_For any_ 建造引导可见的状态，修复后的引导手元素 SHALL 应用 `collectionGuideHandTap` 动画（1s ease-in-out infinite），产生与图鉴引导一致的上下缩放点击效果。

**Validates: Requirements 2.2**

Property 3: Bug Condition - 建造触发时播放特效动画

_For any_ 玩家点击建造栏舍的操作，修复后的 `startHabitatConstruction` 函数 SHALL 在调用 `beginHabitatConstruction` 后播放约 2 秒的建造特效动画，特效结束后再完成 UI 更新。

**Validates: Requirements 2.3**

Property 4: Bug Condition - 建造完成时播放庆祝效果

_For any_ 栏舍建造完成事件（`syncConstruction` 将 `habitat.unlocked` 设为 true），修复后的系统 SHALL 播放彩带飘落效果并显示飘字提示。

**Validates: Requirements 2.4**

Property 5: Bug Condition - 展示栏舍 1 级图片

_For any_ 建造引导可见或建造刚完成的状态，修复后的系统 SHALL 在屏幕中展示栏舍 1 级图片（`habitat-level-1.webp`）。

**Validates: Requirements 2.5**

Property 6: Preservation - 非建造引导场景行为不变

_For any_ 不涉及建造引导流程的输入（非 build 任务推进、已解锁栏舍操作、图鉴引导、清洁特效等），修复后的代码 SHALL 产生与修复前完全相同的行为，保留所有现有功能。

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `js/zoo/zoo-home.js`

**Function**: `shouldShowHabitatBuildGuide(snapshot, habitat)`

**Specific Changes**:
1. **修正触发时机（Bug 1）**: 在 `shouldShowHabitatBuildGuide` 中增加对第二章完成状态的检查。检查 `snapshot.meta.storyFlags['第二章']` 是否为 true，如果第二章未完成则返回 false。这确保建造引导只在第二章剧情结束后才出现。

**File**: `style.zoo-home.css`

**Class**: `.zoo-home-habitat-guide-hand`

2. **确认引导手动画（Bug 2）**: 检查 `.zoo-home-habitat-guide-hand` 是否正确引用了 `collectionGuideHandTap` 关键帧。如果关键帧仅在 `style.collection.css` 中定义，需要在 `style.zoo-home.css` 中也定义一份，或确保两个 CSS 文件都被加载。根据代码分析，`style.zoo-home.css` 中已有 `animation: collectionGuideHandTap 1s ease-in-out infinite`，但需要确认 `@keyframes collectionGuideHandTap` 是否在该文件中也有定义。如果没有，需要补充。

**File**: `js/zoo/zoo-home.js`

**Function**: `startHabitatConstruction(habitatId)`

3. **新增建造特效（Bug 3）**: 在 `startHabitatConstruction` 中，调用 `economy.beginHabitatConstruction()` 成功后，创建一个建造特效覆盖层（参考清洁庆祝的 sparkle 实现），播放约 2 秒的粒子/光效动画，动画结束后再调用 `render()` 更新 UI。

4. **新增庆祝效果（Bug 4）**: 在经济系统状态变化的监听回调中，检测是否刚刚完成建造（对比前后 constructionFlow 状态）。如果检测到建造完成，创建彩带飘落效果（参考 `bonus-trigger-confetti` 的 10 个彩色纸片实现）和飘字提示（参考 `showToast` 但使用更醒目的样式）。

5. **展示栏舍图片（Bug 5）**: 在建造引导的 HTML 模板中（`renderHabitatStage` 函数的引导部分），增加栏舍 1 级图片的展示。使用 `habitat.stageAssets.level1` 获取图片路径。建造完成庆祝时也展示该图片。

**File**: `style.zoo-home.css`

6. **新增建造特效和庆祝效果的 CSS**: 添加建造特效覆盖层、粒子动画、彩带飘落、飘字提示的样式和关键帧动画。

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: 模拟任务链推进到 build 任务的场景，检查建造引导的触发条件和视觉效果。在未修复代码上运行测试以观察失败并理解根因。

**Test Cases**:
1. **触发时机测试**: 模拟第一章完成、第二章未完成的状态，检查 `shouldShowHabitatBuildGuide` 是否返回 true（在未修复代码上会错误返回 true）
2. **引导手动画测试**: 检查 `.zoo-home-habitat-guide-hand` 元素的 computed animation 是否包含 `collectionGuideHandTap`（在未修复代码上可能缺少关键帧定义）
3. **建造特效测试**: 调用 `startHabitatConstruction` 后检查是否有特效 DOM 元素被创建（在未修复代码上不会有）
4. **庆祝效果测试**: 模拟建造完成后检查是否有彩带和飘字 DOM 元素（在未修复代码上不会有）
5. **栏舍图片测试**: 检查建造引导可见时是否有栏舍 1 级图片元素（在未修复代码上不会有）

**Expected Counterexamples**:
- `shouldShowHabitatBuildGuide` 在第二章未完成时错误返回 true
- 建造流程中没有特效和庆祝效果的 DOM 元素
- Possible causes: 缺少第二章完成状态检查、缺少特效/庆祝代码、`getHabitatArt` 在未解锁时返回空

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := applyFix(input)
  ASSERT expectedBehavior(result)
  // Bug 1: 第二章未完成时建造引导不出现
  // Bug 2: 引导手有动画
  // Bug 3: 建造时有特效
  // Bug 4: 完成时有庆祝
  // Bug 5: 有栏舍图片
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT originalFunction(input) = fixedFunction(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for non-build-guide interactions, then write property-based tests capturing that behavior.

**Test Cases**:
1. **任务推进保留测试**: 验证非 build 类型任务（feed、story、blindbox、upgrade）的推进逻辑在修复后不变
2. **栏舍交互保留测试**: 验证已解锁栏舍的查看信息、领取券等操作在修复后不变
3. **图鉴引导保留测试**: 验证图鉴引导的 `collectionGuideHandTap` 动画在修复后继续正常工作
4. **清洁特效保留测试**: 验证清洁小游戏的 sparkle 庆祝特效在修复后不变
5. **shouldShowHabitatBuildGuide 保留测试**: 验证栏舍已解锁、正在建造、有 pendingGuideSpeciesId、有 pendingReturnStoryId 时继续返回 false

### Unit Tests

- 测试 `shouldShowHabitatBuildGuide` 在各种 storyFlags 组合下的返回值
- 测试 `startHabitatConstruction` 成功后是否触发特效动画
- 测试建造完成检测逻辑是否正确识别"刚刚完成建造"状态
- 测试栏舍图片在引导和完成阶段是否正确展示
- 测试边界情况：storyFlags 为空、第二章 key 不存在、栏舍定义无 stageAssets

### Property-Based Tests

- 生成随机 snapshot 状态（各种 storyFlags、quest 组合），验证 `shouldShowHabitatBuildGuide` 仅在第二章完成且当前任务为 build 时返回 true
- 生成随机非建造引导输入，验证修复前后行为一致（preservation）
- 生成随机栏舍状态，验证 `getHabitatArt` 和图片展示逻辑的正确性

### Integration Tests

- 完整流程测试：序章 → 第一章 → 图鉴解锁 → 第二章 → 建造引导出现 → 点击建造 → 特效播放 → 建造完成 → 庆祝效果 → 栏舍图片展示
- 中断恢复测试：建造过程中刷新页面，恢复后建造完成时仍有庆祝效果
- 多栏舍测试：确保非 red-panda-grove 栏舍的操作不受影响
