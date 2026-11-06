import { computeBalanceSeries, getTone } from '../lib/calc'
import { computeChartGeometry } from '../lib/chart'
import { formatEuro, formatPercent, formatSignedEuro } from '../lib/format'
import type { Summary } from '../lib/types'
import { BalanceChart } from './BalanceChart'

import styles from './Hero.module.css'

interface HeroProps {
  readonly summary: Summary
  readonly start: number
}

/** The balance after tax, its change since the start, and the balance chart. */
export function Hero({
  summary: { balance, change, changeRatio, closedResults },
  start,
}: HeroProps) {
  const geometry = computeChartGeometry(computeBalanceSeries(closedResults, start), start)
  const balanceText = formatEuro(balance)

  return (
    <section className={styles.hero} aria-label="Balance">
      <div className={styles.heroTop}>
        <span className={styles.label}>Balance after tax</span>
      </div>
      {/* Keyed by its text, so a new balance fades in */}
      <div key={balanceText} className={styles.balance}>
        {balanceText}
      </div>
      <div className={styles.delta}>
        <span className={`${styles.chip} ${styles[getTone(change)]}`}>
          {formatSignedEuro(change)} · {formatPercent(changeRatio)}
        </span>
        <span className={styles.from}>from {formatEuro(start)}</span>
      </div>
      <BalanceChart geometry={geometry} />
      {closedResults.length > 0 ? null : (
        <p className={styles.chartNote}>The line starts moving once you close your first trade.</p>
      )}
    </section>
  )
}
