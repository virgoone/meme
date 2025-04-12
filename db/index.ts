import { drizzle } from 'drizzle-orm/libsql';
import { env } from '~/env.mjs'

import * as schema from './schema'

// create the connection
export const db = drizzle({
  connection: {
    url: env.TURSO_DB_URL!,
    authToken: env.TURSO_DB_AUTH_TOKEN!,
  },
}, { schema })
