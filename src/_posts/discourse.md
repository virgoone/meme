---
title: 安装discourse遇到的各种坑
date: 2016-05-25 16:09:21 +8
categories:
  - discourse
tags:
  - discourse
  - 安装
  - 论坛
  - vpls
  - nginx
cover_detail: https://cdn.ugc.marryto.me//blog/5b1a7ecc2215b.jpg
cover_index: https://cdn.ugc.marryto.me//blog/5b1a7ecc2215b.jpg
description: 最近尝试使用Discourse创建了一个论坛，先部署在aws ec2上，随后可能会迁移到阿里云，此坑只针对aws

---
第一次打开[atom-china](https://atom-china.org)的时候觉得很惊奇，界面很新，效果挺好，所以就在欢迎邮件里面直接问站长atom-china是用什么模版做的，然后就了解到了[Discourse](https://www.discourse.org/) =>
Discourse是由Stack Overflow 的联合创始人 Jeff Atwood推出的免费开源论坛项目，基于Ruby on Rails 和 Ember.js 开发，数据库使用 PostgreSQL 和 Redis。
Discourse最大的特点是简洁和专业性，以话题为关系聚集用户。
最近尝试使用Discourse创建了一个论坛，先部署在aws ec2上，随后可能会迁移到阿里云，此坑只针对aws，经验在下面，坑在经验里面：
## 登录aws
```bash
ssh -i "***" ubuntu@*.*.*.*
```
## 安装docker／git
```bash
wget -qO- https://get.docker.com/ | sh
```
## 安装Discourse(git方式)
```bash
sudo -s
mkdir /var/discourse
git clone https://github.com/discourse/discourse_docker.git /var/discourse
cd /var/discourse
```
## 初始化
```bash
./discourse-setup
```
```bash
Hostname for your Discourse? [discourse.example.com]:
Email address for admin account? [me@example.com]:
SMTP server address? [smtp.example.com]:
SMTP user name? [postmaster@discourse.example.com]:
SMTP password? []:
```
## 修改配置
```bash
vim containers/app.yml
```
因为使用的是QQ企业邮箱，所以smtp服务需要加上：
```bash
DISCOURSE_SMTP_ENABLE_START_TLS: true
DISCOURSE_SMTP_AUTHENTICATION: login
DISCOURSE_SMTP_OPENSSL_VERIFY_MODE: none
```
端口号465是没有效果的，需要改为默认的：
```bash
DISCOURSE_SMTP_PORT: 587
```
修改完成后，重新构建：
```bash
./launcher rebuild app
```
但是QQ邮箱还有一个坑，第一次无法收到验证邮件，需要命令行手动添加：
```bash
cd /var/discourse
./launcher enter app
rake admin:create
```
然后输入你初始化时输入的[Email address for admin account]Email,确认密码，赋予admin权限就好，打开网页host，输入用户名和密码登录
最后在settings里面设置notification email与初始化时[SMTP user name? ]一致，然后在邮件测试页面测试：

测试成功！！
测试成功！！

## nginx与discourse
到此为止，流程基本跑通，但是因为站点使用的二级域名，为了不影响其他域名的访问，所以通过nginx做了一个转向代理:
### discourse配置修改：
```bash
cd /var/discourse
vim containers/app.yml
```
修改：(设置端口代理)
```bash
expose:
  - "9090:80"   # http
```
最后运行：
```bash
./launcher rebuild app
```
### nginx增加配置：
在/etc/nginx/conf.d/增加discourse.conf，文件内容如下：
```bash
server {
    listen 80;
    server_name vpls.virgo.one;

    location / {
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Host $http_host;
        proxy_set_header X-NginX-Proxy true;

        proxy_pass http://127.0.0.1:9090/;
        proxy_redirect off;

        # Socket.IO Support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```
然后执行sudo nginx -t
如果无误，重新加载nginx config
```bash
sudo service nginx reload
```
最后通过域名访问

成功！！
成功！！


## 添加Github第三方登录
打开[Github application](https://github.com/settings/applications/)，进入Developer applications，新建应用程序

Homepage url为你的discourse地址，authorization callback url为你的discourse地址加上/auth/github/callback，然后复制Client ID和Client Secret，
最后打开discourse，进入管理－设置－登录，找到下图所示三个字段，勾选填入刚才复制的内容

然后确定、完成。

点击=>完成！
