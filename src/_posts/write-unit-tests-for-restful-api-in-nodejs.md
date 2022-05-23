---
title: 在 Node.js 中为 Restful API 编写单元测试
date: 2017-05-10 13:48:54
tags:
  - Restful
  - API单元测试
  - Node.js
categories:
  - 2017
  - Nodejs
keywords:
  - nodejs,测试,前端开发,React.js,vue.js,node.js,编程,程序员,开发者,Hacker News,ECMAScript,开源,Github
cover_detail: https://cdn.ugc.marryto.me//blog/5b1a7ecd5b4e1.jpg
cover_index: https://cdn.ugc.marryto.me//blog/5b1a7ecd5b4e1.jpg
---

## 简介

单元测试是针对程序模块来进行正确性检验的测试工作
程序单元是应用的最小可测试部件。

在 Web 应用中，我们可以把 Restful API 看作是构成应用的单元。
Restful API 比较好测试，测试起来也比较简单。

最近想做一个短视频分享类的网站，因为市面上看到的短视频网站不管是页面还是功能，目前也只有大疆的[天空之城](https://www.skypixel.com/)的垂直型看起来不错，所以萌生了一个做短视频网站的想法

因为觉得这个网站做好之后需要长期维护，所以觉得最好的办法就是添加单元测试

## F.I.R.S.T 原则

当我们决定要编写单元测试之后，我们就要考虑怎样 写好 单元测试，换句话说就是编写单元测试时需要注意哪些原则。
那么，有哪些原则是我们需要注意的呢？

- Fast: 测试必须是快速的

- Isolated / Independent:
  - 每个测试都要做 3 A => Arrange(准备), Act(行动), Assert(断言)
  - Arrange: 测试过程中用到的数据不能依赖于运行环境，测试中用到的数据应是测试中的一部分
  - Act: 调用你想要测试的方法 / API
  - Assert: 根据返回结果进行断言
  - 测试结果不能依赖运行环境
  - 测试结果不依赖运行测试的顺序
- Repeatable:
  - 每个测试必须是可重复执行的，即运行 N 次，会得到 N 次相同的结果
  - 每个测试的结果不应依赖时间，日期，和随机数的输出
- Self-validating:
  - 每个测试都可以自己判断结果来判断测试是否通过
  - 不需要人类去查阅手册来判断结果
- Thorough and Timely:
  - 应该尽量覆盖所有使用场景
  - 应该尝试测试驱动开发(TDD)

这就是经典的 F.I.R.S.T 原则。
我们最好时刻注意自己编写的单元测试是否遵守这些原则。

JavaScript 社区里有很多测试框架可以用来编写单元测试，有 ava、mocha、jasmine、tap 等。
这些测试框架都有提供 beforeEach、afterEach API，目的是隔离我们的测试数据，从而满足 Isolated / Independent 和 Repeatable 原则。

## 编写单元测试

基本流程：
- 为 app 创建 http 服务器
- 对各个 API 发出请求
- 对响应内容进行断言

使用工具：
- [supertest](https://github.com/visionmedia/supertest)
- [mocha](https://mochajs.org/)
- [should.js](https://github.com/tj/should.js)

代码：
```javascript
const co = require('co');
const {
  ObjectId
} = require('mongoose').Types;
import UserModel from '../server/api/user/user.model';
const app = require('../server/app');
const request = require('supertest').agent(app.listen());
// const jwt = require('jsonwebtoken');
const auth = require('../server/auth/auth.service');
import {
  config
} from '../server/util';
const jwt = require('jsonwebtoken');


describe('User API', function () {
  // 为每个单元测试初始化数据
  // 每个单元测试中可以通过 context 来访问相关的数据
  beforeEach(function (done) {
    const self = this;
    co(function* () {
      self.user1 = yield UserModel.create({
        email: 'user1@virgo.one',
        password: 'user1',
        name: 'testoluser1'
      })
      self.user2 = yield UserModel.create({
        email: 'admin@virgo.one',
        password: 'admin',
        name: 'testoladmin',
        role: 'admin'
      })
      // self.token = auth.signToken(self.user1._id,self.user1.role);
      self.token1 = jwt.sign({
        _id: self.user1._id,
        role: self.user1.role
      }, config.secrets.session, {
        expiresIn: config.tokenExpireTime * 60
      })
      self.token2 = jwt.sign({
        _id: self.user2._id,
        role: self.user2.role
      }, config.secrets.session, {
        expiresIn: config.tokenExpireTime * 60
      })
      // self.token2 = auth.signToken(self.user2._id,self.user2.role);
      done()
    }).catch(err => {
      console.log('err: ', err)
      done();
    })
  })
  // 正常情况下更新用户信息，需要带上 token
  it('should return 200 when PATCH /users/current with token', function (done) {
    const self = this;
    request.patch('/api/v1/users/current/').set('Auth-Koya', self.token2).send({
      name: 'validusername'
    }).expect("Content-type", /json/).expect(200, done)
  })
  // 正常情况下访问 /user
  it('should get user info when GET /users/current with token', function (done) {
    const self = this;
    request.get('/api/v1/users/current').set('Auth-Koya', this.token1).expect(200).end(function (err, res) {
      if (err) {
        return done(err)
      };
      res.status.should.equal(200);
      res.body.data._id.should.equal(self.user1._id.valueOf().toString())
      // res.body.error.should.equal(false);
      done();
    })
  });
  // 正常role下访问 /users list
  it('should get user list when GET /users with token & role', function (done) {
    request.get('/api/v1/users/').set('Auth-Koya', this.token2).expect(200).end(function (err, res) {
      if (err) {
        return done(err)
      };
      res.status.should.equal(200);
      res.body.data.list.should.be.an.Array();
      done();
    })
  })
  // 正常情况下的用户注册不会带上 token
  it('should return user info when POST /users', function (done) {
    const username = 'testoluser123'
    request
      .post('/api/v1/users/')
      .send({
        name: username,
        email: 'testuser123@virgo.one',
        password: '123456'
      })
      .expect(201)
      .end((err, res) => {
        if (err) {
          return done(err)
        };
        res.status.should.equal(201);
        res.body.data.name.should.equal(username)
        done()
      })
  })
  // 非正常情况下访问 /user/current
  it('should return 401 when GET /users/current without token', function (done) {
    request.get('/api/v1/users/current').expect("Content-type", /json/).expect(401, done)
  })
  // 非正常role下访问 /users list
  it('should return 403 when GET /users with token without role', function (done) {
    request.get('/api/v1/users/').set('Auth-Koya', this.token1).expect("Content-type", /json/).expect(403, done)
  })

  // 非法情况下更新用户信息，如缺少 token
  it('should return 401 when PATCH /users/current without token', function (done) {
    request.patch('/api/v1/users/current').send({
      name: 'validusername'
    }).expect(401, done)

  })
  afterEach(function (done) {
    co(function* () {
      yield UserModel.find({
        name: /testol/i
      }).remove().exec();
      // yield UserModel.find({email: 'admin@virgo.one'}).remove().exec();
      done()
    }).catch(err => {
      console.log('err: ', err)
      done()
    })
  })
});
```

为 Restful API 编写单元测试还有一个优点，就是可以轻易区分登录状态和非登录状态。

如果要在用户界面中测试这些功能，那么就需要不停地登录和注销，将会是一项累人的工作~

## 参考资料

[https://zh.wikipedia.org/zh-cn/%E5%8D%95%E5%85%83%E6%B5%8B%E8%AF%95](https://zh.wikipedia.org/zh-cn/%E5%8D%95%E5%85%83%E6%B5%8B%E8%AF%95)
[http://blog.hubstaff.com/why-you-should-write-unit-tests/](http://blog.hubstaff.com/why-you-should-write-unit-tests/)
[https://github.com/ghsukumar/SFDC_Best_Practices/wiki/F.I.R.S.T-Principles-of-Unit-Testing](https://github.com/ghsukumar/SFDC_Best_Practices/wiki/F.I.R.S.T-Principles-of-Unit-Testing)
[https://www.zhihu.com/question/28729261/answer/94964928](https://www.zhihu.com/question/28729261/answer/94964928)
[https://yq.aliyun.com/articles/57804](https://yq.aliyun.com/articles/57804)
[https://scarletsky.github.io/2016/10/05/write-unit-tests-for-restful-api-in-nodejs/](https://scarletsky.github.io/2016/10/05/write-unit-tests-for-restful-api-in-nodejs/)




