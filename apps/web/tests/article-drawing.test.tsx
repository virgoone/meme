import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { ArticleCodeBlock } from '../src/lib/article-code-block';
import { SlatePostBlock } from '../src/lib/slate-post-block';
import { postToEditorValue } from '../src/lib/post-editor-value';
import type { PostDetail } from '../src/lib/admin-queries';

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
