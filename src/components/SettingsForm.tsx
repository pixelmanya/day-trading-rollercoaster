import { useState } from 'react'

import { createDemoState, DEMO_SEED } from '../lib/demo'
import { createSaveSettingsAction, createSettingsFields } from '../lib/forms'
import type { SettingsFields } from '../lib/forms'
import type { Action } from '../lib/reducer'
import type { AppState } from '../lib/types'
import { Field } from './Field'
import { FormLayout } from './FormLayout'
import { SaveActions } from './SaveActions'
import { SettingsExtraActions } from './SettingsExtraActions'
import { TransferActions } from './TransferActions'

interface SettingsFormProps {
  /** The log: its settings fill the form, and all of it goes into an export. */
  readonly appState: AppState
  /** Dates the demo log and the export file. */
  readonly today: string
  readonly onSubmit: (action: Action) => void
  readonly onCancel: () => void
}

/** Start budget, tax rate and allowance, plus demo data, reset, export and import. */
export function SettingsForm({ appState, today, onSubmit, onCancel }: SettingsFormProps) {
  const [fields, setFields] = useState(() => createSettingsFields(appState.settings))
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
      extraActions={
        <>
          <SettingsExtraActions onLoadDemo={handleLoadDemo} onReset={handleReset} />
          <TransferActions appState={appState} today={today} onSubmit={onSubmit} />
        </>
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
