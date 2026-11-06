import { useState } from 'react'

import { getTone } from '../lib/calc'
import { computeChartGeometry } from '../lib/chart'
import { formatEuro, formatPercent, formatSignedEuro } from '../lib/format'
import { computeRangeSeries } from '../lib/ranges'
import type { ChartRange } from '../lib/ranges'
import type { Summary } from '../lib/types'
import { BalanceChart } from './BalanceChart'
import { RangeSelector } from './RangeSelector'

import styles from './Hero.module.css'

interface HeroProps {
  readonly summary: Summary
  readonly start: number
  readonly today: string
}

/** How the change chip describes each range; ALL names the start budget instead. */
const rangeCaptions = {
  '1D': 'today',
  '1W': 'past week',
  '1M': 'past month',
  '3M': 'past 3 months',
  YTD: 'this year',
  '1Y': 'past year',
  ALL: '',
} as const satisfies Record<ChartRange, string>

/** The balance after tax, its change over the chosen range, and the balance chart. */
export function Hero({ summary: { balance, closedResults }, start, today }: HeroProps) {
  const [range, setRange] = useState<ChartRange>('ALL')
  const series = computeRangeSeries(closedResults, { start, range, today })
  const balances = series.points.map(({ balance: pointBalance }) => pointBalance)
  const geometry = computeChartGeometry(balances, series.startBalance)
  const balanceText = formatEuro(balance)
  const caption = range === 'ALL' ? `from ${formatEuro(start)}` : rangeCaptions[range]

  function handleSelectRange(nextRange: ChartRange) {
    setRange(nextRange)
  }

  return (
    <section className={styles.hero} aria-label="Balance">
      <span className={styles.label}>Balance after tax</span>
      {/* Keyed by its text, so a new balance fades in */}
      <div key={balanceText} className={styles.balance}>
        {balanceText}
      </div>
      <div className={styles.delta}>
        <span className={`${styles.chip} ${styles[getTone(series.change)]}`}>
          {formatSignedEuro(series.change)} · {formatPercent(series.changeRatio)}
        </span>
        <span className={styles.from}>{caption}</span>
      </div>
      <BalanceChart geometry={geometry} points={series.points} />
      <ChartNote
        hasAnyTrades={closedResults.length > 0}
        hasTradesInRange={series.points.length > 1}
      />
      <RangeSelector selected={range} onSelect={handleSelectRange} />
    </section>
  )
}

interface ChartNoteProps {
  readonly hasAnyTrades: boolean
  readonly hasTradesInRange: boolean
}

function ChartNote({ hasAnyTrades, hasTradesInRange }: ChartNoteProps) {
  if (hasTradesInRange) {
    return null
  }

  return (
    <p className={styles.chartNote}>
      {hasAnyTrades
        ? 'No trades closed in this period.'
        : 'The line starts moving once you close your first trade.'}
    </p>
  )
}
