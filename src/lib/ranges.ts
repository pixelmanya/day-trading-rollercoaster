import { sumBy } from './calc'
import { addDays, addMonths, addYears } from './dates'
import type { ClosedResult } from './types'

/** Chart time ranges, as in trading apps. */
export const CHART_RANGES = ['1D', '1W', '1M', '3M', 'YTD', '1Y', 'ALL'] as const

export type ChartRange = (typeof CHART_RANGES)[number]

/** One point of the chart: the balance after a closed trade, or at the range's start. */
export interface RangePoint {
  readonly balance: number
  /** The trade that produced this balance; null for the range's starting point. */
  readonly closedResult: ClosedResult | null
}

/** The balance over a range and how it changed. Amounts in €. */
export interface RangeSeries {
  /** The range's start (balance before its first trade), then one point per trade in it. */
  readonly points: readonly [RangePoint, ...RangePoint[]]
  readonly startBalance: number
  readonly change: number
  readonly changeRatio: number
}

export interface RangeInput {
  readonly start: number
  readonly range: ChartRange
  readonly today: string
}

interface PointTrace {
  readonly balance: number
  readonly points: readonly [RangePoint, ...RangePoint[]]
}

const rangeStarts = {
  '1D': (today) => today,
  '1W': (today) => addDays(today, -6),
  '1M': (today) => addMonths(today, -1),
  '3M': (today) => addMonths(today, -3),
  YTD: (today) => `${today.slice(0, 4)}-01-01`,
  '1Y': (today) => addYears(today, -1),
  ALL: () => null,
} as const satisfies Record<ChartRange, (today: string) => string | null>

/** The first day a range covers (inclusive), or null for all time. */
export function getRangeStart(range: ChartRange, today: string): string | null {
  return rangeStarts[range](today)
}

/**
 * The balance series for a range. Trades closed before the range only set its starting
 * balance; a closed trade without a sell date counts as closed today.
 *
 * @param closedResults In tax order, as from computeClosedResults.
 */
export function computeRangeSeries(
  closedResults: readonly ClosedResult[],
  { start, range, today }: RangeInput,
): RangeSeries {
  const rangeStart = getRangeStart(range, today)

  const isInRange = ({ trade: { sellDate } }: ClosedResult): boolean =>
    rangeStart === null || (sellDate ?? today) >= rangeStart

  const startBalance =
    start +
    sumBy(
      closedResults.filter((closedResult) => !isInRange(closedResult)),
      ({ net }) => net,
    )

  const startTrace: PointTrace = {
    balance: startBalance,
    points: [{ balance: startBalance, closedResult: null }],
  }

  const { balance: endBalance, points } = closedResults
    .filter((closedResult) => isInRange(closedResult))
    .reduce((trace, closedResult) => addPoint(trace, closedResult), startTrace)

  const change = endBalance - startBalance

  return { points, startBalance, change, changeRatio: change / startBalance }
}

function addPoint({ balance, points }: PointTrace, closedResult: ClosedResult): PointTrace {
  const nextBalance = balance + closedResult.net

  return { balance: nextBalance, points: [...points, { balance: nextBalance, closedResult }] }
}
