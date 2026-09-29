type ArticleBlock = { plainText?: string | null; portableTextJson?: unknown; slateJson?: unknown };
type TextNode = { _type?: string; type?: string; style?: string; listItem?: string; listStyleType?: string; text?: string; children?: TextNode[] };

function textContent(node: TextNode): string {
  return typeof node.text === 'string' ? node.text : node.children?.map(textContent).join('') ?? '';
}

/** Two inline ads plus the footer ad, after prose paragraphs 2 and 7. */
export function articleAdIndexes(blocks: ArticleBlock[]): number[] {
  const indexes: number[] = [];
  let paragraphs = 0;
  for (const [index, block] of blocks.entries()) {
    const portable = block.portableTextJson as TextNode | null;
    const slate = block.slateJson as TextNode | null;
    if (portable?._type === 'slate' && slate) {
      if (!['p', 'normal', undefined].includes(slate.type) || slate.listStyleType || !textContent(slate).trim()) continue;
    } else {
      if (portable?._type !== 'block' || !['normal', undefined].includes(portable.style) || portable.listItem) continue;
      if (!(block.plainText ?? textContent(portable)).trim()) continue;
    }
    paragraphs += 1;
    if (paragraphs === 2 || paragraphs === 7) indexes.push(index);
    if (indexes.length === 2) break;
  }
  return indexes;
}
