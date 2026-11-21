import { displayImageUrl } from './media-url';
import { postToEditorBlocks } from '@meme/editor';
import type { PostDetail } from './admin-queries';
import type { RemoteEditorValue } from './remote-editor-widget';

export function postToEditorValue(post: PostDetail): RemoteEditorValue {
  const blocks = postToEditorBlocks(post) as RemoteEditorValue;
  return blocks.map(block =>
    (block.type === 'img' || block.type === 'image') && typeof block.url === 'string'
      ? { ...block, url: displayImageUrl(block.url) }
      : block,
  );
}
