import { createFileRoute, Navigate } from '@tanstack/react-router';

export const Route = createFileRoute('/blog/$slug')({
  component: BlogSlugRedirect,
});

function BlogSlugRedirect() {
  const { slug } = Route.useParams();
  return <Navigate to='/$slug' params={{ slug }} replace />;
}
