import { useChartHover } from '../hooks/useChartHover'
import { getTone } from '../lib/calc'
import { CHART_HEIGHT, CHART_WIDTH, toTooltipPosition } from '../lib/chart'
import type { ChartGeometry, ChartPoint } from '../lib/chart'
import { formatEuro, formatShortDate, formatSignedEuro } from '../lib/format'
import type { RangePoint } from '../lib/ranges'
import type { Tone } from '../lib/types'
import { ChartTooltip } from './ChartTooltip'
import { StepChartGraphic } from './StepChartGraphic'

import styles from './BalanceChart.module.css'

type StepGeometry = Extract<ChartGeometry, { readonly kind: 'steps' }>

interface BalanceChartProps {
  readonly geometry: ChartGeometry
  /** The points behind the geometry, for tooltips: same order and count. */
  readonly points: readonly RangePoint[]
}

interface InteractiveChartProps {
  readonly geometry: StepGeometry
  readonly points: readonly RangePoint[]
}

const chartViewBox = `0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`

/** The balance over time: a step line you can hover, touch or step through with arrow keys. */
export function BalanceChart({ geometry, points }: BalanceChartProps) {
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
  return <InteractiveChart key={geometry.linePath} geometry={geometry} points={points} />
}

function InteractiveChart({ geometry, points }: InteractiveChartProps) {
  const hover = useChartHover(geometry.points)
  const lastIndex = points.length - 1
  const focusIndex = hover.hoveredIndex ?? lastIndex
  const { hoveredPoint, hoveredPosition } = findHovered(hover.hoveredIndex, { geometry, points })

  return (
    <div
      className={styles.chartArea}
      // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- no native element draws a chart; the slider role makes its points reachable by keyboard and screen readers
      role="slider"
      tabIndex={0}
      aria-label="Balance after each closed trade"
      aria-valuemin={0}
      aria-valuemax={lastIndex}
      aria-valuenow={focusIndex}
      aria-valuetext={describePoint(points.at(focusIndex))}
      onPointerMove={hover.handlePointerMove}
      onPointerDown={hover.handlePointerMove}
      onPointerLeave={hover.handlePointerLeave}
      onKeyDown={hover.handleKeyDown}
      onBlur={hover.handleBlur}
    >
      <svg
        className={styles.chart}
        viewBox={chartViewBox}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <StepChartGraphic
          geometry={geometry}
          hoveredIndex={hover.hoveredIndex}
          hoveredTone={getHoveredTone(hoveredPoint)}
        />
      </svg>
      {hoveredPoint && hoveredPosition ? (
        <ChartTooltip point={hoveredPoint} position={toTooltipPosition(hoveredPosition)} />
      ) : null}
    </div>
  )
}

interface HoveredPoint {
  readonly hoveredPoint: RangePoint | undefined
  readonly hoveredPosition: ChartPoint | undefined
}

/** The hovered point's data and position, or undefined for both when nothing is hovered. */
function findHovered(
  hoveredIndex: number | null,
  { geometry, points }: InteractiveChartProps,
): HoveredPoint {
  if (hoveredIndex === null) {
    return { hoveredPoint: undefined, hoveredPosition: undefined }
  }

  return {
    hoveredPoint: points.at(hoveredIndex),
    hoveredPosition: geometry.points.at(hoveredIndex),
  }
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
      : `${formatShortDate(closedResult.trade.sellDate)} ${closedResult.trade.ticker} ${formatSignedEuro(closedResult.net)}`

  return `${label}, balance ${formatEuro(balance)}`
}
