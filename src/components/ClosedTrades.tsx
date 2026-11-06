import { getTone } from '../lib/calc'
import { formatEuro, formatPercent, formatShortDate, formatSignedEuro } from '../lib/format'
import type { ClosedResult } from '../lib/types'
import { List } from './List'
import { SectionHeading } from './SectionHeading'

import styles from './ClosedTrades.module.css'

interface ClosedTradesProps {
  /** In tax order; shown newest first. */
  readonly closedResults: readonly ClosedResult[]
  readonly sumNet: number
  readonly onEdit: (tradeId: string) => void
}

interface ClosedTradeRowProps {
  readonly closedResult: ClosedResult
  readonly onEdit: (tradeId: string) => void
}

/** Closed trades, newest first, with their net result after fees and tax. */
export function ClosedTrades({ closedResults, sumNet, onEdit }: ClosedTradesProps) {
  const isEmpty = closedResults.length === 0

  return (
    <section aria-label="Closed trades">
      <SectionHeading
        title="Closed"
        count={closedResults.length}
        meta={isEmpty ? '' : `${formatSignedEuro(sumNet)} net`}
      />
      <List
        isEmpty={isEmpty}
        emptyText="Closed trades show up here with their net result after fees and tax."
      >
        {closedResults.toReversed().map((closedResult) => (
          <ClosedTradeRow
            key={closedResult.trade.tradeId}
            closedResult={closedResult}
            onEdit={onEdit}
          />
        ))}
      </List>
    </section>
  )
}

function ClosedTradeRow({
  closedResult: { trade, fees, tax, net, returnRatio },
  onEdit,
}: ClosedTradeRowProps) {
  function handleEdit() {
    onEdit(trade.tradeId)
  }

  const tone = getTone(net)

  return (
    <button
      type="button"
      className={styles.row}
      aria-label={`Edit ${trade.ticker}, ${formatSignedEuro(net)}`}
      onClick={handleEdit}
    >
      <span className={styles.ticker}>{trade.ticker}</span>
      <span className={styles.detail}>
        <span>
          {formatShortDate(trade.buyDate)} → {formatShortDate(trade.sellDate)}
        </span>
        <span className={styles.fees}>fees {formatEuro(fees)}</span>
        <span className={styles.tax}>tax {formatEuro(tax)}</span>
      </span>
      <span className={styles.result}>
        <span className={`${styles.net} ${styles[tone]}`}>{formatSignedEuro(net)}</span>
        <span className={`${styles.returnChip} ${styles[`${tone}Chip`]}`}>
          {formatPercent(returnRatio)}
        </span>
      </span>
    </button>
  )
}
