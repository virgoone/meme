import fs from 'fs'
import path from 'path'
import { serialize } from 'next-mdx-remote/serialize'
import images from 'remark-images'
import { customAlphabet } from 'nanoid'
import { createClient } from '@vercel/edge-config'
import { HOME_HOSTNAMES } from '@/lib/constants'

export function capitalize(str: string) {
  if (!str || typeof str !== 'string') return str
  return str.charAt(0).toUpperCase() + str.slice(1)
}

export const nanoid = customAlphabet(
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
  7,
) // 7-character random string

interface SWRError extends Error {
  status: number
}

export async function fetcher<JSON = any>(
  input: RequestInfo,
  init?: RequestInit,
): Promise<JSON> {
  const res = await fetch(input, init)
  console.log('res', res)
  if (!res.ok) {
    const json = await res.json()
    if (json.error) {
      const error = new Error(json.error) as SWRError
      error.status = res.status
      throw error
    } else {
      throw new Error('An unexpected error occurred')
    }
  }

  return res.json()
}

// POSTS_PATH is useful when you want to get the path to a specific file
export const POSTS_PATH = path.join(process.cwd(), 'src', '_posts')

// postFilePaths is the list of all mdx files inside the POSTS_PATH directory
export const postFilePaths = fs
  .readdirSync(POSTS_PATH)
  // Only include md(x) files
  .filter((path) => /\.mdx?$/.test(path))

export const getPostFileSource = async (
  content: string,
  data: { [key: string]: any },
) => {
  const mdxSource = await serialize(content, {
    // Optionally pass remark/rehype plugins
    mdxOptions: {
      remarkPlugins: [images],
      rehypePlugins: [],
    },
    scope: data,
  })

  return mdxSource
}

export const edgeConfig = createClient(process.env.EDGE_CONFIG)

export const isValidUrl = (url: string) => {
  try {
    new URL(url)
    return true
  } catch (e) {
    return false
  }
}

export const getDomainWithoutWWW = (url: string) => {
  if (isValidUrl(url)) {
    return new URL(url).hostname.replace(/^www\./, '')
  }
  try {
    if (url.includes('.') && !url.includes(' ')) {
      return new URL(`https://${url}`).hostname.replace(/^www\./, '')
    }
  } catch (e) {
    return null
  }
}

export const isBlacklistedDomain = async (domain: string) => {
  let blacklistedDomains: string[] | undefined
  try {
    blacklistedDomains = await edgeConfig.get('domains')
  } catch (e) {
    blacklistedDomains = []
  }
  return new RegExp((blacklistedDomains || []).join('|')).test(
    getDomainWithoutWWW(domain) as string,
  )
}

export const isBlacklistedKey = async (key: string) => {
  let blacklistedKeys: string[] | undefined
  try {
    blacklistedKeys = await edgeConfig.get('keys')
  } catch (e) {
    blacklistedKeys = []
  }
  return new RegExp((blacklistedKeys as string[])?.join('|'), 'i').test(key)
}

export const isBlacklistedEmail = async (email: string) => {
  let blacklistedEmails: string[] | undefined
  try {
    blacklistedEmails = await edgeConfig.get('emails')
  } catch (e) {
    blacklistedEmails = []
  }
  return new Set(blacklistedEmails).has(email)
}

export const isReservedKey = async (key: string) => {
  let reservedKey: any[] | undefined
  try {
    reservedKey = await edgeConfig.get('reserved')
  } catch (e) {
    reservedKey = []
  }
  return new Set(reservedKey).has(key)
}
export const validDomainRegex = new RegExp(
  '^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$',
)

export const isHomeHostname = (domain: string) => {
  return HOME_HOSTNAMES.has(domain) || domain.endsWith('.vercel.app')
}

const logTypeToEnv = {
  cron: process.env.SLACK_HOOK_CRON,
  links: process.env.SLACK_HOOK_LINKS,
}

export const log = async (message: string, type: 'cron' | 'links') => {
  /* Log a message to the console */
  const HOOK = logTypeToEnv[type]
  if (!HOOK) return
  try {
    return await fetch(HOOK, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: message,
            },
          },
        ],
      }),
    })
  } catch (e) {
    console.log(`Failed to log to Slack. Error: ${e}`)
  }
}

export function replaceMiddleChars(str: string) {
  if (str.length <= 2) {
    return str.split('').join(',').replace(',', '*****') // 字符串长度小于等于2，无需替换
  }

  const firstChar = str[0]
  const lastChar = str[str.length - 1]
  const middleChars = '*'.repeat(Math.max(0, str.length - 2))

  return `${firstChar}${middleChars}${lastChar}`
}
