# CLAUDE.md

Trading log app: React + Vite + TypeScript 7, pnpm, oxlint, oxfmt, Vitest.

**Read `CONTRIBUTING.md` before changing code. It is the style guide and it is binding.**

## Commands

- `pnpm check`: format check, lint, typecheck, test, build. Run it before every commit you push.
- `pnpm format`: fix formatting. `pnpm test:watch` while working on `src/lib`.

## Rules that matter most

- Functional style: no classes, no `this`, no `let`, no loops, no mutation. Factories return
  records of functions. Expected failures are `Result` values; `src/lib` never throws.
- All money, tax and balance math lives in `src/lib/calc.ts`, with tests. Components never do
  arithmetic on money.
- State changes go through the reducer in `src/lib/reducer.ts` (typed actions).
- Persistence goes only through `StorageAdapter` (`src/lib/storage/`), never `localStorage`
  directly.
- Untrusted data (storage, imports) is validated with `parseState`; never cast JSON with `as`.
- Styles use CSS Modules with camelCase classes, logical properties and tokens from
  `src/styles/tokens.css` only (colors, type, spacing, radii); stylelint enforces it.
- `src/lib` functions take every input explicitly (no default params); domain types are readonly.
- Naming: full words, 3+ characters, no abbreviations or vague names (`data`, `value`), verbs
  first for functions, `is/has/…` for booleans, `on…` for callback props, `handle…` for handlers.
- Layout: braces on every block; blank lines around blocks, multi-line statements and before
  `return`. Run `pnpm lint:fix` to apply.
- Keep UI copy and visuals identical to the original unless the task says otherwise.
- Dates are local `YYYY-MM-DD` via `getToday()`; never `toISOString()` for dates.

## Workflow

- Never push to `main`. Branch, then open a PR whose title is a Conventional Commit
  (`feat: …`, `fix(calc): …`); it becomes the squash commit.
- Fill in the PR template (Summary, Test plan).
- Ask before adding a runtime dependency.
