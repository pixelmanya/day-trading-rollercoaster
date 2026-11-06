import { PreviewBadge } from './components/PreviewBadge'
import { TradingLog } from './components/TradingLog'
import { useAppState } from './hooks/useAppState'
import type { ReadySession, Session } from './lib/session'
import type { StorageAdapter } from './lib/storage'

import styles from './App.module.css'

interface AppProps {
  readonly storage: StorageAdapter
}

interface StatusPageProps {
  readonly session: Exclude<Session, ReadySession>
}

/** Loading state, load failure, or the trading log, under the preview badge on previews. */
export function App({ storage }: AppProps) {
  const { session, dispatchAction: handleAction, retrySave: handleRetrySave } = useAppState(storage)

  return (
    <>
      <PreviewBadge />
      {session.phase === 'ready' ? (
        <TradingLog session={session} onAction={handleAction} onRetrySave={handleRetrySave} />
      ) : (
        <StatusPage session={session} />
      )}
    </>
  )
}

function StatusPage({ session }: StatusPageProps) {
  return (
    <div className={styles.page}>
      {session.phase === 'loading' ? (
        <div className={styles.status}>Loading your log…</div>
      ) : (
        <div className={styles.status} role="alert">
          {session.error.message} Nothing was changed, so your data is still in this browser.
        </div>
      )}
    </div>
  )
}
