import { describe, expect, test } from 'vitest'

import {
  CHART_HEIGHT,
  CHART_WIDTH,
  computeChartGeometry,
  computeHighlightPath,
  findNearestPointIndex,
  getSteppedIndex,
  toChartRatio,
  toTooltipPosition,
} from './chart'

describe('computeChartGeometry', () => {
  test('draws a flat line before the first closed trade', () => {
    expect(computeChartGeometry([1000], 1000)).toEqual({ kind: 'flat', lineY: CHART_HEIGHT / 2 })
    expect(computeChartGeometry([], 1000)).toEqual({ kind: 'flat', lineY: CHART_HEIGHT / 2 })
  })

  test('steps from the start budget to each later balance', () => {
    const geometry = computeChartGeometry([100, 150], 100)

    // x runs from the padding (8) to width − padding (512). The data spans 92.5–157.5 with
    // headroom, mapped onto y 142 (bottom) to 8 (top): 100 → 126.54, 150 → 23.46
    expect(geometry).toMatchObject({
      kind: 'steps',
      linePath: expect.stringMatching(/^M8,126\.5\d+ L512,126\.5\d+ L512,23\.4\d+$/),
      areaPath: expect.stringMatching(/ L512,150 L8,150 Z$/),
      baselineY: expect.closeTo(126.538, 3),
      endX: 512,
      endY: expect.closeTo(23.462, 3),
    })
  })

  test('still gives a flat series a visible range', () => {
    const geometry = computeChartGeometry([100, 100], 100)

    expect(geometry.kind === 'steps' && geometry.endY).toBeCloseTo(CHART_HEIGHT / 2, 6)
  })
})

const points = [
  { positionX: 8, positionY: 100 },
  { positionX: 260, positionY: 50 },
  { positionX: 512, positionY: 80 },
]

describe('chart points', () => {
  test('come with step geometry, one per balance', () => {
    const geometry = computeChartGeometry([100, 150, 120], 100)

    expect(geometry.kind === 'steps' && geometry.points.map(({ positionX }) => positionX)).toEqual([
      8, 260, 512,
    ])
  })
})

describe('computeHighlightPath', () => {
  test("draws a trade's jump and its run to the next point", () => {
    expect(computeHighlightPath(points, 1)).toBe('M260,100 L260,50 L512,50')
  })

  test('draws only the jump for the last point', () => {
    expect(computeHighlightPath(points, 2)).toBe('M512,50 L512,80')
  })

  test('draws nothing for the starting point or an index outside the points', () => {
    expect(computeHighlightPath(points, 0)).toBe('')
    expect(computeHighlightPath(points, 5)).toBe('')
  })
})

describe('findNearestPointIndex', () => {
  test('picks the point closest to the pointer', () => {
    expect(findNearestPointIndex(points, 0)).toBe(0)
    expect(findNearestPointIndex(points, 0.55)).toBe(1)
    expect(findNearestPointIndex(points, 1)).toBe(2)
  })
})

describe('toChartRatio', () => {
  test('measures the pointer across the box and clamps to it', () => {
    const box = { left: 100, width: 200 }

    expect(toChartRatio(150, box)).toBe(0.25)
    expect(toChartRatio(50, box)).toBe(0)
    expect(toChartRatio(400, box)).toBe(1)
  })
})

describe('getSteppedIndex', () => {
  test('moves within the points and starts from the last point', () => {
    expect(getSteppedIndex(1, 1, 3)).toBe(2)
    expect(getSteppedIndex(2, 1, 3)).toBe(2)
    expect(getSteppedIndex(0, -1, 3)).toBe(0)
    expect(getSteppedIndex(null, -1, 3)).toBe(1)
  })
})

describe('toTooltipPosition', () => {
  test('anchors in percent and flips near the right edge', () => {
    expect(toTooltipPosition({ positionX: CHART_WIDTH / 4, positionY: CHART_HEIGHT / 2 })).toEqual({
      left: 25,
      top: 50,
      isFlipped: false,
    })

    expect(toTooltipPosition({ positionX: CHART_WIDTH, positionY: 0 }).isFlipped).toBe(true)
  })
})
