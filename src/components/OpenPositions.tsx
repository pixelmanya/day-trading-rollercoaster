import { formatEuro, formatNumber, formatShortDate } from '../lib/format'
import type { OpenPosition } from '../lib/types'
import { Icon } from './Icon'
import { List } from './List'
import { SectionHeading } from './SectionHeading'

import styles from './OpenPositions.module.css'

interface OpenPositionsProps {
  readonly positions: readonly OpenPosition[]
  readonly openCost: number
  readonly onEdit: (tradeId: string) => void
  readonly onSell: (tradeId: string) => void
}

interface OpenPositionRowProps {
  readonly position: OpenPosition
  readonly onEdit: (tradeId: string) => void
  readonly onSell: (tradeId: string) => void
}

/** The positions still held, each with edit and sell. */
export function OpenPositions({ positions, openCost, onEdit, onSell }: OpenPositionsProps) {
  const isEmpty = positions.length === 0

  return (
    <section aria-label="Open positions">
      <SectionHeading
        title="Open"
        count={positions.length}
        meta={isEmpty ? '' : `${formatEuro(openCost)} invested`}
      />
      <List isEmpty={isEmpty} emptyText="No open positions. Log a buy to start the next round.">
        {positions.map((position) => (
          <OpenPositionRow
            key={position.trade.tradeId}
            position={position}
            onEdit={onEdit}
            onSell={onSell}
          />
        ))}
      </List>
    </section>
  )
}

function OpenPositionRow({ position: { trade, cost }, onEdit, onSell }: OpenPositionRowProps) {
  function handleEdit() {
    onEdit(trade.tradeId)
  }

  function handleSell() {
    onSell(trade.tradeId)
  }

  return (
    <div className={styles.row}>
      <div className={styles.main}>
        <div className={styles.ticker}>{trade.ticker}</div>
        <div className={styles.detail}>
          {formatNumber(trade.shares, 0)} × {formatNumber(trade.buyPrice, 4)} € · since{' '}
          {formatShortDate(trade.buyDate)}
        </div>
      </div>
      <div className={styles.amount}>{formatEuro(cost)}</div>
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.editButton}
          aria-label={`Edit ${trade.ticker}`}
          onClick={handleEdit}
        >
          <Icon name="edit" />
        </button>
        <button type="button" className={styles.sellButton} onClick={handleSell}>
          Sell
        </button>
      </div>
    </div>
  )
}
