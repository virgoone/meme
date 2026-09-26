import { createFileRoute, Link, notFound, useRouterState } from '@tanstack/react-router';
import { normalizePage } from '@meme/shared';
import { ArrowLeft } from 'lucide-react';
import { Fragment, type ReactNode, useEffect, useMemo, useState } from 'react';

import { postQueryOptions, usePost, usePostComments, usePostReactions, type PostDetail } from '../lib/admin-queries';
import { AdBanner } from '../lib/adsense';
import { ArticleCodeBlock } from '../lib/article-code-block';
import { blogPostState, selectCommentPost, setPostComments } from '../lib/blog-post-state';
import { Commentable } from '../lib/commentable';
import { formatDate, moodEmoji, moodLabel } from '../lib/format';
import { legacyCode, legacyListFormats, type LegacyListFormat } from '../lib/legacy-post-format';
import { LoadingImage } from '../lib/loading-image';
import { BlogPostPageSkeleton } from '../lib/page-skeletons';
import { usePostViews } from '../lib/page-views';
import { loadPublicQuery } from '../lib/route-query';
import { articleHead, privateHead } from '../lib/seo';
import { SlatePostBlock } from '../lib/slate-post-block';

export const Route = createFileRoute('/$slug')({
  loader: async ({ context, params }) => {
    try { return await loadPublicQuery(context.queryClient, postQueryOptions(params.slug)); }
    catch (error) {
      if ((error as { statusCode?: number }).statusCode === 404) throw notFound();
      throw error;
    }
  },
  head: ({ loaderData }) => loaderData ? articleHead(loaderData) : privateHead(),
  notFoundComponent: () => (
    <section className='site-measure'>
      <p className='site-kicker'><span>404</span></p>
      <h1 className='site-title'>文章不存在</h1>
      <p className='site-lead'>这篇文章可能已移动或尚未发布。</p>
      <p className='site-section'><Link to='/blog' className='article-back'><ArrowLeft aria-hidden='true' /><span>查看全部文章</span></Link></p>
    </section>
  ),
  component: BlogPostPage,
});

export type { PostDetail };

function BlogPostPage() {
  const { slug } = Route.useParams();
  const post = usePost(slug);
  return (
    <article className='article-page'>
      {post.isPending && <BlogPostPageSkeleton />}
      {post.isError && <p className='site-empty site-empty--error'>{post.error instanceof Error ? post.error.message : String(post.error)}</p>}
      {post.data && <PostContent post={post.data} />}
    </article>
  );
}

export function PostContent({ post }: { post: PostDetail }) {
  const archivePage = useRouterState({ select: (state) => normalizePage((state.location.state as { blogArchivePage?: unknown }).blogArchivePage) });
  const views = usePostViews(post.id, post.slug);
  const blocks = post.blocks ?? [];
  const listFormats = legacyListFormats(blocks.map((block) => block.portableTextJson));
  const outline = useMemo(() => getOutline(blocks), [blocks]);
  const comments = usePostComments(post.id);
  const reactions = useReactionCounter(post.id);
  const commentsEnabled = true;
  const backSearch = { page: archivePage > 1 ? archivePage : undefined };

  useEffect(() => {
    selectCommentPost(post.id);
    return () => { if (blogPostState.postId === post.id) selectCommentPost(''); };
  }, [post.id]);
  useEffect(() => {
    if (comments.data) setPostComments(post.id, comments.data);
  }, [post.id, comments.data]);

  const minutes = Math.max(1, Math.round(post.readingTime ?? 0));

  return (
    <div className='article-layout'>
      <aside className='article-aside article-aside--toc'>
        <div className='article-aside__sticky'>
          <ArticleTableOfContents outline={outline} />
        </div>
      </aside>

      <Link to='/blog' search={backSearch} className='article-back'>
        <ArrowLeft aria-hidden='true' />
        <span>全部文章</span>
      </Link>

      <article data-postid={post.id}>
        <header className='article-header'>
          <ul className='article-meta'>
            <li><Link to='/about' rel='author'>Koya</Link></li>
            <li><time dateTime={post.publishedAt ?? undefined}>{formatDate(post.publishedAt)}</time></li>
            <li>{minutes} 分钟阅读</li>
            <li title={views.data ? `${views.data.views} 次浏览` : undefined}>
              {views.data ? `${Intl.NumberFormat('zh-CN').format(views.data.views)} 次浏览` : '— 次浏览'}
            </li>
            <li title={moodLabel(post.mood)}>
              <span aria-hidden='true'>{moodEmoji(post.mood)}</span> {moodLabel(post.mood)}
            </li>
          </ul>
          <h1 className='site-title'>{post.title}</h1>
          {post.description && <p className='site-lead'>{post.description}</p>}
          {post.coverImageUrl && (
            <div className='article-cover'>
              <LoadingImage src={post.coverImageUrl} alt={post.title} loading='eager' fill />
            </div>
          )}
        </header>

        {comments.isError && (
          <p className='site-status site-status--error' role='alert'>
            评论暂时加载失败。
            <button type='button' className='site-textlink' onClick={() => void comments.refetch()}>重新加载评论</button>
          </p>
        )}

        <div className='article-body'>
          {blocks.length === 0 ? <p className='site-empty'>这篇文章还没有导入正文。</p> : blocks.map((block, index) => (
            <div key={block.blockId} className='group relative article-block'>
              <PostBlockView block={block} listFormat={listFormats[index]} />
              {commentsEnabled && <Commentable postId={post.id} blockId={block.blockId} />}
            </div>
          ))}
        </div>

        <footer className='article-footer'>
          <Link to='/blog' search={backSearch} className='article-back'>
            <ArrowLeft aria-hidden='true' />
            <span>回到全部文章</span>
          </Link>
          <ArticleReactions mood={post.mood} counts={reactions.counts} onReact={reactions.react} />
        </footer>
        {blocks.length > 0 && <AdBanner placement='article' />}
      </article>

      <aside className='article-aside article-aside--reactions'>
        <div className='article-aside__sticky'>
          <ArticleReactions mood={post.mood} counts={reactions.counts} onReact={reactions.react} />
        </div>
      </aside>
    </div>
  );
}

type OutlineNode = { id: string; style: 'h1' | 'h2' | 'h3' | 'h4'; text: string };
type PostBlock = { blockId: string; sortIndex?: number; type?: string; plainText?: string | null; portableTextJson?: unknown; slateJson?: unknown };

function ArticleTableOfContents({ outline }: { outline: OutlineNode[] }) {
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (outline.length === 0) return;
    const headings = outline
      .map((node) => document.getElementById(node.id))
      .filter((element): element is HTMLElement => element !== null);
    if (headings.length === 0) return;

    let frame = 0;
    function update() {
      frame = 0;
      const passed = headings.filter((heading) => heading.getBoundingClientRect().top < 120);
      setActiveId(passed.at(-1)?.id ?? headings[0]?.id ?? null);
    }
    function schedule() {
      if (!frame) frame = window.requestAnimationFrame(update);
    }
    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [outline]);

  if (outline.length === 0) return null;
  return (
    <nav aria-label='目录'>
      <p className='article-toc__label'>目录</p>
      <ul className='article-toc'>
        {outline.map((node) => (
          <li
            key={node.id}
            data-level={node.style}
            className={node.id === activeId ? 'is-active' : undefined}
            aria-current={node.id === activeId ? 'location' : undefined}
          >
            <a href={`#${node.id}`}>{node.text}</a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function useReactionCounter(postId: string) {
  const reactions = usePostReactions(postId);
  const [counts, setCounts] = useState<number[]>([0, 0, 0, 0]);
  useEffect(() => { if (reactions.data) setCounts(reactions.data); }, [reactions.data]);

  async function react(index: number) {
    setCounts((current) => { const next = [...current]; next[index] = (next[index] ?? 0) + 1; return next; });
    try {
      const response = await fetch(`/api/reactions?id=${encodeURIComponent(postId)}&index=${index}`, { method: 'PATCH' });
      const payload = await response.json() as { data?: number[] };
      if (Array.isArray(payload.data)) setCounts(payload.data);
    } catch { /* keep the optimistic count */ }
  }

  return { counts, react };
}

function ArticleReactions({ mood, counts, onReact }: { mood: PostDetail['mood']; counts: number[]; onReact: (index: number) => void }) {
  return (
    <fieldset className='article-reactions'>
      <legend className='sr-only'>表达反应</legend>
      {moodToReactions(mood).map((reaction, index) => (
        <button key={reaction} type='button' className='article-reaction' onClick={() => onReact(index)} aria-label={`reaction-${reaction}`}>
          <img src={`/reactions/${reaction}.png`} alt='' />
          <span>{prettifyCount(counts[index] ?? 0)}</span>
        </button>
      ))}
    </fieldset>
  );
}

function moodToReactions(mood: PostDetail['mood']) {
  switch (mood) {
    case 'happy': return ['claps', 'tada', 'confetti', 'fire'];
    case 'sad': return ['pray', 'cry', 'heart', 'hugs'];
    default: return ['claps', 'heart', 'thumbs-up', 'fire'];
  }
}

function getOutline(blocks: PostBlock[]) {
  return blocks.flatMap((block) => {
    const portableStyle = portableTextStyle(block.portableTextJson);
    const style = portableStyle === 'normal' ? slateHeading(block.slateJson) : portableStyle;
    if (!isHeadingStyle(style)) return [];
    const text = (block.plainText ?? portableTextText(block.portableTextJson)).trim();
    return text ? [{ id: block.blockId, style, text }] : [];
  });
}

function slateHeading(value: unknown): string {
  if (!value || typeof value !== 'object') return 'normal';
  const type = (value as { type?: unknown }).type;
  return typeof type === 'string' ? type : 'normal';
}
function isHeadingStyle(value: string): value is OutlineNode['style'] { return value === 'h1' || value === 'h2' || value === 'h3' || value === 'h4'; }
function portableTextStyle(value: unknown): string { if (!value || typeof value !== 'object') return 'normal'; const style = (value as { style?: unknown }).style; return typeof style === 'string' ? style : 'normal'; }
function portableTextText(value: unknown): string { if (!value || typeof value !== 'object') return ''; const children = (value as { children?: unknown }).children; if (!Array.isArray(children)) return ''; return children.map((child) => child && typeof child === 'object' && 'text' in child ? String((child as { text?: unknown }).text ?? '') : '').join(''); }
function prettifyCount(value: number) { return value >= 1000 ? `${Number((value / 1000).toFixed(1))}k` : String(value); }

function PostBlockView({ block, listFormat }: { block: PostBlock; listFormat?: LegacyListFormat }) {
  if ((block.portableTextJson as { _type?: string } | null)?._type === 'slate' && block.slateJson) return <SlatePostBlock value={block.slateJson} blockId={block.blockId} />;
  const code = legacyCode(block.portableTextJson, block.type, block.plainText);
  if (code) return <ArticleCodeBlock blockId={block.blockId} {...code} />;
  if (isImageBlock(block)) {
    const url = sanityImageUrl(block.portableTextJson);
    const alt = (block.portableTextJson as { alt?: string } | null)?.alt;
    return (
      <figure className='image-block' data-block-id={block.blockId}>
        {url ? <LoadingImage src={url} alt={alt || block.plainText || ''} /> : <div className='image-block__missing'>图片缺失</div>}
        {block.plainText && <figcaption>{block.plainText}</figcaption>}
      </figure>
    );
  }
  const text = block.plainText ?? stringifyBlock(block.portableTextJson);
  if (!text.trim()) return null;
  const style = portableTextStyle(block.portableTextJson);
  const children = renderPortableTextChildren(block.portableTextJson);
  if (isHeadingStyle(style)) { const Heading = style; return <Heading id={block.blockId} data-block-id={block.blockId}><a href={`#${block.blockId}`}>{text}</a></Heading>; }
  if (style === 'blockquote') return <blockquote data-block-id={block.blockId}>{children}</blockquote>;
  const listItem = portableTextListItem(block.portableTextJson);
  if (listItem === 'bullet' || listItem === 'number') {
    const List = listItem === 'number' ? 'ol' : 'ul';
    return <List start={listFormat?.start} style={{ marginInlineStart: `${((listFormat?.level ?? 1) - 1) * 1.25}rem` }} data-block-id={block.blockId}><li>{children}</li></List>;
  }
  return <p data-block-id={block.blockId}>{children}</p>;
}
function isImageBlock(block: PostBlock) { if (block.type === 'image') return true; const value = block.portableTextJson; if (!value || typeof value !== 'object') return false; return (value as { _type?: unknown })._type === 'image' && sanityImageUrl(value) !== null; }
function sanityImageUrl(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null;
  const asset = (value as { asset?: { _ref?: unknown; url?: unknown } }).asset;
  if (typeof asset?.url === 'string' && asset.url.trim()) return asset.url;
  const ref = typeof asset?._ref === 'string' ? asset._ref : typeof (value as { _ref?: unknown })._ref === 'string' ? (value as { _ref: string })._ref : null;
  if (!ref?.startsWith('image-')) return null;
  const match = /^image-([a-f0-9]+)-(\d+x\d+)-([a-z0-9]+)$/i.exec(ref);
  if (!match) return null;
  const [, id, dims, format] = match;
  const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {};
  const projectId = env.VITE_SANITY_PROJECT_ID || 'gynhwdlh';
  const dataset = env.VITE_SANITY_DATASET || 'production';
  return `https://cdn.sanity.io/images/${projectId}/${dataset}/${id}-${dims}.${format}`;
}
function stringifyBlock(value: unknown): string { if (typeof value === 'string') return value; if (value == null) return ''; try { return JSON.stringify(value); } catch { return String(value); } }
function portableTextListItem(value: unknown): string | null { if (!value || typeof value !== 'object') return null; const item = (value as { listItem?: unknown }).listItem; return typeof item === 'string' ? item : null; }
function renderPortableTextChildren(value: unknown): ReactNode[] {
  if (!value || typeof value !== 'object') return [];
  const children = (value as { children?: unknown }).children;
  const markDefs = portableTextMarkDefs(value);
  if (!Array.isArray(children)) return [];
  return children.map((child, index) => {
    if (!child || typeof child !== 'object') return null;
    const text = String((child as { text?: unknown }).text ?? '');
    const marks = (child as { marks?: unknown }).marks;
    return <Fragment key={`${index}-${text}`}>{applyPortableTextMarks(text, Array.isArray(marks) ? marks.map(String) : [], markDefs)}</Fragment>;
  });
}
function portableTextMarkDefs(value: unknown) {
  const map = new Map<string, string>();
  if (!value || typeof value !== 'object') return map;
  const defs = (value as { markDefs?: unknown }).markDefs;
  if (!Array.isArray(defs)) return map;
  for (const def of defs) {
    if (!def || typeof def !== 'object') continue;
    const key = (def as { _key?: unknown })._key;
    const href = (def as { href?: unknown }).href;
    if (typeof key === 'string' && typeof href === 'string') map.set(key, href);
  }
  return map;
}
function applyPortableTextMarks(text: string, marks: string[], markDefs: Map<string, string>): ReactNode {
  return marks.reduce<ReactNode>((node, mark) => {
    if (mark === 'strong') return <strong>{node}</strong>;
    if (mark === 'em') return <em>{node}</em>;
    if (mark === 'code') return <code>{node}</code>;
    const href = markDefs.get(mark);
    if (href) return <a href={href} target='_blank' rel='noreferrer'>{node}</a>;
    return node;
  }, text);
}
