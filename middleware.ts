import { NextResponse } from 'next/server'

import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

import { GeoMiddleware } from '~/lib/middleware/geo.middleware'

export const config = {
  matcher: ['/((?!_next|studio|.*\\..*).*)', '/api(.*)'], // Run middleware on API routes],
}
const isProtectedRoute = createRouteMatcher(['/admin(.*)'])

export default clerkMiddleware(
  async (auth, req) => {
    const { userId, redirectToSignIn } = auth()
    console.log('isProtectedRoute', auth())

    if (isProtectedRoute(req)) {
      if (!userId) {
        return redirectToSignIn()
      }
      auth().protect()
    }

    return GeoMiddleware(req)
  },
  {
    publicRoutes: [
      '/',
      '/studio(.*)',
      '/blog(.*)',
      '/confirm(.*)',
      '/projects',
      '/guestbook',
      '/newsletters(.*)',
      '/about',
      '/rss',
      '/feed',
      '/ama',
    ],
    debug: true,
  },
)
