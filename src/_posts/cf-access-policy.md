---
title: 关闭Cloudflare Pages的访问策略
date: 2023-02-21 18:31:21 +8
tags:
  - Cloudflare
  - 2023
  - Pages
categories:
  - 2023
  - Cloudflare
keywords:
  - Cloudflare,编程,程序员,开发者,Hacker News,ECMAScript,开源,Github
description: 如何通过API关闭Cloudflare Pages的访问策略
cover_detail: https://cdn.ugc.marryto.me//blog/poster/5b1a7ecd88810.jpg
cover_index: https://cdn.ugc.marryto.me//blog/poster/5b1a7ecd88810.jpg
---
今天使用 Cloudflare Pages 部署了一个小玩意，想加一个简易的访问控制，比如说输入密码或者邀请码才可以访问，然后在 Cloudflare 后台找了下，看到一个访问策略的功能，然后就把它打开了，没想到竟然无法关闭，而且并不是想要的访问控制，这个的功能大致是邀请 Cloudflare 的用户访问，粗略看了下文档，哪想到没有关闭的选项，折腾半天，小玩意还半天不能访问，看了下社区，发现了下面的话


```
This is disgusting

Just tell others to keep away from the AccessPolicy from CloudflarePages

```

遇事不决Google，找到了一些社区提问，资料和博客

社区：[社区地址](https://community.cloudflare.com/t/how-can-i-disable-the-access-policy-of-cloudflare-pages/292358)

博客：[博客地址](https://leao9203.pages.dev/post/779882ca6aa5)

文档：[文档地址](https://api.cloudflare.com/#access-applications-delete-access-application)

### 解决方案

curl API 获取相应的 ***app uuid***

```bash
curl -X GET "https://api.cloudflare.com/client/v4/accounts/账户标识符/access/apps" \
     -H "X-Auth-Email: 邮箱" \
     -H "X-Auth-Key: Global API KEY" \
     -H "Content-Type: application/json"
```

以下为需要修改的地方

- 账户标识符 是登录Cloudflare后浏览器后面的一串字符如 `https://dash.cloudflare.com/114514adfasdhfkhjaskfwehakgbadkf`

- 邮箱 就是你的邮箱

- Global API KEY 打开 [API tokens](https://dash.cloudflare.com/profile/api-tokens) 查看并保存即可

curl后你就获取一大堆废话，这里就不贴图了。然后找到最下面的一个 uid 保存下来

"uid":"xxxxx"

#### 下一步：curl 关闭访问策略

```bash
curl -X DELETE "https://api.cloudflare.com/client/v4/accounts/账户标识符/access/apps/刚才获取的app uuid"  \
     -H "X-Auth-Email: 邮箱" \
     -H "X-Auth-Key: Global API KEY" \
     -H "Content-Type: application/json"
```

- GET修改为了DELETE
- 最后添加了前面获取的app uuid

最后显示如下表示大功告成

`"success":true`