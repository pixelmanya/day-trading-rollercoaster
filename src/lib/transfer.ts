import { createAppError } from './errors'
import type { AppError } from './errors'
import { fail } from './result'
import type { Result } from './result'
import { parseState } from './state'
import type { AppState } from './types'

/** Marks a file as this app's export, so other JSON is turned away with a clear message. */
const EXPORT_FORMAT = 'trading-log'
/** Raised when the file's shape changes; older versions stay readable. */
const EXPORT_VERSION = 1

/** The export file: what it is, which version, when it was made, and the log itself. */
interface ExportFile {
  readonly format: typeof EXPORT_FORMAT
  readonly version: typeof EXPORT_VERSION
  /** Local date of the export, YYYY-MM-DD. */
  readonly exportedOn: string
  readonly state: AppState
}

/** The log as the text of an export file, indented so people can read it. */
export function serializeExport(state: AppState, today: string): string {
  const exportFile: ExportFile = {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exportedOn: today,
    state,
  }

  return `${JSON.stringify(exportFile, null, 2)}\n`
}

/** File name for an export made on `today`: "trading-log-2026-11-07.json". */
export function createExportFileName(today: string): string {
  return `${EXPORT_FORMAT}-${today}.json`
}

/** Read an export file's text back into a log, validating everything in it. */
export function parseImport(text: string): Result<AppState, AppError> {
  const parsed = parseJson(text)

  if (parsed === undefined) {
    return failImport('This file isn’t valid JSON. Choose a file exported from this app.')
  }

  if (!isExportFile(parsed)) {
    return failImport('This file isn’t a trading log export. Choose a file exported from this app.')
  }

  const imported = parseState(parsed.state)

  return imported.isSuccess
    ? imported
    : failImport(`This export can’t be read: ${imported.error.message}`)
}

/** JSON.parse without the throw: undefined for text that isn't JSON. */
function parseJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

function isExportFile(input: unknown): input is Readonly<Record<'state', unknown>> {
  return (
    typeof input === 'object' &&
    input !== null &&
    'format' in input &&
    input.format === EXPORT_FORMAT &&
    'version' in input &&
    input.version === EXPORT_VERSION
  )
}

function failImport(message: string): Result<never, AppError> {
  return fail(createAppError('importFailed', message))
}
