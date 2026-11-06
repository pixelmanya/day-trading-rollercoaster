import type { BuyFields } from '../lib/forms'
import { Field } from './Field'

interface BuyFieldGroupProps {
  readonly fields: BuyFields
  readonly onChange: (fieldName: keyof BuyFields, text: string) => void
}

/** Ticker, shares, price, fee and date of a buy, as grid items of a FormLayout. */
export function BuyFieldGroup({ fields, onChange }: BuyFieldGroupProps) {
  return (
    <>
      <Field
        label="Ticker"
        name="ticker"
        text={fields.ticker}
        onChange={onChange}
        kind="text"
        placeholder="KDK"
      />
      <Field
        label="Shares"
        name="shares"
        text={fields.shares}
        onChange={onChange}
        placeholder="1095"
      />
      <Field
        label="Buy price"
        name="buyPrice"
        text={fields.buyPrice}
        onChange={onChange}
        placeholder="0,9126"
      />
      <Field label="Buy fees (€)" name="buyFee" text={fields.buyFee} onChange={onChange} />
      <Field
        label="Buy date"
        name="buyDate"
        text={fields.buyDate}
        onChange={onChange}
        kind="date"
        isFullWidth
      />
    </>
  )
}
