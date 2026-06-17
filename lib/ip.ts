import { type NextRequest } from 'next/server'

export function getIP(request: Request | NextRequest): string {
  const xff = request.headers.get('x-forwarded-for')

  if (xff === '::1') {
    return '127.0.0.1'
  }

  return xff?.split(',')?.[0]?.trim() || '127.0.0.1'
}
