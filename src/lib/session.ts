import type { AppError } from './errors'
import { reduceAppState } from './reducer'
import type { Action } from './reducer'
import type { Result } from './result'
import { createEmptyState } from './state'
import type { AppState } from './types'

/** The app's lifecycle around loading and saving the log. */
export type Session =
  | { readonly phase: 'loading' }
  | { readonly phase: 'loadFailed'; readonly error: AppError }
  | ReadySession

export interface ReadySession {
  readonly phase: 'ready'
  readonly appState: AppState
  /** Counts user changes; each one is saved. 0 means nothing to save yet. */
  readonly revision: number
  /** The last save failure, until a save succeeds. */
  readonly saveError: AppError | null
}

/** What each session event carries, keyed by event type. */
interface EventPayloads {
  readonly loadSucceeded: { readonly appState: AppState }
  readonly loadFailed: { readonly error: AppError }
  readonly actionDispatched: { readonly action: Action }
  readonly saveSucceeded: Readonly<Record<never, never>>
  readonly saveFailed: { readonly error: AppError }
  readonly saveRetried: Readonly<Record<never, never>>
}

export type SessionEventType = keyof EventPayloads

/** Things that happen to the session: load and save outcomes, and user actions. */
export type SessionEvent<Type extends SessionEventType = SessionEventType> = {
  readonly [Key in Type]: { readonly type: Key } & EventPayloads[Key]
}[Type]

export const INITIAL_SESSION = { phase: 'loading' } as const satisfies Session

interface HandlerInput<Type extends SessionEventType> {
  readonly session: Session
  readonly event: SessionEvent<Type>
}

type EventHandlers = {
  readonly [Key in SessionEventType]: (input: HandlerInput<Key>) => Session
}

const eventHandlers: EventHandlers = {
  loadSucceeded: ({ event: { appState } }) => ({
    phase: 'ready',
    appState,
    revision: 0,
    saveError: null,
  }),
  loadFailed: ({ event: { error } }) => ({ phase: 'loadFailed', error }),
  actionDispatched: ({ session, event: { action } }) =>
    updateReady(session, (ready) => ({
      ...ready,
      appState: reduceAppState(ready.appState, action),
      revision: ready.revision + 1,
    })),
  saveSucceeded: ({ session }) => updateReady(session, (ready) => ({ ...ready, saveError: null })),
  saveFailed: ({ session, event: { error } }) =>
    updateReady(session, (ready) => ({ ...ready, saveError: error })),
  saveRetried: ({ session }) =>
    updateReady(session, (ready) => ({ ...ready, revision: ready.revision + 1 })),
}

/** The session after `event`. Never mutates `session`. */
export function reduceSession<Type extends SessionEventType>(
  session: Session,
  event: SessionEvent<Type>,
): Session {
  return eventHandlers[event.type]({ session, event })
}

/** The event for a finished load. Nothing stored yet starts an empty log. */
export function createLoadEvent(loadOutcome: Result<AppState | null, AppError>): SessionEvent {
  if (!loadOutcome.isSuccess) {
    return { type: 'loadFailed', error: loadOutcome.error }
  }

  return { type: 'loadSucceeded', appState: loadOutcome.output ?? createEmptyState() }
}

/** The event for a finished save. */
export function createSaveEvent(saveOutcome: Result<null, AppError>): SessionEvent {
  return saveOutcome.isSuccess
    ? { type: 'saveSucceeded' }
    : { type: 'saveFailed', error: saveOutcome.error }
}

function updateReady(session: Session, update: (ready: ReadySession) => Session): Session {
  return session.phase === 'ready' ? update(session) : session
}
