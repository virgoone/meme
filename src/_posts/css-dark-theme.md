---
title: 使用css给你的网站启用“暗黑模式”
date: 2019-07-03 17:32:53
tags:
  - 暗黑模式
  - css
  - dark
  - theme
categories:
  - 2017
  - 数码
keywords:
  - Mac,theme,Dark,Github,dark theme,暗黑,暗黑模式,css
description: 如果你在使用 macOS 10.14.4 或者之后的系统，并且在系统内开启了深色模式，打开这篇文章时，你就发现我的博客变成了暗黑版本，之前只有Safari浏览器支持，这次发现Chrome也支持了“暗黑”模式
cover_detail: https://cdn.ugc.marryto.me//blog/5b1a7ecd3722e.jpg
cover_index: https://cdn.ugc.marryto.me//blog/5b1a7ecd3722e.jpg

---

## 说明
如果你在使用 macOS 10.14.4 或者之后的系统，并且在系统内开启了深色模式，打开这篇文章时，你就发现我的博客变成了暗黑版本，之前只有Safari浏览器支持，这次发现Chrome也支持了“暗黑”模式，所以赶紧针对现在的网站做了下优化

## 实现方式：

```css
@media (prefers-color-scheme: light) {
    /* 浅色模式样式 */
}

@media (prefers-color-scheme: dark) {
    /* 深色模式样式 */
}
```
MacOS 在新版本中加入了一个新的媒体查询 prefers-color-scheme，支持情况请看：[https://caniuse.com/#search=prefers-color-scheme](https://caniuse.com/#search=prefers-color-scheme)

相关属性：

> light：浅色模式

> dark：深色模式

> no-preference：无颜色偏好

将上边代码加入你的css中，并实现相应样式，就可以启用“暗黑”模式了


