# Implementation Plan

- [ ] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - 建造引导流程缺陷验证
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: Scope the property to the concrete failing cases for each of the 5 bugs
  - Bug 1 - 触发时机: 模拟 storyFlags['第一章']=true, storyFlags['第二章']=false, currentQuest.conditionType='build', relatedId='red-panda' 的状态，调用 `shouldShowHabitatBuildGuide(snapshot, habitat)`，断言返回 false（未修复代码会错误返回 true）
  - Bug 2 - 引导手动画: 检查 `style.zoo-home.css` 中 `.zoo-home-habitat-guide-hand` 是否引用了 `collectionGuideHandTap` 关键帧，且该关键帧在 zoo-home CSS 作用域中有定义（未修复代码可能缺少关键帧定义）
  - Bug 3 - 建造特效: 调用 `startHabitatConstruction` 后检查是否创建了建造特效 DOM 元素（未修复代码不会创建）
  - Bug 4 - 庆祝效果: 模拟 `syncConstruction` 完成后检查是否有彩带和飘字 DOM 元素（未修复代码不会有）
  - Bug 5 - 栏舍图片: 检查建造引导可见时 `renderHabitatStage` 输出是否包含栏舍 1 级图片（未修复代码中 `getHabitatArt` 在 unlocked=false 时返回空）
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found to understand root cause
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - 非建造引导场景行为不变
  - **IMPORTANT**: Follow observation-first methodology
  - Observe: `shouldShowHabitatBuildGuide` 在 habitat.unlocked=true 时返回 false（已解锁栏舍不显示引导）
  - Observe: `shouldShowHabitatBuildGuide` 在 habitat.isConstructing=true 时返回 false（建造中不显示引导）
  - Observe: `shouldShowHabitatBuildGuide` 在 pendingGuideSpeciesId 存在时返回 false（图鉴引导优先）
  - Observe: `shouldShowHabitatBuildGuide` 在 pendingReturnStoryId 存在时返回 false（待返回故事优先）
  - Observe: `shouldShowHabitatBuildGuide` 在 habitat.id !== 'red-panda-grove' 时返回 false
  - Observe: 非 build 类型任务（feed、story、blindbox、upgrade）的推进逻辑正常工作
  - Observe: `getHabitatArt` 在 habitat.unlocked=true 时正确返回对应等级图片
  - Write property-based test: for all non-bug-condition inputs, `shouldShowHabitatBuildGuide` returns false and existing interactions produce unchanged results (from Preservation Requirements in design)
  - Verify test passes on UNFIXED code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

- [ ] 3. Fix for 建造引导流程缺陷修复

  - [x] 3.1 修正建造引导触发时机（Bug 1）
    - 在 `shouldShowHabitatBuildGuide(snapshot, habitat)` 中增加第二章完成状态检查
    - 从 snapshot 中获取 storyFlags，检查 `storyFlags['第二章']` 是否为 true
    - 如果第二章未完成（storyFlags['第二章'] 不为 true），返回 false
    - _Bug_Condition: isBugCondition(input) where storyFlags['第一章']=true AND storyFlags['第二章']!=true AND buildGuideIsVisible_
    - _Expected_Behavior: shouldShowHabitatBuildGuide returns false when 第二章 not completed_
    - _Preservation: 已解锁/建造中/有 pendingGuide/有 pendingReturnStory 时继续返回 false_
    - _Requirements: 2.1, 3.1, 3.2, 3.3, 3.4_

  - [x] 3.2 确认引导手点击动画可用（Bug 2）
    - 检查 `style.zoo-home.css` 中 `.zoo-home-habitat-guide-hand` 的 animation 属性
    - 确认 `@keyframes collectionGuideHandTap` 在 `style.zoo-home.css` 中有定义
    - 如果缺少，从 `style.collection.css` 复制关键帧定义到 `style.zoo-home.css`
    - 关键帧内容: `0% { transform: scale(1) translateY(0); } 50% { transform: scale(0.92) translateY(6px); } 100% { transform: scale(1) translateY(0); }`
    - _Bug_Condition: buildGuideIsVisible AND NOT hasGuideHandTapAnimation_
    - _Expected_Behavior: 引导手播放 collectionGuideHandTap 1s ease-in-out infinite 动画_
    - _Preservation: 图鉴场景中的 collectionGuideHandTap 动画继续正常工作_
    - _Requirements: 2.2, 3.6_

  - [x] 3.3 新增建造特效动画（Bug 3）
    - 在 `zoo-home.js` 的 `startHabitatConstruction` 函数中，`economy.beginHabitatConstruction()` 成功后插入特效
    - 创建建造特效覆盖层 DOM 元素（参考清洁庆祝 sparkle 实现）
    - 播放约 2 秒的粒子/光效动画
    - 动画结束后移除特效 DOM 并调用 `render()` 更新 UI
    - 在 `style.zoo-home.css` 中添加建造特效相关的 CSS 样式和 `@keyframes`
    - _Bug_Condition: userAction == 'click-build-habitat' AND NOT playsBuildEffect_
    - _Expected_Behavior: 建造触发后播放约 2 秒特效动画，结束后完成 UI 更新_
    - _Preservation: 清洁庆祝特效和盲盒彩带效果不受影响_
    - _Requirements: 2.3, 3.5, 3.7_

  - [x] 3.4 新增建造完成庆祝效果（Bug 4）
    - 在 `zoo-home.js` 的经济系统状态变化监听回调中，检测建造完成事件
    - 对比前后 constructionFlow 状态：如果之前有 habitatId 且现在为空，且对应栏舍 unlocked 变为 true，则为建造完成
    - 创建彩带飘落效果（参考 `bonus-trigger-confetti` 的 10 个彩色纸片实现）
    - 创建飘字提示（"建造完成！" 使用醒目样式，从中间向上飘出后消失）
    - 在 `style.zoo-home.css` 中添加庆祝效果相关的 CSS 样式和 `@keyframes`
    - _Bug_Condition: constructionJustCompleted AND NOT playsCelebrationEffect_
    - _Expected_Behavior: 建造完成时播放彩带飘落 + 飘字提示_
    - _Preservation: 盲盒游戏中的 confetti 彩带效果继续正常工作_
    - _Requirements: 2.4, 3.7_

  - [x] 3.5 新增栏舍 1 级图片展示（Bug 5）
    - 在 `renderHabitatStage` 函数的建造引导模板中，增加栏舍 1 级图片展示
    - 使用 `habitat.stageAssets.level1` 获取图片路径（`habitat-level-1.webp`）
    - 在建造完成庆祝效果中也展示栏舍 1 级图片
    - 修改 `getHabitatArt` 或引导模板逻辑，使未解锁但处于引导状态时也能展示图片
    - 在 `style.zoo-home.css` 中添加引导阶段图片展示的样式
    - _Bug_Condition: (buildGuideIsVisible OR constructionJustCompleted) AND NOT displaysHabitatLevel1Image_
    - _Expected_Behavior: 引导和完成阶段展示 stageAssets.level1 图片_
    - _Preservation: 已解锁栏舍的图片展示逻辑不受影响_
    - _Requirements: 2.5, 3.5_

  - [ ] 3.6 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - 建造引导流程缺陷已修复
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [ ] 3.7 Verify preservation tests still pass
    - **Property 2: Preservation** - 非建造引导场景行为不变
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix (no regressions)

- [ ] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
