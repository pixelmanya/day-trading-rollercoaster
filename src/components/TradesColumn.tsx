import type { Settings, Summary } from '../lib/types'
import { ClosedTrades } from './ClosedTrades'
import { Icon } from './Icon'
import { OpenPositions } from './OpenPositions'
import { TaxFootnote } from './TaxFootnote'

import styles from './TradesColumn.module.css'

interface TradesColumnProps {
  readonly summary: Summary
  readonly settings: Settings
  readonly onLogBuy: () => void
  readonly onEdit: (tradeId: string) => void
  readonly onSell: (tradeId: string) => void
}

/** "Log a buy", the open and closed trades, and how tax is calculated. */
export function TradesColumn({ summary, settings, onLogBuy, onEdit, onSell }: TradesColumnProps) {
  return (
    <div className={styles.column}>
      {/* Floats over the page on phones, sits above the trades on desktop */}
      <button type="button" className={styles.logBuyButton} onClick={onLogBuy}>
        <Icon name="plus" />
        Log a buy
      </button>
      <OpenPositions
        positions={summary.openPositions}
        openCost={summary.openCost}
        onEdit={onEdit}
        onSell={onSell}
      />
      <ClosedTrades closedResults={summary.closedResults} sumNet={summary.sumNet} onEdit={onEdit} />
      <TaxFootnote settings={settings} />
    </div>
  )
}
