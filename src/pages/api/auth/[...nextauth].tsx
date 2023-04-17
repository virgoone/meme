import { sendMail } from '@/lib/mail'
import NextAuth, { type NextAuthOptions } from 'next-auth'
import EmailProvider from 'next-auth/providers/email'
import { isBlacklistedEmail } from '@/utils'
import jwt from 'jsonwebtoken'
import prisma from '@/lib/prisma'
import type { User } from '.prisma/client'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import GithubProvider from 'next-auth/providers/github'

const VERCEL_DEPLOYMENT =
  process.env.VERCEL_URL && !process.env.VERCEL_URL.includes('localhost')

export const authOptions: NextAuthOptions = {
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_ID as string,
      clientSecret: process.env.GITHUB_SECRET as string,
    }),
    EmailProvider({
      sendVerificationRequest({ identifier, url }) {
        sendMail({
          type: 'login-link',
          url,
          subject: 'Your Douni.one Login Link',
          to: identifier,
        })
      },
    }),
  ],
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt' },
  cookies: {
    sessionToken: {
      name: `${VERCEL_DEPLOYMENT ? '__Secure-' : ''}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        // When working on localhost, the cookie domain must be omitted entirely (https://stackoverflow.com/a/1188145)
        domain: VERCEL_DEPLOYMENT ? '.douni.one' : undefined,
        secure: !!VERCEL_DEPLOYMENT,
      },
    },
  },
  callbacks: {
    signIn: async ({ user }) => {
      if (user.email && (await isBlacklistedEmail(user.email))) {
        return false
      }
      return true
    },
    jwt: async ({ token, account, user }) => {
      if (token.email && (await isBlacklistedEmail(token.email))) {
        return {}
      }
      if (account) {
        token.accessToken = account.access_token
      }
      if (user && user.email) {
        const { role }: User = await prisma.user.findUnique({
          where: { email: user.email },
        })
        if (role) {
          token.role = role
        }
      }

      return token
    },
    session: async ({ token, session, user }) => {
      session.user = {
        // @ts-ignore
        id: token.sub,
        role: token.role,
        ...session.user,
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
    signOut: '/',
    error: '/login', // Error code passed in query string as ?error=
    verifyRequest: '/auth/verify-request', // (used for check email message)
    newUser: '/app/welcome', // New users will be directed here on first sign in (leave the property out if not of interest)
  },
  events: {
    async signIn(message) {
      if (message.isNewUser) {
        const email = message.user.email
        await Promise.all([
          sendMail({
            subject: '✨ Welcome to Douni.one',
            to: email as string,
            type: 'welcome',
          }),
          prisma.user.update({
            where: { email: email as string },
            data: { billingCycleStart: new Date().getDate() },
          }),
        ])
      }
    },
  },
}

export default NextAuth(authOptions)
