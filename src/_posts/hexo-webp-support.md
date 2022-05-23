---
title: 给hexo增加webp图片支持
date: 2017-03-08 19:44:06
tags:
  - hexo
  - webp
  - 图片
categories:
  - 2017
  - hexo
keywords:
  - Hexo,webp,延迟加载,性能优化,lzyload,jquery,移动Web,谷歌,图片格式,图片加载
cover_detail: https://cdn.ugc.marryto.me//blog/5b1a7ecc399f3.jpg
cover_index: https://cdn.ugc.marryto.me//blog/5b1a7ecc399f3.jpg
---
前两天再写上边博客时因为使用了大量图片，所以决定采用谷歌的webp格式图片，webp格式相对jpg来说，同等质量下体积更小

但是webp格式相对来说浏览器支持度并不算高，尤其是在移动端全挂，所以我改写了一下hexo的懒加载代码，加入了webp图片格式支持判断

如果支持webp就替换成webp格式地址，如果不是，就换成png地址

```javascript
if (!window.localStorage || typeof localStorage !== 'object') return;
var name = 'webpa'; // webp available
if (!localStorage.getItem(name) || (localStorage.getItem(name) !== 'available' && localStorage.getItem(name) !== 'disable')) {

  var img = document.createElement('img');

  img.onload = function () {
    try {
        localStorage.setItem(name, 'available');
    } catch (ex) {
    }
  };

  img.onerror = function () {
    try {
      localStorage.setItem(name, 'disable');
    } catch (ex) {
    }
  };
  img.src = 'data:image/webp;base64,UklGRkoAAABXRUJQVlA4WAoAAAAQAAAAAAAAAAAAQUxQSAsAAAABBxAREYiI/gcAAABWUDggGAAAADABAJ0BKgEAAQABABwlpAADcAD+/gbQAA==';
}
```
这段示意代码的原理是：用 JS 加载 WEBP 图片，如果能触发 onload ，说明当前浏览器支持 WEBP。

然后修改hexo调用lazyload加载图片的代码：

```javascript
_getwebpsrc: function (ndimg, imgsrc) {
  var needwebp = false,
      src = '';
  if (window.localStorage && typeof localStorage === 'object') {
      needwebp = localStorage.getItem('webpa') === 'available';
  }
  src = needwebp ? imgsrc + '.webp' : imgsrc+'.format';

  return src;
}
var $that =this,$imgArr = $('#posts').find('img.lazy');
lazyLoadPostsImages: function () {
  var $that =this,$imgArr = $('#posts').find('img.lazy');
  $imgArr.each(function(i){
    var src = $(this).data('src');
    var fsrc = $that._getwebpsrc('',src);
    $(this).attr('data-original',fsrc);
  }).lazyload({
    placeholder: '/images/loading.gif',
    effect: 'fadeIn',
    data_attribute:'src'
  });
  
},
```
这段代码的意思是在lazyload之前先判断是否支持webp格式，支持替换成webp地址

因为我是用的是next主题，所以代码在utils里边，修改过后效果：[Go](/dji-mavic-pro-1)

移动端和个浏览器测试加载图片没有问题，不过第一次进来页面的时候会取不到是否支持webp格式，这个还需要优化一下
