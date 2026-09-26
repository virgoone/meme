import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';

import { homePostsQueryOptions, useHomePosts } from '../lib/admin-queries';
import { AdBanner } from '../lib/adsense';
import { formatChineseDate, greetingForHour } from '../lib/format';
import { PostListSkeleton, PostRow } from '../lib/post-list';
import { loadPublicQuery } from '../lib/route-query';
import { pageHead } from '../lib/seo';

export const Route = createFileRoute('/')({
  head: () => pageHead('小全栈的技术实践与开发记录', '记录 Cloudflare 全栈、AI 应用、SaaS 架构与远程开发的真实实践，分享项目设计、实现过程和踩坑经验。', '/'),
  loader: ({ context }) => loadPublicQuery(context.queryClient, homePostsQueryOptions()),
  component: HomePage,
});

function HomePage() {
  const posts = useHomePosts();

  return (
    <div className='site-measure'>
      <Hero />
      <hr className='site-rule' />
      <section className='site-section'>
        <p className='site-kicker'>
          <span>近期文章</span>
          <Link to='/blog'>全部文章 →</Link>
        </p>
        {posts.isPending ? (
          <PostListSkeleton count={5} />
        ) : posts.isError ? (
          <p className='site-empty site-empty--error'>{errorText(posts.error)}</p>
        ) : !posts.data || posts.data.length === 0 ? (
          <p className='site-empty'>还没有文章。</p>
        ) : (
          <ul className='site-rows'>
            {posts.data.map((post) => <PostRow post={post} key={post.id} />)}
          </ul>
        )}
      </section>
      {!!posts.data?.length && <AdBanner placement='home' />}
    </div>
  );
}

function Hero() {
  // The greeting depends on the reader's clock, so it only renders after hydration.
  const [today, setToday] = useState<{ date: string; greeting: string } | null>(null);
  useEffect(() => {
    const now = new Date();
    setToday({ date: formatChineseDate(now), greeting: greetingForHour(now.getHours()) });
  }, []);

  return (
    <section className='home-hero'>
      <p className='site-kicker'>
        <span>{today?.date ?? ' '}</span>
      </p>
      <h1 className='site-title'>
        {today?.greeting ?? '你好'}，我是 Koya。
      </h1>
      <p className='site-lead'>
        <span className='mono'>&lt;小全栈/&gt;</span>，正在搬砖，啥都写点。喜欢写代码，也喜欢把想法做成小产品。
        这里记录全栈开发、AI 应用和日常折腾，也分享一些常用和自己改造的
        <a href='https://douni.one/' target='_blank' rel='noreferrer'>开源工具</a>。
      </p>
      <ul className='site-inline-links'>
        <li><a href='/twitter' target='_blank' rel='noreferrer'>Twitter</a></li>
        <li><a href='/github' target='_blank' rel='noreferrer'>GitHub</a></li>
        <li><a href='mailto:w2008second@gmail.com'>Email</a></li>
        <li><a href='/feed.xml'>RSS</a></li>
        <li><Link to='/about'>关于我</Link></li>
      </ul>
    </section>
  );
}

function errorText(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
