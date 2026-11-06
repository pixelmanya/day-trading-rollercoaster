import { useCallback, useEffect, useReducer } from 'react'
import type { Dispatch } from 'react'

import { getToday } from '../lib/format'
import type { Action } from '../lib/reducer'
import { createLoadEvent, createSaveEvent, INITIAL_SESSION, reduceSession } from '../lib/session'
import type { Session, SessionEvent } from '../lib/session'
import type { StorageAdapter } from '../lib/storage'
import type { AppState } from '../lib/types'

/** The session plus the two things the UI can ask of it. */
export interface AppStateHandle {
  readonly session: Session
  readonly dispatchAction: (action: Action) => void
  readonly retrySave: () => void
}

interface SaveRequest {
  readonly appState: AppState | null
  readonly revision: number
}

/**
 * The trading log's state. Loads from `storage` after mount (so server rendering shows the
 * loading state), applies user actions, and saves after each one. Never saves state that
 * failed to load, so unreadable data is never overwritten.
 */
export function useAppState(storage: StorageAdapter): AppStateHandle {
  const [session, dispatchSession] = useReducer(applySessionEvent, INITIAL_SESSION)
  const appState = session.phase === 'ready' ? session.appState : null
  const revision = session.phase === 'ready' ? session.revision : 0

  useEffect(() => startLoading(storage, dispatchSession), [storage])

  useEffect(
    () => startSaving(storage, { appState, revision }, dispatchSession),
    [storage, appState, revision],
  )

  const dispatchAction = useCallback((action: Action) => {
    dispatchSession({ type: 'actionDispatched', action })
  }, [])

  const retrySave = useCallback(() => {
    dispatchSession({ type: 'saveRetried' })
  }, [])

  return { session, dispatchAction, retrySave }
}

function applySessionEvent(session: Session, event: SessionEvent): Session {
  return reduceSession(session, event)
}

/** Load once; ignore the outcome if the component unmounted meanwhile. */
function startLoading(
  storage: StorageAdapter,
  dispatchSession: Dispatch<SessionEvent>,
): () => void {
  const controller = new AbortController()

  void storage.load().then((loadOutcome) => {
    if (!controller.signal.aborted) {
      dispatchSession(createLoadEvent(loadOutcome, getToday(new Date())))
    }
  })

  return () => controller.abort()
}

/** Save a revision that the user made; outcomes of superseded saves are ignored. */
function startSaving(
  storage: StorageAdapter,
  { appState, revision }: SaveRequest,
  dispatchSession: Dispatch<SessionEvent>,
): () => void {
  const controller = new AbortController()

  if (appState !== null && revision > 0) {
    void storage.save(appState).then((saveOutcome) => {
      if (!controller.signal.aborted) {
        dispatchSession(createSaveEvent(saveOutcome))
      }
    })
  }

  return () => controller.abort()
}
