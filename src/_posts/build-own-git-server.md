---
title: 搭建自己的Git服务器-Gitea安装教程
date: 2018-06-08 21:28:34
tags:
  - git
  - gitea
  - git服务器搭建
  - gitlab
cover_detail: https://m-staticcdn.annatarhe.com//blog/poster/qtxbmx321qp.jpg
cover_index: https://m-staticcdn.annatarhe.com//blog/poster/qtxbmx321qp.jpg
subtitle: 如何搭建自己的Git服务器
---

好久没有写过博客了，续费域名时突然想起来有个博客已经很久未更新了

突然觉得浪费了之前的一波配置😂，现在更新一波

顺便对博客的样式做了个更新放弃了hexo，可能是因为hexo太重了，找了一个比较轻量级的theme替代了hexo

## 自架Git Service的选择

最近也是突然对搭建自己的git服务器有了一点想法，随后搜索了现在主流的开源git


 - Gogs 使用go开发的git service
 - Gitlab 目前比较火的
 - Gitea 基于gogs开发


 ### Gogs

参考 Gogs 文档 里描述

>
> Gogs 是一款极易搭建的自助 Git 服务。
> Gogs 的目标是打造一个最简单、最快速和最轻松的方式搭建自助 Git服 务。使用 Go 语言开发使得 Gogs 能够通过独立的二进制分发，并且支持 Go 语言支持的 所有平台，包括 Linux、Mac OS X、Windows 以及 ARM 平台。
>


Gogs 是由 Unknwon 发起的，目前为止他是 Gogs 主要的代码贡献者和唯一的维护者，换直白一点的话就是，Gogs 的代码不全是他写的，但主要是他写的，且他是唯一一个有权决定别人的代码是否被合并到 Gogs 的人

### Gitlab

来自 谷歌 描述

> GitLab 是利用 Ruby on Rails 一个开源的版本管理系统，实现一个自托管的Git项目仓库，可通过Web界面进行访问公开的或者私人项目。它拥有与Github类似的功能，能够浏览源代码，管理缺陷和注释。可以管理团队对仓库的访问，它非常易于浏览提交过的版本并提供一个文件历史库。团队成员可以利用内置的简单聊天程序(Wall)进行交流。它还提供一个代码片段收集功能可以轻松实现代码复用，便于日后有需要的时候进行查找。
>

Gitlab现在也是一个比较火的自建Git服务的选择，不过Gitlab对于服务器的要求比较高，当然如果想尝试的话可以搭建试一下

PS：<a href="https://www.liulishuo.com">流利说</a> 现在的Git服务器使用的是自建的Gitlab

### Gitea

来自 Gitea 文档 里描述

> Gitea 是一个开源社区驱动的 Gogs 克隆

当然更神奇的是Gitea的博客的描述的：

> Gitea is a community fork of the popular self-hosted Git service Gogs. We’re a growing group of former Gogs users and contributors who found the single-maintainer management model of Gogs frustrating and thus decided to make an effort to build a more open and faster development model.
>
> This happened not before trying to convince @Unknwon about giving write permissions to more people, among the community. He rightly considered Gogs his own creature and didn’t want to let it grow outside of him, thus a fork was necessary in order to set that code effectively free.
>
> As Kahlil Gibran wrote about children:
>
> > Your children are not your children. They are the sons and daughters of Life’s longing for itself. They come through you but not from you, and though they are with you yet they belong not to you.
>
> Gitea has 3 owners which are elected yearly and an open number of maintainers who decide with a simple voting model which contributions get accepted and who will play the owner role. Anyone with at least 4 contributions accepted can apply to become a maintainer.
>
> Since the fork at the beginning of November 2016 Gitea got 193 pull requests merged and 43 issues closed. Among management issues and cleanups, 11 bugs were closed. Another 26 PR are pending merges, many of which are just waiting for 1.0.0 to be released as most new features will start appearing in 1.1.0.
>
> We invite everyone to join the effort and help continue building the next generation of self-hosted Git service.

有兴趣的话可以到下方博客链接中看一下Gitea和Gogs的对比差异

而今天的博客也主要讲的是如何在自己的服务器中安装Gitea

选择Gitea的原因主要是和Gogs的差异并不是很大，但是相比较commit却要远远的超过Gogs的，相比觉得最起码在问题处理上要超过Gogs

好了，闲话少说，开始安装吧

## 在自己的服务器中安装Gitea

我们这次主要通过docker的方式来安装

### 准备工作

- 安装 docker
- 安装 docker-compose
- 安装 nginx

### 编写 docker-compose.yml 文件

```yml
version: '3'
networks:
    gitea:
      external: false
services:
    gitea:
      image: gitea/gitea:latest
      restart: always
      networks:
       - gitea
      ports:
       - "10022:22"
       - "3000:3000"
      environment:
       - "USER_UID=1000"
       - "USER_GID=1000"
      volumes:
       - "/root/sites/gitea:/data"
```

使用 3000 做为Gitea Web服务器端口，10022映射ssh端口

### 启动 Gitea 服务

```sh
docker-compose up -d
```

启动之后 `curl localhost:3000` 验证是否启动成功

如果启动失败，可以执行以下命令查看报错信息

```sh
docker-compose logs
```

### 配置 nginx 代理

如果想提供给外网访问，还需要最后一步，配置nginx代理到Gitea服务

配置如下：

```bash
## 将HTTP请求全部重定向至HTTPS
server {
    listen       80;
    server_name  git.marryto.me;
    charset utf-8;
    rewrite ^ https://git.marryto.me;
}

## 请求转发到Gitea容器
server {
    listen       443 ssl;
    server_name  git.marryto.me;
    charset utf-8;
    ssl on;
    ssl_certificate         /etc/*/live/*/fullchain.pem;
    ssl_certificate_key     /etc/*/live/*/privkey.pem;
    ssl_session_timeout     10m;
    ssl_session_cache       shared:SSL:10m;
    location / {
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_pass    http://127.0.0.1:3000;
    }
    location ~ .*\.(js|css|png)$ {
        proxy_pass  http://127.0.0.1:3000;
    }
}
```

我们这里使用的是SSL，通过 Letsencrypt 可以免费申请域名证书，现在访问 [https://git.marryto.me](https://git.marryto.me)  就可以访问到我们刚刚搭建的Gitea服务器

当我们第一次访问Gitea服务器时，会进入 [https://git.marryto.me/install](https://git.marryto.me/install) 设置服务器信息，包含数据库，可选有Postgres、Mysql和SqlLite等，设置完成后我们就可以进入到自己的Git服务器了，如下：

<img class="lazy" data-original='https://m-staticcdn.annatarhe.com//blog/5b1aaef9975bb.png' title='git.marryto.me' alt='git.marryto.me'/>

好了，我们的安装就到这里，以下是关联的资料

## 资料：
[https://blog.gitea.io/2016/12/welcome-to-gitea/](https://blog.gitea.io/2016/12/welcome-to-gitea/)
[https://blog.wolfogre.com/posts/gogs-vs-gitea/](https://blog.wolfogre.com/posts/gogs-vs-gitea/)
[https://docs.gitea.io/en-us/comparison/](https://docs.gitea.io/en-us/comparison/)

