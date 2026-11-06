import { getTone } from '../lib/calc'
import { formatEuro, formatOptionalSignedEuro, formatWinRate } from '../lib/format'
import type { Summary, Tone } from '../lib/types'

import styles from './StatsGrid.module.css'

interface StatsGridProps {
  readonly summary: Summary
}

interface StatProps {
  readonly figure: string
  readonly label: string
  /** Colours the figure as a gain or loss; null for neutral figures. */
  readonly tone: Tone | null
}

/** Six key figures, most important first: free cash, win rate, average, count, fees, tax. */
export function StatsGrid({
  summary: { closedResults, winRate, averageNet, cash, fees, tax },
}: StatsGridProps) {
  const averageTone = averageNet === null ? null : getTone(averageNet)

  return (
    <dl className={styles.stats}>
      <Stat figure={formatEuro(cash)} label="cash free" tone={null} />
      <Stat figure={formatWinRate(winRate)} label="win rate" tone={null} />
      <Stat
        figure={formatOptionalSignedEuro(averageNet)}
        label="avg per trade"
        tone={averageTone}
      />
      <Stat figure={String(closedResults.length)} label="closed trades" tone={null} />
      <Stat figure={formatEuro(fees)} label="fees paid" tone={null} />
      <Stat figure={formatEuro(tax)} label="tax so far" tone={null} />
    </dl>
  )
}

function Stat({ figure, label, tone }: StatProps) {
  const figureClass = tone === null ? styles.statFigure : `${styles.statFigure} ${styles[tone]}`

  return (
    <div className={styles.stat}>
      <dt className={styles.statLabel}>{label}</dt>
      <dd className={figureClass}>{figure}</dd>
    </div>
  )
}
