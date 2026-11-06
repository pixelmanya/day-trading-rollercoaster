import { describe, expect, test } from 'vitest'

import { CHART_HEIGHT, computeChartGeometry } from './chart'

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
