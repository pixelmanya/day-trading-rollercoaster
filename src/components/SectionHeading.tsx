import styles from './SectionHeading.module.css'

interface SectionHeadingProps {
  readonly title: string
  readonly count: number
  /** Small figure on the right, e.g. "1.000,00 € invested"; empty for none. */
  readonly meta: string
}

/** A list section's heading: title with its count, and an optional figure on the right. */
export function SectionHeading({ title, count, meta }: SectionHeadingProps) {
  return (
    <h2 className={styles.heading}>
      <span className={styles.title}>
        {title}
        <span className={styles.count}>{count}</span>
      </span>
      <small className={styles.meta}>{meta}</small>
    </h2>
  )
}
