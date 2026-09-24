# Campus Lost & Found — Backend

## Setup

1. Install dependencies
   ```
   npm install
   ```

2. Copy the environment file and fill it in
   ```
   cp .env.example .env
   ```
   At minimum, set `DATABASE_URL` and `JWT_SECRET`.

3. Create the database and load the schema
   ```
   createdb lostfound
   psql -d lostfound -f db/schema.sql
   ```

4. Run the server
   ```
   npm run dev
   ```
   Visit http://localhost:4000/health — you should see `{"status":"ok"}`.

## Try it with curl

```bash
# Register
curl -X POST http://localhost:4000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Asha","email":"asha@college.edu","password":"password123"}'

# Login (copy the token from the response)
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"asha@college.edu","password":"password123"}'

# Post a found item (replace TOKEN)
curl -X POST http://localhost:4000/items \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"type":"found","title":"Black wallet","category_id":4,"location_id":1,"date_happened":"2026-09-20","hidden_detail":"Has a bus pass inside"}'
```

## What's built vs. what's a stub

**Fully working:** register/login, post/list/get/edit/delete items, claim an
item, approve/reject a claim (transactional), rule-based match notifications,
nightly expiry job.

**Stubs to fill in yourself:**
- `src/services/ai/smartMatch.service.js` — wire in a real AI call when ready
- Image upload to Cloudinary/S3 (currently accepts already-uploaded `image_urls`)
- `src/routes/*` for messages, notifications, reports, admin — same pattern
  as items/claims, not yet written; ask if you want these built out too
- Real email sending on notifications (currently just writes to the `notifications` table)

## Folder structure

```
src/
├── config/       Database connection, environment variables
├── middleware/    authenticate (who), authorize (allowed?), errorHandler
├── validators/    zod schemas — reject bad input before it hits a controller
├── routes/        URL → middleware → controller wiring, no logic here
├── controllers/   the actual request-handling logic
├── services/      reusable logic (matching, and AI/ for optional AI features)
├── jobs/          scheduled tasks (item expiry)
├── utils/         asyncHandler, ApiError, ApiResponse
├── app.js         Express app setup
└── server.js      starts the server + cron
```
