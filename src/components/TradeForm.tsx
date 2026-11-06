import { useState } from 'react'

import { isClosed } from '../lib/calc'
import {
  createBuyFields,
  createLogBuyAction,
  createSellFields,
  createUpdateTradeAction,
} from '../lib/forms'
import type { BuyFields, SellFields } from '../lib/forms'
import type { Action } from '../lib/reducer'
import type { Trade } from '../lib/types'
import { BuyFieldGroup } from './BuyFieldGroup'
import { FormLayout } from './FormLayout'
import { SaveActions } from './SaveActions'
import { SellFieldGroup } from './SellFieldGroup'
import { TradeEditActions } from './TradeEditActions'

interface TradeFormProps {
  /** The trade to edit, or null to log a new buy. */
  readonly trade: Trade | null
  readonly today: string
  readonly onSubmit: (action: Action) => void
  readonly onCancel: () => void
}

/** Log a buy, or edit a trade (both sides, if it is closed). */
export function TradeForm({ trade, today, onSubmit, onCancel }: TradeFormProps) {
  const isClosedTrade = trade !== null && isClosed(trade)
  const [buyFields, setBuyFields] = useState(() => createBuyFields(trade, today))
  const [sellFields, setSellFields] = useState(() => createSellFields(trade, today))
  const [error, setError] = useState('')

  function handleBuyFieldChange(fieldName: keyof BuyFields, text: string) {
    setBuyFields((current) => ({ ...current, [fieldName]: text }))
  }

  function handleSellFieldChange(fieldName: keyof SellFields, text: string) {
    setSellFields((current) => ({ ...current, [fieldName]: text }))
  }

  function handleSave() {
    const outcome =
      trade === null
        ? createLogBuyAction(buyFields, { tradeId: crypto.randomUUID(), today })
        : createUpdateTradeAction(
            trade,
            { buyFields, sellFields: isClosedTrade ? sellFields : null },
            today,
          )

    if (outcome.isSuccess) {
      onSubmit(outcome.output)
    } else {
      setError(outcome.error)
    }
  }

  return (
    <FormLayout
      error={error}
      actions={
        <SaveActions
          label={trade === null ? 'Log buy' : 'Save changes'}
          onCancel={onCancel}
          onSave={handleSave}
        />
      }
      extraActions={
        trade === null ? undefined : <TradeEditActions trade={trade} onSubmit={onSubmit} />
      }
    >
      <BuyFieldGroup fields={buyFields} onChange={handleBuyFieldChange} />
      {isClosedTrade ? (
        <SellFieldGroup fields={sellFields} onChange={handleSellFieldChange} hasHeading />
      ) : null}
    </FormLayout>
  )
}
