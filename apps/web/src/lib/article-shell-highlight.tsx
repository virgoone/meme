import type { CSSProperties, ReactNode } from 'react';
import { createHighlighterCoreSync } from 'shiki/core';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';
import shellscript from 'shiki/langs/shellscript.mjs';
import light from 'shiki/themes/github-light-default.mjs';
import dark from 'shiki/themes/github-dark-default.mjs';

let highlighter: ReturnType<typeof createHighlighterCoreSync> | undefined;

/** The shell grammar recognizes arbitrary CLI commands, flags and arguments. */
export function highlightShell(code: string): ReactNode[] {
  highlighter ??= createHighlighterCoreSync({
    langs: [shellscript],
    themes: [light, dark],
    engine: createJavaScriptRegexEngine(),
  });
  const lines = highlighter.codeToTokensWithThemes(code, {
    lang: 'shellscript',
    themes: { light: 'github-light-default', dark: 'github-dark-default' },
  });
  const nodes: ReactNode[] = [];
  let cursor = 0;
  for (const token of lines.flat()) {
    // Slice gaps from the source so CRLF, blank lines and trailing newlines survive.
    if (token.offset > cursor) nodes.push(code.slice(cursor, token.offset));
    if (token.content) nodes.push(
      <span key={token.offset} className='article-code__shell-token' style={{
        '--shell-light': token.variants.light.color,
        '--shell-dark': token.variants.dark.color,
      } as CSSProperties}>{token.content}</span>,
    );
    cursor = token.offset + token.content.length;
  }
  if (cursor < code.length) nodes.push(code.slice(cursor));
  return nodes;
}
