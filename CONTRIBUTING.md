# Contributing

How this codebase is written and how changes get onto `main`. Tooling enforces what it can (oxfmt,
oxlint, stylelint, `tsc`, Vitest in CI); the rest is convention, checked in review.

## Setup

Node 22 (see `.nvmrc`) and pnpm (version pinned in `package.json` → `packageManager`).

```bash
pnpm install
pnpm dev
```

| Script              | What it does                                          |
| ------------------- | ----------------------------------------------------- |
| `pnpm dev`          | Vite dev server                                       |
| `pnpm format`       | Format everything with oxfmt                          |
| `pnpm format:check` | Fail if anything is unformatted (CI)                  |
| `pnpm lint`         | oxlint (TS/TSX) + stylelint (CSS), warnings fail (CI) |
| `pnpm typecheck`    | `tsc -b` (CI)                                         |
| `pnpm test`         | Vitest once (CI); `pnpm test:watch` while working     |
| `pnpm build`        | Typecheck + production build (CI)                     |
| `pnpm check`        | All of the above in CI order — run before pushing     |

`pnpm install` also installs the git hooks (lefthook). On every commit they format staged files with
oxfmt (and re-stage them) and lint them with oxlint and stylelint. Don't skip them with
`--no-verify`; if a hook is wrong, fix the hook.

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
  (`parseState` in `src/lib/state.ts`) that turns `unknown` into a `Result` of typed state. Never cast
  parsed JSON with `as`.
- `interface` for object shapes, `type` for unions, aliases and mapped types.
- Named exports only. The one exception is config files that tooling requires as default exports
  (`vite.config.ts`).
- Relative imports, no path aliases. Import types with `import type`.
- No enums or namespaces (`erasableSyntaxOnly` is on); use string-literal unions.
- `null` means "deliberately empty" in data (e.g. `sellPrice: null` for an open position); avoid
  `undefined` in stored data so JSON round-trips are lossless.

### Data and constants

- Domain types are read-only: `readonly` fields and `readonly T[]`. The reducer and `calc.ts`
  return new objects and never mutate their inputs.

  ```ts
  export interface Trade {
    readonly id: string
    readonly shares: number
    …
  }
  ```

- Constant tables and option lists use `as const satisfies …`, which keeps literal types and
  still checks the shape:

  ```ts
  export const DEFAULT_SETTINGS = {
    start: 1000,
    taxRate: 26.375,
    allowance: 1000,
  } as const satisfies Settings
  ```

- Use `satisfies` rather than a type annotation when you want the narrower inferred type.

### Functions

- Named and exported functions, including components and hooks, are `function` declarations:
  `export function summarize(…) {}`, `export function TradeRow(…) {}`.
- Arrow functions are for callbacks, inline handlers and tiny one-line helpers inside a module.
- Exported functions declare their return type; React components may rely on inference.
- Exported functions in `src/lib` take every input explicitly, with no default parameters. That
  includes the date: `summarize(trades, settings, today)`, never a hidden `new Date()`. Defaults
  are fine in UI-level helpers and private functions.

### Control flow

- Guard clauses first, then the main path. No `else` after `return`.

  ```ts
  function tradeFrom(v: unknown, at: string): Result<Trade, AppError> {
    if (!isObject(v)) return err(invalidState(`${at} is not an object.`))
    if (!isPositive(v['shares'])) return err(invalidState(`${at}: shares must be above 0.`))
    return ok({ … })
  }
  ```

- Prefer expressions to statements: a ternary or a small lookup object over an `if` chain that
  assigns, `.map`/`.filter`/`.reduce` over loops.
- Use `??` and `?.` for null handling, not `||` (which also swallows `0` and `''`).
- `switch` on a discriminated union returns from every case and ends with an exhaustiveness
  check that doesn't throw:

  ```ts
  default: {
    const unhandled: never = action
    return unhandled
  }
  ```

### File layout

Every `.ts`/`.tsx` file is ordered top-down, most important first:

1. Imports (sorted by oxfmt)
2. Exported types and interfaces, then module-private ones
3. Module constants
4. The main export(s): the component, hook or public functions
5. Private helpers, at the bottom (function declarations are hoisted)

One component per file; a small private subcomponent used only by it may live below it as a
helper.

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

## Functional style

The codebase is functional: plain data in, plain data out. Behaviour lives in functions, never
in objects with methods and hidden state.

- **No classes, no `this`.** Things that would be objects with methods are factory functions
  returning a record of functions, closed over their dependencies:

  ```ts
  export interface StorageAdapter {
    readonly load: () => Promise<Result<AppState | null, AppError>>
    readonly save: (state: AppState) => Promise<Result<void, AppError>>
  }

  export function createLocalStorageAdapter(store: KeyValueStore, key: string): StorageAdapter {
    return {
      load: async () => …,
      save: async (state) => …,
    }
  }
  ```

- **Pure functions** for everything in `src/lib`: same inputs, same output, no side effects.
  Effects (storage, DOM, clock, randomness) happen only at the edges: storage adapters,
  `useAppState`, event handlers, `main.tsx`.
- **No mutation, anywhere.** Only `const`; no `let`/`var`, no loops, no `++`, no assignment to
  properties, no mutating methods (`push`, `sort`, `splice`, `Map#set`, …). Use spread,
  `map`/`filter`/`reduce`/`flatMap`, `toSorted`/`toReversed`/`toSpliced`/`with`, and recursion.

  ```ts
  // Running balance after each closed trade
  export function balanceSeries(closed: readonly ClosedResult[], start: number): readonly number[] {
    return closed.reduce<readonly number[]>(
      (pts, r) => [...pts, (pts.at(-1) ?? start) + r.net],
      [start],
    )
  }
  ```

- Accumulate with `reduce` into a fresh object or tuple; keyed totals use objects built with
  spread (`{ ...acc, [year]: total }`) rather than a `Map` that you `set`.
- **Small composable functions.** Split a calculation into named steps and compose them; the
  `pipe` helper in `src/lib/fp.ts` threads a value through several functions left to right.
- **No FP library.** Native array methods, spread, our `pipe` and our `Result` type cover what
  this app needs.
- **Escape hatches** for imperative browser APIs (React refs, `<dialog>`, the DOM) are allowed
  only outside `src/lib`, one line at a time, with a reason:
  `// oxlint-disable-next-line fp/no-mutation -- React ref for <dialog>`.

Enforced by oxlint: built-in rules (`no-param-reassign` with props, `prefer-const`, `no-var`,
`no-plusplus`) and the in-repo plugin `tools/oxlint-plugin-fp.js` (`fp/no-class`, `fp/no-this`,
`fp/no-let`, `fp/no-loop`, `fp/no-mutation`, and `fp/no-throw` in `src/lib`).

## Naming

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
| Factory functions             | `create…`          | `createLocalStorageAdapter`       |
| Result constructors           | lowercase verbs    | `ok`, `err`, `invalidState`       |

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
    result.ts          Result type and helpers (ok, err, map, flatMap)
    errors.ts          AppError union and its constructors
    fp.ts              pipe and other tiny FP helpers
    storage/           StorageAdapter type and factory implementations
    *.test.ts          Tests, next to the module they test
  hooks/               React hooks (useAppState: reducer + persistence)
  components/          One component per file, with its .module.css beside it
  styles/
    tokens.css         Design tokens on :root, incl. dark mode
    global.css         Element resets and base styles only
  test/                Test setup and fixture builders
  App.tsx, main.tsx
tools/
  oxlint-plugin-fp.js  Lint rules for the functional style
```

Rules that keep it that way:

- **Money math lives in `src/lib/calc.ts` and nowhere else.** Components format and display
  numbers; they never add, subtract or tax them. If a component needs a new figure, add a tested
  function to `calc.ts`.
- `src/lib` must not import from `components`, `hooks` or React.
- Persistence goes through `StorageAdapter` only. Components and hooks never touch
  `localStorage` directly. Adding Supabase means adding a `createSupabaseAdapter(client)` factory
  in `src/lib/storage/` and selecting it in `createStorage()`.

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
  The reducer returns a new state for every action and never mutates the old one. Unknown
  actions are a type error, enforced by an exhaustive `switch` with a `never` check.

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

### JSX

- Either/or uses a ternary: `{isOpen ? <OpenRow … /> : <ClosedRow … />}`.
- `&&` only with a real boolean on the left: `{hasError && <Banner … />}`, never
  `{items.length && …}` (which renders `0`). Write `items.length > 0 &&`.
- No nested ternaries in JSX. Anything beyond one level moves into a variable or subcomponent
  above the `return`.
- List keys are domain ids (`key={trade.id}`), never the array index.
- Keep JSX declarative: compute values above the `return`, not inline in attributes.

### Forms

- Inputs are controlled. Field values live in local component state **as raw strings**, exactly
  as typed (`'0,91'`), so the user's formatting is never rewritten while typing. Update with a
  new object (`setFields({ ...fields, [name]: value })`), never by mutating it.
- Strings are parsed with `parseNumber` only when needed: on submit, and for live previews (the
  pre-tax preview in "Log sell").
- Validation is a pure function from the field strings to `Result<Action, string>`; on
  submit, an `err` shows its message in the sheet's error line and an `ok` dispatches the action.
- Initial values come from props (the trade being edited) and are formatted with `inputValue`.
- No form library.

## Styling

### Files and tokens

- CSS Modules: `Component.module.css` next to `Component.tsx`, imported as `styles`.
- `src/styles/tokens.css` holds every design value: colors, type sizes and weights, spacing,
  radii, line widths, shadows and durations. It is the **only** place raw colors and sizes
  appear; stylelint enforces this.
- Scales contain exactly the values the design uses, named by their pixel value (`--space-14`,
  `--radius-22`, `--text-13-5`). Reuse a step before adding one; a new step is a design change
  and goes in its own commit.
- A new color is a new token with both a light and a dark value. Dark mode lives only in
  `tokens.css`; modules never need their own `prefers-color-scheme` rules.
- `src/styles/global.css` holds element resets and base styles (`body`, `button`, `input`,
  `:focus-visible`). No component styles there.

### Selectors

- Class names are camelCase (`.closeBtn`), so they read as `styles.closeBtn`.
- One class per styled element. Modules have no type or id selectors (`.row div` is not
  allowed); give the element its own class. Specificity stays flat.
- Native CSS nesting, at most one level, for states and pseudo-elements (`&:hover`,
  `&[open]`, `&::backdrop`) and media queries.
- Variants are separate classes combined in TSX (`className={`${styles.row} ${styles.gain}`}`).
  No `!important`.

### Properties

- Logical properties: `margin-block-start`, `padding-inline`, `inset-inline-start`,
  `border-block-start`, not top/right/bottom/left. stylelint enforces this.
- Units: type sizes in `rem` (through `--text-*` tokens) so they follow the user's browser
  font size; everything else in `px` through tokens. Fixed component dimensions (the chart's
  `150px` height) may be raw `px`.
- Declarations are grouped in this order, with no blank lines needed between groups:
  1. Layout and position: `display`, `grid-*`, `flex-*`, `position`, `inset`, `z-index`
  2. Box model: `inline-size`, `block-size`, `margin`, `padding`, `border`, `overflow`
  3. Typography: `font-*`, `line-height`, `letter-spacing`, `text-*`, `color`
  4. Visual: `background`, `border-radius`, `box-shadow`, `opacity`
  5. Motion and interaction: `transition`, `animation`, `cursor`

### Responsiveness and motion

- Mobile-first. The app is a single column capped at `--content-max`; add `min-width` media
  queries only when a larger screen needs a different layout.
- Layout must work from 320 px wide with no horizontal scroll, and respect safe-area insets
  (`env(safe-area-inset-*)`).
- Every animation has a `prefers-reduced-motion: reduce` override that disables it.

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

Expected failures are values, not exceptions.

- Fallible functions return `Result<T, E>` from `src/lib/result.ts`:

  ```ts
  export type Result<T, E> =
    | { readonly ok: true; readonly value: T }
    | { readonly ok: false; readonly error: E }
  ```

  Build them with `ok(value)` and `err(error)`, and chain them with `map` and `flatMap` or with
  early returns on `!result.ok`. Async functions return `Promise<Result<T, E>>` and never reject
  for expected failures.

- Errors are a tagged union, `AppError`, in `src/lib/errors.ts`, created by constructor
  functions:

  ```ts
  export type AppError =
    | { readonly kind: 'invalidState'; readonly message: string }
    | { readonly kind: 'storageUnavailable'; readonly message: string }
    | { readonly kind: 'saveFailed'; readonly message: string }
  ```

  `message` is written for the user, following the copy rules. Handle errors with a `switch` on
  `kind`.

- `src/lib` never throws (`fp/no-throw`). Where a platform API can throw (`JSON.parse`,
  `localStorage`), wrap it once at the edge, in the adapter, with `try`/`catch` that returns
  `err(…)`, and nowhere else.
- The UI turns `err` results into visible state. It must show when data couldn't be saved or
  loaded; never fail silently, and never overwrite stored data you couldn't read.
- Form validation returns a `Result` like everything else; see Forms.
- `console.error` is for diagnostics in addition to a visible state, not instead of one.
- Unexpected errors (bugs) are not caught just to hide them. A crash is better than wrong numbers.

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
