import { useState } from 'react'

import { summarize } from '../lib/calc'
import type { Action } from '../lib/reducer'
import type { ReadySession } from '../lib/session'
import { Hero } from './Hero'
import { LogSheet } from './LogSheet'
import type { SheetRequest } from './LogSheet'
import { SaveErrorBanner } from './SaveErrorBanner'
import { StatsGrid } from './StatsGrid'
import { Toolbar } from './Toolbar'
import { TradesColumn } from './TradesColumn'

import styles from './TradingLog.module.css'

interface TradingLogProps {
  readonly session: ReadySession
  readonly onAction: (action: Action) => void
  readonly onRetrySave: () => void
}

const CLOSED_SHEET = { kind: 'closed' } as const satisfies SheetRequest

/** The loaded log: balance, figures, open and closed trades, and the sheets to change them. */
export function TradingLog({
  session: { appState, today, saveError },
  onAction,
  onRetrySave,
}: TradingLogProps) {
  const [sheetRequest, setSheetRequest] = useState<SheetRequest>(CLOSED_SHEET)
  const { settings } = appState
  const summary = summarize(appState.trades, settings, today)

  const handleOpenSettings = () => setSheetRequest({ kind: 'settings' })
  const handleLogBuy = () => setSheetRequest({ kind: 'buy' })
  const handleCloseSheet = () => setSheetRequest(CLOSED_SHEET)

  function handleEdit(tradeId: string) {
    setSheetRequest({ kind: 'edit', tradeId })
  }

  function handleSell(tradeId: string) {
    setSheetRequest({ kind: 'sell', tradeId })
  }

  function handleSubmit(action: Action) {
    onAction(action)
    setSheetRequest(CLOSED_SHEET)
  }

  return (
    <>
      <main className={styles.page}>
        <div className={styles.toolbar}>
          <Toolbar onOpenSettings={handleOpenSettings} onLogBuy={handleLogBuy} />
        </div>
        {saveError === null ? null : (
          <div className={styles.banner}>
            <SaveErrorBanner error={saveError} onRetry={onRetrySave} />
          </div>
        )}
        <div className={styles.summaryColumn}>
          <Hero summary={summary} start={settings.start} today={today} />
          <StatsGrid summary={summary} />
        </div>
        <div className={styles.trades}>
          <TradesColumn
            summary={summary}
            settings={settings}
            onEdit={handleEdit}
            onSell={handleSell}
          />
        </div>
      </main>
      <LogSheet
        request={sheetRequest}
        appState={appState}
        today={today}
        onSubmit={handleSubmit}
        onClose={handleCloseSheet}
      />
    </>
  )
}
