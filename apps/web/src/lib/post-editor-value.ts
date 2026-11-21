import { postToEditorBlocks } from '@meme/editor';
import type { PostDetail } from './admin-queries';
import type { RemoteEditorValue } from './remote-editor-widget';

export function postToEditorValue(post: PostDetail): RemoteEditorValue {
  return postToEditorBlocks(post) as RemoteEditorValue;
}
