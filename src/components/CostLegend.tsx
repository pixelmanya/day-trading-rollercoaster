import { formatEuro, formatShare } from '../lib/format'

import styles from './CostLegend.module.css'

interface CostLegendProps {
  /** Fees and tax of the trades in the period, in €. */
  readonly costs: number
  /** Their share of the gain before costs; null when there was no such gain. */
  readonly costShare: number | null
}

/** Names the chart's faint line and the gap under it: what fees and tax took. */
export function CostLegend({ costs, costShare }: CostLegendProps) {
  return (
    <p className={styles.legend}>
      <span className={styles.entry}>
        <span className={styles.grossSwatch} aria-hidden="true" />
        Before fees and tax
      </span>
      <span className={styles.entry}>
        <span className={styles.costSwatch} aria-hidden="true" />
        <span>
          Fees and tax took <strong className={styles.amount}>{formatEuro(costs)}</strong>
          {costShare === null ? null : ` · ${formatShare(costShare)} of the gains`}
        </span>
      </span>
    </p>
  )
}
