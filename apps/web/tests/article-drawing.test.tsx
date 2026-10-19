import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { ArticleCodeBlock } from '../src/lib/article-code-block';
import { SlatePostBlock } from '../src/lib/slate-post-block';
import { postToEditorValue } from '../src/lib/post-editor-value';
import type { PostDetail } from '../src/lib/admin-queries';
import { renderMermaidImage } from '../src/lib/article-mermaid';

const gomokuDiagram = `flowchart TD
  A[玩家点击] --> D["GameScreen.apply(point)"]
  B[Worker 返回] --> D
  C[远端落子] --> D
  D --> E["GomokuGame.play(x, y)"]
  E --> F[invalid / placed / win / draw]
  F --> G[BoardView + 下一回合 / 结算]`;

test.each([
  [gomokuDiagram, 'pele-flowchart', '玩家点击'],
  ['graph TD; A[开始]-->B[结束]', 'pele-flowchart', '结束'],
  ['classDiagram\nAnimal <|-- Duck\nAnimal : +int age\nclass Duck {\n+String beakColor\n+swim()\n}', 'pele-class', 'Duck'],
  ['sequenceDiagram\nAlice->>Bob: 你好\nBob-->>Alice: 收到', 'pele-sequence', '你好'],
  ['stateDiagram-v2\n[*] --> Ready\nReady --> [*]', 'pele-state', 'Ready'],
  ['pie title 比例\n"完成": 8\n"等待": 2', 'pele-pie', '完成'],
])('renders Mermaid source with Pele into a standalone image: %s', async (source, type, label) => {
  const image = await renderMermaidImage(source);
  expect(image).toStartWith('data:image/svg+xml;charset=utf-8,');
  const svg = decodeURIComponent(image.split(',')[1]);
  expect(svg).toContain(type);
  expect(svg).toContain(label);
  expect(svg).toMatch(/<svg[^>]+width="[\d.]+"/);
  expect(svg).toMatch(/<svg[^>]+height="[\d.]+"/);
  expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
  expect(svg).not.toContain('foreignObject');
});

test('diagram syntax failures and size limits reject without breaking subsequent renders', async () => {
  await expect(renderMermaidImage('not a diagram')).rejects.toThrow();
  await expect(renderMermaidImage('flowchart TD\nA[')).rejects.toThrow();
  await expect(renderMermaidImage(`graph TD; A-->B\n${' '.repeat(100_000)}`)).rejects.toThrow('图表源码过长');
  expect(await renderMermaidImage(' \n ')).toBe('');
  expect(await renderMermaidImage('graph TD; A-->B')).toStartWith('data:image/svg+xml;');
});

test('downloadable diagrams escape labels and do not contain active links or external images', async () => {
  const image = await renderMermaidImage(`flowchart TD
  A["<script>alert(1)</script>"] --> B["安全 & Unicode 中文"]
  click B "https://example.com/"
  C@{ img: "https://example.com/tracker.png", label: "image" }`);
  const svg = decodeURIComponent(image.split(',')[1]);
  expect(svg).not.toContain('<script');
  expect(svg).not.toContain('<image');
  expect(svg).not.toContain('href=');
  expect(svg).toContain('中文');
});

test.each([['mermaid', 'Mermaid'], ['language-plantuml', 'PlantUml'], ['puml', 'PlantUml'], ['dot', 'Graphviz'], ['Graphviz', 'Graphviz'], ['flowchart', 'Flowchart']])('renders %s fences as diagrams while retaining source for SSR', (language, type) => {
  const html = renderToStaticMarkup(<ArticleCodeBlock code={'A --> B\n<script>alert(1)</script>'} language={language} blockId='diagram' />);
  expect(html).toContain(`data-drawing-type="${type}"`);
  expect(html).toContain('data-block-id="diagram"');
  expect(html).toContain('&lt;script&gt;');
  expect(html).not.toContain('<script>');
});

test('native Plate diagrams respect source-only mode and retain the complete source', () => {
  const html = renderToStaticMarkup(<SlatePostBlock blockId='native' value={{ type: 'code_drawing', children: [{ text: '' }], data: { drawingType: 'Mermaid', drawingMode: 'Code', code: 'graph TD; A-->B' } }} />);
  expect(html).toContain('graph TD; A--&gt;B');
  expect(html).not.toContain('正在加载');
});

test('unsupported drawing types preserve readable source rather than discard the block', () => {
  const html = renderToStaticMarkup(<SlatePostBlock blockId='future' value={{ type: 'code_drawing', data: { drawingType: 'Unknown', code: 'saved source' }, children: [{ text: '' }] }} />);
  expect(html).toContain('saved source');
  expect(html).not.toContain('data-drawing-type');
});

test('Excalidraw scene, embedded image files and block identity survive editor reopening', () => {
  const node = { type: 'excalidraw', id: 'drawing', blockId: 'drawing', blockID: 'drawing', children: [{ text: '' }], data: { elements: [{ type: 'image', fileId: 'file1' }], state: { viewBackgroundColor: '#fff' }, files: { file1: { dataURL: 'data:image/png;base64,aGVsbG8=' } } } };
  const reopened = postToEditorValue({ blocks: [{ slateJson: node, portableTextJson: { _type: 'slate' } }] } as unknown as PostDetail);
  expect(reopened[0].data).toEqual(node.data);
  expect(reopened[0].blockId).toBe('drawing');
  const html = renderToStaticMarkup(<SlatePostBlock blockId='drawing' value={reopened[0]} />);
  expect(html).toContain('data-drawing-type="Excalidraw"');
  expect(html).toContain('drawing.excalidraw');
});

test('malformed drawing data does not break the surrounding article', () => {
  for (const type of ['excalidraw', 'code_drawing']) {
    expect(() => renderToStaticMarkup(<SlatePostBlock blockId='empty' value={{ type, data: null, children: [{ text: '' }] }} />)).not.toThrow();
  }
});
