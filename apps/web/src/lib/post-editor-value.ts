import { withStableBlockIds, type EditorBlockNode } from '@meme/editor';
import type { PostDetail } from './admin-queries';
import type { RemoteEditorValue } from './remote-editor-widget';
import { legacyCode, legacyListFormats, type LegacyListFormat } from './legacy-post-format';

type Node = RemoteEditorValue[number];
type PortableBlock = {
  _type?: string; style?: string; listItem?: string; level?: number;
  markDefs?: { _key?: string; href?: string }[];
  asset?: { url?: string; _ref?: string }; alt?: string; caption?: string;
  code?: string; language?: string;
};

function restoreLegacyFormatting(node: Node, original: PortableBlock, listFormat?: LegacyListFormat): Node {
  if (original._type === 'slate') return node;
  if (original._type === 'image') {
    const match = /^image-([a-f0-9]+)-(\d+x\d+)-([a-z0-9]+)$/i.exec(original.asset?._ref ?? '');
    const url = original.asset?.url ?? (match ? `https://cdn.sanity.io/images/gynhwdlh/production/${match[1]}-${match[2]}.${match[3]}` : undefined);
    return url ? { ...node, type: 'img', url, alt: original.alt ?? '', caption: [{ text: original.caption ?? '' }], children: [{ text: '' }] } : node;
  }
  const code = legacyCode(original);
  if (code) {
    return { ...node, type: 'code_block', lang: code.language, children: code.code.split('\n').map(text => ({ type: 'code_line', children: [{ text }] })) };
  }
  if (original._type !== 'block') return node;
  const links = new Map(original.markDefs?.filter(def => def._key && def.href).map(def => [def._key, def.href]));
  const children = node.children?.map(child => {
    if (!Array.isArray(child.marks)) return child;
    const { marks, ...leaf } = child;
    for (const [mark, property] of [['strong', 'bold'], ['em', 'italic'], ['code', 'code'], ['underline', 'underline'], ['strike-through', 'strikethrough']]) {
      if (marks.includes(mark)) leaf[property] = true;
    }
    const href = marks.map(mark => links.get(String(mark))).find(Boolean);
    return href ? { type: 'a', url: href, children: [leaf] } : leaf;
  });
  return {
    ...node,
    type: node.type === 'normal' ? 'p' : node.type,
    ...(original.listItem ? { listStyleType: original.listItem === 'number' ? 'decimal' : 'disc', indent: listFormat?.level ?? 1, ...(listFormat?.start ? { listStart: listFormat.start } : {}) } : {}),
    children,
  };
}

export function postToEditorValue(post: PostDetail): RemoteEditorValue {
  const listFormats = legacyListFormats((post.blocks ?? []).map(block => block.portableTextJson));
  const fromBlocks = (post.blocks ?? []).flatMap((block, index) => {
    if (!block.slateJson || typeof block.slateJson !== 'object') return [];
    const node = { ...(block.slateJson as Node), portableTextJson: block.portableTextJson };
    return [restoreLegacyFormatting(node, (block.portableTextJson ?? {}) as PortableBlock, listFormats[index])];
  });
  const value = fromBlocks.length ? fromBlocks : Array.isArray(post.slateJson) ? post.slateJson : [];
  return withStableBlockIds(value as EditorBlockNode[]) as RemoteEditorValue;
}
