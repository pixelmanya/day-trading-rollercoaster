import { useState } from 'react'
import type { KeyboardEvent, PointerEvent } from 'react'

import { findNearestPointIndex, getSteppedIndex, toChartRatio } from '../lib/chart'
import type { ChartPoint } from '../lib/chart'

/** Which chart point is highlighted, and the handlers that move the highlight. */
export interface ChartHover {
  /** The highlighted point, or null when the pointer is elsewhere. */
  readonly hoveredIndex: number | null
  readonly handlePointerMove: (event: PointerEvent<HTMLElement>) => void
  readonly handlePointerLeave: (event: PointerEvent<HTMLElement>) => void
  readonly handleKeyDown: (event: KeyboardEvent<HTMLElement>) => void
  readonly handleBlur: () => void
}

const keySteps: Readonly<Record<string, number>> = { ArrowLeft: -1, ArrowRight: 1 }

/** Highlight the chart point nearest the pointer or finger; arrow keys step between points. */
export function useChartHover(points: readonly ChartPoint[]): ChartHover {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  function handlePointerMove({ clientX, currentTarget }: PointerEvent<HTMLElement>) {
    const ratio = toChartRatio(clientX, currentTarget.getBoundingClientRect())

    setHoveredIndex(findNearestPointIndex(points, ratio))
  }

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    const step = keySteps[event.key]

    if (step === undefined) {
      return
    }

    event.preventDefault()
    setHoveredIndex((current) => getSteppedIndex(current, step, points.length))
  }

  // A finger "leaves" at the end of every tap; keep its point until the chart loses focus
  function handlePointerLeave({ pointerType }: PointerEvent<HTMLElement>) {
    if (pointerType !== 'touch') {
      setHoveredIndex(null)
    }
  }

  const handleBlur = () => setHoveredIndex(null)

  return { hoveredIndex, handlePointerMove, handlePointerLeave, handleKeyDown, handleBlur }
}
