import '@tanstack/react-start/server-only'
import { createHash } from 'node:crypto'

import { drizzle } from 'drizzle-orm/node-postgres'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

import { chainSuccess, mapSuccess } from '../lib/result'
import type { Result } from '../lib/result'
import { checkDatabaseOwner, parseServerConfig } from '../lib/serverConfig'

export type Database = NodePgDatabase

/** The database and a fingerprint of its host. */
export interface DatabaseConnection {
  readonly database: Database
  /**
   * First 12 hex characters of the host name's SHA-256: tells production and preview databases
   * apart in /api/health without revealing the host.
   */
  readonly fingerprint: string
}

const FINGERPRINT_LENGTH = 12

/*
 * The one module that reads process.env. The pool connects lazily, on the first query, so the
 * app still serves guest mode without a database; database work then gets the config error,
 * and /api/health reports it.
 */
const connection: Result<DatabaseConnection, string> = chainSuccess(
  parseServerConfig(process.env),
  ({ deployment, databaseUrl, databaseHost }) => {
    const fingerprint = createFingerprint(databaseHost)

    return mapSuccess(checkDatabaseOwner(fingerprint, deployment), () => ({
      database: drizzle(new Pool({ connectionString: databaseUrl, max: 5 })),
      fingerprint,
    }))
  },
)

/** The database, or why there is none (safe to log: it never contains the secret). */
export function getDatabase(): Result<DatabaseConnection, string> {
  return connection
}

function createFingerprint(databaseHost: string): string {
  return createHash('sha256').update(databaseHost).digest('hex').slice(0, FINGERPRINT_LENGTH)
}
