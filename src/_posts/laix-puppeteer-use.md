---
title: 提升流利说图片生产10倍效率的方法
date: 2020-03-17 13:05:53
tags:
  - 流利说
  - puppeteer
  - 内容生成
  - 渠道投放
categories:
  - 2017
  - 数码
keywords:
  - 流利说,puppeteer,内容生成,渠道投放
description: 流利说是一家比较重内容的公司。围绕着整个英语学习，从渠道投放，商业转化，课程内容，分享等都充满了各种内容生成环节
cover_detail: https://cdn.ugc.marryto.me//blog/5b1a7ecd3722e.jpg
cover_index: https://cdn.ugc.marryto.me//blog/5b1a7ecd3722e.jpg

---

原文首发于 [流利说技术团队公众号](https://mp.weixin.qq.com/s/IOybLG2B2EiNMNQ-kW1-7A)

## 背景介绍

流利说是一家比较重内容的公司。

围绕着整个英语学习，从渠道投放，商业转化，课程内容，分享等都充满了各种内容生成环节。

其中使用图片表达又是所有内容中最直接应用最广泛的。

如何高质量和高效率的生产图片给到用户是我们想要通过技术手段不断改进的 。

## 技术方案的选型

技术上我们还是选择业界已经比较通用Puppeteer实现公共渲染服务，Puppeteer 是谷歌官方团队开发的一个 Node 库，提供了一些 API 用来控制浏览器的行为，比如打开网页、模拟输入、点击按钮、屏幕截图等操作，通过这些 API 可以完成很多有趣的事情，其中我们用到的就是屏幕截图的功能。  

## 难点与挑战

1. APP内生成图片服务直接面向C端，如何在保证服务稳定性的前提下，高性能，高效率的输出内容是个挑战；

2. APP内客户端和前端也都有自己的渲染方式，如何让开发者改变现有习并意识到不同方案之间的差异，统一多端的好处是个难点。

## 架构设计

![架构设计](https://cdn.ugc.marryto.me/blog/laix/laix/640.png "架构设计")

我们使用cdn作为缓存，参数相同的图片资源将会直接使用cdn的链接，减轻部分服务压力。

## Puppeteer连接池

```typescript
// 连接池初始化   
public async init(): Promise<void> {
  const self = this;
  this.client = await this.clientPrms;
  if (!this.pool) {
    this.pool = genericPool.createPool(
      {
        create(): Promise<puppeteer.Browser> {
          return self.createClient();
        },
        destroy(client: puppeteer.Browser): Promise<void> {
          return client.close();
        },
      },
      {
        min: this.min,
        max: this.max,
        acquireTimeoutMillis: config.pagePool.acquireTimeout,
        idleTimeoutMillis: config.pagePool.idleTimeout,
        evictionRunIntervalMillis: config.pagePool.evictionTimeout,
        autostart: true,
      },
    );
  }
}
```


```typescript
//释放资源给其他人用
public async releaseClient(client: puppeteer.Browser): Promise<void> {
  const memory = process.memoryUsage();
  const memoryMB = memory.heapUsed / 1024 / 1024;
  const gcThreshold = process.env.GC_THRESHOLD || 1500;
  Logger.info('now memoryMB: ' + memory.heapUsed / 1024 / 1024);
  Logger.info('now pool number: ' + this.pool.size);
  //内存使用大于指定阈值时，直接排干池子释放内存
  if (memoryMB > Number(gcThreshold)) {
    this.drain();
  } else {
    const pages = await client.pages();
    await Promise.all(pages.map(page => page.close()));
    this.pool.release(client);
  }
}

```

## Puppeteer参数优化

通过对puppeteer的参数优化可以提升约30%的性能。

```typescript
this.launchArgs = {
  //https://peter.sh/experiments/chromium-command-line-switches/
  args: [
    '--no-sandbox', //禁用沙箱
    '--disable-setuid-sandbox', //禁用linux沙箱
    '--disable-gpu', //关闭gpu渲染加速
    '--no-first-run', //跳过第一次执行任务
    '--no-zygote', // 关闭fork子进程能力
    '--single-process', //在一个进程里面渲染
    '--disable-dev-shm-usage', // 共享内存会写到/dev/shm 在docker里面会有性能提升
  ].concat([]),
};

```

目前单次渲染性能数据已经从最早的2s左右降低1s左右。

考虑线上约有50%左右的请求会命中缓存，所以目前单台4核心4G内存的机器可以扛住5-10qps。

## 方案对比

为了让开发者能够更多的了解我们服务的好处，我们收集了一些信息对比并在内部wiki公示分享。

<table width="100%"> 
   <thead> 
    <tr> 
     <th><span>对比维度</span></th> 
     <th colSpan="1">子维度</th> 
     <th>Canvas/客户端渲染</th> 
     <th>使用MICKEY渲染</th> 
    </tr> 
   </thead> 
   <tbody> 
    <tr> 
     <td rowSpan="3"><span>学习代码<br /><br /></span></td> 
     <td colSpan="1"><span>代码体积</span></td> 
     <td><span>占用包体积</span></td> 
     <td><span>代码存放在服务端，无需下载</span></td> 
    </tr> 
    <tr> 
     <td colSpan="1"><span>代码可读性</span></td> 
     <td><span>较差，调试复杂</span></td> 
     <td><span>可读，易于调试</span></td> 
    </tr> 
    <tr> 
     <td colSpan="1"><span>代码复用性</span></td> 
     <td><span>多端重复编码</span></td> 
     <td><span>Node 端统一处理，无须重复编码</span></td> 
    </tr> 
    <tr> 
     <td rowSpan="2"><span>兼容性</span></td> 
     <td colSpan="1"><span>小程序</span></td> 
     <td><span>小程序 canvas 存在兼容问题</span></td> 
     <td><span>服务器用chrome版本78，可以支持各种新特性，无兼容问题</span></td> 
    </tr> 
    <tr> 
     <td colSpan="1"><span>h5</span></td> 
     <td colSpan="1"><span>低版本android上的canvas存在兼容问题</span></td> 
     <td colSpan="1"><span>服务器用chrome版本78，可以支持各种新特性，无兼容问题</span></td> 
    </tr> 
    <tr> 
     <td rowSpan="2"><span>性能</span></td> 
     <td colSpan="1"><span>字体</span></td> 
     <td colSpan="1"><span>需要额外引入字体库，影响页面性能</span></td> 
     <td colSpan="1"><span>服务器预装字体</span></td> 
    </tr> 
    <tr> 
     <td colSpan="1"><span>资源加载</span></td> 
     <td colSpan="1"><span>用户实时加载静态资源</span></td> 
     <td colSpan="1"><span>服务器可以预加载静态资源</span></td> 
    </tr> 
  </tbody> 
</table>

## 已接入的案例
目前C端已经有大部分业务已经接入使用。

<Image className="wysiwyg-image" width="1102" height="468" src='https://cdn.ugc.marryto.me/blog/laix/laix/SCR-20220705-htn.jpeg' title="案例" alt='案例'/>

## 性能数据展示
为了定期监控不同团队接入的性能情况，我们做了一个简单的性能监控页面。

![性能数据展示](https://cdn.ugc.marryto.me/blog/laix/laix/645.jpeg "性能数据展示")

## 平台化工具

我们发现在存在一些样式差不多的图片，只是文字的改动，或者是小部分样式改动，需要设计师反复出图，浪费人力，所以我们做了一个可以通过模板生成图片的后台工具。

![平台化工具](https://cdn.ugc.marryto.me/blog/laix/laix/646.jpeg "平台化工具")

![平台化工具](https://cdn.ugc.marryto.me/blog/laix/laix/647.jpeg "平台化工具")

这里可能有同学会问，模板的代码需要人工去写吗，如果人工去写的话还不如设计师改一下也挺快，所以这边我们还提供一个可以从figma设计稿一键转成react组件的工具，这样整个后台就不需要太大的维护成本，且可以用很小的代价不断扩展模板。

## 未来

1. 性能的继续优化还是我们需要不断的探索的，比如引入redis做缓存，把渲染模板页面改成渲染本地组件，减少http请求等；

2. 由于puppeteer是一个比较实用的工具服务，所以我们也考虑建立puppeteer集群，做横向技术服务输出；

3. 目前我们的服务主要还是做拼装的渲染，偏后期制作，但是内容本身的搜索和挖掘也会占用很多时间，这些前期制作的优化也是需要考虑的。

原文链接：[点击查看](https://mp.weixin.qq.com/s/IOybLG2B2EiNMNQ-kW1-7A)









