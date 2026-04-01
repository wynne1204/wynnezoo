# Requirements Document

## Introduction

优化登录界面的视觉表现：使用全屏背景图替代当前的渐变+模糊覆盖层，精简登录卡片内容（仅保留用户ID输入框和登录按钮），调整配色方案与背景图协调，并将输入区域定位到屏幕底部以最大化展示背景图。

## Glossary

- **Login_Overlay**: 登录界面的全屏覆盖层容器（`#login-overlay`），承载背景图和所有登录相关UI元素
- **Login_Card**: 登录卡片组件（`.login-card`），包含用户输入表单和登录按钮
- **Login_Form**: 登录表单（`#login-form`），包含用户ID输入框和登录按钮
- **Background_Image**: 登录界面背景图片，路径为 `Texture/UI/LoginBG.png`
- **Debug_Panel**: 调试面板（`#login-debug-panel`），用于开发调试的资源管理工具
- **Loading_View**: 加载界面（`#login-loading`），登录成功后显示的资源预加载进度界面

## Requirements

### Requirement 1: 全屏背景图展示

**User Story:** 作为玩家，我希望登录界面展示精美的全屏背景图，以获得沉浸式的视觉体验。

#### Acceptance Criteria

1. THE Login_Overlay SHALL 使用 `Texture/UI/LoginBG.png` 作为全屏背景图片，覆盖整个视口区域
2. THE Login_Overlay SHALL 使用 `background-size: cover` 和 `background-position: center` 确保背景图在不同屏幕尺寸下完整展示且居中
3. THE Login_Overlay SHALL 移除当前的 `backdrop-filter: blur(10px)` 和 `-webkit-backdrop-filter: blur(10px)` 样式，确保背景图清晰无模糊
4. THE Login_Overlay SHALL 移除当前的 `radial-gradient` 和 `linear-gradient` 渐变背景，改为使用背景图片

### Requirement 2: 精简登录卡片内容

**User Story:** 作为玩家，我希望登录界面简洁明了，只展示必要的输入和操作元素，减少视觉干扰。

#### Acceptance Criteria

1. THE Login_Card SHALL 仅包含用户ID输入框和登录按钮两个交互元素
2. THE Login_Card SHALL 移除 kicker 文字元素（"今天也要开园呀"，`.login-card-kicker`）
3. THE Login_Card SHALL 移除标题元素（"登录游戏"，`.login-card-title`）
4. THE Login_Card SHALL 移除描述文字元素（`.login-card-desc`）
5. THE Login_Card SHALL 移除 feedback 文字元素（`#login-feedback`，`.login-feedback`）的可见显示
6. WHILE Debug_Panel 和 Loading_View 处于当前状态时，THE Login_Card SHALL 保持 Debug_Panel 和 Loading_View 的 HTML 结构和功能不变

### Requirement 3: 配色方案与背景图协调

**User Story:** 作为玩家，我希望登录界面的UI元素颜色与背景图和谐搭配，呈现统一的视觉风格。

#### Acceptance Criteria

1. THE Login_Card SHALL 使用半透明背景色，使背景图能够透过卡片隐约可见
2. THE Login_Form 中的输入框 SHALL 使用与背景图色调协调的边框和背景色
3. THE Login_Form 中的登录按钮 SHALL 使用与背景图色调协调的渐变色或纯色方案
4. THE Login_Card SHALL 在背景图上保持足够的文字对比度，确保输入框 placeholder 和按钮文字清晰可读

### Requirement 4: 输入区域底部定位

**User Story:** 作为玩家，我希望输入区域位于屏幕底部，以便最大化展示背景图的主体内容。

#### Acceptance Criteria

1. THE Login_Overlay SHALL 将 Login_Card 定位到屏幕底部区域（使用 `align-items: flex-end`）
2. THE Login_Card SHALL 在底部保留适当的安全边距（考虑移动端安全区域 `env(safe-area-inset-bottom)`）
3. WHILE 屏幕宽度小于等于 560px 时，THE Login_Card SHALL 保持底部定位并适配移动端布局
4. THE Login_Card SHALL 在桌面端和移动端均保持底部定位的一致性

### Requirement 5: JS 功能兼容性

**User Story:** 作为开发者，我希望UI优化不影响现有的登录逻辑和调试功能。

#### Acceptance Criteria

1. THE Login_Form SHALL 保留 `#login-form`、`#login-user-id`、`#login-submit-btn` 的 DOM ID，确保 `zoo-login.js` 中的引用正常工作
2. THE Login_Card SHALL 保留 `#login-feedback` 元素在 DOM 中（可视觉隐藏但不移除），确保 JS 中 `setFeedback` 函数正常运行
3. THE Debug_Panel SHALL 保留所有调试相关的 DOM ID 和交互功能不变
4. THE Loading_View SHALL 保留加载界面的 DOM 结构和动画功能不变
