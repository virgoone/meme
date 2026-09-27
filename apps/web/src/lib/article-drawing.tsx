import { useEffect, useRef, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@bunship-ai/ui/components/select';
import { drawingRendererUrl } from './editor-widget-url';
import type { DrawingMode, DrawingType, ExcalidrawData } from './article-drawing-data';
import './article-drawing.css';

type Renderer = {
  renderDiagram: (type: DrawingType, code: string) => Promise<string>;
  renderExcalidraw: (data: ExcalidrawData) => Promise<string>;
};
let rendererPromise: Promise<Renderer> | undefined;
function loadRenderer() {
  rendererPromise ??= import(/* @vite-ignore */ drawingRendererUrl).catch(error => {
    rendererPromise = undefined;
    throw error;
  });
  return rendererPromise;
}

export function ArticleDrawing({ type, code = '', data, blockId, initialMode = 'Image' }: {
  type: DrawingType | 'Excalidraw'; code?: string; data?: ExcalidrawData; blockId?: string; initialMode?: DrawingMode;
}) {
  const container = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  const [mode, setMode] = useState(initialMode);
  const [image, setImage] = useState('');
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [copyState, setCopyState] = useState('复制源码');
  const serializedData = data ? JSON.stringify(data) : '';
  const empty = type === 'Excalidraw' ? !data?.elements.length : !code.trim();
  useEffect(() => {
    const element = container.current;
    if (!element) return;
    if (!('IntersectionObserver' in window)) { setVisible(true); return; }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { setVisible(true); observer.disconnect(); }
    }, { rootMargin: '300px' });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    setImage(''); setError(false);
    if (!visible || mode === 'Code' || empty) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const render = loadRenderer().then(renderer => type === 'Excalidraw'
      ? renderer.renderExcalidraw(JSON.parse(serializedData))
      : renderer.renderDiagram(type, code));
    Promise.race([render, new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('Diagram timed out')), 25000); })])
      .then(result => {
        // Display SVG as an image, never as executable markup in the article DOM.
        if (!/^data:image\/(svg\+xml|png)[;,]/.test(result)) throw new Error('Invalid diagram image');
        if (!cancelled) setImage(result);
      })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => clearTimeout(timer));
    return () => { cancelled = true; clearTimeout(timer); };
  }, [visible, mode, type, code, serializedData, attempt, empty]);
  const showCode = type !== 'Excalidraw' && (mode !== 'Image' || !image);
  return <figure ref={container} className='article-drawing' data-block-id={blockId} data-drawing-type={type}>
    <figcaption className='article-drawing__header'>
      <span>{type === 'PlantUml' ? 'PlantUML' : type}</span>
      {type !== 'Excalidraw' && <Select value={mode} onValueChange={value => setMode(value as DrawingMode)}>
        <SelectTrigger className='article-drawing__mode' aria-label='图表显示方式'><SelectValue /></SelectTrigger>
        <SelectContent className='article-drawing__menu' align='end' collisionPadding={12}>
          <SelectItem className='article-drawing__option' value='Image'>图表</SelectItem>
          <SelectItem className='article-drawing__option' value='Both'>源码与图表</SelectItem>
          <SelectItem className='article-drawing__option' value='Code'>源码</SelectItem>
        </SelectContent>
      </Select>}
      {type !== 'Excalidraw' && <button type='button' onClick={async () => {
        try { await navigator.clipboard.writeText(code); setCopyState('已复制'); }
        catch { setCopyState('请手动复制'); setMode('Code'); }
      }}>{copyState}</button>}
      {image && <a href={image} download={`${type.toLowerCase()}.svg`}>下载 SVG</a>}
      {type === 'Excalidraw' && data && <a href={`data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify({ type: 'excalidraw', version: 2, elements: data.elements, appState: data.state, files: data.files }))}`} download='drawing.excalidraw'>下载源文件</a>}
    </figcaption>
    <div className='article-drawing__body' data-both={showCode && mode !== 'Code' && !!image || undefined}>
      {/* biome-ignore lint/a11y/noNoninteractiveTabindex: Diagram source must support keyboard horizontal scrolling. */}
      {showCode && <pre tabIndex={0}><code>{code}</code></pre>}
      {mode !== 'Code' && <div className='article-drawing__preview' aria-live='polite'>
        {image ? <img src={image} alt={`${type} 图表`} /> : <p>{empty ? '暂无图表内容' : error ? <>图表暂时无法显示。<button type='button' onClick={() => setAttempt(value => value + 1)}>重试</button></> : '正在加载图表…'}</p>}
      </div>}
    </div>
  </figure>;
}
