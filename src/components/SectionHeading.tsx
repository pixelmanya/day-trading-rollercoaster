import styles from './SectionHeading.module.css'

interface SectionHeadingProps {
  readonly title: string
  /** Small figure on the right, e.g. "1.000,00 € invested"; empty for none. */
  readonly meta: string
}

/** A list section's heading with an optional figure on the right. */
export function SectionHeading({ title, meta }: SectionHeadingProps) {
  return (
    <h2 className={styles.heading}>
      {title} <small className={styles.meta}>{meta}</small>
    </h2>
  )
}
