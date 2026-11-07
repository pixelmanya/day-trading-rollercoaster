import { getTone } from '../lib/calc'
import { formatEuro, formatPercent, formatShortDate, formatSignedEuro } from '../lib/format'
import type { SelectionSummary } from '../lib/selection'
import { Icon } from './Icon'

import styles from './HeroDelta.module.css'

interface HeroDeltaProps {
  readonly change: number
  readonly changeRatio: number
  /** What the change covers, e.g. "past month". */
  readonly caption: string
  /** A selected stretch of the chart; while set, it replaces the range's change. */
  readonly selection: SelectionSummary | null
  readonly onClearSelection: () => void
}

/** The change chip under the balance: over the range, or over a selected stretch. */
export function HeroDelta({
  change,
  changeRatio,
  caption,
  selection,
  onClearSelection,
}: HeroDeltaProps) {
  if (selection === null) {
    return (
      <div className={styles.delta}>
        <ChangeChip change={change} changeRatio={changeRatio} />
        <span className={styles.from}>{caption}</span>
      </div>
    )
  }

  const { fromDate, toDate, tradeCount, costs } = selection

  return (
    <div className={styles.delta} aria-live="polite">
      <ChangeChip change={selection.change} changeRatio={selection.changeRatio} />
      <span className={styles.from}>
        {formatEnd(fromDate)} → {formatEnd(toDate)} · {tradeCount}{' '}
        {tradeCount === 1 ? 'trade' : 'trades'} · {formatEuro(costs)} fees and tax
      </span>
      <button type="button" className={styles.clearButton} onClick={onClearSelection}>
        <Icon name="close" />
        Clear
      </button>
    </div>
  )
}

interface ChangeChipProps {
  readonly change: number
  readonly changeRatio: number
}

function ChangeChip({ change, changeRatio }: ChangeChipProps) {
  return (
    <span className={`${styles.chip} ${styles[getTone(change)]}`}>
      {formatSignedEuro(change)} · {formatPercent(changeRatio)}
    </span>
  )
}

/** A selection end: its sell date, or "Start" for the period's starting point. */
function formatEnd(isoDate: string | null): string {
  return isoDate === null ? 'Start' : formatShortDate(isoDate)
}
