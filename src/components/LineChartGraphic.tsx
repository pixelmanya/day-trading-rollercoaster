import { useId } from 'react'

import { CHART_HEIGHT, CHART_WIDTH, computeHighlightPath } from '../lib/chart'
import type { ChartGeometry } from '../lib/chart'
import type { Tone } from '../lib/types'

import styles from './BalanceChart.module.css'

interface LineChartGraphicProps {
  readonly geometry: Extract<ChartGeometry, { readonly kind: 'line' }>
  readonly hoveredIndex: number | null
  /** Colour of the hovered trade's slope; null for the starting point or no hover. */
  readonly hoveredTone: Tone | null
}

/** The SVG content of the line chart: fill, line, baseline, and the hover highlight. */
export function LineChartGraphic({ geometry, hoveredIndex, hoveredTone }: LineChartGraphicProps) {
  const gradientId = useId()
  const hovered = hoveredIndex === null ? undefined : geometry.points.at(hoveredIndex)
  const endPoint = `M${geometry.endX},${geometry.endY} h0`
  const toneClass = hoveredTone === null ? styles.neutral : styles[hoveredTone]

  return (
    <>
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
      <g className={hovered ? `${styles.reveal} ${styles.dimmed}` : styles.reveal}>
        <path d={geometry.areaPath} fill={`url(#${gradientId})`} />
        <path className={styles.line} d={geometry.linePath} vectorEffect="non-scaling-stroke" />
      </g>
      {hovered === undefined ? (
        <>
          {/* Zero-length lines with round caps stay round when the chart stretches */}
          <path className={styles.pulse} d={endPoint} vectorEffect="non-scaling-stroke" />
          <path className={styles.endPoint} d={endPoint} vectorEffect="non-scaling-stroke" />
        </>
      ) : (
        <>
          <line
            className={styles.guide}
            x1={hovered.positionX}
            x2={hovered.positionX}
            y1="0"
            y2={CHART_HEIGHT}
            strokeDasharray="2 4"
            vectorEffect="non-scaling-stroke"
          />
          <path
            className={`${styles.highlight} ${toneClass}`}
            d={computeHighlightPath(geometry.points, hoveredIndex ?? 0)}
            vectorEffect="non-scaling-stroke"
          />
          <path
            className={`${styles.hoverPoint} ${toneClass}`}
            d={`M${hovered.positionX},${hovered.positionY} h0`}
            vectorEffect="non-scaling-stroke"
          />
        </>
      )}
    </>
  )
}
