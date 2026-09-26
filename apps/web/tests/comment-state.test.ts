import { beforeEach, expect, test } from 'bun:test';
import { addComment, avatarUrl, blogPostState, focusBlock, parseDisplayName, replyTo, selectCommentPost, setPostComments, type CommentDto } from '../src/lib/blog-post-state';
const comment: CommentDto = { id: 5, postId: 'a', userId: 'reader', userInfo: { firstName: 'Old', lastName: 'Reader' }, body: { blockId: 'same-block', text: 'Comment A' }, createdAt: '2025-01-01' };
beforeEach(() => { selectCommentPost(''); selectCommentPost('a'); });
test('switching articles clears old comments, open popovers and reply targets', () => {
  setPostComments('a', [comment]); focusBlock('same-block'); replyTo(comment);
  selectCommentPost('b');
  expect(blogPostState.comments).toHaveLength(0);
  expect(blogPostState.currentBlockId).toBeNull();
  expect(blogPostState.replyingTo).toBeNull();
  setPostComments('a', [comment]); addComment(comment);
  expect(blogPostState.comments).toHaveLength(0);
});
test('returning to an article restores its query data and deduplicates new submissions', () => {
  setPostComments('a', [comment]); addComment(comment);
  expect(blogPostState.comments).toHaveLength(1);
  selectCommentPost('b'); selectCommentPost('a'); setPostComments('a', [comment]);
  expect(blogPostState.comments[0].body.text).toBe('Comment A');
});
test('legacy names and missing avatars retain a usable comment entry', () => {
  expect(parseDisplayName(comment.userInfo)).toBe('Old Reader');
  expect(parseDisplayName({ firstName: 'Reader', lastName: 'Reader' })).toBe('Reader');
  expect(parseDisplayName(null)).toBe('已登录用户');
  expect(avatarUrl({})).toBe('/avatars/avatar_1.png');
});
