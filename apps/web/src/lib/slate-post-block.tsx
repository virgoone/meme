import { Fragment, type ReactNode } from 'react';
import { LoadingImage } from './loading-image';
import { ArticleCodeBlock } from './article-code-block';

type Node = { type?: string; text?: string; children?: Node[]; [key: string]: unknown };

function safeUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const url = value.trim();
  return /^(https?:\/\/|\/[^/]|#)/i.test(url) ? url : undefined;
}

function renderNode(node: Node, blockId?: string): ReactNode {
  if (typeof node.text === 'string') {
    let text: ReactNode = node.text;
    if (node.bold) text = <strong>{text}</strong>;
    if (node.italic) text = <em>{text}</em>;
    if (node.code) text = <code>{text}</code>;
    if (node.strikethrough) text = <s>{text}</s>;
    if (node.underline) text = <u>{text}</u>;
    return text;
  }
  const children = node.children?.map((child, index) => <Fragment key={index}>{renderNode(child)}</Fragment>);
  const props = { 'data-block-id': blockId, style: { whiteSpace: 'pre-wrap' as const } };
  if (/^h[1-6]$/.test(node.type ?? '')) {
    const Heading = node.type as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
    return <Heading id={blockId} {...props}>{children}</Heading>;
  }
  switch (node.type) {
    case 'a': return <a href={safeUrl(node.url)} target='_blank' rel='noreferrer'>{children}</a>;
    case 'img': case 'image': {
      const url = safeUrl(node.url);
      const caption = Array.isArray(node.caption) ? (node.caption as Node[]).map((part) => part.text ?? '').join('') : '';
      return <figure className='image-block' {...props}>{url && <LoadingImage src={url} alt={typeof node.alt === 'string' ? node.alt : caption} />}{caption && <figcaption>{caption}</figcaption>}</figure>;
    }
    case 'code_block': case 'code': return <ArticleCodeBlock blockId={blockId} language={typeof node.lang === 'string' ? node.lang : undefined} code={node.children?.map((line) => plainText(line)).join('\n') ?? ''} />;
    case 'blockquote': return <blockquote {...props}>{children}</blockquote>;
    case 'hr': return <hr {...props} />;
    case 'table': {
      const wide = node.children?.some(row => (row.children?.length ?? 0) > 2);
      // biome-ignore lint/a11y/noNoninteractiveTabindex: Wide tables need keyboard horizontal scrolling.
      return <section className='article-table' data-wide={wide || undefined} data-block-id={blockId} aria-label={wide ? '文章表格，可左右滚动' : '文章表格'} tabIndex={0}>{wide && <p className='article-table__hint'>左右滑动查看完整表格</p>}<table><tbody>{children}</tbody></table></section>;
    }
    case 'tr': return <tr>{children}</tr>;
    case 'td': return <td>{children}</td>;
    case 'th': return <th scope='col'>{children}</th>;
    case 'ul': return <ul {...props}>{children}</ul>;
    case 'ol': return <ol {...props}>{children}</ol>;
    case 'li': return <li {...props}>{children}</li>;
    default:
      if (node.listStyleType) {
        const listProps = { ...props, style: { ...props.style, marginInlineStart: `${Math.max(0, (typeof node.indent === 'number' ? node.indent : 1) - 1) * 1.25}rem` } };
        return node.listStyleType === 'decimal'
          ? <ol start={typeof node.listStart === 'number' ? node.listStart : 1} {...listProps}><li>{children}</li></ol>
          : <ul {...listProps}><li>{children}</li></ul>;
      }
      return <p {...props}>{children}</p>;
  }
}

function plainText(node: Node): string {
  return typeof node.text === 'string' ? node.text : node.children?.map(plainText).join('') ?? '';
}

export function SlatePostBlock({ value, blockId }: { value: unknown; blockId: string }) {
  return value && typeof value === 'object' ? renderNode(value as Node, blockId) : null;
}
