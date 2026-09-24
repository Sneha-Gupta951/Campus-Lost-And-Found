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
- **Dark theme system** (`src/styles/theme.css`) — every color, radius, and component style lives here as CSS variables. Change `--accent` or `--bg` once, it updates everywhere.
- **Bottom tab bar + top bar** — shared across all logged-in pages
- **AuthContext** — knows who's logged in everywhere in the app
- **ProtectedRoute** — redirects to `/login` if not signed in
- **api/client.js** — one place all backend calls go through; automatically attaches the JWT

## Pages still to build (same visual system, same pattern)

- My Posts (`/my-posts`) — user's own listings with status badges
- Claims (`/claims`) — claims made + claims received (for item owners to approve/reject)
- Profile (`/profile`)
- Admin dashboard (separate section, role-gated)

Each new page follows Feed.jsx's pattern: `useState` for data, `useEffect` + `api.get()`, render with the shared `.card`, `.badge`, `.btn` classes from `theme.css`.

## Note on categories/locations

`PostItem.jsx` currently has categories and locations hardcoded at the top of the file (matching your database seed data). Once you build the admin panel, swap these for a real `GET /admin/categories` / `GET /admin/locations` call.

