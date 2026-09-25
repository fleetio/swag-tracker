# Swag Tracker project context

This repository is the standalone Fleetio Swag Tracker project.

## Product

- Production URL: `https://swag-tracker-zeta.vercel.app`
- GitHub: `https://github.com/fleetio/swag-tracker`
- Product images use the Fleetio marketing CDN; do not add image binaries to this repo.
- The tracker supports sourcing, production, shipped, and in-stock statuses; tags; campaigns; costs; sizes; exports; editing; deletion; and optimistic conflict protection.

## Data persistence

- Production data is stored in the connected Neon Postgres database through Vercel Marketplace.
- The Neon resource is on the Free plan and is connected to Production and Preview with the `SWAG_` prefix.
- `lib/orderStore.js` reads the prefixed variables first, then supports the standard Postgres variable names as fallbacks.
- Local development uses the ignored `data/.swag-tracker.local.json` file. Local edits are intentionally separate from production.
- Never seed, import, or overwrite production data on deploy. The database initializer creates the table and only inserts the initial payload when the row does not already exist.
- Every write uses a revision check so a stale browser cannot overwrite another person’s newer update.

## Deployment and environment

- Vercel project: `fleetio/swag-tracker`
- Production uses the shared password configured in Vercel as `SWAG_TRACKER_PASSWORD`; never commit it.
- Keep `NEXTAUTH_SECRET` and database credentials in Vercel or `.env.local`, never in Git.
- New code changes should be pushed to `main` to trigger the Vercel deployment.

## Verification

Run `npm run lint` and `npm run build` before pushing. If `.next/trace` has local permission issues, clear only that generated cache file and rerun the build.
