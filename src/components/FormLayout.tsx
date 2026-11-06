import type { ReactNode } from 'react'

import styles from './FormLayout.module.css'

interface FormLayoutProps {
  /** The fields, laid out in two columns. */
  readonly children: ReactNode
  /** Shown between the fields and the error line, e.g. the sell preview. */
  readonly preview?: ReactNode
  readonly error: string
  readonly actions: ReactNode
  readonly extraActions?: ReactNode
}

/** Fields, optional preview, error line and action rows of a sheet form. */
export function FormLayout({ children, preview, error, actions, extraActions }: FormLayoutProps) {
  return (
    <>
      <div className={styles.fields}>{children}</div>
      {preview}
      <div className={styles.errorText} role="alert">
        {error}
      </div>
      <div className={styles.actions}>{actions}</div>
      {extraActions === undefined ? null : <div className={styles.actions}>{extraActions}</div>}
    </>
  )
}
