import { useState } from 'react'

import { getTone } from '../lib/calc'
import { formatPercent, formatSignedEuro } from '../lib/format'
import { computeSellPreview, createLogSellAction, createSellFields } from '../lib/forms'
import type { SellFields } from '../lib/forms'
import type { Action } from '../lib/reducer'
import type { OpenTrade } from '../lib/types'
import { FormLayout } from './FormLayout'
import { SaveActions } from './SaveActions'
import { SellFieldGroup } from './SellFieldGroup'

import styles from './SellForm.module.css'

interface SellFormProps {
  readonly trade: OpenTrade
  readonly today: string
  readonly onSubmit: (action: Action) => void
  readonly onCancel: () => void
}

/** Close an open position, with a live pre-tax preview. */
export function SellForm({ trade, today, onSubmit, onCancel }: SellFormProps) {
  const [fields, setFields] = useState(() => createSellFields(trade, today))
  const [error, setError] = useState('')
  const preview = computeSellPreview(trade, fields)

  function handleFieldChange(fieldName: keyof SellFields, text: string) {
    setFields((current) => ({ ...current, [fieldName]: text }))
  }

  function handleSave() {
    const outcome = createLogSellAction(trade.tradeId, fields, today)

    if (outcome.isSuccess) {
      onSubmit(outcome.output)
    } else {
      setError(outcome.error)
    }
  }

  const previewLine =
    preview === null ? null : (
      <div className={styles.preview}>
        Before tax:{' '}
        <b className={styles[getTone(preview.pretax)]}>{formatSignedEuro(preview.pretax)}</b> (
        {formatPercent(preview.ratio)})
      </div>
    )

  return (
    <FormLayout
      error={error}
      actions={<SaveActions label="Log sell" onCancel={onCancel} onSave={handleSave} />}
      preview={previewLine}
    >
      <SellFieldGroup fields={fields} onChange={handleFieldChange} hasHeading={false} />
    </FormLayout>
  )
}
