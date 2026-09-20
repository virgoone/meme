export type EditorTextNode = {
  text: string;
  [key: string]: unknown;
};

export type EditorBlockNode = {
  id?: string;
  blockId?: string;
  blockID?: string;
  type?: string;
  children?: EditorTextNode[];
  [key: string]: unknown;
};

export function deterministicBlockId(
  block: EditorBlockNode,
  index: number,
): string {
  const input = `${index}:${JSON.stringify(block)}`;
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return `block_${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

export function getBlockId(block: EditorBlockNode): string | null {
  if (typeof block.blockId === 'string' && block.blockId.length > 0) {
    return block.blockId;
  }
  if (typeof block.blockID === 'string' && block.blockID.length > 0) {
    return block.blockID;
  }
  if (typeof block.id === 'string' && block.id.length > 0) {
    return block.id;
  }
  return null;
}

export function withStableBlockIds(
  blocks: EditorBlockNode[],
): EditorBlockNode[] {
  return blocks.map((block, index) => {
    const blockId = getBlockId(block) ?? deterministicBlockId(block, index);
    return {
      ...block,
      id: blockId,
      blockId,
      blockID: blockId,
    };
  });
}

export function splitBlockWithNewId(
  block: EditorBlockNode,
  nextBlock: EditorBlockNode,
): [EditorBlockNode, EditorBlockNode] {
  const currentId = getBlockId(block) ?? deterministicBlockId(block, 0);
  const nextId = deterministicBlockId(
    {
      ...nextBlock,
      id: undefined,
      blockId: undefined,
    },
    1,
  );

  return [
    {
      ...block,
      id: currentId,
      blockId: currentId,
      blockID: currentId,
    },
    {
      ...nextBlock,
      id: nextId,
      blockId: nextId,
      blockID: nextId,
    },
  ];
}

export function blockPlainText(block: EditorBlockNode): string {
  if (!Array.isArray(block.children)) return '';
  return block.children
    .map((child) => (typeof child.text === 'string' ? child.text : ''))
    .join('');
}

export function serializeBlocksWithBlockIds(blocks: EditorBlockNode[]): string {
  return withStableBlockIds(blocks)
    .map((block) => {
      const blockId = getBlockId(block);
      return `<block id="${blockId}">${blockPlainText(block)}</block>`;
    })
    .join('\n');
}
