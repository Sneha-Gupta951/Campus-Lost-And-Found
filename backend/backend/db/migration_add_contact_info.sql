-- Run this in pgAdmin's Query Tool on your EXISTING 'lostfound' database.
-- This adds the new column without deleting any data you already have.
-- (Only needed if your database was created before this feature was added —
-- a brand new database created from the full schema.sql already has it.)

ALTER TABLE claims ADD COLUMN IF NOT EXISTS contact_info TEXT;
