import { type EditorBlockNode, getBlockId } from '@meme/editor';

/**
 * Block-level edits for MCP clients. Every operation addresses a block by its
 * stable ID; blocks no operation names are passed through untouched, so their
 * marks, links, image width/alignment and comment anchors survive the save.
 */
export type BlockOperation =
  | { op: 'set_text'; blockId: string; text: string }
  | { op: 'set_attributes'; blockId: string; attributes: Record<string, unknown> }
  | { op: 'replace_block'; blockId: string; block: EditorBlockNode }
  | { op: 'insert_after'; afterBlockId: string | null; block: EditorBlockNode }
  | { op: 'delete_block'; blockId: string };

export class BlockOperationError extends Error {}

const MAX_OPERATIONS = 200;
const ID_KEYS = ['id', 'blockId', 'blockID'] as const;

export function parseOperations(value: unknown): BlockOperation[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new BlockOperationError('operations must be an array');
  if (value.length > MAX_OPERATIONS) throw new BlockOperationError(`at most ${MAX_OPERATIONS} operations per call`);
  return value.map((raw, index) => {
    const entry = raw as Record<string, unknown> | null;
    const where = `operations[${index}]`;
    if (!entry || typeof entry !== 'object') throw new BlockOperationError(`${where} must be an object`);
    switch (entry.op) {
      case 'set_text':
        return { op: 'set_text', blockId: requireString(entry.blockId, `${where}.blockId`), text: requireText(entry.text, `${where}.text`) };
      case 'set_attributes': {
        const attributes = entry.attributes as Record<string, unknown> | null;
        if (!attributes || typeof attributes !== 'object' || Array.isArray(attributes)) throw new BlockOperationError(`${where}.attributes must be an object`);
        const reserved = Object.keys(attributes).filter((key) => key === 'children' || key === 'type' || (ID_KEYS as readonly string[]).includes(key));
        if (reserved.length) throw new BlockOperationError(`${where}.attributes cannot change ${reserved.join(', ')}; use replace_block`);
        return { op: 'set_attributes', blockId: requireString(entry.blockId, `${where}.blockId`), attributes };
      }
      case 'replace_block':
        return { op: 'replace_block', blockId: requireString(entry.blockId, `${where}.blockId`), block: requireNode(entry.block, `${where}.block`) };
      case 'insert_after':
        if (entry.afterBlockId !== null && typeof entry.afterBlockId !== 'string') throw new BlockOperationError(`${where}.afterBlockId must be a block ID or null`);
        return { op: 'insert_after', afterBlockId: entry.afterBlockId as string | null, block: requireNode(entry.block, `${where}.block`) };
      case 'delete_block':
        return { op: 'delete_block', blockId: requireString(entry.blockId, `${where}.blockId`) };
      default:
        throw new BlockOperationError(`${where}.op must be set_text, set_attributes, replace_block, insert_after or delete_block`);
    }
  });
}

export function applyBlockOperations(blocks: EditorBlockNode[], operations: BlockOperation[], options?: { idSeed?: string }) {
  const next = [...blocks];
  const changed = new Set<string>();
  const used = new Set(next.map((block) => getBlockId(block)).filter((id): id is string => !!id));
  const indexOf = (blockId: string) => {
    const index = next.findIndex((block) => getBlockId(block) === blockId);
    if (index < 0) throw new BlockOperationError(`block ${blockId} does not exist`);
    return index;
  };

  for (const operation of operations) {
    switch (operation.op) {
      case 'set_text': {
        const index = indexOf(operation.blockId);
        next[index] = setBlockText(next[index] as EditorBlockNode, operation.text);
        changed.add(operation.blockId);
        break;
      }
      case 'set_attributes': {
        const index = indexOf(operation.blockId);
        const block: EditorBlockNode = { ...(next[index] as EditorBlockNode) };
        // null removes an attribute (e.g. clears an image width back to the default).
        for (const [key, value] of Object.entries(operation.attributes)) {
          if (value === null) delete block[key];
          else block[key] = value;
        }
        next[index] = block;
        changed.add(operation.blockId);
        break;
      }
      case 'replace_block': {
        const index = indexOf(operation.blockId);
        next[index] = withBlockId(operation.block, operation.blockId);
        changed.add(operation.blockId);
        break;
      }
      case 'insert_after': {
        const index = operation.afterBlockId === null ? -1 : indexOf(operation.afterBlockId);
        let id = getBlockId(operation.block);
        if (!id || used.has(id)) id = newBlockId(used, options?.idSeed ? `${options.idSeed}:${operations.indexOf(operation)}` : undefined);
        used.add(id);
        next.splice(index + 1, 0, withBlockId(operation.block, id));
        changed.add(id);
        break;
      }
      case 'delete_block': {
        next.splice(indexOf(operation.blockId), 1);
        used.delete(operation.blockId);
        changed.add(operation.blockId);
        break;
      }
    }
  }
  return { blocks: next, changed: [...changed] };
}

/**
 * Replaces a text block's content. Inline marks of a single-leaf block are kept
 * (bold stays bold); blocks with links, inline elements or nested structure must
 * use replace_block so nothing is flattened by accident.
 */
function setBlockText(block: EditorBlockNode, text: string): EditorBlockNode {
  const children = Array.isArray(block.children) ? block.children : [];
  const leaves = children.every((child) => child && typeof child === 'object' && typeof child.text === 'string' && !('children' in child));
  if (!leaves) {
    throw new BlockOperationError(`block ${getBlockId(block)} contains links or nested nodes; use replace_block with the full Slate node`);
  }
  if (block.type === 'img' || block.type === 'image' || block.type === 'code_block') {
    throw new BlockOperationError(`block ${getBlockId(block)} is ${block.type}; use replace_block`);
  }
  const first = children[0] ?? { text: '' };
  const marks = children.length === 1 ? first : { text: '' };
  return { ...block, children: [{ ...marks, text }] };
}

function withBlockId(block: EditorBlockNode, blockId: string): EditorBlockNode {
  const copy: EditorBlockNode = { ...block };
  for (const key of ID_KEYS) delete copy[key];
  return { ...copy, id: blockId, blockId, blockID: blockId };
}

/** A random ID, or one derived from `seed` so a retried request inserts the same IDs. */
function newBlockId(used: Set<string>, seed?: string) {
  let id = seed ? `block_${seededHash(seed)}` : '';
  while (!id || used.has(id)) id = seed && !id ? `block_${seededHash(seed)}` : `block_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
  return id;
}

function seededHash(seed: string) {
  let a = 0x811c9dc5;
  let b = 0x01000193;
  for (let index = 0; index < seed.length; index += 1) {
    a = Math.imul(a ^ seed.charCodeAt(index), 0x01000193);
    b = Math.imul(b ^ seed.charCodeAt(index), 0x5bd1e995);
  }
  return `${(a >>> 0).toString(16).padStart(8, '0')}${(b >>> 0).toString(16).padStart(8, '0')}`.slice(0, 12);
}

function requireString(value: unknown, field: string) {
  if (typeof value !== 'string' || !value) throw new BlockOperationError(`${field} must be a non-empty string`);
  return value;
}

function requireText(value: unknown, field: string) {
  if (typeof value !== 'string') throw new BlockOperationError(`${field} must be a string`);
  if (value.length > 100_000) throw new BlockOperationError(`${field} is too long`);
  return value;
}

function requireNode(value: unknown, field: string): EditorBlockNode {
  const node = value as EditorBlockNode | null;
  if (!node || typeof node !== 'object' || Array.isArray(node) || !Array.isArray(node.children) || typeof node.type !== 'string') {
    throw new BlockOperationError(`${field} must be a Slate element with a string "type" and a "children" array`);
  }
  return node;
}

/** Plain text of a node, joining nested blocks (list items, code lines) with newlines. */
export function nodeText(node: unknown): string {
  if (!node || typeof node !== 'object') return '';
  const value = node as { text?: unknown; children?: unknown[]; type?: unknown };
  if (typeof value.text === 'string') return value.text;
  if (!Array.isArray(value.children)) return '';
  const inline = value.children.every((child) => child && typeof child === 'object' && ('text' in (child as object) || (child as { type?: unknown }).type === 'a'));
  return value.children.map(nodeText).join(inline ? '' : '\n');
}

/** A readable Markdown rendering of the post, one block per paragraph. */
export function blocksToMarkdown(blocks: EditorBlockNode[]): string {
  return blocks.map(blockToMarkdown).filter((line) => line !== null).join('\n\n');
}

function blockToMarkdown(block: EditorBlockNode): string | null {
  const text = nodeText(block);
  const type = typeof block.type === 'string' ? block.type : 'p';
  const heading = /^h([1-6])$/.exec(type);
  if (heading) return `${'#'.repeat(Number(heading[1]))} ${text}`;
  if (type === 'blockquote') return text.split('\n').map((line) => `> ${line}`).join('\n');
  if (type === 'img' || type === 'image') {
    const url = typeof block.url === 'string' ? block.url : '';
    const alt = typeof block.alt === 'string' ? block.alt : '';
    return `![${alt}](${url})`;
  }
  if (type === 'code_block') return `\`\`\`${typeof block.lang === 'string' ? block.lang : ''}\n${text}\n\`\`\``;
  if (type === 'hr') return '---';
  if (block.listStyleType) {
    const indent = '  '.repeat(Math.max(0, Number(block.indent ?? 1) - 1));
    return `${indent}${block.listStyleType === 'decimal' ? `${Number(block.listStart ?? 1)}.` : '-'} ${text}`;
  }
  if (!text && type !== 'p') return `[${type}]`;
  return text;
}

/** Block attributes other than children and IDs; long strings (data URLs) are truncated. */
export function blockAttributes(block: EditorBlockNode): Record<string, unknown> {
  const attributes: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(block)) {
    if (key === 'children' || key === 'portableTextJson' || (ID_KEYS as readonly string[]).includes(key) || key === 'type') continue;
    attributes[key] = truncate(value);
  }
  return attributes;
}

function truncate(value: unknown, depth = 0): unknown {
  if (typeof value === 'string') return value.length > 300 ? `${value.slice(0, 300)}…(${value.length} chars)` : value;
  if (depth > 3) return Array.isArray(value) ? `[${value.length} items]` : typeof value === 'object' && value ? '{…}' : value;
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => truncate(item, depth + 1));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, truncate(item, depth + 1)]));
  return value;
}
