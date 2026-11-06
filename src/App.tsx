import { TradingLog } from './components/TradingLog'
import { useAppState } from './hooks/useAppState'
import type { StorageAdapter } from './lib/storage'

import styles from './App.module.css'

interface AppProps {
  readonly storage: StorageAdapter
}

/** Loading state, load failure, or the trading log. */
export function App({ storage }: AppProps) {
  const { session, dispatchAction: handleAction, retrySave: handleRetrySave } = useAppState(storage)

  if (session.phase === 'ready') {
    return <TradingLog session={session} onAction={handleAction} onRetrySave={handleRetrySave} />
  }

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
