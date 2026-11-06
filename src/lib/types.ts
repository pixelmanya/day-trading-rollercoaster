export interface Settings {
  /** Start budget in euros. */
  start: number
  /** Tax rate in percent, e.g. 26.375 for Abgeltungsteuer + Soli. */
  taxRate: number
  /** Tax-free allowance left per calendar year, in euros. */
  allowance: number
}

export interface Trade {
  id: string
  ticker: string
  shares: number
  buyPrice: number
  buyFee: number
  /** ISO date (YYYY-MM-DD). */
  buyDate: string
  /** null while the position is open. */
  sellPrice: number | null
  sellFee: number
  /** ISO date (YYYY-MM-DD), null while open. */
  sellDate: string | null
}

export interface AppState {
  settings: Settings
  trades: Trade[]
}

export type OpenTrade = Trade & { sellPrice: null }
export type ClosedTrade = Trade & { sellPrice: number }

/** A closed trade with its derived results. */
export interface ClosedResult {
  trade: ClosedTrade
  /** Buy value plus buy fee. */
  cost: number
  /** shares × (sell − buy), before fees. */
  gross: number
  /** Buy fee + sell fee. */
  fees: number
  /** gross − fees. */
  pretax: number
  /** Incremental tax caused (or refunded, if negative) by this trade. */
  tax: number
  /** pretax − tax. */
  net: number
  /** net / cost. */
  ret: number
}

export interface Summary {
  /** Closed trades in tax order (by sell date, stable). */
  closed: ClosedResult[]
  open: OpenTrade[]
  /** start + sum of net results. */
  balance: number
  sumNet: number
  /** Money tied up in open positions, incl. buy fees. */
  openCost: number
  /** balance − openCost. */
  cash: number
  wins: number
  /** Fees on closed trades plus buy fees on open ones. */
  fees: number
  tax: number
}
