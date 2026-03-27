# 需求文档：主线任务系统

## 简介

主线任务系统为动物园经营游戏提供线性引导机制。玩家按顺序完成一系列主线任务，每完成一个任务自动解锁下一个。任务条件涵盖喂养动物、建造栏舍、升级栏舍、完成剧情章节、进行盲盒挑战等核心玩法。任务入口位于动物园主页左下角，代码作为独立模块拆分到单独文件中。

## 术语表

- **Quest_System**：主线任务系统模块，负责任务状态管理、进度追踪和 UI 渲染
- **Quest**：单个主线任务，包含唯一标识、描述文本、完成条件和奖励信息
- **Quest_Chain**：按固定顺序排列的任务序列，玩家必须依次完成
- **Quest_Condition**：任务的完成条件，定义了需要达成的具体目标
- **Condition_Type**：任务条件的类型枚举，包括 feed（喂养）、build（建造）、upgrade（升级）、story（剧情）、blindbox（盲盒挑战）
- **Quest_Progress**：当前任务的累计进度值，用于与目标值比较判断是否完成
- **Zoo_Economy**：动物园经济系统（WynneZooEconomy），管理资源、栏舍和动物状态
- **Event_Bus**：事件总线（WynneEvents），用于模块间解耦通信
- **Module_Registry**：模块注册中心（WynneRegistry），用于注册和获取模块实例

## 需求

### 需求 1：独立模块架构

**用户故事：** 作为开发者，我希望主线任务系统作为独立 JS 文件存在，以便于维护和扩展。

#### 验收标准

1. THE Quest_System SHALL 作为独立的 JavaScript 文件存放在 `js/zoo/` 目录下
2. THE Quest_System SHALL 通过 Module_Registry 注册自身，使其他模块可通过 `WynneRegistry.get()` 获取
3. THE Quest_System SHALL 遵循项目现有的 IIFE 模块模式（与 zoo-economy.js、zoo-home.js 等保持一致）
4. THE Quest_System SHALL 通过 Event_Bus 监听游戏事件，避免与其他模块产生直接耦合

### 需求 2：线性任务链

**用户故事：** 作为玩家，我希望主线任务按顺序逐个解锁，以获得清晰的游戏引导。

#### 验收标准

1. THE Quest_System SHALL 维护一个有序的 Quest_Chain，其中每个 Quest 拥有唯一的序号标识
2. WHEN 玩家完成当前 Quest 时，THE Quest_System SHALL 自动将下一个 Quest 设为当前活跃任务
3. WHILE 当前 Quest 未完成时，THE Quest_System SHALL 保持后续所有 Quest 为锁定状态
4. THE Quest_System SHALL 在任意时刻仅有一个活跃 Quest（或全部完成时无活跃 Quest）
5. IF Quest_Chain 中所有 Quest 均已完成，THEN THE Quest_System SHALL 将状态标记为全部完成

### 需求 3：任务条件 — 喂养动物

**用户故事：** 作为玩家，我希望通过喂养动物来推进主线任务，以鼓励我照顾动物园中的动物。

#### 验收标准

1. WHEN Zoo_Economy 执行一次喂养操作时，THE Quest_System SHALL 将当前活跃 Quest 的 feed 类型 Quest_Progress 增加 1
2. WHEN Quest_Progress 达到 Quest_Condition 中定义的目标次数时，THE Quest_System SHALL 将该 Quest 标记为已完成
3. THE Quest_System SHALL 仅在当前活跃 Quest 的 Condition_Type 为 feed 时累计喂养进度

### 需求 4：任务条件 — 建造小熊猫栏舍

**用户故事：** 作为玩家，我希望通过建造小熊猫栏舍来完成主线任务，以推动动物园的扩建进程。

#### 验收标准

1. WHEN 玩家成功解锁小熊猫栏舍时，THE Quest_System SHALL 将 build 类型的 Quest 标记为已完成
2. THE Quest_System SHALL 通过监听 Zoo_Economy 的栏舍解锁事件来检测建造完成
3. IF 小熊猫栏舍在任务激活前已被解锁，THEN THE Quest_System SHALL 在任务激活时立即将该 Quest 标记为已完成

### 需求 5：任务条件 — 升级小熊猫栏舍

**用户故事：** 作为玩家，我希望通过升级小熊猫栏舍来完成主线任务，以激励我持续改善动物的居住环境。

#### 验收标准

1. WHEN 玩家成功升级小熊猫栏舍的等级时，THE Quest_System SHALL 将 upgrade 类型的 Quest 标记为已完成
2. THE Quest_System SHALL 通过监听 Zoo_Economy 的栏舍升级事件来检测升级完成
3. IF 小熊猫栏舍在任务激活前已达到目标等级，THEN THE Quest_System SHALL 在任务激活时立即将该 Quest 标记为已完成

### 需求 6：任务条件 — 完成剧情章节

**用户故事：** 作为玩家，我希望通过完成指定章节的剧情来推进主线任务，以将剧情体验与任务系统关联起来。

#### 验收标准

1. WHEN 玩家完成指定章节的剧情时，THE Quest_System SHALL 将 story 类型的 Quest_Progress 增加 1
2. WHEN Quest_Progress 达到 Quest_Condition 中定义的目标章节数时，THE Quest_System SHALL 将该 Quest 标记为已完成
3. THE Quest_System SHALL 通过监听 Event_Bus 上的 STORY_COMPLETE 事件来检测剧情完成
4. IF 目标章节在任务激活前已被完成，THEN THE Quest_System SHALL 在任务激活时根据已完成的章节数初始化 Quest_Progress

### 需求 7：任务条件 — 盲盒挑战

**用户故事：** 作为玩家，我希望通过进行盲盒挑战来完成主线任务，以鼓励我体验核心玩法。

#### 验收标准

1. WHEN 玩家完成一次盲盒挑战回合时，THE Quest_System SHALL 将 blindbox 类型的 Quest_Progress 增加 1
2. WHEN Quest_Progress 达到 Quest_Condition 中定义的目标次数时，THE Quest_System SHALL 将该 Quest 标记为已完成
3. THE Quest_System SHALL 通过监听 Event_Bus 上的 ROUND_END 事件来检测盲盒挑战完成
4. THE Quest_System SHALL 仅在当前活跃 Quest 的 Condition_Type 为 blindbox 时累计盲盒挑战进度

### 需求 8：任务进度持久化

**用户故事：** 作为玩家，我希望主线任务的进度在刷新页面后仍然保留，以避免丢失已完成的任务进度。

#### 验收标准

1. WHEN Quest_Progress 发生变化时，THE Quest_System SHALL 将当前任务状态持久化到 localStorage
2. WHEN 页面加载时，THE Quest_System SHALL 从 localStorage 恢复之前保存的任务进度
3. THE Quest_System SHALL 使用与 Zoo_Economy 一致的用户标识作为存储键前缀，确保多用户数据隔离
4. IF localStorage 中无已保存的任务数据，THEN THE Quest_System SHALL 初始化为第一个 Quest 为活跃状态

### 需求 9：左下角 UI 展示

**用户故事：** 作为玩家，我希望在动物园主页左下角看到当前主线任务的信息，以便随时了解下一步目标。

#### 验收标准

1. THE Quest_System SHALL 在动物园主页左下角的现有 `zoo-main-task-btn` 按钮中展示当前活跃 Quest 的描述文本
2. WHEN Quest_Progress 发生变化时，THE Quest_System SHALL 实时更新按钮中显示的任务进度文本
3. WHEN 玩家点击任务按钮时，THE Quest_System SHALL 根据当前任务类型引导玩家前往对应的功能界面
4. IF 所有 Quest 均已完成，THEN THE Quest_System SHALL 在按钮中显示"主线任务已全部完成"

### 需求 10：任务完成反馈

**用户故事：** 作为玩家，我希望在完成任务时获得明确的反馈提示，以获得成就感并知道下一个任务是什么。

#### 验收标准

1. WHEN 一个 Quest 被标记为已完成时，THE Quest_System SHALL 通过 Event_Bus 发出任务完成事件
2. WHEN 一个 Quest 被标记为已完成时，THE Quest_System SHALL 在界面上显示一条 Toast 提示，包含已完成任务的名称
3. WHEN 下一个 Quest 被激活时，THE Quest_System SHALL 更新左下角按钮文本为新任务的描述

### 需求 11：任务配置数据

**用户故事：** 作为开发者，我希望任务链的配置数据以静态数组形式定义在代码中，以便于后续扩展和调整任务内容。

#### 验收标准

1. THE Quest_System SHALL 将 Quest_Chain 定义为模块内的静态常量数组
2. THE Quest_System SHALL 为每个 Quest 定义以下字段：唯一 id、描述文本、Condition_Type、目标值、关联的栏舍或剧情标识
3. THE Quest_System SHALL 支持通过修改静态数组来增删任务，无需改动核心逻辑代码
