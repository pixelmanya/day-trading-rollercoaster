import { useState } from 'react'

import { createSaveSettingsAction, createSettingsFields } from '../lib/forms'
import type { SettingsFields } from '../lib/forms'
import type { Action } from '../lib/reducer'
import type { Settings } from '../lib/types'
import { Button } from './Button'
import { Field } from './Field'
import { FormLayout } from './FormLayout'
import { SaveActions } from './SaveActions'

interface SettingsFormProps {
  readonly settings: Settings
  readonly onSubmit: (action: Action) => void
  readonly onCancel: () => void
}

/** Start budget, tax rate and allowance, plus resetting the experiment. */
export function SettingsForm({ settings, onSubmit, onCancel }: SettingsFormProps) {
  const [fields, setFields] = useState(() => createSettingsFields(settings))
  const [error, setError] = useState('')
  const [isResetArmed, setIsResetArmed] = useState(false)

  function handleFieldChange(fieldName: keyof SettingsFields, text: string) {
    setFields((current) => ({ ...current, [fieldName]: text }))
  }

  function handleSave() {
    const outcome = createSaveSettingsAction(fields)

    if (outcome.isSuccess) {
      onSubmit(outcome.output)
    } else {
      setError(outcome.error)
    }
  }

  function handleReset() {
    // A second tap confirms, so one slip can't wipe the log
    if (isResetArmed) {
      onSubmit({ type: 'resetExperiment' })
    } else {
      setIsResetArmed(true)
    }
  }

  const resetLabel = isResetArmed ? 'Tap again to delete everything' : 'Reset experiment'

  return (
    <FormLayout
      error={error}
      actions={<SaveActions label="Save settings" onCancel={onCancel} onSave={handleSave} />}
      extraActions={
        <Button variant="danger" onClick={handleReset}>
          {resetLabel}
        </Button>
      }
    >
      <Field
        label="Start budget (€)"
        name="start"
        text={fields.start}
        onChange={handleFieldChange}
        isFullWidth
      />
      <Field
        label="Tax rate (%)"
        name="taxRate"
        text={fields.taxRate}
        onChange={handleFieldChange}
      />
      <Field
        label="Allowance left (€)"
        name="allowance"
        text={fields.allowance}
        onChange={handleFieldChange}
      />
    </FormLayout>
  )
}
