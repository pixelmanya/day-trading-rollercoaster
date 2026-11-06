import type { Settings, Summary } from '../lib/types'
import { ClosedTrades } from './ClosedTrades'
import { OpenPositions } from './OpenPositions'
import { TaxFootnote } from './TaxFootnote'

import styles from './TradesColumn.module.css'

interface TradesColumnProps {
  readonly summary: Summary
  readonly settings: Settings
  readonly onEdit: (tradeId: string) => void
  readonly onSell: (tradeId: string) => void
}

/** The open and closed trades, and how tax is calculated. */
export function TradesColumn({ summary, settings, onEdit, onSell }: TradesColumnProps) {
  return (
    <div className={styles.content}>
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
