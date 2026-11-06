/** Size of the balance chart's SVG viewBox. */
export const CHART_WIDTH = 520
export const CHART_HEIGHT = 150

const CHART_PADDING = 8
/** Headroom above and below the data, as a share of its range. */
const HEADROOM = 0.15

/** Where the tooltip flips to the left of its point, as a share of the width. */
const TOOLTIP_FLIP_RATIO = 0.6

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
      /** Height of the start budget, drawn as a dashed baseline. */
      readonly baselineY: number
      readonly endX: number
      readonly endY: number
      /** One point per balance, in the order given. */
      readonly points: readonly ChartPoint[]
    }

interface ChartScale {
  readonly toX: (index: number) => number
  readonly toY: (amount: number) => number
}

interface LineTrace {
  readonly last: number
  readonly segments: readonly string[]
}

/** Chart geometry for a balance series (start budget first) from computeBalanceSeries. */
export function computeChartGeometry(balances: readonly number[], start: number): ChartGeometry {
  const [firstBalance, ...laterBalances] = balances

  if (firstBalance === undefined || laterBalances.length === 0) {
    return { kind: 'flat', lineY: CHART_HEIGHT / 2 }
  }

  const { toX, toY } = createChartScale(balances, start)
  const firstTrace: LineTrace = { last: firstBalance, segments: [] }

  const { last: lastBalance, segments } = laterBalances.reduce(
    ({ segments: traced }, amount, offset) => ({
      last: amount,
      segments: [...traced, `L${toX(offset + 1)},${toY(amount)}`],
    }),
    firstTrace,
  )

  const linePath = [`M${toX(0)},${toY(firstBalance)}`, ...segments].join(' ')
  const endX = toX(laterBalances.length)

  return {
    kind: 'line',
    linePath,
    areaPath: `${linePath} L${endX},${CHART_HEIGHT} L${toX(0)},${CHART_HEIGHT} Z`,
    baselineY: toY(start),
    endX,
    endY: toY(lastBalance),
    points: balances.map((amount, index) => ({ positionX: toX(index), positionY: toY(amount) })),
  }
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

function createChartScale(balances: readonly number[], start: number): ChartScale {
  const lowest = Math.min(...balances, start)
  const highest = Math.max(...balances, start)
  // A flat series still needs a visible range
  const span = highest - lowest || Math.max(start * 0.1, 1)
  const bottom = lowest - span * HEADROOM
  const top = highest + span * HEADROOM
  const lastIndex = balances.length - 1
  const innerWidth = CHART_WIDTH - 2 * CHART_PADDING
  const innerHeight = CHART_HEIGHT - 2 * CHART_PADDING

  return {
    toX: (index) => CHART_PADDING + (innerWidth * index) / lastIndex,
    toY: (amount) =>
      CHART_HEIGHT - CHART_PADDING - (innerHeight * (amount - bottom)) / (top - bottom),
  }
}
