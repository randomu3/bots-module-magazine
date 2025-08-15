-- Migration: Add avatar_url column to users table
-- Created: 2025-01-08

ALTER TABLE users 
ADD COLUMN avatar_url VARCHAR(500);

-- Add comment to the column
COMMENT ON COLUMN users.avatar_url IS 'URL path to user avatar image';