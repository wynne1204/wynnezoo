# 需求文档

## 简介

建造完小熊猫栏舍后，自动触发播放一段独立于主线章节序列的特殊剧情。同时，将主线章节的衔接逻辑从"按注册顺序取下一个"改为显式映射配置，确保特殊剧情不会被误当成主线的下一章。

## 术语表

- **App_Shell**：应用外壳模块（`app-shell.js`），负责屏幕切换、剧情播放调度和章节衔接逻辑
- **Story_Data**：剧情数据管理模块（`story-data.js`），维护剧情注册表，提供 `getNextStoryId()` 等查询方法
- **Story_Generated_Data**：剧情内容定义文件（`story-generated-data.js`），存放 `WynneImportedStories` 对象中的所有剧情条目
- **Zoo_Economy**：动物园经济模块（`zoo-economy.js`），管理资源、栏舍状态和待返回剧情（pending return story）机制
- **Zoo_Home**：动物园主页模块（`zoo-home.js`），负责栏舍建造流程和庆祝效果
- **主线章节映射表**：在 `resolveFollowupStoryId` 中定义的配置对象，显式声明每个主线章节播完后的下一章 ID
- **特殊剧情**：不属于主线章节序列（序章→第一章→第二章→...）的独立剧情，由特定游戏事件触发
- **待返回剧情机制**：通过 `setPendingReturnStory` / `markPendingReturnStoryReady` / `consumePendingReturnStory` 实现的延迟剧情播放机制

## 需求

### 需求 1：显式主线章节映射

**用户故事：** 作为开发者，我希望主线章节的衔接关系由显式配置表定义，以便新增的特殊剧情不会被误当成主线的下一章。

#### 验收标准

1. THE App_Shell SHALL 在 `resolveFollowupStoryId` 函数中维护一个主线章节映射表，以键值对形式声明每个主线章节播完后的下一章 ID（例如 `prologue → 第一章`、`第一章 → 第二章`、`第二章 → 第三章`）
2. WHEN `resolveFollowupStoryId` 被调用时，THE App_Shell SHALL 优先查询主线章节映射表获取下一章 ID，仅在映射表中存在对应条目且目标剧情可播放时返回该 ID
3. WHEN 主线章节映射表中不存在当前 storyId 的条目时，THE App_Shell SHALL 返回空字符串，表示没有后续主线章节
4. THE App_Shell SHALL 不再依赖 `WynneStoryData.getNextStoryId()` 的注册顺序来决定主线章节衔接

### 需求 2：特殊剧情数据定义

**用户故事：** 作为开发者，我希望在剧情数据文件中新增一个特殊剧情条目，以便建造完成后有内容可以播放。

#### 验收标准

1. THE Story_Generated_Data SHALL 在 `WynneImportedStories` 对象中包含一个特殊剧情条目，该条目的 storyId 不属于主线章节序列中的任何 ID
2. THE 特殊剧情条目 SHALL 包含有效的 storyId、title、characters 和 beats 字段，符合现有剧情数据结构规范
3. THE 特殊剧情条目的 storyId SHALL 不出现在主线章节映射表的键或值中

### 需求 3：建造完成触发特殊剧情

**用户故事：** 作为玩家，我希望建造完小熊猫栏舍后自动播放一段特殊剧情，以获得更丰富的游戏体验。

#### 验收标准

1. WHEN 小熊猫栏舍建造成功且庆祝效果结束后，THE Zoo_Home SHALL 通过 Zoo_Economy 的 `setPendingReturnStory` 机制设置特殊剧情为待播放状态，并将 `readyToResume` 设为 `true`
2. WHEN 待播放的特殊剧情状态为 `readyToResume: true` 且玩家回到动物园主页时，THE App_Shell SHALL 通过 `maybePlayReadyPendingReturnStory` 自动消费并播放该特殊剧情
3. THE Zoo_Home SHALL 仅在小熊猫栏舍（`red-panda-grove`）首次建造完成时触发特殊剧情设置，栏舍升级不触发

### 需求 4：特殊剧情播完后不触发主线衔接

**用户故事：** 作为玩家，我希望特殊剧情播完后直接回到动物园主页，不会意外跳到主线的下一章。

#### 验收标准

1. WHEN 特殊剧情播放完成后 `resolveFollowupStoryId` 被调用时，THE App_Shell SHALL 返回空字符串，因为特殊剧情的 storyId 不在主线章节映射表中
2. WHEN `resolveFollowupStoryId` 返回空字符串时，THE App_Shell SHALL 调用 `showZooHome()` 将玩家带回动物园主页
3. THE 特殊剧情 SHALL 不影响主线章节的 `storyFlags` 标记逻辑，不改变主线进度状态
