import { toHeightPercent, toWidthPercent } from '../lib/chart'
import type { ChartPoint, ChartTick } from '../lib/chart'
import { formatShortDate, formatWholeEuro } from '../lib/format'
import type { RangePoint } from '../lib/ranges'

import styles from './BalanceChart.module.css'

interface AxisProps {
  readonly ticks: readonly ChartTick[]
}

interface DateAxisProps {
  readonly points: readonly RangePoint[]
  readonly positions: readonly ChartPoint[]
  /** Indices of the points to label. */
  readonly labelIndices: readonly number[]
}

/** Balance labels beside the chart, at round values. */
export function BalanceAxis({ ticks }: AxisProps) {
  return (
    <div className={styles.balanceAxis} aria-hidden="true">
      {ticks.map(({ amount, positionY }) => (
        <span
          key={amount}
          className={styles.balanceLabel}
          style={{ insetBlockStart: `${toHeightPercent(positionY)}%` }}
        >
          {formatWholeEuro(amount)}
        </span>
      ))}
    </div>
  )
}

/** Date labels under the chart: the sell dates of evenly spread points. */
export function DateAxis({ points, positions, labelIndices }: DateAxisProps) {
  return (
    <div className={styles.dateAxis} aria-hidden="true">
      {labelIndices.map((index) => (
        <DateLabel key={index} point={points.at(index)} position={positions.at(index)} />
      ))}
    </div>
  )
}

interface DateLabelProps {
  readonly point: RangePoint | undefined
  readonly position: ChartPoint | undefined
}

function DateLabel({ point, position }: DateLabelProps) {
  if (point === undefined || position === undefined) {
    return null
  }

  const sellDate = point.closedResult?.trade.sellDate ?? null

  return (
    <span
      className={styles.dateLabel}
      style={{ insetInlineStart: `${toWidthPercent(position.positionX)}%` }}
    >
      {sellDate === null ? 'Start' : formatShortDate(sellDate)}
    </span>
  )
}
