import { toZonedIsoDate } from '../dates'
import { createAppError } from '../errors'
import type { AppError } from '../errors'
import { fail, succeed } from '../result'
import type { Result } from '../result'
import type { BrokerTransaction } from '../types'
import type { BrokerExport, BrokerSource } from './types'

/*
 * Reads the JSON of the official Scalable Capital CLI:
 * `sc broker transactions --type-filter buy --type-filter sell --status settled --json`.
 * Each item's amount is the cash that moved, fees included; limit_price is the order's limit,
 * not the price paid, so it is ignored.
 */

type UnknownRecord = Readonly<Record<string, unknown>>

/** Every field may be missing in untrusted input until checked. */
type Unchecked<Shape> = { readonly [Key in keyof Shape]: Shape[Key] | null }

type ScalableFields = Omit<BrokerTransaction, 'date'>

/** Scalable is a German broker: dates are Berlin dates. */
const TIME_ZONE = 'Europe/Berlin'
const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/
const sides = { BUY: 'buy', SELL: 'sell' } as const

export const scalableSource: BrokerSource = {
  sourceId: 'scalable',
  label: 'Scalable Capital',
  parseExport: (text) => parseScalableExport(text),
}

/** Settled buys and sells from one page of `sc broker transactions --json`. */
export function parseScalableExport(text: string): Result<BrokerExport, AppError> {
  const page = readRecord(readRecord(parseJson(text), 'data'), 'result')
  const entries = page?.['items']

  if (page === null || !Array.isArray(entries)) {
    return failExport(
      'This isn’t a Scalable export. Create one with “sc broker transactions --json”.',
    )
  }

  const trades = entries
    .filter((entry) => isSettledTrade(entry))
    .map((entry) => toTransaction(entry))

  if (!trades.every((trade) => trade !== null)) {
    return failExport('This Scalable export has a trade in an unexpected format.')
  }

  return succeed({ transactions: trades, isPossiblyIncomplete: isCutOff(page, entries.length) })
}

/** A full page with a cursor: Scalable has more transactions than this file holds. */
function isCutOff(page: UnknownRecord, entryCount: number): boolean {
  const pageSize = readRecord(page, 'input')?.['pageSize']

  return typeof page['cursor'] === 'string' && entryCount === pageSize
}

function isSettledTrade(entry: unknown): entry is UnknownRecord {
  return (
    isRecord(entry) &&
    entry['type'] === 'SECURITY_TRANSACTION' &&
    entry['status'] === 'SETTLED' &&
    entry['is_cancellation'] !== true
  )
}

function toTransaction(entry: UnknownRecord): BrokerTransaction | null {
  const fields: Unchecked<ScalableFields> = {
    transactionId: readText(entry['id']),
    isin: readText(entry['isin']),
    name: readText(entry['description']),
    side: entry['side'] === 'BUY' || entry['side'] === 'SELL' ? sides[entry['side']] : null,
    shares: readPositiveNumber(entry['quantity']),
    // Negative for a buy (paid), positive for a sale (received)
    amount: readPositiveNumber(Math.abs(Number(entry['amount']))),
    executedAt: ISO_TIMESTAMP.test(String(entry['last_event_datetime']))
      ? String(entry['last_event_datetime'])
      : null,
  }

  if (!hasAllFields(fields)) {
    return null
  }

  return {
    ...fields,
    transactionId: `${scalableSource.sourceId}:${fields.transactionId}`,
    date: toZonedIsoDate(fields.executedAt, TIME_ZONE),
  }
}

function hasAllFields<Shape>(fields: Unchecked<Shape>): fields is Shape {
  return Object.values(fields).every((field) => field !== null)
}

function readRecord(input: unknown, key: string): UnknownRecord | null {
  const field = isRecord(input) ? input[key] : undefined

  return isRecord(field) ? field : null
}

function readText(input: unknown): string | null {
  return typeof input === 'string' && input !== '' ? input : null
}

function readPositiveNumber(input: unknown): number | null {
  return typeof input === 'number' && Number.isFinite(input) && input > 0 ? input : null
}

function isRecord(input: unknown): input is UnknownRecord {
  return typeof input === 'object' && input !== null && !Array.isArray(input)
}

/** JSON.parse without the throw: undefined for text that isn't JSON. */
function parseJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

function failExport(message: string): Result<never, AppError> {
  return fail(createAppError('importFailed', message))
}
