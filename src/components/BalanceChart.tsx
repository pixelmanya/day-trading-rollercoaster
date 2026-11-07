import type { ReactNode } from 'react'

import type { ChartInteraction } from '../hooks/useChartInteraction'
import { getTone } from '../lib/calc'
import { CHART_HEIGHT, CHART_WIDTH, pickLabelIndices, toTooltipPosition } from '../lib/chart'
import type { ChartGeometry, ChartPoint } from '../lib/chart'
import { formatEuro, formatShortDate, formatSignedEuro } from '../lib/format'
import type { RangePoint } from '../lib/ranges'
import type { SelectionSummary } from '../lib/selection'
import type { Tone } from '../lib/types'
import { BalanceAxis, DateAxis } from './ChartAxes'
import { ChartTooltip } from './ChartTooltip'
import { LineChartGraphic } from './LineChartGraphic'

import styles from './BalanceChart.module.css'

type LineGeometry = Extract<ChartGeometry, { readonly kind: 'line' }>

interface BalanceChartProps {
  readonly geometry: ChartGeometry
  /** The points behind the geometry, for tooltips and labels: same order and count. */
  readonly points: readonly RangePoint[]
  readonly interaction: ChartInteraction
  readonly selected: SelectionSummary | null
}

interface InteractiveChartProps {
  readonly geometry: LineGeometry
  readonly points: readonly RangePoint[]
  readonly interaction: ChartInteraction
  readonly selected: SelectionSummary | null
}

const chartViewBox = `0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`
const MAX_DATE_LABELS = 4

/** The balance over time: hover, touch or arrow through it; drag to measure a stretch. */
export function BalanceChart({ geometry, points, interaction, selected }: BalanceChartProps) {
  if (geometry.kind === 'flat') {
    return (
      <div className={styles.chartArea}>
        <svg
          className={styles.chart}
          viewBox={chartViewBox}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <line
            className={styles.baseline}
            x1="0"
            x2={CHART_WIDTH}
            y1={geometry.lineY}
            y2={geometry.lineY}
            strokeDasharray="6 7"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>
    )
  }

  // Keyed by the path, so the line draws in again whenever the data or range changes
  return (
    <InteractiveChart
      key={geometry.linePath}
      geometry={geometry}
      points={points}
      interaction={interaction}
      selected={selected}
    />
  )
}

function InteractiveChart({ geometry, points, interaction, selected }: InteractiveChartProps) {
  const { hoveredIndex } = interaction
  const lastIndex = points.length - 1
  const focusIndex = hoveredIndex ?? lastIndex
  const hoveredPoint = hoveredIndex === null ? undefined : points.at(hoveredIndex)
  const hoveredPosition = hoveredIndex === null ? undefined : geometry.points.at(hoveredIndex)

  return (
    <div
      className={styles.chartArea}
      // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- no native element draws a chart; the slider role makes its points reachable by keyboard and screen readers
      role="slider"
      tabIndex={0}
      aria-label="Balance after each closed trade. Shift and arrow keys select a stretch."
      aria-valuemin={0}
      aria-valuemax={lastIndex}
      aria-valuenow={focusIndex}
      aria-valuetext={describePoint(points.at(focusIndex))}
      onKeyDown={interaction.handleKeyDown}
      onBlur={interaction.handleBlur}
    >
      <ChartPlot
        geometry={geometry}
        interaction={interaction}
        selected={selected}
        hoveredPoint={hoveredPoint}
      >
        {hoveredPoint && hoveredPosition ? (
          <ChartTooltip
            point={hoveredPoint}
            position={toTooltipPosition(hoveredPosition, findPreviousPoint(geometry, hoveredIndex))}
          />
        ) : null}
      </ChartPlot>
      <BalanceAxis ticks={geometry.ticks} />
      <DateAxis
        points={points}
        positions={geometry.points}
        labelIndices={pickLabelIndices(points.length, MAX_DATE_LABELS)}
      />
    </div>
  )
}

interface ChartPlotProps {
  readonly geometry: LineGeometry
  readonly interaction: ChartInteraction
  readonly selected: SelectionSummary | null
  readonly hoveredPoint: RangePoint | undefined
  /** Overlays positioned in percent of the plot, such as the tooltip. */
  readonly children: ReactNode
}

/** The drawing itself; pointer positions are measured against it, so they match the points. */
function ChartPlot({ geometry, interaction, selected, hoveredPoint, children }: ChartPlotProps) {
  return (
    // oxlint-disable-next-line jsx-a11y/no-static-element-interactions -- pointer gestures on the plot; the surrounding slider offers the same by keyboard
    <div
      className={styles.plot}
      onPointerDown={interaction.handlePointerDown}
      onPointerMove={interaction.handlePointerMove}
      onPointerUp={interaction.handlePointerUp}
      onPointerLeave={interaction.handlePointerLeave}
    >
      <svg
        className={styles.chart}
        viewBox={chartViewBox}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <LineChartGraphic
          geometry={geometry}
          hoveredIndex={interaction.hoveredIndex}
          hoveredTone={getHoveredTone(hoveredPoint)}
          selected={selected}
        />
      </svg>
      {children}
    </div>
  )
}

/** The point before `index`, whose slope leads into it; null for the first point. */
function findPreviousPoint({ points }: LineGeometry, index: number | null): ChartPoint | null {
  if (index === null || index < 1) {
    return null
  }

  return points.at(index - 1) ?? null
}

/** Gain or loss colour for a hovered trade; null for the starting point or no hover. */
function getHoveredTone(point: RangePoint | undefined): Tone | null {
  const closedResult = point?.closedResult ?? null

  return closedResult === null ? null : getTone(closedResult.net)
}

/** Spoken value of a point: "05.11. KDK +148,47 €, balance 1.148,47 €". */
function describePoint(point: RangePoint | undefined): string {
  if (point === undefined) {
    return ''
  }

  const { balance, closedResult } = point

  const label =
    closedResult === null
      ? 'Start of period'
      : `${formatShortDate(closedResult.trade.sellDate)} ${closedResult.trade.ticker} ${formatSignedEuro(closedResult.net)}, fees ${formatEuro(closedResult.fees)}, tax ${formatEuro(closedResult.tax)}`

  return `${label}, balance ${formatEuro(balance)}`
}
