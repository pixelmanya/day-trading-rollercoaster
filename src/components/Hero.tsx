import { useState } from 'react'

import { useChartInteraction } from '../hooks/useChartInteraction'
import { computeChartGeometry } from '../lib/chart'
import type { ChartPoint } from '../lib/chart'
import { formatEuro } from '../lib/format'
import { computeRangeSeries } from '../lib/ranges'
import type { ChartRange } from '../lib/ranges'
import { summarizeSelection } from '../lib/selection'
import type { Summary } from '../lib/types'
import { BalanceChart } from './BalanceChart'
import { CostLegend } from './CostLegend'
import { HeroDelta } from './HeroDelta'
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

const noPoints: readonly ChartPoint[] = []

/** The balance after tax, its change over the chosen range or selection, and the chart. */
export function Hero({ summary: { balance, closedResults }, start, today }: HeroProps) {
  const [range, setRange] = useState<ChartRange>('ALL')
  const series = computeRangeSeries(closedResults, { start, range, today })

  const geometry = computeChartGeometry(
    series.points.map(({ balance: pointBalance }) => pointBalance),
    series.points.map(({ grossBalance }) => grossBalance),
    series.startBalance,
  )

  const interaction = useChartInteraction(geometry.kind === 'line' ? geometry.points : noPoints)
  const { selection, handleClearSelection } = interaction
  const selected = selection === null ? null : summarizeSelection(series.points, selection)
  const balanceText = formatEuro(balance)

  function handleSelectRange(nextRange: ChartRange) {
    setRange(nextRange)
    handleClearSelection()
  }

  return (
    <section className={styles.hero} aria-label="Balance">
      <span className={styles.label}>Balance after tax</span>
      {/* Keyed by its text, so a new balance fades in */}
      <div key={balanceText} className={styles.balance}>
        {balanceText}
      </div>
      <HeroDelta
        change={series.change}
        changeRatio={series.changeRatio}
        caption={range === 'ALL' ? `from ${formatEuro(start)}` : rangeCaptions[range]}
        selection={selected}
        onClearSelection={handleClearSelection}
      />
      <BalanceChart
        geometry={geometry}
        points={series.points}
        interaction={interaction}
        selected={selected}
      />
      {series.points.length > 1 ? (
        <CostLegend costs={series.costs} costShare={series.costShare} />
      ) : null}
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
