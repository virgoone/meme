---
title: 使用flvjs封装html5 video player
date: 2017-04-13 14:20:20 +8
tags:
  - video
  - flvjs
  - html5
  - mse
categories:
  - 2017
  - 前端
  - 播放器
keywords:
  - flvjs,plyr,视频播放器,flv播放器,flv,mse,ECMAScript,开源,Github
description: 如何使用开源的flvjs在浏览器播放flv格式的视频
cover_detail: https://cdn.ugc.marryto.me//blog/5b1a7ecd5b4e1.jpg
cover_index: https://cdn.ugc.marryto.me//blog/5b1a7ecd5b4e1.jpg

---

最近一直在公司里做视频分析系统相关的工作，碰到一个需求

因为系统中原来使用的播放器是我们公司包含互动层在内的一个比较庞大的播放器

而对于我们目前的系统来说并不需要，所以我就按照[plyr](https://github.com/Selz/plyr/)的思路整合了一个只包含简单功能的播放器

系统中有flv格式的播放需求，所以在综合考虑之后决定使用b站的[flvjs](https://github.com/Bilibili/flv.js)做层封装，让h5直接可以播放flv格式的视频

最后代码开源在[GitHub]:[https://github.com/virgoone/vplyr](https://github.com/virgoone/vplyr)

播放器演示：[http://vplyr.marryto.me/](http://vplyr.marryto.me/)

实现思路是在创建html5播放器的时候判断src，如果是flv，使用flvjs封装一下video media

```javascript
__createFlvjs(src) {
  const sourceConfig = {
    isLive: false,
    type: 'flv',
    url: src
  }
  const playerConfig = {
    enableWorker: false,
    deferLoadAfterSourceOpen: true,
    stashInitialSize: 512 * 1024,
    enableStashBuffer: true
  }
  const player = flvjs.createPlayer(sourceConfig, playerConfig)
  player.on(flvjs.Events.ERROR, function (e, t) {
    player.unload()
  })
  player.on(flvjs.Events.STATISTICS_INFO, e => Log.i(this.TAG, parseInt(e.speed * 10) / 10 + 'KB/s'))

  player.attachMediaElement(this.media)
  player.load()
  return player
}
```

这样播放视频的时候flv格式的视频已经是被flvjs转码过的被浏览器支持的视频格式了


