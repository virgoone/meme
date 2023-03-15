---
title: 在Node.js中使用File、Blob、Buffer、String相互转换并上传至OSS
date: 2023-03-15 19:19:21 +8
tags:
  - 2023
  - NodeJS
categories:
  - 2023
  - NodeJS
keywords:
  - NodeJS,上传,File,云存储
description: 在Node.js中使用File、Blob、Buffer、String相互转换，并最终上传到云存储商的流程
cover_detail: https://dogefs.s3.ladydaily.com/~/source/unsplash/photo-1678845530054-0268510ebc25?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxlZGl0b3JpYWwtZmVlZHw2fHx8ZW58MHx8fHw%3D&auto=format&fit=crop&w=800&q=80
cover_index: https://dogefs.s3.ladydaily.com/~/source/unsplash/photo-1678845530054-0268510ebc25?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxlZGl0b3JpYWwtZmVlZHw2fHx8ZW58MHx8fHw%3D&auto=format&fit=crop&w=800&q=80
---

## 介绍
在Node.js中，我们常常需要将文件上传到云存储商，或者在服务端进行文件的转换和处理等操作。在这些操作中，我们需要将文件在不同的格式之间相互转换，比如File、Blob、Buffer和String。本文将介绍如何在Node.js中进行这些数据格式之间的相互转换，并将其上传到AWS S3云存储中。

## File和Blob

在Node.js中，我们通常使用formidable、multer等第三方库来处理文件上传。这些库会将上传的文件转为File对象，我们可以通过fs模块的createReadStream()方法将其转为Readable流对象，然后再通过Blob对象的构造函数将其转为Blob对象。

### File转Blob

```javascript
const formidable = require('formidable');
const fs = require('fs');
const { Blob } = require('buffer');

const form = formidable();
form.parse(req, (err, fields, files) => {
  const file = files.file;
  const blob = new Blob([fs.createReadStream(file.path)]);
});
```

### Blob转File
在Node.js中，Blob对象没有提供直接转File对象的方法，但我们可以通过新建一个File对象来实现。我们可以使用fs模块的writeFile()方法将Blob对象中的数据写入到磁盘文件中，然后再通过fs模块的createReadStream()方法将其转为Readable流对象，最后再通过File对象的构造函数将其转为File对象。

```javascript
const { Blob } = require('buffer');
const fs = require('fs');

const blob = new Blob(['hello world'], { type: 'text/plain' });
fs.writeFile('hello.txt', blob, (err) => {
  if (err) throw err;
  const file = new File([fs.createReadStream('hello.txt')], 'hello.txt', { type: 'text/plain' });
});
```

## Blob和Buffer

在Node.js中，我们使用Buffer对象来处理二进制数据。我们可以使用Blob对象的arrayBuffer()方法将其转为ArrayBuffer类型的数据，然后再将其转为Buffer类型的数据；也可以使用Buffer对象的toJSON()方法将其转为JSON格式的数据，然后再将其转为Buffer类型的数据。

### Blob转Buffer

```javascript
const { Blob } = require('buffer');

const blob = new Blob(['hello world'], { type: 'text/plain' });
blob.arrayBuffer().then((arrayBuffer) => {
  const buffer = Buffer.from(arrayBuffer);
});
```

### Buffer转Blob

```javascript
const { Blob } = require('buffer');

const buffer = Buffer.from('hello world');
const json = buffer.toJSON();
const blob = new Blob([JSON.stringify(json)], { type: 'text/plain' });
```

## String和Buffer

在Node.js中，我们可以使用Buffer对象来处理文本数据和二进制数据的转换。我们可以通过Buffer对象的from()方法将String类型的数据转为Buffer类型的数据，也可以通过Buffer对象的toString()方法将Buffer类型的数据转为String类型的数据。

### String转Buffer

```javascript
const buffer = Buffer.from('hello world');
```

### Buffer转String

```javascript
const buffer = Buffer.from('hello world');
const str = buffer.toString();
```

## 上传到AWS S3
在Node.js中，我们可以使用aws-sdk库来上传文件到AWS S3云存储中。我们需要先创建一个S3实例，然后使用S3.upload()方法来上传文件。

```javascript
const AWS = require('aws-sdk');
const s3 = new AWS.S3({
  accessKeyId: 'your-access-key-id',
  secretAccessKey: 'your-secret-access-key',
});

const params = {
  Bucket: 'your-bucket-name',
  Key: 'hello.txt',
  Body: fs.createReadStream('hello.txt'),
  ContentType: 'text/plain',
};

s3.upload(params, (err, data) => {
  if(err) {
    console.error(err);
  } else {
    console.log(File uploaded successfully. Location: ${data.Location});
  }
});

```

## 完整示例

下面是一个完整的示例，演示如何将一个`File`对象上传到AWS S3云存储中。

```javascript
const AWS = require('aws-sdk');
const formidable = require('formidable');
const fs = require('fs');
const { Blob } = require('buffer');

const s3 = new AWS.S3({
  accessKeyId: 'your-access-key-id',
  secretAccessKey: 'your-secret-access-key',
});

const form = formidable();
form.parse(req, (err, fields, files) => {
  const file = files.file;
  const blob = new Blob([fs.createReadStream(file.path)]);
  const params = {
    Bucket: 'your-bucket-name',
    Key: file.name,
    Body: blob,
    ContentType：file.type,
  };
  s3.upload(params, (err, data) => {
    if (err) {
      console.error(err);
    } else {
      console.log(`File uploaded successfully. Location: ${data.Location}`);
    }
  });
});
```

## 总结

在Node.js中，我们可以使用File、Blob、Buffer和String等数据类型来处理文件和数据的转换。通过aws-sdk库，我们可以将文件上传到AWS S3云存储中。这些技术可以帮助我们更好地处理文件和数据，提高Node.js应用程序的效率和性能。

## 延伸

### 前端构造文件对象上传至服务器或者云存储

今天做了个需求，大概意思是需要从远程获取一个json文件，文件内容是数组或者对象，前端修改后需要再上传到云存储中，这个时候本来想的做法是转成base64直接通过云存储提供的SDK上传，但是因为国内一些云存储的跨域设置和限制，导致一直有跨域错误，迫不得已，只能前端把对象构造成文件然后再通过服务器直传，大概做法是：

```javascript
const axios = require('axios');
const dataSource = {"key": "value"};
const content = new Blob([dataSource], {
  type: 'text/plain;charset=utf-8',
});
const filepath = `${Date.now()}/a.json`;
const file = new File([content], filepath, {
  type: 'application/javascript;charset=utf-8',
  lastModified: Date.now(),
});
const formData = new FormData();
formData.append('file', file);

axios.post(`xxx/upload`, formData)
  .then((result) => {
    console.log('result->', result.url)
  });

```

真的是万般艰难，又重新理解了下buffer、blob、file之间的关系😂😂