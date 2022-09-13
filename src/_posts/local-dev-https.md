---
title: 如何使用 HTTPS 进行本地开发
date: 2022-09-13 19:27:00 +8
tags:
  - https
  - 本地https
  - 工具
categories:
  - 2022
  - Node
  - 工具
keywords:
  - 工具,本地https,localhost,本地开发
description: 有时会需要在本地使用 HTTPS 运行网站。尝试了一下在本地快速高效的使用https开发网站，可用一些启用https才能使用的API等，例如摄像头等权限
cover_detail: https://cdn.ugc.marryto.me//blog/poster/5b1a7ecd88810.jpg
cover_index: https://cdn.ugc.marryto.me//blog/poster/5b1a7ecd88810.jpg

---

## 前言

在大多数情况下，http://localhost 就可以满足大部分开发需求：在浏览器中，它的行为与 HTTPS 🔒 非常类似。因此，部分无法在部署的 HTTP 网站上运行的 API 可以在 http://localhost 上运行。 这意味着只需要在特殊情况下才需要在本地使用 HTTPS（请参阅何时使用 HTTPS 进行本地开发），例如自定义主机名或跨浏览器的安全 cookie或者使用一些特殊需要https才能启用的API权限时就必须使用https在本地开发了

## 使用 mkcert 为本地网站开启 HTTPS

> 要为本地开发网站开启 HTTPS 并访问 https://localhost 或 https://mysite.example（自定义主机名），您需要 TLS 证书。但并非任何证书都会被浏览器接受：证书需要由您的浏览器信任的实体签名，这些实体称之为**可信证书颁发机构 (CA)** 。
>
> 您需要创建一个证书，并使用受您的设备和浏览器本地信任的 CA对其进行签名。 您可以使用工具 mkcert 通过几个命令来实现这个目的。下面介绍了它的工作原理：
>
> - 如果您使用 HTTPS 在浏览器中打开本地运行的网站，浏览器将检查本地开发服务器的证书。
> - 在看到证书已由 mkcert 生成的证书颁发机构签名后，浏览器会检查它是否已注册为受信任的证书颁发机构。
> - mkcert 已被列为受信任的颁发机构，所以浏览器会信任该证书并创建 HTTPS 连接。


<Image className="wysiwyg-image" src='https://cdn.ugc.marryto.me/blog/3kdjci7NORnOw54fMia9.avif' title='mkcert 工作原理图' alt='mkcert 工作原理图'/>

上述描述摘抄自 [https://web.dev/how-to-use-local-https/](https://web.dev/how-to-use-local-https/)，本次开发主要也是基于此文章，使用的工具是：`mkcert`

> mkcert（和类似工具）具备下列几种优势：
>
> - mkcert 专门用于创建与浏览器认为有效相兼容的证书。它会保持更新，来满足需求和最佳实践。因此您无需运行具备复杂配置或参数的 mkcert 命令，就可以生成正确的证书！
> - mkcert 是跨平台的工具。团队中的任何人都可以使用。


<div class="not-prose relative bg-slate-50 rounded-xl overflow-hidden dark:bg-slate-800/25">
  <div class="relative rounded-xl overflow-auto gap-12 sm:gap-4 font-mono font-bold shrink-0 p-8">
  我们在这篇文章中感兴趣的 mkcert 是[这个](https://github.com/FiloSottile/mkcert)，而不是[这个](https://www.npmjs.com/package/mkcert)。

  - 运行mkcert -install时，切勿导出或分享由 mkcert 自动创建的 rootCA-key.pem 。获得此文件的攻击者可以对您可能正在访问的任何网站进行路径攻击。他们可以拦截从您的电脑到任何网站（银行、医保供应商或社交网络）的安全请求。如果您需要知道 rootCA-key.pem 的位置以确保其安全，请运行 mkcert -CAROOT。
  
  - 仅将 mkcert 用于开发目的，并且永远不要要求最终用户运行 mkcert 命令。
  
  - 开发团队：所有团队成员都应该单独安装和运行 mkcert（而不是存储和共享 CA 和证书）。
  </div>
</div>

## 安装 mkcert

安装（仅一次）

```bash
brew install mkcert
brew install nss # if you use Firefox
```

将 mkcert 添加到本地根 CA。

```bash
mkcert -install
```

为网站生成一个由 mkcert 签名的证书。

```bash
mkcert localhost
```

其中在自用的脚手架 `lark-cli` 中集成了 mkcert 命令，当执行 `lark start` 时，可直接在本地生成https证书方便开发前端项目，具体请看项目：[https://github.com/lark-org/lark-cli](https://github.com/lark-org/lark-cli)

也可在`nodejs`中使用，例如：

```javascript
const https = require('https');
const fs = require('fs');
const options = {
  key: fs.readFileSync('{PATH/TO/CERTIFICATE-KEY-FILENAME}.pem'),
  cert: fs.readFileSync('{PATH/TO/CERTIFICATE-FILENAME}.pem'),
};
https
  .createServer(options, function (req, res) {
    // server code
  })
  .listen({PORT});
```

## 总结

文章[/how-to-use-local-https/](https://web.dev/how-to-use-local-https/)中除了`mkcert`之外也介绍了其他方式，像反向代理或者申请证书机构的证书等，之前的话也主要是使用代理的形式在本地启用https，现在有了`mkcert`，可以更快更便捷的在本地生成https证书方便开发，自己也集成到了前端自用脚手架内，测试比较顺滑，如果有兴趣可以到项目内体验下：[https://github.com/lark-org/lark-cli](https://github.com/lark-org/lark-cli)