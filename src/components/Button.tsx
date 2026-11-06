import type { ReactNode } from 'react'

import styles from './Button.module.css'

interface ButtonProps {
  readonly variant: 'primary' | 'ghost' | 'danger' | 'quiet'
  readonly onClick: () => void
  readonly children: ReactNode
}

/** A sheet action button. */
export function Button({ variant, onClick, children }: ButtonProps) {
  return (
    <button type="button" className={styles[variant]} onClick={onClick}>
      {children}
    </button>
  )
}
