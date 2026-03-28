# 实施计划：系统解锁功能

## 概述

基于设计文档，将系统解锁功能拆分为增量式编码任务。从配置层开始，逐步实现核心解锁管理器、状态持久化扩展、触发集成、UI 展示，最后完成端到端联调。所有代码使用 vanilla JavaScript IIFE 模式，与现有项目风格一致。

## 任务

- [x] 1. 添加系统解锁表配置与 HTML 弹窗结构
  - [x] 1.1 在 `config/game-config.js` 中添加 `window.APP_CONFIG.systemUnlockTable` 配置数组
    - 添加首个条目：`collection`（动物图鉴），包含 `systemId`、`systemName`、`iconSrc`、`chapterId`、`beatIndex`、`navElementId` 六个字段
    - 预留注释示例展示如何追加新条目（如 `trip` 动物远行）
    - _需求: 1.1, 1.2, 1.3_

  - [x] 1.2 在 `index.html` 的 `zoo-home-screen` 区域内添加系统解锁弹窗 DOM 结构
    - 弹窗包含：遮罩层、弹窗卡片、系统图标 `<img>`、解锁文案、确认按钮
    - 弹窗默认 `hidden`，通过 `id="system-unlock-popup"` 标识
    - _需求: 3.1, 3.2, 3.5_

- [x] 2. 实现系统解锁管理器核心模块
  - [x] 2.1 创建 `js/zoo/system-unlock.js`，实现 `WynneSystemUnlock` 模块
    - 使用 IIFE 模式，注册到 `window.WynneSystemUnlock` 和 `WynneRegistry`
    - 实现 `mapChapterToStoryId(chapterId)` 方法：`0 → "prologue"`，`N≥1 → "第N章"`
    - 实现 `checkAndUnlock(completedStoryId)` 方法：读取解锁表，匹配 storyId，写入 `runtimeState.meta.unlockedSystems`，返回 `{ newlyUnlocked: [...] }`
    - 实现 `syncFromStoryFlags()` 方法：遍历解锁表，根据已有 storyFlags 补偿解锁
    - 实现 `isUnlocked(systemId)` 查询方法
    - 实现 `getAllStatus()` 返回所有系统解锁状态
    - 实现 `getPendingNotifications()` 和 `markNotificationShown(systemId)` 通知队列管理
    - 配置校验：跳过缺少必要字段或 chapterId 无效的条目，输出 console.warn
    - 通过 `WynneZooEconomy` 读写 `runtimeState` 并调用 `emitChange()` 持久化
    - _需求: 1.1, 1.2, 1.4, 2.1, 2.2, 2.3, 2.4, 2.5, 3.3, 3.4, 6.1, 6.2_

  - [ ]* 2.2 编写属性测试：章节ID到剧情ID映射正确性
    - **Property 2: 章节ID到剧情ID的映射正确性**
    - **验证: 需求 1.4**

  - [ ]* 2.3 编写属性测试：解锁条件匹配与状态更新
    - **Property 3: 解锁条件匹配与状态更新**
    - **验证: 需求 2.1, 2.2, 2.5**

  - [ ]* 2.4 编写属性测试：解锁操作幂等性
    - **Property 5: 解锁操作幂等性**
    - **验证: 需求 2.4**

  - [ ]* 2.5 编写属性测试：通知标记消除
    - **Property 6: 通知标记消除**
    - **验证: 需求 3.4**

  - [ ]* 2.6 编写属性测试：storyFlags 补偿解锁完整性
    - **Property 8: storyFlags 补偿解锁完整性**
    - **验证: 需求 6.1, 6.2**

- [x] 3. 检查点 - 确保核心模块测试通过
  - 确保所有测试通过，如有疑问请询问用户。

- [x] 4. 扩展 zoo-economy.js 支持 unlockedSystems 状态
  - [x] 4.1 在 `js/zoo/zoo-economy.js` 中扩展 `runtimeState.meta` 和相关函数
    - 在 `createDefaultState()` 中为 `meta` 添加 `unlockedSystems: {}` 默认值
    - 在 `normalizeState()` 中添加 `meta.unlockedSystems` 的规范化逻辑（确保为对象，每个值包含 `unlockedAt` 数字和 `notificationShown` 布尔值）
    - 在 `getSnapshot()` 中包含 `unlockedSystems` 数据
    - 暴露供 system-unlock.js 调用的内部方法（如 `getRuntimeState()`、`emitChange()`），或通过现有 API 模式支持外部模块读写
    - _需求: 2.3, 5.1, 5.2, 5.3_

  - [ ]* 4.2 编写属性测试：解锁状态持久化往返
    - **Property 4: 解锁状态持久化往返**
    - **验证: 需求 2.3, 5.1, 5.2**

- [x] 5. 集成触发层与展示层
  - [x] 5.1 在 `js/app-shell.js` 的 `showStory` 的 `onComplete` 回调中集成解锁检查
    - 在 `onComplete` 回调中，调用 `WynneSystemUnlock.checkAndUnlock(targetStoryId)`
    - 确保在 `markStoryPlayed` 之后、界面跳转之前调用
    - _需求: 2.1, 2.2, 2.5_

  - [x] 5.2 在 `js/zoo/zoo-home.js` 中实现导航按钮可见性控制
    - 在 `onShow()` 或 `render()` 中，调用 `WynneSystemUnlock.getAllStatus()` 获取解锁状态
    - 根据解锁状态设置各导航按钮（通过 `navElementId` 映射）的 `hidden` 属性
    - 确保每次进入主界面时刷新可见性
    - _需求: 4.1, 4.2, 4.3, 4.4_

  - [x] 5.3 在 `js/zoo/zoo-home.js` 中实现解锁弹窗展示逻辑
    - 在 `onShow()` 中调用 `WynneSystemUnlock.getPendingNotifications()` 获取待展示通知
    - 依次弹出解锁弹窗，展示系统图标和"解锁了 XXX 系统"文案
    - 弹窗关闭时调用 `markNotificationShown(systemId)` 标记已展示
    - 支持多个通知依次展示
    - try-catch 包裹弹窗渲染，静默失败不阻塞主界面
    - _需求: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [ ]* 5.4 编写属性测试：导航按钮可见性与解锁状态一致
    - **Property 7: 导航按钮可见性与解锁状态一致**
    - **验证: 需求 4.1, 4.2**

- [x] 6. 向后兼容与初始化联调
  - [x] 6.1 在 `js/app-shell.js` 或 `js/zoo/zoo-home.js` 的初始化流程中调用 `syncFromStoryFlags()`
    - 确保游戏加载时，已有玩家的 storyFlags 能自动补偿解锁满足条件的系统
    - 在 `index.html` 中按正确顺序引入 `js/zoo/system-unlock.js`（在 `zoo-economy.js` 之后、`app-shell.js` 之前）
    - _需求: 6.1, 6.2_

  - [ ]* 6.2 编写属性测试：配置验证完整性
    - **Property 1: 配置验证完整性**
    - **验证: 需求 1.1, 1.2, 4.4**

- [x] 7. 最终检查点 - 确保所有测试通过
  - 确保所有测试通过，如有疑问请询问用户。

## 备注

- 标记 `*` 的任务为可选任务，可跳过以加速 MVP 交付
- 每个任务引用了具体的需求条款，确保可追溯性
- 属性测试使用 fast-check 库，验证设计文档中定义的正确性属性
- 检查点任务确保增量验证
