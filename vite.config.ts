import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import react from '@vitejs/plugin-react'
import { nitro } from 'nitro/vite'
import { defineConfig } from 'vitest/config'

import { describePreview } from './src/lib/preview.ts'

// https://vite.dev/config/
export default defineConfig({
  // tanstackStart must come before react; nitro turns the build into a Node server
  plugins: [tanstackStart(), react(), nitro({ preset: 'node-server' })],
  define: {
    // Baked in at build time, identical on server and client; empty outside PR previews
    'import.meta.env.VITE_PREVIEW_LABEL': JSON.stringify(describePreview(process.env) ?? ''),
  },
  test: {
    environment: 'node',
    setupFiles: ['src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/lib/**/*.ts'],
      exclude: ['src/lib/**/*.test.ts', 'src/lib/types.ts', 'src/lib/storage/types.ts'],
      thresholds: { lines: 100, branches: 100, functions: 100, statements: 100 },
    },
  },
})
