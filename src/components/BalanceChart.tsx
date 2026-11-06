import { CHART_HEIGHT, CHART_WIDTH } from '../lib/chart'
import type { ChartGeometry } from '../lib/chart'

import styles from './BalanceChart.module.css'

interface BalanceChartProps {
  readonly geometry: ChartGeometry
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
          x1="0"
          x2={CHART_WIDTH}
          y1={geometry.lineY}
          y2={geometry.lineY}
          stroke="var(--line)"
          strokeWidth="2.5"
          strokeDasharray="6 7"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    )
  }

  return (
    <svg
      className={styles.chart}
      viewBox={chartViewBox}
      preserveAspectRatio="none"
      // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- role="img" with a label is the accessible pattern for a meaningful SVG
      role="img"
      aria-label="Balance after each closed trade"
    >
      <path d={geometry.areaPath} fill="var(--area)" />
      <line
        x1="0"
        x2={CHART_WIDTH}
        y1={geometry.baselineY}
        y2={geometry.baselineY}
        stroke="var(--muted)"
        strokeWidth="1"
        strokeDasharray="3 5"
        vectorEffect="non-scaling-stroke"
      />
      <path
        d={geometry.linePath}
        fill="none"
        stroke="var(--line)"
        strokeWidth="2.5"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      {/* A zero-length line with round caps: unlike a circle, it stays round when the chart stretches */}
      <path
        d={`M${geometry.endX},${geometry.endY} h0`}
        stroke="var(--line)"
        strokeWidth="10"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}
