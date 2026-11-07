import type { RangePoint } from './ranges'

/** A stretch of chart points chosen by dragging: where it began and where it is now. */
export interface ChartSelection {
  readonly anchorIndex: number
  readonly focusIndex: number
}

/** What a selected stretch measures. Amounts in €. */
export interface SelectionSummary {
  readonly fromIndex: number
  readonly toIndex: number
  readonly change: number
  /** change ÷ the balance at the selection's start. */
  readonly changeRatio: number
  /** Trades closed inside the selection: every point after its first. */
  readonly tradeCount: number
  /** Fees and tax of the trades inside the selection. */
  readonly costs: number
  /** Sell date of the trade at each end; null for the period's starting point. */
  readonly fromDate: string | null
  readonly toDate: string | null
}

/**
 * Measure a selection, whichever way it was dragged. Null until it spans two points, or when
 * its indices fall outside the points (e.g. after the data changed).
 */
export function summarizeSelection(
  points: readonly RangePoint[],
  { anchorIndex, focusIndex }: ChartSelection,
): SelectionSummary | null {
  const fromIndex = Math.min(anchorIndex, focusIndex)
  const toIndex = Math.max(anchorIndex, focusIndex)
  const [startPoint] = points.slice(fromIndex, fromIndex + 1)
  const [endPoint] = points.slice(toIndex, toIndex + 1)

  if (fromIndex === toIndex || startPoint === undefined || endPoint === undefined) {
    return null
  }

  const change = endPoint.balance - startPoint.balance

  return {
    fromIndex,
    toIndex,
    change,
    changeRatio: change / startPoint.balance,
    tradeCount: toIndex - fromIndex,
    costs: getCostsSoFar(endPoint) - getCostsSoFar(startPoint),
    fromDate: getSellDate(startPoint),
    toDate: getSellDate(endPoint),
  }
}

/** Fees and tax the period's trades cost up to this point. */
function getCostsSoFar({ balance, grossBalance }: RangePoint): number {
  return grossBalance - balance
}

function getSellDate({ closedResult }: RangePoint): string | null {
  return closedResult?.trade.sellDate ?? null
}

/**
 * The selection after extending it to `focusIndex` (Shift + arrow): keeps an existing anchor,
 * or starts one at `startIndex`.
 */
export function extendSelection(
  current: ChartSelection | null,
  startIndex: number,
  focusIndex: number,
): ChartSelection {
  return { anchorIndex: current?.anchorIndex ?? startIndex, focusIndex }
}
