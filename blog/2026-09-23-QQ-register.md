---
slug: ruyipage-qq-register
title: 用ruyipage实现QQ注册
authors: [saoshen]
tags: [captcha]
description: 用ruyipage实现QQ注册
---

## 脚本实现
{/* truncate */}
```python
from ruyipage import launch

page = launch(headless=False)

try:
    page.get("https://ssl.zc.qq.com/v5/index/?lang=zhCN")
    page.wait(3)

    # 1. 手机号（默认 +86 中国）
    page.ele('input[placeholder="输入手机号码"]').input("13800138000")

    # 2. 昵称
    page.ele('input[placeholder="输入昵称"]').input("测试昵称")

    # 3. QQ密码
    page.ele('input[placeholder="输入QQ密码"]').input("Test123456")

    # 4. 短信验证码（需要先点“发送验证码”，且通常需要真实短信）
    # page.ele('input[placeholder="短信验证码"]').input("123456")

    # 5. 勾选协议（如果未勾选）
    checkbox = page.ele(".agreement-checkbox__box")
    if checkbox:
        checkbox.click_self()

    page.wait(2)

finally:
    page.wait(2)
    page.quit()

```