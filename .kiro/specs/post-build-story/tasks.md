# 实现计划：建造后特殊剧情

## 概述

将主线章节衔接逻辑改为显式映射表，并在小熊猫栏舍首次建造完成后自动触发特殊剧情播放。涉及 3 个文件的修改和 1 个测试文件的新增，无需新增模块。

## 任务

- [x] 1. 重写主线章节衔接逻辑（app-shell.js）
  - [x] 1.1 新增 `MAIN_STORY_SEQUENCE` 映射表并重写 `resolveFollowupStoryId`
    - 在 `js/app-shell.js` 中，`resolveFollowupStoryId` 函数上方新增 `MAIN_STORY_SEQUENCE` 常量对象，包含 `prologue → 第一章`、`第一章 → 第二章`、`第二章 → 第三章` 的映射
    - 重写 `resolveFollowupStoryId` 函数：仅从映射表查询下一章 ID，不再调用 `storyData.getNextStoryId()`
    - 移除原有的 `ENTRY_STORY_ID → FIRST_CHAPTER_ID` 硬编码 fallback 逻辑
    - _需求: 1.1, 1.2, 1.3, 1.4_

  - [ ]* 1.2 编写属性测试：映射表内的 storyId 返回正确的下一章
    - **Property 1: 映射表内的 storyId 返回正确的下一章**
    - 使用 fast-check 随机从映射表键中选取 storyId，验证返回值等于映射表中对应的值
    - **验证: 需求 1.2, 1.4**

  - [ ]* 1.3 编写属性测试：映射表外的 storyId 返回空字符串
    - **Property 2: 映射表外的 storyId 返回空字符串**
    - 使用 fast-check 生成不在映射表键中的随机字符串，验证返回值为空字符串
    - **验证: 需求 1.3, 4.1**

  - [ ]* 1.4 编写单元测试：映射表结构验证与边界情况
    - 验证 `MAIN_STORY_SEQUENCE` 包含预期的键值对
    - 验证传入 `null`、`undefined`、空字符串时返回空字符串
    - 验证 `post-build-red-panda` 不在映射表的键或值中
    - _需求: 1.1, 1.3, 2.3_

- [x] 2. 检查点 - 确保主线衔接逻辑正确
  - 确保所有测试通过，如有疑问请向用户确认。

- [x] 3. 新增特殊剧情数据（story-generated-data.js）
  - [x] 3.1 在 `WynneImportedStories` 中新增 `post-build-red-panda` 剧情条目
    - 在 `js/story/story-generated-data.js` 的 `WynneImportedStories` 对象中，`第二章` 条目之后新增 `post-build-red-panda` 条目
    - 包含 `version`、`storyId`、`title`（"新家落成"）、`stage`、`characters`、`beats` 字段
    - 复用现有角色定义（"我"角色），编写至少 2 个剧情节拍
    - 更新 `WynneImportedStoryMeta` 的 `storyCount` 和 `beatCount`
    - _需求: 2.1, 2.2, 2.3_

  - [ ]* 3.2 编写单元测试：特殊剧情数据验证
    - 验证 `post-build-red-panda` 条目存在且包含必要字段（storyId、title、characters、beats）
    - 验证 storyId 不在 `MAIN_STORY_SEQUENCE` 的键或值中
    - _需求: 2.1, 2.2, 2.3_

- [x] 4. 建造完成触发特殊剧情（zoo-home.js）
  - [x] 4.1 修改 `startHabitatConstruction` 函数，庆祝结束后触发特殊剧情
    - 在 `js/zoo/zoo-home.js` 的 `startHabitatConstruction` 函数中，`playBuildEffect` 回调内新增逻辑
    - 当 `habitatId === 'red-panda-grove'` 且 `result.isNew !== false` 时，使用 `setTimeout(3500)` 等待庆祝动画结束
    - 在回调中调用 `economy.setPendingReturnStory('post-build-red-panda', { readyToResume: true })`
    - 随后调用 `appShell.showZooHome()` 触发 `maybePlayReadyPendingReturnStory` 自动消费并播放
    - 添加防御性检查：`typeof economy.setPendingReturnStory === 'function'`
    - _需求: 3.1, 3.2, 3.3_

  - [ ]* 4.2 编写单元测试：建造触发与升级不触发
    - 模拟 `red-panda-grove` 首次建造成功（`result.isNew: true`），验证 `setPendingReturnStory` 被调用且参数正确
    - 模拟栏舍升级（`result.isNew: false`），验证 `setPendingReturnStory` 未被调用
    - 模拟其他栏舍建造，验证不触发特殊剧情
    - _需求: 3.1, 3.3_

- [x] 5. 检查点 - 确保建造触发流程正确
  - 确保所有测试通过，如有疑问请向用户确认。

- [x] 6. 端到端集成验证
  - [x] 6.1 编写集成测试：特殊剧情播完后回到主页
    - 模拟特殊剧情 `onComplete` 回调，验证 `resolveFollowupStoryId('post-build-red-panda')` 返回空字符串
    - 验证返回空字符串后调用 `showZooHome()`
    - 验证特殊剧情播放不影响主线 `storyFlags`
    - _需求: 4.1, 4.2, 4.3_

- [x] 7. 最终检查点 - 确保所有测试通过
  - 确保所有测试通过，如有疑问请向用户确认。

## 备注

- 标记 `*` 的子任务为可选，可跳过以加快 MVP 进度
- 每个任务引用了具体的需求编号，确保可追溯性
- 属性测试验证通用正确性属性，单元测试验证具体场景和边界情况
- 实现语言为 JavaScript，测试使用 fast-check 属性测试库
