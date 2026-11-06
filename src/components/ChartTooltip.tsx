import { getTone } from '../lib/calc'
import type { TooltipPosition } from '../lib/chart'
import { formatEuro, formatShortDate, formatSignedEuro } from '../lib/format'
import type { RangePoint } from '../lib/ranges'

import styles from './ChartTooltip.module.css'

interface ChartTooltipProps {
  readonly point: RangePoint
  /** Anchor in percent of the chart box, and whether to open to the left. */
  readonly position: TooltipPosition
}

/** The hovered point: date and ticker, the trade's result, and the balance after it. */
export function ChartTooltip({
  point: { balance, closedResult },
  position: { left, top, isFlipped },
}: ChartTooltipProps) {
  const className = isFlipped ? `${styles.tooltip} ${styles.flipped}` : styles.tooltip

  return (
    <div className={className} style={{ insetInlineStart: `${left}%`, insetBlockStart: `${top}%` }}>
      {closedResult === null ? (
        <span className={styles.title}>Start of period</span>
      ) : (
        <>
          <span className={styles.title}>
            {formatShortDate(closedResult.trade.sellDate)} · {closedResult.trade.ticker}
          </span>
          <span className={styles[getTone(closedResult.net)]}>
            {formatSignedEuro(closedResult.net)}
          </span>
        </>
      )}
      <span className={styles.balance}>Balance {formatEuro(balance)}</span>
    </div>
  )
}
