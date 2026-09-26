import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { legacyCode, legacyListFormats } from '../src/lib/legacy-post-format';
import { postToEditorValue } from '../src/lib/post-editor-value';
import { SlatePostBlock } from '../src/lib/slate-post-block';
import type { PostDetail } from '../src/lib/admin-queries';

test('legacy lists continue numbering around nested items and restart after paragraphs or a new list kind', () => {
  const item = (listItem: string, level = 1) => ({ _type: 'block', listItem, level });
  const formats = legacyListFormats([
    item('number'), item('number'), item('number', 2), item('number', 2),
    item('bullet', 2), item('number'), { _type: 'block' }, item('number'),
    item('bullet'), item('number'),
  ]);
  expect(formats.map(format => format?.start)).toEqual([1, 2, 1, 2, undefined, 3, undefined, 1, undefined, 1]);
  expect(formats.map(format => format?.level)).toEqual([1, 1, 2, 2, 2, 1, undefined, 1, 1, 1]);
});

test('Sanity codeBlock uses the original code including indentation and blank lines instead of empty plainText', () => {
  const code = 'const browser = await puppeteer.launch({\n  headless: true,\n});\n\nawait browser.close();';
  const original = { _type: 'codeBlock', code, language: 'typescript' };
  expect(legacyCode(original, 'codeBlock', '')).toEqual({ code, language: 'typescript' });
  expect(legacyCode({ _type: 'block' }, 'block', 'text')).toBeUndefined();
  const post = { blocks: [{ blockId: 'old-code', portableTextJson: original, slateJson: { id: 'old-code', type: 'codeBlock', children: [{ text: '' }] } }] } as unknown as PostDetail;
  const [value] = postToEditorValue(post);
  const html = renderToStaticMarkup(<SlatePostBlock blockId={value.blockId ?? ''} value={value} />);
  expect(value.blockId).toBe('old-code');
  expect(value.type).toBe('code_block');
  expect(html).toContain(`<code>${code}</code>`);
  expect(html).toContain('typescript');
});

test('opening and resaving migrated numbered lists retains numbering, nesting and comment anchors', () => {
  const post = { blocks: [1, 1, 2, 1].map((level, i) => ({
    blockId: `item-${i}`, portableTextJson: { _type: 'block', listItem: 'number', level },
    slateJson: { id: `item-${i}`, type: 'normal', children: [{ text: `步骤 ${i}` }] },
  })) } as unknown as PostDetail;
  const values = postToEditorValue(post);
  expect(values.map(value => value.listStart)).toEqual([1, 2, 1, 3]);
  expect(values.map(value => value.blockId)).toEqual(['item-0', 'item-1', 'item-2', 'item-3']);
  const reloaded = postToEditorValue({ blocks: values.map(slateJson => ({ slateJson, portableTextJson: { _type: 'slate' } })) } as unknown as PostDetail);
  expect(reloaded.map(value => value.listStart)).toEqual([1, 2, 1, 3]);
  const html = renderToStaticMarkup(<SlatePostBlock blockId='item-2' value={reloaded[2]} />);
  expect(html).toContain('margin-inline-start:1.25rem');
});
