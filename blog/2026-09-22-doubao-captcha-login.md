---
slug: doubao-captcha-login
title: DoubaoCaptcha.py脚本注意事项
authors: [saoshen]
tags: [captcha]
description: DouBaoCaptchaV5 首次运行的登录方案：扫码临时登录与 Cookie 持久化免登录
---

豆包网页接口在自动化脚本首次运行时，**需要完成登录验证**，有两种使用方案：扫码临时登录、Cookie 持久化免登录。

> ⚠️ 重要提醒：多次未登录直接请求接口，会触发访问限制，导致无法正常获取回答。

{/* truncate */}

## 方案一：扫码临时登录

1. 首次运行自动化代码，程序会弹出豆包网页登录二维码
2. 使用账号扫码完成登录
3. 登录成功后，按下回车，脚本继续执行后续任务
4. 下次再运行代码，就记住 cookie 不用登录了

## 方案二：Cookie 持久化免登录

操作步骤：

1. 浏览器打开豆包网页，正常扫码登录账号
2. 打开浏览器开发者工具，抓取网页请求，复制登录后的 Cookie 字符串
3. 将 Cookie 配置到自动化代码内
4. 后续启动脚本，无需再次扫码登录，直接携带 Cookie 访问接口

```python
from DouBaoCaptchaV5 import DouBaoCaptcha

cookie_str = "xxx=123; yyy=456; domain=.doubao.com;"
db = DouBaoCaptcha(set_cookies=cookie_str)
```

### 参数说明

| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `debug_port` | int | `9623` | 浏览器调试端口 |
| `auto_hide` | bool | `False` | 是否自动隐藏浏览器窗口 |
| `check_log_in` | bool | `True` | 是否检查登录状态 |
| `set_cookies` | str | `None` | 传入 cookies 字符串，为 `None` 时不设置 cookies |

> 💡 提示：传入 `set_cookies` 后，代码会先打开豆包网页，再写入 cookies 并刷新页面，最后才进行登录状态检查。如果 cookies 有效，可以将 `check_log_in` 设为 `False`，跳过登录检查流程，实现完全免人工干预。

```python
# cookies 有效时，跳过登录检查，实现完全无人值守
db = DouBaoCaptcha(set_cookies=cookie_str, check_log_in=False)
```

## 两种方案对比

| 方案 | 是否需要人工 | 适用场景 |
| --- | --- | --- |
| 扫码临时登录 | 首次需要扫码，之后自动复用 cookie | 本地开发、临时调试 |
| Cookie 持久化 | 完全无需人工（cookie 有效期内） | 服务器部署、长期自动化任务 |
