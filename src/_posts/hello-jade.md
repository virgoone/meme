---
title: jade模版引擎学习
date: 2016-05-16 21:15:35 +8
categories:
  - jade
tags:
  - jade
  - 模版引擎
  - 模版
  - 学习
cover_detail: https://cdn.ugc.marryto.me//blog/5b1a7ecd3722e.jpg
cover_index: https://cdn.ugc.marryto.me//blog/5b1a7ecd3722e.jpg
description: jade是一个高性能的模版引擎，Jade是Haml的Javascript实现，在服务端（NodeJS）及客户端均有支持。最新版本的jade更名为pug，对新版有兴趣的可以移步

---
jade是一个高性能的模版引擎，Jade是Haml的Javascript实现，在服务端（NodeJS）及客户端均有支持。最新版本的jade更名为pug，对新版有兴趣的可以移步 => [Github地址](https://github.com/pugjs/pug)，因为项目中一直在使用jade作为模版，所以决定记录下学习jade的心得，欢迎交流讨论
### 安装
via npm:
```shell
$ npm install jade
```
### 例子
simple example
```jade
doctype html
html(lang="en")
  head
    title= pageTitle
    script(type='text/javascript').
      if (foo) bar(1 + 5)
  body
    h1 Jade - node template engine
    #container.col
      if youAreUsingJade
        p You are amazing
      else
        p Get on it!
      p.
        Jade is a terse and simple templating language with a
        strong focus on performance and powerful features.
```
输出：
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <title>Jade</title>
    <script type="text/javascript">
      if (foo) bar(1 + 5)
    </script>
  </head>
  <body>
    <h1>Jade - node template engine</h1>
    <div id="container" class="col">
      <p>You are amazing</p>
      <p>Jade is a terse and simple templating language with a strong focus on performance and powerful features.</p>
    </div>
  </body>
</html>
```
### 语法
