import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import { MDXRemote } from 'next-mdx-remote'
import Slugger from 'github-slugger'
import format from 'date-fns/format'
import innerText from 'react-innertext'
import Highlight, { defaultProps, Language } from 'prism-react-renderer'
import Link from 'next/link'
import CoolImage, { ImageProps } from 'react-cool-image'
import Page from './page'
import Comment from '../components/comment'
import { useActiveAnchorSet } from '../misc/active-anchor'
export interface IElementProps {
  children: React.ReactNode | string
  language?: Language
  className?: string
  href?: string
}
export interface HeadingElementProps extends IElementProps {
  tag?: any
}
type OBType = { [key: string]: any }

const SluggerContext = createContext<{
  slugger: Slugger
  index: number
} | null>(null)

const ob: OBType = {}
const obCallback: OBType = {}
const createOrGetObserver = (rootMargin: string) => {
  // Only create 1 instance for performance reasons
  if (!ob[rootMargin]) {
    obCallback[rootMargin] = []
    ob[rootMargin] = new IntersectionObserver(
      (e) => {
        obCallback[rootMargin].forEach(
          (cb: (entries: IntersectionObserverEntry[]) => void) => cb(e),
        )
      },
      {
        rootMargin,
        threshold: [0, 1],
      },
    )
  }
  return ob[rootMargin]
}

function useIntersect(
  margin: string,
  ref: React.MutableRefObject<Element | null>,
  cb: Function,
) {
  useEffect(() => {
    const callback = (entries: IntersectionObserverEntry[]) => {
      let e
      for (let i = 0; i < entries.length; i++) {
        if (entries[i].target === ref.current) {
          e = entries[i]
          break
        }
      }
      if (e) cb(e)
    }

    const observer = createOrGetObserver(margin)
    obCallback[margin].push(callback)
    if (ref.current) observer.observe(ref.current)

    return () => {
      const idx = obCallback[margin].indexOf(callback)
      if (idx >= 0) obCallback[margin].splice(idx, 1)
      if (ref.current) observer.unobserve(ref.current)
    }
  }, [])
}

const HeaderLink = ({ tag: Tag, children, ...props }: HeadingElementProps) => {
  const setActiveAnchor = useActiveAnchorSet()
  const obRef = useRef<HTMLSpanElement>(null)
  const sc = useContext(SluggerContext)
  const slug = useState(() => sc?.slugger.slug(innerText(children) || ''))[0]
  const index = useState(() => sc && sc.index++)[0]

  useIntersect('0px 0px -50%', obRef, (e: IntersectionObserverEntry) => {
    const { rootBounds = { y: 0, height: 0 } } = e
    const aboveHalfViewport =
      e.boundingClientRect.y + e.boundingClientRect.height <=
      (rootBounds?.y || 0) + (rootBounds?.height || 0)
    const insideHalfViewport = e.intersectionRatio > 0

    setActiveAnchor((f: any) => {
      const ret = {
        ...f,
        [slug as string]: {
          index,
          aboveHalfViewport,
          insideHalfViewport,
        },
      }

      let activeSlug = ''
      let smallestIndexInViewport = Infinity
      let largestIndexAboveViewport = -1
      for (const s in f) {
        ret[s].isActive = false
        if (
          ret[s].insideHalfViewport &&
          ret[s].index < smallestIndexInViewport
        ) {
          smallestIndexInViewport = ret[s].index
          activeSlug = s
        }
        if (
          smallestIndexInViewport === Infinity &&
          ret[s].aboveHalfViewport &&
          ret[s].index > largestIndexAboveViewport
        ) {
          largestIndexAboveViewport = ret[s].index
          activeSlug = s
        }
      }

      if (ret[activeSlug]) ret[activeSlug].isActive = true
      return ret
    })
  })

  const anchor = <span className="subheading-anchor" id={slug} ref={obRef} />
  return (
    <Tag tabIndex="-1" {...props}>
      {anchor}
      <a href={'#' + slug} className="subheading">
        {children}
        <span className="anchor-icon" aria-hidden>
          #
        </span>
      </a>
    </Tag>
  )
}

const Code = (props: { children: string; className: string }) => {
  const { children, className } = props
  const code = children?.replace(/[\r\n]+$/, '')
  const match = /language-(\w+)/.exec(className || '')
  if (!match) {
    return <code {...props}>{children}</code>
  }
  return (
    <Highlight
      {...defaultProps}
      language={(match?.[1] || 'javascript') as Language}
      code={code}
      theme={undefined}
    >
      {({ style, tokens, getLineProps, getTokenProps }) => (
        <code
          dir="ltr"
          className={match?.[0]}
          style={{ ...style, padding: 0, margin: 0 }}
        >
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
      <a target="_blank" className="wysiwyg-link" rel="noreferrer" {...props}>
        {children}
      </a>
    )
  }
  return (
    <Link href={props.href || ''}>
      <a className="wysiwyg-link" {...props}>
        {children}
      </a>
    </Link>
  )
}

const loader = (src: string) => {
  if (
    src.startsWith('https://cdn.ugc.marryto.me') ||
    src.startsWith('//cdn.ugc.marryto.me')
  ) {
    return {
      format: true,
      src,
      lazy: 'thumb',
    }
  }
  return {
    format: false,
    src,
    webp: false,
  }
}

const components = {
  h2: H2,
  h3: H3,
  h4: H4,
  h5: H5,
  h6: H6,
  a: A,
  code: Code,
  img: (props: ImageProps) => {
    const { src: url, ...other } = props
    const formatOptions = loader(url)
    const options = {...other, ...formatOptions} as ImageProps

    return <CoolImage {...options} />
  },
  Image: (props: ImageProps) => {
    const { src: url, ...other } = props
    const formatOptions = loader(url)
    const options = {...other, ...formatOptions} as ImageProps

    return <CoolImage {...options} />
  },
  inlineCode: ({ children }: IElementProps) => (
    <code className="wysiwyg-inlinecode">{children}</code>
  ),
  blockquote: ({ children }: IElementProps) => (
    <blockquote className="wysiwyg-blockquote">{children}</blockquote>
  ),
  table: (props: { children: React.ReactNode }) => (
    <table className="wysiwyg-table p-0 w-full text-left border-collapse text-sm border border-solid border-[#e8e8e8] dark:border-slate-400/20 table-container">
      {props.children}
    </table>
  ),
  th: (props: { children: React.ReactNode }) => (
    <th className="whitespace-nowrap p-3 pt-3.5 border-[#e8e8e8] dark:border-slate-400/20 font-medium text-[#5c6b77] dark:text-slate-200 bg-black/[.02] dark:bg-slate-500/[0.1]">
      {props.children}
    </th>
  ),
  td: (props: { children: React.ReactNode }) => (
    <td className="text-left border border-solid border-[#e8e8e8] dark:border-slate-400/20 border-x-0 border-y p-3">
      {props.children}
    </td>
  ),
}

export default function MDXLayout({
  source,
  frontMatter,
}: {
  frontMatter: any
  source: any
}) {
  const slugger = new Slugger()
  const { keywords, ...metadata } = frontMatter

  return (
    <SluggerContext.Provider value={{ slugger, index: 0 }}>
      <Page
        frontMatter={{
          ...metadata,
          keywords: Array.isArray(keywords) ? keywords.join(',') : metadata,
        }}
      >
        <header className="mb-8">
          <h1 className="text-3xl dark:text-white font-bold">
            {metadata.title}
          </h1>
          <p className="article-excerpt relative text-gray-500 dark:text-gray-400">
            {metadata.description}
          </p>
          <section className="article-byline-content text-sm">
            <span className="block text-sm text-gray-300 dark:text-gray-500">
              {format(new Date(metadata.date), 'yyyy-MM-dd')}
            </span>
          </section>
        </header>
        <article className="container wysiwyg dark:wysiwyg-light max-w-none">
          <MDXRemote {...source} components={components} />
        </article>
        {frontMatter.comments !== false && <Comment />}
      </Page>
    </SluggerContext.Provider>
  )
}
