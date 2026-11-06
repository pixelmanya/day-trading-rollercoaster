import styles from './PreviewBadge.module.css'

const previewLabel = import.meta.env.VITE_PREVIEW_LABEL

/** Shows which PR and commit a preview build runs, so a stale preview is easy to spot. */
export function PreviewBadge() {
  return previewLabel === '' ? null : <div className={styles.badge}>{previewLabel}</div>
}
