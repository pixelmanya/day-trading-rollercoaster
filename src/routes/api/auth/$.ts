import { createFileRoute } from '@tanstack/react-router'

import { getAuth } from '../../../server/auth'

/** Better Auth's endpoints (sign-in, magic-link verification, session, sign-out). */
export const Route = createFileRoute('/api/auth/$')({
  server: {
    handlers: {
      GET: async ({ request }) => handleAuthRequest(request),
      POST: async ({ request }) => handleAuthRequest(request),
    },
  },
})

async function handleAuthRequest(request: Request): Promise<Response> {
  const auth = getAuth()

  if (!auth.isSuccess) {
    return Response.json({ error: 'Sign-in is unavailable.', reason: auth.error }, { status: 503 })
  }

  return auth.output.handler(request)
}
