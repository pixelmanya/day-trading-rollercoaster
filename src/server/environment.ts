import '@tanstack/react-start/server-only'
import type { ServerEnvironment } from '../lib/serverConfig'

/** The one place the app reads process.env; everything else parses what this returns. */
export function readEnvironment(): ServerEnvironment {
  return process.env
}
