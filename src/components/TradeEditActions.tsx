import { useState } from 'react'

import { isClosed } from '../lib/calc'
import type { Action } from '../lib/reducer'
import type { Trade } from '../lib/types'
import { Button } from './Button'

interface TradeEditActionsProps {
  readonly trade: Trade
  readonly onSubmit: (action: Action) => void
}

/** Reopen (closed trades only) and delete, which needs a second tap. */
export function TradeEditActions({ trade, onSubmit }: TradeEditActionsProps) {
  const [isDeleteArmed, setIsDeleteArmed] = useState(false)

  function handleReopen() {
    onSubmit({ type: 'reopenTrade', tradeId: trade.tradeId })
  }

  function handleDelete() {
    if (isDeleteArmed) {
      onSubmit({ type: 'deleteTrade', tradeId: trade.tradeId })
    } else {
      setIsDeleteArmed(true)
    }
  }

  return (
    <>
      {isClosed(trade) ? (
        <Button variant="quiet" onClick={handleReopen}>
          Reopen position
        </Button>
      ) : null}
      <Button variant="danger" onClick={handleDelete}>
        {isDeleteArmed ? 'Tap again to delete' : 'Delete trade'}
      </Button>
    </>
  )
}
