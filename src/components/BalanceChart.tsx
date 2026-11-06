import { useId } from 'react'

import { CHART_HEIGHT, CHART_WIDTH } from '../lib/chart'
import type { ChartGeometry } from '../lib/chart'

import styles from './BalanceChart.module.css'

interface BalanceChartProps {
  readonly geometry: ChartGeometry
}

type StepGeometry = Extract<ChartGeometry, { readonly kind: 'steps' }>

interface StepChartProps {
  readonly geometry: StepGeometry
}

const chartViewBox = `0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`

/** Step line of the balance after each closed trade, over a dashed start-budget baseline. */
export function BalanceChart({ geometry }: BalanceChartProps) {
  if (geometry.kind === 'flat') {
    return (
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
    )
  }

  // Keyed by the path, so the line draws in again whenever a trade closes
  return <StepChart key={geometry.linePath} geometry={geometry} />
}

function StepChart({ geometry }: StepChartProps) {
  const gradientId = useId()
  const endPoint = `M${geometry.endX},${geometry.endY} h0`

  return (
    <svg
      className={styles.chart}
      viewBox={chartViewBox}
      preserveAspectRatio="none"
      // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- role="img" with a label is the accessible pattern for a meaningful SVG
      role="img"
      aria-label="Balance after each closed trade"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--line)" stopOpacity="0.22" />
          <stop offset="100%" stopColor="var(--line)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <line
        className={styles.baseline}
        x1="0"
        x2={CHART_WIDTH}
        y1={geometry.baselineY}
        y2={geometry.baselineY}
        strokeDasharray="3 5"
        vectorEffect="non-scaling-stroke"
      />
      <g className={styles.reveal}>
        <path d={geometry.areaPath} fill={`url(#${gradientId})`} />
        <path className={styles.line} d={geometry.linePath} vectorEffect="non-scaling-stroke" />
      </g>
      {/* Zero-length lines with round caps stay round when the chart stretches */}
      <path className={styles.pulse} d={endPoint} vectorEffect="non-scaling-stroke" />
      <path className={styles.endPoint} d={endPoint} vectorEffect="non-scaling-stroke" />
    </svg>
  )
}
