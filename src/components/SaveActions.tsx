import { Button } from './Button'

interface SaveActionsProps {
  /** The primary action's label, e.g. "Save settings". */
  readonly label: string
  readonly onCancel: () => void
  readonly onSave: () => void
}

/** Cancel next to a sheet form's primary action. */
export function SaveActions({ label, onCancel, onSave }: SaveActionsProps) {
  return (
    <>
      <Button variant="ghost" onClick={onCancel}>
        Cancel
      </Button>
      <Button variant="primary" onClick={onSave}>
        {label}
      </Button>
    </>
  )
}
