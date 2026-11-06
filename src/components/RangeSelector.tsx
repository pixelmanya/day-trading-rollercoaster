import { CHART_RANGES } from '../lib/ranges'
import type { ChartRange } from '../lib/ranges'

import styles from './RangeSelector.module.css'

interface RangeSelectorProps {
  readonly selected: ChartRange
  readonly onSelect: (range: ChartRange) => void
}

interface RangeButtonProps {
  readonly range: ChartRange
  readonly isSelected: boolean
  readonly onSelect: (range: ChartRange) => void
}

const rangeLabels = {
  '1D': '1D',
  '1W': '1W',
  '1M': '1M',
  '3M': '3M',
  YTD: 'YTD',
  '1Y': '1Y',
  ALL: 'All',
} as const satisfies Record<ChartRange, string>

/** Chart time ranges as a row of toggle buttons: 1D · 1W · 1M · 3M · YTD · 1Y · All. */
export function RangeSelector({ selected, onSelect }: RangeSelectorProps) {
  return (
    <fieldset className={styles.selector}>
      <legend className={styles.legend}>Chart range</legend>
      {CHART_RANGES.map((range) => (
        <RangeButton
          key={range}
          range={range}
          isSelected={range === selected}
          onSelect={onSelect}
        />
      ))}
    </fieldset>
  )
}

function RangeButton({ range, isSelected, onSelect }: RangeButtonProps) {
  function handleClick() {
    onSelect(range)
  }

  return (
    <button
      type="button"
      className={isSelected ? `${styles.option} ${styles.selected}` : styles.option}
      aria-pressed={isSelected}
      onClick={handleClick}
    >
      {rangeLabels[range]}
    </button>
  )
}
