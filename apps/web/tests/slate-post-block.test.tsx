import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { SlatePostBlock } from '../src/lib/slate-post-block';
import { postToEditorValue } from '../src/lib/post-editor-value';
import type { PostDetail } from '../src/lib/admin-queries';

test('renders saved soft line breaks, inline formatting and safe links', () => {
  const html = renderToStaticMarkup(<SlatePostBlock blockId='paragraph' value={{ type: 'p', children: [
    { text: '第一行\n第二行', bold: true },
    { type: 'a', url: 'https://example.com', children: [{ text: '参考链接' }] },
    { type: 'a', url: 'javascript:alert(1)', children: [{ text: '无效链接' }] },
  ] }} />);
  expect(html).toContain('white-space:pre-wrap');
  expect(html).toContain('<strong>第一行\n第二行</strong>');
  expect(html).toContain('href="https://example.com"');
  expect(html).not.toContain('javascript:');
});

test('preserves multiline commands, table cells and heading anchors from imported posts', () => {
  const values = [
    { type: 'h4', children: [{ text: '小节' }] },
    { type: 'code_block', children: ['opkg update', 'opkg install curl'].map(text => ({ type: 'code_line', children: [{ text }] })) },
    { type: 'table', children: [{ type: 'tr', children: [{ type: 'td', children: [{ type: 'p', children: [{ text: '256MB' }] }] }] }] },
  ];
  const html = renderToStaticMarkup(<>{values.map((value, index) => <SlatePostBlock key={index} blockId={`block-${index}`} value={value} />)}</>);
  expect(html).toContain('<h4 id="block-0"');
  expect(html).toContain('<code>opkg update\nopkg install curl</code>');
  expect(html).toContain('<table><tbody><tr><td>');
  expect(html).toContain('256MB');
});

test('editing a migrated article retains links, marks, lists, code and images', () => {
  const fixtures = [
    [{ _type: 'block', listItem: 'bullet', markDefs: [{ _key: 'ref', href: 'https://example.com' }] }, { type: 'normal', children: [{ text: '原文链接', marks: ['strong', 'ref'] }] }],
    [{ _type: 'code', code: 'first\nsecond', language: 'sh' }, { type: 'code', children: [{ text: '' }] }],
    [{ _type: 'image', asset: { _ref: 'image-abcdef-1600x900-png' }, alt: '配图' }, { type: 'image', children: [{ text: '' }] }],
  ];
  const post = { blocks: fixtures.map(([portableTextJson, slateJson], i) => ({ portableTextJson, slateJson: { ...slateJson, id: `old-${i}` } })) } as unknown as PostDetail;
  const values = postToEditorValue(post);
  const html = renderToStaticMarkup(<>{values.map((value, i) => <SlatePostBlock key={i} blockId={value.blockId ?? `block-${i}`} value={value} />)}</>);
  expect(values.map(value => value.blockId)).toEqual(['old-0', 'old-1', 'old-2']);
  expect(html).toContain('<ul');
  expect(html).toContain('href="https://example.com"');
  expect(html).toContain('<strong>原文链接</strong>');
  expect(html).toContain('first\nsecond');
  expect(html).toContain('https://cdn.sanity.io/images/gynhwdlh/production/abcdef-1600x900.png');
  expect(html).toContain('alt="配图"');
  const reloaded = postToEditorValue({ blocks: values.map(slateJson => ({ slateJson, portableTextJson: { _type: 'slate' } })) } as unknown as PostDetail);
  expect(reloaded[0].children).toEqual(values[0].children);
});

test('wide imported tables keep all columns and expose horizontal scrolling guidance', () => {
  const table = (columns: number) => ({ type: 'table', children: [
    { type: 'tr', children: Array.from({ length: columns }, (_, i) => ({ type: 'th', children: [{ text: `第${i + 1}列` }] })) },
    { type: 'tr', children: Array.from({ length: columns }, (_, i) => ({ type: 'td', children: [{ text: `内容${i + 1}` }] })) },
  ] });
  const wide = renderToStaticMarkup(<SlatePostBlock blockId='wide' value={table(3)} />);
  expect(wide).toContain('data-wide="true"');
  expect(wide).toContain('左右滑动查看完整表格');
  expect(wide).toContain('<th scope="col">第3列</th>');
  expect(wide).toContain('<td>内容3</td>');
  const compact = renderToStaticMarkup(<SlatePostBlock blockId='compact' value={table(2)} />);
  expect(compact).not.toContain('data-wide');
  expect(compact).not.toContain('左右滑动查看完整表格');
});
