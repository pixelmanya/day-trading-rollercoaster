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
    <>
      <SectionHeading title="Closed" meta={isEmpty ? '' : `${formatSignedEuro(sumNet)} net`} />
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
    </>
  )
}

function ClosedTradeRow({
  closedResult: { trade, fees, tax, net, returnRatio },
  onEdit,
}: ClosedTradeRowProps) {
  function handleEdit() {
    onEdit(trade.tradeId)
  }

  return (
    <button type="button" className={styles.row} onClick={handleEdit}>
      <span>
        <span className={styles.ticker}>{trade.ticker}</span>
        <span className={styles.detail}>
          {formatShortDate(trade.buyDate)} to {formatShortDate(trade.sellDate)} · fees{' '}
          {formatEuro(fees)} · tax {formatEuro(tax)}
        </span>
      </span>
      <span className={`${styles.amount} ${styles[getTone(net)]}`}>
        {formatSignedEuro(net)}
        <span className={styles.returnRatio}>{formatPercent(returnRatio)}</span>
      </span>
    </button>
  )
}
