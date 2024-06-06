import { type NextRequest } from 'next/server'

export function getIP(request: Request | NextRequest): string {
  if ('ip' in request && request.ip) {
    console.log('request.ip-->', request.ip)
    return request.ip
  }

  const xff = request.headers.get('x-forwarded-for')
  console.log('xff.ip-->', xff)
  if (xff === '::1') {
    return '127.0.0.1'
  }

  return xff?.split(',')?.[0] ?? '127.0.0.1'
}
