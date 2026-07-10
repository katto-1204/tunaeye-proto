# TunEye Proto

Interactive tablet UI prototype for **automated tuna species classification and quality grading** at the dock. TunEye guides operators through species scanning, base-price lookup, weighing, AI-assisted grading, and thermal receipt printing — designed for a fixed landscape tablet form factor.

**Live demo:** deploy to [Vercel](https://vercel.com) from this repository (see [Deployment](#deployment)).

---

## Features

| Step | Screen | Description |
|------|--------|-------------|
| 1 | **Welcome** | Onboarding and entry into the workflow |
| 2 | **Scan** | Camera preview, AI species detection from core sample & meat color, manual species override |
| 3 | **Pricing** | Base price date, per-species price entry, daily price history with deltas |
| 4 | **Weighing** | Live scale gauge, 10 kg grading threshold |
| 5 | **Grading** | Grade result (A–C / Reject), confidence score, value breakdown |
| 6 | **Receipt** | Success confirmation + thermal printer receipt (fullscreen view) |
| 7 | **History** | Past session records |

### Highlights

- **Species identification** — AI scan or manual picker with species fish icons
- **Core-sample analysis copy** — identification based on core sample and meat color (not fin shape)
- **Price history** — date-indexed Yellowfin / Skipjack base prices with day-over-day change
- **Grading confidence** — separate from species selection; reflects quality grading only
- **Receipt UI** — split success + thermal receipt layout with PDF download affordance

---

## Tech stack

- [TanStack Start](https://tanstack.com/start) + [TanStack Router](https://tanstack.com/router) — full-stack React with SSR
- [Nitro](https://nitro.build) — server build & Vercel deployment adapter
- [Vite](https://vite.dev) 8 — bundler and dev server
- [React](https://react.dev) 19 — UI
- [Tailwind CSS](https://tailwindcss.com) 4 — global styles + shadcn/ui component primitives
- TypeScript

---

## Getting started

### Prerequisites

- **Node.js 20+** (22 recommended)
- npm, pnpm, or bun

### Install & run

```bash
git clone https://github.com/katto-1204/tunaeye-proto.git
cd tunaeye-proto
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Use the step pills above the tablet frame to jump between screens during prototyping.

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build (client + SSR + Nitro server) |
| `npm run preview` | Preview production build locally |
| `npm run start` | Run built server from `.output/server` (after `build`) |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |

---

## Deployment

This project is configured for **zero-config Vercel deployment** via TanStack Start + Nitro.

### Deploy from GitHub (recommended)

1. Push this repository to GitHub.
2. Go to [vercel.com/new](https://vercel.com/new) and import the repo.
3. Confirm **Framework Preset** is **TanStack Start** (set automatically via `vercel.json`).
4. Click **Deploy**.

Every push to `main` triggers a production deployment; other branches get preview URLs.

### Deploy with Vercel CLI

```bash
npm i -g vercel
vercel          # preview deployment
vercel --prod   # production
```

### Environment variables

No secrets are required for the current prototype. If you add server-side integrations later:

- Use `VITE_` prefix only for **public** client values (`import.meta.env`)
- Keep secrets **without** `VITE_` so they stay server-only (`process.env`)

Pull Vercel env vars locally:

```bash
vercel env pull
```

### Troubleshooting

| Issue | Fix |
|-------|-----|
| Framework not detected | Ensure `vercel.json` has `"framework": "tanstack-start"` |
| Build fails on Vercel | Run `npm run build` locally; match Node version (20+) in project settings |
| Routes 404 in production | Confirm `nitro()` is in `vite.config.ts` and redeploy |

---

## Project structure

```
├── src/
│   ├── routes/
│   │   ├── index.tsx      # TunEye tablet UI flow (all screens)
│   │   └── __root.tsx     # App shell, meta, error boundary
│   ├── lib/
│   │   └── species-icons.tsx
│   ├── server.ts          # SSR entry (Nitro / TanStack Start)
│   ├── start.ts           # Start instance & middleware
│   ├── router.tsx
│   ├── styles.css         # Tailwind + design tokens
│   └── tuneye.css         # Scoped tablet UI styles
├── vite.config.ts
├── vercel.json
└── package.json
```

---

## Status

This repository is a **UI/UX prototype** with simulated AI detection, weighing, and grading. It is intended for capstone demonstration and stakeholder review, not production fishery operations without backend integration.

---

## License

Private — capstone project. All rights reserved.
