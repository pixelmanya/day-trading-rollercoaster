import { useId } from 'react'

import { getTone } from '../lib/calc'
import {
  CHART_HEIGHT,
  CHART_WIDTH,
  computeHighlightPath,
  computeSegmentPath,
  computeSelectionBand,
} from '../lib/chart'
import type { ChartGeometry } from '../lib/chart'
import type { SelectionSummary } from '../lib/selection'
import type { Tone } from '../lib/types'

import styles from './BalanceChart.module.css'

interface LineChartGraphicProps {
  readonly geometry: Extract<ChartGeometry, { readonly kind: 'line' }>
  readonly hoveredIndex: number | null
  /** Colour of the hovered trade's slope; null for the starting point or no hover. */
  readonly hoveredTone: Tone | null
  /** A measured stretch to shade and colour, or null. */
  readonly selected: SelectionSummary | null
}

/** The SVG content of the line chart: fill, line, baseline, and the hover highlight. */
export function LineChartGraphic({
  geometry,
  hoveredIndex,
  hoveredTone,
  selected,
}: LineChartGraphicProps) {
  const gradientId = useId()
  const isDimmed = hoveredIndex !== null || selected !== null

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
      {selected === null ? null : <SelectionShade geometry={geometry} selected={selected} />}
      <g className={isDimmed ? `${styles.reveal} ${styles.dimmed}` : styles.reveal}>
        <path d={geometry.areaPath} fill={`url(#${gradientId})`} />
        <path className={styles.line} d={geometry.linePath} vectorEffect="non-scaling-stroke" />
      </g>
      {hoveredIndex === null ? (
        <EndMarker geometry={geometry} />
      ) : (
        <HoverMarker geometry={geometry} index={hoveredIndex} tone={hoveredTone} />
      )}
    </>
  )
}

interface MarkerProps {
  readonly geometry: LineChartGraphicProps['geometry']
}

/** The latest balance: a dot with a breathing ring. */
function EndMarker({ geometry: { endX, endY } }: MarkerProps) {
  const endPoint = `M${endX},${endY} h0`

  return (
    <>
      {/* Zero-length lines with round caps stay round when the chart stretches */}
      <path className={styles.pulse} d={endPoint} vectorEffect="non-scaling-stroke" />
      <path className={styles.endPoint} d={endPoint} vectorEffect="non-scaling-stroke" />
    </>
  )
}

interface HoverMarkerProps extends MarkerProps {
  readonly index: number
  readonly tone: Tone | null
}

/** The hovered trade: a dotted guide, its slope and its point in gain or loss colour. */
function HoverMarker({ geometry: { points }, index, tone }: HoverMarkerProps) {
  const point = points.at(index)
  const toneClass = tone === null ? styles.neutral : styles[tone]

  if (point === undefined) {
    return null
  }

  return (
    <>
      <line
        className={styles.guide}
        x1={point.positionX}
        x2={point.positionX}
        y1="0"
        y2={CHART_HEIGHT}
        strokeDasharray="2 4"
        vectorEffect="non-scaling-stroke"
      />
      <path
        className={`${styles.highlight} ${toneClass}`}
        d={computeHighlightPath(points, index)}
        vectorEffect="non-scaling-stroke"
      />
      <path
        className={`${styles.hoverPoint} ${toneClass}`}
        d={`M${point.positionX},${point.positionY} h0`}
        vectorEffect="non-scaling-stroke"
      />
    </>
  )
}

interface SelectionShadeProps {
  readonly geometry: LineChartGraphicProps['geometry']
  readonly selected: SelectionSummary
}

/** The selected stretch: a soft band behind it and its line in the stretch's gain or loss colour. */
function SelectionShade({ geometry: { points }, selected }: SelectionShadeProps) {
  const band = computeSelectionBand(points, selected.fromIndex, selected.toIndex)

  if (band === null) {
    return null
  }

  return (
    <>
      <rect
        className={styles.selectionBand}
        x={band.left}
        width={band.width}
        y="0"
        height={CHART_HEIGHT}
      />
      <path
        className={`${styles.selectionLine} ${styles[getTone(selected.change)]}`}
        d={computeSegmentPath(points, selected.fromIndex, selected.toIndex)}
        vectorEffect="non-scaling-stroke"
      />
    </>
  )
}
