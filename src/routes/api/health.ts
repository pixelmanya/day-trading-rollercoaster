import { createFileRoute } from '@tanstack/react-router'
import { sql } from 'drizzle-orm'

import { getDatabase } from '../../server/database'

/**
 * For uptime checks: 200 when the database answers, 503 when it doesn't. A missing or invalid
 * setting is named (never its value), so a misconfigured deploy shows what to fix.
 */
export const Route = createFileRoute('/api/health')({
  server: { handlers: { GET: async () => checkHealth() } },
})

async function checkHealth(): Promise<Response> {
  const connection = getDatabase()

  if (!connection.isSuccess) {
    // The config error names the missing or invalid variable, never its value
    const body = { status: 'degraded', database: 'not configured', reason: connection.error }

    return Response.json(body, { status: 503 })
  }

  try {
    await connection.output.execute(sql`select 1`)

    return Response.json({ status: 'ok', database: 'ok' })
  } catch {
    // The driver's error can include the host; log only the fact
    console.error('Health check: the database did not answer.')

    return Response.json({ status: 'degraded', database: 'unreachable' }, { status: 503 })
  }
}
