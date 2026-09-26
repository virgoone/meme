import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import './comment-markdown.css';

export function CommentMarkdown({ children }: { children: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        a: ({ children, href }) => {
          const external = !href?.startsWith('/');
          return (
            <a
              href={href ?? ''}
              rel={external ? 'noreferrer noopener' : undefined}
              target={external ? '_blank' : undefined}
              className='font-bold text-zinc-800 hover:underline dark:text-zinc-100'
            >
              {children}
            </a>
          );
        },
      }}
    >
      {children}
    </ReactMarkdown>
  );
}
