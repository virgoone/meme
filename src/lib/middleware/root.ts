import { NextFetchEvent, NextRequest, NextResponse } from 'next/server'
import { redis } from '@/lib/upstash'
import { recordClick } from '@/lib/tinybird'
import { parse } from './utils'
import { isHomeHostname } from '@/utils'

export interface RootDomainProps {
  target: string
  rewrite?: boolean
}

export default async function RootMiddleware(
  req: NextRequest,
  ev: NextFetchEvent,
) {
  const { domain, key } = parse(req)

  if (!key) {
    return NextResponse.next()
  }

  if (!domain || isHomeHostname(domain)) {
    return NextResponse.next()
  } else {
    ev.waitUntil(recordClick(req, key)) // record clicks on root page (if domain is not dub.sh)

    const { target, rewrite } =
      (await redis.get<RootDomainProps>(`root:${domain}`)) || {}
    if (target) {
      if (rewrite) {
        return NextResponse.rewrite(target)
      } else {
        return NextResponse.redirect(target)
      }
    } else {
      // rewrite to root page unless the user defines a site to redirect to
      return NextResponse.rewrite(new URL(`/_root/${domain}`, req.url))
    }
  }
}
