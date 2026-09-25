# DApps Trading Platform

DApps Platform USA trading-platform repository.

## Structure

- `index.html` — main responsive trading client
- `app.css` — consolidated main-client styles
- `utility-ui.css` — shared styles for account/utility pages
- `account.css` — account/auth page-specific styles
- `wallet.css` — deposit/withdraw page-specific styles
- `hero-ui.js` — consolidated hero/brand visual runtime
- `backend/` — Express API service with PostgreSQL persistence
- `admin-panel/` — separate Express-served administration interface
- `.github/workflows/pages.yml` — static frontend deployment workflow

## Frontend

The client is intentionally framework-free and has no frontend build step. GitHub Pages publishes the root static frontend while excluding the backend and admin-panel directories.

The main trading page loads consolidated style and visual bundles to reduce legacy CSS/JS layering while preserving the existing responsive behavior.

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
