import { createClient as createWebClient } from '@libsql/client/web'
import { drizzle, LibSQLDatabase } from 'drizzle-orm/libsql'

import { env } from '~/env.mjs'

import * as schema from './schema'

// create the connection
const client = createWebClient({
  url: env.TURSO_DB_URL || '',
  authToken: env.TURSO_DB_AUTH_TOKEN || '',
})
export const db = drizzle(client, { schema })
