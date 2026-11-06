/** Size of the balance chart's SVG viewBox. */
export const CHART_WIDTH = 520
export const CHART_HEIGHT = 150

const CHART_PADDING = 8
/** Headroom above and below the data, as a share of its range. */
const HEADROOM = 0.15

/** SVG geometry of the balance chart, in viewBox units. */
export type ChartGeometry =
  | {
      /** Before the first closed trade: a dashed line across the middle. */
      readonly kind: 'flat'
      readonly lineY: number
    }
  | {
      /** A step line: the balance changes at each closed trade. */
      readonly kind: 'steps'
      readonly linePath: string
      readonly areaPath: string
      /** Height of the start budget, drawn as a dashed baseline. */
      readonly baselineY: number
      readonly endX: number
      readonly endY: number
    }

interface ChartScale {
  readonly toX: (index: number) => number
  readonly toY: (amount: number) => number
}

interface StepTrace {
  readonly previous: number
  readonly segments: readonly string[]
}

/** Chart geometry for a balance series (start budget first) from computeBalanceSeries. */
export function computeChartGeometry(balances: readonly number[], start: number): ChartGeometry {
  const [firstBalance, ...laterBalances] = balances

  if (firstBalance === undefined || laterBalances.length === 0) {
    return { kind: 'flat', lineY: CHART_HEIGHT / 2 }
  }

  const { toX, toY } = createChartScale(balances, start)
  const firstTrace: StepTrace = { previous: firstBalance, segments: [] }

  const { previous: lastBalance, segments } = laterBalances.reduce(
    ({ previous, segments: traced }, amount, offset) => ({
      previous: amount,
      segments: [
        ...traced,
        `L${toX(offset + 1)},${toY(previous)} L${toX(offset + 1)},${toY(amount)}`,
      ],
    }),
    firstTrace,
  )

  const linePath = [`M${toX(0)},${toY(firstBalance)}`, ...segments].join(' ')
  const endX = toX(laterBalances.length)

  return {
    kind: 'steps',
    linePath,
    areaPath: `${linePath} L${endX},${CHART_HEIGHT} L${toX(0)},${CHART_HEIGHT} Z`,
    baselineY: toY(start),
    endX,
    endY: toY(lastBalance),
  }
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
