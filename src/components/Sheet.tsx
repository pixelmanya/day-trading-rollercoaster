import { useEffect, useRef } from 'react'
import type { MouseEvent, ReactNode } from 'react'

import styles from './Sheet.module.css'

interface SheetProps {
  readonly isOpen: boolean
  readonly title: string
  readonly hint: string
  readonly onClose: () => void
  readonly children: ReactNode
}

/** A bottom sheet on a modal <dialog>. Escape and a click on the backdrop close it. */
export function Sheet({ isOpen, title, hint, onClose, children }: SheetProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    updateDialog(dialogRef.current, isOpen)
  }, [isOpen])

  function handleClick({ target, currentTarget }: MouseEvent<HTMLDialogElement>) {
    // Clicks on the sheet bubble up with a different target; only the backdrop closes
    if (target === currentTarget) {
      onClose()
    }
  }

  return (
    // oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions -- backdrop click is a pointer shortcut; keyboard users close with Escape (native) or Cancel
    <dialog ref={dialogRef} className={styles.dialog} onClose={onClose} onClick={handleClick}>
      <div className={styles.sheet}>
        <h3 className={styles.title}>{title}</h3>
        <p className={styles.hint}>{hint}</p>
        {children}
      </div>
    </dialog>
  )
}

/** Open or close the native dialog to match `isOpen`, focusing the first field on open. */
function updateDialog(dialog: HTMLDialogElement | null, isOpen: boolean): void {
  if (dialog === null || dialog.open === isOpen) {
    return
  }

  if (isOpen) {
    dialog.showModal()
    dialog.querySelector('input')?.focus()

    return
  }

  dialog.close()
}
