/** Size of the balance chart's SVG viewBox. */
export const CHART_WIDTH = 520
export const CHART_HEIGHT = 150

const CHART_PADDING = 8
/** Headroom above and below the data, as a share of its range. */
const HEADROOM = 0.15

/** Where the tooltip flips to the left of its point, as a share of the width. */
const TOOLTIP_FLIP_RATIO = 0.6

/** Steps a tick interval can take, times a power of ten. */
const NICE_STEPS = [1, 2, 2.5, 5, 10] as const
/** About this many balance labels on the y axis. */
const Y_TICK_TARGET = 4

/** A balance label on the y axis: its amount and height in viewBox units. */
export interface ChartTick {
  readonly amount: number
  readonly positionY: number
}

/** A selected stretch of the chart, in viewBox units. */
export interface ChartBand {
  readonly left: number
  readonly width: number
}

/** A balance point in viewBox units. */
export interface ChartPoint {
  readonly positionX: number
  readonly positionY: number
}

/** Where a tooltip sits next to its point, vertically. */
export type TooltipPlacement = 'middle' | 'above' | 'below'

/**
 * Tooltip anchor in percent of the chart's box. It opens to the right of its point; near the
 * right edge it flips left and moves above or below the point, away from the highlighted slope.
 */
export interface TooltipPosition {
  readonly left: number
  readonly top: number
  readonly isFlipped: boolean
  readonly placement: TooltipPlacement
}

/** SVG geometry of the balance chart, in viewBox units. */
export type ChartGeometry =
  | {
      /** Before the first closed trade: a dashed line across the middle. */
      readonly kind: 'flat'
      readonly lineY: number
    }
  | {
      /** Straight lines from balance to balance: a mountain silhouette of the account. */
      readonly kind: 'line'
      readonly linePath: string
      readonly areaPath: string
      /** The balance before fees and tax, drawn faintly above the real one. */
      readonly grossPath: string
      /** The gap between the gross and net lines: what fees and tax took. */
      readonly costAreaPath: string
      /** Height of the start budget, drawn as a dashed baseline. */
      readonly baselineY: number
      readonly endX: number
      readonly endY: number
      /** One point per balance, in the order given. */
      readonly points: readonly ChartPoint[]
      /** Rounded balances to label on the y axis, inside the visible range. */
      readonly ticks: readonly ChartTick[]
    }

interface LineTrace {
  readonly last: number
  readonly linePath: string
}

interface ChartScale {
  readonly toX: (index: number) => number
  readonly toY: (amount: number) => number
  /** Lowest and highest visible balance, headroom included. */
  readonly bottom: number
  readonly top: number
}

/**
 * Chart geometry for a balance series (the period's start first) and the same series before
 * fees and tax, one gross balance per balance.
 */
export function computeChartGeometry(
  balances: readonly number[],
  grossBalances: readonly number[],
  start: number,
): ChartGeometry {
  const [firstBalance, ...laterBalances] = balances

  if (firstBalance === undefined || laterBalances.length === 0) {
    return { kind: 'flat', lineY: CHART_HEIGHT / 2 }
  }

  const { toX, toY, bottom, top } = createChartScale(balances, grossBalances, start)
  const points = toChartPoints(balances, { toX, toY })
  const grossPath = computeSegmentPath(toChartPoints(grossBalances, { toX, toY }), 0, points.length)

  const { last: lastBalance, linePath } = computeLineTrace(firstBalance, laterBalances, {
    toX,
    toY,
  })

  const endX = toX(laterBalances.length)

  return {
    kind: 'line',
    linePath,
    areaPath: `${linePath} L${endX},${CHART_HEIGHT} L${toX(0)},${CHART_HEIGHT} Z`,
    grossPath,
    costAreaPath: `${grossPath} ${computeReturnPath(points)} Z`,
    baselineY: toY(start),
    endX,
    endY: toY(lastBalance),
    points,
    ticks: computeTickPositions({ toY, bottom, top }),
  }
}

/** The net line's path and the last balance it reaches. */
function computeLineTrace(
  firstBalance: number,
  laterBalances: readonly number[],
  { toX, toY }: Pick<ChartScale, 'toX' | 'toY'>,
): LineTrace {
  const firstTrace: LineTrace = { last: firstBalance, linePath: `M${toX(0)},${toY(firstBalance)}` }

  return laterBalances.reduce(
    ({ linePath }, amount, offset) => ({
      last: amount,
      linePath: `${linePath} L${toX(offset + 1)},${toY(amount)}`,
    }),
    firstTrace,
  )
}

/** Round balances to label on the y axis, at their heights. */
function computeTickPositions({ toY, bottom, top }: Omit<ChartScale, 'toX'>): readonly ChartTick[] {
  return computeNiceTicks(bottom, top, Y_TICK_TARGET).map((amount) => ({
    amount,
    positionY: toY(amount),
  }))
}

/**
 * Round values between `low` and `high` for axis labels, about `target` of them, spaced by
 * 1, 2, 2.5 or 5 times a power of ten: (1012, 1188, 4) → [1050, 1100, 1150].
 */
export function computeNiceTicks(low: number, high: number, target: number): readonly number[] {
  const roughStep = (high - low) / target
  const magnitude = 10 ** Math.floor(Math.log10(roughStep))
  const step = Math.min(...NICE_STEPS.filter((nice) => nice * magnitude >= roughStep)) * magnitude
  const first = Math.ceil(low / step) * step
  const count = Math.floor((high - first) / step) + 1

  // Rounding keeps float noise (1100.0000000002) out of the labels
  return [...Array.from({ length: count }).keys()].map((index) =>
    Number((first + index * step).toFixed(6)),
  )
}

/**
 * Indices of points to label on the x axis: at most `maxLabels`, evenly spread, always the
 * first and the last.
 */
export function pickLabelIndices(count: number, maxLabels: number): readonly number[] {
  if (count <= maxLabels) {
    return [...Array.from({ length: count }).keys()]
  }

  const spread = [...Array.from({ length: maxLabels }).keys()].map((slot) =>
    Math.round((slot * (count - 1)) / (maxLabels - 1)),
  )

  return [...new Set(spread)]
}

/** Path through the points from index `fromIndex` to `toIndex`, inclusive. */
export function computeSegmentPath(
  points: readonly ChartPoint[],
  fromIndex: number,
  toIndex: number,
): string {
  return points
    .slice(fromIndex, toIndex + 1)
    .map(
      ({ positionX, positionY }, offset) => `${offset === 0 ? 'M' : 'L'}${positionX},${positionY}`,
    )
    .join(' ')
}

/** The band between two points, for shading a selection; null if either is missing. */
export function computeSelectionBand(
  points: readonly ChartPoint[],
  fromIndex: number,
  toIndex: number,
): ChartBand | null {
  const [start] = points.slice(fromIndex, fromIndex + 1)
  const [end] = points.slice(toIndex, toIndex + 1)

  if (start === undefined || end === undefined) {
    return null
  }

  return { left: start.positionX, width: end.positionX - start.positionX }
}

/**
 * The slope a trade drew, to highlight it: from the balance before it to the balance after.
 * Empty for the starting point (index 0) or an index outside the points.
 */
export function computeHighlightPath(points: readonly ChartPoint[], index: number): string {
  const [previous, current] = points.slice(Math.max(index - 1, 0), index + 1)

  if (index < 1 || previous === undefined || current === undefined) {
    return ''
  }

  return `M${previous.positionX},${previous.positionY} L${current.positionX},${current.positionY}`
}

/** Index of the point closest to a horizontal position given as a share (0–1) of the width. */
export function findNearestPointIndex(points: readonly ChartPoint[], ratio: number): number {
  const targetX = ratio * CHART_WIDTH
  const farAway = { index: 0, distance: Number.POSITIVE_INFINITY }

  return points.reduce((nearest, { positionX }, index) => {
    const distance = Math.abs(positionX - targetX)

    return distance < nearest.distance ? { index, distance } : nearest
  }, farAway).index
}

/** A pointer's horizontal position as a share (0–1) of a box, clamped to the box. */
export function toChartRatio(
  clientX: number,
  { left, width }: Pick<DOMRect, 'left' | 'width'>,
): number {
  return Math.min(1, Math.max(0, (clientX - left) / width))
}

/** The point index after an arrow key: `step` from `current` (or from the last point). */
export function getSteppedIndex(current: number | null, step: number, count: number): number {
  return Math.min(count - 1, Math.max(0, (current ?? count - 1) + step))
}

/**
 * Where to anchor a point's tooltip, in percent of the chart's box.
 *
 * @param previous The point before it, whose slope leads in from the left; null for the first.
 */
export function toTooltipPosition(
  { positionX, positionY }: ChartPoint,
  previous: ChartPoint | null,
): TooltipPosition {
  const isFlipped = positionX > CHART_WIDTH * TOOLTIP_FLIP_RATIO

  return {
    left: (positionX / CHART_WIDTH) * 100,
    top: (positionY / CHART_HEIGHT) * 100,
    isFlipped,
    placement: isFlipped ? getFlippedPlacement(positionY, previous) : 'middle',
  }
}

/** Above the point when its slope rises into it (comes from lower on screen), else below. */
function getFlippedPlacement(positionY: number, previous: ChartPoint | null): TooltipPlacement {
  if (previous === null) {
    return 'middle'
  }

  return previous.positionY >= positionY ? 'above' : 'below'
}

function toChartPoints(
  amounts: readonly number[],
  { toX, toY }: Pick<ChartScale, 'toX' | 'toY'>,
): readonly ChartPoint[] {
  return amounts.map((amount, index) => ({ positionX: toX(index), positionY: toY(amount) }))
}

/** Line segments through the points from last to first, to close an area. */
function computeReturnPath(points: readonly ChartPoint[]): string {
  return points
    .toReversed()
    .map(({ positionX, positionY }) => `L${positionX},${positionY}`)
    .join(' ')
}

/** The scale fits both lines and the start budget; x steps by the balances' count. */
function createChartScale(
  balances: readonly number[],
  grossBalances: readonly number[],
  start: number,
): ChartScale {
  const lowest = Math.min(...balances, ...grossBalances, start)
  const highest = Math.max(...balances, ...grossBalances, start)
  // A flat series still needs a visible range
  const span = highest - lowest || Math.max(start * 0.1, 1)
  const bottom = lowest - span * HEADROOM
  const top = highest + span * HEADROOM
  const lastIndex = balances.length - 1
  const innerWidth = CHART_WIDTH - 2 * CHART_PADDING
  const innerHeight = CHART_HEIGHT - 2 * CHART_PADDING

  return {
    bottom,
    top,
    toX: (index) => CHART_PADDING + (innerWidth * index) / lastIndex,
    toY: (amount) =>
      CHART_HEIGHT - CHART_PADDING - (innerHeight * (amount - bottom)) / (top - bottom),
  }
}

/** A horizontal viewBox position as a percentage of the chart's width. */
export function toWidthPercent(positionX: number): number {
  return (positionX / CHART_WIDTH) * 100
}

/** A vertical viewBox position as a percentage of the chart's height. */
export function toHeightPercent(positionY: number): number {
  return (positionY / CHART_HEIGHT) * 100
}
