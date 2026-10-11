-- =====================================================================
-- Campus Lost & Found - PostgreSQL schema (v1)
-- Run with:  psql -d lostfound -f schema.sql
-- =====================================================================

BEGIN;

-- gen_random_uuid() is built in on PostgreSQL 13+, this covers older versions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------
-- 1. ENUM TYPES (fixed lists of allowed values)
-- ---------------------------------------------------------------------
CREATE TYPE user_role     AS ENUM ('user', 'security', 'admin');
CREATE TYPE item_type     AS ENUM ('lost', 'found');
CREATE TYPE item_status   AS ENUM ('open', 'claimed', 'returned', 'closed', 'expired');
CREATE TYPE holder_type   AS ENUM ('finder', 'security_desk');
CREATE TYPE claim_status  AS ENUM ('pending', 'approved', 'rejected', 'withdrawn');
CREATE TYPE report_status AS ENUM ('open', 'reviewed', 'dismissed');

-- ---------------------------------------------------------------------
-- 2. HELPER: automatically refresh updated_at on every UPDATE
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------
-- 3. USERS
-- ---------------------------------------------------------------------
CREATE TABLE users (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           VARCHAR(100) NOT NULL,
  email          VARCHAR(255) NOT NULL,
  password_hash  TEXT,                            -- NULL for Google-only accounts
  google_id      VARCHAR(255) UNIQUE,              -- Google's unique "sub" id
  role           user_role    NOT NULL DEFAULT 'user',
  is_banned      BOOLEAN      NOT NULL DEFAULT false,
  email_verified BOOLEAN      NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),

  -- Every account must have SOME way to log in
  CONSTRAINT has_login_method CHECK (password_hash IS NOT NULL OR google_id IS NOT NULL)
);

-- Case-insensitive unique email (Rahul@x.com and rahul@x.com are the same)
CREATE UNIQUE INDEX users_email_unique ON users (lower(email));

-- ---------------------------------------------------------------------
-- 3b. EMAIL VERIFICATION (proves the student actually owns the inbox)
-- ---------------------------------------------------------------------
CREATE TABLE email_verifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  otp_hash   TEXT        NOT NULL,          -- OTP is hashed, never stored plain
  expires_at TIMESTAMPTZ NOT NULL,
  attempts   SMALLINT    NOT NULL DEFAULT 0, -- wrong-guess counter
  consumed   BOOLEAN     NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX email_verifications_user_idx ON email_verifications (user_id, consumed);

-- ---------------------------------------------------------------------
-- 4. LOOKUP TABLES (admin manages these)
-- ---------------------------------------------------------------------
CREATE TABLE categories (
  id        INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name      VARCHAR(80) NOT NULL UNIQUE,
  is_active BOOLEAN     NOT NULL DEFAULT true
);

CREATE TABLE locations (
  id        INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name      VARCHAR(80) NOT NULL UNIQUE,
  is_active BOOLEAN     NOT NULL DEFAULT true
);

-- ---------------------------------------------------------------------
-- 5. ITEMS (both lost and found posts live here)
-- ---------------------------------------------------------------------
CREATE TABLE items (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID         NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  type           item_type    NOT NULL,
  title          VARCHAR(120) NOT NULL,
  description    TEXT,
  category_id    INT          NOT NULL REFERENCES categories(id),
  location_id    INT          NOT NULL REFERENCES locations(id),
  date_happened  DATE         NOT NULL,           -- when it was lost / found

  -- Secret only the real owner would know (found items only).
  -- The API must NEVER return this to normal users.
  hidden_detail  TEXT,

  -- Where the found item is right now (found items only)
  current_holder holder_type,

  status         item_status  NOT NULL DEFAULT 'open',
  returned_at    TIMESTAMPTZ,
  expires_at     TIMESTAMPTZ  NOT NULL DEFAULT (now() + interval '60 days'),
  deleted_at     TIMESTAMPTZ,                     -- soft delete: NULL = still visible

  -- Auto-built keyword search column
  search_vector  tsvector GENERATED ALWAYS AS (
                   to_tsvector('english', title || ' ' || coalesce(description, ''))
                 ) STORED,

  created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),

  -- Only found items can have a holder
  CONSTRAINT holder_only_for_found
    CHECK (type = 'found' OR current_holder IS NULL)
);

-- Main feed: "open found items, newest first"
CREATE INDEX items_feed_idx
  ON items (type, status, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX items_category_idx ON items (category_id);
CREATE INDEX items_location_idx ON items (location_id);
CREATE INDEX items_user_idx     ON items (user_id);

-- Keyword search
CREATE INDEX items_search_idx ON items USING GIN (search_vector);

-- Nightly job: "which open items have expired?"
CREATE INDEX items_expiry_idx ON items (expires_at) WHERE status = 'open';

-- ---------------------------------------------------------------------
-- 6. ITEM IMAGES (one item can have many photos)
-- ---------------------------------------------------------------------
CREATE TABLE item_images (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id    UUID        NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  url        TEXT        NOT NULL,
  position   SMALLINT    NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX item_images_item_idx ON item_images (item_id);

-- ---------------------------------------------------------------------
-- 7. CLAIMS ("this is mine" requests)
-- ---------------------------------------------------------------------
CREATE TABLE claims (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id      UUID         NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  claimant_id  UUID         NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  proof_answer TEXT         NOT NULL,             -- claimant's description of the hidden detail
  contact_info TEXT,                              -- address/phone/meeting preference, shown to the finder
  status       claim_status NOT NULL DEFAULT 'pending',
  reviewed_by  UUID REFERENCES users(id),         -- security/admin who decided
  reviewed_at  TIMESTAMPTZ,
  review_note  TEXT,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),

  -- A user can claim the same item only once
  CONSTRAINT one_claim_per_user_per_item UNIQUE (item_id, claimant_id)
);

-- At most ONE approved claim per item, guaranteed by the database
CREATE UNIQUE INDEX one_approved_claim_per_item
  ON claims (item_id) WHERE status = 'approved';

CREATE INDEX claims_claimant_idx ON claims (claimant_id);
CREATE INDEX claims_pending_idx  ON claims (status) WHERE status = 'pending';

-- ---------------------------------------------------------------------
-- 8. MESSAGES (chat inside a claim, so phone numbers stay private)
-- ---------------------------------------------------------------------
CREATE TABLE messages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id   UUID        NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  sender_id  UUID        NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  body       TEXT        NOT NULL CHECK (length(body) BETWEEN 1 AND 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX messages_claim_idx ON messages (claim_id, created_at);

-- ---------------------------------------------------------------------
-- 9. NOTIFICATIONS
-- ---------------------------------------------------------------------
CREATE TABLE notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       VARCHAR(40) NOT NULL,                -- 'match_found', 'claim_received', 'claim_approved'
  message    TEXT        NOT NULL,
  item_id    UUID REFERENCES items(id) ON DELETE SET NULL,
  is_read    BOOLEAN     NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX notifications_user_idx
  ON notifications (user_id, is_read, created_at DESC);

-- ---------------------------------------------------------------------
-- 10. REPORTS (flagging fake or abusive posts)
-- ---------------------------------------------------------------------
CREATE TABLE reports (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id     UUID          NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  reporter_id UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason      TEXT          NOT NULL,
  status      report_status NOT NULL DEFAULT 'open',
  reviewed_by UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT now(),

  CONSTRAINT one_report_per_user_per_item UNIQUE (item_id, reporter_id)
);

-- ---------------------------------------------------------------------
-- 11. TRIGGERS: keep updated_at fresh
-- ---------------------------------------------------------------------
CREATE TRIGGER users_updated_at  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER items_updated_at  BEFORE UPDATE ON items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER claims_updated_at BEFORE UPDATE ON claims
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------
-- 12. SEED DATA (starter categories and locations, edit for your campus)
-- ---------------------------------------------------------------------
INSERT INTO categories (name) VALUES
  ('ID card'), ('Phone'), ('Laptop'), ('Wallet'), ('Keys'), ('Bag'),
  ('Books'), ('Water bottle'), ('Earphones'), ('Clothing'), ('Other');

INSERT INTO locations (name) VALUES
  ('Library'), ('Canteen'), ('Main gate'), ('Hostel'), ('Classroom block'),
  ('Sports ground'), ('Parking'), ('Other');

COMMIT;

-- =====================================================================
-- EXAMPLE QUERIES (try these after inserting some data)
-- =====================================================================

-- A) Feed: latest open found items with category and location names
--
-- SELECT i.id, i.title, c.name AS category, l.name AS location, i.created_at
-- FROM items i
-- JOIN categories c ON c.id = i.category_id
-- JOIN locations  l ON l.id = i.location_id
-- WHERE i.type = 'found' AND i.status = 'open' AND i.deleted_at IS NULL
-- ORDER BY i.created_at DESC
-- LIMIT 20;

-- B) Keyword search: "black wallet"
--
-- SELECT id, title
-- FROM items
-- WHERE search_vector @@ plainto_tsquery('english', 'black wallet')
--   AND deleted_at IS NULL;

-- C) Nightly expiry job
--
-- UPDATE items SET status = 'expired'
-- WHERE status = 'open' AND expires_at < now();
