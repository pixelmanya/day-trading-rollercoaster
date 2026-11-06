# Contributing

How this codebase is written and how changes get onto `main`. Tooling enforces what it can (oxfmt,
oxlint, `tsc`, Vitest in CI); the rest is convention, checked in review.

## Setup

Node 22 (see `.nvmrc`) and pnpm (version pinned in `package.json` → `packageManager`).

```bash
pnpm install
pnpm dev
```

| Script              | What it does                                      |
| ------------------- | ------------------------------------------------- |
| `pnpm dev`          | Vite dev server                                   |
| `pnpm format`       | Format everything with oxfmt                      |
| `pnpm format:check` | Fail if anything is unformatted (CI)              |
| `pnpm lint`         | oxlint, warnings fail (CI)                        |
| `pnpm typecheck`    | `tsc -b` (CI)                                     |
| `pnpm test`         | Vitest once (CI); `pnpm test:watch` while working |
| `pnpm build`        | Typecheck + production build (CI)                 |
| `pnpm check`        | All of the above in CI order — run before pushing |

`pnpm install` also installs the git hooks (lefthook). On every commit they format staged files with
oxfmt (and re-stage them) and lint them with oxlint. Don't skip them with `--no-verify`; if a
hook is wrong, fix the hook.

## Formatting

oxfmt owns formatting; don't hand-format or argue about it in review. Config in `.oxfmtrc.json`:

- No semicolons, single quotes (double quotes in JSX attributes), 2-space indent
- Trailing commas everywhere, 100-character lines, LF line endings
- Imports are sorted by the formatter

Set your editor to format on save with oxfmt (or run `pnpm format` before committing).

## TypeScript

- `strict` is on, plus `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`,
  `noImplicitReturns` and `noPropertyAccessFromIndexSignature`. Don't loosen them per file.
- No `any`; use `unknown` and narrow it. No non-null assertions (`!`) except on the root element
  in `main.tsx`; handle the `undefined` case instead.
- Optional properties (`foo?: T`) mean "may be absent". If a value can be present-but-empty, type
  it `T | null` (or `T | undefined`) explicitly.
- Untrusted data (storage, imported files, later the network) enters only through a validator
  (`parseState` in `src/lib/state.ts`) that turns `unknown` into typed state or throws. Never cast
  parsed JSON with `as`.
- `interface` for object shapes, `type` for unions, aliases and mapped types.
- Named exports only. The one exception is config files that tooling requires as default exports
  (`vite.config.ts`).
- Relative imports, no path aliases. Import types with `import type`.
- No enums or namespaces (`erasableSyntaxOnly` is on); use string-literal unions.
- `null` means "deliberately empty" in data (e.g. `sellPrice: null` for an open position); avoid
  `undefined` in stored data so JSON round-trips are lossless.

### Functions

- Named and exported functions, including components and hooks, are `function` declarations:
  `export function summarize(…) {}`, `export function TradeRow(…) {}`.
- Arrow functions are for callbacks, inline handlers and tiny one-line helpers inside a module.
- Exported functions declare their return type; React components may rely on inference.
- Prefer pure functions that take what they need as parameters (e.g. `today`) over reading
  globals or the clock.

### Components and props

- Props are an `interface` named `<Component>Props`, declared directly above the component, and
  destructured in the signature:

  ```tsx
  interface TradeRowProps {
    trade: OpenTrade
    onEdit: (id: string) => void
  }

  export function TradeRow({ trade, onEdit }: TradeRowProps) {
    function handleEdit() {
      onEdit(trade.id)
    }
    …
  }
  ```

- Callback props are named `onX` (`onSave`, `onClose`); handlers inside a component `handleX`.
- No `React.FC`; type props on the parameter.

## Naming

| Thing                         | Style              | Example                           |
| ----------------------------- | ------------------ | --------------------------------- |
| Components, types, interfaces | PascalCase         | `TradeSheet`, `ClosedResult`      |
| Functions, variables, hooks   | camelCase          | `summarize`, `useAppState`        |
| Module-level constants        | UPPER_SNAKE_CASE   | `STORAGE_KEY`, `DEFAULT_SETTINGS` |
| Component files               | PascalCase         | `TradeSheet.tsx`                  |
| Other source files            | camelCase          | `calc.ts`, `localStorage.ts`      |
| CSS module classes            | camelCase          | `.closeBtn`                       |
| Booleans                      | `is`/`has`/`can` … | `isClosed`, `hasError`            |

Domain words are fixed: **trade** (one buy, optionally its sell), **open** / **closed** position,
**cost** (buy value + buy fee), **pretax**, **tax**, **net**, **balance** (start + sum of net),
**cash** (balance − open cost), **allowance** (tax-free amount left this calendar year).

## Project structure

```
src/
  lib/                 Pure TypeScript. No React, no DOM (storage adapters excepted).
    types.ts           Domain types
    calc.ts            ALL trade, tax and balance math
    format.ts          Number/date formatting (de-DE, EUR)
    state.ts           Defaults + validation of untrusted state
    reducer.ts         Pure reducer and typed actions
    errors.ts          Named error classes
    storage/           StorageAdapter interface and implementations
    *.test.ts          Tests, next to the module they test
  hooks/               React hooks (useAppState: reducer + persistence)
  components/          One component per file, with its .module.css beside it
  styles/
    tokens.css         Design tokens on :root, incl. dark mode
    global.css         Element resets and base styles only
  test/                Test setup and fixture builders
  App.tsx, main.tsx
```

Rules that keep it that way:

- **Money math lives in `src/lib/calc.ts` and nowhere else.** Components format and display
  numbers; they never add, subtract or tax them. If a component needs a new figure, add a tested
  function to `calc.ts`.
- `src/lib` must not import from `components`, `hooks` or React.
- Persistence goes through `StorageAdapter` only. Components and hooks never touch
  `localStorage` directly. Adding Supabase means adding an adapter in `src/lib/storage/` and
  selecting it in `createStorage()`.

## Money and dates

- Amounts are euros as JavaScript numbers. Don't round in calculations; round only when
  formatting for display (`eur`, `num`, `pct`, `signed` in `format.ts`).
- Never compare money with `===` in tests; use `toBeCloseTo(expected, 6)`.
- Dates are ISO `YYYY-MM-DD` strings in **local** time (`today()` in `format.ts`), never
  `toISOString()`, which is UTC and gives yesterday's date shortly after midnight in Germany.
- Tax years are calendar years taken from the sell date.

## React

- Function components and hooks only.
- App state is managed with `useReducer`. The reducer is a pure function in `src/lib/reducer.ts`
  with a discriminated union of typed actions, unit-tested like `calc.ts`:

  ```ts
  export type Action =
    | { type: 'logBuy'; trade: Trade }
    | { type: 'logSell'; id: string; sellPrice: number; sellFee: number; sellDate: string }
    | { type: 'replaceState'; state: AppState }
  ```

  Actions describe what the user did (`logSell`), not how state changes (`setTrades`).
  Unknown actions are a type error, enforced by an exhaustive `switch` with a `never` check.

- `useAppState` (in `src/hooks/`) wires the reducer to a `StorageAdapter`: it loads on mount,
  saves after each change, and exposes the save/load status. It is the only place that talks to
  storage. Components get state and `dispatch` (or narrower callbacks) through props; no context
  or state library until prop-passing hurts.
- State updates are immutable. Derived values (summary, chart points) are computed from state with
  `calc.ts` during render (`useMemo` only if profiling shows a need) and never stored.
- Keep components small and presentational. A component that grows past ~150 lines or does two
  jobs gets split.
- Effects are for syncing with the outside world (storage, the `<dialog>` element), not for
  deriving state.

## Styling

- CSS Modules: `Component.module.css` next to `Component.tsx`, imported as `styles`.
- Colors, surfaces and accents come **only** from tokens in `src/styles/tokens.css`
  (`var(--ink)`, `var(--gain)`, …). No raw color values in modules. A new color is a new token
  with both a light and a dark value.
- Dark mode is handled by tokens under `@media (prefers-color-scheme: dark)`; modules should not
  need their own dark-mode rules.
- Respect `prefers-reduced-motion` for any animation.
- Layout must work from 320 px wide with no horizontal scroll, and respect safe-area insets.

## UI copy

- UI text is English; numbers, currency and dates are German-formatted (`de-DE`, `€`).
- Sentence case for buttons and headings ("Log a buy", not "Log A Buy").
- Use real typographic characters: `’` apostrophes, `−` minus for negative amounts, `…` ellipsis,
  `×` for multiplication, `–` for "no value".
- Error messages say what to do: "Enter the price you sold at." rather than "Invalid price".

## Accessibility

- Actions are `<button>`s, navigation is `<a>`. No clickable `<div>`s.
- Every input has a visible `<label>`. Numeric inputs use `inputMode="decimal"` and accept both
  `0,91` and `0.91`.
- Keep the visible `:focus-visible` outline. Dialogs move focus to their first field.
- Charts that carry information get `role="img"` and an `aria-label`; decorative ones get
  `aria-hidden`.

## Errors

- Expected failures throw named `Error` subclasses from `src/lib/errors.ts` (e.g.
  `InvalidStateError` for bad stored or imported data, `StorageError` for a failed load/save).
  Their `message` is written for the user, following the copy rules above.
- Lib code throws; it doesn't catch and log. Errors are caught at the UI boundary (the
  `useAppState` hook or an event handler), turned into visible state, and shown.
- Storage adapters reject on failure; they never swallow errors.
- The UI must show when data couldn't be saved or loaded. Never fail silently, and never overwrite
  stored data you couldn't read.
- Form input validation isn't exceptional: handlers check input and show the inline `.err`
  message without throwing.
- `console.error` is for diagnostics in addition to a visible state, not instead of one.
- Unexpected errors (bugs) are not caught just to hide them.

## Comments and documentation

- Every exported function, type and constant in `src/lib` has a short TSDoc `/** … */` saying
  what it means, with units (€, %, per share) and notable edge cases. Don't restate the type.
- Inline comments explain **why** (a tax rule, a browser quirk, a deliberate deviation), never
  what the next line does.
- No commented-out code and no `TODO` without an issue link: `// TODO(#12): …`.
- Behaviour that users rely on (tax rules, import format) is described in `README.md` too.

## Testing

Vitest for everything; Testing Library with jsdom for components.

- Test files are named `*.test.ts(x)` and live beside the code under test.
- Structure: one `describe` per function or component, `it` per behaviour, named as a sentence:

  ```ts
  describe('closedResults', () => {
    it('offsets a loss against earlier gains in the same year', () => { … })
  })
  ```

- Build fixtures with the helpers in `src/test/builders.ts` (`buy({ shares: 100, price: 1 })`,
  `sell(trade, { price: 1.2, date: '2026-03-01' })`, `settings({ allowance: 0 })`) so a test
  shows only the numbers that matter. Comment the expected arithmetic when it isn't obvious.
- `src/lib` has a 100 % line, branch and function coverage threshold, enforced in CI. Every edge
  case in `calc.ts` is covered: zero/negative results, year boundaries, allowance exactly reached,
  same-day ordering.
- Component tests cover the main user flows (log a buy, log a sell, edit/reopen/delete, settings,
  export/import, the "couldn't save" state). They query by role and label (`getByRole`,
  `getByLabelText`) and drive the UI with `user-event`, never by CSS class or test id unless there
  is no accessible alternative.
- Component tests use an in-memory `StorageAdapter`, never real `localStorage`.
- Tests are deterministic: pass `today` explicitly instead of reading the clock, and use fake
  timers where time matters.

## Dependencies

- Versions are exact in `package.json` (`save-exact` in `.npmrc`); the lockfile is committed and
  CI installs with `--frozen-lockfile`.
- Runtime dependencies need a reason in the PR description (what it does that a few lines of our
  own code can't). The app stays React-only unless that bar is met. Dev tooling is less strict
  but still explained.
- Dependabot opens grouped weekly PRs for npm and GitHub Actions. They go through the same CI;
  major updates are reviewed individually.

## Git and pull requests

- `main` is protected by a ruleset: changes land through pull requests that pass the required
  checks `check` (format, lint, typecheck, test, build) and `pr-title`. No direct pushes, no force
  pushes.
- Work on a short-lived branch per change.
- **Commits follow [Conventional Commits](https://www.conventionalcommits.org/):**
  `type(optional scope): summary` in the imperative, lowercase, no trailing period.
  Types: `feat`, `fix`, `refactor`, `test`, `docs`, `style`, `chore`, `ci`, `build`, `perf`.
  Breaking changes add `!` (`feat!: …`) and explain in the body.
- **Squash-merge only.** The PR title becomes the commit on `main`, so it must itself be a valid
  Conventional Commit; the `pr-title` check enforces this. Branch commits can be messier but
  should still follow the format.
- Fill in the PR template: a summary of what and why, and a test plan. UI changes include
  screenshots in light and dark mode.
- Keep PRs focused; unrelated cleanups go in their own PR.
