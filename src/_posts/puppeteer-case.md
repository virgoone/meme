---
title: 一次奇怪的数据分析需求
date: 2022-07-09 21:06:00 +8
tags:
  - puppeteer
  - 数据分析
  - 奇怪的需求
categories:
  - 2022
  - puppeteer
  - Node
keywords:
  - puppeteer,数据分析,奇怪的需求,产品汇报
description: 专心写代码时，突然被合作业务方找上门想分析下负责的低代码平台组件使用率和复用率，当时我的表情是：what？你们最开始立项的时候都没提，等我接手平台时提这样的需求我能咋办？不支持啊
cover_detail: https://cdn.ugc.marryto.me//blog/poster/5b1a7ecd88810.jpg
cover_index: https://cdn.ugc.marryto.me//blog/poster/5b1a7ecd88810.jpg

---

## 前言

如描述中说的那样，最开始的低代码平台存储组件平台数据时是保存的组件的源代码信息，虽然我也很奇怪为啥要这样做，可能是为了在node端打包组件或者页面时减少一次组件的源代码请求吧，但如大家想的那样，根本就不满足日益增多的组件和页面需求，每次打包时都需要执行下组件的源码，只会无限拖累打包速度，当组件和页面过大时，就会直接内存溢出卡死，当然这是另外一个问题，现在他们需要统计组件的使用率，关键是后端保存组件的相关信息是直接存的一个字段，而且这个字段是乱码的组件源代码信息和元数据信息，想知道一个页面的组件使用率还好说，如果是所有页面那就完了，每次总不能把所有的组件都执行一遍拿到元数据信息（namespace、version等）吧，接口不允许啊，怎么办？

还好我给他们提供了另外一种比较恶心的方案，说恶心是我想的时候以为没有那么麻烦，写代码时才发现比较恶心，这个方案就是跑一个无头浏览器，把他们要的时间段的所有页面执行一遍，拿到平台在发布时注入到页面全局的变量就可以知道这个页面所有的数据信息了，听起来是不是很简单，我也以为是的。。别急，等我描述下就知道了

这个需求拆解下，把无头浏览器做成一个本地API服务，写一个node脚本请求本地的API，拿到数据信息整理下，开搞

## API端

还是选择 Puppeteer 做一个渲染页面的服务，具体的介绍可以看下前边的Blog有描述

> Puppeteer 是谷歌官方团队开发的一个 Node 库，提供了一些 API 用来控制浏览器的行为，比如打开网页、模拟输入、点击按钮、屏幕截图等操作，通过这些 API 可以完成很多有趣的事情，其中我们用到的就是屏幕截图的功能。

主要做的是运行 Puppeteer，打开一个新的Tab，跳转到通过接口接收到的页面地址，通过 Puppeteer 提供的API拿到页面挂在在window上的所有组件信息，主要是namespace和version字段，然后返回

代码比较简单，如下：

```typescript
import * as puppeteer from 'puppeteer';
// import devices = require('puppeteer/DeviceDescriptors');
const devices = puppeteer.devices;

function sleep(delay: number) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        console.debug(`[手动延时${delay / 1000}s...]`);
        resolve(1);
      } catch (e) {
        reject(0);
      }
    }, delay);
  });
}

const getExternalInfo = async (url: string, viewWidth: number, viewHeight: number) => {
  const puppeteerOpts: any = {
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
  const client = await puppeteer.launch(puppeteerOpts);

  const page = await this.client.newPage();

  if (isNaN(viewWidth) || isNaN(viewHeight)) {
    const iPhoneX = devices['iPhone X'];
    await page.emulate(iPhoneX);
  } else {
    await page.setViewport({
      width: viewWidth,
      height: viewHeight,
    });
  }
  await page.setRequestInterception(true);

  page.on('request', (request: any) => {
    request.continue();
  });
  await page.goto(url, {
    waitUntil: 'load',
    // timeout: 0,
  });
  const values = await page.evaluate(() => {
    return Promise.resolve(window.XXX)
  });
  await sleep(1000);
  const comsDefs = Object.keys(values).map((key: string) => {
    const [name, version] = key.split('@');

    return {
      name,
      version,
    };
  });
  await this.client.close();
  return comsDefs;
}

```

这里代码虽然比较简单，但比较要注意的点是，跳转页面时等待的时机设置，也就是waitUntil参数，因为我们只需要拿到挂载在window上的信息，所以只需要页面的onload执行完就可以了，还有就是因为页面有上千个，并发时还需要调整puppeteer的调优，例如是否每次都关闭浏览器或者tab等，毕竟大家都晓得的，Chrome开的tab多电脑就会卡，当然为了保证每次页面拿到的信息都是正确的，并且puppeteer执行`goto`方法不会超时（默认是30s，测试时发现并发150个左右一定会有执行超时造成失败的，这个也和生成的页面有关，页面的组件或者内容过多造成的），就把脚本从并发改成了顺序执行

## 客户段脚本

客户端主要做的是请求本地API，比较麻烦的主要是保证并发和执行时间，所以和业务方商量过后给他们提供采样数据，随机取一个样本取两次拿到平均数据，虽然不太准确，但是为了电脑的风扇着想，只能这样做了

```javascript
// 敏感数据原因，代码就不贴了

```

因为并发执行会经常性的中间数据访问出错，主要是页面问题，这个也无解，只能改成了顺序执行，每次间隔10s中请求一次，设置最大超时时间，保证拿到每个取样到的页面执行结果，虽然即使这样，几千条页面地址最后也耗费了2个小时才跑完全部数据

## 总结
虽然最后解决了这次奇怪的分析数据的任务，但是还是深刻意识到了不要把系统想的太完善，立项或者做项目时一定要了解清楚业务方需要的东西是什么，最重要的是他们想知道什么样的打点信息，设计时一定给自己留足口子，不然就要烧电脑的风扇啊😭









