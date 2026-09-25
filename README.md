# DApps Trading Platform

DApps Platform USA trading-platform repository.

## Structure

- `index.html` — main responsive trading client
- root `*.html` files — stable public account, wallet, support, conversion, and trade-detail routes
- `assets/css/app.css` — consolidated main-client styles
- `assets/css/utility-ui.css` — shared styles for account/utility pages
- `assets/css/account.css` — account/auth page-specific styles
- `assets/css/wallet.css` — deposit/withdraw page-specific styles
- `assets/js/platform-core.js` — consolidated main runtime modules
- `assets/js/platform-ui.js` — consolidated UI runtime modules
- `assets/js/hero-ui.js` — consolidated hero/brand visual runtime
- `assets/js/pledge-ui.js` — pledge UI module loaded by the main runtime when needed
- `assets/js/user-notifications.js` — shared user notification client
- `assets/js/escape-back.js` — shared utility-page back-navigation helper
- `assets/img/` — shared frontend brand and visual assets
- `domain/` — canonical browser-side trading rule and ledger sources
- `backend/` — Express API service with PostgreSQL persistence
- `admin-panel/` — separate Express-served administration interface with its own public asset root
- `.github/workflows/pages.yml` — static frontend deployment workflow

## Frontend

The client is intentionally framework-free and has no frontend build step. GitHub Pages publishes the root static frontend while excluding the backend and admin-panel directories.

The main trading page loads consolidated style and runtime bundles to reduce legacy CSS/JS layering while preserving existing page URLs and responsive behavior. Shared images live under `assets/img/`. The administration interface keeps its own copies of required static brand assets because it is served from a separate public root.

## Trading domain sources

Canonical browser-side trading sources live under `domain/`. Root-level duplicate copies have been removed so these files have a single maintained location.

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
