import { customAlphabet } from 'nanoid'
import { HOME_HOSTNAMES, ccTLDs } from '@/lib/constants'
import { get } from "@vercel/edge-config";

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
    blacklistedDomains = await get('domains')
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
    blacklistedKeys = await get('keys')
  } catch (e) {
    blacklistedKeys = []
  }
  return new RegExp((blacklistedKeys as string[])?.join('|'), 'i').test(key)
}

export const isBlacklistedEmail = async (email: string) => {
  let blacklistedEmails: string[] | undefined
  try {
    blacklistedEmails = await get('emails')
  } catch (e) {
    blacklistedEmails = []
  }
  return new Set(blacklistedEmails).has(email)
}

export const isReservedKey = async (key: string) => {
  let reservedKey: any[] | undefined
  try {
    reservedKey = await get('reserved')
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

export function nFormatter(num: number, digits?: number) {
  if (!num) return '0'
  const lookup = [
    { value: 1, symbol: '' },
    { value: 1e3, symbol: 'K' },
    { value: 1e6, symbol: 'M' },
    { value: 1e9, symbol: 'G' },
    { value: 1e12, symbol: 'T' },
    { value: 1e15, symbol: 'P' },
    { value: 1e18, symbol: 'E' },
  ]
  const rx = /\.0+$|(\.[0-9]*[1-9])0+$/
  var item = lookup
    .slice()
    .reverse()
    .find(function (item) {
      return num >= item.value
    })
  return item
    ? (num / item.value).toFixed(digits || 1).replace(rx, '$1') + item.symbol
    : '0'
}

export const generateDomainFromName = (name: string) => {
  const normalizedName = name
    .toLowerCase()
    .trim()
    .replace(/[\W_]+/g, '')
  if (normalizedName.length < 3) {
    return ''
  }
  if (ccTLDs.has(normalizedName.slice(-2))) {
    return `${normalizedName.slice(0, -2)}.${normalizedName.slice(-2)}`
  }
  // remove vowels
  const devowel = normalizedName.replace(/[aeiou]/g, '')
  if (devowel.length >= 3 && ccTLDs.has(devowel.slice(-2))) {
    return `${devowel.slice(0, -2)}.${devowel.slice(-2)}`
  }

  const shortestString = [normalizedName, devowel].reduce((a, b) =>
    a.length < b.length ? a : b,
  )

  return `${shortestString}.to`
}
