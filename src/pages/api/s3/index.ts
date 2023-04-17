import { NextApiRequest, NextApiResponse } from 'next'
import { Session, withUserAuth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { replaceMiddleChars } from '@/utils'

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1500kb',
    },
  },
}

// This is a special route for retrieving and creating custom dub.sh links.
export default withUserAuth(
  async (req: NextApiRequest, res: NextApiResponse, session: Session) => {
    // GET /api/s3 – get all s3 providers
    if (req.method === 'GET') {
      const { sort = 'createdAt', order = 'desc' } = req.query as {
        sort: 'createdAt' | 'updatedAt'
        order?: 'desc' | 'asc'
      }
      const response = await prisma.s3.findMany({
        orderBy: {
          [sort]: order,
        },
        take: 100,
      })

      return res.status(200).json(
        response.map((s3) => {
          s3.secret = replaceMiddleChars(s3.secret)
        }),
      )

      // POST /api/s3 – create a new s3 provider
    } else if (req.method === 'POST') {
      let { provider, key, secret, region, endpoint, bucket, cdn } = req.body
      if (
        !provider ||
        !key ||
        !secret ||
        !region ||
        !endpoint ||
        !bucket ||
        !cdn
      ) {
        return res.status(400).json({ error: 'Missing property' })
      }

      const response = await prisma.s3.create({
        data: {
          provider,
          key,
          secret,
          region,
          endpoint,
          bucket,
          cdn,
        },
      })

      if (response === null) {
        return res.status(403).json({ error: 'Provider already exists' })
      }
      return res.status(200).json(response)
    } else {
      res.setHeader('Allow', ['GET', 'POST'])
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` })
    }
  },
)
