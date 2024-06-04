import * as dotenv from 'dotenv'
import type { Config } from 'drizzle-kit'
dotenv.config()

export default {
  driver: 'turso',
  schema: './db/schema.ts',
  out: './db/migrations',
  dialect: 'sqlite',
  dbCredentials: { url: process.env.TURSO_DB_URL || '', authToken: process.env.TURSO_DB_AUTH_TOKEN || '' },
} satisfies Config
