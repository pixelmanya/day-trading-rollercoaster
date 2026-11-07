import type { AppError } from '../errors'
import type { Result } from '../result'
import type { BrokerTransaction } from '../types'

/** The executed buys and sells read from one or more broker export files. */
export interface BrokerExport {
  readonly transactions: readonly BrokerTransaction[]
  /** True when a file looks cut off by paging, so earlier transactions may be missing. */
  readonly isPossiblyIncomplete: boolean
}

/** A broker the log can import from. Each broker adds one; see src/lib/brokers/. */
export interface BrokerSource {
  /** Prefixes the IDs of its transactions, so brokers never collide: "scalable". */
  readonly sourceId: string
  /** Shown to the user: "Scalable Capital". */
  readonly label: string
  /** Read one export file's text; untrusted, so everything in it is validated. */
  readonly parseExport: (text: string) => Result<BrokerExport, AppError>
}
