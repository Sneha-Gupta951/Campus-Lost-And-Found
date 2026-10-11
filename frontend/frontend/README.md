# Campus Lost & Found — Frontend

## Setup

1. Install dependencies
   ```
   npm install
   ```

2. Copy the env file and fill in your Google Client ID + backend URL
   ```
   cp .env.example .env
   ```

3. Run it
   ```
   npm run dev
   ```
   Opens at http://localhost:3000

## What's built

- **Login page** — dark SSO-gate screen matching your mockup, real Google Sign-In button, "Restricted to @domain" banner, safety framework cards
- **Home feed** — greeting, search, Lost/Found tabs, activity cards with badges
- **Item Detail** — chain-of-custody card, anti-fraud note, claim form (proof-of-ownership)
- **Post Item** — Lost/Found toggle, full form, hidden-detail field, anti-fraud note
- **My Posts** — everything you've reported, with status badges (open/claimed/returned/expired), delete button
- **Claims Center** — two tabs: "Review Claims" (approve/reject claims on items you own) and "My Claims" (track claims you've filed)
- **Profile** — real account info (name, email, role, member-since), sign out
- **Dark theme system** (`src/styles/theme.css`) — every color, radius, and component style lives here as CSS variables. Change `--accent` or `--bg` once, it updates everywhere.
- **Bottom tab bar + top bar** — shared across all logged-in pages
- **AuthContext** — knows who's logged in everywhere in the app
- **ProtectedRoute** — redirects to `/login` if not signed in
- **api/client.js** — one place all backend calls go through; automatically attaches the JWT

## This is now the COMPLETE frontend — all 7 pages from the plan are built

Only thing not yet wired: editing an existing post (currently you can view or delete, not edit). Ask if you want that added.

## Backend endpoints this frontend depends on (make sure backend.zip is updated too)

- `GET /items/mine` — powers My Posts (new)
- `GET /claims/received` — powers Claims Center's "Review Claims" tab (new)
- `GET /claims/mine` — powers Claims Center's "My Claims" tab (new)
- Everything else from the original backend build

## Note on categories/locations

`PostItem.jsx` currently has categories and locations hardcoded at the top of the file (matching your database seed data). Once you build the admin panel, swap these for a real `GET /admin/categories` / `GET /admin/locations` call.


