import '@tanstack/react-start/server-only'
import { drizzle } from 'drizzle-orm/node-postgres'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

import { mapSuccess } from '../lib/result'
import type { Result } from '../lib/result'
import { parseServerConfig } from '../lib/serverConfig'

export type Database = NodePgDatabase

/*
 * The one module that reads process.env. The pool connects lazily, on the first query, so the
 * app still serves guest mode without a database; database work then gets the config error,
 * and /api/health reports it.
 */
const connection: Result<Database, string> = mapSuccess(
  parseServerConfig(process.env),
  ({ databaseUrl }) => drizzle(new Pool({ connectionString: databaseUrl, max: 5 })),
)

/** The database, or why there is none (safe to log: it never contains the secret). */
export function getDatabase(): Result<Database, string> {
  return connection
}
