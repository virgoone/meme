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

export function setComments(comments: CommentDto[]) {
  blogPostState.comments = comments;
}

export function addComment(comment: CommentDto) {
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

export function parseDisplayName(info: CommentUserInfo): string {
  if (info.name?.trim()) return info.name.trim();
  const firstName = info.firstName ?? '';
  const lastName = info.lastName ?? '';
  if (firstName && lastName) {
    return firstName === lastName ? firstName : `${firstName} ${lastName}`;
  }
  return firstName || lastName || '匿名用户';
}

export function avatarUrl(info: CommentUserInfo): string {
  return info.imageUrl ?? info.image ?? '';
}
