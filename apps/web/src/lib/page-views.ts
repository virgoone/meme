import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { PostCardItem, SiteStats } from './admin-queries';
import type { PostPage } from '@meme/shared';

type Visit = { counted: boolean; totalPageViews?: number; postId?: string; views?: number };
let lastVisit: { path: string; promise: Promise<Visit> } | undefined;

export function usePageViewTracking(path: string, page = 1) {
  const queryClient = useQueryClient();
  useEffect(() => {
    if (path.startsWith('/admin') || path === '/login') { lastVisit = undefined; return; }
    const visitKey = path === '/blog' && page > 1 ? `${path}?page=${page}` : path;
    // Reuse the in-flight request across StrictMode/effect remounts. Hash-only
    // navigation does not change path; leaving and returning is a new visit.
    if (lastVisit?.path !== visitKey) {
      lastVisit = { path: visitKey, promise: fetch('/api/page-views', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        credentials: 'omit',
        body: JSON.stringify({ path }),
      }).then(async response => {
        if (!response.ok) throw new Error('统计暂不可用');
        return response.json() as Promise<Visit>;
      }) };
    }
    void lastVisit.promise.then(visit => {
      if (!visit.counted) return;
      queryClient.setQueryData<SiteStats>(['public', 'site-stats'], previous => previous ? { ...previous, totalPageViews: visit.totalPageViews ?? previous.totalPageViews } : previous);
      void queryClient.invalidateQueries({ queryKey: ['public', 'site-stats'] });
      if (visit.postId) {
        queryClient.setQueriesData<PostCardItem[] | PostPage<PostCardItem>>({ queryKey: ['public', 'posts'] }, posts => {
          const update = (post: PostCardItem) => post.id === visit.postId ? { ...post, views: visit.views } : post;
          return !posts ? posts : Array.isArray(posts) ? posts.map(update) : { ...posts, items: posts.items.map(update) };
        });
        queryClient.setQueryData(['public', 'post-views', visit.postId], { views: visit.views });
        void queryClient.invalidateQueries({ queryKey: ['public', 'post-views', visit.postId] });
      }
    }).catch(() => { /* Counts must not interrupt reading. */ });
  }, [path, queryClient, page]);
}

export function usePostViews(id: string, slug: string) {
  return useQuery<{ views: number }>({
    queryKey: ['public', 'post-views', id],
    queryFn: async () => {
      const response = await fetch(`/api/posts/${encodeURIComponent(slug)}/views`);
      if (!response.ok) throw new Error('统计暂不可用');
      return response.json();
    },
    staleTime: 30_000,
  });
}
