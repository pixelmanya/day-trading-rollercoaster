import { findTrade, isOpen } from '../lib/calc'
import { formatNumber } from '../lib/format'
import type { Action } from '../lib/reducer'
import type { AppState, Trade } from '../lib/types'
import { SellForm } from './SellForm'
import { SettingsForm } from './SettingsForm'
import { Sheet } from './Sheet'
import { TradeForm } from './TradeForm'

/** Which sheet is open, if any. */
export type SheetRequest =
  | { readonly kind: 'closed' }
  | { readonly kind: 'settings' }
  | { readonly kind: 'buy' }
  | { readonly kind: 'edit'; readonly tradeId: string }
  | { readonly kind: 'sell'; readonly tradeId: string }

type SheetKind = SheetRequest['kind']

interface LogSheetProps {
  readonly request: SheetRequest
  readonly appState: AppState
  readonly today: string
  readonly onSubmit: (action: Action) => void
  readonly onClose: () => void
}

interface SheetContentProps {
  readonly request: SheetRequest
  readonly trade: Trade | null
  readonly appState: AppState
  readonly today: string
  readonly onSubmit: (action: Action) => void
  readonly onCancel: () => void
}

const sheetTitles = {
  closed: '',
  settings: 'Settings',
  buy: 'Log a buy',
  edit: 'Edit trade',
  sell: 'Log sell',
} as const satisfies Record<SheetKind, string>

const SETTINGS_HINT =
  'Allowance is what’s left of your €1,000 tax-free amount this year after other gains like ETF payouts.'

const TRADE_HINT = 'Prices per share in euros. Fees are what your broker charged for the order.'

/** The sheet for the current request: settings, a buy, an edit or a sell. */
export function LogSheet({ request, appState, today, onSubmit, onClose }: LogSheetProps) {
  const trade = 'tradeId' in request ? findTrade(appState.trades, request.tradeId) : null

  return (
    <Sheet
      isOpen={request.kind !== 'closed'}
      title={sheetTitles[request.kind]}
      hint={getHint(request.kind, trade)}
      onClose={onClose}
    >
      <SheetContent
        key={JSON.stringify(request)}
        request={request}
        trade={trade}
        appState={appState}
        today={today}
        onSubmit={onSubmit}
        onCancel={onClose}
      />
    </Sheet>
  )
}

function getHint(kind: SheetKind, trade: Trade | null): string {
  if (kind === 'settings') {
    return SETTINGS_HINT
  }

  if (kind === 'sell' && trade !== null) {
    return `${trade.ticker} · ${formatNumber(trade.shares, 0)} shares at ${formatNumber(trade.buyPrice, 4)} €`
  }

  return TRADE_HINT
}

function SheetContent({ request, trade, appState, today, onSubmit, onCancel }: SheetContentProps) {
  if (request.kind === 'settings') {
    return (
      <SettingsForm appState={appState} today={today} onSubmit={onSubmit} onCancel={onCancel} />
    )
  }

  if (request.kind === 'buy') {
    return <TradeForm trade={null} today={today} onSubmit={onSubmit} onCancel={onCancel} />
  }

  if (trade === null) {
    return null
  }

  return request.kind === 'sell' && isOpen(trade) ? (
    <SellForm trade={trade} today={today} onSubmit={onSubmit} onCancel={onCancel} />
  ) : (
    <TradeForm trade={trade} today={today} onSubmit={onSubmit} onCancel={onCancel} />
  )
}
