import { NextRequest } from 'next/server'
import { ratelimit } from '@/lib/upstash'
import { ipAddress } from '@vercel/edge'
import prisma from '@/lib/prisma'
import { LOCALHOST_IP } from '@/lib/constants'

export const config = {
  runtime: 'edge',
}

export default async function handler(req: NextRequest) {
  if (req.method === 'POST') {
    const ip = ipAddress(req) || LOCALHOST_IP
    const limitData = await ratelimit?.(5, '1 m')?.limit(ip)
    if (!limitData?.success) {
      return new Response("Don't DDoS me pls 🥺", { status: 429 })
    }
    const { email } = (await req.json()) as { email: string }
    const user = await prisma.user.findUnique({
      where: { email },
      select: { email: true },
    })

    if (user) {
      return new Response(JSON.stringify({ exists: true }))
    }
    return new Response(JSON.stringify({ exists: false }))
  } else {
    return new Response('Method not allowed', {
      status: 405,
      statusText: 'Method not allowed',
    })
  }
}
