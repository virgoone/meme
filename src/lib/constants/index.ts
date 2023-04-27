export const LOCALHOST_GEO_DATA = {
  city: 'San Francisco',
  region: 'CA',
  country: 'US',
  latitude: '37.7695',
  longitude: '-122.385',
}

export const LOCALHOST_IP = '63.141.56.109'

export const INTERVALS = [
  {
    display: 'Last hour',
    slug: '1h',
  },
  {
    display: 'Last 24 hours',
    slug: '24h',
  },
  {
    display: 'Last 7 days',
    slug: '7d',
  },
  {
    display: 'Last 30 days',
    slug: '30d',
  },
  {
    display: 'Last 3 months',
    slug: '90d',
  },
]

export const FRAMER_MOTION_LIST_ITEM_VARIANTS = {
  hidden: { scale: 0.8, opacity: 0 },
  show: { scale: 1, opacity: 1, transition: { type: 'spring' } },
}

export const STAGGER_CHILD_VARIANTS = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, type: 'spring' } },
}

export const SWIPE_REVEAL_ANIMATION_SETTINGS = {
  initial: { height: 0 },
  animate: { height: 'auto' },
  exit: { height: 0 },
  transition: { duration: 0.2, bounce: 0 },
}

export const FADE_IN_ANIMATION_SETTINGS = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.2 },
}

export const HOME_HOSTNAMES = new Set([
  // comment for better diffs
  'blog.douni.one',
  'auth.127-0-0-1.nip.io:3000',
  'localhost:3000',
])

export const DEFAULT_REDIRECTS: Record<string, string> = {
  home: 'https://blog.douni.one',
  signin: 'https://app.blog.douni.one/login',
  login: 'https://app.blog.douni.one/login',
  register: 'https://app.blog.douni.one/register',
  signup: 'https://app.blog.douni.one/register',
  app: 'https://app.blog.douni.one',
  dashboard: 'https://app.blog.douni.one',
  links: 'https://app.blog.douni.one/links',
  settings: 'https://app.blog.douni.one/settings',
  welcome: 'https://app.blog.douni.one/welcome',
}

export { default as COUNTRIES } from './countries'
export { default as ccTLDs } from './cctlds'

export const FREE_PLAN = {
  ProjectLimit: 1,
  StatsUsageLimit: 1000,
  StaticUsageLimit: 1048576,
  TokenUsageLimit: 1000,
}
