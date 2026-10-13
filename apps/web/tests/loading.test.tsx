import { describe, expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { imageDimensions, LoadingImage } from '../src/lib/loading-image';
import { BlogPostPageSkeleton, PageSkeleton } from '../src/lib/page-skeletons';

describe('loading image', () => {
  test('reserves the Sanity image aspect ratio before downloading', () => {
    const html = renderToStaticMarkup(<LoadingImage src='https://cdn.sanity.io/images/project/production/abc-1549x199.png?auto=format' alt='Article image' />);
    expect(html).toContain('aspect-ratio:1549 / 199');
    expect(html).toContain('width="1549"');
    expect(html).toContain('height="199"');
    expect(html).toContain('data-state="loading"');
    expect(html).toContain('class="image-skeleton"');
    expect(html).toContain('loading="lazy"');
  });

  test('reserves the original panoramic cover ratio rather than a cropped 16:9 frame', () => {
    const html = renderToStaticMarkup(<LoadingImage src='/cover-1549x199.png' alt='Cover' loading='eager' />);
    expect(html).toContain('loading="eager"');
    expect(html).toContain('aspect-ratio:1549 / 199');
    expect(html).toContain('width="1549"');
    expect(html).toContain('height="199"');
    expect(html).toContain('aria-busy="true"');
  });

  test('reserves the full height of a portrait screenshot', () => {
    const html = renderToStaticMarkup(<LoadingImage src='/screenshot-447x937.png' alt='设置步骤' />);
    expect(html).toContain('aspect-ratio:447 / 937');
    expect(html).toContain('width="447"');
    expect(html).toContain('height="937"');
  });

  test('reserves a fallback ratio for images without metadata', () => {
    expect(renderToStaticMarkup(<LoadingImage src='/upload.png' alt='' />)).toContain('aspect-ratio:16 / 9');
  });

  test.each(['/photo.png', '/photo-0x100.png', '/photo-100x0.png'])('ignores invalid dimensions in %s', (src) => {
    expect(imageDimensions(src)).toBeUndefined();
  });
});

describe('page loading surfaces', () => {
  test.each(['/', '/blog', '/projects', '/guestbook', '/login', '/newsletters/1', '/confirm/token', '/admin', '/admin/settings', '/admin/content/blog/test'])(
    '%s has nonempty accessible pending markup', (pathname) => {
      const html = renderToStaticMarkup(<PageSkeleton pathname={pathname} />);
      expect(html).toContain('role="status"');
      expect(html).toContain('skeleton');
    },
  );
  test.each(['/test-article', '/blog/test-article'])('%s uses article-sized placeholders', (pathname) => {
    expect(renderToStaticMarkup(<PageSkeleton pathname={pathname} />)).toContain('legacy-article-skeleton__cover');
  });
  test('article skeleton has side placeholders without a nested main landmark', () => {
    const html = renderToStaticMarkup(<BlogPostPageSkeleton />);
    expect(html).toContain('legacy-article-skeleton__toc');
    expect(html).toContain('legacy-article-skeleton__reactions');
    expect(html).not.toContain('<main');
  });
  test('a paused first query has a skeleton, while cached content stays visible', () => {
    const client = new QueryClient();
    function Content() {
      const query = useQuery({ queryKey: ['loading-regression'], queryFn: async () => 'loaded', enabled: false });
      return query.isPending ? <BlogPostPageSkeleton /> : <p>{query.data}</p>;
    }
    const render = () => renderToStaticMarkup(<QueryClientProvider client={client}><Content /></QueryClientProvider>);
    expect(render()).toContain('legacy-article-skeleton');
    client.setQueryData(['loading-regression'], 'cached content');
    expect(render()).toBe('<p>cached content</p>');
    client.clear();
  });
});
