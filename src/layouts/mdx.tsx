import React, { createContext, useContext, useMemo, useRef } from 'react'
import ReactDOMServer from 'react-dom/server'
import { MDXRemote } from 'next-mdx-remote'
import format from 'date-fns/format'
import Slugger from 'github-slugger'
import Highlight, { defaultProps, Language } from 'prism-react-renderer'
import Link from 'next/link'
import Page from './page'
import { useActiveAnchorSet } from '../misc/active-anchor'

export interface IElementProps {
  children: React.ReactNode | string
  language?: Language
  className?: string
  href?: string
  tag?: React.ReactElement | string
}

const SluggerContext = createContext<Slugger | null>(null)

const HeaderLink = ({ tag: Tag, children, ...props }: IElementProps) => {
  const setActiveAnchor = useActiveAnchorSet()
  const obRef = useRef()
  const slugger = useContext(SluggerContext)
  const slug = slugger?.slug(
    ReactDOMServer.renderToStaticMarkup(children) || '',
  )

  return (
    <Tag {...props}>
      <span className="subheading-anchor" id={slug} />
      <a href={'#' + slug} className="subheading">
        {children}
        <span className="anchor-icon" aria-hidden>
          #
        </span>
      </a>
    </Tag>
  )
}

const Code = ({
  children,
  language,
}: {
  children: string
  language?: Language
}) => {
  const code = children?.replace(/[\r\n]+$/, '')

  return (
    <Highlight
      {...defaultProps}
      language={language || 'javascript'}
      code={code}
      theme={undefined}
    >
      {({ style, tokens, getLineProps, getTokenProps }) => (
        <code dir="ltr" style={{ ...style, padding: 0, margin: 0 }}>
          {tokens.map((line, i) => (
            <div key={i} {...getLineProps({ line, key: i })}>
              {line.map((token, key) => (
                <span key={key} {...getTokenProps({ token, key })} />
              ))}
            </div>
          ))}
        </code>
      )}
    </Highlight>
  )
}

const H2 = ({ children, ...props }: IElementProps) => {
  return (
    <HeaderLink tag="h2" {...props}>
      {children}
    </HeaderLink>
  )
}

const H3 = ({ children, ...props }: IElementProps) => {
  return (
    <HeaderLink tag="h3" {...props}>
      {children}
    </HeaderLink>
  )
}

const H4 = ({ children, ...props }: IElementProps) => {
  return (
    <HeaderLink tag="h4" {...props}>
      {children}
    </HeaderLink>
  )
}

const H5 = ({ children, ...props }: IElementProps) => {
  return (
    <HeaderLink tag="h5" {...props}>
      {children}
    </HeaderLink>
  )
}

const H6 = ({ children, ...props }: IElementProps) => {
  return (
    <HeaderLink tag="h6" {...props}>
      {children}
    </HeaderLink>
  )
}

const A = ({ children, ...props }: IElementProps) => {
  const isExternal = props.href && props.href.startsWith('https://')
  if (isExternal) {
    return (
      <a target="_blank" rel="noreferrer" {...props}>
        {children}
      </a>
    )
  }
  return (
    <Link href={props.href || ''}>
      <a {...props}>{children}</a>
    </Link>
  )
}

const components = {
  h2: H2,
  h3: H3,
  h4: H4,
  h5: H5,
  h6: H6,
  a: A,
  code: Code,
}

export default function MDXLayout({
  source,
  frontMatter,
}: {
  frontMatter: any
  source: any
}) {
  const slugger = new Slugger()

  return (
    <SluggerContext.Provider value={slugger}>
      <Page frontMatter={frontMatter}>
        <header className="mb-8">
          <h1 className="text-3xl dark:text-white font-bold">
            {frontMatter.title}
          </h1>
          <span className="block text-sm text-gray-500 dark:text-gray-400 mt-1">
            {format(new Date(frontMatter.date), 'yyyy-MM-dd')}
          </span>
        </header>
        <article className="container wysiwyg dark:wysiwyg-light max-w-none">
          <MDXRemote {...source} components={components} />
        </article>
      </Page>
    </SluggerContext.Provider>
  )
}
