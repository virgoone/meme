import { createFileRoute } from '@tanstack/react-router';
import { useConfirmation } from '../lib/admin-queries';
import { Skeleton } from '@bunship-ai/ui/components/skeleton';

export const Route = createFileRoute('/confirm/$token')({ component: ConfirmSubscriptionPage });

function ConfirmSubscriptionPage() {
  const { token } = Route.useParams();
  const c = useConfirmation(token);

  return (
    <section className='page'>
      <header className='page-header'><h1>Newsletter Confirmation</h1><p>Subscription confirmation status from the Cloudflare Worker API.</p></header>
      <div className='panel'>
        {c.isLoading && (<div style={{ padding: 20, textAlign: 'center' }}><Skeleton className='h-4 w-48 mx-auto' /></div>)}
        {c.isError && <p className='error'>{c.error instanceof Error ? c.error.message : String(c.error)}</p>}
        {c.data && <p className='success-text'>Subscription confirmed.</p>}
      </div>
    </section>
  );
}
