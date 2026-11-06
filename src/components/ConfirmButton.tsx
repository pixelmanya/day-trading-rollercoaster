import { useState } from 'react'

import { Button } from './Button'

interface ConfirmButtonProps {
  readonly label: string
  /** Shown after the first tap; a second tap confirms. */
  readonly confirmLabel: string
  readonly variant: 'danger' | 'quiet'
  readonly onConfirm: () => void
}

/** A button for destructive actions: the first tap arms it, the second one confirms. */
export function ConfirmButton({ label, confirmLabel, variant, onConfirm }: ConfirmButtonProps) {
  const [isArmed, setIsArmed] = useState(false)

  function handleClick() {
    if (isArmed) {
      onConfirm()
    } else {
      setIsArmed(true)
    }
  }

  return (
    <Button variant={variant} onClick={handleClick}>
      {isArmed ? confirmLabel : label}
    </Button>
  )
}
