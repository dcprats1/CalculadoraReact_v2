/*
  # Fix User Sessions Indexes

  1. Changes
    - Drop old index on non-existent last_activity column
    - Create index on existing last_authenticated_at column
    - Ensure proper indexing for performance

  2. Notes
    - Table already exists with correct structure
    - Just fixing the index definitions
*/

-- Drop the index if it exists (it shouldn't, but just in case)
DROP INDEX IF EXISTS idx_user_sessions_last_activity;

-- Create index on the correct column
CREATE INDEX IF NOT EXISTS idx_user_sessions_last_authenticated_at ON user_sessions(last_authenticated_at);

-- Ensure other indexes exist
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_device_fingerprint ON user_sessions(device_fingerprint);