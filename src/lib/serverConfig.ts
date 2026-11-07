import { fail, succeed } from './result'
import type { Result } from './result'

/** Where the server runs: the live Render service, a Render PR preview, or anywhere else. */
export type Deployment = 'production' | 'preview' | 'development'

/** What the server needs from its environment. Holds secrets: server code only. */
export interface ServerConfig {
  readonly deployment: Deployment
  /** Postgres connection string, e.g. Neon's "postgresql://…?sslmode=require". */
  readonly databaseUrl: string
  /** The database server's host name, for a fingerprint that tells databases apart. */
  readonly databaseHost: string
}

/** Environment variables as the process sees them. */
export type ServerEnvironment = Readonly<Record<string, string | undefined>>

const POSTGRES_URL = /^postgres(ql)?:\/\/\S+$/

/**
 * Fingerprints (see src/server/database.ts) of the Neon databases that belong to one deployment.
 * Not secret: a hash of the host. Update when a database moves. Unlisted databases, such as a
 * local Postgres, are allowed anywhere.
 */
const databaseOwners: Readonly<Record<string, Deployment>> = {
  a37255697dd9: 'production',
  '66b6c6392f90': 'preview',
  ffb84bee09ea: 'development',
}

/**
 * Validate the environment into a ServerConfig. Errors name the variable and what is wrong,
 * never its value, so they are safe to log.
 *
 * Render PR previews (IS_PULL_REQUEST=true) read PREVIEW_DATABASE_URL and never fall back to
 * DATABASE_URL, so a preview can't reach production data.
 */
export function parseServerConfig(environment: ServerEnvironment): Result<ServerConfig, string> {
  const deployment = readDeployment(environment)
  const variable = deployment === 'preview' ? 'PREVIEW_DATABASE_URL' : 'DATABASE_URL'

  const databaseUrl = environment[variable]

  if (databaseUrl === undefined || databaseUrl === '') {
    return fail(`${variable} is not set. See .env.example.`)
  }

  const databaseHost = readPostgresHost(databaseUrl)

  if (databaseHost === null) {
    return fail(`${variable} must be a postgres:// or postgresql:// connection string.`)
  }

  return succeed({ deployment, databaseUrl, databaseHost })
}

/**
 * Refuse a database that belongs to another deployment: production data only for the live
 * service, the preview database only for previews.
 */
export function checkDatabaseOwner(
  fingerprint: string,
  deployment: Deployment,
): Result<null, string> {
  const owner = databaseOwners[fingerprint]

  if (owner === undefined || owner === deployment) {
    return succeed(null)
  }

  return fail(
    `This ${deployment} server is set up with the ${owner} database. Use its own (README → Environments).`,
  )
}

/** Render sets RENDER on every deploy and IS_PULL_REQUEST on PR previews. */
export function readDeployment(environment: ServerEnvironment): Deployment {
  if (environment['IS_PULL_REQUEST'] === 'true') {
    return 'preview'
  }

  return environment['RENDER'] === 'true' ? 'production' : 'development'
}

/** The host of a postgres:// connection string; null if it isn't one or has no host. */
function readPostgresHost(databaseUrl: string): string | null {
  const host = URL.canParse(databaseUrl) ? new URL(databaseUrl).hostname : ''

  return POSTGRES_URL.test(databaseUrl) && host !== '' ? host : null
}
