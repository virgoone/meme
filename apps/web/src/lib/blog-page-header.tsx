export function BlogPageHeader() {
  return (
    <header className='legacy-blog-header'>
      <h1>欢迎光临我的博客</h1>
      <p>博客内容基本为日常一些技术整理和总结，也可能会有其他类型内容</p>
      <p className='legacy-rss'><a href='/feed.xml'>RSS</a></p>
    </header>
  );
}
