import { common, createLowlight } from 'lowlight';
import { useMemo, useState, type ReactNode } from 'react';
import './article-code-block.css';
import { drawingType } from './article-drawing-data';
import { ArticleDrawing } from './article-drawing';
import { highlightShell } from './article-shell-highlight';

const highlighter = createLowlight(common);
highlighter.registerAlias({ javascript: ['jsx'], typescript: ['tsx'] });
type HighlightNode = ReturnType<typeof highlighter.highlight>['children'][number];

function renderTokens(nodes: HighlightNode[]): ReactNode[] {
  return nodes.map((node, index) => {
    if (node.type === 'text') return node.value;
    if (node.type !== 'element') return null;
    const className = Array.isArray(node.properties.className) ? node.properties.className.join(' ') : undefined;
    return <span key={index} className={className}>{renderTokens(node.children)}</span>;
  });
}

function highlightCode(code: string, language?: string): ReactNode {
  const name = language?.trim().toLowerCase().replace(/^language-/, '');
  if (!name || code.length > 100_000) return code;
  try {
    if (['bash', 'sh', 'zsh', 'shell', 'shellscript'].includes(name)) return highlightShell(code);
    if (!highlighter.registered(name)) return code;
    return renderTokens(highlighter.highlight(name, code).children);
  } catch {
    // An unsupported or malformed snippet must still display its original source.
    return code;
  }
}

export function ArticleCodeBlock({ code, language, blockId }: { code: string; language?: string; blockId?: string }) {
  const type = drawingType(language);
  return type ? <ArticleDrawing type={type} code={code} blockId={blockId} /> : <HighlightedCodeBlock code={code} language={language} blockId={blockId} />;
}

function HighlightedCodeBlock({ code, language, blockId }: { code: string; language?: string; blockId?: string }) {
  const [copyState, setCopyState] = useState<'idle' | 'copying' | 'copied' | 'error'>('idle');
  const highlighted = useMemo(() => highlightCode(code, language), [code, language]);
  return (
    <figure className='article-code' data-block-id={blockId}>
      <figcaption className='article-code__header'>
        <span>{language && language !== 'text' ? language : '代码'}</span>
        <button type='button' disabled={copyState === 'copying'} onClick={async () => {
          setCopyState('copying');
          let timer: ReturnType<typeof setTimeout> | undefined;
          try {
            await Promise.race([navigator.clipboard.writeText(code), new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Clipboard unavailable')), 1500); })]);
            setCopyState('copied');
          }
          catch { setCopyState('error'); }
          finally { clearTimeout(timer); }
        }} aria-label='复制代码'>{copyState === 'copied' ? '已复制' : copyState === 'copying' ? '复制中' : copyState === 'error' ? '请手动复制' : '复制'}</button>
      </figcaption>
      {/* biome-ignore lint/a11y/noNoninteractiveTabindex: Long code needs keyboard horizontal scrolling. */}
      <pre tabIndex={0}><code>{highlighted}</code></pre>
    </figure>
  );
}
