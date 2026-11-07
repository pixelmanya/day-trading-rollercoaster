# Day trading rollercoaster

A small web app for logging a day-trading experiment: buys, sells, fees and German capital
gains tax (Abgeltungsteuer + Soli above the yearly allowance, with losses offset within a
calendar year). It shows the after-tax balance against the start budget.

Data stays in your browser (localStorage). Nothing is sent anywhere.

Built with TanStack Start (React, server-side rendering) and deployed as a Node server.

## Development

Requires Node 22 and pnpm.

```bash
pnpm install
pnpm dev
```

Accounts and synced trades need Postgres. Copy `.env.example` to `.env` and set `DATABASE_URL`,
for example to a local Postgres 16 or a free [Neon](https://neon.tech) database. Without it the
app runs in guest mode, keeping the log in the browser. `/api/health` shows whether the database
answers.

To run the production build:

```bash
pnpm build
```

```bash
pnpm start
```

Before pushing, run:

```bash
pnpm check
```

## Deployment and previews

The app runs on [Render](https://render.com) as defined in `render.yaml`: `main` deploys once its
CI checks pass, and every pull request gets its own preview URL, posted on the PR by Render.

To connect it (once): in the Render dashboard choose **New → Blueprint**, pick this repository,
and apply the blueprint. Render validates `render.yaml` and creates the service.

Previews spin up a few minutes after a PR is opened or updated and stop when it closes. A PR
opened before the Render service existed gets its preview on its next push.

## Database migrations

Tables are defined in `src/server/schema.ts`. After changing it:

```bash
pnpm db:generate --name what-changed
```

This writes a SQL migration to `drizzle/` (commit it; `drizzle/meta/` is generated). Apply it to
your development database:

```bash
pnpm db:migrate
```

Render applies migrations on every deploy, before the build, to that deploy's own database.
The same database guard as the server applies, so a development machine can't migrate production.

## Sign-in

Magic links via [Better Auth](https://www.better-auth.com): enter an email, open the link, done. No
passwords. Links are emailed through [Brevo](https://www.brevo.com) when `BREVO_API_KEY` and
`MAIL_FROM` are set. Without them, development prints the link in the terminal running `pnpm dev`,
and Render refuses to send it (a link in a log is a credential).

## Environments

Each environment has its own database, so development and previews never touch real users' data.

| Environment | Runs on                      | Database                                       | Set in                                                                |
| ----------- | ---------------------------- | ---------------------------------------------- | --------------------------------------------------------------------- |
| Production  | Render, live service         | Neon `production` branch                       | Render → service → Environment: `DATABASE_URL`                        |
| Preview     | Render, one per pull request | Neon `preview` branch                          | Render → environment group `preview-database`: `PREVIEW_DATABASE_URL` |
| Development | Your machine                 | Neon `development` branch, or a local Postgres | `.env` (git-ignored): `DATABASE_URL`                                  |

The Neon `preview` and `development` branches are created with **Branch schema only** (no data
copied from production) and **Auto-delete: Never**. Never use "Reset from parent" on them.

`/api/health` shows a `fingerprint` of the database in use (a hash of its host, never the host).
The server refuses a database that belongs to another environment: each Neon branch works only in
its own environment. Their fingerprints, listed in `src/lib/serverConfig.ts`:

| Neon branch   | Fingerprint    |
| ------------- | -------------- |
| `production`  | `a37255697dd9` |
| `preview`     | `66b6c6392f90` |
| `development` | `ffb84bee09ea` |

How the code is written, and how changes get onto `main`, is described in
[CONTRIBUTING.md](CONTRIBUTING.md).
