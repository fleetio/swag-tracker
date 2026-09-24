# Fleetio Swag Tracker

Standalone Next.js prototype for tracking swag orders, production status, dates, tags, costs, and CDN-hosted product imagery.

## Local development

```bash
npm install
npm run dev
```

Local development uses `data/.swag-tracker.local.json`, which is ignored by Git and never connects to the production database. This keeps local edits separate from the shared Vercel tracker. If a separate local database is needed, use `LOCAL_DATABASE_URL`; never put the production `DATABASE_URL` in `.env.local`.

When the local store is still at revision zero, the app makes one best-effort import of the previous browser-only draft keys so existing localhost edits are not lost. Production never reads browser storage.

## Shared production setup

The production app uses:

- GitHub OAuth with `read:org`, allowing only members of `GITHUB_ALLOWED_ORG`.
- Vercel deployment protection/SSO as the production access gate.
- A Postgres database connected through Vercel Marketplace storage.
- Optimistic revision checks on every save. If another person has saved first, the second save is rejected and the UI asks the user to refresh instead of overwriting data.

Create a GitHub OAuth app with this callback URL:

```text
https://YOUR-VERCEL-DOMAIN/api/auth/callback/github
```

Set the variables in `.env.example` in the Vercel project. Production builds require authentication, and you should also set `REQUIRE_SWAG_AUTH=true`, connect `DATABASE_URL` through a Postgres Marketplace integration, and enable Vercel SSO/deployment protection. The GitHub OAuth flow requests `read:org` with consent so Fleetio members can be reauthorized if the organization scope was not previously granted. Never commit `.env.local` or database credentials.

## CDN images

Product images are referenced by filename and resolved against `NEXT_PUBLIC_SWAG_CDN_BASE_URL`. No image files are stored in this repository.
