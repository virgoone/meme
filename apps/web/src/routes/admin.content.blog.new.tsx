import { createFileRoute } from '@tanstack/react-router';
import { AdminBlogEditorPage } from './admin.content.blog.$slug';

export const Route = createFileRoute('/admin/content/blog/new')({
  component: () => <AdminBlogEditorPage />,
});
