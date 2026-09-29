import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { ArticleCodeBlock } from '../src/lib/article-code-block';
import { SlatePostBlock } from '../src/lib/slate-post-block';

test.each([
  ['javascript', 'const message = "hello";', 'hljs-keyword'],
  [' TS ', 'const count: number = 42;', 'hljs-keyword'],
  ['jsx', 'const view = <button title="hello">Hi</button>;', 'hljs-tag'],
  ['tsx', 'const view = <button title="hello">Hi</button>;', 'hljs-tag'],
  ['sh', 'echo "$HOME"', 'article-code__shell-token'],
  ['json', '{"hello": true}', 'hljs-attr'],
  ['yaml', 'enabled: true', 'hljs-attr'],
  ['sql', 'SELECT * FROM posts;', 'hljs-keyword'],
])('highlights %s during server rendering', (language, code, token) => {
  const html = renderToStaticMarkup(<ArticleCodeBlock code={code} language={language} blockId='sample' />);
  expect(html).toContain(token);
  expect(html).toContain('data-block-id="sample"');
});

test('highlighting preserves whitespace and escapes HTML source', () => {
  const code = '<script>alert("hello")</script>\n\n  <img src=x onerror="alert(1)">\n';
  const html = renderToStaticMarkup(<ArticleCodeBlock code={code} language='html' />);
  const renderedCode = html.match(/<code>([\s\S]*?)<\/code>/)?.[1] ?? '';
  const source = renderedCode.replace(/<[^>]*>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&amp;/g, '&');
  expect(source).toBe(code);
  expect(html).not.toContain('<script>');
  expect(html).not.toContain('<img');
  expect(html).toContain('hljs-tag');
});

test.each([undefined, 'text', 'unknown-language'])('keeps %s code readable without guessing a language', language => {
  const html = renderToStaticMarkup(<ArticleCodeBlock code={'first\n  second\n'} language={language} />);
  expect(html).toContain('<code>first\n  second\n</code>');
  expect(html).not.toContain('hljs-');
});

test('saved Slate code blocks receive the same highlighting as imported code', () => {
  const html = renderToStaticMarkup(<SlatePostBlock blockId='slate-code' value={{
    type: 'code_block', lang: 'typescript', children: [{ type: 'code_line', children: [{ text: 'const count = 42;' }] }],
  }} />);
  expect(html).toContain('hljs-keyword');
  expect(html).toContain('hljs-number');
});

test.each(['bash', 'sh', 'zsh', 'shell', 'shellscript', ' language-BASH '])('colors CLI commands and options in %s', language => {
  const html = renderToStaticMarkup(<ArticleCodeBlock code={'claude mcp add --scope user --transport http figma https://mcp.figma.com/mcp\ncodex mcp get figma\nmy-custom-cli --config ./settings.json'} language={language} />);
  const styleFor = (value: string) => html.match(new RegExp(`style="([^"]+)">${value}</span>`))?.[1];
  const command = styleFor('claude');
  const flag = styleFor('--scope');
  const argument = styleFor('user');
  expect(command).toContain('--shell-light:');
  expect(command).toContain('--shell-dark:');
  expect(flag).toBeDefined();
  expect(argument).toBeDefined();
  expect(command).not.toBe(flag);
  expect(flag).not.toBe(argument);
  expect(styleFor('codex')).toBe(command);
  expect(styleFor('my-custom-cli')).toBe(command);
});

test('shell highlighting preserves multiline source, comments, heredocs and HTML-like strings', () => {
  const code = '# claude --scope user\r\nAPI_KEY="$TOKEN" custom-cli \\\r\n  --config ./config.json | tee out.txt\r\n\r\ncat <<\'EOF\'\r\n<script>alert("hello")</script>\r\nEOF\r\n';
  const html = renderToStaticMarkup(<ArticleCodeBlock code={code} language='bash' />);
  const markup = html.match(/<code>([\s\S]*?)<\/code>/)?.[1] ?? '';
  const source = markup.replace(/<[^>]*>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&amp;/g, '&');
  expect(source).toBe(code);
  expect(markup).not.toContain('<script>');
  expect(markup).toMatch(/>#[^<]*claude --scope user<\/span>/);
});
