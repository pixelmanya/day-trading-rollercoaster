import { computeBalanceSeries, getTone } from '../lib/calc'
import { computeChartGeometry } from '../lib/chart'
import { formatEuro, formatPercent, formatSignedEuro } from '../lib/format'
import type { Summary } from '../lib/types'
import { BalanceChart } from './BalanceChart'

import styles from './Hero.module.css'

interface HeroProps {
  readonly summary: Summary
  readonly start: number
  readonly onOpenSettings: () => void
}

/** Balance after tax, its change against the start budget, and the balance chart. */
export function Hero({
  summary: { balance, change, changeRatio, closedResults },
  start,
  onOpenSettings,
}: HeroProps) {
  const geometry = computeChartGeometry(computeBalanceSeries(closedResults, start), start)

  return (
    <section className={styles.hero}>
      <div className={styles.heroTop}>
        <div className={styles.title}>Started with {formatEuro(start)}</div>
        <button type="button" className={styles.settingsButton} onClick={onOpenSettings}>
          Settings
        </button>
      </div>
      <div className={styles.balance}>{formatEuro(balance)}</div>
      <br />
      <div className={styles.delta}>
        <span className={styles[getTone(change)]}>
          {formatSignedEuro(change)} ({formatPercent(changeRatio)})
        </span>{' '}
        <span className={styles.from}>after tax</span>
      </div>
      <BalanceChart geometry={geometry} />
      {closedResults.length > 0 ? null : (
        <div className={styles.chartNote}>
          The line starts moving once you close your first trade.
        </div>
      )}
    </section>
  )
}
