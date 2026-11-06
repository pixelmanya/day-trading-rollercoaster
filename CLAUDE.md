# CLAUDE.md

Trading log app: React + Vite + TypeScript 7, pnpm, oxlint, oxfmt, Vitest.

**Read `CONTRIBUTING.md` before changing code. It is the style guide and it is binding.**

## Commands

- `pnpm check`: format check, lint, typecheck, test, build. Run it before every commit you push.
- `pnpm format`: fix formatting. `pnpm test:watch` while working on `src/lib`.

## Rules that matter most

- All money, tax and balance math lives in `src/lib/calc.ts`, with tests. Components never do
  arithmetic on money.
- State changes go through the reducer in `src/lib/reducer.ts` (typed actions).
- Persistence goes only through `StorageAdapter` (`src/lib/storage/`), never `localStorage`
  directly.
- Untrusted data (storage, imports) is validated with `parseState`; never cast JSON with `as`.
- Styles use CSS Modules and tokens from `src/styles/tokens.css` only; no raw colors.
- Keep UI copy and visuals identical to the original unless the task says otherwise.
- Dates are local `YYYY-MM-DD` via `today()`; never `toISOString()` for dates.

## Workflow

- Never push to `main`. Branch, then open a PR whose title is a Conventional Commit
  (`feat: …`, `fix(calc): …`); it becomes the squash commit.
- Fill in the PR template (Summary, Test plan).
- Ask before adding a runtime dependency.
