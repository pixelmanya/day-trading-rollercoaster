import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import react from '@vitejs/plugin-react'
import { nitro } from 'nitro/vite'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  // tanstackStart must come before react; nitro turns the build into a Node server
  plugins: [tanstackStart(), react(), nitro({ preset: 'node-server' })],
  test: {
    environment: 'node',
    passWithNoTests: true,
  },
})
