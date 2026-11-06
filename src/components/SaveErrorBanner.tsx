import type { AppError } from '../lib/errors'

import styles from './SaveErrorBanner.module.css'

interface SaveErrorBannerProps {
  readonly error: AppError
  readonly onRetry: () => void
}

/** Visible "couldn't save" state with a retry; stays until a save succeeds. */
export function SaveErrorBanner({ error: { message }, onRetry }: SaveErrorBannerProps) {
  return (
    <div className={styles.banner} role="alert">
      <span>{message}</span>
      <button type="button" className={styles.retryButton} onClick={onRetry}>
        Try again
      </button>
    </div>
  )
}
