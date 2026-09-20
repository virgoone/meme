import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// ---- generic fetch helpers -------------------------------------------------------

async function fetchJson<T>(url: string): Promise<T> {
  const r = await fetch(url, { headers: { accept: 'application/json' } });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

async function putJson<T>(url: string, body: unknown): Promise<T> {
  const r = await fetch(url, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

async function patchJson<T>(url: string, body: unknown): Promise<T> {
  const r = await fetch(url, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

// ---- admin dashboard -------------------------------------------------------------

export function useAdminHealth() {
  return useQuery({
    queryKey: ['admin', 'health'],
    queryFn: () => fetchJson<HealthStatus>('/api/health'),
    staleTime: 60_000,
  });
}

export function useAdminComments() {
  return useQuery({
    queryKey: ['admin', 'comments'],
    queryFn: () => fetchJson<CommentRecord[]>('/api/admin/comments?limit=200'),
    staleTime: 30_000,
  });
}

export function useAdminSubscribers() {
  return useQuery({
    queryKey: ['admin', 'subscribers'],
    queryFn: () => fetchJson<Subscriber[]>('/api/admin/subscribers?limit=500'),
    staleTime: 30_000,
  });
}

export function useAdminGuestbook() {
  return useQuery({
    queryKey: ['admin', 'guestbook'],
    queryFn: () => fetchJson<GuestbookEntry[]>('/api/guestbook?limit=100'),
    staleTime: 30_000,
  });
}

// ---- content management ----------------------------------------------------------

export function useAdminBlogPosts() {
  return useQuery({
    queryKey: ['admin', 'blog-posts'],
    queryFn: () => fetchJson<BlogPost[]>('/api/posts?limit=200'),
    staleTime: 30_000,
  });
}

export function useAdminProjects() {
  return useQuery({
    queryKey: ['admin', 'projects'],
    queryFn: () => fetchJson<Project[]>('/api/projects?limit=200'),
    staleTime: 30_000,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: ProjectInput) =>
      postJson<Project>('/api/projects', values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'projects'] });
      void queryClient.invalidateQueries({ queryKey: ['public', 'projects'] });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, values }: { id: number; values: ProjectInput }) =>
      patchJson<Project>(`/api/projects/${id}`, values),
    onSuccess: (project) => {
      queryClient.setQueryData<Project[]>(['admin', 'projects'], (current) =>
        current?.map((item) => (item.id === project.id ? project : item)),
      );
      void queryClient.invalidateQueries({ queryKey: ['public', 'projects'] });
    },
  });
}

// ---- newsletters -----------------------------------------------------------------

export function useAdminNewsletters() {
  return useQuery({
    queryKey: ['admin', 'newsletters'],
    queryFn: () => fetchJson<Newsletter[]>('/api/admin/newsletters?limit=200'),
    staleTime: 30_000,
  });
}

// ---- settings --------------------------------------------------------------------

export function useAdminSettings() {
  return useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: () => fetchJson<Record<string, unknown>>('/api/admin/settings'),
    staleTime: 60_000,
  });
}

export function useUpdateAdminSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: Record<string, unknown>) =>
      putJson<Record<string, unknown>>('/api/admin/settings', values),
    onSuccess: (data) => {
      queryClient.setQueryData(['admin', 'settings'], data);
    },
  });
}

// ---- types (shared with pages) ---------------------------------------------------

export type HealthStatus = {
  ok: boolean;
  runtime: string;
  database: string;
  cache: string;
  storage: string;
  appEnv: string;
};

export type CommentRecord = {
  id: number;
  userId: string;
  userInfo: {
    firstName?: string | null;
    lastName?: string | null;
    imageUrl?: string | null;
  } | null;
  postId: string;
  parentId: number | null;
  body: unknown;
  createdAt: string | null;
};

export type PostSummary = {
  id: string;
  sanityId?: string | null;
  slug: string;
  title: string;
};

export type Subscriber = {
  id: number;
  email: string | null;
  subscribedAt: string | null;
  unsubscribedAt: string | null;
  updatedAt: string | null;
};

export type GuestbookEntry = {
  id: number;
};

export type BlogPost = {
  id: string;
  sanityId: string;
  title: string;
  slug: string;
  description: string | null;
  mood: 'happy' | 'sad' | 'neutral' | null;
  readingTime: number | null;
  publishedAt: string | null;
  coverImageUrl: string | null;
};

export type Project = {
  id: number;
  name: string;
  url: string;
  icon: string;
  description: string;
  createdAt: string | null;
};

export type ProjectInput = {
  name: string;
  url: string;
  icon: string;
  description: string;
};

export type Newsletter = {
  id: number;
  subject: string | null;
  body: string | null;
  sentAt: string | null;
  createdAt: string | null;
};

// ---- site stats (footer) ---------------------------------------------------------

export type SiteStats = {
  totalPageViews: number;
  subscriberCount: number;
  lastVisitor: {
    country: string;
    city?: string;
    flag: string;
  };
};

export function useSiteStats() {
  return useQuery({
    queryKey: ['public', 'site-stats'],
    queryFn: () => fetchJson<SiteStats>('/api/site-stats'),
    staleTime: 5 * 60_000,
  });
}

// ---- public page hooks -----------------------------------------------------------

export type PostCardItem = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  mood: 'happy' | 'sad' | 'neutral' | null;
  readingTime: number | null;
  publishedAt: string | null;
  coverImageUrl: string | null;
  mainImageUrl?: string | null;
};

export function useHomePosts() {
  return useQuery({
    queryKey: ['public', 'posts', { limit: 5 }],
    queryFn: () => fetchJson<PostCardItem[]>('/api/posts?limit=5'),
    staleTime: 60_000,
  });
}

export function useBlogPosts() {
  return useQuery({
    queryKey: ['public', 'posts', { limit: 20 }],
    queryFn: () => fetchJson<PostCardItem[]>('/api/posts?limit=20'),
    staleTime: 60_000,
  });
}

export function usePublicProjects() {
  return useQuery({
    queryKey: ['public', 'projects'],
    queryFn: () => fetchJson<PublicProject[]>('/api/projects?limit=200'),
    staleTime: 3 * 60_000,
  });
}

export type PublicProject = {
  id: number;
  name: string;
  url: string;
  icon: string;
  description: string;
  createdAt: string | null;
};

export function usePublicGuestbook() {
  return useQuery({
    queryKey: ['public', 'guestbook'],
    queryFn: () => fetchJson<PublicGuestbookEntry[]>('/api/guestbook?limit=50'),
    staleTime: 30_000,
  });
}

export type PublicGuestbookEntry = {
  id: number | string;
  userId: string;
  userInfo: GuestbookUserInfo | null;
  message: string;
  createdAt: string | null;
};

type GuestbookUserInfo = {
  firstName?: string | null;
  lastName?: string | null;
  imageUrl?: string | null;
  username?: string | null;
  name?: string | null;
};

export function useNewsletter(id: string) {
  return useQuery({
    queryKey: ['public', 'newsletter', id],
    queryFn: () => fetchJson<NewsletterDetail>(`/api/newsletters/${encodeURIComponent(id)}`),
    staleTime: 5 * 60_000,
    enabled: !!id,
  });
}

export type NewsletterDetail = {
  id: number;
  subject: string | null;
  body: string | null;
  sentAt: string | null;
  createdAt: string | null;
};

export function useConfirmation(token: string) {
  return useQuery({
    queryKey: ['public', 'confirmation', token],
    queryFn: () => fetchJson<ConfirmationResult>(`/api/newsletter/confirm?token=${encodeURIComponent(token)}`),
    enabled: !!token,
  });
}

export type ConfirmationResult = { status: 'success' };

export function usePostComments(postId: string) {
  return useQuery({
    queryKey: ['public', 'comments', postId],
    queryFn: () => fetchJson<CommentDto[]>(`/api/comments/${encodeURIComponent(postId)}`),
    staleTime: 30_000,
    enabled: !!postId,
  });
}

export type CommentDto = {
  id: number | string;
  userId: string;
  userInfo: GuestbookUserInfo | null;
  postId?: string;
  parentId?: number | null;
  body?: unknown;
  message?: string;
  createdAt: string | null;
};

export function usePostReactions(postId: string) {
  return useQuery({
    queryKey: ['public', 'reactions', postId],
    queryFn: () => fetchJson<number[]>(`/api/reactions?id=${encodeURIComponent(postId)}`),
    staleTime: 10_000,
    enabled: !!postId,
  });
}

// ---- admin editor (single-post load + save) --------------------------------------

export type PostDetail = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  mood: 'happy' | 'sad' | 'neutral' | null;
  readingTime: number | null;
  publishedAt: string | null;
  coverImageUrl: string | null;
  mainImageUrl?: string | null;
  blocks?: Array<{
    blockId: string;
    sortIndex?: number;
    type?: string;
    plainText?: string | null;
    portableTextJson?: unknown;
    slateJson?: unknown;
  }>;
  slateJson?: unknown;
};

export function usePost(slug: string) {
  return useQuery({
    queryKey: ['admin', 'post', slug],
    queryFn: () => fetchJson<PostDetail>(`/api/posts/${encodeURIComponent(slug)}`),
    staleTime: 2 * 60_000,
    enabled: !!slug,
  });
}
