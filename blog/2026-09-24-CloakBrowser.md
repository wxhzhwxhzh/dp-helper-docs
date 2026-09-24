---
slug: cloak-browser
title: cloakBrowser教程
authors: [saoshen]
tags: [captcha]
description: cloakBrowser教程
---


# CloakBrowser Python 入门教程

## 1. CloakBrowser 是什么？

如果你之前使用过 Playwright，可以把 CloakBrowser 理解成：

> **提供类似 Playwright 操作方式的浏览器自动化环境。**

你现在的代码就是很典型的使用方式：

```python
from cloakbrowser import launch

browser = launch(headless=False)

page = browser.new_page()

page.goto("https://example.com")
```

之后大量 API 都是 Playwright 风格：

```python
page.locator(...)
page.click(...)
page.fill(...)
page.mouse.move(...)
page.keyboard.press(...)
page.frames
```

所以如果你已经会 Playwright，那么上手 CloakBrowser 会非常快。

{/* truncate */}

---

# 2. 安装

建议先创建虚拟环境。

```bash
uv init cloak-demo
cd cloak-demo
uv venv
```

Windows：

```bash
.venv\Scripts\activate
```

然后安装：

```bash
uv pip install cloakbrowser
```

如果你不用 `uv`，也可以：

```bash
pip install cloakbrowser
```

验证：

```bash
python -c "from cloakbrowser import launch; print('CloakBrowser OK')"
```

---

# 3. 第一个程序

新建：

```text
main.py
```

写：

```python
from cloakbrowser import launch


browser = launch(headless=False)

page = browser.new_page()

page.goto("https://www.baidu.com")

print("标题：", page.title())

input("按回车关闭浏览器...")

browser.close()
```

运行：

```bash
python main.py
```

或者：

```bash
uv run main.py
```

你应该能看到浏览器打开百度。

---

# 4. `launch()` 是什么？

最基本：

```python
browser = launch()
```

无头模式：

```python
browser = launch(headless=True)
```

显示浏览器：

```python
browser = launch(headless=False)
```

你现在做自动化调试时，我建议：

```python
browser = launch(headless=False)
```

这样可以直接看到浏览器行为。

---

# 5. Browser、Page、Frame 的关系

这是刚开始最容易搞混的地方。

基本结构：

```text
Browser
│
├── Page
│   │
│   ├── DOM
│   ├── iframe
│   │    └── Frame
│   │
│   └── iframe
│        └── Frame
│
└── Page
```

例如：

```python
browser = launch()

page = browser.new_page()
```

这里：

```python
browser
```

代表浏览器。

```python
page
```

代表一个标签页。

如果页面里面存在 iframe：

```python
page.frames
```

就可以获取 Frame。

例如：

```python
for frame in page.frames:
    print(frame.url)
```

---

# 6. 打开网页

最基本：

```python
page.goto("https://example.com")
```

查看当前 URL：

```python
print(page.url)
```

查看标题：

```python
print(page.title())
```

刷新：

```python
page.reload()
```

返回：

```python
page.go_back()
```

前进：

```python
page.go_forward()
```

---

# 7. 元素定位

这是自动化最核心的部分。

## CSS

```python
page.locator("#username")
```

```python
page.locator(".login-button")
```

```python
page.locator('input[name="username"]')
```

---

## 属性定位

例如：

```html
<input title="请输入邮箱">
```

可以：

```python
page.locator('[title="请输入邮箱"]')
```

你现在的代码就是这种方式：

```python
page.locator('[title="请输入邮箱"]').fill(username)
```

---

# 8. XPath

例如：

```python
page.locator(
    'xpath=//*[@id="ecomLoginForm"]/section/div[2]/div[2]'
)
```

也可以：

```python
page.locator(
    'xpath=//button[contains(text(), "登录")]'
)
```

XPath 很强，但是如果 CSS 能解决，我一般更推荐 CSS。

例如：

```python
page.locator(".account-center-submit")
```

就比：

```python
page.locator(
    'xpath=//*[@id="xxx"]/div[2]/button'
)
```

更加简单。

---

# 9. `click()`

点击：

```python
page.locator("#login").click()
```

强制点击：

```python
page.locator("#login").click(force=True)
```

你现在：

```python
page.locator(
    '.account-center-submit'
).click(force=True)
```

就是强制点击。

一般情况下：

```python
click()
```

就够了。

只有元素被遮挡、状态判断导致 Playwright 不允许点击时，再考虑：

```python
click(force=True)
```

---

# 10. 输入文本

推荐：

```python
page.locator("#username").fill("hello")
```

密码：

```python
page.locator("#password").fill("123456")
```

清空：

```python
page.locator("#username").fill("")
```

---

# 11. 键盘操作

例如：

```python
page.keyboard.press("Enter")
```

Ctrl+A：

```python
page.keyboard.press("Control+A")
```

删除：

```python
page.keyboard.press("Backspace")
```

输入：

```python
page.keyboard.type("hello")
```

---

# 12. 鼠标操作

这是你现在研究滑块验证码时非常重要的一部分。

移动：

```python
page.mouse.move(500, 300)
```

按下：

```python
page.mouse.down()
```

松开：

```python
page.mouse.up()
```

拖动：

```python
page.mouse.move(500, 300)
page.mouse.down()
page.mouse.move(700, 300)
page.mouse.up()
```

---

# 13. 获取元素坐标

例如：

```python
slider = page.locator(".slider")

box = slider.bounding_box()

print(box)
```

可能得到：

```python
{
    "x": 300,
    "y": 500,
    "width": 40,
    "height": 40
}
```

中心点：

```python
x = box["x"] + box["width"] / 2
y = box["y"] + box["height"] / 2
```

然后：

```python
page.mouse.move(x, y)
```

这就是你前面滑块代码的基本原理。

---

# 14. `bounding_box()` 非常重要

例如：

```python
box = page.locator(".button").bounding_box()
```

可以获得元素在页面中的位置。

常见用途：

* 鼠标点击
* 鼠标拖动
* 滑块验证码
* 坐标计算
* 元素截图
* 自定义鼠标轨迹

注意：

```python
locator()
```

只是创建 Locator。

真正访问 DOM 通常发生在：

```python
bounding_box()
```

```python
count()
```

```python
click()
```

```python
text_content()
```

等操作中。

这也是你之前遇到：

```text
滑块元素获取成功
```

但随后：

```text
bounding_box timeout
```

的原因。

---

# 15. 获取元素数量

```python
count = page.locator(".item").count()

print(count)
```

例如：

```python
slider = page.locator(".captcha-slider-btn")

print(slider.count())
```

如果：

```text
0
```

说明当前 Frame 里没有这个元素。

如果：

```text
1
```

说明找到了。

---

# 16. 获取文本

例如：

```python
text = page.locator(".title").text_content()

print(text)
```

也可以：

```python
print(page.locator(".title").inner_text())
```

---

# 17. 判断元素是否存在

简单：

```python
if page.locator("#login").count() > 0:
    print("登录按钮存在")
```

---

# 18. 等待元素

比固定等待更推荐：

```python
page.locator("#username").wait_for()
```

例如：

```python
username = page.locator('[title="请输入邮箱"]')

username.wait_for()

username.fill("test@example.com")
```

这通常比：

```python
page.wait_for_timeout(3000)
```

更加可靠。

---

# 19. `wait_for_timeout()` 是什么？

例如：

```python
page.wait_for_timeout(1000)
```

就是等待：

```text
1000 ms = 1 秒
```

你现在大量使用：

```python
page.wait_for_timeout(...)
```

调试时很好用。

但是正式自动化最好减少这种固定等待。

例如：

```python
page.wait_for_timeout(3000)
```

实际上是在赌：

> “3 秒以后验证码应该加载好了。”

而：

```python
page.locator(".captcha-slider-btn").wait_for()
```

表达的是：

> “等验证码滑块真正出现。”

后者通常更合理。

---

# 20. iframe / Frame

这个是你刚刚实际遇到的问题。

页面：

```python
page
```

里面可能有：

```text
主页面
│
└── iframe
     │
     └── 验证码
```

查看：

```python
for i, frame in enumerate(page.frames):
    print(i, frame.url)
```

例如：

```text
0 https://fxg.jinritemai.com/login/common
1 https://verify.xxx.com/...
```

那么：

```python
page.frames[0]
```

是主页面。

：

```python
page.frames[1]
```

是 iframe。

---

# 21. 不建议依赖 `frames[1]`

虽然：

```python
frame = page.frames[1]
```

简单，但不够稳定。

更推荐根据元素寻找：

```python
captcha_frame = None

for frame in page.frames:
    try:
        if frame.locator(".captcha-slider-btn").count() > 0:
            captcha_frame = frame
            break
    except Exception:
        continue
```

然后：

```python
slider = captcha_frame.locator(
    ".captcha-slider-btn"
)
```

这就是你现在最终代码采用的方法。

---

# 22. Frame 中操作元素

Frame 和 Page 的操作方式基本一样：

```python
frame.locator(".button").click()
```

```python
frame.locator("input").fill("hello")
```

```python
frame.mouse.move(100, 200)
```

```python
frame.keyboard.press("Enter")
```

所以可以理解为：

```text
Page
    ↓
Frame
    ↓
Locator
```

---

# 23. 执行 JavaScript

这是浏览器自动化非常重要的功能。

例如：

```python
result = page.evaluate(
    "() => document.title"
)

print(result)
```

获取 URL：

```python
url = page.evaluate(
    "() => location.href"
)
```

修改页面：

```python
page.evaluate(
    "() => document.body.style.background = 'red'"
)
```

也可以传参数。

---

# 24. 获取 DOM 信息

例如：

```python
html = page.evaluate(
    "() => document.documentElement.outerHTML"
)

print(html)
```

获取：

```python
body = page.evaluate(
    "() => document.body.innerText"
)

print(body)
```

---

# 25. 截图

如果 CloakBrowser 当前版本暴露 Playwright 兼容的 screenshot API，可以直接：

```python
page.screenshot(
    path="page.png"
)
```

元素截图：

```python
page.locator(".captcha").screenshot(
    path="captcha.png"
)
```

这类功能特别适合调试验证码。

---

# 26. 鼠标拖动实战

一个最简单的拖动：

```python
slider = page.locator(".slider")

box = slider.bounding_box()

start_x = box["x"] + box["width"] / 2
start_y = box["y"] + box["height"] / 2

page.mouse.move(start_x, start_y)
page.mouse.down()

page.mouse.move(
    start_x + 200,
    start_y
)

page.mouse.up()
```

如果需要多点轨迹：

```python
page.mouse.move(start_x, start_y)
page.mouse.down()

for x in range(0, 200, 10):
    page.mouse.move(
        start_x + x,
        start_y
    )

page.mouse.up()
```

你之前做的 `human_move()` / WindMouse，本质上就是在这里进一步生成更加复杂的 `(x, y)` 序列。

---

# 27. 一个简单的登录例子

例如：

```python
from cloakbrowser import launch


browser = launch(headless=False)

try:
    page = browser.new_page()

    page.goto("https://example.com/login")

    username = page.locator("#username")
    password = page.locator("#password")

    username.wait_for()

    username.fill("test@example.com")
    password.fill("123456")

    page.locator("#login").click()

    page.wait_for_timeout(2000)

    print("当前 URL:", page.url)

finally:
    browser.close()
```

这里已经包含了最常用的自动化流程：

```text
launch
 ↓
new_page
 ↓
goto
 ↓
locator
 ↓
wait
 ↓
fill
 ↓
click
 ↓
验证结果
 ↓
close
```

---

# 28. 推荐的代码结构

你目前喜欢“一整个大函数”，这种写法其实非常适合小型自动化脚本：

```python
def login(username, password):

    browser = launch(headless=False)

    try:
        page = browser.new_page()

        # 打开网页

        # 登录

        # 验证码

        # 登录结果

        return True

    finally:
        browser.close()
```

而大型项目再考虑拆成：

```text
browser.py
login.py
captcha.py
utils.py
```

目前没必要为了“架构漂亮”过度封装。

---

# 29. `try/finally` 非常推荐

例如：

```python
browser = launch()

try:
    page = browser.new_page()

    page.goto("https://example.com")

finally:
    browser.close()
```

这样即使中途：

```python
raise RuntimeError(...)
```

或者：

```python
locator.click()
```

发生异常，浏览器也会被关闭。

你现在的代码：

```python
try:
    ...
finally:
    browser.close()
```

这个习惯是对的。

---

# 30. 调试技巧

如果元素找不到，第一件事情不要疯狂增加：

```python
wait_for_timeout(10000)
```

而是打印：

```python
print("URL:", page.url)
print("Frame 数量:", len(page.frames))
```

然后：

```python
for i, frame in enumerate(page.frames):
    print(i, frame.url)
```

再检查：

```python
print(
    page.locator(".xxx").count()
)
```

如果是 iframe：

```python
print(
    frame.locator(".xxx").count()
)
```

这样很快就能知道：

```text
元素不存在？
        ↓
当前 Frame 错了？
        ↓
元素还没加载？
        ↓
选择器错了？
        ↓
元素被 Shadow DOM 包起来？
```

---

# 31. Shadow DOM

现在很多现代网站大量使用 Shadow DOM。

普通：

```python
page.locator(".button")
```

有时候无法直接找到 Shadow DOM 内部元素。

这时候要看 CloakBrowser 当前版本对 Shadow DOM / Playwright Locator 的具体兼容情况。

如果只是调试，可以先通过 JS 检查：

```python
result = page.evaluate("""
() => {
    const host = document.querySelector('xxx');
    return host?.shadowRoot?.innerHTML;
}
""")

print(result)
```

这对于排查：

```text
为什么 DevTools 能看到
但 locator 找不到？
```

非常有用。

---

# 32. CDP

如果你已经熟悉 Chrome DevTools Protocol，那么 CloakBrowser 的一个重要方向就是通过 CDP 操作浏览器底层能力。

例如你之前接触过：

```python
tab.run_cdp(...)
```

那么理解 CDP 可以简单记成：

```text
Playwright API
    ↓
高级浏览器自动化

CDP
    ↓
浏览器底层协议
```

Playwright：

```python
page.goto(...)
```

CDP 更接近：

```text
Page.navigate
```

网络：

```text
Network.enable
Network.getResponseBody
Network.setCacheDisabled
```

输入：

```text
Input.dispatchMouseEvent
Input.dispatchKeyEvent
```

所以：

> **普通页面操作优先使用 Locator；需要浏览器底层能力时再使用 CDP。**

---

# 33. Locator 和 CDP 怎么选？

我建议你按照这个原则：

| 需求             | 推荐                       |
| -------------- | ------------------------ |
| 点击按钮           | `locator.click()`        |
| 输入文本           | `locator.fill()`         |
| 获取文本           | `locator.text_content()` |
| 获取元素坐标         | `bounding_box()`         |
| 鼠标移动           | `mouse.move()`           |
| 键盘             | `keyboard.press()`       |
| iframe         | `page.frames`            |
| 执行 JS          | `evaluate()`             |
| 网络监听           | CDP                      |
| Network        | CDP                      |
| Cookie/缓存等底层操作 | CDP                      |
| 浏览器协议能力        | CDP                      |

不要什么东西都直接上 CDP。

---

# 34. CloakBrowser + 你的 `SlidePuzzleCaptcha`

你现在已经形成了一套非常典型的组合：

```text
CloakBrowser
      │
      ├── 打开登录页面
      │
      ├── Locator
      │      ├── 输入账号
      │      ├── 输入密码
      │      └── 点击登录
      │
      ├── Frame
      │      └── 验证码
      │
      ├── SlidePuzzleCaptcha
      │      └── 计算滑动距离
      │
      └── Mouse
             └── 执行拖动
```

其中：

```python
SlidePuzzleCaptcha
```

只负责：

> **告诉你应该移动多少距离**

而：

```python
CloakBrowser
```

负责：

> **真正控制浏览器和鼠标**

这是一个很清晰的职责划分。

---

# 35. 最后给你一张速查表

### 浏览器

```python
browser = launch(headless=False)
page = browser.new_page()
browser.close()
```

### 页面

```python
page.goto(url)
page.reload()
page.go_back()
page.go_forward()

page.url
page.title()
```

### 元素

```python
page.locator("...")
locator.click()
locator.fill("...")
locator.count()
locator.text_content()
locator.bounding_box()
```

### 等待

```python
locator.wait_for()
page.wait_for_timeout(1000)
```

### 鼠标

```python
page.mouse.move(x, y)
page.mouse.down()
page.mouse.up()
```

### 键盘

```python
page.keyboard.press("Enter")
page.keyboard.type("hello")
```

### Frame

```python
page.frames

for frame in page.frames:
    print(frame.url)
```

### JavaScript

```python
page.evaluate("() => document.title")
```

### 截图

```python
page.screenshot(path="page.png")
```

### CDP

```text
用于浏览器底层协议能力
```

---

## 推荐你的学习路线

你已经有 Playwright/DrissionPage 基础，所以没必要从“什么是浏览器自动化”开始学。

直接按这个顺序：

```text
① launch / browser / page
        ↓
② Locator
        ↓
③ wait / click / fill
        ↓
④ Frame / iframe
        ↓
⑤ Mouse / Keyboard
        ↓
⑥ evaluate / JS
        ↓
⑦ screenshot
        ↓
⑧ CDP
        ↓
⑨ 网络监听
        ↓
⑩ CloakBrowser + 你的 DrissionPage 思路
```

**尤其建议重点掌握 `Page → Frame → Locator → Mouse → CDP` 这条链。**
