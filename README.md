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

Previews spin up a few minutes after a PR is opened or updated and stop when it closes.

How the code is written, and how changes get onto `main`, is described in
[CONTRIBUTING.md](CONTRIBUTING.md).
