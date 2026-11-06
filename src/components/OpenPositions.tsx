import { formatEuro, formatNumber, formatShortDate } from '../lib/format'
import type { OpenPosition } from '../lib/types'
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

/** The positions still held, each with Edit and Log sell. */
export function OpenPositions({ positions, openCost, onEdit, onSell }: OpenPositionsProps) {
  const isEmpty = positions.length === 0

  return (
    <>
      <SectionHeading title="Open" meta={isEmpty ? '' : `${formatEuro(openCost)} invested`} />
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
    </>
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
      <div>
        <div className={styles.ticker}>{trade.ticker}</div>
        <div className={styles.detail}>
          {formatNumber(trade.shares, 0)} × {formatNumber(trade.buyPrice, 4)} € · bought{' '}
          {formatShortDate(trade.buyDate)}
        </div>
      </div>
      <div className={styles.amount}>
        {formatEuro(cost)}
        <div className={styles.editDetail}>
          <button type="button" className={styles.editButton} onClick={handleEdit}>
            Edit
          </button>
        </div>
      </div>
      <button type="button" className={styles.sellButton} onClick={handleSell}>
        Log sell
      </button>
    </div>
  )
}
