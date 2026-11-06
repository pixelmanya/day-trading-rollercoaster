import type { ReactNode } from 'react'

import styles from './List.module.css'

interface ListProps {
  readonly isEmpty: boolean
  /** What to say when there are no rows. */
  readonly emptyText: string
  readonly children: ReactNode
}

/** A card of rows, or a short note when there are none. */
export function List({ isEmpty, emptyText, children }: ListProps) {
  return (
    <div className={styles.list}>
      {isEmpty ? <div className={styles.empty}>{emptyText}</div> : children}
    </div>
  )
}
