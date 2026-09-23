import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/blog/$slug')({
  beforeLoad: ({ params }) => {
    throw redirect({ to: '/$slug', params, replace: true });
  },
});
