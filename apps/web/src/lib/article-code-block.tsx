import { useState } from 'react';

export function ArticleCodeBlock({ code, language, blockId }: { code: string; language?: string; blockId?: string }) {
  const [copyState, setCopyState] = useState<'idle' | 'copying' | 'copied' | 'error'>('idle');
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
      <pre tabIndex={0}><code>{code}</code></pre>
    </figure>
  );
}
