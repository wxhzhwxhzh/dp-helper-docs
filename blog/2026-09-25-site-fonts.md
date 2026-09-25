---
slug: site-fonts
title: 给文档站引入思源黑体/宋体，导航栏一键切换
authors: [saoshen]
tags: [docusaurus, navbar]
---

给本站接入了思源黑体 / 思源宋体两套字体，并在导航栏加了一个按钮，点击即可在「黑体 ↔ 宋体」之间切换。过程不小心中了两个 Docusaurus 3.x 的坑：`themeConfig.stylesheets` 静默失效、自定义导航项类型过不了配置校验。这里把做法和排坑过程记一下。

{/* truncate */}

## 需求

1. 全站默认用思源黑体，替换掉系统默认字体；
2. 同时引入思源宋体，与黑体互为备份；
3. 导航栏放一个按钮，点击在两种字体间来回切换，选择要记住（刷新不丢）。

## 第一步：引入字体

字体走 CDN，选 jsDelivr 上 @fontsource 打包好的 **Noto Sans / Serif SC**（思源黑体 / 宋体的 Google 版）。只引入 400 和 700 两个字重——中文分包子集本就多，全字重会让请求成倍增加，正文 + 标题用 400/700 就够。

**坑 1：`themeConfig.stylesheets` 在 Docusaurus 3.x 里已经失效。**

网上绝大多数教程（包括旧版官方文档）都教你把 `stylesheets` 写在 `themeConfig` 里，v2 时代确实可以；但 v3 已把它废弃，并移到配置的**顶层**。废弃后并不会报错，只会静默不生效——我最初按老写法加的字体，`npm run build` 稳稳通过，产物里却压根没有对应的 `<link>`，等于白写。改成顶层后就正常了：

```js
// docusaurus.config.js 顶层
stylesheets: [
  'https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-sc@5.3.0/400.css',
  'https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-sc@5.3.0/700.css',
  'https://cdn.jsdelivr.net/npm/@fontsource/noto-serif-sc@5.3.0/400.css',
  'https://cdn.jsdelivr.net/npm/@fontsource/noto-serif-sc@5.3.0/700.css',
],
```

一个额外的好处：@fontsource 的字体会自带 `font-display: swap`，字体没加载完时先回退显示，不会白屏等着。

## 第二步：用 CSS 变量做切换

Docusaurus 的主题字体由 Infima 的 `--ifm-font-family-base` 决定，正文和标题都从它取值。所以「换字体」的本质就是换这个变量：

```css
/* src/css/custom.css */
:root {
  --ifm-font-family-base: 'Noto Sans SC', system-ui, 'Segoe UI', sans-serif;
}

/* 切到宋体：给 <html> 加 data-font="serif" 时覆盖 */
[data-font='serif'] {
  --ifm-font-family-base: 'Noto Serif SC', 'Noto Sans SC', system-ui, serif;
}
```

默认态就是黑体，无需任何属性；`html[data-font="serif"]` 时变量整体换源，标题和正文一起跟着变。代码块字体独立走 `--ifm-font-family-monospace`，保持等宽不受影响。

## 第三步：导航栏加切换按钮

先加一个 React 组件 `src/theme/NavbarItem/FontToggle.js`，负责读写 localStorage 并操作 `<html data-font>`：

```jsx
import React, {useEffect, useState} from 'react';

const STORAGE_KEY = 'dp-font';
const FONTS = ['sans', 'serif'];
const FONT_LABELS = {sans: '黑体', serif: '宋体'};

function applyFont(font) {
  if (font === 'serif') {
    document.documentElement.dataset.font = 'serif';
  } else {
    delete document.documentElement.dataset.font;
  }
}

function getStoredFont() {
  const stored = globalThis.localStorage?.getItem(STORAGE_KEY);
  return FONTS.includes(stored) ? stored : 'sans';
}

export default function FontToggle() {
  const [font, setFont] = useState('sans');

  useEffect(() => {
    const stored = getStoredFont();
    setFont(stored);
    applyFont(stored);
  }, []);

  const toggle = () => {
    const next = font === 'serif' ? 'sans' : 'serif';
    globalThis.localStorage?.setItem(STORAGE_KEY, next);
    setFont(next);
    applyFont(next);
  };

  return (
    <button
      className="navbar__item navbar__link navbar__font-toggle"
      type="button"
      onClick={toggle}
      aria-label={`字体：${FONT_LABELS[font]}（点击切换）`}
    >
      字体：{FONT_LABELS[font]}
    </button>
  );
}
```

**坑 2：自定义导航项类型（`type: 'fontToggle'`）过不了配置校验。**

一开始想当然：导航项就是 `themeConfig.navbar.items` 数组里的一项，那自定义类型照葫芦画瓢写一句 `{type: 'fontToggle', position: 'right'}` 不就行了？结果 build 直接报：

```
ValidationError: Bad navbar item type fontToggle
```

Docusaurus 3.x 对 `navbar.items` 的 `type` 字段做了 schema 白名单校验，未知类型在构建早期就被拦下，根本走不到组件查找那一步。

**换一条更直接的路：swizzle `Navbar/Content`，把 `<FontToggle />` 直接渲染进导航栏。**

执行：

```bash
npm run swizzle @docusaurus/theme-classic Navbar/Content -- --eject
```

它会生成 `src/theme/Navbar/Content/index.js` 作为内置组件的副本（`src/theme/` 下的文件优先于内置主题）。找到右侧面板那段，把组件插进深色模式切换按钮旁边：

```jsx
right={
  <>
    <NavbarItems items={rightItems} />
    <FontToggle />
    <NavbarColorModeToggle />
    {/* ... */}
  </>
}
```

这完全绕开了 type 校验。代价是 `Navbar/Content` 变成自维护副本，以后升级 Docusaurus 可能要跟着 difftool 同步一下——对本站这种小站完全可接受。

按钮样式在 custom.css 补一笔，模拟 `.navbar__link` 观感：

```css
.navbar__font-toggle {
  cursor: pointer;
  background: none;
  border: none;
  font: inherit;
  color: var(--ifm-font-color-base);
  padding: var(--ifm-navbar-item-padding-vertical)
    var(--ifm-navbar-item-padding-horizontal);
  white-space: nowrap;
}

[data-theme='light'] .navbar__font-toggle:hover {
  color: var(--ifm-color-primary);
}

[data-theme='dark'] .navbar__font-toggle:hover {
  color: var(--ifm-color-primary-lighter);
}
```

## 第四步：防闪字（FOUC）

按钮的工作是在「加载后」给 `<html>` 贴 `data-font`。问题：CSS 默认按黑体渲染，若用户上次选的是宋体，页面会先画一版黑体、React 挂载后再突然变成宋体——闪一下。

解决：把「读 localStorage → 设 data-font」的逻辑提前到渲染之前，用 `headTags` 注入一段极短的内联脚本（原理与 Docusaurus 自带主题检测脚本一样）：

```js
headTags: [
  {
    tagName: 'script',
    attributes: {},
    innerHTML:
      "(function(){try{var f=localStorage.getItem('dp-font');if(f==='serif'){document.documentElement.dataset.font='serif';}}catch(e){}})();",
  },
],
```

首帧就是正确字体，无从闪起。注意 `headTags` 需要显式给 `attributes`（哪怕为空对象），否则校验会报 `"headTags[0].attributes" is required`。

## 验证

- `npm run build` 通过；
- 检查产物 `build/index.html`：4 个字体 `<link>`、切换按钮、反闪烁内联脚本都在；
- `npm run start` 手点验证：切换即时生效、刷新后保持、两种主题下 hover 颜色正常。

本次踩坑清单（Docusaurus 3.10.2）：`themeConfig.stylesheets` 已废弃请改用顶层 `stylesheets`；自定义 navbar type 会被 schema 拦截，改 swizzle 注入组件。