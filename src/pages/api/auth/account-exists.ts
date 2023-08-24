import { NextApiRequest, NextApiResponse } from 'next'
import { ratelimit } from '@/lib/upstash'
import prisma from '@/lib/prisma'
import { LOCALHOST_IP } from '@/lib/constants'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method === 'POST') {
    const ip =
      req.connection.remoteAddress || req.socket.remoteAddress || LOCALHOST_IP

    const limitData = await ratelimit?.(5, '1 m')?.limit(ip)
    if (!limitData?.success) {
      return new Response("Don't DDoS me pls 🥺", { status: 429 })
    }
    const { email } = req.body
    console.log('user-->', email)

    const user = await prisma.user.findUnique({
      where: { email },
      select: { email: true },
    })
    console.log('user-->', user)
    if (user) {
      return res.status(200).json({ exists: true })
    }
    return res.status(200).json({ exists: false })
  } else {
    return res.status(405).json({
      error: 'Method not allowed',
    })
  }
}
