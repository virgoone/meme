import { proxy } from 'valtio';

export type CommentUserInfo = {
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  imageUrl?: string | null;
  image?: string | null;
};

export type CommentBody = {
  blockId?: string;
  text: string;
};

export type CommentDto = {
  id: string | number;
  postId?: string;
  userId: string;
  body: CommentBody;
  userInfo: CommentUserInfo;
  parentId?: number | string | null;
  createdAt: string | Date;
};

/** Kept for parity with the original naming. */
export type PostIDLessCommentDto = CommentDto;

export const blogPostState = proxy<{
  postId: string;
  currentBlockId: string | null;
  comments: CommentDto[];
  replyingTo: CommentDto | null;
}>({
  postId: '',
  currentBlockId: null,
  comments: [],
  replyingTo: null,
});

export function selectCommentPost(postId: string) {
  if (blogPostState.postId === postId) return;
  blogPostState.postId = postId;
  blogPostState.comments = [];
  blogPostState.currentBlockId = null;
  blogPostState.replyingTo = null;
}

export function setPostComments(postId: string, comments: CommentDto[]) {
  if (blogPostState.postId !== postId) return;
  blogPostState.comments = comments.map(comment => ({ ...comment, postId }));
}

export function addComment(comment: CommentDto) {
  if (comment.postId && comment.postId !== blogPostState.postId) return;
  if (blogPostState.comments.some((c) => String(c.id) === String(comment.id))) {
    return;
  }
  blogPostState.comments.push(comment);
}

export function replyTo(comment: CommentDto) {
  blogPostState.replyingTo = comment;
}

export function clearReply() {
  blogPostState.replyingTo = null;
}

export function focusBlock(blockId: string | null) {
  blogPostState.currentBlockId = blockId;
}

export function clearBlockFocus() {
  blogPostState.currentBlockId = null;
}

export function parseDisplayName(info: CommentUserInfo | null | undefined): string {
  if (!info) return '已登录用户';
  if (info.name?.trim()) return info.name.trim();
  const firstName = info.firstName ?? '';
  const lastName = info.lastName ?? '';
  if (firstName && lastName) {
    return firstName === lastName ? firstName : `${firstName} ${lastName}`;
  }
  return firstName || lastName || '已登录用户';
}

export function avatarUrl(info: CommentUserInfo | null | undefined): string {
  return info?.imageUrl || info?.image || '/avatars/avatar_1.png';
}
