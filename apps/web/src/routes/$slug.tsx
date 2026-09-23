import { createFileRoute, Link } from '@tanstack/react-router';
import { Fragment, type ReactNode, useEffect, useMemo, useState } from 'react';
import { usePost, usePostComments, usePostReactions, type PostDetail } from '../lib/admin-queries';
import { addComment, blogPostState, type CommentDto } from '../lib/blog-post-state';
import { Commentable } from '../lib/commentable';
import { formatDate, moodEmoji, moodLabel } from '../lib/format';
import { CalendarIcon, CursorClickIcon, HourglassIcon, UTurnLeftIcon } from '../lib/icons';
import { LoadingImage } from '../lib/loading-image';
import { BlogPostPageSkeleton } from '../lib/page-skeletons';

export const Route = createFileRoute('/$slug')({ component: BlogPostPage });

export type { PostDetail };

function BlogPostPage() {
  const { slug } = Route.useParams();
  const post = usePost(slug);
  return (
    <article className='article-page'>
      {post.isPending && <BlogPostPageSkeleton />}
      {post.isError && <p className='state-text state-text--error'>{post.error instanceof Error ? post.error.message : String(post.error)}</p>}
      {post.data && <PostContent post={post.data} />}
    </article>
  );
}

export function PostContent({ post }: { post: PostDetail }) {
  const blocks = post.blocks ?? [];
  const outline = useMemo(() => getOutline(blocks), [blocks]);
  const comments = usePostComments(post.id);
  const commentsEnabled = true;

  useEffect(() => { blogPostState.postId = post.id; }, [post.id]);
  useEffect(() => {
    if (comments.data && Array.isArray(comments.data)) {
      comments.data.forEach((c) => {
        addComment(c as unknown as CommentDto);
      });
    }
  }, [comments.data]);

  return (
    <div className='legacy-article-layout'>
      <aside className='legacy-article-toc-wrap'><div className='legacy-article-toc-sticky'><ArticleTableOfContents outline={outline} /></div></aside>
      <div className='legacy-article-main'>
        <Link to='/blog' className='legacy-back-button' aria-label='返回博客页面'><UTurnLeftIcon /></Link>
        <article data-postid={post.id}>
          <header className='legacy-article-header'>
            {post.coverImageUrl && (<div className='legacy-article-cover'><LoadingImage src={post.coverImageUrl} alt={post.title} loading='eager' fill /></div>)}
            <div className='legacy-article-meta'>
              <time dateTime={post.publishedAt ?? undefined}><CalendarIcon /><span>{formatDate(post.publishedAt)}</span></time>
              <span><span className='legacy-mood-emoji' aria-hidden='true'>{moodEmoji(post.mood)}</span><span>{moodLabel(post.mood)}</span></span>
            </div>
            <h1>{post.title}</h1>
            {post.description && <p>{post.description}</p>}
            <div className='legacy-article-submeta'>
              <span title='0'><CursorClickIcon /><span>0次点击</span></span>
              <span><HourglassIcon /><span>{Math.round(post.readingTime ?? 0)}分钟阅读</span></span>
            </div>
          </header>
          <div className='legacy-prose'>
            {blocks.length === 0 ? <p className='state-text'>这篇文章还没有导入正文。</p> : blocks.map((block) => (
              <div key={block.blockId} className='group relative'>
                <PostBlockView block={block} />
                {commentsEnabled && <Commentable blockId={block.blockId} />}
              </div>
            ))}
          </div>
        </article>
      </div>
      <aside className='legacy-article-reactions-wrap'><div className='legacy-article-reactions-sticky'><ArticleReactions id={post.id} mood={post.mood} /></div></aside>
    </div>
  );
}

type OutlineNode = { id: string; style: 'h1'|'h2'|'h3'|'h4'; text: string };
type PostBlock = { blockId: string; sortIndex?: number; type?: string; plainText?: string | null; portableTextJson?: unknown };

function ArticleTableOfContents({ outline }: { outline: OutlineNode[] }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  useEffect(() => {
    if (outline.length === 0) return;
    function handleScroll() {
      const headings = outline.map((n) => document.getElementById(n.id)).filter(Boolean) as HTMLElement[];
      setActiveId(headings.filter((h) => h.getBoundingClientRect().top < 120).at(-1)?.id ?? outline[0]?.id ?? null);
    }
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [outline]);
  if (outline.length === 0) return null;
  return (
    <ul className='legacy-article-toc'>
      {outline.map((n) => (<li key={n.id} className={`legacy-article-toc__item legacy-article-toc__item--${n.style}${n.id === activeId ? ' is-active' : ''}`} aria-label={n.id === activeId ? '当前位置' : undefined}><a href={`#${n.id}`}>{n.text}</a></li>))}
    </ul>
  );
}

function ArticleReactions({ id, mood }: { id: string; mood: PostDetail['mood'] }) {
  const reactions = usePostReactions(id);
  const [cached, setCached] = useState([0,0,0,0]);
  useEffect(() => { if (reactions.data) setCached(reactions.data); }, [reactions.data]);
  async function handleReaction(index: number) {
    setCached((c) => { const n = [...c]; n[index] = (n[index]??0)+1; return n; });
    try {
      const r = await fetch(`/api/reactions?id=${encodeURIComponent(id)}&index=${index}`, { method: 'PATCH' });
      const p = await r.json() as { data?: number[] };
      if (Array.isArray(p.data)) setCached(p.data);
    } catch { /* optimistic */ }
  }
  return (
    <div className='legacy-reactions'>
      {moodToReactions(mood).map((reaction, i) => (
        <button key={reaction} type='button' className='legacy-reaction' onClick={() => void handleReaction(i)} aria-label={`reaction-${reaction}`}>
          <img src={`/reactions/${reaction}.png`} alt='' /><span>{prettifyNumber(cached[i]??0)}</span>
        </button>
      ))}
    </div>
  );
}

function moodToReactions(m: PostDetail['mood']) {
  switch(m) { case 'happy': return ['claps','tada','confetti','fire']; case 'sad': return ['pray','cry','heart','hugs']; default: return ['claps','heart','thumbs-up','fire']; }
}
function getOutline(blocks: PostBlock[]) {
  return blocks.flatMap((b) => { const s = portableTextStyle(b.portableTextJson); if (!isHeadingStyle(s)) return []; const t = b.plainText ?? portableTextText(b.portableTextJson); return t.trim() ? [{ id: b.blockId, style: s, text: t.trim() }] : []; });
}
function isHeadingStyle(v: string): v is OutlineNode['style'] { return v==='h1'||v==='h2'||v==='h3'||v==='h4'; }
function portableTextStyle(v: unknown): string { if (!v||typeof v!=='object') return 'normal'; const s = (v as {style?:unknown}).style; return typeof s==='string'?s:'normal'; }
function portableTextText(v: unknown): string { if (!v||typeof v!=='object') return ''; const c = (v as {children?:unknown}).children; if (!Array.isArray(c)) return ''; return c.map((ch) => ch&&typeof ch==='object'&&'text' in ch?String((ch as {text?:unknown}).text??''):'').join(''); }
function prettifyNumber(v: number) { return v>=1000?`${Number((v/1000).toFixed(1))}k`:String(v); }

function PostBlockView({ block }: { block: PostBlock }) {
  const t = block.type ?? '';
  if (t==='code') return (<pre className='code-block' data-block-id={block.blockId}><code>{block.plainText ?? stringifyBlock(block.portableTextJson)}</code></pre>);
  if (isImageBlock(block)) { const u = sanityImageUrl(block.portableTextJson); return (<figure className='image-block' data-block-id={block.blockId}>{u ? <LoadingImage src={u} alt={block.plainText??''} /> : <div>Image</div>}{block.plainText && <figcaption>{block.plainText}</figcaption>}</figure>); }
  const text = block.plainText ?? stringifyBlock(block.portableTextJson); if (!text.trim()) return null;
  const st = portableTextStyle(block.portableTextJson); const children = renderPortableTextChildren(block.portableTextJson);
  if (isHeadingStyle(st)) { const H = st; return (<H id={block.blockId} data-block-id={block.blockId}><a href={`#${block.blockId}`}>{text}</a></H>); }
  if (st==='blockquote') return <blockquote data-block-id={block.blockId}>{children}</blockquote>;
  const li = portableTextListItem(block.portableTextJson);
  if (li==='bullet'||li==='number') { const L = li==='number'?'ol':'ul'; return (<L data-block-id={block.blockId}><li>{children}</li></L>); }
  return <p data-block-id={block.blockId}>{children}</p>;
}
function isImageBlock(b: PostBlock) { if (b.type==='image') return true; const v=b.portableTextJson; if (!v||typeof v!=='object') return false; return (v as {_type?:unknown})._type==='image'&&sanityImageUrl(v)!==null; }
function sanityImageUrl(v: unknown): string|null {
  if (!v||typeof v!=='object') return null;
  const a = (v as {asset?:{_ref?:unknown;url?:unknown}}).asset;
  if (typeof a?.url==='string'&&a.url.trim()) return a.url;
  const ref = typeof a?._ref==='string'?a._ref:typeof (v as {_ref?:unknown})._ref==='string'?(v as {_ref:string})._ref:null;
  if (!ref?.startsWith('image-')) return null;
  const m = /^image-([a-f0-9]+)-(\d+x\d+)-([a-z0-9]+)$/i.exec(ref); if (!m) return null;
  const [,id,dims,fmt]=m;
  const pid = (import.meta as any).env?.VITE_SANITY_PROJECT_ID||'gynhwdlh';
  const ds = (import.meta as any).env?.VITE_SANITY_DATASET||'production';
  return `https://cdn.sanity.io/images/${pid}/${ds}/${id}-${dims}.${fmt}`;
}
function stringifyBlock(v: unknown): string { if (typeof v==='string') return v; if (v==null) return ''; try {return JSON.stringify(v);} catch {return String(v);} }
function portableTextListItem(v: unknown): string|null { if (!v||typeof v!=='object') return null; const li=(v as {listItem?:unknown}).listItem; return typeof li==='string'?li:null; }
function renderPortableTextChildren(v: unknown): ReactNode[] {
  if (!v||typeof v!=='object') return [];
  const c = (v as {children?:unknown}).children; const md = portableTextMarkDefs(v); if (!Array.isArray(c)) return [];
  return c.map((ch,i)=>{if(!ch||typeof ch!=='object') return null; const t=String((ch as {text?:unknown}).text??''); const mk=(ch as {marks?:unknown}).marks; return <Fragment key={`${i}-${t}`}>{applyPortableTextMarks(t,Array.isArray(mk)?mk.map(String):[],md)}</Fragment>;});
}
function portableTextMarkDefs(v: unknown) {
  const m=new Map<string,string>(); if (!v||typeof v!=='object') return m;
  const md=(v as {markDefs?:unknown}).markDefs; if (!Array.isArray(md)) return m;
  for (const d of md) { if (!d||typeof d!=='object') continue; const k=(d as {_key?:unknown})._key; const h=(d as {href?:unknown}).href; if (typeof k==='string'&&typeof h==='string') m.set(k,h); }
  return m;
}
function applyPortableTextMarks(text: string, marks: string[], md: Map<string,string>): ReactNode {
  return marks.reduce<ReactNode>((c,m)=>{if(m==='strong') return <strong>{c}</strong>; if(m==='em') return <em>{c}</em>; if(m==='code') return <code>{c}</code>; const h=md.get(m); if(h) return <a href={h} target='_blank' rel='noreferrer'>{c}</a>; return c;}, text);
}
