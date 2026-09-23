import { createFileRoute } from '@tanstack/react-router';
import { usePublicProjects } from '../lib/admin-queries';
import { Skeleton } from '@bunship-ai/ui/components/skeleton';

export const Route = createFileRoute('/projects')({ component: ProjectsPage });

function ProjectsPage() {
  const projects = usePublicProjects();

  return (
    <section className='content-page'>
      <header className='page-heading'>
        <p className='section-kicker'>Projects</p>
        <h1>项目</h1>
        <p>一些在线小工具、实验项目和持续维护的作品。</p>
      </header>
      {projects.isPending && (
        <div className='project-list' role='status' aria-label='项目加载中'>
          {Array.from({ length: 4 }).map((_, i) => (
            <div className='project-card' key={i}>
              <span className='project-icon'><Skeleton className='h-10 w-10 rounded-full' /></span>
              <span><Skeleton className='h-4 w-32' /><Skeleton className='h-3 w-48 mt-2' /></span>
            </div>
          ))}
        </div>
      )}
      {projects.isError && <p className='state-text state-text--error'>{projects.error instanceof Error ? projects.error.message : String(projects.error)}</p>}
      {projects.data && projects.data.length === 0 && <p className='state-text'>还没有导入项目。</p>}
      {projects.data && projects.data.length > 0 && (
        <div className='project-list'>
          {projects.data.map((p) => (
            <a className='project-card' href={p.url} target='_blank' rel='noreferrer' key={p.id}>
              <span className='project-icon'>{isImageUrl(p.icon) ? <img src={p.icon} alt='' loading='lazy' /> : p.icon}</span>
              <span><strong>{p.name}</strong><small>{p.description}</small></span>
            </a>
          ))}
        </div>
      )}
    </section>
  );
}

function isImageUrl(v: string) { return /^https?:\/\/.+\.(png|jpe?g|webp|gif|svg)(\?.*)?$/i.test(v); }
