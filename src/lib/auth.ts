import { NextApiRequest, NextApiResponse } from 'next'
import { unstable_getServerSession } from 'next-auth/next'
import { authOptions } from '@/pages/api/auth/[...nextauth]'
import prisma from '@/lib/prisma'
import { ProjectProps, UserProps } from './types'
import { FREE_PLAN } from './constants'

export interface Session {
  user: {
    email?: string | null
    id?: string | null
    name?: string | null
  }
}

export async function getServerSession(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  return (await unstable_getServerSession(req, res, authOptions)) as Session
}

interface WithProjectNextApiHandler {
  (
    req: NextApiRequest,
    res: NextApiResponse,
    project?: ProjectProps,
    session?: Session,
  ): Promise<void | NextApiResponse<any>>
}

const withProjectAuth =
  (
    handler: WithProjectNextApiHandler,
    {
      excludeGet, // if the action doesn't need to be gated for GET requests
      needProSubscription, // if the action needs a pro subscription
      needNotExceededUsage,
      needProjectDetails,
    }: {
      excludeGet?: boolean
      needProSubscription?: boolean
      needNotExceededUsage?: boolean
      needProjectDetails?: boolean
    } = {},
  ) =>
  async (req: NextApiRequest, res: NextApiResponse) => {
    const session = await getServerSession(req, res)
    if (!session?.user.id) return res.status(401).end('Unauthorized')

    const { slug } = req.query
    if (!slug || typeof slug !== 'string') {
      return res
        .status(400)
        .json({ error: 'Missing or misconfigured project slug' })
    }

    const project = (await prisma.project.findUnique({
      where: {
        slug,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        domain: true,
        domainVerified: true,
        logo: true,
        ...(needProjectDetails && {
          statsUsage: true,
          statsUsageLimit: true,
          statsExceededUsage: true,
          staticUsage: true,
          staticUsageLimit: true,
          staticExceededUsage: true,
          tokenUsage: true,
          tokenUsageLimit: true,
          tokenExceededUsage: true,
        }),
        users: {
          where: {
            userId: session.user.id,
          },
          select: {
            role: true,
          },
        },
      },
    })) as unknown as ProjectProps

    if (project) {
      // project exists but user is not part of it
      if (project.users?.length === 0) {
        const pendingInvites = await prisma.projectInvite.findUnique({
          where: {
            email_projectId: {
              email: session.user.email as string,
              projectId: project.id,
            },
          },
          select: {
            expires: true,
          },
        })
        if (!pendingInvites) {
          return res.status(404).json({ error: 'Project not found' })
        } else if (pendingInvites.expires < new Date()) {
          return res.status(410).json({ error: 'Project invite expired' })
        } else {
          return res.status(409).json({ error: 'Project invite pending' })
        }
      }
    } else {
      // project doesn't exist
      return res.status(404).json({ error: 'Project not found' })
    }

    // if the action doesn't need to be gated for GET requests, return handler now
    if (req.method === 'GET' && excludeGet) return handler(req, res, project)

    if (needNotExceededUsage || needProSubscription) {
      if (
        needNotExceededUsage &&
        project.tokenExceededUsage &&
        project.staticExceededUsage &&
        project.statsExceededUsage
      ) {
        return res.status(403).end('Unauthorized: Usage limits exceeded.')
      }

      const freePlan =
        project.staticUsageLimit >= FREE_PLAN.StaticUsageLimit ||
        project.statsUsageLimit >= FREE_PLAN.StatsUsageLimit ||
        project.tokenUsageLimit >= FREE_PLAN.TokenUsageLimit
      if (needProSubscription && freePlan) {
        return res.status(403).end('Unauthorized: Need pro subscription')
      }
    }

    return handler(req, res, project, session)
  }

export { withProjectAuth }

interface WithUserNextApiHandler {
  (
    req: NextApiRequest,
    res: NextApiResponse,
    session: Session,
    user?: UserProps,
  ): Promise<void | NextApiResponse<any>>
}

const withUserAuth =
  (
    handler: WithUserNextApiHandler,
    {
      needUserDetails, // if the action needs the user's details
      needProSubscription,
      role,
    }: {
      needUserDetails?: boolean
      needProSubscription?: boolean
      role?: string
    } = {},
  ) =>
  async (req: NextApiRequest, res: NextApiResponse) => {
    const session = await getServerSession(req, res)
    if (!session?.user.id) return res.status(401).end('Unauthorized')

    if (req.method === 'GET') return handler(req, res, session)

    if (needUserDetails || needProSubscription) {
      const user = (await prisma.user.findUnique({
        where: {
          id: session.user.id,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          usageProjectLimit: true,
          ...(needProSubscription && {
            projects: {
              where: {
                role: 'owner',
              },
              select: {
                projectId: true,
              },
            },
          }),
        },
      })) as unknown as UserProps
      const freePlan = user.usageProjectLimit === 1

      if (
        needProSubscription &&
        freePlan &&
        user.projects &&
        user.projects.length >= 1
      ) {
        return res
          .status(403)
          .end("Unauthorized: Can't add more projects, need pro subscription")
      }
      if (user.role !== 'admin' && role !== user.role) {
        return res.status(403).end('没有权限')
      }
      return handler(req, res, session, user)
    }

    return handler(req, res, session)
  }

export { withUserAuth }
