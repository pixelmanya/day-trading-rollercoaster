import { useState } from 'react'

import { summarize } from '../lib/calc'
import type { Action } from '../lib/reducer'
import type { ReadySession } from '../lib/session'
import { ClosedTrades } from './ClosedTrades'
import { Hero } from './Hero'
import { LogSheet } from './LogSheet'
import type { SheetRequest } from './LogSheet'
import { OpenPositions } from './OpenPositions'
import { SaveErrorBanner } from './SaveErrorBanner'
import { StatsGrid } from './StatsGrid'
import { TaxFootnote } from './TaxFootnote'

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

  function handleOpenSettings() {
    setSheetRequest({ kind: 'settings' })
  }

  function handleLogBuy() {
    setSheetRequest({ kind: 'buy' })
  }

  function handleEdit(tradeId: string) {
    setSheetRequest({ kind: 'edit', tradeId })
  }

  function handleSell(tradeId: string) {
    setSheetRequest({ kind: 'sell', tradeId })
  }

  function handleCloseSheet() {
    setSheetRequest(CLOSED_SHEET)
  }

  function handleSubmit(action: Action) {
    onAction(action)
    setSheetRequest(CLOSED_SHEET)
  }

  return (
    <>
      <main className={styles.page}>
        {saveError === null ? null : <SaveErrorBanner error={saveError} onRetry={onRetrySave} />}
        <Hero summary={summary} start={settings.start} onOpenSettings={handleOpenSettings} />
        <StatsGrid summary={summary} />
        <OpenPositions
          positions={summary.openPositions}
          openCost={summary.openCost}
          onEdit={handleEdit}
          onSell={handleSell}
        />
        <ClosedTrades
          closedResults={summary.closedResults}
          sumNet={summary.sumNet}
          onEdit={handleEdit}
        />
        <TaxFootnote settings={settings} />
      </main>
      <button type="button" className={styles.logBuyButton} onClick={handleLogBuy}>
        Log a buy
      </button>
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
