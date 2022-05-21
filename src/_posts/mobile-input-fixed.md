---
title: 解决移动端fixed输入框问题
date: 2018-10-31 18:45:47
tags:
  - mobile
  - input
  - scroll
  - bug fix
  - 移动端输入框
cover_detail: https://m-staticcdn.annatarhe.com//blog/5bd989771fbb5.jpg
cover_index: https://m-staticcdn.annatarhe.com//blog/5bd989771fbb5.jpg
subtitle: 论如何解决输入框fixed的bug
---

最近做的一个需求加入了输入发送信息的功能，设计给到的设计稿上需要实现一版fixed输入框，众所周知，在PC上这样的需求很容易就可以实现，但是在手机上因为软键盘弹出的问题，不管是在iOS或者是在Android上，都会有各种严重问题，比如说：软键盘遮挡到输入框引起的显示问题等

随后开始了尝试解决

第一步：
修改定位，因为移动端对fixed定位的元素实现的问题，首先尝试修改布局，修改fixed输入框为absolute，检查页面上有使用transform的地方，去除

初步尝试，iOS除了X第一次点击打开时都恢复正常，但是安卓不正常，尝试失败

继续修改：
基于第一步的基础上，给输入框增加一些事件，在输入框获取焦点的时候，刷新输入框的问题，具体：

```js
document.getElementById('input').scrollIntoView(true);
```

这样真机测试正常

随后切换输入法，发现位置又开始错乱，遮挡住输入框的问题重新出现，更改代码：

```js
clearInterval(this.resizeInputInterval);
this.resizeInputInterval = setInterval(() => {
  this.input.scrollIntoView(true);
}, 100);
```

设置一个定时器在输入框获取焦点的时候一直刷新输入框的位置，然后在失去焦点的时候清除

重新测试，大部分手机恢复正常，只有安卓5.x手机会在第一次获取焦点的时候输入法遮挡住输入框，再次获取焦点恢复正常

总结一下

1、fixed输入框最好基于absolute定位
2、获取焦点时需要定时刷新输入框的位置，防止webview计算失误导致输入框被遮挡