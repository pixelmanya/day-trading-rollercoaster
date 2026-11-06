import { useState } from 'react'

import { createDemoState, DEMO_SEED } from '../lib/demo'
import { createSaveSettingsAction, createSettingsFields } from '../lib/forms'
import type { SettingsFields } from '../lib/forms'
import type { Action } from '../lib/reducer'
import type { Settings } from '../lib/types'
import { Field } from './Field'
import { FormLayout } from './FormLayout'
import { SaveActions } from './SaveActions'
import { SettingsExtraActions } from './SettingsExtraActions'

interface SettingsFormProps {
  readonly settings: Settings
  /** Dates the demo log. */
  readonly today: string
  readonly onSubmit: (action: Action) => void
  readonly onCancel: () => void
}

/** Start budget, tax rate and allowance, plus resetting the experiment. */
export function SettingsForm({ settings, today, onSubmit, onCancel }: SettingsFormProps) {
  const [fields, setFields] = useState(() => createSettingsFields(settings))
  const [error, setError] = useState('')

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
    onSubmit({ type: 'resetExperiment' })
  }

  function handleLoadDemo() {
    onSubmit({ type: 'replaceState', state: createDemoState(today, DEMO_SEED) })
  }

  return (
    <FormLayout
      error={error}
      actions={<SaveActions label="Save settings" onCancel={onCancel} onSave={handleSave} />}
      extraActions={<SettingsExtraActions onLoadDemo={handleLoadDemo} onReset={handleReset} />}
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
