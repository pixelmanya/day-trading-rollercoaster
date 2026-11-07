import { existsSync } from 'node:fs'

import { defineConfig } from 'drizzle-kit'

import { resolveDatabaseTarget } from './src/server/databaseTarget.ts'

// Locally, read .env like `pnpm dev` does; on Render the dashboard provides the variables
if (existsSync('.env')) {
  process.loadEnvFile('.env')
}

// Same environment rules as the server: development can't migrate production or preview
const target = resolveDatabaseTarget(process.env)

if (!target.isSuccess) {
  // Generating migrations needs no database; applying them does, so say why there is none
  console.warn(`drizzle-kit: ${target.error}`)
}

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/server/schema.ts',
  out: './drizzle',
  casing: 'snake_case',
  dbCredentials: { url: target.isSuccess ? target.output.databaseUrl : '' },
})
