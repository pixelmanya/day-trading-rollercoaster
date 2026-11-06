import { formatEuro, formatNumber } from '../lib/format'
import type { Settings } from '../lib/types'

import styles from './TaxFootnote.module.css'

interface TaxFootnoteProps {
  readonly settings: Settings
}

/** How tax is calculated, with the current rate and allowance. */
export function TaxFootnote({ settings: { taxRate, allowance } }: TaxFootnoteProps) {
  return (
    <p className={styles.footnote}>
      Tax uses {formatNumber(taxRate, 3)} % above a {formatEuro(allowance)} allowance per calendar
      year, with losses offset against gains in the same year. Change both in Settings.
    </p>
  )
}
