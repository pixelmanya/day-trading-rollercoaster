import { useId, useState } from 'react'
import type { ChangeEvent } from 'react'

import { downloadTextFile } from '../browser/download'
import type { Action } from '../lib/reducer'
import { createExportFileName, parseImport, serializeExport } from '../lib/transfer'
import type { AppState } from '../lib/types'
import { Button } from './Button'
import { ConfirmButton } from './ConfirmButton'

import styles from './TransferActions.module.css'

interface TransferActionsProps {
  readonly appState: AppState
  /** Dates the export file. */
  readonly today: string
  /** Receives the action that replaces the log with an imported one, once confirmed. */
  readonly onSubmit: (action: Action) => void
}

/** Export the log as a JSON file, or replace it with one exported before. */
export function TransferActions({ appState, today, onSubmit }: TransferActionsProps) {
  const inputId = useId()
  const [imported, setImported] = useState<AppState | null>(null)
  const [error, setError] = useState('')

  function handleExport() {
    downloadTextFile({
      fileName: createExportFileName(today),
      text: serializeExport(appState, today),
      mimeType: 'application/json',
    })
  }

  async function handleFileChange({ currentTarget }: ChangeEvent<HTMLInputElement>) {
    const [file] = currentTarget.files ?? []
    const outcome = parseImport((await file?.text()) ?? '')

    setImported(outcome.isSuccess ? outcome.output : null)
    setError(outcome.isSuccess ? '' : outcome.error.message)
  }

  function handleConfirmImport() {
    if (imported !== null) {
      onSubmit({ type: 'replaceState', state: imported })
    }
  }

  return (
    <div className={styles.transfer}>
      <Button variant="quiet" onClick={handleExport}>
        Export JSON
      </Button>
      <label className={styles.importLabel} htmlFor={inputId}>
        Import JSON
        <input
          id={inputId}
          className={styles.fileInput}
          type="file"
          accept="application/json,.json"
          onChange={handleFileChange}
        />
      </label>
      {imported === null ? null : (
        <ConfirmButton
          variant="danger"
          label={`Replace log with ${formatTradeCount(imported.trades.length)}`}
          confirmLabel="Tap again to replace your log"
          onConfirm={handleConfirmImport}
        />
      )}
      {/* Inserted with its text, so screen readers announce it */}
      {error === '' ? null : (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

/** "1 trade", "12 trades". */
function formatTradeCount(count: number): string {
  return `${count} ${count === 1 ? 'trade' : 'trades'}`
}
