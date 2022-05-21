---
title: 使用vue2.0开发的开眼h5实现
date: 2017-02-28 17:32:21
tags:
  - 前端
  - 2017
  - vuejs
  - eyepetizer
categories:
  - 2017
  - 前端
  - vuejs
keywords:
  - vuejs,前端学习,开眼,eyepetizer,开眼视频,前端开发,React.js,vue.js,node.js,编程,程序员,开发者,Hacker News,ECMAScript,开源,Github
cover_detail: https://m-staticcdn.annatarhe.com//blog/poster/5b1a7ecd88810.jpg
cover_index: https://m-staticcdn.annatarhe.com//blog/poster/5b1a7ecd88810.jpg
---
最近一直在学习vuejs，手痒之余决定使用vuejs做一些东西

正好一直觉得开眼APP的风格很惹人喜欢，所以决定用vuejs仿写一个简单的h5的开眼实现

项目演示：[http://douni.one/eyepetizer](http://douni.one/eyepetizer)


## TODO

- 视频列表
- 视频详情 ✅

## 项目构建

首先全局安装[vue-cli](https://github.com/vuejs/vue-cli)，几个简单的步骤就可以帮助你快速构建一个vue项目。

```bash
npm install -g vue-cli
```

然后，利用vue-cli构建一个vue项目，并安装项目依赖

```bash
vue init webpack eyepetizer
cd eyepetizer & npm install
```

生成修改后的项目文件如下

```
├── build //webpack基本配置文件
├── config //配置文件相关
├── dist //build生成后的文件相关
│
├── src
│   ├── assets //项目使用scss资源
│   │   └── scss
│   ├── components //组件相关
│   ├── lib //api或其他需要引用的lib
│   ├── router //router相关
│   └── store //vuex store相关
│
├── static //项目静态文件
└── test //测试文件
```

## 项目配置与开发

项目中使用了sass vue-router vuex querystring等库，先安装相关依赖包

```bash
npm install sass-loader vuex style-loader node-sass moment css-loader axios file-loader querystring vue-router --save-dev
```

然后在基本页面实现并配置相关路由：
```
import Vue from 'vue';
import Router from 'vue-router';

import Hello from 'components/Hello';
import Detail from 'components/Detail';

Vue.use(Router);

export default new Router({
  scrollBehavior: () => ({ y: 0 }),
  routes: [
    {
      path: '/',
      name: 'Hello',
      component: Hello,
    },
    {
      path: '/detail/:vid',
      name: 'Detail',
      component: Detail,
    },
  ],
});

```

其中hello为页面首页，最终会实现为视频列表页面，目前先说视频详情页面：

API：

``` bash
# 获取视频详情
http://baobab.wandoujia.com/api/v1/video/14416

# 获取关联视频
http://baobab.wandoujia.com/api/v1/video/related/14416?num=5

# 获取当前视频评论
http://baobab.wandoujia.com/api/v1/replies/video?id=14416&num=5
```

Store：
主要包含：state、action、getters、mutations
在组件method中通过触发dispatch来修改state

```
fetchData() {
  const VID = this.$route.params.vid;
  if (!VID) {
    this.$router.go('/');
  }
  this.$store.dispatch('getVideoInfo', { VID });
  this.$store.dispatch('getRelateVideoList', { VID });
  this.$store.dispatch('getRepliesVideoList', { VID });
}
```

将state中的对象通过mapGetters映射给自定义变量：

```
computed:{
  ...mapGetters({
    video: 'videoInfo',
    videoList: 'relateList',
    replyList: 'repliesList',
  }),
  v() {
    /* eslint-disable */
    const _v = this.video;
    return {
      title: _v.title,
      desc: _v.description,
      cat: _v.category,
      tags: _v.tags,
      url: _v.playUrl,
      time: _v.time,
      cover: {
        backgroundImage: `url(${_v.coverForDetail})`,
      },
    };
  },
}
```

然后在组件中调用：

```
<div class="vue-meta-positioner">
  <div class="video-meta">
    <h1>{{v.title}}</h1>
    <div class="divider divider-short"></div>
    <p>{{v.cat}} / {{v.time}}</p>
    <p class="desciption">
      {{v.desc}}
    </p>
  </div>
</div>
```

最终效果：
![Douni.one](https://m-staticcdn.annatarhe.com//blog/x7t0ay6xbb.png)

## 部署项目
执行命令

```bash
npm run build
```

然后会生成一个dist文件夹，该文件夹中就是我们可以用来发布的代码

我将生成的项目部署到了GitHub pages和coding pages，其中国内解析走coding，而国外解析会解析到GitHub

具体项目演示地址：[http://douni.one/eyepetizer](http://douni.one/eyepetizer)

项目源码地址：
Github源码: [https://github.com/virgoone/eyepetizer/](https://github.com/virgoone/eyepetizer/)
Coding源码: [https://coding.net/u/koyasite/p/eyepetizer/](https://coding.net/u/koyasite/p/eyepetizer/)

～未完待续
