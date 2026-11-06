/** Outcome of an operation that can fail: an output on success, an error otherwise. */
export type Result<Output, Failure> =
  | { readonly isSuccess: true; readonly output: Output }
  | { readonly isSuccess: false; readonly error: Failure }

/** A successful Result carrying `output`. */
export function succeed<Output>(output: Output): Result<Output, never> {
  return { isSuccess: true, output }
}

/** A failed Result carrying `error`. */
export function fail<Failure>(error: Failure): Result<never, Failure> {
  return { isSuccess: false, error }
}

/** Transform the output of a successful Result; failures pass through unchanged. */
export function mapSuccess<Input, Output, Failure>(
  outcome: Result<Input, Failure>,
  transform: (input: Input) => Output,
): Result<Output, Failure> {
  return outcome.isSuccess ? succeed(transform(outcome.output)) : outcome
}

/** Continue with another fallible step after a success; failures pass through unchanged. */
export function chainSuccess<Input, Output, Failure>(
  outcome: Result<Input, Failure>,
  continueWith: (input: Input) => Result<Output, Failure>,
): Result<Output, Failure> {
  return outcome.isSuccess ? continueWith(outcome.output) : outcome
}
