# 需求文档：动物图鉴卡册化改造

## 简介

将现有动物图鉴系统从"自然博物馆档案"风格改造为"卡册"风格。打开图鉴后呈现 3×3 的动物卡片网格，顶部仅保留一个收集进度奖励条，卡片上只显示动物立绘、名字和稀有度，移除所有多余信息（编号、状态标签、今日焦点概览区域等）。整体视觉参考用户提供的卡册式角色图鉴截图。

## 术语表

- **图鉴界面（Collection_Screen）**：展示所有动物卡片的全屏页面，对应 `#collection-screen`
- **卡片（Card）**：图鉴网格中的单个动物展示单元，对应 `.collection-card`
- **概览区域（Overview_Band）**：当前位于卡片网格上方的"今日焦点"展示区，对应 `.collection-overview-band`
- **进度条（Progress_Bar）**：显示收集进度的横向条形组件，对应 `.collection-progress-card`
- **详情弹窗（Detail_Panel）**：点击已解锁卡片后弹出的动物详细信息面板，对应 `.collection-detail`
- **稀有度（Rarity）**：动物的稀有等级标识，包括普通、少见、稀有、史诗、传说
- **立绘（Portrait）**：动物的全身或半身插画图片
- **卡片网格（Card_Grid）**：以 3×3 布局排列卡片的容器，对应 `.collection-grid`

## 需求

### 需求 1：移除概览区域

**用户故事：** 作为玩家，我希望打开图鉴后直接看到卡片网格，而不是先看到一个"今日焦点"概览区域，这样图鉴更像一本卡册。

#### 验收标准

1. WHEN 图鉴界面打开时，THE Collection_Screen SHALL 不渲染概览区域（Overview_Band）的任何内容
2. THE Collection_Screen SHALL 在移除概览区域后，将卡片网格上移以填充空出的空间
3. WHEN 图鉴界面打开时，THE Collection_Screen SHALL 在顶部标题栏下方、卡片网格上方仅显示进度条（Progress_Bar）

### 需求 2：简化卡片内容

**用户故事：** 作为玩家，我希望每张卡片只显示动物立绘、名字和稀有度，这样卡册看起来更简洁美观。

#### 验收标准

1. THE Card SHALL 仅包含三个可见元素：动物立绘（Portrait）、动物名字、稀有度（Rarity）标识
2. THE Card SHALL 不显示编号（No.XX）标签
3. THE Card SHALL 不显示状态标签（已记录/待发现）
4. WHEN 动物未解锁时，THE Card SHALL 将名字显示为"???"，稀有度显示为"未知"
5. THE Card SHALL 将动物立绘作为卡片的主要视觉区域，占据卡片大部分面积
6. THE Card SHALL 在立绘下方显示动物名字，在名字下方或旁边显示稀有度标识

### 需求 3：保持 3×3 网格布局

**用户故事：** 作为玩家，我希望每页看到 3×3 共 9 张卡片，这样卡册的排版整齐统一。

#### 验收标准

1. THE Card_Grid SHALL 以 3 列 3 行的网格布局排列卡片
2. THE Card_Grid SHALL 每页最多显示 9 张卡片
3. WHEN 当前页卡片不足 9 张时，THE Card_Grid SHALL 用空白占位卡片填充剩余位置以保持网格完整
4. THE Card_Grid SHALL 保留翻页功能，允许玩家在多页之间切换

### 需求 4：顶部收集进度奖励条

**用户故事：** 作为玩家，我希望在图鉴顶部看到一个收集进度奖励条，这样我能直观了解收集完成度。

#### 验收标准

1. THE Progress_Bar SHALL 显示在图鉴标题栏下方、卡片网格上方
2. THE Progress_Bar SHALL 显示当前已收集数量与总数量的文字（如"已收集 3 / 11"）
3. THE Progress_Bar SHALL 包含一个可视化的进度填充条，填充比例等于已收集数量除以总数量
4. THE Progress_Bar SHALL 是卡片网格上方唯一的信息展示组件（概览区域已移除）

### 需求 5：保留详情弹窗功能

**用户故事：** 作为玩家，我希望点击已解锁的卡片后仍然能查看动物的详细信息，这样卡册不会丢失信息深度。

#### 验收标准

1. WHEN 玩家点击一张已解锁的卡片时，THE Detail_Panel SHALL 弹出并显示该动物的详细信息
2. WHEN 玩家点击一张未解锁的卡片时，THE Detail_Panel SHALL 不弹出
3. THE Detail_Panel SHALL 包含动物立绘、名字、稀有度、图鉴简介、栖居环境、习性特征和解锁日期
4. WHEN 玩家点击详情弹窗的关闭按钮或弹窗外部区域时，THE Detail_Panel SHALL 关闭并返回卡片网格视图

### 需求 6：保留返回按钮与导航

**用户故事：** 作为玩家，我希望能从图鉴返回主界面，或从详情弹窗返回卡片列表，这样导航流畅不迷路。

#### 验收标准

1. WHEN 玩家在卡片网格视图时点击返回按钮，THE Collection_Screen SHALL 关闭并返回动物园主界面
2. WHEN 玩家在详情弹窗视图时点击返回按钮，THE Detail_Panel SHALL 关闭并返回卡片网格视图
3. THE Collection_Screen SHALL 根据当前视图状态动态更新返回按钮的文字（"返回主页"或"返回图鉴"）
