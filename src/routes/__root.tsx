import { createRootRoute, HeadContent, Outlet, Scripts } from '@tanstack/react-router'
import type { ReactNode } from 'react'

import globalStylesUrl from '../styles/global.css?url'
import tokensUrl from '../styles/tokens.css?url'

const FONT_URL =
  'https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:wght@400;500;600;700;800&display=swap'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
      { title: 'Trading experiment' },
    ],
    links: [
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'stylesheet', href: FONT_URL },
      { rel: 'stylesheet', href: tokensUrl },
      { rel: 'stylesheet', href: globalStylesUrl },
    ],
  }),
  component: RootLayout,
})

interface RootDocumentProps {
  readonly children: ReactNode
}

function RootLayout() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  )
}

function RootDocument({ children }: RootDocumentProps) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}
