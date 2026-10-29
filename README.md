# TowerBites CRM + admin

Next.js (App Router, TypeScript) app for cafes and the TowerBites super admin. Runs on port 3001.

- **Cafe staff**: live order board (`/cafe`, TV friendly, fullscreen button, sound + highlight on new orders), menu stock (`/cafe/menu`), order history + today's stats (`/cafe/history`).
- **Super admin**: dashboard (`/admin`), locations & towers, cafes, products (categories + items), staff logins, all orders, users. "Live board" on a cafe opens that cafe's board (sends `x-cafe-id`).

## Install

```bash
npm install
cp .env.example .env.local   # then fill in
```

| Variable | |
|---|---|
| `NEXT_PUBLIC_API_URL` | TowerBites API, e.g. `http://localhost:4000` |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase project (email + password login, realtime board updates) |
| `NEXT_PUBLIC_DEV_AUTH` | `true` = skip Supabase, any password, token `dev:<email>` (API needs `DEV_AUTH=true`) |

Dev logins: `admin@towerbites.dev` (super admin), `cafe@towerbites.dev` (Krunchy Kafe).

## Run / build

```bash
npm run dev     # http://localhost:3001
npm run build && npm start
```

## Screenshots

`NODE_PATH=$(npm root -g) node scripts/screenshots.mjs` (dev server and API running) writes `screenshots/*.png`.
