# DApps Trading Platform

DApps Platform USA trading-platform repository.

## Structure

- `index.html` — main responsive trading client
- root `*.html` files — stable public account, wallet, support, conversion, and trade-detail routes
- `assets/css/app.css` — consolidated main-client styles
- `assets/css/utility-ui.css` — shared styles for account/utility pages
- `assets/css/account.css` — account/auth page-specific styles
- `assets/css/wallet.css` — deposit/withdraw page-specific styles
- `assets/js/platform-config.js` — shared frontend API environment and trade specification mirror
- `assets/js/platform-core.js` — consolidated main runtime modules
- `assets/js/platform-ui.js` — consolidated UI runtime modules
- `assets/js/hero-ui.js` — consolidated hero/brand visual runtime
- `assets/js/pledge-ui.js` — pledge UI module loaded by the main runtime when needed
- `assets/js/user-notifications.js` — shared user notification client
- `assets/js/escape-back.js` — shared utility-page back-navigation helper
- `assets/img/` — shared frontend brand and visual assets
- `domain/` — canonical browser-side trading rule source
- `backend/` — Express API service with PostgreSQL persistence; `src/business-routes.js` composes Trade, User Admin, Support, Pledge, and Convert modules while KYC stays isolated
- `admin-panel/` — separate Express-served administration interface with its own public asset root
- `.github/workflows/pages.yml` — static frontend deployment workflow

## Frontend

The client is intentionally framework-free and has no frontend build step. GitHub Pages publishes the root static frontend while excluding the backend and admin-panel directories.

The main trading page loads consolidated style and runtime bundles to reduce legacy CSS/JS layering while preserving existing page URLs and responsive behavior. Shared images live under `assets/img/`. The administration interface keeps its own copies of required static brand assets because it is served from a separate public root.

## Trading domain sources

Canonical browser-side trading rules live under `domain/`. Historical duplicate trading and account-mode files that are not part of the runtime path have been removed.

## Backend

The backend is a Node.js/Express service using PostgreSQL. Its dependencies and runtime configuration live under `backend/`.

## Admin

The administration interface is isolated under `admin-panel/` and is deployed separately from the static client.

## Local development

For the static frontend:

```bash
python -m http.server 8080
```

For backend/admin development, install dependencies inside the relevant directory and use the scripts defined in that directory's `package.json`.

## Configuration

Environment secrets must not be committed. Use the checked-in `.env.example` files as configuration references.

## Important

This repository contains application code for client, backend, and administrative workflows. Deployment, security, financial controls, custody, compliance, and production-readiness requirements must be independently reviewed and validated before relying on the system for regulated or real-money activity.


## Build and health

- Backend and admin runtime target Node.js 22.x.
- `backend/package-lock.json` and `admin-panel/package-lock.json` lock production dependency trees.
- The backend Docker image installs dependencies with `npm ci --omit=dev` for reproducible builds.
- `.github/workflows/health.yml` runs on pushes and pull requests to validate repository invariants, JavaScript syntax, locked dependency installs, unique backend routes, CSS structure, and protected trading-rule defaults.
- `scripts/repo-health.mjs` guards the current trade durations, default minimums, profit rates, KYC gate, tier boundaries, locked-principal behavior, Auto/Win/Loss controls, sequence control endpoints, and route uniqueness without executing or changing trading logic.
- Production backend startup requires both `JWT_SECRET` and `ADMIN_JWT_SECRET`; there is no built-in default secret.
