import type { ReactNode } from 'react'

import styles from './List.module.css'

interface ListProps {
  readonly isEmpty: boolean
  /** What to say when there are no rows. */
  readonly emptyText: string
  readonly children: ReactNode
}

/** A card of rows, or a quiet dashed note when there are none. */
export function List({ isEmpty, emptyText, children }: ListProps) {
  return isEmpty ? (
    <p className={styles.empty}>{emptyText}</p>
  ) : (
    <div className={styles.list}>{children}</div>
  )
}
