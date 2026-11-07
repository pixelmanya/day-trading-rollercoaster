import { describe, expect, test } from 'vitest'

import {
  CHART_HEIGHT,
  CHART_WIDTH,
  computeChartGeometry,
  computeHighlightPath,
  computeNiceTicks,
  computeSegmentPath,
  computeSelectionBand,
  findNearestPointIndex,
  getSteppedIndex,
  pickLabelIndices,
  toChartRatio,
  toHeightPercent,
  toTooltipPosition,
  toWidthPercent,
} from './chart'

describe('computeChartGeometry', () => {
  test('draws a flat line before the first closed trade', () => {
    expect(computeChartGeometry([1000], [1000], 1000)).toEqual({
      kind: 'flat',
      lineY: CHART_HEIGHT / 2,
    })

    expect(computeChartGeometry([], [], 1000)).toEqual({ kind: 'flat', lineY: CHART_HEIGHT / 2 })
  })

  test('draws straight lines from the start budget to each later balance', () => {
    const geometry = computeChartGeometry([100, 150], [100, 150], 100)

    // x runs from the padding (8) to width − padding (512). The data spans 92.5–157.5 with
    // headroom, mapped onto y 142 (bottom) to 8 (top): 100 → 126.54, 150 → 23.46
    expect(geometry).toMatchObject({
      kind: 'line',
      linePath: expect.stringMatching(/^M8,126\.5\d+ L512,23\.4\d+$/),
      areaPath: expect.stringMatching(/ L512,150 L8,150 Z$/),
      baselineY: expect.closeTo(126.538, 3),
      endX: 512,
      endY: expect.closeTo(23.462, 3),
    })
  })

  test('draws the balance before fees and tax, and the gap down to the real balance', () => {
    const geometry = computeChartGeometry([100, 140], [100, 150], 100)

    // The scale covers both lines, so the gross line reaches the top and the net line stays below
    expect(geometry).toMatchObject({
      kind: 'line',
      grossPath: expect.stringMatching(/^M8,126\.5\d+ L512,23\.4\d+$/),
      costAreaPath: expect.stringMatching(
        /^M8,126\.5\d+ L512,23\.4\d+ L512,44\.0\d+ L8,126\.5\d+ Z$/,
      ),
    })
  })

  test('still gives a flat series a visible range', () => {
    const geometry = computeChartGeometry([100, 100], [100, 100], 100)

    expect(geometry.kind === 'line' && geometry.endY).toBeCloseTo(CHART_HEIGHT / 2, 6)
  })
})

const points = [
  { positionX: 8, positionY: 100 },
  { positionX: 260, positionY: 50 },
  { positionX: 512, positionY: 80 },
]

describe('chart points', () => {
  test('come with step geometry, one per balance', () => {
    const geometry = computeChartGeometry([100, 150, 120], [100, 150, 120], 100)

    expect(geometry.kind === 'line' && geometry.points.map(({ positionX }) => positionX)).toEqual([
      8, 260, 512,
    ])
  })
})

describe('computeHighlightPath', () => {
  test('draws the slope from the balance before a trade to the balance after it', () => {
    expect(computeHighlightPath(points, 1)).toBe('M8,100 L260,50')
    expect(computeHighlightPath(points, 2)).toBe('M260,50 L512,80')
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
  test('anchors in percent, to the right of the point', () => {
    expect(
      toTooltipPosition({ positionX: CHART_WIDTH / 4, positionY: CHART_HEIGHT / 2 }, null),
    ).toEqual({
      left: 25,
      top: 50,
      isFlipped: false,
      placement: 'middle',
    })
  })

  test('flips left near the right edge and moves off the slope leading in', () => {
    const point = { positionX: CHART_WIDTH, positionY: 60 }

    // Rising into the point (previous lower on screen): the slope is below-left, so go above
    expect(toTooltipPosition(point, { positionX: 400, positionY: 90 })).toMatchObject({
      isFlipped: true,
      placement: 'above',
    })

    expect(toTooltipPosition(point, { positionX: 400, positionY: 30 }).placement).toBe('below')
    expect(toTooltipPosition(point, null).placement).toBe('middle')
  })
})

describe('computeNiceTicks', () => {
  test('picks round values inside the range', () => {
    expect(computeNiceTicks(1012, 1188, 4)).toEqual([1050, 1100, 1150])
    expect(computeNiceTicks(0, 1, 4)).toEqual([0, 0.25, 0.5, 0.75, 1])
  })

  test('keeps float noise out of the values', () => {
    expect(computeNiceTicks(0.1, 0.7, 3)).toEqual([0.2, 0.4, 0.6])
  })
})

describe('chart ticks', () => {
  test('come with line geometry, inside the visible range', () => {
    const geometry = computeChartGeometry([1000, 1100, 1050], [1000, 1100, 1050], 1000)
    const ticks = geometry.kind === 'line' ? geometry.ticks : []

    expect(ticks.map(({ amount }) => amount)).toEqual([1000, 1050, 1100])
    expect(ticks.every(({ positionY }) => positionY > 0 && positionY < CHART_HEIGHT)).toBe(true)
  })
})

describe('pickLabelIndices', () => {
  test('labels every point when few, else spreads labels including both ends', () => {
    expect(pickLabelIndices(3, 4)).toEqual([0, 1, 2])
    expect(pickLabelIndices(10, 4)).toEqual([0, 3, 6, 9])
    expect(pickLabelIndices(5, 4)).toEqual([0, 1, 3, 4])
  })
})

describe('computeSegmentPath', () => {
  test('runs through the selected points', () => {
    expect(computeSegmentPath(points, 1, 2)).toBe('M260,50 L512,80')
  })
})

describe('computeSelectionBand', () => {
  test('spans the selected points, or nothing when one is missing', () => {
    expect(computeSelectionBand(points, 0, 2)).toEqual({ left: 8, width: 504 })
    expect(computeSelectionBand(points, 1, 9)).toBeNull()
  })
})

describe('toWidthPercent and toHeightPercent', () => {
  test('convert viewBox positions to percentages', () => {
    expect(toWidthPercent(CHART_WIDTH / 2)).toBe(50)
    expect(toHeightPercent(CHART_HEIGHT)).toBe(100)
  })
})
