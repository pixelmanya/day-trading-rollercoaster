import type { SellFields } from '../lib/forms'
import { Field } from './Field'

import styles from './SellFieldGroup.module.css'

interface SellFieldGroupProps {
  readonly fields: SellFields
  readonly onChange: (fieldName: keyof SellFields, text: string) => void
  /** Show a "Sell" heading, when the group follows the buy fields. */
  readonly hasHeading: boolean
}

/** Price, fee and date of a sell, as grid items of a FormLayout. */
export function SellFieldGroup({ fields, onChange, hasHeading }: SellFieldGroupProps) {
  return (
    <>
      {hasHeading ? <div className={styles.groupLabel}>Sell</div> : null}
      <Field
        label="Sell price"
        name="sellPrice"
        text={fields.sellPrice}
        onChange={onChange}
        placeholder="1,05"
      />
      <Field label="Sell fees (€)" name="sellFee" text={fields.sellFee} onChange={onChange} />
      <Field
        label="Sell date"
        name="sellDate"
        text={fields.sellDate}
        onChange={onChange}
        kind="date"
        isFullWidth
      />
    </>
  )
}
