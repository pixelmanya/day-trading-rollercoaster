import { createFileRoute } from '@tanstack/react-router'

import { App } from '../App'
import { createStorage } from '../lib/storage'

// Creating the adapter touches no browser API; it only reads localStorage when loading
const storage = createStorage()

export const Route = createFileRoute('/')({ component: HomePage })

function HomePage() {
  return <App storage={storage} />
}
