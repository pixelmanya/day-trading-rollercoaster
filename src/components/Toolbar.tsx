import { Icon } from './Icon'

import styles from './Toolbar.module.css'

interface ToolbarProps {
  readonly onOpenSettings: () => void
  readonly onLogBuy: () => void
}

/**
 * Settings and "Log a buy", side by side: in a sticky top bar on phones, in the page's
 * top-right corner on desktop.
 */
export function Toolbar({ onOpenSettings, onLogBuy }: ToolbarProps) {
  return (
    <div className={styles.toolbar}>
      <button type="button" className={styles.settingsButton} onClick={onOpenSettings}>
        <Icon name="settings" />
        Settings
      </button>
      <button type="button" className={styles.logBuyButton} onClick={onLogBuy}>
        <Icon name="plus" />
        Log a buy
      </button>
    </div>
  )
}
