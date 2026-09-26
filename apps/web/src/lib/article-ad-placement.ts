type ArticleBlock = { plainText?: string | null; portableTextJson?: unknown; slateJson?: unknown };
type TextNode = { _type?: string; type?: string; style?: string; listItem?: string; listStyleType?: string; text?: string; children?: TextNode[] };

function textContent(node: TextNode): string {
  return typeof node.text === 'string' ? node.text : node.children?.map(textContent).join('') ?? '';
}

/** Count prose paragraphs, excluding empty blocks and paragraphs nested in lists or tables. */
export function articleAdIndex(blocks: ArticleBlock[]): number {
  let paragraphs = 0;
  return blocks.findIndex(block => {
    const portable = block.portableTextJson as TextNode | null;
    const slate = block.slateJson as TextNode | null;
    if (portable?._type === 'slate' && slate) {
      if (!['p', 'normal', undefined].includes(slate.type) || slate.listStyleType || !textContent(slate).trim()) return false;
    } else {
      if (portable?._type !== 'block' || !['normal', undefined].includes(portable.style) || portable.listItem) return false;
      if (!(block.plainText ?? textContent(portable)).trim()) return false;
    }
    paragraphs += 1;
    return paragraphs === 2;
  });
}
