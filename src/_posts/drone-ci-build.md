---
title: 基于Gitea+Drone搭建自己的CI/CD平台
date: 2018-06-09 21:48:52
tags:
  - gitea
  - drone
  - ci
  - cd
  - Drone-CI
cover_detail: https://m-staticcdn.annatarhe.com//blog/5b1a7ecc2215b.jpg
cover_index: https://m-staticcdn.annatarhe.com//blog/5b1a7ecc2215b.jpg
subtitle: 集成Gitea和Drone-CI之解放生产力
---

上一篇我们搭建了自己的Git服务器 [搭建自己的Git服务器-Gitea安装教程](/build-own-git-server)， 搭建Git之后，想找一个能解放生产力的工具

这个时间突然看到了[Drone](https://drone.io)这个CI工具，了解过后，觉得这个特别适合做为CI、CD工具的入门训练，而且它的功能非常强大

<img class="lazy" data-original='https://m-staticcdn.annatarhe.com//blog/5b1beeb0ed6f2.jpg' title='ci.marryto.me' alt='ci.marryto.me'/>


[Drone](https://drone.io)也是原生就支持docker的CI，所有编译、测试的流程都在 Docker 容器中进行。

开发者只需在项目中包含 .drone.yml 文件，将代码推送到 git 仓库，Drone 就能够自动化的进行编译、测试、发布。

本篇博客会从0开始安装一个[Drone](https://drone.io)

下面开始安装

## 准备

- 拥有公网 IP、域名 (或者拥有自己的本地 Gitea 以供测试)

- 域名 SSL 证书 (可以使用Letsencrypt)

- 熟悉 Docker 以及 Docker Compose

- 熟悉 Git 基本命令

- 对 CI/CD 有一定了解

## 配置Docker-Compose

创建docker-compose.yml配置文件

```
version: '2'

services:
  drone-server:
    image: drone/drone:latest
    ports:
      - 8000
      - 9000
    volumes:
      - /root/sites/drone:/var/lib/drone/
    restart: always
    environment:
      - DRONE_OPEN=true
      - DRONE_DEBUG=false
      - DRONE_HOST=${DRONE_HOST}
      - GITRA_PRIVATE_MODE=true
      - DRONE_GITEA=true
      - DRONE_GITEA_URL=${GITEA_URL}
      - DRONE_SECRET=${SECRET}

  drone-agent:
    image: drone/agent:latest
    command: agent
    restart: always
    depends_on:
      - drone-server
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      - DRONE_SERVER=drone-server:9000
      - DRONE_DEBUG=false
      - DRONE_SECRET=${SECRET}
```

> 注：
> 1、drone-agent的docker image地址是 drone/agent，这个之前安装时没有看清楚导致CI一直跑不起来😂
> 2、DRONE_HOST为你的CI的线上地址
> 3、DRONE_SERVER现在drone最新版中可以直接设置server:port的方式
> 4、因为使用的gitea，所有需要将DRONE_GITEA设置为true

### 启动 Drone 服务

```sh
docker-compose up -d
```

启动之后 `curl localhost:9000` 验证是否启动成功

如果启动失败，可以执行以下命令查看报错信息

```sh
docker-compose logs
```

### 配置 nginx 代理

如果想提供给外网访问，还需要最后一步，配置nginx代理到Gitea服务

配置如下：

```
## 将HTTP请求全部重定向至HTTPS
server {
    listen       80;
    server_name  ci.marryto.me;
    charset utf-8;
    rewrite ^ https://ci.marryto.me;
}

## 请求转发到Gitea容器
server {
    listen       443 ssl;
    server_name  ci.marryto.me;
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
        proxy_pass    ${之前配置的地址};
    }
    location ~ .*\.(js|css|png)$ {
        proxy_pass  ${之前配置的地址};
    }
}
```

接下来我们打开[https://ci.marryto.me](https://ci.marryto.me)

登录验证需要输入gitea的用户名和密码，接下来我们可以体验自己搭建的drone-ci了

<img class="lazy" data-original='https://m-staticcdn.annatarhe.com//blog/5b1bf199b5631.png' title='ci.marryto.me' alt='ci.marryto.me'/>

## 体验Drone

我们打开一个Node项目，新建一个.drone.yml文件，然后push到gitea中试一下

```
workspace:
  base: /ceshi/api
  path: .
pipeline:
  init:
    image: 'node:latest'
    commands:
      - 'yarn install --network-concurrency 1'
    when:
      event: [push, tag, deployment]
      branch: [master, develop]
  build:
    image: 'node:latest'
    environment:
      - TZ=Asia/Shanghai
    secrets:
      - key1
      - key3
    commands:
      - 'yarn run build'
    when:
      event: [push, tag, deployment]
      branch: [master, develop]
```

pipeline的设置基本上和其他CI工具差别不大，而且drone还支持一些service的配置

这个是官方service的一个配置

```
pipeline:
  test:
    image: golang
    commands:
      - go get
      - go test

services:
  database:
    image: postgres
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_DB=test
```

而我们这次用不到service，只需要init和 build测试一下

将改动push到master之后，我们可以看一下现在drone的页面，现在页面上有一个job在跑，我们可以点开查看一下


<img class="lazy" data-original='https://m-staticcdn.annatarhe.com//blog/5b1bf3a55d95c.png' title='ci.marryto.me' alt='ci.marryto.me'/>

我们的安装完成了

关于Drone和其他git服务的集成可以看一下Drone的官网

Tips：

如果遇到CI job一直失败的情况，而且自己的配置没有问题的话，可以升级一下自己的服务器虚拟内存试一下，土豪请忽略。


## 资料：
[Drone官网](http://drone.io/)