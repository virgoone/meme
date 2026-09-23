import { createFileRoute } from '@tanstack/react-router';
import { useNewsletter } from '../lib/admin-queries';
import { Skeleton } from '@bunship-ai/ui/components/skeleton';

export const Route = createFileRoute('/newsletters/$id')({ component: NewsletterPage });

function NewsletterPage() {
  const { id } = Route.useParams();
  const nl = useNewsletter(id);

  return (
    <article className='page post-page'>
      {nl.isLoading && (<div className='panel' style={{ padding: 40, textAlign: 'center' }}><Skeleton className='h-8 w-64 mx-auto' /><Skeleton className='h-4 w-32 mx-auto mt-4' /><Skeleton className='h-32 w-full mt-6' /></div>)}
      {nl.isError && <p className='error'>{nl.error instanceof Error ? nl.error.message : String(nl.error)}</p>}
      {nl.data && (<>
        <header className='page-header post-header'><h1>{nl.data.subject ?? `Newsletter #${nl.data.id}`}</h1><div className='meta-row'><span>{nl.data.sentAt?.slice(0,10) ?? nl.data.createdAt?.slice(0,10) ?? 'Unsent'}</span></div></header>
        <div className='panel post-body'><section className='content-block'><p>{nl.data.body ?? 'No body content.'}</p></section></div>
      </>)}
    </article>
  );
}
