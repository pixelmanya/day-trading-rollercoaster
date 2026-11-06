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

## Formatting

oxfmt owns formatting; don't hand-format or argue about it in review. Config in `.oxfmtrc.json`:

- No semicolons, single quotes (double quotes in JSX attributes), 2-space indent
- Trailing commas everywhere, 100-character lines, LF line endings
- Imports are sorted by the formatter

Set your editor to format on save with oxfmt (or run `pnpm format` before committing).

## TypeScript

- `strict` is on. No `any`; use `unknown` and narrow it.
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
    storage/           StorageAdapter interface and implementations
    *.test.ts          Tests, next to the module they test
  hooks/               React hooks (state, persistence)
  components/          One component per file, with its .module.css beside it
  styles/
    tokens.css         Design tokens on :root, incl. dark mode
    global.css         Element resets and base styles only
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
- App state lives in one hook (`useAppState`) that owns loading, updating and saving. Components
  receive data and callbacks through props; no context or state library until we need one.
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

- Storage adapters reject on failure; they never swallow errors.
- The UI must show when data couldn't be saved or loaded. Never fail silently, and never overwrite
  stored data you couldn't read.
- `console.error` is for diagnostics in addition to a visible state, not instead of one.

## Testing

- Vitest, files named `*.test.ts(x)` beside the code under test.
- Every exported function in `src/lib/calc.ts` has tests, including edge cases: zero/negative
  results, year boundaries, allowance exactly reached, same-day ordering.
- Name tests by behaviour: `it('offsets a loss against earlier gains in the same year')`.
- Prefer small hand-written fixtures with numbers you can check by hand, and comment the expected
  arithmetic when it isn't obvious.
- Tests are deterministic: pass `today` explicitly instead of reading the clock.

## Git and pull requests

- `main` is protected: changes land through pull requests that pass CI (format, lint, typecheck,
  test, build). No direct pushes, no force pushes.
- Work on a short-lived branch per change.
- **Commits follow [Conventional Commits](https://www.conventionalcommits.org/):**
  `type(optional scope): summary` in the imperative, lowercase, no trailing period.
  Types: `feat`, `fix`, `refactor`, `test`, `docs`, `style`, `chore`, `ci`, `build`, `perf`.
  Breaking changes add `!` (`feat!: …`) and explain in the body.
- **Squash-merge only.** The PR title becomes the commit on `main`, so it must itself be a valid
  Conventional Commit.
- Fill in the PR template: a summary of what and why, and a test plan. UI changes include
  screenshots in light and dark mode.
- Keep PRs focused; unrelated cleanups go in their own PR.
