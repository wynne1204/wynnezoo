# 实现计划：动物图鉴卡册化改造

## 概述

基于现有代码进行增量修改，将动物图鉴从"自然博物馆档案"风格改造为简洁的"卡册"风格。按照 HTML → JS → CSS 的顺序逐步改造，每步确保功能可用。

## 任务

- [x] 1. 移除概览区域 HTML 并调整页面结构
  - [x] 1.1 在 `index.html` 中移除 `.collection-overview-band` 整个 `<section>` 元素
    - 删除从 `<section class="collection-overview-band">` 到其闭合标签的所有内容
    - 保留 `.collection-progress-card` 不动，它将自然上移至标题栏下方
    - _需求: 1.1, 1.2, 1.3_

- [x] 2. 修改 JS 逻辑：简化卡片内容并移除概览渲染
  - [x] 2.1 修改 `js/zoo/zoo-collection.js` 中的 `buildCardMarkup()` 函数
    - 移除 `.collection-card-chip-row` 部分（包含 No.XX 编号和已记录/待发现状态标签）
    - 保留立绘 `<img>`、名字 `<p class="collection-card-title">` 和稀有度 `<p class="collection-card-rarity">`
    - 移除 `formatSpeciesNumber` 和 `entryNumber` 相关逻辑（不再需要）
    - 移除 `displayStatus` 变量（不再需要）
    - _需求: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [x] 2.2 修改 `buildEmptyCardMarkup()` 函数
    - 移除空白卡片中的 `.collection-card-chip-row` 部分
    - 简化为仅包含占位立绘区域和简短提示文字
    - _需求: 3.3_

  - [x] 2.3 修改 `renderGrid()` 函数，移除对 `renderOverview(collection)` 的调用
    - 删除 `renderGrid()` 中的 `renderOverview(collection);` 这一行
    - _需求: 1.1_

  - [x] 2.4 清理 `cacheDom()` 中概览区域相关的 DOM 引用
    - 移除 `refs` 对象中的 `overviewName`、`overviewDescription`、`overviewPage`、`overviewStatus`、`overviewImage`、`overviewCaption` 属性
    - 移除 `cacheDom()` 中对应的 querySelector 赋值语句
    - _需求: 1.1_

  - [x] 2.5 删除 `renderOverview()` 函数和 `getFeaturedSpecies()` 函数
    - 这两个函数在移除概览区域后不再被调用
    - _需求: 1.1_

  - [ ]* 2.6 编写属性测试：卡片仅包含立绘、名字和稀有度
    - **Property 1: 卡片仅包含立绘、名字和稀有度**
    - 使用 fast-check 生成随机 species 数据，验证 `buildCardMarkup()` 输出不包含 No.XX 编号和状态标签
    - **验证: 需求 2.1, 2.2, 2.3**

  - [ ]* 2.7 编写属性测试：未解锁卡片显示占位文字
    - **Property 2: 未解锁卡片显示占位文字**
    - 对 `unlocked === false` 的 species，验证名字为 "???"、稀有度为 "未知"
    - **验证: 需求 2.4**

  - [ ]* 2.8 编写属性测试：卡片元素顺序正确
    - **Property 3: 卡片元素顺序——立绘在前，名字居中，稀有度在后**
    - 验证 `<img>` 出现在名字元素之前，名字元素出现在稀有度元素之前
    - **验证: 需求 2.6**

- [x] 3. 检查点 - 确保 JS 改动正确
  - 确保所有测试通过，如有疑问请询问用户。

- [x] 4. 验证分页与进度条逻辑
  - [x] 4.1 确认 `renderGrid()` 中进度条更新逻辑保持不变
    - 验证 `refs.progressText` 和 `refs.progressFill` 的更新代码未被误删
    - 验证进度条在概览区域移除后仍正常工作
    - _需求: 4.1, 4.2, 4.3, 4.4_

  - [ ]* 4.2 编写属性测试：每页渲染恰好 9 个卡片槽位
    - **Property 4: 每页渲染恰好 9 个卡片槽位**
    - 对任意 species 列表和合法页码，验证卡片总数（真实 + 空白占位）恰好为 9
    - **验证: 需求 3.2, 3.3**

  - [ ]* 4.3 编写属性测试：翻页边界正确
    - **Property 5: 翻页边界正确**
    - 验证首页时上一页按钮禁用，末页时下一页按钮禁用，页码不越界
    - **验证: 需求 3.4**

  - [ ]* 4.4 编写属性测试：进度文字格式正确
    - **Property 6: 进度文字格式正确**
    - 验证进度文字匹配 `"已收集 {n} / {m}"` 格式
    - **验证: 需求 4.2**

  - [ ]* 4.5 编写属性测试：进度填充比例正确
    - **Property 7: 进度填充比例正确**
    - 验证填充宽度百分比等于 `(unlockedCount / totalSpecies) * 100`，不超过 100%
    - **验证: 需求 4.3**

- [x] 5. CSS 样式调整
  - [x] 5.1 在 `style.css` 中隐藏概览区域样式
    - 为 `.collection-overview-band` 添加 `display: none`（或直接移除相关样式块）
    - 为 `.collection-card-chip-row` 添加 `display: none`（或直接移除相关样式块）
    - _需求: 1.1, 2.2, 2.3_

  - [x] 5.2 调整卡片样式使立绘占据更大面积
    - 增大 `.collection-card-media` 和 `.collection-card img` 的高度
    - 简化 `.collection-card-content` 的内边距，仅容纳名字和稀有度
    - _需求: 2.5, 2.6_

- [x] 6. 验证详情弹窗和导航功能
  - [x] 6.1 确认详情弹窗功能未受影响
    - 验证 `openDetail()`、`closeDetail()`、`renderDetail()` 函数未被修改
    - 验证详情弹窗的 DOM 引用在 `cacheDom()` 中保留完整
    - _需求: 5.1, 5.2, 5.3, 5.4_

  - [x] 6.2 确认返回按钮和导航功能正常
    - 验证 `handleBack()` 和 `updateBackButton()` 函数未被修改
    - 验证 `bindEvents()` 中的事件绑定保持完整
    - _需求: 6.1, 6.2, 6.3_

  - [ ]* 6.3 编写属性测试：详情弹窗仅对已解锁卡片打开
    - **Property 8: 详情弹窗仅对已解锁卡片打开**
    - **验证: 需求 5.1, 5.2**

  - [ ]* 6.4 编写属性测试：详情弹窗包含完整信息
    - **Property 9: 详情弹窗包含完整信息**
    - **验证: 需求 5.3**

  - [ ]* 6.5 编写属性测试：关闭详情后恢复网格视图
    - **Property 10: 关闭详情后恢复网格视图**
    - **验证: 需求 5.4**

  - [ ]* 6.6 编写属性测试：返回按钮文字反映当前视图状态
    - **Property 11: 返回按钮文字反映当前视图状态**
    - **验证: 需求 6.3**

- [x] 7. 最终检查点 - 确保所有改动完整
  - 确保所有测试通过，如有疑问请询问用户。

## 备注

- 标记 `*` 的任务为可选任务，可跳过以加快 MVP 进度
- 每个任务引用了对应的需求编号以便追溯
- 检查点确保增量验证
- 属性测试验证通用正确性属性，单元测试验证具体示例和边界情况
- 本次改造为纯前端增量修改，不涉及后端或数据模型变更
