import { createHash } from 'node:crypto'

import { chainSuccess, mapSuccess } from '../lib/result'
import type { Result } from '../lib/result'
import { checkDatabaseOwner, parseServerConfig } from '../lib/serverConfig'
import type { ServerEnvironment } from '../lib/serverConfig'

/** Which database to use, and its fingerprint. Holds a secret: server code and tooling only. */
export interface DatabaseTarget {
  readonly databaseUrl: string
  /**
   * First 12 hex characters of the host name's SHA-256: tells databases apart in /api/health
   * without revealing the host.
   */
  readonly fingerprint: string
}

const FINGERPRINT_LENGTH = 12

/**
 * The database for this environment, refusing one that belongs to another deployment. Shared by
 * the server and drizzle.config.ts, so migrations obey the same guard.
 */
export function resolveDatabaseTarget(
  environment: ServerEnvironment,
): Result<DatabaseTarget, string> {
  return chainSuccess(
    parseServerConfig(environment),
    ({ deployment, databaseUrl, databaseHost }) => {
      const fingerprint = createFingerprint(databaseHost)

      return mapSuccess(checkDatabaseOwner(fingerprint, deployment), () => ({
        databaseUrl,
        fingerprint,
      }))
    },
  )
}

function createFingerprint(databaseHost: string): string {
  return createHash('sha256').update(databaseHost).digest('hex').slice(0, FINGERPRINT_LENGTH)
}
