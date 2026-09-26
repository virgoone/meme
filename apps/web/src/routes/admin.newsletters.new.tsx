import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { AdminContentSkeleton } from '../lib/page-skeletons';
import { useAdminBlogPosts } from '../lib/admin-queries';
import {
  newsletterRequest,
  type NewsletterOptions,
} from '../lib/newsletter-client';
import { NewsletterComposer } from '../lib/newsletter-composer';
import type { NewsletterCampaign } from '@meme/shared';

export const Route = createFileRoute('/admin/newsletters/new')({
  validateSearch: (search: Record<string, unknown>): { campaign?: string } => ({
    campaign: typeof search.campaign === 'string' ? search.campaign : undefined,
  }),
  component: NewNewsletterPage,
});

function NewNewsletterPage() {
  const { campaign } = Route.useSearch();
  const posts = useAdminBlogPosts();
  const options = useQuery({
    queryKey: ['admin', 'newsletter-options'],
    queryFn: () => newsletterRequest<NewsletterOptions>('/options'),
  });
  const saved = useQuery({
    queryKey: ['admin', 'newsletter-campaign', campaign],
    queryFn: () =>
      newsletterRequest<NewsletterCampaign>(`/campaign/${campaign}`),
    enabled: Boolean(campaign),
    retry: false,
  });
  const error = posts.error ?? options.error ?? (campaign ? saved.error : null);
  if (error)
    return (
      <p className='admin-error' role='alert'>
        {error.message}
      </p>
    );
  if (!posts.data || !options.data || (campaign && !saved.data))
    return <AdminContentSkeleton />;
  return (
    <NewsletterComposer
      key={campaign ?? 'new'}
      posts={posts.data}
      options={options.data}
      saved={saved.data}
    />
  );
}
