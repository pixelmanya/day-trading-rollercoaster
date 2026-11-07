import '@tanstack/react-start/server-only'
import { drizzle } from 'drizzle-orm/node-postgres'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

import { mapSuccess } from '../lib/result'
import type { Result } from '../lib/result'
import { resolveDatabaseTarget } from './databaseTarget'
import { readEnvironment } from './environment'
import { schema } from './schema'

type Database = NodePgDatabase<typeof schema>

/** The database and a fingerprint of its host. */
export interface DatabaseConnection {
  readonly database: Database
  readonly fingerprint: string
}

/*
 * The pool connects lazily, on the first query, so the app still serves guest mode without a
 * database; database work then gets the config error, and /api/health reports it.
 */
const connection: Result<DatabaseConnection, string> = mapSuccess(
  resolveDatabaseTarget(readEnvironment()),
  ({ databaseUrl, fingerprint }) => ({
    database: drizzle(new Pool({ connectionString: databaseUrl, max: 5 }), {
      schema,
      casing: 'snake_case',
    }),
    fingerprint,
  }),
)

/** The database, or why there is none (safe to log: it never contains the secret). */
export function getDatabase(): Result<DatabaseConnection, string> {
  return connection
}
