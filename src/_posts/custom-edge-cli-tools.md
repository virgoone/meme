---
title: 如何封装一个自己的瑞士军刀脚手架
date: 2021-12-08 20:00:00 +8
tags:
  - create-react-app
  - cra
  - edge tool
  - 工具
  - 脚手架
  - 前端
categories:
  - 2021
  - react
  - Front
  - Node
keywords:
  - react脚手架封装、CRA、create-react-app、cli
description: 开发过前端项目的都知道，目前的react项目的脚手架默认就是官方或者社区提供的cra工具了，而cra如果想定制也比较麻烦，只能使用社区提供的custom方案，那么我们能不能自己给自己定制一套脚手架方案呢
cover_detail: https://cdn.ugc.marryto.me//blog/5b1a7ecd3722e.jpg
cover_index: https://cdn.ugc.marryto.me//blog/5b1a7ecd3722e.jpg

---

这篇文档算是一个迟到的总结，因为定制的脚手架早早的就使用了，按时间来算到现在差不多都快3年了，而一直没有一个很好的文档或者博客说明，脚手架都做了什么，或者说有哪些配置，在21年的时候，抽了点时间把项目整理了下，使用了一些新的架构方式（学习了nest-cli），然后重新升级了service服务，把两个项目做了一次新的升级，还有项目模版也做了一些改造，主要是配合升级了webpack5，其中service主要是参考了create-react-app的实现，改了一些自己的命名或者使用习惯，将一些可调整的参数可以通过config来修改定制，整体现在来说算是一个比较完整的实现方案了，可以很好的用于个人或者企业统一的脚手架管理上，当然整个项目也是脱胎于在流利说期间所做的实现方案，算是一个梳理过后的大整合吧

## 前言
时间说明：
项目的上线实现是个bug，主要也是因为那个时间并不想去整理文档或者说写一篇博客说明，一直拖到了21年底差不多上线了一个文档站，这篇博客的时间也就和文档上线时间保持一致，最重要的原因是21年没写啥文档😭，就当是一个补充了

文档地址：
  [https://dev.douni.one/docs/welcome](https://dev.douni.one/docs/welcome)

项目地址：
  - [https://github.com/lark-org/lark-cli](https://github.com/lark-org/lark-cli)
  - [https://github.com/lark-org/lark-cli-service](https://github.com/lark-org/lark-cli-service)

项目模版：
  [https://github.com/virgoone/project-template](https://github.com/virgoone/project-template)

## Lark-CLI

与 Create React App 功能类似，提供 快速创建项目功能，目前实现是使用了设计模式重新修改了整体架构，之后拓展其他命令也变得异常 eazy 了

现在的命令比较简单，暂时只提供创建项目命令，其他之后可能会提供上传等

### 安装

```bash
npm install -g @lark-org/lark-cli
# or
yarn add --global @lark-org/lark-cli
```

### 使用
```bash
lark create <project - name>
```

其中项目使用的模版主要分成三种类型：移动端、控制台、普通PC网页，具体的源代码可参考前言中的项目模板，当然也可以直接输入自定义类型项目的git地址来下载想使用的项目模版

官方项目中比较完善的是控制台项目，主要是用 `arco-design` 和 `mobx` 来实现，内容和 `arco-pro` 是一致的，页面有Dashboard、简单的表格搜索展示、个人主页、结果页面、卡片列表、数据分析等，项目可以直接使用，只需要接入API即可

脚手架具体的配置或者参数信息可以参考文档站，这里就不多做介绍了

## Lark CLI Service

service 具体实现大致和 CRA 一样，只是在合并webpack配置的时候，使用的是 `webpack-merge` 来实现，项目可配置部分和社区的 custom cra 基本一致，不同的地方是在于css modules的匹配规则等，如果想看具体差异的话，可以直接在cra项目的基础上执行 eject 来查看

项目目前和 `lark-cli` 是捆绑的，通过 `lark-cli` 创建的除自定义类型之外的项目使用的是 service 来构建，当然也可以单独安装service用在自己的项目中，主要修改的配置就是 `config(lark.config.js)` 和 `babel`，如果不使用自定义的babel插件，完全可以直接创建一个 `lark.config.js` 来启动和构建项目，具体配置参考：[https://dev.douni.one/docs/lark-cli-service](https://dev.douni.one/docs/lark-cli-service/%E5%BC%80%E5%A7%8B)


### 安装

```bash
npm i @lark-org/lark-cli-service --save-dev
# OR
yarn add @lark-org/lark-cli-service --dev
```

### 使用

在一个 React 项目中，`@lark-org/lark-cli-service` 安装了一个名为 `lark-cli-service` 的命令。你可以在 npm scripts 中以 `lark-cli-service`、或者从终端中以 `./node_modules/.bin/lark-cli-service` 访问这个命令。

这是你使用默认 preset 的项目的 `package.json`：

```json
{
  "scripts": {
    "start": "lark-cli-service start",
    "build": "lark-cli-service build"
  }
}
```

你可以通过 npm 或 pnpm 调用这些 script：

```bash
npm run start
# OR
pnpm run start
```

其他具体配置参考文档站

这里比较着重说明的是，service 提供了 css modules 的支持，但使用方式有点区别，主要通过 url query 方式来匹配规则，具体：


```scss
// 普通的样式导入

@import 'styles/_colors.scss'; // 假设 styles 目录 在 src/ 目录下
@import '~nprogress/nprogress'; // 从 nprogress node模块导入 一个 css 文件
```


```jsx
// css modules样式导入 例：[name].css?module
import styles from './index.css?modules'; // 使用 css modules

function Header() {
  return <div style={styles.wrapper}></div>;
}
```

### 配置(config)

```javascript
// lark.config.js参考
module.exports = {
  build: {
    // 默认为false
    mfsu: false,

    // 默认为babel，支持 esbuild 在 dev 有效，
    transpiler: 'babel'

    // 构建配置,支持覆盖esbuild或者babel配置，其中babel亦可在项目下babel.config.js内添加
    transpilerOptions: {}

  },
  variables: {
    // 必选
    SENTRY_DSN: undefined,

    // 必选，网页标题
    APP_TITLE: '{package name}',

    // 可选，start 时默认为 true，build 时默认为 false
    // __DEV__,

    // 可选，当前 Commit hash
    // GIT_COMMIT_SHA,

    // 可选
    // SENTRY_RELEASE: `${APP_ENV}-${GIT_COMMIT_SHA.substr(0, 7)}`,

    // 可选，从process.env获取
    // APP_ENV,

    // 可选，默认值从 package.json 中获取
    // APP_NAME,

    // 可选
    // PUBLIC_PATH,

    // 可选
    // PUBLIC_PATH_FALLBACK,
  },
  paths: {
    // 可选，默认值 ./src/index.tsx
    // appIndex,
    // 可选，默认值 ./src
    // appSrc,
    // 可选，默认值 ./dist
    // appBuild,
    // 可选，默认值 ./public
    // appPublic,
    // 可选，默认值 ./yarn.lock
    // yarnLockFile,
    // 可选，默认值 ./package.json
    // appPackageJson,
  },
  configureWebpack: config => {
    // config 即为最终生成的 webpack config，若函数有返回值则与原 config 进行 webpack-merge
    // 可直接修改原 config，但不要返回任何内容
    return {
      plugins: [],
    }
  },
}

```

其中 build 为新增配置，主要提供开发环境下更快打包的实现，使用了 `mfsu` 或者 `swc`，具体配置：

##### mfsu

- 类型 Boolean
- 默认值 true

配置基于 `Module Federation` 的提速功能，参考[UMIJS MFSU](https://umijs.org/docs/api/config#mfsu) 配置，其中 `MFSU` 支持独立在非 umijs 项目中使用，在项目中按照[配置说明](https://umijs.org/blog/mfsu-independent-usage#%E7%8B%AC%E7%AB%8B%E4%BD%BF%E7%94%A8-mfsu)接入，可加快开发环境构建，提高热更新速度

<small>注: mfsu 目前只支持 transpiler 为 babel 时的设置</small>

##### transpiler

- 类型：string 可选的值：`babel`, `esbuild`
- 默认值：`babel`

配置构建时转译 js/ts 的工具。

##### transpilerOptions

配置构建时使用的 `babel` 或者 `esbuild` 设置，其中 `babel` 的配置也可以通过使用 `babel.config.js` 方式来修改

## 结尾
整体封装两个项目下来也是自己对 `webpack` 和 `react`、`babel`等的一次熟悉过程，如果没有尝试过，或者之前一直使用类似 cra、vue-cli-service的同学来说也算是一次深造的过程

建议大家都体验一下，这样能更好的读懂前端构建流程链路，对自己的成长也是一种比较大的帮助了，现在来看中大型公司的项目脚手架也是这样来的，如果成功体验过，也能更好的hold住一个比较大的前端项目架构的

项目Demo展示
  - [https://react-cool-image.netlify.app/](https://react-cool-image.netlify.app/)
  - [https://zz-house-lark.vercel.app/](https://zz-house-lark.vercel.app/)