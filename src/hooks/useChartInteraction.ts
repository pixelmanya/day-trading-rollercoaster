import { useState } from 'react'
import type { Dispatch, KeyboardEvent, PointerEvent, SetStateAction } from 'react'

import { findNearestPointIndex, getSteppedIndex, toChartRatio } from '../lib/chart'
import type { ChartPoint } from '../lib/chart'
import { extendSelection } from '../lib/selection'
import type { ChartSelection } from '../lib/selection'

/** The chart's highlighted point and selection, and the handlers that change them. */
export interface ChartInteraction {
  /** The highlighted point, or null when the pointer is elsewhere. */
  readonly hoveredIndex: number | null
  /** The dragged (or Shift + arrow) selection, or null. */
  readonly selection: ChartSelection | null
  readonly handlePointerDown: (event: PointerEvent<HTMLElement>) => void
  readonly handlePointerMove: (event: PointerEvent<HTMLElement>) => void
  readonly handlePointerUp: (event: PointerEvent<HTMLElement>) => void
  readonly handlePointerLeave: (event: PointerEvent<HTMLElement>) => void
  readonly handleKeyDown: (event: KeyboardEvent<HTMLElement>) => void
  readonly handleBlur: () => void
  readonly handleClearSelection: () => void
}

type PointerHandlers = Pick<
  ChartInteraction,
  'handlePointerDown' | 'handlePointerMove' | 'handlePointerUp' | 'handlePointerLeave'
>

interface InteractionState {
  readonly points: readonly ChartPoint[]
  readonly hoveredIndex: number | null
  readonly selection: ChartSelection | null
  readonly isDragging: boolean
  readonly setHoveredIndex: Dispatch<SetStateAction<number | null>>
  readonly setSelection: Dispatch<SetStateAction<ChartSelection | null>>
  readonly setIsDragging: Dispatch<SetStateAction<boolean>>
}

const keySteps: Readonly<Record<string, number>> = { ArrowLeft: -1, ArrowRight: 1 }

/**
 * Hover, touch and keyboard for the chart. Moving highlights the nearest point; pressing and
 * dragging selects a stretch (a tap only highlights); arrows step, Shift + arrows extend the
 * selection, Escape clears it.
 */
export function useChartInteraction(points: readonly ChartPoint[]): ChartInteraction {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [selection, setSelection] = useState<ChartSelection | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const state = {
    points,
    hoveredIndex,
    selection,
    isDragging,
    setHoveredIndex,
    setSelection,
    setIsDragging,
  }

  return {
    hoveredIndex,
    selection,
    ...createPointerHandlers(state),
    handleKeyDown: createKeyHandler(state),
    handleBlur: () => setHoveredIndex(null),
    handleClearSelection: () => setSelection(null),
  }
}

function createPointerHandlers(state: InteractionState): PointerHandlers {
  const { points, selection, isDragging, setHoveredIndex, setSelection, setIsDragging } = state
  const isStretch = selection !== null && selection.anchorIndex !== selection.focusIndex

  const findIndex = ({ clientX, currentTarget }: PointerEvent<HTMLElement>): number =>
    findNearestPointIndex(points, toChartRatio(clientX, currentTarget.getBoundingClientRect()))

  return {
    handlePointerDown: (event) => {
      const index = findIndex(event)

      // Keep receiving moves while dragging past the chart's edge
      event.currentTarget.setPointerCapture(event.pointerId)
      setHoveredIndex(index)
      setSelection({ anchorIndex: index, focusIndex: index })
      setIsDragging(true)
    },
    handlePointerMove: (event) => {
      const index = findIndex(event)

      setHoveredIndex(index)

      setSelection((current) =>
        isDragging && current !== null ? { ...current, focusIndex: index } : current,
      )
    },
    handlePointerUp: ({ pointerType }) => {
      setIsDragging(false)
      // A tap selects nothing; it only highlights its point
      setSelection(isStretch ? selection : null)
      // After a drag on touch, the measured stretch speaks for itself: no tooltip over it
      setHoveredIndex((current) => (isStretch && pointerType === 'touch' ? null : current))
    },
    // A finger "leaves" at the end of every tap; keep its point until the chart loses focus
    handlePointerLeave: ({ pointerType }) => {
      setHoveredIndex((current) => (pointerType === 'touch' || isDragging ? current : null))
    },
  }
}

function createKeyHandler(state: InteractionState): ChartInteraction['handleKeyDown'] {
  const { points, hoveredIndex, setHoveredIndex, setSelection } = state

  return (event) => {
    const step = keySteps[event.key]

    if (event.key === 'Escape') {
      setSelection(null)
    }

    if (step === undefined) {
      return
    }

    event.preventDefault()
    const startIndex = hoveredIndex ?? points.length - 1
    const nextIndex = getSteppedIndex(hoveredIndex, step, points.length)

    setHoveredIndex(nextIndex)

    setSelection((current) =>
      event.shiftKey ? extendSelection(current, startIndex, nextIndex) : current,
    )
  }
}
