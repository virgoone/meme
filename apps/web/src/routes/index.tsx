import { createFileRoute, useRouterState } from '@tanstack/react-router';
import { motion, useReducedMotion, type Variants } from 'framer-motion';

import { useHomePosts, usePost, type PostCardItem } from '../lib/admin-queries';
import {
  GitHubIcon,
  MailIcon,
  SparkleIcon,
  TiltedSendIcon,
  TwitterIcon,
} from '../lib/icons';
import { BlogPostCard, BlogPostCardSkeleton } from '../lib/post-card';
import { BlogPostPageSkeleton } from '../lib/page-skeletons';
import { PostContent, type PostDetail } from './$slug';

export const Route = createFileRoute('/')({
  component: HomePage,
});

function HomePage() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const slug = pathname.startsWith('/') ? pathname.slice(1) : pathname;
  const shouldReduceMotion = useReducedMotion();
  const posts = useHomePosts();

  if (slug && !isReservedPath(slug)) {
    return <InlineArticlePage slug={slug} />;
  }

  return (
    <motion.div
      className='legacy-home'
      initial={shouldReduceMotion ? false : 'hidden'}
      animate='visible'
      variants={{
        hidden: { opacity: 1 },
        visible: {
          opacity: 1,
          transition: { staggerChildren: 0.11, delayChildren: 0.05 },
        },
      }}
    >
      <motion.section className='legacy-container legacy-home-headline' variants={homeItemVariants}>
        <Headline />
      </motion.section>
      <motion.section className='legacy-container legacy-home-grid' variants={homeItemVariants}>
        <motion.div className='legacy-recent-posts' variants={homeItemVariants}>
          <h2 className='legacy-section-heading'>
            <span aria-hidden='true'>✎</span><span>近期文章</span>
          </h2>
          {posts.isPending ? (
            <div className='legacy-post-stack' role='status' aria-label='文章列表加载中'>
              {Array.from({ length: 3 }).map((_, i) => (<BlogPostCardSkeleton key={i} />))}
            </div>
          ) : posts.isError ? (
            <p className='state-text state-text--error'>{posts.error instanceof Error ? posts.error.message : String(posts.error)}</p>
          ) : !posts.data || posts.data.length === 0 ? (
            <p className='state-text'>还没有导入文章。</p>
          ) : (
            <div className='legacy-post-stack'>
              {posts.data.map((post) => (<BlogPostCard post={post} key={post.id} />))}
            </div>
          )}
        </motion.div>
        <motion.aside className='legacy-home-aside' variants={homeItemVariants}>
          <NewsletterSection />
        </motion.aside>
      </motion.section>
    </motion.div>
  );
}

const homeItemVariants: Variants = {
  hidden: { opacity: 1, y: 18, filter: 'blur(6px)' },
  visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.45, ease: [0.21, 0.47, 0.32, 0.98] as const } },
};

function InlineArticlePage({ slug }: { slug: string }) {
  const post = usePost(slug);
  return (
    <article className='article-page'>
      {post.isPending && <BlogPostPageSkeleton />}
      {post.isError && <p className='state-text state-text--error'>{post.error instanceof Error ? post.error.message : String(post.error)}</p>}
      {post.data && <PostContent post={post.data as unknown as PostDetail} />}
    </article>
  );
}

function isReservedPath(pathname: string) {
  return /^(admin|api|blog|projects|guestbook|confirm|newsletters)(\/|$)/.test(pathname);
}

function Headline() {
  return (
    <div className='legacy-headline'>
      <div className='legacy-headline-card' aria-hidden='true'>
        <img src='/portrait.png' alt='' />
        <span><strong>Koya</strong><small>online, probably coding</small></span>
      </div>
      <h1>
        <span className='developer'><span className='mono'>&lt;</span>小前端<span className='mono'>/&gt;</span></span>，
        <span className='designer'>正在搬砖</span>，<span className='headline-break' />
        <span className='ocd'><SparkleIcon aria-hidden='true' />啥都写点</span>
      </h1>
      <p>欢迎来到我的博客。前端搬砖，喜欢开发。在用的一些自己添加了部分基于开源的<a href='https://douni.one/' target='_blank' rel='noreferrer'>工具</a></p>
      <div className='legacy-socials'>
        <a href='/twitter' aria-label='我的推特'><TwitterIcon aria-hidden='true' /></a>
        <a href='/github' aria-label='我的 GitHub'><GitHubIcon aria-hidden='true' /></a>
        <a href='mailto:w2008second@gmail.com' aria-label='我的邮箱'><MailIcon aria-hidden='true' /></a>
      </div>
    </div>
  );
}

function NewsletterSection() {
  return (
    <section className='legacy-newsletter'>
      <h2><TiltedSendIcon aria-hidden='true' /><span>动态更新</span></h2>
      <p><span>喜欢我的内容的话不妨订阅支持一下 🫶</span><br /><span>每月一封，随时可以取消订阅。</span></p>
      <form>
        <label className='sr-only' htmlFor='newsletter-email'>邮箱</label>
        <input id='newsletter-email' name='email' type='email' autoComplete='email' placeholder='你的邮箱' />
        <button type='submit'>订阅</button>
      </form>
    </section>
  );
}
