# Fire Emblem Fortune's Weave Wiki

A fan wiki for character stats, Bird Time answers, and gift preferences. Built with Astro and hosted on [GitHub Pages](https://www.nolanchai.dev/fortune-weave/).

## Getting Started

Use Node.js 24 and npm.

```sh
npm ci
npm run dev
```

Open the local URL at `/fortune-weave/`.

| Task | Command |
| --- | --- |
| Typecheck | `npm run check` |
| Run tests | `npm test` |
| Validate data, check, test, and build | `npm run build` |
| Preview the build | `npm run preview` |

## Code Structure

```text
src/
  pages/         # Routes
  components/    # Character panels and shared UI
  data/          # Types and gift filtering logic
  scripts/       # Browser interactions
  styles/
data/            # Character profiles, builds, classes, Bird Time, and gifts
assets/          # Portraits, game captures, and source indexes
scripts/         # Data validation, exports, and tests
```

Edit the files in `data/` and `assets/`. `public/` is generated during dev/build; don't edit it directly.

Sources and known gaps are recorded with the data. Character captures show stats from a particular save; starting stats and growth rates are stored separately. Missing values are unknown, and theorycraft builds are labeled as such.

## Deployment

Pushing to `main` runs the build and deploys to GitHub Pages. Domain and project path are configured in `astro.config.mjs`.
