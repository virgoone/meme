import { NextFetchEvent, NextRequest, NextResponse } from 'next/server'
import { DEFAULT_REDIRECTS } from '@/lib/constants'
import { ApiMiddleware, AppMiddleware, RootMiddleware } from '@/lib/middleware'
import { parse } from '@/lib/middleware/utils'
import { isReservedKey } from '@/utils'
import { withAuth } from 'next-auth/middleware'

export const config = {
  matcher: [
    /*
     * Match all paths except for:
     * 1. /api/ routes
     * 2. /_next/ (Next.js internals)
     * 3. /_proxy/, /_auth/, /_root/ (special pages for OG tags proxying, password protection, and placeholder _root pages)
     * 4. /_static (inside /public)
     * 5. /_vercel (Vercel internals)
     * 6. all root files inside /public (e.g. /favicon.ico)
     */
    '/((?!api/|_next/|_proxy/|_auth/|_root/|_static|_vercel|[\\w-]+\\.\\w+).*)',
  ],
}

async function middleware(req: NextRequest, ev: NextFetchEvent) {
  const parseReq = parse(req)
  const { domain, path, key } = parseReq
  console.log('parseReq-->', parseReq)
  const home = domain === 'blog.douni.one'

  // for App (app.dub.sh and app.localhost:3000)
  if (domain === 'app.blog.douni.one' || domain === 'app.localhost:3000') {
    return AppMiddleware(req)
  }

  // for API (api.dub.sh and api.localhost:3000)
  if (domain === 'api.blog.douni.one' || domain === 'api.localhost:3000') {
    return ApiMiddleware(req)
  }

  // for public stats pages (e.g. dub.sh/stats/github)
  if (path.startsWith('/stats/')) {
    return NextResponse.next()
  }

  // for root pages (e.g. dub.sh, vercel.fyi, etc.)
  if (key.length === 0) {
    return RootMiddleware(req, ev)
  }

  if (home) {
    if (path.startsWith('/static')) {
      return NextResponse.rewrite(
        new URL('/_static' + path.split('/static')[1], req.url),
      )
    }
    if (DEFAULT_REDIRECTS[key]) {
      return NextResponse.redirect(DEFAULT_REDIRECTS[key])
    }
    if (await isReservedKey(key)) {
      return NextResponse.next()
    }
  }

  return NextResponse.next()
}
export default withAuth(
  // `withAuth` augments your `Request` with the user's token.
  middleware,
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  },
)
