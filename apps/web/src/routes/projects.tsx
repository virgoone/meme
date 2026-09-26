import { createFileRoute } from '@tanstack/react-router';

import { publicProjectsQueryOptions, usePublicProjects } from '../lib/admin-queries';
import { AdBanner } from '../lib/adsense';
import { loadPublicQuery } from '../lib/route-query';
import { pageHead } from '../lib/seo';

export const Route = createFileRoute('/projects')({
  head: () => pageHead('独立开发项目', 'Koya 持续维护的在线工具与实验项目，涵盖 AI 应用、生产力工具和全栈开发实践。', '/projects'),
  loader: ({ context }) => loadPublicQuery(context.queryClient, publicProjectsQueryOptions()),
  component: ProjectsPage,
});

function ProjectsPage() {
  const projects = usePublicProjects();

  return (
    <section className='site-measure'>
      <header>
        <p className='site-kicker'><span>项目</span></p>
        <h1 className='site-title'>做过的一些东西</h1>
        <p className='site-lead'>在线小工具、实验项目和持续维护的作品。</p>
      </header>

      <div className='site-section'>
        {projects.isPending && (
          <ul className='site-rows site-skeleton-rows' role='status' aria-label='项目加载中'>
            {Array.from({ length: 4 }, (_, index) => (
              <li key={index} aria-hidden='true'>
                <span className='skeleton-line skeleton-line--title' />
                <span className='skeleton-line skeleton-line--text' />
              </li>
            ))}
          </ul>
        )}
        {projects.isError && (
          <p className='site-empty site-empty--error'>{projects.error instanceof Error ? projects.error.message : String(projects.error)}</p>
        )}
        {projects.data && projects.data.length === 0 && <p className='site-empty'>还没有项目。</p>}
        {projects.data && projects.data.length > 0 && (
          <ul className='site-rows'>
            {projects.data.map((project) => (
              <li key={project.id}>
                <a className='site-row site-row--project' href={project.url} target='_blank' rel='noreferrer'>
                  <span className='site-row__icon' aria-hidden='true'>
                    {isImageUrl(project.icon) ? <img src={project.icon} alt='' loading='lazy' /> : project.icon}
                  </span>
                  <h2 className='site-row__title'>{project.name}</h2>
                  <span className='site-row__meta'>
                    <span>{hostname(project.url)}</span>
                    <span className='site-row__arrow' aria-hidden='true'>↗</span>
                  </span>
                  {project.description ? <p className='site-row__desc'>{project.description}</p> : null}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
      {!!projects.data?.length && <AdBanner placement='projects' />}
    </section>
  );
}

function isImageUrl(value: string) {
  return /^https?:\/\/.+\.(png|jpe?g|webp|gif|svg)(\?.*)?$/i.test(value);
}

function hostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}
