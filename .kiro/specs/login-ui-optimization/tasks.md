# Implementation Plan: Login UI Optimization

## Overview

将登录界面从渐变+模糊背景改为全屏背景图，精简登录卡片内容，调整配色方案为暖色调，并将输入区域定位到屏幕底部。变更范围：`index.html`（HTML 结构精简）和 `style.story.css`（CSS 样式修改），不涉及 JS 逻辑变更。

## Tasks

- [x] 1. 修改 Login Overlay 背景样式
  - [x] 1.1 替换 `.login-overlay` 背景为全屏背景图
    - 将 `background` 从 `radial-gradient` + `linear-gradient` 替换为 `url('Texture/UI/LoginBG.png') center / cover no-repeat`
    - 添加 `background-color: #0b1324` 作为图片加载失败的 fallback
    - 移除 `backdrop-filter: blur(10px)` 和 `-webkit-backdrop-filter: blur(10px)`
    - 将 `align-items` 从 `center` 改为 `flex-end`（桌面端统一底部定位）
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 4.1_

  - [x] 1.2 更新移动端响应式样式
    - 移除 `@media (max-width: 560px)` 中 `.login-overlay` 的 `align-items: flex-end`（已在桌面端统一设置）
    - 确保移动端 padding 保持 `18px`
    - _Requirements: 4.3, 4.4_

- [x] 2. 精简 Login Card HTML 结构
  - [x] 2.1 移除多余的文字元素
    - 从 `index.html` 中移除 `<div class="login-card-kicker">今天也要开园呀</div>`
    - 移除 `<h1 class="login-card-title">登录游戏</h1>`
    - 移除 `<p class="login-card-desc">输入用户 ID 后进入游戏，同一 ID 会自动读取对应存档。</p>`
    - 保留 `#login-form`、`#login-feedback` 及 Debug/Loading 相关结构不变
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.6_

  - [x] 2.2 视觉隐藏 `#login-feedback` 元素
    - 在 `style.story.css` 中将 `.login-feedback` 改为 sr-only 样式（`position: absolute; width: 1px; height: 1px; clip: rect(0,0,0,0); overflow: hidden; margin: -1px; padding: 0; border: 0; white-space: nowrap;`）
    - 保留 DOM 节点和 `aria-live="polite"` 属性，确保 JS `setFeedback` 函数正常工作
    - _Requirements: 2.5, 5.2_

- [x] 3. 调整 Login Card 和表单配色样式
  - [x] 3.1 修改 `.login-card` 样式
    - 背景透明度从 `0.88` 调整为 `0.72`（`rgba(11, 19, 36, 0.72)`）
    - padding 从 `32px 28px 24px` 减小为 `24px`
    - border-radius 从 `28px` 改为 `20px`
    - 添加 `margin-bottom: max(16px, env(safe-area-inset-bottom))` 安全边距
    - _Requirements: 3.1, 4.2_

  - [x] 3.2 调整输入框边框和 focus 色调
    - `.login-field input` 边框保持 `rgba(255,255,255,0.15)`，border-radius 改为 `14px`
    - `.login-field input:focus` 边框色改为 `rgba(255, 220, 160, 0.8)`，box-shadow 改为暖色 `rgba(255, 200, 120, 0.15)`
    - _Requirements: 3.2_

  - [x] 3.3 调整登录按钮渐变色
    - `.login-submit-btn` 的 `background` 从 `linear-gradient(135deg, #60d26b, #2fb9ff)` 改为 `linear-gradient(135deg, #f0a040, #e8783a)`
    - `box-shadow` 改为 `0 8px 24px rgba(232, 120, 58, 0.3)`
    - `color` 改为 `#fff`
    - `border-radius` 改为 `14px`
    - _Requirements: 3.3_

- [x] 4. Checkpoint - 视觉验证
  - Ensure all tests pass, ask the user if questions arise.
  - 请用户在浏览器中打开页面，确认背景图显示正常、卡片底部定位正确、配色协调

- [x] 5. DOM ID 兼容性验证
  - [ ]* 5.1 编写 Property Test：所有 JS 引用的 DOM ID 必须存在
    - **Property 1: 所有 JS 引用的 DOM ID 必须存在**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4**
    - 使用 fast-check 的 `fc.constantFrom()` 从 `zoo-login.js` 引用的 ID 列表中随机抽取
    - 验证 `document.getElementById(id)` 返回非 null
    - ID 列表：`login-overlay`, `login-form`, `login-user-id`, `login-submit-btn`, `login-feedback`, `login-debug-toggle`, `login-debug-panel`, `login-debug-close`, `debug-user-id`, `debug-add-coin`, `debug-add-diamond`, `debug-add-ticket`, `debug-apply-btn`, `debug-feedback`, `login-loading`, `login-loading-fill`

- [x] 6. Final checkpoint - 确保所有变更完成
  - Ensure all tests pass, ask the user if questions arise.
  - 确认 HTML 结构精简完成、CSS 样式全部更新、JS 功能不受影响

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- 本次优化不修改 `zoo-login.js`，所有 DOM ID 必须保留
- `Texture/UI/LoginBG.png` 背景图需提前准备好
- Property test 验证 DOM ID 完整性，确保 HTML 精简不会破坏 JS 功能
