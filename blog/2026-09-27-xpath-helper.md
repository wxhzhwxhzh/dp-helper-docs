---
slug: xpath-helper
title: 自用油猴脚本：Alt+X 一键生成 XPath，直接转成 DrissionPage / Playwright 代码
authors: [saoshen]
tags: [xpath]
description: 一个纯油猴实现的元素拾取器，Alt+X 拾取元素、勾选定位条件生成 XPath、查重，并一键复制成 DrissionPage / Playwright 可用的代码。
---

写 DrissionPage 脚本时，定位元素这一步花的时间往往比业务流程还多。DevTools 里的 Copy XPath 有几个问题：复制出来的是绝对路径（`/html/body/div[2]/...`），页面稍微改一点层级就失效；生成的 `//div[@id="x"]/div[3]/span[1]` 太长；最关键的是——它只给你 XPath，不给你**能直接跑的代码**。

所以用油猴写了个自用脚本：**Alt+X 进入拾取模式 → 点一下元素 → 勾选你关心的定位条件（id / 文字 / 任意属性）→ XPath 自动拼好 → 一键复制成 DrissionPage 或 Playwright 的代码**。整个过程不出控制台。

{/* truncate */}

## 效果与安装

先看它能干什么：

| 能力 | 说明 |
|---|---|
| `Alt + X` 快捷键 | 任何页面随时进入拾取模式（不用开 DevTools、不用装扩展面板） |
| 悬停高亮 | 蓝色框跟随鼠标，点击即选中 |
| 条件式生成 | 勾 `id`、勾 `textContent`、勾任意 `data-*` / `class` / `aria-label`，实时拼成 XPath |
| 默认条件智能挑选 | 按 `id → class → 文字 → data-testid → …` 的优先级自动勾一个最稳的 |
| XPath 查重 | 一键跑 `document.evaluate`，在控制台打印匹配到的元素和数量 |
| 多格式复制 | 复制 XPath / Playwright / DrissionPage 定位 / 点击 / 输入 / 动作链 |
| 弹窗可拖动 | 位置记在 `localStorage`，下次自动弹到上次的地方 |
| 页面样式零污染 | 面板挂在 Shadow DOM 里，网站怎么改 CSS 都不影响 |

安装：新建油猴脚本，把下面整段代码粘进去保存即可。首次使用在 `chrome://extensions/` 里给 Tampermonkey 打开「允许用户脚本」。

## 完整代码

```javascript
// ==UserScript==
// @name         XPath Helper (Alt+X)
// @namespace   doubao.xpath-helper
// @version     1.0.0
// @description 按 Alt+X 进入元素拾取模式，点击元素后弹出 XPath 生成面板，可复制多种定位代码。
// @match       *://*/*
// @run-at      document-idle
// @grant       none
// ==/UserScript==

(function () {
    'use strict';

    /* ============ 轻量 toast ============ */
    function toast(text, duration = 1200) {
        const el = document.createElement('div');
        Object.assign(el.style, {
            position: 'fixed', left: '50%', bottom: '32px', transform: 'translateX(-50%)',
            padding: '8px 14px', background: 'rgba(17,24,39,.85)', color: '#fff',
            borderRadius: '6px', zIndex: '2147483647', font: '14px -apple-system,Segoe UI,Roboto,sans-serif',
            boxShadow: '0 4px 12px rgba(0,0,0,.2)', pointerEvents: 'none'
        });
        el.textContent = text;
        document.body.appendChild(el);
        setTimeout(() => el.remove(), duration);
    }

    /* ============ 元素拾取器（悬停高亮 + 点击选中） ============ */
    const ElementPicker = {
        pick() {
            return new Promise((resolve) => {
                const highlight = document.createElement('div');
                Object.assign(highlight.style, {
                    position: 'fixed', zIndex: '2147483646', display: 'none',
                    border: '2px solid #2563eb', borderRadius: '3px',
                    background: 'rgba(37,99,235,.15)', pointerEvents: 'none'
                });
                document.body.appendChild(highlight);

                const hint = document.createElement('div');
                Object.assign(hint.style, {
                    position: 'fixed', top: '16px', left: '50%', transform: 'translateX(-50%)',
                    padding: '8px 14px', background: 'rgba(17,24,39,.65)', color: '#fff',
                    borderRadius: '6px', fontSize: '14px', zIndex: '2147483647',
                    font: '14px -apple-system,Segoe UI,Roboto,sans-serif', pointerEvents: 'none'
                });
                hint.textContent = '点击选择元素，按 Esc 取消';
                document.body.appendChild(hint);
                document.documentElement.style.cursor = 'crosshair';

                let current = null;

                function onMove(e) {
                    const el = e.target;
                    if (!(el instanceof HTMLElement) || el === hint || el === highlight) return;
                    current = el;
                    const r = el.getBoundingClientRect();
                    highlight.style.display = 'block';
                    highlight.style.left = r.left + 'px';
                    highlight.style.top = r.top + 'px';
                    highlight.style.width = r.width + 'px';
                    highlight.style.height = r.height + 'px';
                }

                function onOver(e) { e.preventDefault(); e.stopPropagation(); }

                function cleanup() {
                    document.removeEventListener('mousemove', onMove, true);
                    document.removeEventListener('click', onClick, true);
                    document.removeEventListener('keydown', onKey, true);
                    document.querySelectorAll('*').forEach(n => n.removeEventListener('mouseover', onOver));
                    document.documentElement.style.cursor = '';
                    highlight.remove();
                    hint.remove();
                }

                function onClick(e) {
                    e.preventDefault(); e.stopPropagation();
                    cleanup();
                    resolve(current);
                }

                function onKey(e) {
                    if (e.key === 'Escape') { cleanup(); resolve(null); }
                }

                document.addEventListener('mousemove', onMove, true);
                document.addEventListener('click', onClick, true);
                document.addEventListener('keydown', onKey, true);
                document.querySelectorAll('*').forEach(n => n.addEventListener('mouseover', onOver));
            });
        }
    };

    /* ============ XPath 查重（轻量实现） ============ */
    function validateXPath(xpath) {
        const result = document.evaluate(xpath, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
        const elements = [];
        for (let i = 0; i < result.snapshotLength; i++) elements.push(result.snapshotItem(i));
        return elements;
    }

    /* ============ 默认复制配置 ============ */
    const DEFAULT_SPLIT_BTN_CONFIG = [
        { name: '复制 XPath', callback(xpath) { return xpath; } },
        { name: '复制成Playwright', callback(xpath) { return `page.locator('xpath=${xpath}')`; } },
        { name: '复制成DrissionPage', callback(xpath) { return `tab.ele('xpath=${xpath}')`; } },
        { name: '复制成DP点击代码', callback(xpath) { return `tab.ele('xpath=${xpath}').click()`; } },
        {
            name: '复制成DP输入代码',
            callback(xpath) {
                const inputText = prompt('请输入要输入的内容', 'hello');
                if (inputText == null) return null;
                return `tab.ele('xpath=${xpath}').input('${inputText}')`;
            }
        },
        { name: '复制成 DP动作链', callback(xpath) { return `tab.actions.move_to('xpath=${xpath}')`; } }
    ];

    /* ============ XPath 生成面板 ============ */
    function showAttrXPathPopup(domEl, splitBtnConfig = DEFAULT_SPLIT_BTN_CONFIG) {
        if (!(domEl instanceof HTMLElement)) { console.warn('showAttrXPathPopup: domEl 不是 HTMLElement'); return; }

        const HOST_ID = '__xpath_popup_host';
        document.getElementById(HOST_ID)?.remove();
        const host = document.createElement('div');
        host.id = HOST_ID;
        Object.assign(host.style, { position: 'fixed', inset: '0', zIndex: '2147483647', pointerEvents: 'none' });
        document.body.appendChild(host);
        const shadow = host.attachShadow({ mode: 'open' });

        const style = document.createElement('style');
        style.textContent = `
:host { all: initial; }
* { box-sizing: border-box; }
.popup { position: fixed; top: 18vh; left: 50%; transform: translateX(-50%);
  width: min(580px, calc(100vw - 40px)); max-height: min(720px, 90vh);
  display: flex; flex-direction: column; overflow: hidden;
  background: #fff; color: #1f2937;
  border: 1px solid rgba(0,0,0,.08); border-radius: 12px;
  box-shadow: 0 20px 50px rgba(0,0,0,.18), 0 4px 12px rgba(0,0,0,.08);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  pointer-events: auto; }
.popup.entering { animation: popup-in .15s ease-out; }
@keyframes popup-in { from { opacity: 0; } to { opacity: 1; } }
.header { display: flex; align-items: center; justify-content: space-between;
  padding: 14px 16px; border-bottom: 1px solid #e5e7eb; cursor: move; user-select: none; }
.title { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600; }
.tag { padding: 3px 7px; color: #2563eb; background: #eff6ff; border-radius: 5px;
  font-family: Consolas, Monaco, monospace; font-size: 12px; }
.header-actions { display: flex; align-items: center; gap: 4px; }
.icon-btn { width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;
  padding: 0; border: 0; border-radius: 6px; background: transparent; color: #6b7280;
  font-size: 20px; line-height: 1; cursor: pointer; }
.icon-btn:hover { background: #f3f4f6; color: #111827; }
.icon-btn.active { background: #eff6ff; color: #2563eb; }
.body { display: flex; flex-direction: column; min-height: 0; padding: 14px 16px; }
.description { margin-bottom: 10px; color: #6b7280; font-size: 12px; }
.candidates { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; max-height: 300px; overflow-y: auto;
  padding: 8px; background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 8px; }
.candidate { min-width: 0; display: flex; align-items: center; gap: 7px; padding: 7px 8px;
  background: #fff; border: 1px solid #e5e7eb; border-radius: 6px; cursor: pointer;
  transition: background .1s, border-color .1s; }
.candidate:hover { background: #f8fafc; border-color: #cbd5e1; }
.candidate:has(input:checked) { background: #eff6ff; border-color: #93c5fd; }
.candidate input { flex: none; width: 14px; height: 14px; margin: 0; accent-color: #2563eb; cursor: pointer; }
.candidate-info { min-width: 0; display: flex; align-items: center; gap: 5px; }
.candidate-name { flex: none; color: #374151; font-family: Consolas, Monaco, monospace; font-size: 12px; font-weight: 600; }
.candidate-value { min-width: 0; overflow: hidden; color: #9ca3af;
  font-family: Consolas, Monaco, monospace; font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
.xpath-section { margin-top: 14px; }
.label { display: block; margin-bottom: 6px; color: #6b7280; font-size: 12px; font-weight: 500; }
.xpath-row { display: flex; gap: 7px; }
.xpath-input { flex: 1; min-width: 0; height: 36px; padding: 0 10px;
  border: 1px solid #d1d5db; border-radius: 6px; outline: none;
  background: #f9fafb; color: #374151; font-family: Consolas, Monaco, monospace; font-size: 12px; }
.xpath-input:focus { border-color: #60a5fa; background: #fff; }
.footer { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-top: 1px solid #e5e7eb; }
.selected { color: #9ca3af; font-size: 11px; }
.actions { display: flex; gap: 7px; align-items: center; }
.btn { height: 34px; padding: 0 13px; border: 0; border-radius: 6px; font-size: 12px; font-weight: 500; cursor: pointer; }
.btn:disabled { opacity: .5; cursor: not-allowed; }
.btn-check { background: #ecfdf5; color: #065f46; border: 1px solid #10b981; }
.split-btn-wrap { position: relative; display: inline-flex; }
.split-main { height: 34px; padding: 0 12px; border: 0; border-radius: 6px 0 0 6px;
  background: #2563eb; color: #fff; font-size: 12px; font-weight: 500; cursor: pointer; }
.split-main:hover:not(:disabled) { background: #1d4ed8; }
.split-arrow { height: 34px; width: 26px; padding: 0; border: 0; border-left: 1px solid rgba(255,255,255,.25); border-radius: 0 6px 6px 0;
  background: #2563eb; color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.split-arrow:hover:not(:disabled) { background: #1d4ed8; }
.split-menu { display: none; position: absolute; bottom: calc(100% + 4px); right: 0; min-width: 140px;
  background: #fff; border: 1px solid #e5e7eb; border-radius: 6px;
  box-shadow: 0 -4px 12px rgba(0,0,0,.12); z-index: 9999; }
.split-item { padding: 8px 12px; font-size: 12px; cursor: pointer; white-space: nowrap; }
.split-item:hover { background: #f3f4f6; }
.split-btn-wrap.open .split-menu { display: block; }
.candidates::-webkit-scrollbar { width: 6px; }
.candidates::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
.candidates::-webkit-scrollbar-track { background: transparent; }
@media (max-width: 500px) { .candidates { grid-template-columns: 1fr; } }
`;
        shadow.appendChild(style);

        const popup = document.createElement('div');
        popup.className = 'popup entering';

        const header = document.createElement('div');
        header.className = 'header';
        const title = document.createElement('div');
        title.className = 'title';
        const tag = document.createElement('span');
        tag.className = 'tag';
        tag.textContent = domEl.tagName.toLowerCase();
        const titleText = document.createElement('span');
        titleText.textContent = '生成 XPath';
        title.append(tag, titleText);
        const reselectBtn = document.createElement('button');
        reselectBtn.className = 'icon-btn';
        reselectBtn.type = 'button';
        reselectBtn.title = '重选元素';
        reselectBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M12 2v4M12 18v4M2 12h4M18 12h4"></path></svg>';
        const closeBtn = document.createElement('button');
        closeBtn.className = 'icon-btn';
        closeBtn.type = 'button';
        closeBtn.innerHTML = '&times;';
        closeBtn.title = '关闭';
        const headerActions = document.createElement('div');
        headerActions.className = 'header-actions';
        headerActions.append(reselectBtn, closeBtn);
        header.append(title, headerActions);

        const body = document.createElement('div');
        body.className = 'body';
        const description = document.createElement('div');
        description.className = 'description';
        description.textContent = '选择定位条件，XPath 将自动生成。';
        const candidates = document.createElement('div');
        candidates.className = 'candidates';
        body.append(description, candidates);

        const xpathSection = document.createElement('div');
        xpathSection.className = 'xpath-section';
        const xpathLabel = document.createElement('span');
        xpathLabel.className = 'label';
        xpathLabel.textContent = 'XPath';
        const xpathRow = document.createElement('div');
        xpathRow.className = 'xpath-row';
        const xpathInput = document.createElement('input');
        xpathInput.className = 'xpath-input';
        xpathInput.type = 'text';
        xpathInput.readOnly = true;
        xpathInput.placeholder = '请选择定位条件...';
        xpathRow.appendChild(xpathInput);
        xpathSection.append(xpathLabel, xpathRow);
        body.appendChild(xpathSection);

        const footer = document.createElement('div');
        footer.className = 'footer';
        const selectedText = document.createElement('span');
        selectedText.className = 'selected';
        selectedText.textContent = '已选择 1 个条件';
        const actions = document.createElement('div');
        actions.className = 'actions';
        const checkBtn = document.createElement('button');
        checkBtn.className = 'btn btn-check';
        checkBtn.type = 'button';
        checkBtn.textContent = '查重 XPath';
        const splitWrap = document.createElement('div');
        splitWrap.className = 'split-btn-wrap';
        const splitMain = document.createElement('button');
        splitMain.className = 'split-main';
        splitMain.type = 'button';
        const splitArrow = document.createElement('button');
        splitArrow.className = 'split-arrow';
        splitArrow.type = 'button';
        splitArrow.innerHTML = '▾';
        const splitMenu = document.createElement('div');
        splitMenu.className = 'split-menu';
        splitWrap.append(splitMain, splitArrow, splitMenu);
        actions.append(checkBtn, splitWrap);
        footer.append(selectedText, actions);
        popup.append(header, body, footer);
        shadow.append(popup);

        popup.addEventListener('animationend', (e) => {
            if (e.animationName === 'popup-in') popup.classList.remove('entering');
        });

        let currentSplitConfig = null;
        function getCurrentXPath() { return xpathInput.value.trim(); }
        function closeSplitMenu() { splitWrap.classList.remove('open'); }

        async function copyText(text) {
            if (!text) return false;
            try {
                await navigator.clipboard.writeText(text);
            } catch (error) {
                console.warn('[XPath] Clipboard API 不可用:', error);
                xpathInput.select();
                try { document.execCommand('copy'); }
                catch (err) { console.error('[XPath] 复制失败:', err); return false; }
            }
            const oldText = splitMain.textContent;
            splitMain.textContent = '✓ 已复制';
            setTimeout(() => { if (host.isConnected) splitMain.textContent = oldText; }, 1200);
            return true;
        }

        async function executeSplitAction(config) {
            const xpath = getCurrentXPath();
            if (!xpath || !config || typeof config.callback !== 'function') return;
            try {
                const result = await config.callback(xpath);
                if (result == null) return;
                await copyText(String(result));
            } catch (error) {
                console.error(`[XPath] 执行「${config.name}」失败:`, error);
            }
        }

        function setCurrentSplitConfig(config) {
            currentSplitConfig = config || null;
            splitMain.textContent = config?.name || '复制';
        }

        function renderSplitMenu(configList) {
            splitMenu.innerHTML = '';
            if (!Array.isArray(configList)) { console.warn('[XPath] splitBtnConfig 必须是数组'); setCurrentSplitConfig(null); return; }
            const validConfigList = configList.filter(cfg =>
                cfg && typeof cfg.name === 'string' && typeof cfg.callback === 'function');
            validConfigList.forEach(cfg => {
                const item = document.createElement('div');
                item.className = 'split-item';
                item.textContent = cfg.name;
                item.addEventListener('click', (e) => {
                    e.stopPropagation();
                    setCurrentSplitConfig(cfg);
                    closeSplitMenu();
                });
                splitMenu.appendChild(item);
            });
            setCurrentSplitConfig(validConfigList[0] || null);
        }

        splitArrow.addEventListener('click', (e) => {
            e.stopPropagation();
            if (splitArrow.disabled) return;
            splitWrap.classList.toggle('open');
        });
        document.addEventListener('click', closeSplitMenu);
        splitMain.addEventListener('click', () => executeSplitAction(currentSplitConfig));
        renderSplitMenu(splitBtnConfig);

        function toXPathString(value) {
            if (!value.includes('"')) return `"${value}"`;
            if (!value.includes("'")) return `'${value}'`;
            const parts = value.split('"');
            const result = [];
            parts.forEach((part, index) => {
                if (part) result.push(`"${part}"`);
                if (index < parts.length - 1) result.push(`'"'`);
            });
            return `concat(${result.join(', ')})`;
        }

        const candidateList = [];
        function addCandidate({ name, value = '', type, checked = false, condition }) {
            const label = document.createElement('label');
            label.className = 'candidate';
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = checked;
            const info = document.createElement('span');
            info.className = 'candidate-info';
            const nameEl = document.createElement('span');
            nameEl.className = 'candidate-name';
            nameEl.textContent = name;
            const valueEl = document.createElement('span');
            valueEl.className = 'candidate-value';
            if (value) { valueEl.textContent = `=${value}`; valueEl.title = value; }
            info.append(nameEl, valueEl);
            label.append(checkbox, info);
            candidates.appendChild(label);
            const item = { checkbox, name, value, type, condition };
            candidateList.push(item);
            checkbox.addEventListener('change', buildXPath);
            return item;
        }

        const DEFAULT_PICK_PRIORITY = [
            'id', 'class', 'textContent', 'data-testid', 'data-test', 'data-cy', 'data-qa',
            'name', 'aria-label', 'placeholder', 'type', 'role', 'title', 'href', 'src'
        ];

        function pickDefaultCandidate() {
            for (const key of DEFAULT_PICK_PRIORITY) {
                const c = candidateList.find(item => item.type !== 'tag' && item.name === key && item.value);
                if (c) return c;
            }
            return null;
        }

        function renderCandidates() {
            candidates.innerHTML = '';
            candidateList.length = 0;
            tag.textContent = domEl.tagName.toLowerCase();
            addCandidate({ name: 'tagName', value: domEl.tagName.toLowerCase(), type: 'tag', checked: true,
                condition() { return domEl.tagName.toLowerCase(); } });
            const textContent = domEl.textContent?.trim() ?? '';
            if (textContent) {
                const preview = textContent.length > 80 ? `${textContent.slice(0, 80)}...` : textContent;
                addCandidate({ name: 'textContent', value: preview, type: 'text',
                    condition() { return `normalize-space(.)=${toXPathString(textContent)}`; } });
            }
            for (const attr of domEl.attributes) {
                addCandidate({ name: attr.name, value: attr.value, type: 'attribute',
                    condition() { return `@${attr.name}=${toXPathString(attr.value)}`; } });
            }
            const defaultCandidate = pickDefaultCandidate();
            if (defaultCandidate) defaultCandidate.checkbox.checked = true;
            buildXPath();
        }

        function buildXPath() {
            const selected = candidateList.filter(item => item.checkbox.checked);
            selectedText.textContent = `已选择 ${selected.length} 个条件`;
            const hasValue = selected.length !== 0;
            splitMain.disabled = !hasValue;
            splitArrow.disabled = !hasValue;
            checkBtn.disabled = !hasValue;
            if (selected.length === 0) { xpathInput.value = ''; return; }
            const tagCandidate = selected.find(item => item.type === 'tag');
            const tagName = tagCandidate ? tagCandidate.condition() : '*';
            const conditions = selected.filter(item => item.type !== 'tag').map(item => item.condition());
            xpathInput.value = conditions.length > 0 ? `//${tagName}[${conditions.join(' and ')}]` : `//${tagName}`;
        }
        renderCandidates();

        function validateXPath() {
            const xpath = xpathInput.value.trim();
            if (!xpath) { console.warn('[XPath] 当前没有 XPath'); return; }
            try {
                const elements = document.evaluate(xpath, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
                const list = [];
                for (let i = 0; i < elements.snapshotLength; i++) list.push(elements.snapshotItem(i));
                console.group('%cXPath 查重%c %s',
                    'color:#fadfa3;background:#030307;padding:3px 6px;border-radius:4px 0 0 4px;font-weight:bold;',
                    'color:#030307;background:#fadfa3;padding:3px 6px;border-radius:0 4px 4px 0;font-weight:bold;',
                    xpath);
                console.log(`匹配到 ${list.length} 个元素`);
                toast(`匹配到 ${list.length} 个元素,已输出到控制台`, 1500);
                selectedText.innerHTML = `<span style="color:red;font-size:1.2em">匹配到${list.length}个元素</span>`;
                if (list.length === 0) console.warn('没有匹配到任何元素');
                list.forEach((el, i) => console.log(`${i + 1}.`, el));
                console.groupEnd();
                return list;
            } catch (error) {
                console.error('[XPath] XPath 语法错误:', xpath, error);
            }
        }

        /* 拖拽 & 位置记忆 */
        const POSITION_STORAGE_KEY = '__xpath_popup_position';
        function clamp(v, min, max) { return Math.min(Math.max(v, min), max); }
        function applyPosition(left, top) {
            const maxLeft = Math.max(window.innerWidth - popup.offsetWidth, 0);
            const maxTop = Math.max(window.innerHeight - popup.offsetHeight, 0);
            popup.style.left = `${clamp(left, 0, maxLeft)}px`;
            popup.style.top = `${clamp(top, 0, maxTop)}px`;
            popup.style.transform = 'none';
        }
        function loadSavedPosition() {
            try {
                const raw = localStorage.getItem(POSITION_STORAGE_KEY);
                if (!raw) return null;
                const pos = JSON.parse(raw);
                if (typeof pos.left === 'number' && typeof pos.top === 'number') return pos;
            } catch (e) { console.warn('[XPath] 读取弹窗位置失败:', e); }
            return null;
        }
        function savePosition(left, top) {
            try { localStorage.setItem(POSITION_STORAGE_KEY, JSON.stringify({ left, top })); }
            catch (e) { console.warn('[XPath] 保存弹窗位置失败:', e); }
        }
        requestAnimationFrame(() => {
            const saved = loadSavedPosition();
            if (saved) applyPosition(saved.left, saved.top);
        });

        let dragOffset = null;
        let pendingDragPoint = null;
        let dragFrame = 0;
        function updateDragPosition() {
            dragFrame = 0;
            if (!dragOffset || !pendingDragPoint) return;
            applyPosition(pendingDragPoint.clientX - dragOffset.x, pendingDragPoint.clientY - dragOffset.y);
            pendingDragPoint = null;
        }
        function onHeaderMouseDown(e) {
            if (closeBtn.contains(e.target) || reselectBtn.contains(e.target) || e.button !== 0) return;
            const rect = popup.getBoundingClientRect();
            dragOffset = { x: e.clientX - rect.left, y: e.clientY - rect.top };
            applyPosition(rect.left, rect.top);
            popup.classList.add('dragging');
            document.addEventListener('mousemove', onDragMove);
            document.addEventListener('mouseup', onDragEnd);
            e.preventDefault();
        }
        function onDragMove(e) {
            if (!dragOffset) return;
            pendingDragPoint = { clientX: e.clientX, clientY: e.clientY };
            if (!dragFrame) dragFrame = requestAnimationFrame(updateDragPosition);
        }
        function onDragEnd() {
            if (!dragOffset) return;
            if (dragFrame) { cancelAnimationFrame(dragFrame); dragFrame = 0; }
            pendingDragPoint = null;
            dragOffset = null;
            popup.classList.remove('dragging');
            document.removeEventListener('mousemove', onDragMove);
            document.removeEventListener('mouseup', onDragEnd);
            const rect = popup.getBoundingClientRect();
            savePosition(rect.left, rect.top);
        }
        header.addEventListener('mousedown', onHeaderMouseDown);

        reselectBtn.addEventListener('click', async () => {
            popup.style.display = 'none';
            reselectBtn.classList.add('active');
            const element = await ElementPicker.pick();
            reselectBtn.classList.remove('active');
            if (!element) { popup.style.removeProperty('display'); return; }
            domEl = element;
            renderCandidates();
            popup.style.removeProperty('display');
            toast('已重新选择元素', 1200);
        });
        closeBtn.addEventListener('click', close);
        checkBtn.addEventListener('click', () => validateXPath());

        function handleKeydown(e) { if (e.key === 'Escape') close(); }
        document.addEventListener('keydown', handleKeydown);

        function close() {
            document.removeEventListener('keydown', handleKeydown);
            document.removeEventListener('mousemove', onDragMove);
            document.removeEventListener('mouseup', onDragEnd);
            document.removeEventListener('click', closeSplitMenu);
            if (dragFrame) { cancelAnimationFrame(dragFrame); dragFrame = 0; }
            pendingDragPoint = null;
            dragOffset = null;
            host.remove();
        }
        requestAnimationFrame(() => { if (host.isConnected) closeBtn.focus(); });

        return {
            close,
            getXPath: () => xpathInput.value,
            validateXPath,
            setSplitBtnConfig(config) {
                if (!Array.isArray(config)) { console.warn('[XPath] splitBtnConfig 必须是数组'); return; }
                splitBtnConfig = config;
                renderSplitMenu(splitBtnConfig);
            }
        };
    }

    /* ============ Alt+X 快捷键：进入拾取 → 点击 → 弹窗 ============ */
    window.addEventListener('keydown', async (e) => {
        if (e.altKey && e.key.toLowerCase() === 'x') {
            e.preventDefault();
            e.stopPropagation();
            document.getElementById('__xpath_popup_host')?.remove(); // 关闭已打开的弹窗
            toast('Alt+X：点击页面元素生成 XPath', 1200);
            const el = await ElementPicker.pick();
            if (el) showAttrXPathPopup(el);
        }
    }, true);
})();
```

## 代码拆解

### 1. 拾取器：capture 阶段监听 + 掐断网站自己的 hover

`ElementPicker.pick()` 返回一个 Promise，把「选到哪个元素」变成可 `await` 的异步流程。三个细节决定它好不好用：

- **监听加在 `document` 上并用 `capture: true`（第三个参数为 `true`）**。网站的 click 监听器几乎都挂在冒泡阶段，capture 阶段先跑，所以**网站的点击不会生效**，不会「点一下顺便把商品加购了」。
- **给页面上每个元素都挂一个 `mouseover` 拦截器**。这一步是为了防止网站自己的 hover 效果（下拉菜单、预览浮层、置灰弹层）在你路过时冒出来挡住要点的元素。用 `preventDefault + stopPropagation` 直接让它们收起来。
- **`pointer-events: none` + `2147483646/2147483647` 的 z-index**。高亮框和提示条都不参与命中测试，否则 `mousemove` 里的 `e.target` 会变成高亮框自己，导致选中失败。

`Esc` 任意时刻取消，`resolve(null)`，调用方据此不弹面板。

### 2. 候选条件：把「定位思路」交给用户勾选

面板上列出的条件有三类：

| 类型 | 生成的片段 |
|---|---|
| `tag`（默认勾选） | `div`（作为标签名，不进谓词） |
| `text` | `normalize-space(.)="提交订单"` |
| `attribute` | `@data-testid="submit-btn"` |

最终由 `buildXPath()` 拼成：

```xpath
//div[@data-testid="submit-btn" and normalize-space(.)="提交订单"]
```

`DEFAULT_PICK_PRIORITY` 是「默认勾哪个」的优先级表：`id` → `class` → `textContent` → `data-testid` → `data-test` → `data-cy` → `data-qa` → `name` → `aria-label` → `placeholder` → `type` → `role` → `title` → `href` → `src`。这个顺序的依据是**稳定性**：框架项目里 `data-testid` 之类专门给测试用的属性基本不会改，而 `class` 是最容易跟着改样式一起变的。

> 一个容易看错的地方：长文本在面板上**只显示前 80 个字符**（`preview`），但生成 XPath 用的是**完整 `textContent`**。所以别以为截断了就是丢了。

### 3. `toXPathString()`：XPath 里的引号转义

属性值和文字里出现引号是很常见的（`aria-label="Close"`、`title='He said "hi"'`）。规则是：

- 不含双引号 → 用双引号包（可读性最好）
- 含双引号但不含单引号 → 用单引号包
- **两种引号都有 → 拆开用 `concat()` 拼**

```xpath
//button[concat(@title, '"', "x")="He said \"x\""]
```

`concat(@title, '"', "x")` 里的 `'"'` 是「一个单引号字符」，注意它和外面的双引号是搭配使用的——这是 XPath 里唯一能表达「单引号字面量」的写法。

### 4. 面板挂 Shadow DOM：不让页面样式污染，也不污染页面

```javascript
const host = document.createElement('div');
host.id = HOST_ID;
host.style.cssText = 'position:fixed;inset:0;z-index:2147483647;pointer-events:none';
document.body.appendChild(host);
const shadow = host.attachShadow({ mode: 'open' });
```

- 页面里哪怕有 `* { font-family: 楷体 !important }` 或者某个 `div { display:none }` 的全局重置，**进不了 Shadow DOM**。
- Shadow 里的 `:host { all: initial }` 把继承来的样式一次性清干净。
- 外层 `host` 是 `pointer-events: none` 全屏铺满，只有 `.popup` 自己打开 `pointer-events: auto`，这样「点击面板外区域」不会误触页面。
- `mode: 'open'` 而不是 `closed`，是为了方便在控制台里 `document.getElementById('__xpath_popup_host').shadowRoot` 直接调试。

面板里用了 `:has(input:checked)` 给已勾选的候选项高亮，这个选择器需要 Chrome 105+ / Safari 15.4+，非常老的浏览器上会退化成「不高亮」而不是报错，可以接受。

### 5. 复制：Clipboard API + 兜底

```javascript
try {
    await navigator.clipboard.writeText(text);
} catch (error) {
    xpathInput.select();
    try { document.execCommand('copy'); } catch (err) { ... }
}
```

**为什么需要兜底？** `navigator.clipboard` 只在 HTTPS（或 `localhost`）且页面处于前台、且由用户手势触发时可用。实际使用中会碰到：

- 页面里 iframe 内的 http 地址
- 某些内网站点不配 HTTPS
- 复制动作发生在 `await prompt()` 之后，浏览器判定「用户手势已过期」

`execCommand('copy')` 虽然是老 API 且已废弃，但只要把内容选中再执行仍然能用，作为降级非常合适。成功后主按钮文字变成 `✓ 已复制` 再恢复，1200ms 反馈。

> 油猴脚本其实可以直接用 `GM_setClipboard`，但这个脚本用了 `@grant none`（无沙箱模式），好处是能自由操 `document`、挂 Shadow DOM、不受沙箱限制，代价就是拿不到 `GM_*` API。对「纯页面增强」类脚本，`@grant none` 通常是更好的选择。

### 6. 查重：用 `document.evaluate` 而不是自己遍历

```javascript
const elements = document.evaluate(xpath, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
```

`ORDERED_NODE_SNAPSHOT_TYPE` 会一次性把匹配结果**快照**下来，后面随便遍历，不用担心节点被改导致漏掉。查完用 `console.group` / `console.groupEnd` 打印带样式的标题，数量和每个元素都列出来，面板底部同时用红字提示「匹配到 N 个元素」。

**这个查重比 `console.log(document.querySelectorAll(xpath))` 好在**：`querySelectorAll` 只支持 CSS 选择器，遇到 `normalize-space(.)` 这类 XPath 谓词直接报错；而且拿不到「匹配了几个」这个最关键的结论——**XPath 最常见的问题不是语法错，而是匹配到 0 个或 8 个**。

### 7. 拖拽：rAF 节流 + 位置记忆

```javascript
function onDragMove(e) {
    if (!dragOffset) return;
    pendingDragPoint = { clientX: e.clientX, clientY: e.clientY };
    if (!dragFrame) dragFrame = requestAnimationFrame(updateDragPosition);
}
```

`mousemove` 每秒能触发上百次。直接在里面读 `getBoundingClientRect()` 并写 `style` 会造成**强制同步布局**，面板拖起来会卡。这里的做法是：

1. `mousemove` 里只**记下最新坐标**，不碰 DOM；
2. 用 `requestAnimationFrame` 排队，一帧最多更新一次。

`applyPosition()` 里的 `clamp()` 保证面板不会被拖到视口外找不回来。`mouseup` 时把 `left/top` 存到 `localStorage`（键 `__xpath_popup_position`），下次弹出自动恢复——**注意用的是 `localStorage` 而不是 `GM_setValue`**，因为脚本是 `@grant none` 模式，位置记忆本来就是「这个网站的面板摆哪」，绑在站点上更合理。

### 8. 清理：所有 `document` 级监听都要在 `close()` 里摘掉

这是这种「往页面上挂东西」的脚本最容易出的 bug——反复按 `Alt+X` 会叠加监听器，然后越来越卡、快捷键失灵。这里的做法：

- 进入拾取前先 `document.getElementById('__xpath_popup_host')?.remove()` 直接删掉旧面板
- `close()` 里逐个 `removeEventListener`：`keydown`(Esc)、`mousemove`/`mouseup`(拖拽)、`click`(关闭下拉菜单)
- 取消未执行的 `requestAnimationFrame`，清空 `pendingDragPoint` / `dragOffset`
- 最后 `host.remove()`

拾取器那边同理：`cleanup()` 把三个 capture 监听摘掉，并遍历 `document.querySelectorAll('*')` 把 `mouseover` 也全摘了。

## 定制：改复制格式

所有「复制成什么」的选项都集中在一个数组里，改这一个地方就行：

```javascript
const DEFAULT_SPLIT_BTN_CONFIG = [
    { name: '复制 XPath', callback: (xpath) => xpath },
    { name: '复制成Playwright', callback: (xpath) => `page.locator('xpath=${xpath}')` },
    { name: '复制成DrissionPage', callback: (xpath) => `tab.ele('xpath=${xpath}')` },
    // 追加：ruyipage
    { name: '复制成 ruyipage', callback: (xpath) => `page.ele('xpath=${xpath}')` },
    // 追加：Selenium
    { name: '复制成 Selenium', callback: (xpath) => `find_element(By.XPATH, ${JSON.stringify(xpath)})` },
    // 追加：控制台直接执行
    { name: '复制成控制台命令', callback: (xpath) => `copy(document.evaluate(${JSON.stringify(xpath)}, document, null, 9, null).singleNodeValue)` },
    // 追加：一整段可跑的脚本
    {
        name: '复制成完整片段',
        callback: (xpath) => [
            'ele = tab.ele(\'xpath=' + xpath + '\')',
            'print(ele.tag, ele.text)',
        ].join('\n'),
    },
];
```

几点注意：

- **`callback` 可以是 `async` 的**，`executeSplitAction` 里 `await config.callback(xpath)`，返回 `null` 则不复制（`复制成DP输入代码` 就是靠 `prompt` 取消时返回 `null` 来实现「取消就不复制」）。
- **返回的是字符串**，所以要用带引号的内容时建议 `JSON.stringify` 而不是手写引号，避免属性值里的引号把代码搞坏。
- 菜单项的第一个会自动成为**主按钮的默认动作**，其余在下拉里。主按钮显示的就是当前选中项的名字，所以「复制 XPath」这种最常用的放第一个。

## 已知限制

| 限制 | 现象 | 处理 |
|---|---|---|
| Shadow DOM 内的元素 | 拾取到的是 `host` 而不是真实元素 | 用 `@match` 精确匹配到子域名；或改用 DevTools 的 `$x` |
| 跨域 iframe 内的元素 | 拾取不到 | 面板对 iframe 内的内容不生效，得在那个 iframe 自己的文档里跑 |
| 超大页面进拾取模式略卡 | 给每个元素挂 `mouseover` 监听器是 O(N) | 元素上万个时会有可感延迟；可以改成给 `document` 加一个 capture 阶段的 `mouseover` 监听，效果相同但只挂一个 |
| `Alt+X` 与页面/系统快捷键冲突 | 少数网页自己劫持了 Alt 组合键 | 换按键，或把 `Alt+X` 改成 `Alt+Shift+X`（`e.altKey` 加上 `e.shiftKey` 判断） |
| 只处理 HTMLElement | SVG 元素点不动 | SVG 走 `tagName` + 属性定位，需要的话把 `instanceof HTMLElement` 换成 `instanceof Element` |
| 遗留的全局 `validateXPath` | 文件顶部还有一个同名的全局函数，是早期实现 | 弹窗内部有自己的 `validateXPath()`，全局那个没被用到，改代码时注意别改错地方 |


