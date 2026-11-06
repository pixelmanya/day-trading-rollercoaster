import { ConfirmButton } from './ConfirmButton'

interface SettingsExtraActionsProps {
  readonly onLoadDemo: () => void
  readonly onReset: () => void
}

/** The settings sheet's actions that replace the log; each needs a second tap. */
export function SettingsExtraActions({ onLoadDemo, onReset }: SettingsExtraActionsProps) {
  return (
    <>
      <ConfirmButton
        variant="quiet"
        label="Load demo data"
        confirmLabel="Tap again to replace your log"
        onConfirm={onLoadDemo}
      />
      <ConfirmButton
        variant="danger"
        label="Reset experiment"
        confirmLabel="Tap again to delete everything"
        onConfirm={onReset}
      />
    </>
  )
}
