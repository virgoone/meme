---
title: 为什么在 JavaScript 中 0.1 + 0.2 的结果不等于 0.3？
date: 2023-03-03 15:50:21 +8
tags:
  - AI
  - 2023
  - javascript
  - chatgpt
categories:
  - 2023
  - javascript
  - chatgpt
keywords:
  - JavaScript 浮点数计算,IEEE 754 标准,二进制数系统,转换为整数计算,第三方库 decimal.js,四舍五入 toFixed() 方法,浮点数精度问题
description: JavaScript 中为什么会出现 0.1 + 0.2 !== 0.3 的问题？
cover_detail: https://dogefs.s3.ladydaily.com/~/source/unsplash/photo-1677611998429-1baa4371456b?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxlZGl0b3JpYWwtZmVlZHwyNHx8fGVufDB8fHx8&auto=format&fit=crop&w=800&q=80
cover_index: https://dogefs.s3.ladydaily.com/~/source/unsplash/photo-1677611998429-1baa4371456b?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxlZGl0b3JpYWwtZmVlZHwyNHx8fGVufDB8fHx8&auto=format&fit=crop&w=800&q=80
---

当我们在 JavaScript 中执行 0.1 + 0.2 的时候，我们期望得到的结果是 0.3，但实际上得到的结果却是 0.30000000000000004。这是因为在计算机中，浮点数的存储方式和计算方式与我们在日常生活中所熟悉的十进制有所不同。本文将会介绍在 JavaScript 中为什么会出现这种情况，以及如何避免这种情况的发生。

## 大纲

1. 介绍问题：在 JavaScript 中，0.1 + 0.2 的结果并不等于 0.3，这是为什么？
2. 讲解数据在计算机中的存储方式
3. 介绍浮点数的存储方式
4. 讲解浮点数计算时的精度问题
5. 提供解决方案

## 介绍

在日常生活中，我们使用的是十进制数系统，但在计算机中，数据的存储方式是二进制的。这意味着，当我们在 JavaScript 中执行 0.1 + 0.2 的时候，计算机实际上是在对二进制数进行计算，而不是对十进制数进行计算。

在 JavaScript 中，浮点数采用的是 IEEE 754 标准，它使用二进制表示浮点数。由于二进制无法精确地表示某些十进制小数，因此在进行浮点数计算时会出现精度问题。例如，0.1 在二进制中表示为 0.0001100110011001100110011001100110011001100110011……，这个数是无限循环的。但是在 JavaScript 中，浮点数只能存储一定的位数，因此会截断这个数，导致计算出来的结果与我们所期望的不同。

这种精度问题在 JavaScript 中并不是唯一的。例如，0.1 * 0.2 的结果也不是 0.02，而是 0.020000000000000004。这是因为在计算机中，浮点数的存储方式和计算方式都会导致精度问题。

## 解决方案

在实际开发中，为了避免浮点数计算时的精度问题，我们可以采用以下几种解决方案：

### 1. 转换为整数计算

将小数转换为整数进行计算，最后再将结果除以 10 的 n 次方（n 为小数点后的位数）。例如，可以将 0.1 和 0.2 转换为 1 和 2，然后进行计算，最后再将结果除以 10 即可得到正确的结果 0.3。

```javascript
let result = (1 + 2) / 10;
console.log(result); // 0.3
```

### 2. 使用第三方库

使用第三方库如 decimal.js 来解决精度问题。这个库提供了精确的十进制数计算功能，可以避免浮点数计算时的精度问题。

```javascript
const Decimal = require('decimal.js');
let result = new Decimal('0.1').plus('0.2');
console.log(result.toString()); // 0.3
```

### 3. 四舍五入

使用 JavaScript 提供的 toFixed() 方法将结果四舍五入到指定的小数位数。这种方法有一定的局限性，因为它只能四舍五入到指定的小数位数，不能得到精确的结果。

```javascript
let result = 0.1 + 0.2;
console.log(result.toFixed(1)); // 0.3
```

## 结论

在 JavaScript 中，浮点数计算时的精度问题是一个普遍存在的问题。为了避免这个问题，我们可以采用转换为整数计算、使用第三方库或四舍五入等方法。在实际开发中，我们需要了解浮点数的存储方式和计算时的精度问题，以便在避免出现不必要的错误。

上面这篇文章是不是一股 chatgpt 的味道，没错，这篇文章就是使用chatgpt生成的，真的不得不说，chatgpt在某些时候解决了相当大的生产力问题，福音，之后很大一部分文章应该都是使用chatgpt生成的了，不知道这是不是文字工作者的末日呢