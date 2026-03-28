# 实现计划：主线任务系统

## 概述

将主线任务系统实现为独立的 `js/zoo/zoo-quest.js` 模块，遵循项目现有的 IIFE + WynneRegistry 模式。模块通过订阅 WynneZooEconomy 和 WynneEvents 事件总线监听游戏事件，驱动线性任务链的进度推进，并将状态持久化到 localStorage。最后集成到 zoo-home.js 和 index.html 中。

## 任务

- [x] 1. 创建 zoo-quest.js 核心模块骨架
  - [x] 1.1 创建 `js/zoo/zoo-quest.js` 文件，使用 IIFE 模式包裹，定义 `initQuestSystem(globalScope)` 入口函数
    - 定义 QUEST_CHAIN 静态常量数组（包含 6 个示例任务，字段：id、description、conditionType、targetValue、relatedId、navTarget）
    - 定义 runtimeState 运行时状态对象（version、currentQuestId、completedQuestIds、progress）
    - 定义 createDefaultState() 函数，返回初始状态（第一个任务为活跃）
    - _需求: 1.1, 1.3, 2.1, 11.1, 11.2_

  - [x] 1.2 实现 localStorage 持久化层
    - 实现 getStorageKey()：使用 `wynnesZoo.quest.user.{userId}` 格式，userId 通过 WynneZooEconomy.getActiveUserId() 获取
    - 实现 persistState()：将 runtimeState 序列化写入 localStorage
    - 实现 loadState()：从 localStorage 反序列化恢复状态，异常时回退到默认状态
    - 实现 normalizeState()：校验并修正非法存档数据
    - _需求: 8.1, 8.2, 8.3, 8.4_

  - [ ]* 1.3 编写属性测试：任务链数据结构完整性
    - **Property 13: Quest 数据结构完整性**
    - 验证 QUEST_CHAIN 中每个 Quest 对象包含非空的 id（正整数）、description（非空字符串）、conditionType（枚举值之一）、targetValue（正整数）
    - **验证: 需求 11.2**

  - [ ]* 1.4 编写属性测试：任务链 ID 唯一且有序
    - **Property 1: 任务链 ID 唯一且有序**
    - 验证任意 Quest_Chain 配置数组中所有 Quest 的 id 互不相同且严格递增
    - **验证: 需求 2.1**

  - [ ]* 1.5 编写属性测试：状态持久化往返一致性
    - **Property 8: 状态持久化往返一致性**
    - 验证合法的运行时状态经 JSON.stringify → JSON.parse 后与原始状态等价
    - **验证: 需求 8.1, 8.2**

  - [ ]* 1.6 编写属性测试：用户存储键隔离
    - **Property 9: 用户存储键隔离**
    - 验证两个不同 userId 生成的 localStorage 键互不相同
    - **验证: 需求 8.3**

- [x] 2. 实现任务进度检查与推进逻辑
  - [x] 2.1 实现进度检查核心函数
    - 实现 getActiveQuest()：根据 currentQuestId 从 QUEST_CHAIN 中查找当前活跃任务
    - 实现 onEconomyChange(snapshot, { reason })：根据 reason 和当前任务的 conditionType 匹配，更新 progress
    - 实现 onStoryComplete(payload)：处理 STORY_COMPLETE 事件，更新 story 类型任务进度
    - 实现 onRoundEnd(payload)：处理 ROUND_END 事件，更新 blindbox 类型任务进度
    - 实现 checkBuildCondition() 和 checkUpgradeCondition()：检查栏舍解锁/升级状态
    - _需求: 3.1, 3.3, 4.1, 4.2, 5.1, 5.2, 6.1, 6.3, 7.1, 7.3, 7.4_

  - [x] 2.2 实现任务完成与推进逻辑
    - 实现 checkCompletion()：比较 progress 与 targetValue，达标时调用 completeCurrentQuest()
    - 实现 completeCurrentQuest()：将当前任务加入 completedQuestIds，推进到下一个任务（重置 progress 为 0），或标记全部完成
    - 完成后触发 catchUpCheck 对新任务进行追赶检查
    - _需求: 2.2, 2.3, 2.4, 2.5, 3.2_

  - [ ]* 2.3 编写属性测试：匹配事件递增进度
    - **Property 4: 匹配事件递增进度**
    - 验证活跃 Quest 接收到匹配 conditionType 的事件时，progress 恰好增加 1
    - **验证: 需求 3.1, 6.1, 7.1**

  - [ ]* 2.4 编写属性测试：不匹配事件不改变进度
    - **Property 5: 不匹配事件不改变进度**
    - 验证活跃 Quest 接收到不匹配 conditionType 的事件时，progress 保持不变
    - **验证: 需求 3.3, 7.4**

  - [ ]* 2.5 编写属性测试：进度达标即完成
    - **Property 6: 进度达标即完成**
    - 验证 progress 达到或超过 targetValue 时，Quest 被移入 completedQuestIds 并推进到下一个
    - **验证: 需求 3.2**

  - [ ]* 2.6 编写属性测试：完成当前任务自动推进
    - **Property 2: 完成当前任务自动推进到下一个**
    - 验证非末尾 Quest 完成后，currentQuestId 等于下一个 Quest 的 id，progress 重置为 0
    - **验证: 需求 2.2**

  - [ ]* 2.7 编写属性测试：单一活跃任务不变量
    - **Property 3: 单一活跃任务不变量**
    - 验证 completedQuestIds 中所有 id 均小于 currentQuestId，无重复；全部完成时 completedQuestIds 包含所有 Quest id
    - **验证: 需求 2.3, 2.4, 2.5**

- [x] 3. 实现追赶检查（Catch-up Check）
  - [x] 3.1 实现 catchUpCheck(economy) 函数
    - 对 build 类型：检查经济系统快照中目标栏舍是否已解锁，已解锁则将 progress 设为 targetValue
    - 对 upgrade 类型：检查目标栏舍是否已升级（tier.id !== 'standard'），已升级则将 progress 设为 targetValue
    - 对 story 类型：检查已完成的剧情标记，用已完成章节数初始化 progress
    - 检查完成后调用 checkCompletion() 触发可能的自动完成
    - _需求: 4.3, 5.3, 6.4_

  - [ ]* 3.2 编写属性测试：追赶检查正确初始化进度
    - **Property 7: 追赶检查正确初始化进度**
    - 验证新激活的 Quest 如果经济系统快照中已满足完成条件，catch-up check 将 progress 设为不小于 targetValue 的值
    - **验证: 需求 4.1, 4.3, 5.1, 5.3, 6.4**

- [x] 4. 检查点 - 确保核心逻辑正确
  - 确保所有测试通过，如有疑问请询问用户。

- [x] 5. 实现公开 API 和事件发射
  - [x] 5.1 实现模块公开 API
    - 实现 getSnapshot()：返回当前任务系统的只读快照（currentQuestId、currentQuest、completedQuestIds、allCompleted、totalQuests）
    - 实现 subscribe(listener)：订阅任务状态变化，返回 unsubscribe 函数
    - 实现 getActiveQuestText()：返回当前活跃任务的描述文本（含进度），全部完成时返回"主线任务已全部完成"
    - 实现 getActiveQuestNavTarget()：返回当前任务的导航目标（'story' | 'slot' | 'habitat-panel' | null）
    - 实现 recheckProgress()：手动触发追赶检查
    - 通过 WynneRegistry.register('WynneZooQuest', api) 注册模块
    - _需求: 1.2, 9.1, 9.3_

  - [x] 5.2 实现任务完成事件发射和 Toast 提示
    - 在 completeCurrentQuest() 中通过 WynneEvents.emit 发出 'quest:complete' 事件，payload 包含 questId 和 nextQuestId
    - 在 completeCurrentQuest() 中调用 showCompletionToast() 显示包含已完成任务名称的 Toast 提示
    - _需求: 10.1, 10.2_

  - [ ]* 5.3 编写属性测试：UI 文本反映当前状态
    - **Property 10: UI 文本反映当前状态**
    - 验证 getActiveQuestText() 返回值包含当前活跃 Quest 的 description；全部完成时返回"主线任务已全部完成"
    - **验证: 需求 9.1, 9.2, 10.3**

  - [ ]* 5.4 编写属性测试：导航目标与任务类型映射
    - **Property 11: 导航目标与任务类型映射**
    - 验证 getActiveQuestNavTarget() 返回值与 conditionType 对应：feed/build/upgrade → 'habitat-panel'，story → 'story'，blindbox → 'slot'
    - **验证: 需求 9.3**

  - [ ]* 5.5 编写属性测试：完成事件发射
    - **Property 12: 完成事件发射**
    - 验证 Quest 完成时 Event_Bus 收到 'quest:complete' 事件，payload 包含已完成 Quest 的 id
    - **验证: 需求 10.1**

- [x] 6. 实现 UI 渲染与按钮导航
  - [x] 6.1 实现 renderQuestUI() 函数
    - 获取 DOM 元素 `#zoo-main-task-text`，更新文本内容
    - 对 feed/story/blindbox 类型任务显示进度格式：`${description}（${progress}/${targetValue}）`
    - 对 build/upgrade 类型任务仅显示 description
    - 全部完成时显示"主线任务已全部完成"
    - 在每次状态变更后调用 renderQuestUI() 和通知 subscribers
    - _需求: 9.1, 9.2, 9.4, 10.3_

- [x] 7. 集成到现有模块和页面
  - [x] 7.1 在 index.html 中引入 zoo-quest.js
    - 在 `zoo-economy.js` 之后、`zoo-home.js` 之前添加 `<script src="js/zoo/zoo-quest.js"></script>`
    - _需求: 1.1_

  - [x] 7.2 修改 zoo-home.js 集成任务系统
    - 通过 WynneRegistry.get('WynneZooQuest') 获取任务模块
    - 使用 getActiveQuestText() 初始化按钮文本
    - 为 `#zoo-main-task-btn` 添加点击事件：调用 getActiveQuestNavTarget() 获取导航目标，触发对应的屏幕切换
    - 订阅任务状态变化，实时更新按钮文本
    - _需求: 1.4, 9.1, 9.2, 9.3_

  - [x] 7.3 实现初始化流程中的事件订阅
    - 在 initQuestSystem 中订阅 economy.subscribe(onEconomyChange)
    - 监听 WynneEvents.EVENTS.STORY_COMPLETE 和 ROUND_END 事件
    - 执行初始追赶检查和首次 UI 渲染
    - _需求: 1.4, 4.2, 5.2, 6.3, 7.3_

- [x] 8. 最终检查点 - 确保所有测试通过
  - 确保所有测试通过，如有疑问请询问用户。

## 备注

- 标记 `*` 的任务为可选任务，可跳过以加速 MVP 开发
- 每个任务引用了具体的需求编号以确保可追溯性
- 检查点确保增量验证
- 属性测试使用 fast-check 库验证通用正确性属性
- 单元测试验证具体示例和边界情况
