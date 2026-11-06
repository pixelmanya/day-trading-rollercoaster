import { createEmptyState } from './state'
import type { AppState, Sale, Settings, Trade } from './types'

/** What each action carries, keyed by action type. */
interface ActionPayloads {
  readonly saveSettings: { readonly settings: Settings }
  readonly resetExperiment: Readonly<Record<never, never>>
  readonly logBuy: { readonly trade: Trade }
  readonly logSell: { readonly tradeId: string; readonly sale: Sale }
  readonly updateTrade: { readonly trade: Trade }
  readonly reopenTrade: { readonly tradeId: string }
  readonly deleteTrade: { readonly tradeId: string }
  readonly replaceState: { readonly state: AppState }
}

export type ActionType = keyof ActionPayloads

/** Something the user did. `Action<'logSell'>` narrows to one type. */
export type Action<Type extends ActionType = ActionType> = {
  readonly [Key in Type]: { readonly type: Key } & ActionPayloads[Key]
}[Type]

interface HandlerInput<Type extends ActionType> {
  readonly state: AppState
  readonly action: Action<Type>
}

type ActionHandlers = {
  readonly [Key in ActionType]: (input: HandlerInput<Key>) => AppState
}

const actionHandlers: ActionHandlers = {
  saveSettings: ({ state, action: { settings } }) => ({ ...state, settings }),
  resetExperiment: () => createEmptyState(),
  logBuy: ({ state, action: { trade } }) => ({ ...state, trades: [...state.trades, trade] }),
  logSell: ({ state, action: { tradeId, sale } }) =>
    replaceTrade(state, tradeId, (trade) => ({ ...trade, ...sale })),
  updateTrade: ({ state, action: { trade } }) => replaceTrade(state, trade.tradeId, () => trade),
  reopenTrade: ({ state, action: { tradeId } }) =>
    replaceTrade(state, tradeId, (trade) => ({
      ...trade,
      sellPrice: null,
      sellFee: 0,
      sellDate: null,
    })),
  deleteTrade: ({ state, action: { tradeId } }) => ({
    ...state,
    trades: state.trades.filter(({ tradeId: candidateId }) => candidateId !== tradeId),
  }),
  replaceState: ({ action: { state: nextState } }) => nextState,
}

/** The state after `action`. Never mutates `state`. */
export function reduceAppState<Type extends ActionType>(
  state: AppState,
  action: Action<Type>,
): AppState {
  return actionHandlers[action.type]({ state, action })
}

/** Replace the trade with `tradeId` by `update(trade)`; other trades stay as they are. */
function replaceTrade(state: AppState, tradeId: string, update: (trade: Trade) => Trade): AppState {
  return {
    ...state,
    trades: state.trades.map((trade) => (trade.tradeId === tradeId ? update(trade) : trade)),
  }
}
