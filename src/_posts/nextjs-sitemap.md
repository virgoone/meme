---
title: 使用sitemap和stream模块在Next.js项目中生成sitemap
date: 2023-03-15 22:25:21 +8
tags:
  - 2023
  - next.js
  - sitemap
  - stream
  - react
categories:
  - 2023
  - next.js
keywords:
  - NodeJS,上传,File,云存储
description: 在Next.js项目中，我们经常需要生成sitemap以提高网站的SEO效果。在这篇文章中，将介绍如何使用sitemap和stream模块来生成sitemap，并将其集成到Next.js项目中
cover_detail: https://dogefs.s3.ladydaily.com/~/source/unsplash/photo-1678669701650-46851754bcef?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxlZGl0b3JpYWwtZmVlZHw5fHx8ZW58MHx8fHw%3D&auto=format&fit=crop&w=800&q=80
cover_index: https://dogefs.s3.ladydaily.com/~/source/unsplash/photo-1678669701650-46851754bcef?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxlZGl0b3JpYWwtZmVlZHw5fHx8ZW58MHx8fHw%3D&auto=format&fit=crop&w=800&q=80
---

## 介绍
在Next.js项目中，我们经常需要生成sitemap以提高网站的SEO效果。在这篇文章中，将介绍两种使用sitemap和stream模块来生成sitemap的方法，并将其集成到Next.js项目中。

## 安装模块

首先，我们需要安装sitemap和stream模块。

```sh
npm install sitemap stream --save
```

## 生成sitemap

我们可以使用sitemap模块来生成sitemap。下面是一个生成sitemap的示例：

```javascript
const Sitemap = require('sitemap');

const sitemap = new Sitemap({
  hostname: 'https://example.com',
  cacheTime: 600000, // 600 sec - cache purge period
  urls: [
    { url: '/', changefreq: 'monthly', priority: 1 },
    { url: '/about', changefreq: 'monthly', priority: 0.9 },
    { url: '/contact', changefreq: 'monthly', priority: 0.8 },
  ],
});
```

### 写入stream

我们可以使用stream模块将生成的sitemap写入到文件中。下面是一个将sitemap写入到文件的示例：

```javascript
const fs = require('fs');
const stream = require('stream');

const writeStream = fs.createWriteStream('./public/sitemap.xml');
const xmlStream = new stream.PassThrough();
xmlStream.write(sitemap.toString());
xmlStream.pipe(writeStream);
```

### 集成到Next.js项目中
我们可以将以上代码集成到Next.js项目中。

#### 方法1: 写入 public，直接生成sitemap.xml

在next.config.js文件中添加以下代码：

```javascript
const Sitemap = require('sitemap');
const fs = require('fs');
const stream = require('stream');

module.exports = {
  async exportPathMap(defaultPathMap) {
    // Generate sitemap
    const sitemap = new Sitemap({
      hostname: 'https://blog.douni.one',
      cacheTime: 600000, // 600 sec - cache purge period
      urls: [
        { url: '/', changefreq: 'monthly', priority: 1 },
        { url: '/about', changefreq: 'monthly', priority: 0.9 },
        { url: '/contact', changefreq: 'monthly', priority: 0.8 },
      ],
    });

    // Write sitemap to file
    const writeStream = fs.createWriteStream('./public/sitemap.xml');
    const xmlStream = new stream.PassThrough();
    xmlStream.write(sitemap.toString());
    xmlStream.pipe(writeStream);

    return defaultPathMap;
  },
};
```

### 方法2: 通过getServerSideProps方法动态生成

首先新建一个 `sitemap.xml.tsx` 文件，并添加以下代码：

```typescript
import { GetServerSideProps } from 'next'
import { SitemapStream, streamToPromise } from 'sitemap'
import { Readable } from 'stream'
import { postFilePaths } from '../utils/post'

type SiteMapProps = {}

function SiteMap(props: SiteMapProps) {
  return null
}

export const getServerSideProps: GetServerSideProps<any> = async ({ res }) => {
  res.setHeader('Content-Type', 'application/xml')

  const staticPaths = postFilePaths
    // Remove file extensions for page paths
    .map((path) => path.replace(/\.mdx?$/, ''))
    .map((slug) => ({ url: `/${slug}`, changefreq: 'weekly', priority: 1.0 }))
  const links = [
    { url: '/', changefreq: 'monthly', priority: 1 },
    ...staticPaths,
    { url: '/about', changefreq: 'monthly', priority: 0.1 },
  ]

  const smStream = new SitemapStream({ hostname: 'https://blog.douni.one' })
  const result = await streamToPromise(Readable.from(links).pipe(smStream))
  res.write(result.toString())
  res.end()

  return {
    props: {},
  }
}

export default SiteMap
```

### 总结

在本文中，我们介绍了如何使用sitemap和stream模块在Next.js项目中生成sitemap。本网站生成sitemap方法正是采用了第二种方案，通过学习本文，我们可以更好地处理SEO问题，提高网站的可见性和排名。希望这篇文章能对你有帮助。