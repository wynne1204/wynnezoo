# Figma 导入 UI 必读

> 适用于本项目（今天也要开园呀）的 Web 前端 Figma → CSS 落地规范。
> 设计稿基准宽度 **1170px**，运行时通过 `container-type: inline-size` + `cqw` 单位做响应式适配。

---

## 1. 核心原则（4 条铁律）

1. **截图只负责复核，Figma dev 数值才负责落地** — 不要凭肉眼猜位置
2. **所有像素值必须换算成 `calc(px / 1170 * 100cqw)`** — 不允许写死 `px`
3. **先落容器结构，再落背景/图标，再落文字** — 不要一把梭
4. **文字按文本框落，不按视觉居中猜** — Figma 的文字经常不在几何中心

---

## 2. 坐标换算公式

本项目唯一的换算方式：

```css
/* 位置和尺寸 */
left:   calc(X / 1170 * 100cqw);
top:    calc(Y / 1170 * 100cqw);
width:  calc(W / 1170 * 100cqw);
height: calc(H / 1170 * 100cqw);

/* 字号 */
font-size: calc(FIGMA_FONT_SIZE / 1170 * 100cqw);

/* 描边 */
-webkit-text-stroke: max(2px, calc(STROKE_WIDTH / 1170 * 100cqw)) COLOR;

/* 阴影 */
text-shadow: 0 calc(OFFSET_Y / 1170 * 100cqw) calc(BLUR / 1170 * 100cqw) rgba(...);
filter: drop-shadow(0 calc(Y / 1170 * 100cqw) calc(BLUR / 1170 * 100cqw) rgba(...));

/* 圆角 */
border-radius: calc(R / 1170 * 100cqw);
```

其中 `X / Y / W / H` 均为 Figma dev 面板中的绝对像素值。

### 2.1 子节点相对父节点定位

当子节点在一个已定位的父容器内时，用百分比更稳：

```css
/* 子节点相对于父容器的百分比定位 */
left:   calc(CHILD_X / PARENT_W * 100%);
top:    calc(CHILD_Y / PARENT_H * 100%);
width:  calc(CHILD_W / PARENT_W * 100%);
height: calc(CHILD_H / PARENT_H * 100%);
```

本项目中两种方式都在用：
- 顶层元素（直接挂在屏幕容器下）→ 用 `cqw`
- 嵌套元素（在已定位的父节点内）→ 用百分比

---

## 3. CSS 模板

### 3.1 图片节点（背景图 / 装饰图 / 图标）

```css
.my-image {
    position: absolute;
    left: calc(X / 1170 * 100cqw);
    top: calc(Y / 1170 * 100cqw);
    width: calc(W / 1170 * 100cqw);
    height: calc(H / 1170 * 100cqw);
    display: block;
    object-fit: fill;           /* 精确还原设计稿尺寸 */
    user-select: none;
    -webkit-user-drag: none;
    pointer-events: none;       /* 装饰图不接收点击 */
}
```

### 3.2 文本节点

```css
.my-text {
    position: absolute;
    left: calc(X / 1170 * 100cqw);
    top: calc(Y / 1170 * 100cqw);
    width: calc(W / 1170 * 100cqw);
    min-height: calc(H / 1170 * 100cqw);
    margin: 0;
    display: flex;
    align-items: center;        /* 根据 Figma 对齐方式调整 */
    justify-content: center;    /* 根据 Figma 对齐方式调整 */
    color: #XXXXXX;             /* 从 Figma 取色 */
    font-family: 'Magic', 'Microsoft YaHei', 'PingFang SC', sans-serif;
    font-size: calc(FONT_SIZE / 1170 * 100cqw);
    font-weight: WEIGHT;
    line-height: LINE_HEIGHT;
    text-align: center;
}
```

### 3.3 容器节点（分组 / Frame）

```css
.my-container {
    position: absolute;
    left: calc(X / 1170 * 100cqw);
    top: calc(Y / 1170 * 100cqw);
    width: calc(W / 1170 * 100cqw);
    height: calc(H / 1170 * 100cqw);
    z-index: N;                 /* 按层级关系设置 */
}
```

### 3.4 可交互按钮

```css
.my-button {
    position: absolute;
    left: calc(X / 1170 * 100cqw);
    top: calc(Y / 1170 * 100cqw);
    width: calc(W / 1170 * 100cqw);
    height: calc(H / 1170 * 100cqw);
    padding: 0;
    border: 0;
    background: none;
    cursor: pointer;
}

.my-button:active {
    transform: scale(0.98);
}
```

---

## 4. 描边文字的特殊处理

### 4.1 描边最小可见值

设计稿的描边在运行时会因缩放变得极细。必须设最小值：

```css
-webkit-text-stroke: max(2px, calc(STROKE_WIDTH / 1170 * 100cqw)) COLOR;
paint-order: stroke fill;
```

### 4.2 描边缓冲区（3px 安全边距）

浏览器描边会向字形外扩，文本框必须预留缓冲，否则边缘文字描边会被裁切：

```css
/* 原始 Figma 值 */
left: calc(X / 1170 * 100cqw);
top: calc(Y / 1170 * 100cqw);
width: calc(W / 1170 * 100cqw);
height: calc(H / 1170 * 100cqw);

/* 加 3px 缓冲后 */
left: calc((X - 3) / 1170 * 100cqw);
top: calc((Y - 3) / 1170 * 100cqw);
width: calc((W + 6) / 1170 * 100cqw);
height: calc((H + 6) / 1170 * 100cqw);
```

规则：**凡是带描边的文本，默认加 3px 缓冲，不需要每次讨论。**

---

## 5. 图片素材处理

### 5.1 区分 object-fit 用法

| 场景 | object-fit | 说明 |
| --- | --- | --- |
| 背景底图、UI 面板 | `fill` | 精确填满节点区域 |
| 动物立绘、头像 | `contain` | 保持比例，不裁切 |
| 全屏场景图 | `cover` | 保持比例，允许裁切 |

### 5.2 有外扩装饰的素材

有些图片素材自带阴影、光晕等外扩装饰。这时：
- 节点边界 ≠ 素材视觉边界
- 允许素材超出父节点逻辑框
- 用 `max-width: none` 配合精确宽高

### 5.3 圆形 / 正方形素材

宽高都要单独按节点值写，不要只控制一个维度：

```css
/* 错误 — 只控宽度，高度靠浏览器推 */
width: calc(138 / 1170 * 100cqw);

/* 正确 — 宽高都写 */
width: calc(138 / 1170 * 100cqw);
height: calc(138 / 1170 * 100cqw);
```

---

## 6. 从 Figma API 数据中提取关键信息

使用 `get_figma_data` 工具时，关注以下字段：

| 需要的信息 | Figma API 字段 | 说明 |
| --- | --- | --- |
| 位置 | `absoluteBoundingBox.x / y` | 绝对坐标，需减去父节点坐标得到相对值 |
| 尺寸 | `absoluteBoundingBox.width / height` | 节点宽高 |
| 文字内容 | `characters` | 文本节点的文字 |
| 字号 | `style.fontSize` | 文字大小 |
| 字重 | `style.fontWeight` | 文字粗细 |
| 行高 | `style.lineHeightPx` | 行高像素值 |
| 文字对齐 | `style.textAlignHorizontal / Vertical` | LEFT / CENTER / RIGHT |
| 填充色 | `fills[0].color` | RGBA，需转换为 CSS 颜色 |
| 描边 | `strokes` + `strokeWeight` | 描边颜色和宽度 |
| 圆角 | `cornerRadius` | 圆角半径 |
| 约束 | `constraints.horizontal / vertical` | 布局约束（参考用） |
| 透明度 | `opacity` | 节点透明度 |
| 混合模式 | `blendMode` | 混合模式 |
| 阴影 | `effects` (type: DROP_SHADOW) | 阴影参数 |

### 6.1 坐标转换步骤

```
1. 从 Figma API 拿到父节点和子节点的 absoluteBoundingBox
2. 子节点相对 X = child.x - parent.x
3. 子节点相对 Y = child.y - parent.y
4. 代入公式：left: calc(相对X / 1170 * 100cqw)
```

### 6.2 颜色转换

Figma API 返回的颜色是 0~1 的浮点数：

```
r: 0.98, g: 0.95, b: 0.84, a: 1
→ rgba(250, 242, 214, 1)
→ #faf2d6
```

公式：`Math.round(value * 255)`

---

## 7. 导入流程（固定顺序）

### 第一步：拿数据

1. 用 `get_figma_data` 获取节点树
2. 记录每个节点的 `absoluteBoundingBox`、`fills`、`style`、`effects`
3. 用 `download_figma_images` 下载所有图片素材到 `Texture/UI/` 对应目录

### 第二步：落结构（容器层）

1. 确定屏幕根容器（`position: absolute; inset: 0;`）
2. 按 Figma 层级关系，从外到内创建容器节点
3. 每个容器用 `position: absolute` + cqw 定位

### 第三步：落背景和装饰图

1. 全屏背景图放最底层
2. 面板底图、卡片底图按节点位置放
3. 统一加 `pointer-events: none; user-select: none;`

### 第四步：落图标和交互元素

1. 图标按节点位置放
2. 按钮用 `<button>` 标签，加 `cursor: pointer`
3. 需要点击的区域确保 `pointer-events: auto`

### 第五步：落文字

1. 严格按 Figma 文本框的 x / y / width / height 定位
2. 不要用 `translateX(-50%)` 猜居中
3. 带描边的文字加 3px 缓冲
4. 字号用 `calc(fontSize / 1170 * 100cqw)`

### 第六步：截图比对

1. 用浏览器截图和 Figma 设计稿逐层比对
2. 先检查容器位置 → 再检查背景 → 再检查图标 → 最后检查文字
3. 发现偏差时，按这个顺序排查，不要直接改文字

---

## 8. 常见错误速查

| 错误 | 正确做法 |
| --- | --- |
| 直接写 `left: 307px` | `left: calc(307 / 1170 * 100cqw)` |
| 文字用 `translateX(-50%)` 居中 | 按 Figma 文本框的 x/y/w/h 定位 |
| 描边文字不加缓冲 | 四周各加 3px 缓冲 |
| 描边只写设计稿值 `3px` | `max(2px, calc(3 / 1170 * 100cqw))` |
| 圆形图只写 width | width 和 height 都写 |
| 素材统一用 `object-fit: cover` | 根据场景选 fill / contain / cover |
| 一次性改容器+背景+文字 | 分层调试：容器 → 背景 → 图标 → 文字 |
| 用 Figma 绝对坐标直接当 CSS 值 | 先算相对于父节点的偏移 |
| 百分比和 cqw 混用不一致 | 顶层用 cqw，嵌套子节点用百分比 |

---

## 9. 简写约定

后续讨论 UI 时统一用这些简写：

- `cqw(307)` = `calc(307 / 1170 * 100cqw)`
- `pct(97, 1052)` = `calc(97 / 1052 * 100%)`
- `fs(80)` = `font-size: calc(80 / 1170 * 100cqw)`
- `stroke(3, #73432a)` = `-webkit-text-stroke: max(2px, calc(3 / 1170 * 100cqw)) #73432a`
- `buf(3)` = 描边缓冲 3px（四周各扩 3px）

---

## 10. 项目特定约定

- 设计稿基准宽度：`1170px`
- 设计稿基准高度：`2532px`
- 容器查询单位：`cqw`（基于 `.app-shell` 的 `container-type: inline-size`）
- 默认字体：`'Magic', 'Microsoft YaHei', 'PingFang SC', sans-serif`
- 图片素材目录：`Texture/UI/`
- CSS 文件：`style.css`
- 图片命名规范：`figma_` 前缀 + 语义名，如 `figma_detail_bg.png`
