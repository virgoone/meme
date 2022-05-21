---
title: npm安装node-sass正确姿势
date: 2017-04-12 19:36:38
tags:
  - npm
  - node
  - node-sass
cover_detail: https://m-staticcdn.annatarhe.com//blog/5b1a7ecd3722e.jpg
cover_index: https://m-staticcdn.annatarhe.com//blog/5b1a7ecd3722e.jpg
---

最近安装 node-sass 的时候总是会各种不成功

今天我琢磨了一会儿，查了一些资料总算知道怎么回事了

首先要知道的是，安装 node-sass 时在 node scripts/install 阶段会从 github.com 上下载一个 .node 文件

大部分安装不成功的原因都源自这里

因为 GitHub Releases 里的文件都托管在 s3.amazonaws.com 上面

而这个网址在国内总是网络不稳定，所以我们需要通过第三方服务器下载这个文件。

```
SASS_BINARY_SITE=https://npm.taobao.org/mirrors/node-sass/ npm install node-sass
```

嗯，这样下来就能正常安装了。

npm安装其它依赖，一般做法是在项目内添加一个.npmrc文件

```
sass_binary_site=https://npm.taobao.org/mirrors/node-sass/
electron_mirror=https://npm.taobao.org/mirrors/electron/
registry=https://registry.npm.taobao.org
```

这样使用 npm install 安装 node-sass、electron 时都能自动从淘宝源上下载

但是在使用 npm publish 的时候要把 registry 这一行给注释掉，否则就会发布到淘宝源上去了。