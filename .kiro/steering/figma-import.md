---
inclusion: fileMatch
fileMatchPattern: "style.css,**/*.css,**/Texture/UI/**,Doc/figma*"
---

# Figma 导入 CSS 规范

本项目使用 `container-type: inline-size` + `cqw` 单位做响应式适配，设计稿基准宽度 1170px。

## 换算规则

- 所有像素值：`calc(px / 1170 * 100cqw)`
- 嵌套子节点用百分比：`calc(childPx / parentPx * 100%)`
- 字号：`calc(fontSize / 1170 * 100cqw)`
- 描边：`-webkit-text-stroke: max(2px, calc(strokeWidth / 1170 * 100cqw)) color; paint-order: stroke fill;`
- 带描边文字必须加 3px 缓冲（left/top 各减 3，width/height 各加 6）

## 落地顺序

1. 容器结构 → 2. 背景装饰图 → 3. 图标交互元素 → 4. 文字

## 关键规则

- 不允许写死 px，必须用 cqw 换算
- 文字按 Figma 文本框 x/y/w/h 定位，不要用 translateX(-50%) 猜居中
- 圆形/正方形素材宽高都要写
- 装饰图统一加 `pointer-events: none; user-select: none; -webkit-user-drag: none;`
- 图片 object-fit：背景底图用 fill，立绘用 contain，全屏场景用 cover

## 详细规范

完整文档见 #[[file:Doc/figma导入UI必读.md]]
