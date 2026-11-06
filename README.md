# Day trading rollercoaster

A small web app for logging a day-trading experiment: buys, sells, fees and German capital
gains tax (Abgeltungsteuer + Soli above the yearly allowance, with losses offset within a
calendar year). It shows the after-tax balance against the start budget.

Data stays in your browser (localStorage). Nothing is sent anywhere.

## Development

Requires Node 22 and pnpm.

```bash
pnpm install
pnpm dev
```

Before pushing, run:

```bash
pnpm check
```

How the code is written, and how changes get onto `main`, is described in
[CONTRIBUTING.md](CONTRIBUTING.md).
